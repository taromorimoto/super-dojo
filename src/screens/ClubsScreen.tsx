import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from 'convex/react';
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

  const joinClub = useMutation(api.clubs.joinClub);
  const leaveClub = useMutation(api.clubs.leaveClub);

  const [loadingClubIds, setLoadingClubIds] = useState<Set<string>>(new Set());

  // Check if user is member of a club
  const isMemberOfClub = (clubId: string) => {
    return userMemberships?.some(membership => membership.clubId === clubId);
  };

  const handleJoinClub = async (clubId: string, clubName: string) => {
    if (!user) {
      Alert.alert(t('auth.required'), t('auth.loginToJoin'));
      return;
    }

    // Wait for memberships to load before checking
    if (userMemberships === undefined) {
      Alert.alert(t('error.title'), t('common.loading'));
      return;
    }

    // Check if already a member before attempting to join
    const isAlreadyMember = isMemberOfClub(clubId);
    if (isAlreadyMember) {
      Alert.alert(t('error.title'), t('club.alreadyMember'));
      return;
    }

    setLoadingClubIds(prev => new Set([...prev, clubId]));

    try {
      await joinClub({ clubId: clubId as any });
      Alert.alert(t('club.joinSuccess'), t('club.joinSuccessMessage', { clubName }));
    } catch (error: any) {
      Alert.alert(t('error.title'), error.message || t('club.joinError'));
    } finally {
      setLoadingClubIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(clubId);
        return newSet;
      });
    }
  };

  const handleLeaveClub = (clubId: string, clubName: string) => {
    Alert.alert(
      t('club.leaveTitle'),
      t('club.leaveConfirm', { clubName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('club.leave'),
          style: 'destructive',
          onPress: () => performLeaveClub(clubId)
        }
      ]
    );
  };

  const performLeaveClub = async (clubId: string) => {
    setLoadingClubIds(prev => new Set([...prev, clubId]));

    try {
      await leaveClub({ clubId: clubId as any });
      Alert.alert(t('club.leaveSuccess'), t('club.leaveSuccessMessage'));
    } catch (error: any) {
      Alert.alert(t('error.title'), error.message || t('club.leaveError'));
    } finally {
      setLoadingClubIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(clubId);
        return newSet;
      });
    }
  };

  const renderClubCard = ({ item: club }: { item: Club }) => {
    const isMember = isMemberOfClub(club._id);
    const isLoading = loadingClubIds.has(club._id);
    const membershipDataLoading = userMemberships === undefined;

    return (
      <Link href={`/(tabs)/clubs/${club._id}`} asChild>
        <TouchableOpacity style={styles.clubCard}>
        <View style={styles.clubHeader}>
          <Text style={styles.clubName}>{club.name}</Text>
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

        {/* Membership Action Button */}
        {user && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                isMember ? styles.leaveButton : styles.joinButton,
                (isLoading || membershipDataLoading) && styles.disabledButton
              ]}
              onPress={() =>
                isMember
                  ? handleLeaveClub(club._id, club.name)
                  : handleJoinClub(club._id, club.name)
              }
              disabled={isLoading || membershipDataLoading}
            >
              {isLoading || membershipDataLoading ? (
                <Text style={styles.actionButtonText}>{t('common.loading')}</Text>
              ) : (
                <>
                  <Ionicons
                    name={isMember ? "exit-outline" : "add-outline"}
                    size={16}
                    color="white"
                  />
                  <Text style={styles.actionButtonText}>
                    {isMember ? t('club.leave') : t('club.join')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
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
  actionContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 150,
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
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.7,
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