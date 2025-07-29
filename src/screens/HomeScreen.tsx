import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user, profile, signOut } = useAuthContext();

  const quickActions = [
    {
      id: 'scan-qr',
      title: t('attendance.scanQR'),
      icon: 'qr-code-outline',
      color: '#2E7D32',
    },
    {
      id: 'club-feed',
      title: t('feed.clubFeed'),
      icon: 'chatbubbles-outline',
      color: '#1976D2',
    },
    {
      id: 'marketplace',
      title: t('marketplace.marketplace'),
      icon: 'storefront-outline',
      color: '#F57C00',
    },
    {
      id: 'events',
      title: t('events.events'),
      icon: 'calendar-outline',
      color: '#7B1FA2',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>
            {t('common.hello')}, {profile?.name || user?.email}!
          </Text>
          {profile && (
            <Text style={styles.gradeText}>
              {profile.danKyuGrade} • {t(`sports.${profile.sport}`)}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {!profile && (
        <View style={styles.profilePrompt}>
          <Text style={styles.promptTitle}>Complete Your Profile</Text>
          <Text style={styles.promptText}>
            Create your profile to join a club and start tracking your martial arts journey
          </Text>
          <TouchableOpacity style={styles.createProfileButton}>
            <Text style={styles.createProfileButtonText}>
              {t('profile.createProfile')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionCard, { backgroundColor: action.color + '10' }]}
            >
              <Ionicons
                name={action.icon as any}
                size={32}
                color={action.color}
                style={styles.actionIcon}
              />
              <Text style={[styles.actionText, { color: action.color }]}>
                {action.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {profile && (
        <View style={styles.recentActivity}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <Text style={styles.activityText}>
              No recent activity to display
            </Text>
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    flex: 1,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  gradeText: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  signOutButton: {
    padding: 8,
  },
  profilePrompt: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
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
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  promptText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  createProfileButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  createProfileButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  quickActions: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  recentActivity: {
    padding: 16,
  },
  activityCard: {
    backgroundColor: 'white',
    padding: 20,
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
  activityText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});