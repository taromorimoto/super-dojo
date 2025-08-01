import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import Button from './Button'

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
  userResponse?: 'attending' | 'absent' | 'maybe' | null
  onRespond?: (eventId: string, response: 'attending' | 'absent' | 'maybe') => Promise<void>
  showClub?: boolean
}

export default function EventItem({
  event,
  isMember = false,
  userResponse = null,
  onRespond,
  showClub = false
}: EventItemProps) {
  const { t, i18n } = useTranslation()
  const [loadingAction, setLoadingAction] = useState<'attending' | 'absent' | null>(null)

  const isUpcoming = event.startTime > Date.now()

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

  const handleRespond = async (response: 'attending' | 'absent' | 'maybe') => {
    if (!onRespond || loadingAction) return

    setLoadingAction(response as 'attending' | 'absent')
    try {
      await onRespond(event._id, response)
    } catch (error) {
      console.error('Failed to respond to event:', error)
    } finally {
      setLoadingAction(null)
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

      {isMember && isUpcoming && onRespond && (
        <View style={styles.eventActions}>
          {userResponse === 'attending' ? (
            // Currently attending - show status and absent button
            <>
              <View style={styles.responseStatus}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={[styles.responseText, styles.attendingText]}>
                  {t('events.attending')}
                </Text>
              </View>
              <Button
                title={t('events.absent')}
                onPress={() => handleRespond('absent')}
                variant="secondary"
                size="small"
                icon="close-circle-outline"
                disabled={!!loadingAction}
                loading={loadingAction === 'absent'}
                style={styles.actionButton}
              />
            </>
          ) : userResponse === 'absent' ? (
            // Currently absent - show attend button and status
            <>
              <Button
                title={t('events.attend')}
                onPress={() => handleRespond('attending')}
                variant="secondary"
                size="small"
                icon="checkmark-circle-outline"
                disabled={!!loadingAction}
                loading={loadingAction === 'attending'}
                style={styles.actionButton}
              />
              <View style={styles.responseStatus}>
                <Ionicons name="close-circle" size={20} color="#f44336" />
                <Text style={[styles.responseText, styles.absentText]}>
                  {t('events.absent')}
                </Text>
              </View>
            </>
          ) : (
            // No response yet - show both buttons
            <>
              <Button
                title={t('events.attend')}
                onPress={() => handleRespond('attending')}
                variant="secondary"
                size="small"
                icon="checkmark-circle-outline"
                disabled={!!loadingAction}
                loading={loadingAction === 'attending'}
                style={styles.actionButton}
              />
              <Button
                title={t('events.absent')}
                onPress={() => handleRespond('absent')}
                variant="secondary"
                size="small"
                icon="close-circle-outline"
                disabled={!!loadingAction}
                loading={loadingAction === 'absent'}
                style={styles.actionButton}
              />
            </>
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
  responseStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0, // Allow flex to control width
    minHeight: 40, // Match button height
    paddingHorizontal: 12, // Match button padding
    paddingVertical: 6, // Match button padding
  },
  responseText: {
    fontSize: 14,
    fontWeight: '600',
  },
  attendingText: {
    color: '#4CAF50',
  },
  absentText: {
    color: '#f44336',
  },
  maybeText: {
    color: '#FF9800',
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
    alignItems: 'stretch', // Stretch to match heights
    width: '100%', // Ensure full width usage
  },
  actionButton: {
    flex: 1,
    minWidth: 0, // Allow flex to control width
    minHeight: 40, // Ensure consistent height
  },
})