import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import pool from './db';
import { SYSTEM_PROMPT, createUserPrompt } from './prompts/journal-analysis';

// Load environment variables from parent directory
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Increase JSON body limit for base64 images
app.use(express.json({ limit: '50mb' }));

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Types
interface Goal {
    id: string;
    title: string;
    targetPhrase: string;
    generalDescription: string;
}

interface AnalyzeRequest {
    image: string; // Base64 encoded image
    goals: Goal[];
}

interface ParsedTask {
    text: string;
    isCompleted: boolean;
    relevanceScore: number;
    relatedGoalId: string | null;
}

interface AnalyzeResponse {
    tasks: ParsedTask[];
    rawTranscription: string;
    error?: string;
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate target phrases from goal title
app.post('/generate-phrases', async (req: Request, res: Response) => {
    try {
        const { title } = req.body as { title: string };

        if (!title || title.trim().length === 0) {
            res.status(400).json({ error: 'Goal title is required', phrases: [], description: '' });
            return;
        }

        console.log(`[${new Date().toISOString()}] Generating phrases for: "${title}"`);

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `Given the goal title "${title}", generate:
1. A list of 3-5 short target phrases (2-4 words each) that someone might write in their journal/to-do list when working on this goal. These should be common variations of how someone might write this task.
2. A brief general description (1-2 sentences) explaining what activities relate to this goal.

Return ONLY valid JSON in this exact format, with no additional text:
{
  "phrases": ["phrase 1", "phrase 2", "phrase 3"],
  "description": "General description of activities related to this goal"
}

Examples:
- For "Exercise Daily": phrases could be ["went to gym", "morning run", "workout", "did exercise", "yoga session"]
- For "Read More Books": phrases could be ["read book", "reading time", "finished chapter", "book club"]
- For "Drink Water": phrases could be ["drank water", "8 glasses", "stayed hydrated", "water intake"]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        let parsed: { phrases: string[], description: string };
        try {
            parsed = JSON.parse(text);
        } catch {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Could not parse AI response');
            }
        }

        console.log(`[${new Date().toISOString()}] Generated ${parsed.phrases?.length || 0} phrases`);

        res.json({
            phrases: parsed.phrases || [],
            description: parsed.description || '',
        });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Phrase generation error:`, error);
        res.status(500).json({
            error: 'Failed to generate phrases',
            phrases: [],
            description: '',
        });
    }
});

// Analyze endpoint
app.post('/analyze', async (req: Request, res: Response) => {
    try {
        const { image, goals } = req.body as AnalyzeRequest;

        // Validate inputs
        if (!image) {
            res.status(400).json({ error: 'Image is required', tasks: [], rawTranscription: '' });
            return;
        }

        if (!process.env.GEMINI_API_KEY) {
            res.status(500).json({ error: 'GEMINI_API_KEY is not configured', tasks: [], rawTranscription: '' });
            return;
        }

        console.log(`[${new Date().toISOString()}] Analyzing image with ${goals?.length || 0} goals...`);
        console.log(`[${new Date().toISOString()}] Image size: ${image.length} characters`);

        // Detect mime type from base64 header if present, otherwise default to jpeg
        let mimeType = 'image/jpeg';
        let imageData = image;

        if (image.startsWith('data:')) {
            const match = image.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
                mimeType = match[1];
                imageData = match[2];
                console.log(`[${new Date().toISOString()}] Detected mime type: ${mimeType}`);
            }
        }

        // Prepare goals JSON for the prompt
        const goalsJson = JSON.stringify(
            goals?.map(g => ({
                id: g.id,
                title: g.title,
                targetPhrase: g.targetPhrase,
                description: g.generalDescription,
            })) || [],
            null,
            2
        );

        // Initialize the Gemini model
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Prepare the image for the API
        const imagePart = {
            inlineData: {
                data: imageData,
                mimeType: mimeType,
            },
        };

        // Generate content with the image
        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: SYSTEM_PROMPT },
                        imagePart,
                        { text: createUserPrompt(goalsJson) },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.2, // Lower temperature for more consistent output
                maxOutputTokens: 4096,
            },
        });

        const response = await result.response;
        const text = response.text();

        console.log(`[${new Date().toISOString()}] Received response, parsing JSON...`);

        // Try to extract JSON from the response
        let analysisResult: AnalyzeResponse;

        try {
            // First, try direct JSON parse
            analysisResult = JSON.parse(text);
        } catch {
            // Try to extract JSON from markdown code blocks
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                analysisResult = JSON.parse(jsonMatch[1].trim());
            } else {
                // Try to find JSON object in the response
                const jsonStart = text.indexOf('{');
                const jsonEnd = text.lastIndexOf('}');
                if (jsonStart !== -1 && jsonEnd !== -1) {
                    analysisResult = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
                } else {
                    throw new Error('No valid JSON found in response');
                }
            }
        }

        // Validate the response structure
        if (!Array.isArray(analysisResult.tasks)) {
            analysisResult.tasks = [];
        }

        // Ensure all tasks have required fields
        analysisResult.tasks = analysisResult.tasks.map(task => ({
            text: task.text || '',
            isCompleted: Boolean(task.isCompleted),
            relevanceScore: Math.min(100, Math.max(0, Number(task.relevanceScore) || 0)),
            relatedGoalId: task.relatedGoalId || null,
        }));

        console.log(`[${new Date().toISOString()}] Successfully parsed ${analysisResult.tasks.length} tasks`);

        res.json(analysisResult);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Analysis error:`, error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        res.status(500).json({
            error: `Failed to analyze image: ${errorMessage}`,
            tasks: [],
            rawTranscription: '',
        });
    }
});

// ========== AUTH ENDPOINTS ==========

// Google Auth - Check/Create User
app.post('/auth/google', async (req: Request, res: Response) => {
    try {
        const { googleId, email, displayName } = req.body;

        if (!googleId) {
            res.status(400).json({ error: 'Google ID is required' });
            return;
        }

        // Upsert user
        const result = await pool.query(
            `INSERT INTO users (google_id, email, display_name)
             VALUES ($1, $2, $3)
             ON CONFLICT (google_id) 
             DO UPDATE SET email = $2, display_name = $3
             RETURNING id, google_id, email, display_name`,
            [googleId, email, displayName]
        );

        console.log(`[${new Date().toISOString()}] User authenticated: ${email}`);
        res.json({ user: result.rows[0] });

    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// ========== GOALS ENDPOINTS ==========

// Get all goals for a user
app.get('/goals', async (req: Request, res: Response) => {
    try {
        const userId = req.headers['x-user-id'];

        if (!userId) {
            res.status(401).json({ error: 'User ID required' });
            return;
        }

        const result = await pool.query(
            `SELECT id, title, target_phrase as "targetPhrase", 
                    general_description as "generalDescription",
                    created_at as "createdAt", updated_at as "updatedAt"
             FROM goals WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );

        res.json({ goals: result.rows });

    } catch (error) {
        console.error('Get goals error:', error);
        res.status(500).json({ error: 'Failed to fetch goals' });
    }
});

