// Core TypeScript interfaces for the Goals Tracker app

/**
 * Represents a user-defined goal with matching criteria
 */
export interface Goal {
  id: string;
  title: string;
  targetPhrase: string;       // For exact matching (case-insensitive)
  generalDescription: string; // For AI semantic matching
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents a single task parsed from a journal image
 */
export interface ParsedTask {
  id: string;
  text: string;               // Transcribed handwritten text
  isCompleted: boolean;       // Checkbox detection result
  relevanceScore: number;     // 0-100 semantic match score from AI
  relatedGoalId: string | null;
  wasManuallyEdited: boolean; // Track if user made corrections
}

/**
 * Represents a daily journal entry with analyzed tasks
 */
export interface DailyEntry {
  id: string;
  date: string;
  imageUri: string;           // Local file reference for display
  tasks: ParsedTask[];
  totalScore: number;
  createdAt: string;
}

/**
 * API request payload for journal analysis
 */
export interface AnalyzeRequest {
  image: string;  // Base64 encoded image
  goals: Goal[];
}

/**
 * API response from journal analysis
 */
export interface AnalyzeResponse {
  tasks: Omit<ParsedTask, 'id' | 'wasManuallyEdited'>[];
  rawTranscription: string;
  error?: string;
}

/**
 * State for the analysis process
 */
export interface AnalysisState {
  isLoading: boolean;
  error: string | null;
  currentImageUri: string | null;
  currentImageBase64: string | null;
  parsedTasks: ParsedTask[];
  rawTranscription: string | null;
}
