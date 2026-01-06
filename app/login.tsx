import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/stores/authStore';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Google from 'expo-auth-session/providers/google';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// Check if Google OAuth is configured
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const IS_DEV = __DEV__;

export default function LoginScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { login, isLoading, isAuthenticated } = useAuthStore();
    const [devLoading, setDevLoading] = useState(false);

    // Only use Google auth if configured
    const googleConfig = GOOGLE_CLIENT_ID ? {
        clientId: GOOGLE_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || GOOGLE_CLIENT_ID,
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || GOOGLE_CLIENT_ID,
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || GOOGLE_CLIENT_ID,
    } : undefined;

    const [request, response, promptAsync] = Google.useAuthRequest(
        googleConfig || { clientId: 'placeholder' }
    );

    useEffect(() => {
        if (isAuthenticated) {
            router.replace('/(tabs)');
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (response?.type === 'success') {
            handleGoogleResponse(response.authentication?.accessToken);
        }
    }, [response]);

    const handleGoogleResponse = async (accessToken: string | undefined) => {
        if (!accessToken) return;

        try {
            const userInfoResponse = await fetch(
                'https://www.googleapis.com/userinfo/v2/me',
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const userInfo = await userInfoResponse.json();
            const success = await login(userInfo.id, userInfo.email, userInfo.name);

            if (success) {
                router.replace('/(tabs)');
            }
        } catch (error) {
            console.error('Google auth error:', error);
            Alert.alert('Error', 'Failed to sign in with Google');
        }
    };

    // Dev mode: skip login with a test user
    const handleDevLogin = async () => {
        setDevLoading(true);
        try {
            const success = await login(
                'dev-user-12345',
                'dev@example.com',
                'Dev User'
            );
            if (success) {
                router.replace('/(tabs)');
            }
        } catch (error) {
            Alert.alert('Error', 'Dev login failed');
        } finally {
            setDevLoading(false);
        }
    };

    const handleGooglePress = () => {
        if (!GOOGLE_CLIENT_ID) {
            Alert.alert(
                'Google OAuth Not Configured',
                'Add EXPO_PUBLIC_GOOGLE_CLIENT_ID to your .env file.\n\nUse "Dev Login" for testing.',
                [{ text: 'OK' }]
            );
            return;
        }
        promptAsync();
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient
                colors={Colors.gradients.primary as [string, string]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Logo/Icon */}
                <View style={styles.logoContainer}>
                    <FontAwesome name="bullseye" size={80} color="#fff" />
                    <Text style={styles.appName}>Goals Tracker</Text>
                    <Text style={styles.tagline}>
                        Turn your journal into achievements
                    </Text>
                </View>

                {/* Login Card */}
                <View style={[styles.loginCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.welcomeText, { color: colors.text }]}>
                        Welcome!
                    </Text>
                    <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                        Sign in to sync your goals and track progress across devices
                    </Text>

                    {/* Google Login Button */}
                    <TouchableOpacity
                        style={[styles.googleButton, isLoading && styles.buttonDisabled]}
                        onPress={handleGooglePress}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#4285F4" />
                        ) : (
                            <>
                                <FontAwesome name="google" size={20} color="#4285F4" />
                                <Text style={styles.googleButtonText}>
                                    Continue with Google
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Dev Login Button (only in development) */}
                    {IS_DEV && (
                        <TouchableOpacity
                            style={[styles.devButton, devLoading && styles.buttonDisabled]}
                            onPress={handleDevLogin}
                            disabled={devLoading}
                        >
                            {devLoading ? (
                                <ActivityIndicator color="#666" />
                            ) : (
                                <>
                                    <FontAwesome name="code" size={16} color="#666" />
                                    <Text style={styles.devButtonText}>
                                        Dev Login (Testing)
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
                        By signing in, you agree to our Terms of Service
                    </Text>
                </View>

                {/* Features */}
                <View style={styles.features}>
                    <View style={styles.feature}>
                        <FontAwesome name="camera" size={24} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.featureText}>Snap your journal</Text>
                    </View>
                    <View style={styles.feature}>
                        <FontAwesome name="magic" size={24} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.featureText}>AI analysis</Text>
                    </View>
                    <View style={styles.feature}>
                        <FontAwesome name="line-chart" size={24} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.featureText}>Track progress</Text>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 16,
    },
    tagline: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 8,
    },
    loginCard: {
        borderRadius: 24,
        padding: 28,
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    instructionText: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 12,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    googleIcon: {
        width: 24,
        height: 24,
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    disclaimer: {
        fontSize: 12,
        textAlign: 'center',
    },
    features: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    feature: {
        alignItems: 'center',
        gap: 8,
    },
    featureText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
    },
    devButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 8,
    },
    devButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
    },
});
