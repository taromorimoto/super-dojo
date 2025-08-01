import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
  onAttend?: (eventId: string) => void
  showClub?: boolean
}

export default function EventItem({ event, isMember = false, onAttend, showClub = false }: EventItemProps) {
  const { t, i18n } = useTranslation()

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

  const formatEventType = (type: string) => {
    const typeMap = {
      training: t('events.types.training'),
      competition: t('events.types.competition'),
      seminar: t('events.types.seminar'),
      grading: t('events.types.grading'),
    }
    return typeMap[type as keyof typeof typeMap] || type
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

      {isMember && isUpcoming && onAttend && (
        <View style={styles.eventActions}>
          <TouchableOpacity
            style={[styles.attendButton]}
            onPress={() => onAttend(event._id)}
          >
            <Ionicons name="checkmark-outline" size={16} color="white" />
            <Text style={styles.attendButtonText}>{t('events.attend')}</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
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
})