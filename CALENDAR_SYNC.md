# Calendar Sync Documentation

## Overview

The Super Dojo app includes a powerful calendar synchronization system that automatically imports events from external ICS (Internet Calendar Subscription) files into your club's event system. This enables seamless integration with existing calendar solutions like Google Calendar, Outlook, or any calendar system that exports ICS files.

## How It Works

### Basic Sync Process

1. **Configuration**: Club admins add calendar sync configurations with ICS URLs
2. **Fetch**: The system downloads ICS content from the external calendar
3. **Parse**: ICS content is parsed to extract individual events
4. **Process**: Events are created or updated in the local database
5. **Cleanup**: Orphaned future events are removed (past events are preserved)

### Key Features

- ✅ **Automatic Syncing**: Regular synchronization with external calendars
- ✅ **Past Event Preservation**: Historical events are never deleted
- ✅ **Smart Cleanup**: Only future events can be removed during sync
- ✅ **Duplicate Prevention**: Events are identified by external IDs
- ✅ **Admin Control**: Only club admins can manage calendar sync
- ✅ **Real-time Progress**: Live sync progress tracking with detailed phases
- ✅ **Sync History**: Complete audit trail of all sync operations
- ✅ **Performance Metrics**: Sync duration and success rate tracking
- ✅ **Error Handling**: Robust error handling with detailed status tracking

## Architecture

### Database Schema

The calendar sync system uses several database tables:

#### `calendarSyncs`
Stores calendar sync configurations:
```typescript
{
  clubId: Id<"clubs">,           // Associated club
  name: string,                  // Human-readable name
  icsUrl: string,                // ICS file URL
  isActive: boolean,             // Whether sync is enabled
  lastSyncAt?: number,           // Last successful sync timestamp
  lastSyncStatus?: "success" | "error",
  lastSyncError?: string,        // Error message if sync failed
  createdBy: Id<"users">,        // Admin who created the sync
  createdAt: number,
  updatedAt: number,
}
```

#### Enhanced `events` Table
The events table includes additional fields for calendar sync tracking:
```typescript
{
  // ... existing event fields ...
  calendarSource?: string,        // ICS file source URL
  externalId?: string,           // External calendar event ID
  calendarSyncId?: Id<"calendarSyncs">, // Which sync created this
  syncGeneration?: number,       // Sync timestamp for cleanup
  recurringEventId?: string,     // Base UID for recurring events
  instanceDate?: number,         // Specific date for this instance
}
```

### Core Functions

#### `syncCalendarEvents(calendarSyncId)`
Main synchronization function that:
1. Fetches ICS content from the configured URL
2. Parses events from the ICS data
3. Creates/updates events in the database
4. Removes orphaned future events (preserves past events)

#### `syncAllActiveCalendars()`
Batch function that syncs all active calendar configurations across all clubs.

## Sync Status & Progress Tracking

### Real-time Progress Monitoring

The calendar sync system provides comprehensive real-time progress tracking with five distinct phases:

1. **🔄 Fetching** - Downloading ICS content from the external calendar
2. **📖 Parsing** - Extracting events from the ICS data
3. **⚙️ Processing** - Creating/updating events in the database
4. **🧹 Cleanup** - Removing orphaned future events
5. **✅ Completed** - Sync finished successfully

### Sync Status Levels

| Status | Description | Admin Actions |
|--------|-------------|---------------|
| **idle** | Ready for sync | Can start sync |
| **running** | Sync in progress | Can cancel sync |
| **success** | Last sync completed successfully | Can start new sync |
| **error** | Last sync failed | Can retry sync |
| **cancelled** | Sync was cancelled by admin | Can start new sync |

### Progress Information

For each running sync, the system tracks:

- **Phase**: Current operation (fetching, parsing, processing, cleanup, completed)
- **Event Counts**: Total, processed, created, updated, skipped, errors, removed
- **Progress Percentage**: `processedEvents / totalEvents * 100`
- **Status Message**: Human-readable description of current activity
- **Duration**: Time elapsed since sync started

### Sync History & Audit Trail

Every sync operation creates a detailed history entry containing:

- **Timestamps**: Start time, completion time, duration
- **Results**: Success/failure status with error details
- **Statistics**: Event counts and processing metrics
- **Performance**: ICS file size, parse time, process time, cleanup time
- **Metadata**: Additional technical details for debugging

### Performance Metrics

The system automatically calculates and tracks:

- **Success Rate**: Percentage of successful syncs
- **Average Duration**: Mean sync completion time
- **Total Syncs**: Count of all sync attempts
- **Failed Syncs**: Count of sync failures
- **Recent Activity**: Timeline of recent sync operations

## Event Processing

### ICS Parsing

The system parses standard ICS format with support for:
- **VEVENT** blocks containing event data
- **DTSTART/DTEND** for event timing
- **SUMMARY** for event titles
- **DESCRIPTION** for event details
- **LOCATION** for event venues
- **UID** for unique event identification

### Date Handling

The parser supports multiple ICS date formats:
- `YYYYMMDDTHHMMSSZ` (UTC timestamp)
- `YYYYMMDDTHHMMSS` (local timestamp)
- `YYYYMMDD` (all-day events)

