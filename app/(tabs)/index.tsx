import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useGoalStore } from '@/stores/goalStore';
import type { Goal } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// API URL for phrase generation
const API_BASE_URL = 'http://192.168.1.20:3001';

export default function GoalsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { goals, addGoal, deleteGoal, fetchGoals } = useGoalStore();

  // Fetch goals on mount
  React.useEffect(() => {
    fetchGoals();
  }, []);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [title, setTitle] = useState('');
  const [targetPhrase, setTargetPhrase] = useState('');
  const [generalDescription, setGeneralDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const resetForm = () => {
    setTitle('');
    setTargetPhrase('');
    setGeneralDescription('');
    setEditingGoal(null);
    setIsGenerating(false);
  };

  const generatePhrases = useCallback(async (goalTitle: string) => {
    if (!goalTitle.trim() || goalTitle.length < 3) return;

    setIsGenerating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/generate-phrases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: goalTitle.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.phrases && data.phrases.length > 0) {
          setTargetPhrase(data.phrases.join(', '));
        }
        if (data.description) {
          setGeneralDescription(data.description);
        }
      }
    } catch (error) {
      console.log('Failed to generate phrases:', error);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setTargetPhrase(goal.targetPhrase);
    setGeneralDescription(goal.generalDescription);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a goal title');
      return;
    }

    // For now, only support adding new goals (edit not implemented in this phase)
    if (!editingGoal) {
      addGoal(title.trim(), targetPhrase.trim(), generalDescription.trim());
    }

    setModalVisible(false);
    resetForm();
  };

  const handleDelete = (goal: Goal) => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goal.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteGoal(goal.id),
        },
      ]
    );
  };

  const renderGoalCard = ({ item }: { item: Goal }) => (
    <View style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.goalContent}>
        <Text style={[styles.goalTitle, { color: colors.text }]}>{item.title}</Text>
        {item.targetPhrase ? (
          <View style={styles.phraseContainer}>
            <FontAwesome name="quote-left" size={10} color={colors.accent} />
            <Text style={[styles.targetPhrase, { color: colors.accent }]}>
              {item.targetPhrase}
            </Text>
          </View>
        ) : null}
        {item.generalDescription ? (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.generalDescription}
          </Text>
        ) : null}
      </View>
      <View style={styles.goalActions}>
        <TouchableOpacity
          onPress={() => openEditModal(item)}
          style={[styles.actionButton, { backgroundColor: colors.tint + '20' }]}
        >
          <FontAwesome name="pencil" size={16} color={colors.tint} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={[styles.actionButton, { backgroundColor: colors.error + '20' }]}
        >
          <FontAwesome name="trash" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <FontAwesome name="bullseye" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Goals Yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Add your first goal to start tracking your progress
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={Colors.gradients.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Your Goals</Text>
        <Text style={styles.headerSubtitle}>
          {goals.length} {goals.length === 1 ? 'goal' : 'goals'} defined
        </Text>
      </LinearGradient>

      {/* Goals List */}
      <FlatList
        data={goals}
        renderItem={renderGoalCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <LinearGradient
          colors={Colors.gradients.success as [string, string]}
          style={styles.addButtonGradient}
        >
          <FontAwesome name="plus" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingGoal ? 'Edit Goal' : 'New Goal'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <FontAwesome name="times" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Goal Title *</Text>
              <View style={styles.titleRow}>
                <TextInput
                  style={[styles.input, styles.titleInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g., Exercise Daily"
                  placeholderTextColor={colors.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                />
                <TouchableOpacity
                  style={[styles.generateBtn, { backgroundColor: colors.tint }, isGenerating && styles.generateBtnDisabled]}
                  onPress={() => generatePhrases(title)}
                  disabled={isGenerating || title.length < 3}
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <FontAwesome name="magic" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={[styles.hint, { color: colors.textSecondary, marginTop: 4 }]}>
                Tap ✨ to auto-generate phrases with AI
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Target Phrases</Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Keywords to match in your journal (comma-separated)
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., workout, gym, exercise"
                placeholderTextColor={colors.textSecondary}
                value={targetPhrase}
                onChangeText={setTargetPhrase}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>General Description</Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                For AI semantic matching (more flexible)
              </Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Physical fitness activities like running, swimming, or going to the gym"
                placeholderTextColor={colors.textSecondary}
                value={generalDescription}
                onChangeText={setGeneralDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <LinearGradient
                colors={Colors.gradients.primary as [string, string]}
                style={styles.saveButtonGradient}
              >
                <Text style={styles.saveButtonText}>
                  {editingGoal ? 'Update Goal' : 'Add Goal'}
                </Text>
              </LinearGradient>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  goalCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  goalContent: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  phraseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  targetPhrase: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  goalActions: {
    flexDirection: 'column',
    gap: 8,
    marginLeft: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
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
    paddingHorizontal: 40,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 28,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleInput: {
    flex: 1,
  },
  generateBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBtnDisabled: {
    opacity: 0.6,
  },
  textArea: {
    height: 80,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
