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
  const runningSyncs = useQuery(api.calendarSync.getRunningSyncs, {});
  const syncStats = useQuery(api.calendarSync.getSyncStatsSummary, { clubId: clubId as any });
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

  const formatElapsedTime = (startTime?: number) => {
    if (!startTime) return '0s';
    const elapsed = Date.now() - startTime;

    if (elapsed < 1000) {
      return `${elapsed}ms`;
    } else if (elapsed < 60000) {
      return `${(elapsed / 1000).toFixed(1)}s`;
    } else {
      return `${Math.floor(elapsed / 60000)}m ${Math.floor((elapsed % 60000) / 1000)}s`;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';

    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
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
            {/* Header with phase and percentage */}
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

            {/* Time and Performance Info */}
            <View style={styles.progressTimingRow}>
              <Text style={styles.progressTiming}>
                ⏱️ {formatElapsedTime(getSyncStatus.currentSyncStartedAt)}
              </Text>
              {getSyncStatus.syncProgress.phase === 'processing' && getSyncStatus.syncProgress.totalEvents > 0 && (
                <Text style={styles.progressTiming}>
                  🔥 {Math.round(getSyncStatus.syncProgress.processedEvents / ((Date.now() - (getSyncStatus.currentSyncStartedAt || Date.now())) / 1000))} events/s
                </Text>
              )}
            </View>

            {/* Progress Bar */}
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

            {/* Main Statistics */}
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
              {getSyncStatus.syncProgress.skippedEvents > 0 && (
                <Text style={styles.progressStat}>
                  ⏭️ {getSyncStatus.syncProgress.skippedEvents} skipped
                </Text>
              )}
              {getSyncStatus.syncProgress.errorEvents > 0 && (
                <Text style={styles.progressStat}>
                  ❌ {getSyncStatus.syncProgress.errorEvents} errors
                </Text>
              )}
              {getSyncStatus.syncProgress.removedEvents > 0 && (
                <Text style={styles.progressStat}>
                  🗑️ {getSyncStatus.syncProgress.removedEvents} removed
                </Text>
              )}
            </View>

            {/* Current Message */}
            {getSyncStatus.syncProgress.message && (
              <Text style={styles.progressMessage}>
                {getSyncStatus.syncProgress.message}
              </Text>
            )}

            {/* Cleanup Details */}
            {getSyncStatus?.syncProgress?.cleanupDetails && getSyncStatus.syncProgress.cleanupDetails.length > 0 && (
              <View style={styles.cleanupDetails}>
                <Text style={styles.cleanupTitle}>🗑️ Recently Removed Events:</Text>
                {getSyncStatus.syncProgress.cleanupDetails.map((eventDetail, index) => (
                  <Text key={index} style={styles.cleanupItem}>
                    • {eventDetail}
                  </Text>
                ))}
                {getSyncStatus.syncProgress.removedEvents > getSyncStatus.syncProgress.cleanupDetails.length && (
                  <Text style={styles.cleanupMore}>
                    ... and {getSyncStatus.syncProgress.removedEvents - getSyncStatus.syncProgress.cleanupDetails.length} more
                  </Text>
                )}
              </View>
            )}

            {/* Advanced Progress Details */}
            <View style={styles.progressDetails}>
              <Text style={styles.progressDetail}>
                📈 Success Rate: {getSyncStatus.stats.successRate}% ({getSyncStatus.stats.successfulSyncs}/{getSyncStatus.stats.totalSyncs})
              </Text>
              <Text style={styles.progressDetail}>
                ⚡ Avg Duration: {formatSyncDuration(getSyncStatus.stats.avgSyncDurationMs)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.calendarActions}>
          <TouchableOpacity
            style={[
              styles.syncButton,
              (syncingCalendarId === calendar._id) && styles.syncButtonLoading,
              (!calendar.isActive || !!syncingCalendarId || (syncingCalendarId === calendar._id && getSyncStatus?.isCurrentlyRunning)) && styles.syncButtonDisabled
            ]}
            onPress={() => handleSyncNow(calendar)}
            disabled={!calendar.isActive || !!syncingCalendarId || (syncingCalendarId === calendar._id && getSyncStatus?.isCurrentlyRunning)}
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

            {/* Global Sync Dashboard */}
            {syncStats && (
              <View style={styles.syncDashboard}>
                <Text style={styles.dashboardTitle}>📊 Sync Overview</Text>
                <View style={styles.dashboardGrid}>
                  <View style={styles.dashboardCard}>
                    <Text style={styles.dashboardValue}>{syncStats.activeCalendars}</Text>
                    <Text style={styles.dashboardLabel}>Active Calendars</Text>
                  </View>
                  <View style={styles.dashboardCard}>
                    <Text style={styles.dashboardValue}>{syncStats.successRate}%</Text>
                    <Text style={styles.dashboardLabel}>Success Rate</Text>
                  </View>
                  <View style={styles.dashboardCard}>
                    <Text style={styles.dashboardValue}>{formatSyncDuration(syncStats.avgSyncDurationMs)}</Text>
                    <Text style={styles.dashboardLabel}>Avg Duration</Text>
                  </View>
                  <View style={styles.dashboardCard}>
                    <Text style={styles.dashboardValue}>{syncStats.totalSyncs}</Text>
                    <Text style={styles.dashboardLabel}>Total Syncs</Text>
                  </View>
                </View>

                {/* Currently Running Syncs */}
                {runningSyncs && runningSyncs.length > 0 && (
                  <View style={styles.runningSyncsSection}>
                    <Text style={styles.runningSyncsTitle}>🔄 Currently Running ({runningSyncs.length})</Text>
                    {runningSyncs.filter(sync => sync.clubId === clubId).map((sync) => (
                      <View key={sync.id} style={styles.runningSyncItem}>
                        <Text style={styles.runningSyncName}>{sync.name}</Text>
                        <Text style={styles.runningSyncTime}>
                          Running for {formatElapsedTime(sync.currentSyncStartedAt)}
                        </Text>
                        {sync.syncProgress && (
                          <>
                            <Text style={styles.runningSyncProgress}>
                              {sync.syncProgress.phase} - {sync.syncProgress.processedEvents}/{sync.syncProgress.totalEvents} events
                            </Text>
                            {sync.syncProgress.phase === 'cleanup' && sync.syncProgress.cleanupDetails && sync.syncProgress.cleanupDetails.length > 0 && (
                              <View style={styles.runningCleanupDetails}>
                                <Text style={styles.runningCleanupTitle}>🗑️ Removing:</Text>
                                {sync.syncProgress.cleanupDetails.slice(-3).map((eventDetail, index) => (
                                  <Text key={index} style={styles.runningCleanupItem}>
                                    • {eventDetail}
                                  </Text>
                                ))}
                                {sync.syncProgress.removedEvents > 0 && (
                                  <Text style={styles.runningCleanupCount}>
                                    Removed {sync.syncProgress.removedEvents} events
                                  </Text>
                                )}
                              </View>
                            )}
                          </>
                        )}
                      </View>
                    ))}
                  </View>
                )}
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

                      {/* Additional metadata for completed syncs */}
                      {activity.metadata && (
                        <View style={styles.activityMetadata}>
                          {activity.metadata.icsFileSize && (
                            <Text style={styles.activityMeta}>
                              📄 {formatFileSize(activity.metadata.icsFileSize)}
                            </Text>
                          )}
                          {activity.metadata.parseTime && (
                            <Text style={styles.activityMeta}>
                              📖 {formatSyncDuration(activity.metadata.parseTime)}
                            </Text>
                          )}
                          {activity.metadata.processTime && (
                            <Text style={styles.activityMeta}>
                              ⚙️ {formatSyncDuration(activity.metadata.processTime)}
                            </Text>
                          )}
                          {activity.metadata.cleanupTime && (
                            <Text style={styles.activityMeta}>
                              🧹 {formatSyncDuration(activity.metadata.cleanupTime)}
                            </Text>
                          )}
                        </View>
                      )}

                      {/* Cleanup Details for completed syncs */}
                      {activity.progress && (activity.progress.removedEvents > 0 || activity.metadata?.cleanupTime) && (
                        activity.progress.cleanupDetails && activity.progress.cleanupDetails.length > 0 ? (
                        <View style={styles.activityCleanupDetails}>
                          <Text style={styles.activityCleanupTitle}>🗑️ Removed Events:</Text>
                          {activity.progress.cleanupDetails.slice(0, 5).map((eventDetail, index) => (
                            <Text key={index} style={styles.activityCleanupItem}>
                              • {eventDetail}
                            </Text>
                          ))}
                          {activity.progress.cleanupDetails.length > 5 && (
                            <Text style={styles.activityCleanupMore}>
                              ... and {activity.progress.cleanupDetails.length - 5} more
                            </Text>
                          )}
                          {activity.progress.removedEvents > activity.progress.cleanupDetails.length && (
                            <Text style={styles.activityCleanupMore}>
                              Total removed: {activity.progress.removedEvents} events
                            </Text>
                          )}
                        </View>
                        ) : (
                        <View style={styles.activityCleanupDetails}>
                          <Text style={styles.activityCleanupTitle}>🗑️ Cleanup Summary:</Text>
                          <Text style={styles.activityCleanupItem}>
                            {activity.progress.removedEvents > 0
                              ? `Removed ${activity.progress.removedEvents} orphaned events`
                              : 'No orphaned events found - calendar is up to date'
                            }
                          </Text>
                        </View>
                        )
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
  syncButtonDisabled: {
    backgroundColor: '#bbb',
    opacity: 0.6,
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
  progressTimingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTiming: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  progressDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  progressDetail: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  syncDashboard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dashboardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  dashboardCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dashboardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2196F3',
    marginBottom: 4,
  },
  dashboardLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  runningSyncsSection: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  runningSyncsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  runningSyncItem: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  runningSyncName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  runningSyncTime: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  runningSyncProgress: {
    fontSize: 10,
    color: '#2196F3',
    marginTop: 2,
    fontStyle: 'italic',
  },
  runningCleanupDetails: {
    marginTop: 4,
    padding: 4,
    backgroundColor: '#fff8dc',
    borderRadius: 3,
    borderLeftWidth: 2,
    borderLeftColor: '#ffa500',
  },
  runningCleanupTitle: {
    fontSize: 9,
    fontWeight: '600',
    color: '#ff8c00',
    marginBottom: 2,
  },
  runningCleanupItem: {
    fontSize: 8,
    color: '#cc7700',
    marginBottom: 1,
    paddingLeft: 4,
  },
  runningCleanupCount: {
    fontSize: 9,
    color: '#ff8c00',
    fontWeight: '600',
    marginTop: 2,
  },
  activityMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  activityMeta: {
    fontSize: 9,
    color: '#888',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  cleanupDetails: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff3cd',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  cleanupTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  cleanupItem: {
    fontSize: 10,
    color: '#6c5700',
    marginBottom: 1,
    paddingLeft: 8,
  },
  cleanupMore: {
    fontSize: 10,
    color: '#6c5700',
    fontStyle: 'italic',
    marginTop: 2,
    paddingLeft: 8,
  },
  activityCleanupDetails: {
    marginTop: 6,
    padding: 6,
    backgroundColor: '#fff8dc',
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#daa520',
  },
  activityCleanupTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#b8860b',
    marginBottom: 3,
  },
  activityCleanupItem: {
    fontSize: 9,
    color: '#8b7355',
    marginBottom: 1,
    paddingLeft: 6,
  },
  activityCleanupMore: {
    fontSize: 9,
    color: '#8b7355',
    fontStyle: 'italic',
    marginTop: 2,
    paddingLeft: 6,
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