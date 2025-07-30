import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { useLocalSearchParams, router } from 'expo-router';
import { Id } from '../../convex/_generated/dataModel';
import ConfirmModal from '../components/ConfirmModal';

export default function ClubDetailsScreen() {
  const { t } = useTranslation();
  const { id: clubId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthContext();

  const club = useQuery(api.clubs.getClub, { id: clubId as any });
  const clubMembers = useQuery(api.clubs.getClubMembersWithRoles, { clubId: clubId as any });
  const clubEvents = useQuery(api.events.getClubEvents, { clubId: clubId as any });
  const userMembership = useQuery(api.clubs.isUserMemberOfClub,
    user ? { userId: user._id as Id<"users">, clubId: clubId as any } : "skip"
  );

  const joinClub = useMutation(api.clubs.joinClub);
  const leaveClub = useMutation(api.clubs.leaveClub);
  const updateClub = useMutation(api.clubs.updateClub);
  const updateMemberRole = useMutation(api.clubs.updateMemberRole);
  const attendEvent = useMutation(api.events.attendEvent);
  const removeAttendance = useMutation(api.events.removeAttendance);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    location: '',
    practiceSchedule: '',
    sports: [] as string[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Initialize edit form when club data loads
  React.useEffect(() => {
    if (club) {
      setEditForm({
        name: club.name,
        location: club.location,
        practiceSchedule: club.practiceSchedule,
        sports: club.sports,
      });
    }
  }, [club]);

  const isAdmin = userMembership?.role === 'admin';
  const isMember = userMembership?.isMember;

  const handleJoinClub = async () => {
    if (!user) {
      console.log('Authentication required');
      return;
    }

    if (userMembership === undefined) {
      return;
    }

    if (isMember) {
      console.log('Already a member');
      return;
    }

    setIsLoading(true);
    try {
      await joinClub({ clubId: clubId as any });
      console.log('Successfully joined club');
    } catch (error: any) {
      console.error('Failed to join club:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveClub = () => {
    setShowLeaveConfirm(true);
  };

  const performLeaveClub = async () => {
    setShowLeaveConfirm(false);
    setIsLoading(true);
    try {
      await leaveClub({ clubId: clubId as any });
    } catch (error: any) {
      console.error('Failed to leave club:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateClub = async () => {
    setIsLoading(true);
    try {
      await updateClub({
        id: clubId as any,
        name: editForm.name,
        location: editForm.location,
        practiceSchedule: editForm.practiceSchedule,
        sports: editForm.sports as any,
      });
      setIsEditing(false);
      Alert.alert(t('common.success'), t('club.updateSuccess'));
    } catch (error: any) {
      Alert.alert(t('error.title'), error.message || t('club.updateError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = (targetUserId: string, currentRole: string, userName: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    const action = newRole === 'admin' ? t('club.promote') : t('club.demote');

    Alert.alert(
      t('club.changeRole'),
      t('club.changeRoleConfirm', { action, userName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: () => performRoleChange(targetUserId, newRole)
        }
      ]
    );
  };

  const performRoleChange = async (targetUserId: string, newRole: string) => {
    try {
      await updateMemberRole({
        clubId: clubId as any,
        targetUserId: targetUserId as any,
        newRole: newRole as any,
      });
      Alert.alert(t('common.success'), t('club.roleUpdateSuccess'));
    } catch (error: any) {
      Alert.alert(t('error.title'), error.message || t('club.roleUpdateError'));
    }
  };

  const toggleSport = (sport: string) => {
    setEditForm(prev => ({
      ...prev,
      sports: prev.sports.includes(sport)
        ? prev.sports.filter(s => s !== sport)
        : [...prev.sports, sport]
    }));
  };

  const handleAttendEvent = async (eventId: string) => {
    if (!user) {
      Alert.alert(t('auth.required'), t('auth.loginToAttend'));
      return;
    }

    try {
      await attendEvent({ eventId: eventId as any });
      Alert.alert(t('events.attendSuccess'), t('events.attendSuccessMessage'));
    } catch (error: any) {
      Alert.alert(t('error.title'), error.message || t('events.attendError'));
    }
  };

  const handleRemoveAttendance = async (eventId: string) => {
    try {
      await removeAttendance({ eventId: eventId as any });
      Alert.alert(t('events.removeAttendanceSuccess'), t('events.removeAttendanceSuccessMessage'));
    } catch (error: any) {
      Alert.alert(t('error.title'), error.message || t('events.removeAttendanceError'));
    }
  };

  const formatEventDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('fi-FI', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatEventType = (type: string) => {
    const typeMap = {
      training: t('events.types.training'),
      competition: t('events.types.competition'),
      seminar: t('events.types.seminar'),
      grading: t('events.types.grading'),
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  const renderEventItem = ({ item }: any) => {
    const event = item;
    const isUpcoming = event.startTime > Date.now();
    const isPast = event.startTime < Date.now();

    return (
      <View style={styles.eventItem}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <View style={[styles.eventTypeTag, isPast && styles.pastEventTypeTag]}>
            <Text style={[styles.eventTypeText, isPast && styles.pastEventTypeText]}>
              {formatEventType(event.type)}
            </Text>
          </View>
        </View>
        
        <View style={styles.eventDetails}>
          <View style={styles.eventDetailRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.eventDetailText}>
              {formatEventDate(event.startTime)}
              {event.endTime && event.endTime !== event.startTime && 
                ` - ${formatEventDate(event.endTime)}`
              }
            </Text>
          </View>
          
          {event.location && (
            <View style={styles.eventDetailRow}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.eventDetailText}>{event.location}</Text>
            </View>
          )}
          
          <View style={styles.eventDetailRow}>
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text style={styles.eventDetailText}>
              {event.attendeeCount} {t('events.attendees')}
            </Text>
          </View>
        </View>

        {event.description && (
          <Text style={styles.eventDescription}>{event.description}</Text>
        )}

        {isMember && isUpcoming && (
          <View style={styles.eventActions}>
            <TouchableOpacity
              style={[styles.attendButton]}
              onPress={() => handleAttendEvent(event._id)}
            >
              <Ionicons name="checkmark-outline" size={16} color="white" />
              <Text style={styles.attendButtonText}>{t('events.attend')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderMemberItem = ({ item }: any) => {
    const { membership, user: memberUser, profile } = item;

    return (
      <View style={styles.memberItem}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {profile?.name || memberUser?.email || 'Unknown'}
          </Text>
          <Text style={styles.memberDetails}>
            {profile?.danKyuGrade && `${profile.danKyuGrade} • `}
            {profile?.sport && t(`sports.${profile.sport}`)}
          </Text>
        </View>

        <View style={styles.memberActions}>
          <View style={[styles.roleTag, membership.role === 'admin' && styles.adminRoleTag]}>
            <Text style={[styles.roleText, membership.role === 'admin' && styles.adminRoleText]}>
              {t(`roles.${membership.role}`)}
            </Text>
          </View>

          {isAdmin && memberUser?._id !== user?._id && (
            <TouchableOpacity
              style={styles.roleButton}
              onPress={() => handleRoleChange(
                memberUser._id,
                membership.role,
                profile?.name || memberUser.email
              )}
            >
              <Ionicons
                name={membership.role === 'admin' ? 'arrow-down' : 'arrow-up'}
                size={16}
                color="#666"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (!club) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  console.log(club);
  console.log(userMembership);
  console.log(isMember);
  console.log(user?._id);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.clubName}>{club.name}</Text>
          {isAdmin && (
            <View style={styles.adminActions}>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => router.push(`/clubs/${clubId}/settings`)}
              >
                <Ionicons name="settings-outline" size={20} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Ionicons name="create-outline" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.clubInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{club.location}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{club.practiceSchedule}</Text>
          </View>

          <View style={styles.sportsContainer}>
            {club.sports.map((sport) => (
              <View key={sport} style={styles.sportTag}>
                <Text style={styles.sportText}>{t(`sports.${sport}`)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Membership Actions */}
        {user && (
          <View style={styles.membershipActions}>
            {userMembership === undefined || isLoading ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.joinButton, { opacity: 0.7 }]}
                disabled={true}
              >
                <Text style={styles.actionButtonText}>{t('common.loading')}</Text>
              </TouchableOpacity>
            ) : !isMember ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.joinButton]}
                onPress={handleJoinClub}
                disabled={isLoading}
              >
                <Ionicons name="add-outline" size={20} color="white" />
                <Text style={styles.actionButtonText}>{t('club.join')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.leaveButton]}
                onPress={handleLeaveClub}
                disabled={isLoading}
              >
                <Ionicons name="exit-outline" size={20} color="white" />
                <Text style={styles.actionButtonText}>{t('club.leave')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Events Section */}
      {clubEvents && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('events.events')} ({clubEvents.length})
          </Text>
          {clubEvents.length > 0 ? (
            <FlatList
              data={clubEvents}
              renderItem={renderEventItem}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.emptyText}>{t('events.noEvents')}</Text>
          )}
        </View>
      )}

      {/* Members Section */}
      {isMember && clubMembers && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('club.members')} ({clubMembers.length})
          </Text>
          <FlatList
            data={clubMembers}
            renderItem={renderMemberItem}
            keyExtractor={(item) => item.membership._id}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Edit Club Modal */}
      <Modal
        visible={isEditing}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsEditing(false)}>
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('club.editClub')}</Text>
            <TouchableOpacity onPress={handleUpdateClub} disabled={isLoading}>
              <Text style={[styles.modalSaveText, isLoading && styles.disabledText]}>
                {t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('club.clubName')}</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.name}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                placeholder={t('club.clubName')}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('club.location')}</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.location}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, location: text }))}
                placeholder={t('club.location')}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('club.practiceSchedule')}</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={editForm.practiceSchedule}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, practiceSchedule: text }))}
                placeholder={t('club.practiceSchedule')}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('club.sports')}</Text>
              <View style={styles.sportsSelection}>
                {['kendo', 'iaido', 'jodo', 'naginata'].map((sport) => (
                  <TouchableOpacity
                    key={sport}
                    style={[
                      styles.sportSelectButton,
                      editForm.sports.includes(sport) && styles.sportSelectButtonActive
                    ]}
                    onPress={() => toggleSport(sport)}
                  >
                    <Text style={[
                      styles.sportSelectText,
                      editForm.sports.includes(sport) && styles.sportSelectTextActive
                    ]}>
                      {t(`sports.${sport}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Leave Club Confirmation Modal */}
      <ConfirmModal
        visible={showLeaveConfirm}
        title={t('club.leaveTitle')}
        message={t('club.leaveConfirm', { clubName: club?.name })}
        cancelText={t('common.cancel')}
        confirmText={t('club.leave')}
        onCancel={() => setShowLeaveConfirm(false)}
        onConfirm={performLeaveClub}
        confirmButtonStyle="destructive"
      />
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
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clubName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  adminActions: {
    flexDirection: 'row',
    gap: 8,
  },
  settingsButton: {
    padding: 8,
  },
  editButton: {
    padding: 8,
  },
  clubInfo: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  sportsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  sportTag: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sportText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  membershipActions: {
    marginTop: 20,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 160,
    gap: 8,
  },
  joinButton: {
    backgroundColor: '#4CAF50',
  },
  leaveButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 8,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  memberDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adminRoleTag: {
    backgroundColor: '#FFE0B2',
  },
  roleText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  adminRoleText: {
    color: '#F57C00',
  },
  roleButton: {
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
  },
  modalSaveText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  sportsSelection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportSelectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  sportSelectButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  sportSelectText: {
    fontSize: 14,
    color: '#666',
  },
  sportSelectTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  eventItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  eventTypeTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pastEventTypeTag: {
    backgroundColor: '#f5f5f5',
  },
  eventTypeText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  pastEventTypeText: {
    color: '#999',
  },
  eventDetails: {
    gap: 4,
    marginBottom: 8,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#666',
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  eventActions: {
    flexDirection: 'row',
    gap: 8,
  },
  attendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  attendButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});