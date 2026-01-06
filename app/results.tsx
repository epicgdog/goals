import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useAnalysisStore } from '@/stores/analysisStore';
import { useEntryStore } from '@/stores/entryStore';
import { useGoalStore } from '@/stores/goalStore';
import type { ParsedTask } from '@/types';
import { calculateDailyScore, calculateTaskScore, getEncouragementMessage, getScoreColor } from '@/utils/scoring';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function ResultsScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const { parsedTasks, currentImageUri, updateTask, toggleTaskCompletion, linkTaskToGoal, reset } = useAnalysisStore();
    const { goals } = useGoalStore();
    const { addEntry } = useEntryStore();

    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    // Calculate scores
    const totalScore = useMemo(() => calculateDailyScore(parsedTasks, goals), [parsedTasks, goals]);
    const completedCount = parsedTasks.filter(t => t.isCompleted).length;
    const encouragement = getEncouragementMessage(totalScore, parsedTasks.length);

    const startEditing = (task: ParsedTask) => {
        setEditingTaskId(task.id);
        setEditText(task.text);
    };

    const saveEdit = (taskId: string) => {
        updateTask(taskId, { text: editText.trim() });
        setEditingTaskId(null);
        setEditText('');
    };

    const cancelEdit = () => {
        setEditingTaskId(null);
        setEditText('');
    };

    const handleSaveEntry = async () => {
        if (parsedTasks.length === 0) {
            Alert.alert('No Tasks', 'There are no tasks to save.');
            return;
        }

        const entryId = await addEntry(parsedTasks, totalScore);

        Alert.alert(
            'Entry Saved!',
            `Your journal entry has been saved with ${totalScore} points.`,
            [
                {
                    text: 'View History',
                    onPress: () => {
                        reset();
                        router.replace('/(tabs)/history');
                    },
                },
                {
                    text: 'Done',
                    onPress: () => {
                        reset();
                        router.replace('/(tabs)');
                    },
                },
            ]
        );
    };

    const getGoalName = (goalId: string | null) => {
        if (!goalId) return null;
        const goal = goals.find(g => g.id === goalId);
        return goal?.title || null;
    };

    const renderTask = (task: ParsedTask, index: number) => {
        const taskScore = calculateTaskScore(task, goals);
        const scoreColor = getScoreColor(task.relevanceScore);
        const goalName = getGoalName(task.relatedGoalId);
        const isEditing = editingTaskId === task.id;

        return (
            <Animated.View
                key={task.id}
                entering={FadeInDown.delay(index * 50).springify()}
                style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
                {/* Checkbox */}
                <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => toggleTaskCompletion(task.id)}
                >
                    <View style={[
                        styles.checkbox,
                        { borderColor: task.isCompleted ? colors.success : colors.border },
                        task.isCompleted && { backgroundColor: colors.success }
                    ]}>
                        {task.isCompleted && (
                            <FontAwesome name="check" size={14} color="#fff" />
                        )}
                    </View>
                </TouchableOpacity>

                {/* Task Content */}
                <View style={styles.taskContent}>
                    {isEditing ? (
                        <View style={styles.editContainer}>
                            <TextInput
                                style={[styles.editInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                value={editText}
                                onChangeText={setEditText}
                                autoFocus
                                multiline
                            />
                            <View style={styles.editActions}>
                                <TouchableOpacity onPress={cancelEdit} style={styles.editBtn}>
                                    <FontAwesome name="times" size={16} color={colors.error} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => saveEdit(task.id)} style={styles.editBtn}>
                                    <FontAwesome name="check" size={16} color={colors.success} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => startEditing(task)}>
                            <Text style={[
                                styles.taskText,
                                { color: colors.text },
                                task.isCompleted && styles.taskTextCompleted
                            ]}>
                                {task.text}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Goal Badge */}
                    {goalName && (
                        <View style={[styles.goalBadge, { backgroundColor: colors.tint + '15' }]}>
                            <FontAwesome name="bullseye" size={10} color={colors.tint} />
                            <Text style={[styles.goalBadgeText, { color: colors.tint }]}>{goalName}</Text>
                        </View>
                    )}

                    {/* Manual Edit Indicator */}
                    {task.wasManuallyEdited && (
                        <Text style={[styles.editedLabel, { color: colors.textSecondary }]}>
                            <FontAwesome name="pencil" size={10} /> Edited
                        </Text>
                    )}
                </View>

                {/* Score */}
                {task.isCompleted && (
                    <View style={styles.scoreContainer}>
                        <Text style={[styles.scoreValue, { color: scoreColor }]}>
                            +{taskScore}
                        </Text>
                        <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>pts</Text>
                    </View>
                )}

                {/* Relevance Indicator */}
                {!task.isCompleted && (
                    <View style={[styles.relevanceBar, { backgroundColor: colors.border }]}>
                        <View style={[styles.relevanceFill, { width: `${task.relevanceScore}%`, backgroundColor: scoreColor }]} />
                    </View>
                )}
            </Animated.View>
        );
    };

    if (parsedTasks.length === 0) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <FontAwesome name="file-text-o" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Tasks Found</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    The AI couldn't detect any tasks in this image
                </Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.linkButton}>
                    <Text style={[styles.linkText, { color: colors.tint }]}>Try a different image</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Score Header */}
            <LinearGradient
                colors={Colors.gradients.success as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.scoreHeader}
            >
                <Text style={styles.encouragementText}>{encouragement}</Text>
                <Text style={styles.totalScore}>{totalScore}</Text>
                <Text style={styles.totalScoreLabel}>Total Points</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <FontAwesome name="check-circle" size={16} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.statText}>{completedCount} completed</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <FontAwesome name="list" size={16} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.statText}>{parsedTasks.length} total tasks</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Task List */}
            <ScrollView
                style={styles.taskList}
                contentContainerStyle={styles.taskListContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Detected Tasks</Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                        Tap to edit • Toggle checkboxes if needed
                    </Text>
                </View>

                {parsedTasks.map((task, index) => renderTask(task, index))}
            </ScrollView>

            {/* Save Button */}
            <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveEntry}>
                    <LinearGradient
                        colors={Colors.gradients.primary as [string, string]}
                        style={styles.saveButtonGradient}
                    >
                        <FontAwesome name="save" size={18} color="#fff" />
                        <Text style={styles.saveButtonText}>Save Entry</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
    },
    linkButton: {
        padding: 8,
    },
    linkText: {
        fontSize: 16,
        fontWeight: '500',
    },
    scoreHeader: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 28,
        alignItems: 'center',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    encouragementText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 8,
    },
    totalScore: {
        fontSize: 56,
        fontWeight: 'bold',
        color: '#fff',
        lineHeight: 64,
    },
    totalScoreLabel: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statDivider: {
        width: 1,
        height: 16,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    statText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
    },
    taskList: {
        flex: 1,
    },
    taskListContent: {
        padding: 16,
        paddingBottom: 100,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
    },
    taskCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 14,
        borderRadius: 14,
        marginBottom: 10,
        borderWidth: 1,
    },
    checkboxContainer: {
        paddingRight: 12,
        paddingTop: 2,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    taskContent: {
        flex: 1,
    },
    taskText: {
        fontSize: 15,
        lineHeight: 22,
    },
    taskTextCompleted: {
        textDecorationLine: 'line-through',
        opacity: 0.7,
    },
    goalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        marginTop: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    goalBadgeText: {
        fontSize: 11,
        fontWeight: '500',
    },
    editedLabel: {
        fontSize: 11,
        marginTop: 6,
    },
    editContainer: {
        flex: 1,
    },
    editInput: {
        fontSize: 15,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        minHeight: 44,
    },
    editActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 8,
    },
    editBtn: {
        padding: 8,
    },
    scoreContainer: {
        alignItems: 'flex-end',
        marginLeft: 12,
    },
    scoreValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    scoreLabel: {
        fontSize: 11,
        marginTop: -2,
    },
    relevanceBar: {
        width: 4,
        height: 40,
        borderRadius: 2,
        marginLeft: 12,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    relevanceFill: {
        borderRadius: 2,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: 32,
        borderTopWidth: 1,
    },
    saveButton: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    saveButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 18,
    },
    saveButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#fff',
    },
});
