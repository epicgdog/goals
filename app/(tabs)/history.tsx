import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useEntryStore } from '@/stores/entryStore';
import type { DailyEntry, ParsedTask } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function HistoryScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { entries, fetchEntries, updateEntry, isLoading } = useEntryStore();

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState<DailyEntry | null>(null);
    const [editTasks, setEditTasks] = useState<ParsedTask[]>([]);

    useEffect(() => {
        fetchEntries();
    }, []);

    const handleEditEntry = (entry: DailyEntry) => {
        setEditingEntry(entry);
        setEditTasks(entry.tasks || []);
        setShowEditModal(true);
    };

    const handleTaskTextChange = (taskId: string, newText: string) => {
        setEditTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, text: newText } : t))
        );
    };

    const handleTaskToggle = (taskId: string) => {
        setEditTasks((prev) =>
            prev.map((t) =>
                t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
            )
        );
    };

    const handleSaveEdit = async () => {
        if (!editingEntry) return;

        const totalScore = editTasks
            .filter((t) => t.isCompleted)
            .reduce((sum, t) => sum + (t.relevanceScore || 0), 0);

        const success = await updateEntry(editingEntry.id, editTasks, totalScore);

        if (success) {
            Alert.alert('Success', 'Entry updated');
            setShowEditModal(false);
            setEditingEntry(null);
            setEditTasks([]);
        } else {
            Alert.alert('Error', 'Failed to update entry');
        }
    };

    const getTotalScore = () => {
        return entries.reduce((sum, e) => sum + (e.totalScore || 0), 0);
    };

    const renderEntryItem = ({ item }: { item: DailyEntry }) => {
        const completedCount = item.tasks?.filter((t) => t.isCompleted).length || 0;
        const totalTasks = item.tasks?.length || 0;

        return (
            <TouchableOpacity
                style={[styles.entryCard, { backgroundColor: colors.surface }]}
                onPress={() => handleEditEntry(item)}
            >
                <View style={styles.entryHeader}>
                    <View>
                        <Text style={[styles.entryDate, { color: colors.text }]}>
                            {new Date(item.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric',
                            })}
                        </Text>
                        <Text style={[styles.entryStats, { color: colors.textSecondary }]}>
                            {completedCount}/{totalTasks} tasks completed
                        </Text>
                    </View>
                    <View style={styles.scoreBox}>
                        <Text style={[styles.scoreValue, { color: colors.tint }]}>
                            +{item.totalScore || 0}
                        </Text>
                    </View>
                </View>
                <View style={styles.editHint}>
                    <FontAwesome name="pencil" size={12} color={colors.textSecondary} />
                    <Text style={[styles.editHintText, { color: colors.textSecondary }]}>
                        Tap to edit
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderTaskItem = ({ item }: { item: ParsedTask }) => (
        <View style={[styles.taskItem, { backgroundColor: colors.surface }]}>
            <Switch
                value={item.isCompleted}
                onValueChange={() => handleTaskToggle(item.id)}
                trackColor={{ false: '#ccc', true: colors.tint }}
            />
            <TextInput
                style={[
                    styles.taskText,
                    { color: colors.text },
                    item.isCompleted && styles.taskCompleted,
                ]}
                value={item.text}
                onChangeText={(text) => handleTaskTextChange(item.id, text)}
                multiline
            />
            <View style={[styles.scoreBadge, { backgroundColor: `${colors.tint}20` }]}>
                <Text style={[styles.scoreText, { color: colors.tint }]}>
                    +{item.relevanceScore || 0}
                </Text>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <LinearGradient
                colors={Colors.gradients.primary as [string, string]}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>History</Text>
                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{entries.length}</Text>
                        <Text style={styles.statLabel}>Entries</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{getTotalScore()}</Text>
                        <Text style={styles.statLabel}>Total Points</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Entry List */}
            {isLoading ? (
                <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={entries}
                    renderItem={renderEntryItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <FontAwesome name="history" size={48} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No entries yet
                            </Text>
                            <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                                Capture a journal page to get started
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Edit Modal */}
            <Modal visible={showEditModal} animationType="slide" onRequestClose={() => setShowEditModal(false)}>
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <LinearGradient colors={Colors.gradients.primary as [string, string]} style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Edit Entry</Text>
                        <Text style={styles.modalDate}>
                            {editingEntry && new Date(editingEntry.date).toLocaleDateString()}
                        </Text>
                    </LinearGradient>

                    <FlatList
                        data={editTasks}
                        renderItem={renderTaskItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.taskList}
                    />

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.cancelButton]}
                            onPress={() => setShowEditModal(false)}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.tint }]}
                            onPress={handleSaveEdit}
                        >
                            <FontAwesome name="save" size={18} color="#fff" />
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 24,
    },
    stat: {
        alignItems: 'center',
    },
    statValue: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
    },
    list: {
        padding: 16,
    },
    entryCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    entryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    entryDate: {
        fontSize: 16,
        fontWeight: '600',
    },
    entryStats: {
        fontSize: 13,
        marginTop: 4,
    },
    scoreBox: {
        alignItems: 'flex-end',
    },
    scoreValue: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    editHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    editHintText: {
        fontSize: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    emptyHint: {
        fontSize: 14,
        marginTop: 8,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        paddingTop: 60,
        paddingBottom: 24,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    modalTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    modalDate: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginTop: 4,
    },
    taskList: {
        padding: 16,
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
    },
    taskText: {
        flex: 1,
        fontSize: 16,
    },
    taskCompleted: {
        textDecorationLine: 'line-through',
        opacity: 0.6,
    },
    scoreBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    scoreText: {
        fontSize: 14,
        fontWeight: '600',
    },
    modalActions: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