### Past Event Preservation

A key design principle is **preserving historical data**:

- **Past Events**: Never deleted, even if removed from source calendar
- **Future Events**: Can be updated or removed based on source calendar
- **Threshold**: Events are considered "past" if they started before the current sync time

This ensures:
- Attendance records remain intact
- Historical training data is preserved
- Club statistics remain accurate

## Recurring Events

### Current Implementation

The current implementation handles basic recurring events by:
1. Parsing individual VEVENT blocks from ICS
2. Creating separate database entries for each occurrence
3. Using unique external IDs for each instance

### Future Enhancements

The system is designed to support advanced recurring event features:
- **RRULE** parsing for recurrence rules
- **EXDATE** handling for exception dates
- **RECURRENCE-ID** for modified instances
- **Complex patterns** (weekly, monthly, yearly recurrence)

## Usage Guide

### For Club Admins

#### Adding a Calendar Sync

1. Navigate to your club settings
2. Find the "Calendar Sync" section
3. Click "Add Calendar Sync"
4. Provide:
   - **Name**: Descriptive name (e.g., "Training Schedule")
   - **ICS URL**: Link to your calendar's ICS export

#### Managing Syncs

- **Enable/Disable**: Toggle the `isActive` status
- **Edit**: Update name or ICS URL
- **Delete**: Remove sync configuration (existing events remain)
- **Manual Sync**: Trigger immediate synchronization
- **Cancel Sync**: Stop a currently running sync operation

#### Monitoring Sync Progress

**Real-time Status Dashboard:**
- View current sync phase and progress percentage
- Monitor event processing statistics (created/updated/skipped)
- See estimated time remaining and performance metrics
- Track sync duration and success rates

**Sync History:**
- Review detailed logs of past sync operations
- Analyze sync performance trends over time
- Debug failed syncs with error details
- Export sync statistics for reporting

**Status Indicators:**
- 🟢 **Success**: Last sync completed without errors
- 🔵 **Running**: Sync currently in progress
- 🔴 **Error**: Last sync failed (check error message)
- 🟡 **Idle**: Ready for next sync operation
- ⚫ **Cancelled**: Sync was stopped by admin

#### Getting ICS URLs

**Google Calendar:**
1. Open your calendar in Google Calendar
2. Click the three dots next to your calendar name
3. Select "Settings and sharing"
4. Scroll to "Integrate calendar"
5. Copy the "Public URL to this calendar (ICS)"

**Outlook/Office 365:**
1. Open your calendar
2. Click "Share" → "Publish calendar"
3. Choose sharing level and copy the ICS link

### For Developers

#### Running Manual Sync

```typescript
// Sync specific calendar
await ctx.runAction(api.calendarSync.syncCalendarEvents, {
  calendarSyncId: "calendar_sync_id_here"
});

// Sync all active calendars
await ctx.runAction(api.calendarSync.syncAllActiveCalendars, {});
```

#### Monitoring Sync Status

```typescript
// Get real-time sync status for a specific calendar
const status = await ctx.runQuery(api.calendarSync.getSyncStatus, {
  calendarSyncId: "calendar_sync_id_here"
});

console.log("Sync Status:", status.lastSyncStatus);
console.log("Success Rate:", status.stats.successRate + "%");
console.log("Is Running:", status.isCurrentlyRunning);

if (status.syncProgress) {
  const progress = status.syncProgress;
  console.log(`Phase: ${progress.phase}`);
  console.log(`Progress: ${progress.processedEvents}/${progress.totalEvents}`);
  console.log(`Created: ${progress.createdEvents}, Updated: ${progress.updatedEvents}`);
}
```

#### Accessing Sync History

```typescript
// Get recent sync history
const history = await ctx.runQuery(api.calendarSync.getSyncHistory, {
  calendarSyncId: "calendar_sync_id_here",
  limit: 5
});

history.forEach(entry => {
  console.log(`Sync ${entry.status}: ${entry.durationMs}ms`);
  console.log(`Events: ${entry.progress.processedEvents} processed`);
});

// Get club-wide sync statistics
const clubStats = await ctx.runQuery(api.calendarSync.getClubSyncStatuses, {
  clubId: "club_id_here"
});

clubStats.forEach(sync => {
  console.log(`${sync.name}: ${sync.stats.successRate}% success rate`);
});
```

#### Managing Running Syncs

```typescript
// Cancel a running sync
await ctx.runMutation(api.calendarSync.cancelSync, {
  calendarSyncId: "calendar_sync_id_here"
});

// Check for currently running syncs
const runningSyncs = await ctx.runQuery(api.calendarSync.getRunningSyncs, {});
console.log(`${runningSyncs.length} syncs currently running`);

// Get system-wide sync statistics
const stats = await ctx.runQuery(api.calendarSync.getSyncStatsSummary, {});
console.log(`Overall success rate: ${stats.successRate}%`);
console.log(`Average sync time: ${stats.avgSyncDurationMs}ms`);
```

#### Querying Synced Events

