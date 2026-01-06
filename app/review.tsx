import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useAnalysisStore } from '@/stores/analysisStore';
import { useGoalStore } from '@/stores/goalStore';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ReviewScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const { currentImageUri, isLoading, error, analyzeImage, clearAnalysis } = useAnalysisStore();
    const { goals } = useGoalStore();

    const handleAnalyze = async () => {
        if (goals.length === 0) {
            Alert.alert(
                'No Goals Defined',
                'Add at least one goal to help match your tasks. Would you like to continue anyway?',
                [
                    { text: 'Add Goals', onPress: () => router.push('/(tabs)') },
                    { text: 'Continue', onPress: () => startAnalysis() },
                ]
            );
            return;
        }
        await startAnalysis();
    };

    const startAnalysis = async () => {
        clearAnalysis();
        await analyzeImage(goals);

        const state = useAnalysisStore.getState();
        if (!state.error && state.parsedTasks.length > 0) {
            router.replace('/results');
        }
    };

    const handleBack = () => {
        router.back();
    };

    if (!currentImageUri) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <FontAwesome name="image" size={64} color={colors.textSecondary} />
                <Text style={[styles.errorText, { color: colors.text }]}>No image selected</Text>
                <TouchableOpacity onPress={handleBack} style={styles.linkButton}>
                    <Text style={[styles.linkText, { color: colors.tint }]}>Go back to capture</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.scrollContent}
        >
            {/* Image Preview */}
            <View style={[styles.imageContainer, { borderColor: colors.border }]}>
                <Image source={{ uri: currentImageUri }} style={styles.image} />
                {isLoading && (
                    <View style={styles.loadingOverlay}>
                        <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
                            <ActivityIndicator size="large" color={colors.tint} />
                            <Text style={[styles.loadingTitle, { color: colors.text }]}>
                                Analyzing Journal...
                            </Text>
                            <Text style={[styles.loadingSubtitle, { color: colors.textSecondary }]}>
                                This may take 5-10 seconds
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Goals Info */}
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <FontAwesome name="bullseye" size={20} color={colors.tint} />
                <View style={styles.infoContent}>
                    <Text style={[styles.infoTitle, { color: colors.text }]}>
                        {goals.length} {goals.length === 1 ? 'Goal' : 'Goals'} Active
                    </Text>
                    <Text style={[styles.infoSubtitle, { color: colors.textSecondary }]}>
                        Tasks will be matched against your defined goals
                    </Text>
                </View>
            </View>

            {/* Error State */}
            {error && (
                <View style={[styles.errorCard, { backgroundColor: colors.error + '15', borderColor: colors.error + '40' }]}>
                    <FontAwesome name="exclamation-triangle" size={24} color={colors.error} />
                    <View style={styles.errorContent}>
                        <Text style={[styles.errorTitle, { color: colors.error }]}>Analysis Failed</Text>
                        <Text style={[styles.errorMessage, { color: colors.text }]}>{error}</Text>
                    </View>
                </View>
            )}

            {/* Analysis Steps */}
            <View style={styles.stepsContainer}>
                <Text style={[styles.stepsTitle, { color: colors.text }]}>What happens next:</Text>

                <View style={styles.step}>
                    <View style={[styles.stepIcon, { backgroundColor: colors.tint + '20' }]}>
                        <FontAwesome name="font" size={16} color={colors.tint} />
                    </View>
                    <View style={styles.stepContent}>
                        <Text style={[styles.stepLabel, { color: colors.text }]}>Text Recognition</Text>
                        <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                            AI reads your handwritten text
                        </Text>
                    </View>
                </View>

                <View style={styles.step}>
                    <View style={[styles.stepIcon, { backgroundColor: colors.success + '20' }]}>
                        <FontAwesome name="check-square" size={16} color={colors.success} />
                    </View>
                    <View style={styles.stepContent}>
                        <Text style={[styles.stepLabel, { color: colors.text }]}>Checkbox Detection</Text>
                        <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                            Identifies completed vs pending tasks
                        </Text>
                    </View>
                </View>

                <View style={styles.step}>
                    <View style={[styles.stepIcon, { backgroundColor: colors.accent + '20' }]}>
                        <FontAwesome name="link" size={16} color={colors.accent} />
                    </View>
                    <View style={styles.stepContent}>
                        <Text style={[styles.stepLabel, { color: colors.text }]}>Goal Matching</Text>
                        <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                            Links tasks to your goals with relevance scores
                        </Text>
                    </View>
                </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
                style={[styles.analyzeButton, isLoading && styles.analyzeButtonDisabled]}
                onPress={handleAnalyze}
                disabled={isLoading}
            >
                <LinearGradient
                    colors={isLoading ? ['#9ca3af', '#6b7280'] : Colors.gradients.primary as [string, string]}
                    style={styles.analyzeButtonGradient}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <FontAwesome name="magic" size={20} color="#fff" />
                            <Text style={styles.analyzeButtonText}>
                                {error ? 'Try Again' : 'Start Analysis'}
                            </Text>
                        </>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    errorText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 12,
    },
    linkButton: {
        padding: 8,
    },
    linkText: {
        fontSize: 16,
        fontWeight: '500',
    },
    imageContainer: {
        height: 280,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        marginBottom: 16,
    },
    image: {
        flex: 1,
        resizeMode: 'cover',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingCard: {
        paddingHorizontal: 32,
        paddingVertical: 24,
        borderRadius: 16,
        alignItems: 'center',
    },
    loadingTitle: {
        fontSize: 17,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 4,
    },
    loadingSubtitle: {
        fontSize: 14,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
        gap: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    infoSubtitle: {
        fontSize: 13,
    },
    errorCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
        gap: 12,
    },
    errorContent: {
        flex: 1,
    },
    errorTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    errorMessage: {
        fontSize: 14,
        lineHeight: 20,
    },
    stepsContainer: {
        marginBottom: 24,
    },
    stepsTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    step: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    stepIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepContent: {
        flex: 1,
    },
    stepLabel: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 2,
    },
    stepDesc: {
        fontSize: 13,
    },
    analyzeButton: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    analyzeButtonDisabled: {
        shadowOpacity: 0,
        elevation: 0,
    },
    analyzeButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 18,
    },
    analyzeButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#fff',
    },
});
