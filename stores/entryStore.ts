import type { DailyEntry, ParsedTask } from '@/types';
import { create } from 'zustand';
import { useAuthStore } from './authStore';

const API_BASE_URL = 'http://192.168.1.20:3001';

interface EntryStore {
    entries: DailyEntry[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchEntries: () => Promise<void>;
    addEntry: (tasks: ParsedTask[], totalScore: number) => Promise<string | null>;
    updateEntry: (id: string, tasks: ParsedTask[], totalScore: number) => Promise<boolean>;
    deleteEntry: (id: string) => Promise<void>;
    getEntryById: (id: string) => DailyEntry | undefined;
}

export const useEntryStore = create<EntryStore>((set, get) => ({
    entries: [],
    isLoading: false,
    error: null,

    fetchEntries: async () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        set({ isLoading: true, error: null });

        try {
            const response = await fetch(`${API_BASE_URL}/entries`, {
                headers: { 'X-User-Id': userId.toString() },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch entries');
            }

            const data = await response.json();
            set({ entries: data.entries, isLoading: false });
        } catch (error) {
            set({ error: 'Failed to load entries', isLoading: false });
        }
    },

    addEntry: async (tasks, totalScore) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return null;

        try {
            const response = await fetch(`${API_BASE_URL}/entries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': userId.toString(),
                },
                body: JSON.stringify({ tasks, totalScore }),
            });

            if (!response.ok) {
                throw new Error('Failed to create entry');
            }

            const data = await response.json();
            set((state) => ({ entries: [data.entry, ...state.entries] }));
            return data.entry.id;
        } catch (error) {
            console.error('Add entry error:', error);
            return null;
        }
    },

    updateEntry: async (id, tasks, totalScore) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/entries/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': userId.toString(),
                },
                body: JSON.stringify({ tasks, totalScore }),
            });

            if (!response.ok) {
                throw new Error('Failed to update entry');
            }

            const data = await response.json();
            set((state) => ({
                entries: state.entries.map((e) =>
                    e.id === id ? data.entry : e
                ),
            }));
            return true;
        } catch (error) {
            console.error('Update entry error:', error);
            return false;
        }
    },

    deleteEntry: async (id) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        try {
            await fetch(`${API_BASE_URL}/entries/${id}`, {
                method: 'DELETE',
                headers: { 'X-User-Id': userId.toString() },
            });

            set((state) => ({
                entries: state.entries.filter((e) => e.id !== id),
            }));
        } catch (error) {
            console.error('Delete entry error:', error);
        }
    },

    getEntryById: (id) => {
        return get().entries.find((e) => e.id === id);
    },
}));
