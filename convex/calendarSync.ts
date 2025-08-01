import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Helper function to check if user is admin of a club
const isClubAdmin = async (ctx: any, userId: string, clubId: string): Promise<boolean> => {
  const membership = await ctx.db
    .query("clubMemberships")
    .withIndex("by_user_club", (q: any) => q.eq("userId", userId).eq("clubId", clubId))
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .first();

  return membership?.role === "admin";
};

// Get calendar sync configurations for a club
export const getClubCalendarSyncs = query({
  args: { clubId: v.id("clubs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("calendarSyncs")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .collect();
  },
});

// Add a new calendar sync configuration
export const addCalendarSync = mutation({
  args: {
    clubId: v.id("clubs"),
    name: v.string(),
    icsUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Extract user ID from compound subject (format: userId|sessionId)
    const userId = identity.subject.split('|')[0] as Id<"users">;

    // Check if user is admin of this club
    const isAdmin = await isClubAdmin(ctx, userId, args.clubId);
    if (!isAdmin) {
      throw new Error("Only club admins can add calendar sync configurations");
    }

    const now = Date.now();
    return await ctx.db.insert("calendarSyncs", {
      clubId: args.clubId,
      name: args.name,
      icsUrl: args.icsUrl,
      isActive: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update calendar sync configuration
export const updateCalendarSync = mutation({
  args: {
    id: v.id("calendarSyncs"),
    name: v.optional(v.string()),
    icsUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Extract user ID from compound subject (format: userId|sessionId)
    const userId = identity.subject.split('|')[0];

    // Get the calendar sync to check club ownership
    const calendarSync = await ctx.db.get(args.id);
    if (!calendarSync) {
      throw new Error("Calendar sync not found");
    }

    // Check if user is admin of this club
    const isAdmin = await isClubAdmin(ctx, userId, calendarSync.clubId);
    if (!isAdmin) {
      throw new Error("Only club admins can update calendar sync configurations");
    }

    const { id, ...updates } = args;
    const updateData: any = {
      ...updates,
      updatedAt: Date.now(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await ctx.db.patch(id, updateData);
    return await ctx.db.get(id);
  },
});

// Delete calendar sync configuration
export const deleteCalendarSync = mutation({
  args: { id: v.id("calendarSyncs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Extract user ID from compound subject (format: userId|sessionId)
    const userId = identity.subject.split('|')[0];

    // Get the calendar sync to check club ownership
    const calendarSync = await ctx.db.get(args.id);
    if (!calendarSync) {
      throw new Error("Calendar sync not found");
    }

    // Check if user is admin of this club
    const isAdmin = await isClubAdmin(ctx, userId, calendarSync.clubId);
    if (!isAdmin) {
      throw new Error("Only club admins can delete calendar sync configurations");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Parse ICS date format to timestamp
const parseICSDate = (dateStr: string): number => {
  // Handle different ICS date formats
  if (dateStr.includes('T')) {
    // Format: YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
    const cleanDate = dateStr.replace(/[TZ]/g, '');
    const year = parseInt(cleanDate.substr(0, 4));
    const month = parseInt(cleanDate.substr(4, 2)) - 1; // Month is 0-indexed
    const day = parseInt(cleanDate.substr(6, 2));
    const hour = parseInt(cleanDate.substr(8, 2)) || 0;
    const minute = parseInt(cleanDate.substr(10, 2)) || 0;
    const second = parseInt(cleanDate.substr(12, 2)) || 0;

    return new Date(year, month, day, hour, minute, second).getTime();
  } else {
    // Format: YYYYMMDD (all-day event)
    const year = parseInt(dateStr.substr(0, 4));
    const month = parseInt(dateStr.substr(4, 2)) - 1;
    const day = parseInt(dateStr.substr(6, 2));

    return new Date(year, month, day).getTime();
  }
};

// Parse ICS content and extract events
const parseICSContent = (icsContent: string): any[] => {
  const lines = icsContent.split(/\r?\n/);
  const events: any[] = [];
  let currentEvent: any = null;
  let inEvent = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
    } else if (line === 'END:VEVENT' && inEvent) {
      if (currentEvent && currentEvent.DTSTART && currentEvent.SUMMARY) {
        events.push(currentEvent);
      }
      currentEvent = null;
      inEvent = false;
    } else if (inEvent && line.includes(':')) {
      const colonIndex = line.indexOf(':');
      const key = line.substring(0, colonIndex).split(';')[0]; // Remove parameters
      const value = line.substring(colonIndex + 1);

      if (key && value) {
        currentEvent[key] = value;
      }
    }
  }

  return events;
};

// Action to sync events from an ICS URL with enhanced cleanup and progress tracking
export const syncCalendarEvents = action({
  args: { calendarSyncId: v.id("calendarSyncs") },
  handler: async (ctx, args): Promise<any> => {
    const startTime = Date.now();
    let historyId: any = null;

    try {
      const calendarSync = await ctx.runQuery(api.calendarSync.getCalendarSyncById, {
        id: args.calendarSyncId
      });

      if (!calendarSync || !calendarSync.isActive) {
        throw new Error("Calendar sync not found or inactive");
      }

      // Initialize sync tracking
      await ctx.runMutation(api.calendarSync.updateSyncProgress, {
        id: args.calendarSyncId,
        status: "running",
        startedAt: startTime,
        progress: {
          phase: "fetching",
          totalEvents: 0,
          processedEvents: 0,
          createdEvents: 0,
          updatedEvents: 0,
          skippedEvents: 0,
          errorEvents: 0,
          removedEvents: 0,
          message: "Fetching calendar data...",
        },
      });

      // Create history entry
      historyId = await ctx.runMutation(api.calendarSync.createSyncHistory, {
        calendarSyncId: args.calendarSyncId,
        startedAt: startTime,
      });

      // FETCH: Download ICS content
      const fetchStartTime = Date.now();
      const response = await fetch(calendarSync.icsUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch ICS: ${response.statusText}`);
      }

      const icsContent = await response.text();
      const fetchTime = Date.now() - fetchStartTime;

      // PARSE: Extract events from ICS
      await ctx.runMutation(api.calendarSync.updateSyncProgress, {
        id: args.calendarSyncId,
        progress: {
          phase: "parsing",
          totalEvents: 0,
          processedEvents: 0,
          createdEvents: 0,
          updatedEvents: 0,
          skippedEvents: 0,
          errorEvents: 0,
          removedEvents: 0,
          message: "Parsing calendar events...",
        },
      });

      const parseStartTime = Date.now();
      const events = parseICSContent(icsContent);
      const parseTime = Date.now() - parseStartTime;

      const now = Date.now();
      const syncGeneration = now;
      const processedEvents: Set<string> = new Set();
      const savedEvents: any[] = [];
      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      // Filter events to only include relevant ones
      const relevantEvents = events.filter(event => {
        if (!event.DTSTART) return false;
        const startTime = parseICSDate(event.DTSTART);
        return startTime >= now - (7 * 24 * 60 * 60 * 1000); // Keep last 7 days
      });

      // Update progress with total count
      await ctx.runMutation(api.calendarSync.updateSyncProgress, {
        id: args.calendarSyncId,
        progress: {
          phase: "processing",
          totalEvents: relevantEvents.length,
          processedEvents: 0,
          createdEvents: 0,
          updatedEvents: 0,
          skippedEvents: 0,
          errorEvents: 0,
          removedEvents: 0,
          message: `Processing ${relevantEvents.length} events...`,
        },
      });

      const processStartTime = Date.now();

      // PROCESS: Handle each event
      for (let i = 0; i < relevantEvents.length; i++) {
        const icsEvent = relevantEvents[i];

        try {
          const startTime = parseICSDate(icsEvent.DTSTART);
          const endTime = icsEvent.DTEND ? parseICSDate(icsEvent.DTEND) : startTime + (2 * 60 * 60 * 1000);

          // Create unique ID for this event
          const eventId = icsEvent.UID || `${icsEvent.SUMMARY}_${startTime}`;
          processedEvents.add(eventId);

          // Check if event already exists
          const existingEvent = await ctx.runQuery(api.calendarSync.findEventByExternalId, {
            externalId: eventId,
            clubId: calendarSync.clubId,
          });

          const eventData = {
            title: icsEvent.SUMMARY || "Untitled Event",
            description: icsEvent.DESCRIPTION || undefined,
            clubId: calendarSync.clubId,
            startTime,
            endTime,
            location: icsEvent.LOCATION || undefined,
            type: "training" as const,
            calendarSource: calendarSync.icsUrl,
            externalId: eventId,
            calendarSyncId: args.calendarSyncId,
            syncGeneration,
            recurringEventId: icsEvent.UID,
            instanceDate: startTime,
          };

          if (existingEvent) {
            // Update existing event
            await ctx.runMutation(api.events.updateEventFromSync, {
              id: existingEvent._id,
              ...eventData,
            });
            savedEvents.push({ ...eventData, _id: existingEvent._id, action: "updated" });
            updatedCount++;
          } else {
            // Create new event
            const newEventId = await ctx.runMutation(api.events.createEventFromSync, eventData);
            savedEvents.push({ ...eventData, _id: newEventId, action: "created" });
            createdCount++;
          }

          // Update progress every 10 events or on last event
          if ((i + 1) % 10 === 0 || i === relevantEvents.length - 1) {
            await ctx.runMutation(api.calendarSync.updateSyncProgress, {
              id: args.calendarSyncId,
              progress: {
                phase: "processing",
                totalEvents: relevantEvents.length,
                processedEvents: i + 1,
                createdEvents: createdCount,
                updatedEvents: updatedCount,
                skippedEvents: skippedCount,
                errorEvents: errorCount,
                removedEvents: 0,
                message: `Processed ${i + 1}/${relevantEvents.length} events...`,
              },
            });
          }

        } catch (eventError) {
          console.error(`Error processing event ${icsEvent.UID}:`, eventError);
          errorCount++;
        }
      }

      const processTime = Date.now() - processStartTime;

      // CLEANUP: Remove orphaned future events
      await ctx.runMutation(api.calendarSync.updateSyncProgress, {
        id: args.calendarSyncId,
        progress: {
          phase: "cleanup",
          totalEvents: relevantEvents.length,
          processedEvents: relevantEvents.length,
          createdEvents: createdCount,
          updatedEvents: updatedCount,
          skippedEvents: skippedCount,
          errorEvents: errorCount,
          removedEvents: 0,
          message: "Cleaning up orphaned events...",
        },
      });

      const cleanupStartTime = Date.now();
      const orphanedEvents: any[] = await ctx.runQuery(api.calendarSync.findOrphanedFutureEvents, {
        calendarSyncId: args.calendarSyncId,
        currentSyncGeneration: syncGeneration,
        processedInstanceIds: Array.from(processedEvents),
        currentTime: now,
      });

      for (const orphanedEvent of orphanedEvents) {
        await ctx.runMutation(api.events.deleteEvent, { id: orphanedEvent._id });
        console.log(`Removed orphaned future event: ${orphanedEvent.title}`);
      }
      const cleanupTime = Date.now() - cleanupStartTime;

      // COMPLETE: Finalize sync
      const totalTime = Date.now() - startTime;
      const finalProgress = {
        phase: "completed" as const,
        totalEvents: relevantEvents.length,
        processedEvents: relevantEvents.length,
        createdEvents: createdCount,
        updatedEvents: updatedCount,
        skippedEvents: skippedCount,
        errorEvents: errorCount,
        removedEvents: orphanedEvents.length,
        message: `Sync completed successfully in ${(totalTime / 1000).toFixed(1)}s`,
      };

      await ctx.runMutation(api.calendarSync.completeSyncSuccess, {
        id: args.calendarSyncId,
        completedAt: Date.now(),
        progress: finalProgress,
        durationMs: totalTime,
      });

      // Update history
      if (historyId) {
        await ctx.runMutation(api.calendarSync.updateSyncHistory, {
          id: historyId,
          status: "success",
          syncCompletedAt: Date.now(),
          progress: finalProgress,
          durationMs: totalTime,
          metadata: {
            icsFileSize: icsContent.length,
            parseTime,
            processTime,
            cleanupTime,
          },
        });
      }

      return {
        success: true,
        durationMs: totalTime,
        progress: finalProgress,
        events: savedEvents,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const totalTime = Date.now() - startTime;

      await ctx.runMutation(api.calendarSync.completeSyncError, {
        id: args.calendarSyncId,
        completedAt: Date.now(),
        errorMessage,
        durationMs: totalTime,
      });

      // Update history
      if (historyId) {
        await ctx.runMutation(api.calendarSync.updateSyncHistory, {
          id: historyId,
          status: "error",
          syncCompletedAt: Date.now(),
          errorMessage,
          durationMs: totalTime,
          progress: {
            phase: "completed",
            totalEvents: 0,
            processedEvents: 0,
            createdEvents: 0,
            updatedEvents: 0,
            skippedEvents: 0,
            errorEvents: 0,
            removedEvents: 0,
            message: `Sync failed: ${errorMessage}`,
          },
        });
      }

      throw error;
    }
  },
});



// Helper query to get calendar sync by ID
export const getCalendarSyncById = query({
  args: { id: v.id("calendarSyncs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Helper query to find event by external ID
export const findEventByExternalId = query({
  args: {
    externalId: v.string(),
    clubId: v.id("clubs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .filter((q) => q.eq(q.field("externalId"), args.externalId))
      .first();
  },
});

// Helper mutation to update sync status
export const updateSyncStatus = mutation({
  args: {
    id: v.id("calendarSyncs"),
    lastSyncAt: v.number(),
    lastSyncStatus: v.union(v.literal("idle"), v.literal("running"), v.literal("success"), v.literal("error"), v.literal("cancelled")),
    lastSyncError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Update sync progress in real-time
export const updateSyncProgress = mutation({
  args: {
    id: v.id("calendarSyncs"),
    status: v.optional(v.union(v.literal("idle"), v.literal("running"), v.literal("success"), v.literal("error"), v.literal("cancelled"))),
    startedAt: v.optional(v.number()),
    progress: v.object({
      phase: v.union(
        v.literal("fetching"),
        v.literal("parsing"),
        v.literal("processing"),
        v.literal("cleanup"),
        v.literal("completed")
      ),
      totalEvents: v.number(),
      processedEvents: v.number(),
      createdEvents: v.number(),
      updatedEvents: v.number(),
      skippedEvents: v.number(),
      errorEvents: v.number(),
      removedEvents: v.number(),
      message: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { id, status, startedAt, progress } = args;
    const updates: any = {
      syncProgress: progress,
      updatedAt: Date.now(),
    };

    if (status) {
      updates.lastSyncStatus = status;
    }

    if (startedAt) {
      updates.currentSyncStartedAt = startedAt;
    }

    await ctx.db.patch(id, updates);
  },
});

// Complete sync successfully
export const completeSyncSuccess = mutation({
  args: {
    id: v.id("calendarSyncs"),
    completedAt: v.number(),
    progress: v.object({
      phase: v.literal("completed"),
      totalEvents: v.number(),
      processedEvents: v.number(),
      createdEvents: v.number(),
      updatedEvents: v.number(),
      skippedEvents: v.number(),
      errorEvents: v.number(),
      removedEvents: v.number(),
      message: v.optional(v.string()),
    }),
    durationMs: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, completedAt, progress, durationMs } = args;

    // Get current sync stats
    const sync = await ctx.db.get(id);
    if (!sync) return;

    const totalSyncs = (sync.totalSyncs || 0) + 1;
    const successfulSyncs = (sync.successfulSyncs || 0) + 1;
    const avgDuration = sync.avgSyncDurationMs
      ? (sync.avgSyncDurationMs * (totalSyncs - 1) + durationMs) / totalSyncs
      : durationMs;

    await ctx.db.patch(id, {
      lastSyncAt: completedAt,
      lastSyncStatus: "success" as const,
      lastSyncError: undefined,
      syncProgress: progress,
      currentSyncStartedAt: undefined,
      totalSyncs,
      successfulSyncs,
      avgSyncDurationMs: Math.round(avgDuration),
      updatedAt: Date.now(),
    });
  },
});

// Complete sync with error
export const completeSyncError = mutation({
  args: {
    id: v.id("calendarSyncs"),
    completedAt: v.number(),
    errorMessage: v.string(),
    durationMs: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, completedAt, errorMessage, durationMs } = args;

    // Get current sync stats
    const sync = await ctx.db.get(id);
    if (!sync) return;

    const totalSyncs = (sync.totalSyncs || 0) + 1;
    const failedSyncs = (sync.failedSyncs || 0) + 1;

    await ctx.db.patch(id, {
      lastSyncAt: completedAt,
      lastSyncStatus: "error" as const,
      lastSyncError: errorMessage,
      syncProgress: undefined,
      currentSyncStartedAt: undefined,
      totalSyncs,
      failedSyncs,
      updatedAt: Date.now(),
    });
  },
});

// Create sync history entry
export const createSyncHistory = mutation({
  args: {
    calendarSyncId: v.id("calendarSyncs"),
    startedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("calendarSyncHistory", {
      calendarSyncId: args.calendarSyncId,
      syncStartedAt: args.startedAt,
      status: "running",
      progress: {
        phase: "fetching",
        totalEvents: 0,
        processedEvents: 0,
        createdEvents: 0,
        updatedEvents: 0,
        skippedEvents: 0,
        errorEvents: 0,
        removedEvents: 0,
        message: "Starting sync...",
      },
    });
  },
});

// Update sync history entry
export const updateSyncHistory = mutation({
  args: {
    id: v.id("calendarSyncHistory"),
    status: v.union(v.literal("running"), v.literal("success"), v.literal("error"), v.literal("cancelled")),
    syncCompletedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    progress: v.optional(v.object({
      phase: v.optional(v.union(
        v.literal("fetching"),
        v.literal("parsing"),
        v.literal("processing"),
        v.literal("cleanup"),
        v.literal("completed")
      )),
      totalEvents: v.number(),
      processedEvents: v.number(),
      createdEvents: v.number(),
      updatedEvents: v.number(),
      skippedEvents: v.number(),
      errorEvents: v.number(),
      removedEvents: v.number(),
      message: v.optional(v.string()),
    })),
    durationMs: v.optional(v.number()),
    metadata: v.optional(v.object({
      icsFileSize: v.optional(v.number()),
      parseTime: v.optional(v.number()),
      processTime: v.optional(v.number()),
      cleanupTime: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

// Cancel a running sync
export const cancelSync = mutation({
  args: { calendarSyncId: v.id("calendarSyncs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject.split('|')[0];
    const calendarSync = await ctx.db.get(args.calendarSyncId);
    if (!calendarSync) {
      throw new Error("Calendar sync not found");
    }

    // Check if user is admin of this club
    const isAdmin = await isClubAdmin(ctx, userId, calendarSync.clubId);
    if (!isAdmin) {
      throw new Error("Only club admins can cancel syncs");
    }

    // Only cancel if actually running
    if (calendarSync.lastSyncStatus !== "running") {
      throw new Error("No sync is currently running");
    }

    await ctx.db.patch(args.calendarSyncId, {
      lastSyncStatus: "cancelled" as const,
      syncProgress: undefined,
      currentSyncStartedAt: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Action to sync all active calendar configurations
export const syncAllActiveCalendars = action({
  args: {},
  handler: async (ctx): Promise<any[]> => {
    const activeCalendars: any = await ctx.runQuery(api.calendarSync.getActiveCalendarSyncs);

    const results: any[] = [];
    for (const calendar of activeCalendars) {
      try {
        const result: any = await ctx.runAction(api.calendarSync.syncCalendarEvents, {
          calendarSyncId: calendar._id,
        });
        results.push({
          calendarId: calendar._id,
          name: calendar.name,
          success: true,
          ...result
        });
      } catch (error) {
        results.push({
          calendarId: calendar._id,
          name: calendar.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return results;
  },
});

// Helper query to get all active calendar syncs
export const getActiveCalendarSyncs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("calendarSyncs")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Get sync status and progress for a specific calendar sync
export const getSyncStatus = query({
  args: { calendarSyncId: v.id("calendarSyncs") },
  handler: async (ctx, args) => {
    const sync = await ctx.db.get(args.calendarSyncId);
    if (!sync) return null;

    return {
      id: sync._id,
      name: sync.name,
      isActive: sync.isActive,
      lastSyncAt: sync.lastSyncAt,
      lastSyncStatus: sync.lastSyncStatus,
      lastSyncError: sync.lastSyncError,
      currentSyncStartedAt: sync.currentSyncStartedAt,
      syncProgress: sync.syncProgress,
      stats: {
        totalSyncs: sync.totalSyncs || 0,
        successfulSyncs: sync.successfulSyncs || 0,
        failedSyncs: sync.failedSyncs || 0,
        avgSyncDurationMs: sync.avgSyncDurationMs || 0,
        successRate: sync.totalSyncs ? Math.round((sync.successfulSyncs || 0) / sync.totalSyncs * 100) : 0,
      },
      isCurrentlyRunning: sync.lastSyncStatus === "running",
      timeSinceLastSync: sync.lastSyncAt ? Date.now() - sync.lastSyncAt : null,
    };
  },
});

// Get sync status for all calendar syncs in a club
export const getClubSyncStatuses = query({
  args: { clubId: v.id("clubs") },
  handler: async (ctx, args) => {
    const syncs = await ctx.db
      .query("calendarSyncs")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .collect();

    return syncs.map(sync => ({
      id: sync._id,
      name: sync.name,
      isActive: sync.isActive,
      lastSyncAt: sync.lastSyncAt,
      lastSyncStatus: sync.lastSyncStatus,
      lastSyncError: sync.lastSyncError,
      currentSyncStartedAt: sync.currentSyncStartedAt,
      syncProgress: sync.syncProgress,
      stats: {
        totalSyncs: sync.totalSyncs || 0,
        successfulSyncs: sync.successfulSyncs || 0,
        failedSyncs: sync.failedSyncs || 0,
        avgSyncDurationMs: sync.avgSyncDurationMs || 0,
        successRate: sync.totalSyncs ? Math.round((sync.successfulSyncs || 0) / sync.totalSyncs * 100) : 0,
      },
      isCurrentlyRunning: sync.lastSyncStatus === "running",
      timeSinceLastSync: sync.lastSyncAt ? Date.now() - sync.lastSyncAt : null,
    }));
  },
});

// Get sync history for a calendar sync
export const getSyncHistory = query({
  args: {
    calendarSyncId: v.id("calendarSyncs"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    return await ctx.db
      .query("calendarSyncHistory")
      .withIndex("by_calendar_sync", (q) => q.eq("calendarSyncId", args.calendarSyncId))
      .order("desc")
      .take(limit);
  },
});

// Get recent sync activity across all clubs
export const getRecentSyncActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    const recentHistory = await ctx.db
      .query("calendarSyncHistory")
      .withIndex("by_started_at")
      .order("desc")
      .take(limit);

    // Enrich with calendar sync info
    const enrichedHistory = [];
    for (const history of recentHistory) {
      const sync = await ctx.db.get(history.calendarSyncId);
      if (sync) {
        enrichedHistory.push({
          ...history,
          calendarName: sync.name,
          clubId: sync.clubId,
        });
      }
    }

    return enrichedHistory;
  },
});

// Get currently running syncs
export const getRunningSyncs = query({
  args: {},
  handler: async (ctx) => {
    const runningSyncs = await ctx.db
      .query("calendarSyncs")
      .withIndex("by_status", (q) => q.eq("lastSyncStatus", "running"))
      .collect();

    return runningSyncs.map(sync => ({
      id: sync._id,
      name: sync.name,
      clubId: sync.clubId,
      currentSyncStartedAt: sync.currentSyncStartedAt,
      syncProgress: sync.syncProgress,
      runningTimeMs: sync.currentSyncStartedAt ? Date.now() - sync.currentSyncStartedAt : 0,
    }));
  },
});

// Get sync statistics summary
export const getSyncStatsSummary = query({
  args: { clubId: v.optional(v.id("clubs")) },
  handler: async (ctx, args) => {
    const syncs = args.clubId
      ? await ctx.db
          .query("calendarSyncs")
          .withIndex("by_club", (q) => q.eq("clubId", args.clubId!))
          .collect()
      : await ctx.db
          .query("calendarSyncs")
          .collect();

    const stats = syncs.reduce((acc, sync) => {
      acc.totalCalendars++;
      if (sync.isActive) acc.activeCalendars++;
      acc.totalSyncs += sync.totalSyncs || 0;
      acc.successfulSyncs += sync.successfulSyncs || 0;
      acc.failedSyncs += sync.failedSyncs || 0;

      if (sync.lastSyncStatus === "running") acc.currentlyRunning++;
      if (sync.avgSyncDurationMs) {
        acc.totalDuration += sync.avgSyncDurationMs;
        acc.durationsCount++;
      }

      return acc;
    }, {
      totalCalendars: 0,
      activeCalendars: 0,
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      currentlyRunning: 0,
      totalDuration: 0,
      durationsCount: 0,
    });

    return {
      ...stats,
      successRate: stats.totalSyncs ? Math.round(stats.successfulSyncs / stats.totalSyncs * 100) : 0,
      avgSyncDurationMs: stats.durationsCount ? Math.round(stats.totalDuration / stats.durationsCount) : 0,
    };
  },
});

// Query to find event by instance ID
export const findEventByInstanceId = query({
  args: {
    instanceId: v.string(),
    calendarSyncId: v.id("calendarSyncs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_calendar_sync", (q) => q.eq("calendarSyncId", args.calendarSyncId))
      .filter((q) => q.eq(q.field("externalId"), args.instanceId))
      .first();
  },
});

// Query to find orphaned FUTURE events (no longer in source calendar)
// Past events are preserved to maintain historical records
export const findOrphanedFutureEvents = query({
  args: {
    calendarSyncId: v.id("calendarSyncs"),
    currentSyncGeneration: v.number(),
    processedInstanceIds: v.array(v.string()),
    currentTime: v.number(),
  },
  handler: async (ctx, args) => {
    const allSyncedEvents = await ctx.db
      .query("events")
      .withIndex("by_calendar_sync", (q) => q.eq("calendarSyncId", args.calendarSyncId))
      .collect();

    // Find events that weren't processed in current sync AND are in the future
    return allSyncedEvents.filter(event =>
      event.externalId &&
      !args.processedInstanceIds.includes(event.externalId) &&
      event.startTime >= args.currentTime // Only consider future events for removal
    );
  },
});

// Keep the old function for backward compatibility (but mark as deprecated)
export const findOrphanedEvents = query({
  args: {
    calendarSyncId: v.id("calendarSyncs"),
    currentSyncGeneration: v.number(),
    processedInstanceIds: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<any[]> => {
    // Redirect to the new function with current time
    const currentTime = Date.now();
    return await ctx.runQuery(api.calendarSync.findOrphanedFutureEvents, {
      ...args,
      currentTime,
    });
  },
});