// Create a goal
app.post('/goals', async (req: Request, res: Response) => {
    try {
        const userId = req.headers['x-user-id'];
        const { title, targetPhrase, generalDescription } = req.body;

        if (!userId) {
            res.status(401).json({ error: 'User ID required' });
            return;
        }

        if (!title) {
            res.status(400).json({ error: 'Title is required' });
            return;
        }

        const result = await pool.query(
            `INSERT INTO goals (user_id, title, target_phrase, general_description)
             VALUES ($1, $2, $3, $4)
             RETURNING id, title, target_phrase as "targetPhrase", 
                       general_description as "generalDescription",
                       created_at as "createdAt", updated_at as "updatedAt"`,
            [userId, title, targetPhrase || '', generalDescription || '']
        );

        console.log(`[${new Date().toISOString()}] Goal created: ${title}`);
        res.json({ goal: result.rows[0] });

    } catch (error) {
        console.error('Create goal error:', error);
        res.status(500).json({ error: 'Failed to create goal' });
    }
});

// Delete a goal
app.delete('/goals/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.headers['x-user-id'];
        const { id } = req.params;

        if (!userId) {
            res.status(401).json({ error: 'User ID required' });
            return;
        }

        await pool.query(
            'DELETE FROM goals WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        res.json({ success: true });

    } catch (error) {
        console.error('Delete goal error:', error);
        res.status(500).json({ error: 'Failed to delete goal' });
    }
});

// ========== ENTRIES ENDPOINTS ==========

// Get all entries for a user
app.get('/entries', async (req: Request, res: Response) => {
    try {
        const userId = req.headers['x-user-id'];

        if (!userId) {
            res.status(401).json({ error: 'User ID required' });
            return;
        }

        const result = await pool.query(
            `SELECT id, date, tasks, total_score as "totalScore", 
                    created_at as "createdAt"
             FROM entries WHERE user_id = $1 ORDER BY date DESC, created_at DESC`,
            [userId]
        );

        res.json({ entries: result.rows });

    } catch (error) {
        console.error('Get entries error:', error);
        res.status(500).json({ error: 'Failed to fetch entries' });
    }
});

// Create an entry (text only, no image)
app.post('/entries', async (req: Request, res: Response) => {
    try {
        const userId = req.headers['x-user-id'];
        const { date, tasks, totalScore } = req.body;

        if (!userId) {
            res.status(401).json({ error: 'User ID required' });
            return;
        }

        const entryDate = date || new Date().toISOString().split('T')[0];

        const result = await pool.query(
            `INSERT INTO entries (user_id, date, tasks, total_score)
             VALUES ($1, $2, $3, $4)
             RETURNING id, date, tasks, total_score as "totalScore", created_at as "createdAt"`,
            [userId, entryDate, JSON.stringify(tasks || []), totalScore || 0]
        );

        console.log(`[${new Date().toISOString()}] Entry saved with score: ${totalScore}`);
        res.json({ entry: result.rows[0] });

    } catch (error) {
        console.error('Create entry error:', error);
        res.status(500).json({ error: 'Failed to save entry' });
    }
});

// Update an entry
app.patch('/entries/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.headers['x-user-id'];
        const { id } = req.params;
        const { tasks, totalScore } = req.body;

        if (!userId) {
            res.status(401).json({ error: 'User ID required' });
            return;
        }

        const result = await pool.query(
            `UPDATE entries SET tasks = $1, total_score = $2
             WHERE id = $3 AND user_id = $4
             RETURNING id, date, tasks, total_score as "totalScore", created_at as "createdAt"`,
            [JSON.stringify(tasks), totalScore, id, userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Entry not found' });
            return;
        }

        res.json({ entry: result.rows[0] });

    } catch (error) {
        console.error('Update entry error:', error);
        res.status(500).json({ error: 'Failed to update entry' });
    }
});

// Delete an entry
app.delete('/entries/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.headers['x-user-id'];
        const { id } = req.params;

        if (!userId) {
            res.status(401).json({ error: 'User ID required' });
            return;
        }

        await pool.query(
            'DELETE FROM entries WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        res.json({ success: true });

    } catch (error) {
        console.error('Delete entry error:', error);
        res.status(500).json({ error: 'Failed to delete entry' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Goals Tracker API server running on http://localhost:${PORT}`);
    console.log(`📝 Gemini API Key: ${process.env.GEMINI_API_KEY ? '✓ Configured' : '✗ Missing'}`);
});