```typescript
// Get all events from a specific calendar sync
const events = await ctx.db
  .query("events")
  .withIndex("by_calendar_sync", q => q.eq("calendarSyncId", syncId))
  .collect();

// Get events by external ID
const event = await ctx.runQuery(api.calendarSync.findEventByExternalId, {
  externalId: "external_event_id",
  clubId: "club_id"
});
```

## Error Handling

### Sync Status Tracking

Each calendar sync tracks its status:
- **Success**: Sync completed without errors
- **Error**: Sync failed with error message
- **Timestamp**: When the last sync was attempted

### Common Issues

1. **Invalid ICS URL**: Calendar URL is inaccessible or returns invalid data
2. **Network Errors**: Temporary connection issues
3. **Parsing Errors**: Malformed ICS content
4. **Permission Errors**: User lacks admin permissions

### Error Recovery

- Failed syncs don't affect existing events
- Error messages are stored for debugging
- Sync can be retried after fixing issues
- System continues with other calendars if one fails

## Performance Considerations

### Optimization Strategies

1. **Incremental Sync**: Only processes events within a time window
2. **Batch Processing**: Handles multiple events efficiently
3. **Duplicate Detection**: Prevents redundant database operations
4. **Error Isolation**: Single calendar failures don't affect others

### Rate Limiting

- Syncs are designed to be run periodically (e.g., every hour)
- No built-in rate limiting currently implemented
- External calendar providers may have their own limits

## Security

### Access Control

- Only club admins can create/modify calendar syncs
- ICS URLs should be public (no authentication supported)
- Events are scoped to the club that owns the sync

### Data Validation

- All external data is validated before database insertion
- Malformed events are skipped with error logging
- No executable content is processed from ICS files

## Monitoring

### Sync Status

Monitor sync health through:
- Last sync timestamp per calendar
- Success/error status tracking
- Error message logging
- Event count tracking

### Metrics

Track these metrics for operational health:
- Sync success rate
- Number of events processed
- Sync duration
- Error frequency

## Troubleshooting

### Common Problems

1. **No Events Syncing**
   - Verify ICS URL is accessible
   - Check if calendar has public events
   - Ensure events are within sync time window

2. **Duplicate Events**
   - Events may lack proper UID fields
   - Multiple syncs pointing to same calendar
   - Manual events conflicting with synced events

3. **Missing Recent Events**
   - Calendar may not be publishing latest changes
   - Sync frequency may be too low
   - Check for sync errors

### Debug Steps

1. Check sync status in calendar sync configuration
2. Verify ICS URL returns valid content
3. Review error logs for specific issues
4. Test with a simple calendar first
5. Check club admin permissions

## Future Roadmap

### Planned Enhancements

1. **Advanced Recurring Events**: Full RRULE support
2. **Timezone Handling**: Better timezone conversion
3. **Bidirectional Sync**: Export club events to external calendars
4. **Sync Scheduling**: Configurable sync intervals
5. **Calendar Categories**: Map external categories to event types
6. **Conflict Resolution**: Handle overlapping events intelligently

### Integration Possibilities

- **Webhook Support**: Real-time sync triggers
- **Multiple Formats**: Support for other calendar formats
- **Calendar Providers**: Direct API integration with major providers
- **Notification System**: Alerts for sync failures or new events

---

## API Reference

#### Configuration Mutations

- `addCalendarSync(clubId, name, icsUrl)` - Add new calendar sync
- `updateCalendarSync(id, updates)` - Update sync configuration
- `deleteCalendarSync(id)` - Remove sync configuration
- `cancelSync(calendarSyncId)` - Cancel a running sync

#### Progress & Status Mutations

- `updateSyncProgress(id, status, startedAt, progress)` - Update real-time progress
- `completeSyncSuccess(id, completedAt, progress, durationMs)` - Mark sync as successful
- `completeSyncError(id, completedAt, errorMessage, durationMs)` - Mark sync as failed
- `createSyncHistory(calendarSyncId, startedAt)` - Create history entry
- `updateSyncHistory(id, status, progress, metadata)` - Update history entry

#### Status & Progress Queries

- `getSyncStatus(calendarSyncId)` - Get detailed status for specific sync
- `getClubSyncStatuses(clubId)` - Get all sync statuses for a club
- `getSyncHistory(calendarSyncId, limit?)` - Get sync history for calendar
- `getRecentSyncActivity(limit?)` - Get recent sync activity across all clubs
- `getRunningSyncs()` - Get all currently running syncs
- `getSyncStatsSummary(clubId?)` - Get aggregate sync statistics

#### Configuration Queries

- `getClubCalendarSyncs(clubId)` - Get syncs for a club
- `getActiveCalendarSyncs()` - Get all active syncs
- `findEventByExternalId(externalId, clubId)` - Find synced event

#### Sync Actions

- `syncCalendarEvents(calendarSyncId)` - Sync specific calendar
- `syncAllActiveCalendars()` - Sync all active calendars

---

This documentation provides a comprehensive overview of the calendar sync system. For technical implementation details, refer to the source code in `convex/calendarSync.ts`.