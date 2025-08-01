import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'

interface Event {
  _id: string
  title: string
  type: string
  startTime: number
  endTime?: number
  location?: string
  description?: string
  attendeeCount: number
  club?: {
    name: string
  }
}

interface EventItemProps {
  event: Event
  isMember?: boolean
  isAttending?: boolean
  onAttend?: (eventId: string) => Promise<void>
  onCancelAttendance?: (eventId: string) => Promise<void>
  showClub?: boolean
}

export default function EventItem({
  event,
  isMember = false,
  isAttending = false,
  onAttend,
  onCancelAttendance,
  showClub = false
}: EventItemProps) {
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(false)

  const isUpcoming = event.startTime > Date.now()
  const isPast = event.startTime < Date.now()

  const formatEventDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const locale = i18n.language === 'fi' ? 'fi-FI' : 'en-US'

    if (locale === 'fi-FI') {
      const weekday = date.toLocaleDateString('fi-FI', { weekday: 'short' })
      const day = date.getDate()
      const month = date.toLocaleDateString('fi-FI', { month: 'short' })
      const year = date.getFullYear()
      const time = date.toLocaleTimeString('fi-FI', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })

      return `${weekday} ${day}. ${month}. ${year} klo ${time}`
    } else {
      return date.toLocaleDateString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  const handleAttend = async () => {
    if (!onAttend || loading) return

    setLoading(true)
    try {
      await onAttend(event._id)
    } catch (error) {
      console.error('Failed to attend event:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelAttendance = async () => {
    if (!onCancelAttendance || loading) return

    setLoading(true)
    try {
      await onCancelAttendance(event._id)
    } catch (error) {
      console.error('Failed to cancel attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.eventItem}>
      <View style={styles.eventHeader}>
        <View style={styles.eventTitleContainer}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          {showClub && event.club && (
            <Text style={styles.eventClub}>{event.club.name}</Text>
          )}
        </View>
        {isUpcoming && isMember && (
          <View style={styles.attendanceStatus}>
            {isAttending && (
              <View style={styles.attendingBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.attendingText}>{t('events.attending')}</Text>
              </View>
            )}
          </View>
        )}
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

      {isMember && isUpcoming && (onAttend || onCancelAttendance) && (
        <View style={styles.eventActions}>
          {!isAttending ? (
            <TouchableOpacity
              style={[
                styles.attendButton,
                loading && styles.buttonDisabled
              ]}
              onPress={handleAttend}
              disabled={loading || !onAttend}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="white" />
                  <Text style={styles.attendButtonText}>{t('events.attend')}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.cancelButton,
                loading && styles.buttonDisabled
              ]}
              onPress={handleCancelAttendance}
              disabled={loading || !onCancelAttendance}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={20} color="#666" />
                  <Text style={styles.cancelButtonText}>{t('events.cancelAttendance')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
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
  eventTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  eventClub: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  attendanceStatus: {
    marginLeft: 8,
  },
  attendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendingText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  attendButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})