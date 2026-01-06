import type { AnalysisState, AnalyzeResponse, Goal, ParsedTask } from '@/types';
import { generateUUID } from '@/utils/uuid';
import { create } from 'zustand';

// Configure your backend URL here
// Use your local IP address for mobile device testing (replace with your IP)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.20:3001';

interface AnalysisStore extends AnalysisState {
    // Actions
    setImage: (uri: string, base64: string) => void;
    clearImage: () => void;
    analyzeImage: (goals: Goal[]) => Promise<void>;
    updateTask: (taskId: string, updates: Partial<ParsedTask>) => void;
    toggleTaskCompletion: (taskId: string) => void;
    linkTaskToGoal: (taskId: string, goalId: string | null) => void;
    clearAnalysis: () => void;
    reset: () => void;
}

const initialState: AnalysisState = {
    isLoading: false,
    error: null,
    currentImageUri: null,
    currentImageBase64: null,
    parsedTasks: [],
    rawTranscription: null,
};

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
    ...initialState,

    setImage: (uri, base64) => {
        set({
            currentImageUri: uri,
            currentImageBase64: base64,
            error: null,
        });
    },

    clearImage: () => {
        set({
            currentImageUri: null,
            currentImageBase64: null,
        });
    },

    analyzeImage: async (goals) => {
        const { currentImageBase64 } = get();

        if (!currentImageBase64) {
            set({ error: 'No image to analyze' });
            return;
        }

        set({ isLoading: true, error: null });

        try {
            const response = await fetch(`${API_BASE_URL}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: currentImageBase64,
                    goals: goals,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data: AnalyzeResponse = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Convert API response to ParsedTask with IDs
            const parsedTasks: ParsedTask[] = data.tasks.map((task) => ({
                ...task,
                id: generateUUID(),
                wasManuallyEdited: false,
            }));

            set({
                parsedTasks,
                rawTranscription: data.rawTranscription,
                isLoading: false,
            });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to analyze image',
                isLoading: false,
            });
        }
    },

    updateTask: (taskId, updates) => {
        set((state) => ({
            parsedTasks: state.parsedTasks.map((task) =>
                task.id === taskId
                    ? { ...task, ...updates, wasManuallyEdited: true }
                    : task
            ),
        }));
    },

    toggleTaskCompletion: (taskId) => {
        set((state) => ({
            parsedTasks: state.parsedTasks.map((task) =>
                task.id === taskId
                    ? { ...task, isCompleted: !task.isCompleted, wasManuallyEdited: true }
                    : task
            ),
        }));
    },

    linkTaskToGoal: (taskId, goalId) => {
        set((state) => ({
            parsedTasks: state.parsedTasks.map((task) =>
                task.id === taskId
                    ? { ...task, relatedGoalId: goalId, wasManuallyEdited: true }
                    : task
            ),
        }));
    },

    clearAnalysis: () => {
        set({
            parsedTasks: [],
            rawTranscription: null,
            error: null,
        });
    },

    reset: () => {
        set(initialState);
    },
}));
