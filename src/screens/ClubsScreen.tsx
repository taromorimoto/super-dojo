import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { Link } from 'expo-router';

interface Club {
  _id: string;
  name: string;
  location: string;
  practiceSchedule: string;
  sports: string[];
  createdAt: number;
  updatedAt: number;
}

export default function ClubsScreen() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const clubs = useQuery(api.clubs.getClubs);
  const userMemberships = useQuery(api.clubs.getUserMemberships,
    user ? { userId: user._id } : "skip"
  );

  // Check if user is member of a club
  const isMemberOfClub = (clubId: string) => {
    return userMemberships?.some(membership => membership.clubId === clubId);
  };

  const renderClubCard = ({ item: club }: { item: Club }) => {
    const isMember = isMemberOfClub(club._id);
    const membershipDataLoading = userMemberships === undefined;

    return (
      <Link href={`/(tabs)/clubs/${club._id}`} asChild>
        <TouchableOpacity style={styles.clubCard}>
        <View style={styles.clubHeader}>
          <View style={styles.clubNameContainer}>
            {user && isMember && !membershipDataLoading && (
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            )}
            <Text style={styles.clubName}>{club.name}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>

        <View style={styles.clubInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{club.location}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
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


        </TouchableOpacity>
      </Link>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>{t('club.noClubs')}</Text>
      <Text style={styles.emptyText}>
        Check back later for available clubs in your area
      </Text>
    </View>
  );

  if (clubs === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={clubs}
        renderItem={renderClubCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              // Refetch clubs data
            }}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  clubCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  clubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clubNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  clubName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  clubInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  sportsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  sportTag: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sportText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});