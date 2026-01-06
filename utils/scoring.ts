import type { Goal, ParsedTask } from '@/types';

/**
 * Calculate the score for a single task, applying exact match override
 */
export function calculateTaskScore(task: ParsedTask, goals: Goal[]): number {
    if (!task.isCompleted) {
        return 0;
    }

    // Check for exact match override
    if (task.relatedGoalId) {
        const matchedGoal = goals.find((g) => g.id === task.relatedGoalId);
        if (matchedGoal && matchedGoal.targetPhrase) {
            const normalizedText = task.text.toLowerCase().trim();
            const normalizedPhrase = matchedGoal.targetPhrase.toLowerCase().trim();

            // If the task text contains the target phrase exactly, give max score
            if (normalizedText.includes(normalizedPhrase)) {
                return 100;
            }
        }
    }

    return task.relevanceScore;
}

/**
 * Calculate the total daily score for a list of tasks
 */
export function calculateDailyScore(tasks: ParsedTask[], goals: Goal[]): number {
    return tasks.reduce((total, task) => {
        return total + calculateTaskScore(task, goals);
    }, 0);
}

/**
 * Get color based on relevance score
 */
export function getScoreColor(score: number): string {
    if (score >= 80) return '#22c55e'; // Green - high relevance
    if (score >= 50) return '#eab308'; // Yellow - medium relevance
    if (score >= 20) return '#f97316'; // Orange - low relevance
    return '#ef4444'; // Red - minimal relevance
}

/**
 * Format score for display
 */
export function formatScore(score: number): string {
    return `+${score} pts`;
}

/**
 * Get encouragement message based on score
 */
export function getEncouragementMessage(totalScore: number, taskCount: number): string {
    const avgScore = taskCount > 0 ? totalScore / taskCount : 0;

    if (totalScore === 0) {
        return "Let's get started! 🌱";
    }
    if (avgScore >= 80) {
        return "Outstanding work! 🌟";
    }
    if (avgScore >= 60) {
        return "Great progress! 💪";
    }
    if (avgScore >= 40) {
        return "Keep it up! 🎯";
    }
    return "Every step counts! 🚀";
}
