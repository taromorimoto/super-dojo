import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../context/AuthContext';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { Id } from '../../convex/_generated/dataModel';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user, profile, signOut } = useAuthContext();

  const upcomingEvents = useQuery(
    api.events.getUserUpcomingEvents,
    user ? { userId: user._id as Id<"users"> } : "skip"
  );

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

  const formatEventDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    // Check if it's today
    if (date.toDateString() === now.toDateString()) {
      return `${t('common.today')} ${date.toLocaleTimeString('fi-FI', {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    }

    // Check if it's tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return `${t('common.tomorrow')} ${date.toLocaleTimeString('fi-FI', {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    }

    // Otherwise show full date
    return date.toLocaleDateString('fi-FI', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderEventItem = ({ item }: any) => {
    const event = item;
    
    return (
      <TouchableOpacity style={styles.eventItem}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventClub}>{event.club?.name}</Text>
        </View>
        
        <View style={styles.eventDetails}>
          <View style={styles.eventDetailRow}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={styles.eventDetailText}>
              {formatEventDate(event.startTime)}
            </Text>
          </View>
          
          {event.location && (
            <View style={styles.eventDetailRow}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.eventDetailText}>{event.location}</Text>
            </View>
          )}

          <View style={styles.eventDetailRow}>
            <Ionicons name="people-outline" size={14} color="#666" />
            <Text style={styles.eventDetailText}>
              {event.attendeeCount} {t('events.attendees')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
        <View style={styles.upcomingEvents}>
          <Text style={styles.sectionTitle}>{t('events.upcomingEvents')}</Text>
          {upcomingEvents && upcomingEvents.length > 0 ? (
            <FlatList
              data={upcomingEvents.slice(0, 5)} // Show max 5 events on home screen
              renderItem={renderEventItem}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              style={styles.eventsList}
            />
          ) : (
            <View style={styles.activityCard}>
              <Text style={styles.activityText}>
                {t('events.noUpcomingEvents')}
              </Text>
            </View>
          )}
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
  upcomingEvents: {
    padding: 16,
  },
  eventsList: {
    backgroundColor: 'white',
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
  eventItem: {
    padding: 16,
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
  eventClub: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  eventDetails: {
    gap: 4,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventDetailText: {
    fontSize: 12,
    color: '#666',
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