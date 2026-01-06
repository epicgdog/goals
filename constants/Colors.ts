// Premium color palette for Goals Tracker
const tintColorLight = '#6366f1'; // Indigo
const tintColorDark = '#818cf8';

export const Colors = {
  light: {
    text: '#1f2937',
    textSecondary: '#6b7280',
    background: '#f8fafc',
    surface: '#ffffff',
    tint: tintColorLight,
    tabIconDefault: '#9ca3af',
    tabIconSelected: tintColorLight,
    border: '#e5e7eb',
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
    accent: '#8b5cf6',
  },
  dark: {
    text: '#f9fafb',
    textSecondary: '#9ca3af',
    background: '#0f172a',
    surface: '#1e293b',
    tint: tintColorDark,
    tabIconDefault: '#6b7280',
    tabIconSelected: tintColorDark,
    border: '#334155',
    success: '#4ade80',
    warning: '#facc15',
    error: '#f87171',
    accent: '#a78bfa',
  },
  // Score colors
  score: {
    high: '#22c55e',
    medium: '#eab308',
    low: '#f97316',
    minimal: '#ef4444',
  },
  // Gradient colors for premium feel
  gradients: {
    primary: ['#6366f1', '#8b5cf6'],
    success: ['#22c55e', '#4ade80'],
    accent: ['#8b5cf6', '#c084fc'],
  },
};

export default Colors;
