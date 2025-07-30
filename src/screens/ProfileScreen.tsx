import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuthContext } from '../context/AuthContext';

interface EditableField {
  field: 'name' | 'danKyuGrade' | 'sport';
  value: string;
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, profile, signOut } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state for editing
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    danKyuGrade: profile?.danKyuGrade || '',
    sport: profile?.sport || 'kendo' as 'kendo' | 'iaido' | 'jodo' | 'naginata',
  });

  // Get user's club memberships and all clubs
  const userMemberships = useQuery(api.clubs.getUserMemberships,
    user ? { userId: user._id } : "skip"
  );
  const allClubs = useQuery(api.clubs.getClubs);

  // Mutations
  const updateProfile = useMutation(api.auth.createOrUpdateProfile);
  const setPrimaryClub = useMutation(api.auth.setPrimaryClub);

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        danKyuGrade: profile.danKyuGrade,
        sport: profile.sport,
      });
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!formData.name.trim() || !formData.danKyuGrade.trim()) {
      Alert.alert(t('common.error'), 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile({
        name: formData.name.trim(),
        danKyuGrade: formData.danKyuGrade.trim(),
        sport: formData.sport,
        clubId: profile?.clubId,
      });
      setIsEditing(false);
      setEditingField(null);
    } catch (error) {
      console.error('Error updating profile:', error);
             Alert.alert(t('common.error'), t('profile.failedToUpdate'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePrimaryClub = async (clubId: string | undefined) => {
    try {
      setIsLoading(true);
      await setPrimaryClub({ clubId });
    } catch (error) {
      console.error('Error changing primary club:', error);
             Alert.alert(t('common.error'), t('profile.failedToChangeClub'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      t('auth.signOut'),
      t('profile.signOutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.signOut'), style: 'destructive', onPress: signOut },
      ]
    );
  };

  const sports = ['kendo', 'iaido', 'jodo', 'naginata'] as const;

  const renderEditableField = (
    label: string,
    value: string,
    field: 'name' | 'danKyuGrade' | 'sport',
    isDropdown = false
  ) => {
    const isEditingThis = editingField?.field === field;

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {isEditingThis ? (
          <View style={styles.editContainer}>
            {isDropdown ? (
              <View style={styles.dropdownContainer}>
                {sports.map((sport) => (
                  <TouchableOpacity
                    key={sport}
                    style={[
                      styles.dropdownOption,
                      formData.sport === sport && styles.dropdownOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, sport })}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        formData.sport === sport && styles.dropdownOptionTextSelected,
                      ]}
                    >
                      {t(`sports.${sport}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TextInput
                style={styles.editInput}
                value={formData[field] as string}
                onChangeText={(text) => setFormData({ ...formData, [field]: text })}
                placeholder={label}
                autoFocus
              />
            )}
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>{t('common.save')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditingField(null);
                  setIsEditing(false);
                  setFormData({
                    name: profile?.name || '',
                    danKyuGrade: profile?.danKyuGrade || '',
                    sport: profile?.sport || 'kendo',
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.fieldValueContainer}>
            <Text style={styles.fieldValue}>
              {field === 'sport' ? t(`sports.${value}`) : value}
            </Text>
            <TouchableOpacity
              style={styles.editIcon}
              onPress={() => {
                setEditingField({ field, value });
                setIsEditing(true);
              }}
            >
              <Ionicons name="pencil" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.noProfileText}>{t('profile.noProfile')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header with profile info */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color="#2E7D32" />
        </View>
        <Text style={styles.nameText}>{profile.name}</Text>
        <Text style={styles.emailText}>{user?.email}</Text>
      </View>

      {/* Profile Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.profileInformation')}</Text>
        
        {renderEditableField(t('profile.name'), profile.name, 'name')}
        {renderEditableField(t('profile.danKyuGrade'), profile.danKyuGrade, 'danKyuGrade')}
        {renderEditableField(t('profile.sport'), profile.sport, 'sport', true)}
      </View>

      {/* Club Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.clubInformation')}</Text>
        
        {profile.clubId && allClubs ? (
          <View style={styles.clubContainer}>
            <Text style={styles.fieldLabel}>{t('profile.primaryClub')}</Text>
            <View style={styles.clubInfo}>
              <Text style={styles.clubName}>
                {allClubs.find(club => club._id === profile.clubId)?.name || 'Unknown Club'}
              </Text>
              <TouchableOpacity
                style={styles.changeClubButton}
                onPress={() => handleChangePrimaryClub(undefined)}
              >
                <Text style={styles.changeClubText}>{t('profile.removePrimary')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.noClubText}>{t('profile.noPrimaryClub')}</Text>
        )}

        {userMemberships && userMemberships.length > 0 && (
          <View style={styles.memberClubsContainer}>
            <Text style={styles.fieldLabel}>{t('profile.memberOfClubs')}</Text>
            {userMemberships.map((membershipData) => {
              const club = membershipData.club;
              if (!club) return null;
              
              return (
                <View key={membershipData._id} style={styles.memberClubItem}>
                  <Text style={styles.memberClubName}>{club.name}</Text>
                  <Text style={styles.memberClubRole}>{membershipData.role}</Text>
                  {profile.clubId !== club._id && (
                    <TouchableOpacity
                      style={styles.setPrimaryButton}
                      onPress={() => handleChangePrimaryClub(club._id)}
                    >
                      <Text style={styles.setPrimaryText}>{t('profile.setAsPrimary')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#d32f2f" />
          <Text style={styles.signOutText}>{t('auth.signOut')}</Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 20,
    marginBottom: 10,
  },
  avatarContainer: {
    marginBottom: 10,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  fieldContainer: {
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  fieldValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  editIcon: {
    padding: 5,
  },
  editContainer: {
    marginTop: 5,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  dropdownContainer: {
    marginBottom: 10,
  },
  dropdownOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 5,
  },
  dropdownOptionSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownOptionTextSelected: {
    color: '#fff',
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  clubContainer: {
    marginBottom: 15,
  },
  clubInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clubName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  changeClubButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
  },
  changeClubText: {
    fontSize: 14,
    color: '#666',
  },
  noClubText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  memberClubsContainer: {
    marginTop: 15,
  },
  memberClubItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberClubName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  memberClubRole: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  setPrimaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2E7D32',
    borderRadius: 6,
  },
  setPrimaryText: {
    fontSize: 14,
    color: '#fff',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  signOutText: {
    fontSize: 16,
    color: '#d32f2f',
    fontWeight: '600',
    marginLeft: 8,
  },
  noProfileText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginTop: 50,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});