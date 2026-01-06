import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/stores/authStore';
import { useGoalStore } from '@/stores/goalStore';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
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

const API_BASE_URL = 'http://192.168.1.20:3001';

interface ParsedTask {
    id: string;
    text: string;
    isCompleted: boolean;
    relevanceScore: number;
    relatedGoalId: string | null;
}

export default function CaptureScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const cameraRef = useRef<CameraView>(null);
    const { goals } = useGoalStore();
    const { user } = useAuthStore();

    const [permission, requestPermission] = useCameraPermissions();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStep, setAnalysisStep] = useState('');

    // Result Modal State
    const [showResultModal, setShowResultModal] = useState(false);
    const [tasks, setTasks] = useState<ParsedTask[]>([]);
    const [totalScore, setTotalScore] = useState(0);

    // Calculate total score when tasks change
    useEffect(() => {
        const score = tasks
            .filter(t => t.isCompleted)
            .reduce((sum, t) => sum + t.relevanceScore, 0);
        setTotalScore(score);
    }, [tasks]);

    const handleCapture = async () => {
        if (!cameraRef.current) return;

        try {
            setIsAnalyzing(true);
            setAnalysisStep('Capturing image...');

            // Take photo with base64
            const photo = await cameraRef.current.takePictureAsync({
                base64: true,
                quality: 0.7,
            });

            if (!photo?.base64) {
                throw new Error('Failed to capture image');
            }

            setAnalysisStep('Analyzing with AI...');

            // Send directly to API - no saving to gallery!
            const response = await fetch(`${API_BASE_URL}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': user?.id?.toString() || '',
                },
                body: JSON.stringify({
                    image: photo.base64,
                    goals: goals,
                }),
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            const data = await response.json();

            // Add IDs to tasks
            const tasksWithIds = data.tasks.map((t: ParsedTask, i: number) => ({
                ...t,
                id: `task-${i}-${Date.now()}`,
            }));

            setTasks(tasksWithIds);
            setShowResultModal(true);

            // Clear image data from memory (base64 no longer referenced)
        } catch (error) {
            console.error('Capture error:', error);
            Alert.alert('Error', 'Failed to analyze image. Please try again.');
        } finally {
            setIsAnalyzing(false);
            setAnalysisStep('');
        }
    };

    const handleTaskTextChange = (taskId: string, newText: string) => {
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, text: newText } : t
        ));
    };

    const handleTaskToggle = (taskId: string) => {
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
        ));
    };

    const handleSaveEntry = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/entries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': user?.id?.toString() || '',
                },
                body: JSON.stringify({
                    tasks: tasks,
                    totalScore: totalScore,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save entry');
            }

            Alert.alert('Success', `Entry saved! You earned ${totalScore} points.`);
            setShowResultModal(false);
            setTasks([]);
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Error', 'Failed to save entry. Please try again.');
        }
    };

    const handleDiscard = () => {
        setShowResultModal(false);
        setTasks([]);
    };

    // Permission handling
    if (!permission) {
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <View style={[styles.container, styles.permissionContainer, { backgroundColor: colors.background }]}>
                <FontAwesome name="camera" size={64} color={colors.textSecondary} />
                <Text style={[styles.permissionText, { color: colors.text }]}>
                    Camera access is required
                </Text>
                <TouchableOpacity
                    style={[styles.permissionButton, { backgroundColor: colors.tint }]}
                    onPress={requestPermission}
                >
                    <Text style={styles.permissionButtonText}>Grant Access</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const renderTaskItem = ({ item }: { item: ParsedTask }) => (
        <View style={[styles.taskItem, { backgroundColor: colors.surface }]}>
            <Switch
                value={item.isCompleted}
                onValueChange={() => handleTaskToggle(item.id)}
                trackColor={{ false: '#ccc', true: colors.tint }}
            />
            <TextInput
                style={[styles.taskText, { color: colors.text }, item.isCompleted && styles.taskCompleted]}
                value={item.text}
                onChangeText={(text) => handleTaskTextChange(item.id, text)}
                multiline
            />
            <View style={[styles.scoreBadge, { backgroundColor: `${colors.tint}20` }]}>
                <Text style={[styles.scoreText, { color: colors.tint }]}>
                    +{item.relevanceScore}
                </Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Full-screen Camera */}
            <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing="back"
            >
                {/* Overlay gradient for UI visibility */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent', 'rgba(0,0,0,0.6)']}
                    style={StyleSheet.absoluteFill}
                />

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerText}>Point at your journal</Text>
                </View>

                {/* Loading Overlay */}
                {isAnalyzing && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.loadingText}>{analysisStep}</Text>
                    </View>
                )}

                {/* Shutter Button */}
                <View style={styles.controls}>
                    <TouchableOpacity
                        style={styles.shutterButton}
                        onPress={handleCapture}
                        disabled={isAnalyzing}
                    >
                        <View style={styles.shutterInner} />
                    </TouchableOpacity>
                </View>
            </CameraView>

            {/* Result Modal */}
            <Modal
                visible={showResultModal}
                animationType="slide"
                onRequestClose={handleDiscard}
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    {/* Modal Header */}
                    <LinearGradient
                        colors={Colors.gradients.primary as [string, string]}
                        style={styles.modalHeader}
                    >
                        <Text style={styles.modalTitle}>Analysis Results</Text>
                        <View style={styles.scoreContainer}>
                            <Text style={styles.scoreLabel}>Total Score</Text>
                            <Text style={styles.scoreValue}>{totalScore}</Text>
                        </View>
                    </LinearGradient>

                    {/* Task List */}
                    <FlatList
                        data={tasks}
                        renderItem={renderTaskItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.taskList}
                        ListEmptyComponent={
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No tasks detected
                            </Text>
                        }
                    />

                    {/* Action Buttons */}
                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.discardButton]}
                            onPress={handleDiscard}
                        >
                            <Text style={styles.discardButtonText}>Discard</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.tint }]}
                            onPress={handleSaveEntry}
                        >
                            <FontAwesome name="save" size={18} color="#fff" />
                            <Text style={styles.saveButtonText}>Save Entry</Text>
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
    permissionContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    permissionText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 24,
    },
    permissionButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
    },
    headerText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 16,
    },
    controls: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    shutterButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#fff',
    },
    shutterInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
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
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 8,
    },
    scoreLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginRight: 8,
    },
    scoreValue: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
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
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        marginTop: 40,
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
    discardButton: {
        backgroundColor: '#f0f0f0',
    },
    discardButtonText: {
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
