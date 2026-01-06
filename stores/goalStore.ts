import type { Goal } from '@/types';
import { create } from 'zustand';
import { useAuthStore } from './authStore';

const API_BASE_URL = 'http://192.168.1.20:3001';

interface GoalStore {
    goals: Goal[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchGoals: () => Promise<void>;
    addGoal: (title: string, targetPhrase: string, generalDescription: string) => Promise<void>;
    deleteGoal: (id: string) => Promise<void>;
    getGoalById: (id: string) => Goal | undefined;
}

export const useGoalStore = create<GoalStore>((set, get) => ({
    goals: [],
    isLoading: false,
    error: null,

    fetchGoals: async () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        set({ isLoading: true, error: null });

        try {
            const response = await fetch(`${API_BASE_URL}/goals`, {
                headers: { 'X-User-Id': userId.toString() },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch goals');
            }

            const data = await response.json();
            set({ goals: data.goals, isLoading: false });
        } catch (error) {
            set({ error: 'Failed to load goals', isLoading: false });
        }
    },

    addGoal: async (title, targetPhrase, generalDescription) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        try {
            const response = await fetch(`${API_BASE_URL}/goals`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': userId.toString(),
                },
                body: JSON.stringify({ title, targetPhrase, generalDescription }),
            });

            if (!response.ok) {
                throw new Error('Failed to create goal');
            }

            const data = await response.json();
            set((state) => ({ goals: [data.goal, ...state.goals] }));
        } catch (error) {
            console.error('Add goal error:', error);
        }
    },

    deleteGoal: async (id) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        try {
            await fetch(`${API_BASE_URL}/goals/${id}`, {
                method: 'DELETE',
                headers: { 'X-User-Id': userId.toString() },
            });

            set((state) => ({
                goals: state.goals.filter((goal) => goal.id !== id),
            }));
        } catch (error) {
            console.error('Delete goal error:', error);
        }
    },

    getGoalById: (id) => {
        return get().goals.find((goal) => goal.id === id);
    },
}));
