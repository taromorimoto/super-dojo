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

// Action to sync events from an ICS URL
export const syncCalendarEvents = action({
  args: { calendarSyncId: v.id("calendarSyncs") },
  handler: async (ctx, args) => {
    try {
      // Get calendar sync configuration
      const calendarSync = await ctx.runQuery(api.calendarSync.getCalendarSyncById, { 
        id: args.calendarSyncId 
      });

      if (!calendarSync || !calendarSync.isActive) {
        throw new Error("Calendar sync not found or inactive");
      }

      // Fetch ICS content
      const response = await fetch(calendarSync.icsUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch ICS: ${response.statusText}`);
      }

      const icsContent = await response.text();
      const events = parseICSContent(icsContent);

      // Process and save events
      const now = Date.now();
      const savedEvents: any[] = [];

      for (const icsEvent of events) {
        try {
          const startTime = parseICSDate(icsEvent.DTSTART);
          const endTime = icsEvent.DTEND ? parseICSDate(icsEvent.DTEND) : startTime + (2 * 60 * 60 * 1000); // Default 2 hours

          // Skip past events (older than 30 days)
          if (startTime < now - (30 * 24 * 60 * 60 * 1000)) {
            continue;
          }

          // Check if event already exists
          const existingEvent = await ctx.runQuery(api.calendarSync.findEventByExternalId, {
            externalId: icsEvent.UID,
            clubId: calendarSync.clubId,
          });

          const eventData = {
            title: icsEvent.SUMMARY || "Untitled Event",
            description: icsEvent.DESCRIPTION || undefined,
            clubId: calendarSync.clubId,
            startTime,
            endTime,
            location: icsEvent.LOCATION || undefined,
            type: "training" as const, // Default type, could be enhanced with smart detection
            calendarSource: calendarSync.icsUrl,
            externalId: icsEvent.UID,
          };

          if (existingEvent) {
            // Update existing event
            await ctx.runMutation(api.events.updateEventFromSync, {
              id: existingEvent._id,
              ...eventData,
            });
            savedEvents.push({ ...eventData, _id: existingEvent._id, action: "updated" });
          } else {
            // Create new event
            const eventId = await ctx.runMutation(api.events.createEventFromSync, eventData);
            savedEvents.push({ ...eventData, _id: eventId, action: "created" });
          }
        } catch (eventError) {
          console.error(`Error processing event ${icsEvent.UID}:`, eventError);
          // Continue with other events
        }
      }

      // Update sync status
      await ctx.runMutation(api.calendarSync.updateSyncStatus, {
        id: args.calendarSyncId,
        lastSyncAt: now,
        lastSyncStatus: "success" as const,
        lastSyncError: undefined,
      });

      return {
        success: true,
        eventsProcessed: savedEvents.length,
        events: savedEvents,
      };

    } catch (error) {
      // Update sync status with error
      await ctx.runMutation(api.calendarSync.updateSyncStatus, {
        id: args.calendarSyncId,
        lastSyncAt: Date.now(),
        lastSyncStatus: "error" as const,
        lastSyncError: error instanceof Error ? error.message : "Unknown error",
      });

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
    lastSyncStatus: v.union(v.literal("success"), v.literal("error")),
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