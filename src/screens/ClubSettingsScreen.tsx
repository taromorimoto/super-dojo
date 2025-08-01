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
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { useLocalSearchParams } from 'expo-router';
import { Id } from '../../convex/_generated/dataModel';

export default function ClubSettingsScreen() {
  const { t } = useTranslation();
  const { id: clubId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthContext();

  const club = useQuery(api.clubs.getClub, { id: clubId as any });
  const calendarSyncs = useQuery(api.calendarSync.getClubCalendarSyncs, { clubId: clubId as any });
  const userMembership = useQuery(api.clubs.isUserMemberOfClub,
    user ? { userId: user._id as Id<"users">, clubId: clubId as any } : "skip"
  );

  const addCalendarSync = useMutation(api.calendarSync.addCalendarSync);
  const updateCalendarSync = useMutation(api.calendarSync.updateCalendarSync);
  const deleteCalendarSync = useMutation(api.calendarSync.deleteCalendarSync);
  const syncCalendarEvents = useAction(api.calendarSync.syncCalendarEvents);

  const [isAddingCalendar, setIsAddingCalendar] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<any>(null);
  const [calendarForm, setCalendarForm] = useState({
    name: '',
    icsUrl: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const isAdmin = userMembership?.role === 'admin';

  React.useEffect(() => {
    if (!isAdmin && userMembership !== undefined) {
      Alert.alert(t('error.title'), t('club.adminRequired'));
    }
  }, [isAdmin, userMembership]);

  const handleAddCalendar = () => {
    setCalendarForm({ name: '', icsUrl: '' });
    setIsAddingCalendar(true);
  };

  const handleEditCalendar = (calendar: any) => {
    setCalendarForm({ name: calendar.name, icsUrl: calendar.icsUrl });
    setEditingCalendar(calendar);
  };

  const handleSaveCalendar = async () => {
    if (!calendarForm.name.trim() || !calendarForm.icsUrl.trim()) {
      Alert.alert(t('error.title'), t('calendarSync.fillAllFields'));
      return;
    }

    // Basic URL validation
    try {
      new URL(calendarForm.icsUrl);
    } catch {
      Alert.alert(t('error.title'), t('calendarSync.invalidUrl'));
      return;
    }

    setIsLoading(true);
    try {
      if (editingCalendar) {
        await updateCalendarSync({
          id: editingCalendar._id,
          name: calendarForm.name,
          icsUrl: calendarForm.icsUrl,
        });
      } else {
        await addCalendarSync({
          clubId: clubId as any,
          name: calendarForm.name,
          icsUrl: calendarForm.icsUrl,
        });
      }
      setIsAddingCalendar(false);
      setEditingCalendar(null);
      Alert.alert(t('common.success'), t('calendarSync.saveSuccess'));
    } catch (error: any) {
      Alert.alert(t('error.title'), error.message || t('calendarSync.saveError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCalendar = (calendar: any) => {
    Alert.alert(
      t('calendarSync.deleteTitle'),
      t('calendarSync.deleteConfirm', { name: calendar.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => performDeleteCalendar(calendar)
        }
      ]
    );
  };

  const performDeleteCalendar = async (calendar: any) => {
    try {
      await deleteCalendarSync({ id: calendar._id });
      Alert.alert(t('common.success'), t('calendarSync.deleteSuccess'));
    } catch (error: any) {
      Alert.alert(t('error.title'), error.message || t('calendarSync.deleteError'));
    }
  };

  const handleToggleActive = async (calendar: any) => {
    try {
      await updateCalendarSync({
        id: calendar._id,
        isActive: !calendar.isActive,
      });
    } catch (error: any) {
      Alert.alert(t('error.title'), error.message || t('calendarSync.toggleError'));
    }
  };

  const handleSyncNow = async (calendar: any) => {
    setIsLoading(true);
    try {
      const result = await syncCalendarEvents({ calendarSyncId: calendar._id });
      Alert.alert(
        t('calendarSync.syncSuccess'),
        t('calendarSync.syncSuccessMessage', { count: result.eventsProcessed })
      );
    } catch (error: any) {
      Alert.alert(t('error.title'), error.message || t('calendarSync.syncError'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastSync = (timestamp?: number) => {
    if (!timestamp) return t('calendarSync.neverSynced');
    
    const date = new Date(timestamp);
    return date.toLocaleString('fi-FI', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderCalendarItem = ({ item }: any) => {
    const calendar = item;
    
    return (
      <View style={styles.calendarItem}>
        <View style={styles.calendarHeader}>
          <View style={styles.calendarInfo}>
            <Text style={styles.calendarName}>{calendar.name}</Text>
            <Text style={styles.calendarUrl} numberOfLines={1}>{calendar.icsUrl}</Text>
          </View>
          
          <Switch
            value={calendar.isActive}
            onValueChange={() => handleToggleActive(calendar)}
            trackColor={{ false: '#ddd', true: '#4CAF50' }}
            thumbColor={calendar.isActive ? 'white' : '#f4f3f4'}
          />
        </View>

        <View style={styles.calendarDetails}>
          <Text style={styles.calendarStatus}>
            {t('calendarSync.lastSync')}: {formatLastSync(calendar.lastSyncAt)}
          </Text>
          {calendar.lastSyncStatus === 'error' && calendar.lastSyncError && (
            <Text style={styles.calendarError}>
              {t('error.title')}: {calendar.lastSyncError}
            </Text>
          )}
        </View>

        <View style={styles.calendarActions}>
          <TouchableOpacity
            style={styles.syncButton}
            onPress={() => handleSyncNow(calendar)}
            disabled={!calendar.isActive || isLoading}
          >
            <Ionicons name="sync-outline" size={16} color={calendar.isActive ? 'white' : '#ccc'} />
            <Text style={[styles.syncButtonText, !calendar.isActive && styles.disabledText]}>
              {t('calendarSync.syncNow')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditCalendar(calendar)}
          >
            <Ionicons name="create-outline" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteCalendar(calendar)}
          >
            <Ionicons name="trash-outline" size={16} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!isAdmin && userMembership !== undefined) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="lock-closed-outline" size={64} color="#ccc" />
        <Text style={styles.errorTitle}>{t('club.adminRequired')}</Text>
        <Text style={styles.errorText}>{t('club.adminRequiredDescription')}</Text>
      </View>
    );
  }

  if (!club || userMembership === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('club.settings')}</Text>
        <Text style={styles.subtitle}>{club.name}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('calendarSync.calendarSyncs')}</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddCalendar}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>{t('calendarSync.addCalendar')}</Text>
          </TouchableOpacity>
        </View>

        {calendarSyncs && calendarSyncs.length > 0 ? (
          <FlatList
            data={calendarSyncs}
            renderItem={renderCalendarItem}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>{t('calendarSync.noCalendars')}</Text>
            <Text style={styles.emptySubtext}>{t('calendarSync.addFirstCalendar')}</Text>
          </View>
        )}
      </View>

      {/* Calendar Form Modal */}
      <Modal
        visible={isAddingCalendar || !!editingCalendar}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setIsAddingCalendar(false);
              setEditingCalendar(null);
            }}>
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingCalendar ? t('calendarSync.editCalendar') : t('calendarSync.addCalendar')}
            </Text>
            <TouchableOpacity onPress={handleSaveCalendar} disabled={isLoading}>
              <Text style={[styles.modalSaveText, isLoading && styles.disabledText]}>
                {t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('calendarSync.calendarName')}</Text>
              <TextInput
                style={styles.formInput}
                value={calendarForm.name}
                onChangeText={(text) => setCalendarForm(prev => ({ ...prev, name: text }))}
                placeholder={t('calendarSync.calendarNamePlaceholder')}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('calendarSync.icsUrl')}</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={calendarForm.icsUrl}
                onChangeText={(text) => setCalendarForm(prev => ({ ...prev, icsUrl: text }))}
                placeholder="https://calendar.google.com/calendar/ical/..."
                multiline
                numberOfLines={3}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.helpText}>{t('calendarSync.icsUrlHelp')}</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 8,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
    textAlign: 'center',
  },
  calendarItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  calendarInfo: {
    flex: 1,
    marginRight: 12,
  },
  calendarName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  calendarUrl: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 4,
  },
  calendarDetails: {
    marginBottom: 12,
  },
  calendarStatus: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  calendarError: {
    fontSize: 12,
    color: '#F44336',
    fontStyle: 'italic',
  },
  calendarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    flex: 1,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  disabledText: {
    color: '#ccc',
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
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
});