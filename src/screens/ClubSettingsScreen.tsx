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
  const clubSyncStatuses = useQuery(api.calendarSync.getClubSyncStatuses, { clubId: clubId as any });
  const recentSyncActivity = useQuery(api.calendarSync.getRecentSyncActivity, { limit: 10 });
  const userMembership = useQuery(api.clubs.isUserMemberOfClub,
    user ? { userId: user._id as Id<"users">, clubId: clubId as any } : "skip"
  );

    const [isAddingCalendar, setIsAddingCalendar] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<any>(null);
  const [calendarForm, setCalendarForm] = useState({
    name: '',
    icsUrl: '',
  });
  const [syncingCalendarId, setSyncingCalendarId] = useState<string | null>(null); // Store calendar ID when syncing
  const [isSavingCalendar, setIsSavingCalendar] = useState(false); // Loading state for saving calendar forms
  const [showSyncHistory, setShowSyncHistory] = useState(false); // Toggle sync history section

  const addCalendarSync = useMutation(api.calendarSync.addCalendarSync);
  const updateCalendarSync = useMutation(api.calendarSync.updateCalendarSync);
  const deleteCalendarSync = useMutation(api.calendarSync.deleteCalendarSync);
  const syncCalendarEvents = useAction(api.calendarSync.syncCalendarEvents);
  const getSyncStatus = useQuery(api.calendarSync.getSyncStatus,
    syncingCalendarId ? { calendarSyncId: syncingCalendarId as any } : "skip"
  );

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

    setIsSavingCalendar(true);
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
      setIsSavingCalendar(false);
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
    setSyncingCalendarId(calendar._id);
    try {
      // Start sync without awaiting (let polling handle progress)
      syncCalendarEvents({ calendarSyncId: calendar._id });
    } catch (error: any) {
      Alert.alert(t('error.title'), error.message || t('calendarSync.syncError'));
      setSyncingCalendarId(null);
    }
  };

  // Stop polling when sync is complete
  React.useEffect(() => {
    if (getSyncStatus && !getSyncStatus.isCurrentlyRunning && syncingCalendarId) {
      const wasSuccessful = getSyncStatus.lastSyncStatus === 'success';
      const progress = getSyncStatus.syncProgress;

      if (wasSuccessful && progress) {
        Alert.alert(
          t('calendarSync.syncSuccess'),
          t('calendarSync.syncSuccessMessage', {
            count: progress.processedEvents,
            created: progress.createdEvents,
            updated: progress.updatedEvents
          })
        );
      } else if (getSyncStatus.lastSyncStatus === 'error') {
        Alert.alert(t('error.title'), getSyncStatus.lastSyncError || t('calendarSync.syncError'));
      }

      setSyncingCalendarId(null);
    }
  }, [getSyncStatus?.isCurrentlyRunning, getSyncStatus?.lastSyncStatus]);

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

  const formatSyncDuration = (durationMs?: number) => {
    if (!durationMs) return '-';

    if (durationMs < 1000) {
      return `${durationMs}ms`;
    } else if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(1)}s`;
    } else {
      return `${Math.round(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`;
    }
  };

  const formatSyncProgress = (progress: any) => {
    if (!progress) return '-';

    const { processedEvents, createdEvents, updatedEvents, errorEvents } = progress;
    let summary = `${processedEvents} events`;

    if (createdEvents > 0 || updatedEvents > 0 || errorEvents > 0) {
      const parts = [];
      if (createdEvents > 0) parts.push(`${createdEvents} created`);
      if (updatedEvents > 0) parts.push(`${updatedEvents} updated`);
      if (errorEvents > 0) parts.push(`${errorEvents} errors`);
      summary += ` (${parts.join(', ')})`;
    }

    return summary;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'running': return '🔄';
      case 'cancelled': return '⏹️';
      default: return '⚪';
    }
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

        {/* Real-time Sync Progress */}
        {syncingCalendarId === calendar._id && getSyncStatus?.isCurrentlyRunning && getSyncStatus?.syncProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressPhase}>
                {getSyncStatus.syncProgress.phase === 'fetching' && '🔄 Fetching calendar...'}
                {getSyncStatus.syncProgress.phase === 'parsing' && '📖 Parsing events...'}
                {getSyncStatus.syncProgress.phase === 'processing' && '⚙️ Processing events...'}
                {getSyncStatus.syncProgress.phase === 'cleanup' && '🧹 Cleaning up...'}
                {getSyncStatus.syncProgress.phase === 'completed' && '✅ Completed'}
              </Text>
              <Text style={styles.progressPercent}>
                {getSyncStatus.syncProgress.totalEvents > 0
                  ? Math.round((getSyncStatus.syncProgress.processedEvents / getSyncStatus.syncProgress.totalEvents) * 100)
                  : 0}%
              </Text>
            </View>

            {getSyncStatus.syncProgress.totalEvents > 0 && (
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(getSyncStatus.syncProgress.processedEvents / getSyncStatus.syncProgress.totalEvents) * 100}%` }
                  ]}
                />
              </View>
            )}

            <View style={styles.progressStats}>
              <Text style={styles.progressStat}>
                📊 {getSyncStatus.syncProgress.processedEvents}/{getSyncStatus.syncProgress.totalEvents} events
              </Text>
              {getSyncStatus.syncProgress.createdEvents > 0 && (
                <Text style={styles.progressStat}>
                  ➕ {getSyncStatus.syncProgress.createdEvents} created
                </Text>
              )}
              {getSyncStatus.syncProgress.updatedEvents > 0 && (
                <Text style={styles.progressStat}>
                  ✏️ {getSyncStatus.syncProgress.updatedEvents} updated
                </Text>
              )}
              {getSyncStatus.syncProgress.errorEvents > 0 && (
                <Text style={styles.progressStat}>
                  ❌ {getSyncStatus.syncProgress.errorEvents} errors
                </Text>
              )}
            </View>

            {getSyncStatus.syncProgress.message && (
              <Text style={styles.progressMessage}>
                {getSyncStatus.syncProgress.message}
              </Text>
            )}
          </View>
        )}

        <View style={styles.calendarActions}>
          <TouchableOpacity
            style={[
              styles.syncButton,
              (syncingCalendarId === calendar._id) && styles.syncButtonLoading
            ]}
            onPress={() => handleSyncNow(calendar)}
            disabled={!calendar.isActive || !!syncingCalendarId}
          >
            <Ionicons
              name={syncingCalendarId === calendar._id ? "sync" : "sync-outline"}
              size={16}
              color={calendar.isActive ? 'white' : '#ccc'}
            />
            <Text style={[styles.syncButtonText, !calendar.isActive && styles.disabledText]}>
              {syncingCalendarId === calendar._id ? t('calendarSync.syncing') : t('calendarSync.syncNow')}
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

      {/* Sync History Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setShowSyncHistory(!showSyncHistory)}
        >
          <Text style={styles.sectionTitle}>{t('calendarSync.syncHistory')}</Text>
          <View style={styles.historyToggle}>
            <Text style={styles.historyToggleText}>
              {showSyncHistory ? t('calendarSync.hideHistory') : t('calendarSync.showHistory')}
            </Text>
            <Ionicons
              name={showSyncHistory ? "chevron-up" : "chevron-down"}
              size={20}
              color="#666"
            />
          </View>
        </TouchableOpacity>

        {showSyncHistory && (
          <View style={styles.historyContainer}>
            {/* Overall Statistics */}
            {clubSyncStatuses && clubSyncStatuses.length > 0 && (
              <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>{t('calendarSync.overallStats')}</Text>
                <View style={styles.statsGrid}>
                  {clubSyncStatuses.map(calendar => {
                    const stats = calendar.stats;
                    return (
                      <View key={calendar.id} style={styles.statCard}>
                        <Text style={styles.statCardTitle}>{calendar.name}</Text>
                        <View style={styles.statRow}>
                          <Text style={styles.statLabel}>{t('calendarSync.successRate')}:</Text>
                          <Text style={[styles.statValue, { color: stats.successRate >= 80 ? '#4CAF50' : stats.successRate >= 60 ? '#FF9800' : '#F44336' }]}>
                            {stats.successRate}%
                          </Text>
                        </View>
                        <View style={styles.statRow}>
                          <Text style={styles.statLabel}>{t('calendarSync.totalSyncs')}:</Text>
                          <Text style={styles.statValue}>{stats.totalSyncs}</Text>
                        </View>
                        <View style={styles.statRow}>
                          <Text style={styles.statLabel}>{t('calendarSync.avgDuration')}:</Text>
                          <Text style={styles.statValue}>{formatSyncDuration(stats.avgSyncDurationMs)}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Recent Activity */}
            <View style={styles.recentActivity}>
              <Text style={styles.activityTitle}>{t('calendarSync.recentActivity')}</Text>
              {recentSyncActivity && recentSyncActivity.length > 0 ? (
                <View style={styles.activityList}>
                  {recentSyncActivity.filter(activity => activity.clubId === clubId).map((activity, index) => (
                    <View key={index} style={styles.activityItem}>
                      <View style={styles.activityHeader}>
                        <View style={styles.activityInfo}>
                          <Text style={styles.activityStatus}>
                            {getStatusIcon(activity.status)} {activity.calendarName}
                          </Text>
                          <Text style={styles.activityTime}>
                            {formatLastSync(activity.syncStartedAt)}
                          </Text>
                        </View>
                        <Text style={styles.activityDuration}>
                          {formatSyncDuration(activity.durationMs)}
                        </Text>
                      </View>

                      {activity.progress && (
                        <Text style={styles.activityProgress}>
                          {formatSyncProgress(activity.progress)}
                        </Text>
                      )}

                      {activity.status === 'error' && activity.errorMessage && (
                        <Text style={styles.activityError}>
                          {activity.errorMessage}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyActivity}>
                  <Ionicons name="time-outline" size={32} color="#ccc" />
                  <Text style={styles.emptyActivityText}>{t('calendarSync.noRecentActivity')}</Text>
                </View>
              )}
            </View>
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
            <TouchableOpacity onPress={handleSaveCalendar} disabled={isSavingCalendar}>
              <Text style={[styles.modalSaveText, isSavingCalendar && styles.disabledText]}>
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
  syncButtonLoading: {
    backgroundColor: '#1976D2',
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
  progressContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressPhase: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2196F3',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 3,
  },
  progressStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  progressStat: {
    fontSize: 11,
    color: '#666',
    backgroundColor: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  progressMessage: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
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
  // Sync History Styles
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyToggleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  historyContainer: {
    marginTop: 16,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  statCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  recentActivity: {
    marginTop: 8,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  activityList: {
    gap: 8,
  },
  activityItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  activityInfo: {
    flex: 1,
  },
  activityStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
  activityDuration: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activityProgress: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  activityError: {
    fontSize: 11,
    color: '#F44336',
    fontStyle: 'italic',
    backgroundColor: '#ffebee',
    padding: 6,
    borderRadius: 4,
    marginTop: 4,
  },
  emptyActivity: {
    alignItems: 'center',
    padding: 24,
  },
  emptyActivityText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});