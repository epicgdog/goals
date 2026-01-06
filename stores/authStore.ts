import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const API_BASE_URL = 'http://192.168.1.20:3001';

interface User {
    id: number;
    googleId: string;
    email: string;
    displayName: string;
}

interface AuthStore {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Actions
    login: (googleId: string, email: string, displayName: string) => Promise<boolean>;
    logout: () => void;
    getUserId: () => number | null;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,

            login: async (googleId, email, displayName) => {
                set({ isLoading: true });

                try {
                    const response = await fetch(`${API_BASE_URL}/auth/google`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ googleId, email, displayName }),
                    });

                    if (!response.ok) {
                        throw new Error('Authentication failed');
                    }

                    const data = await response.json();

                    set({
                        user: {
                            id: data.user.id,
                            googleId: data.user.google_id,
                            email: data.user.email,
                            displayName: data.user.display_name,
                        },
                        isAuthenticated: true,
                        isLoading: false,
                    });

                    return true;
                } catch (error) {
                    console.error('Login error:', error);
                    set({ isLoading: false });
                    return false;
                }
            },

            logout: () => {
                set({
                    user: null,
                    isAuthenticated: false,
                });
            },

            getUserId: () => {
                return get().user?.id || null;
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
