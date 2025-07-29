import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../context/AuthContext';

export default function AuthScreen() {
  const { t } = useTranslation();
  const { signIn, signUp } = useAuthContext();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'student' | 'sensei' | 'club_admin' | 'guardian'>('student');

  const handleAuth = async () => {
    if (!email.trim()) {
      Alert.alert(t('common.error'), 'Please enter your email');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert(t('common.error'), 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUp(email.trim().toLowerCase(), selectedRole);
        Alert.alert('Success', 'User created successfully!');
      } else {
        await signIn(email.trim().toLowerCase());
      }
    } catch (error: any) {
      const errorMessage = error?.message || (isSignUp ? 'Failed to create user. Please try again.' : 'Failed to sign in. Please try again.');
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Super dojo</Text>
          <Text style={styles.subtitle}>Welcome to your martial arts community</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t('auth.email')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />

          {isSignUp && (
            <View style={styles.roleSelection}>
              <Text style={styles.label}>Select your role:</Text>
              <View style={styles.roleButtons}>
                {(['student', 'sensei', 'club_admin', 'guardian'] as const).map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleButton,
                      selectedRole === role && styles.roleButtonSelected,
                    ]}
                    onPress={() => setSelectedRole(role)}
                    disabled={isLoading}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        selectedRole === role && styles.roleButtonTextSelected,
                      ]}
                    >
                      {role.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading
                ? t('common.loading')
                : isSignUp
                  ? 'Create Account'
                  : t('auth.signIn')
              }
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsSignUp(!isSignUp)}
            disabled={isLoading}
          >
            <Text style={styles.switchButtonText}>
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"
              }
            </Text>
          </TouchableOpacity>

          <Text style={styles.helpText}>
            {isSignUp
              ? 'Create a new account to join the martial arts community'
              : 'For demo purposes, enter any email address to sign in'
            }
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  roleSelection: {
    marginBottom: 24,
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  roleButtonSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  roleButtonText: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  roleButtonTextSelected: {
    color: '#fff',
  },
  switchButton: {
    marginTop: 16,
    marginBottom: 8,
  },
  switchButtonText: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});