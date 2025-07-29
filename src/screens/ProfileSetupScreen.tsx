import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuthContext } from '../context/AuthContext';

export default function ProfileSetupScreen() {
  const { t } = useTranslation();
  const { user, setCurrentUserEmail } = useAuthContext();
  const [name, setName] = useState('');
  const [danKyuGrade, setDanKyuGrade] = useState('');
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedSport, setSelectedSport] = useState<'kendo' | 'iaido' | 'jodo' | 'naginata'>('kendo');
  const [isLoading, setIsLoading] = useState(false);

  // Get all clubs
  const clubs = useQuery(api.clubs.getClubs);

  // Mutation for creating profile
  const createProfile = useMutation(api.auth.createOrUpdateProfile);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), 'Please enter your name');
      return;
    }

    if (!danKyuGrade.trim()) {
      Alert.alert(t('common.error'), 'Please enter your dan/kyu grade');
      return;
    }

    if (!selectedClubId) {
      Alert.alert(t('common.error'), 'Please select a club');
      return;
    }

    if (!user) {
      Alert.alert(t('common.error'), 'User not found');
      return;
    }

    setIsLoading(true);
    try {
      await createProfile({
        userId: user._id as any,
        name: name.trim(),
        danKyuGrade: danKyuGrade.trim(),
        clubId: selectedClubId as any,
        sport: selectedSport,
      });

      Alert.alert('Success', 'Profile created successfully!');
      // Refresh user data to include the new profile
      setCurrentUserEmail(user.email);
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || 'Failed to create profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (!clubs) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text>Loading clubs...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Tell us about your martial arts journey</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
          editable={!isLoading}
        />

        <Text style={styles.label}>Dan/Kyu Grade</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 3 dan, 2 kyu, beginner"
          value={danKyuGrade}
          onChangeText={setDanKyuGrade}
          editable={!isLoading}
        />

        <Text style={styles.label}>Primary Sport</Text>
        <View style={styles.sportButtons}>
          {(['kendo', 'iaido', 'jodo', 'naginata'] as const).map((sport) => (
            <TouchableOpacity
              key={sport}
              style={[
                styles.sportButton,
                selectedSport === sport && styles.sportButtonSelected,
              ]}
              onPress={() => setSelectedSport(sport)}
              disabled={isLoading}
            >
              <Text
                style={[
                  styles.sportButtonText,
                  selectedSport === sport && styles.sportButtonTextSelected,
                ]}
              >
                {sport.charAt(0).toUpperCase() + sport.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Select Your Club</Text>
        <View style={styles.clubList}>
          {clubs.map((club) => (
            <TouchableOpacity
              key={club._id}
              style={[
                styles.clubButton,
                selectedClubId === club._id && styles.clubButtonSelected,
              ]}
              onPress={() => setSelectedClubId(club._id)}
              disabled={isLoading}
            >
              <Text
                style={[
                  styles.clubButtonText,
                  selectedClubId === club._id && styles.clubButtonTextSelected,
                ]}
              >
                {club.name}
              </Text>
              <Text style={styles.clubLocation}>{club.location}</Text>
              <Text style={styles.clubSports}>
                Sports: {club.sports.join(', ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Creating Profile...' : 'Complete Registration'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
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
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  sportButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  sportButtonSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  sportButtonText: {
    fontSize: 14,
    color: '#666',
  },
  sportButtonTextSelected: {
    color: '#fff',
  },
  clubList: {
    gap: 12,
  },
  clubButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  clubButtonSelected: {
    backgroundColor: '#E8F5E8',
    borderColor: '#2E7D32',
  },
  clubButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  clubButtonTextSelected: {
    color: '#2E7D32',
  },
  clubLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  clubSports: {
    fontSize: 12,
    color: '#888',
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});