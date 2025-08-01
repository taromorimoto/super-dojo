import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Helper function to check if user is admin of a club
const isClubAdmin = async (ctx: any, userId: string, clubId: string): Promise<boolean> => {
  const membership = await ctx.db
    .query("clubMemberships")
    .withIndex("by_user_club", (q: any) => q.eq("userId", userId).eq("clubId", clubId))
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .first();

  return membership?.role === "admin";
};

// Get all events for a club
export const getClubEvents = query({
  args: { clubId: v.id("clubs") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_club_start_time", (q) => q.eq("clubId", args.clubId))
      .order("desc")
      .collect();

    return events;
  },
});

// Get upcoming events for all clubs a user is member of (for home page)
export const getUserUpcomingEvents = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get user's club memberships
    const memberships = await ctx.db
      .query("clubMemberships")
      .withIndex("by_user_status", (q) => q.eq("userId", args.userId).eq("status", "active"))
      .collect();

    const clubIds = memberships.map(m => m.clubId);
    const now = Date.now();

    // Get upcoming events from all user's clubs
    const allEvents = await Promise.all(
      clubIds.map(async (clubId) => {
        const events = await ctx.db
          .query("events")
          .withIndex("by_club_start_time", (q) => q.eq("clubId", clubId))
          .filter((q) => q.gte(q.field("startTime"), now))
          .order("asc")
          .take(10); // Limit per club

        // Add club information and attendance counts
        return Promise.all(
          events.map(async (event: any) => {
            const club = await ctx.db.get(clubId);
            const attendanceCount = await ctx.db
              .query("attendance")
              .withIndex("by_event", (q) => q.eq("eventId", event._id))
              .collect();

            return {
              ...event,
              club,
              attendeeCount: attendanceCount.length,
            };
          })
        );
      })
    );

    // Flatten and sort by start time
    const flatEvents = allEvents.flat();
    return flatEvents.sort((a: any, b: any) => a.startTime - b.startTime).slice(0, 20);
  },
});

// Get a single event by ID
export const getEvent = query({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) return null;

    // Get attendance count
    const attendanceCount = await ctx.db
      .query("attendance")
      .withIndex("by_event", (q) => q.eq("eventId", args.id))
      .collect();

    // Get club information
    const club = await ctx.db.get(event.clubId);

    return {
      ...event,
      club,
      attendeeCount: attendanceCount.length,
    };
  },
});

// Create a new event
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    clubId: v.id("clubs"),
    startTime: v.number(),
    endTime: v.number(),
    location: v.optional(v.string()),
    type: v.union(v.literal("training"), v.literal("competition"), v.literal("seminar"), v.literal("grading")),
    calendarSource: v.optional(v.string()),
    externalId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Extract user ID from compound subject (format: userId|sessionId)
    const userId = identity.subject.split('|')[0];

    // Check if user is admin of this club
    const isAdmin = await isClubAdmin(ctx, userId, args.clubId);
    if (!isAdmin) {
      throw new Error("Only club admins can create events");
    }

    const now = Date.now();
    return await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      clubId: args.clubId,
      startTime: args.startTime,
      endTime: args.endTime,
      location: args.location,
      type: args.type,
      calendarSource: args.calendarSource,
      externalId: args.externalId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an event
export const updateEvent = mutation({
  args: {
    id: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    location: v.optional(v.string()),
    type: v.optional(v.union(v.literal("training"), v.literal("competition"), v.literal("seminar"), v.literal("grading"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Extract user ID from compound subject (format: userId|sessionId)
    const userId = identity.subject.split('|')[0];

    // Get the event to check club ownership
    const event = await ctx.db.get(args.id);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if user is admin of this club
    const isAdmin = await isClubAdmin(ctx, userId, event.clubId);
    if (!isAdmin) {
      throw new Error("Only club admins can update events");
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

// Delete an event
export const deleteEvent = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Extract user ID from compound subject (format: userId|sessionId)
    const userId = identity.subject.split('|')[0];

    // Get the event to check club ownership
    const event = await ctx.db.get(args.id);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if user is admin of this club
    const isAdmin = await isClubAdmin(ctx, userId, event.clubId);
    if (!isAdmin) {
      throw new Error("Only club admins can delete events");
    }



    // Delete the event
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Respond to an event (attending, absent, maybe)
export const respondToEvent = mutation({
  args: {
    eventId: v.id("events"),
    response: v.union(v.literal("attending"), v.literal("absent"), v.literal("maybe")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Extract user ID from compound subject (format: userId|sessionId)
    const userId = identity.subject.split('|')[0] as Id<"users">;

    // Get user's profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("User profile not found");
    }

    // Check if response already exists
    const existingResponse = await ctx.db
      .query("eventResponses")
      .withIndex("by_event_profile", (q) => q.eq("eventId", args.eventId).eq("profileId", profile._id))
      .first();

    const now = Date.now();

    if (existingResponse) {
      // Update existing response
      return await ctx.db.patch(existingResponse._id, {
        response: args.response,
        updatedAt: now,
      });
    } else {
      // Create new response
      return await ctx.db.insert("eventResponses", {
        eventId: args.eventId,
        profileId: profile._id,
        response: args.response,
        recordedBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Get user's response to an event
export const getUserEventResponse = query({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get user's profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      return null;
    }

    // Get user's response
    const response = await ctx.db
      .query("eventResponses")
      .withIndex("by_event_profile", (q) => q.eq("eventId", args.eventId).eq("profileId", profile._id))
      .first();

    return response?.response || null;
  },
});

// Remove user's response to an event
export const removeEventResponse = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Extract user ID from compound subject (format: userId|sessionId)
    const userId = identity.subject.split('|')[0] as Id<"users">;

    // Get user's profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("User profile not found");
    }

    // Find response record
    const response = await ctx.db
      .query("eventResponses")
      .withIndex("by_event_profile", (q) => q.eq("eventId", args.eventId).eq("profileId", profile._id))
      .first();

    if (!response) {
      throw new Error("No response found for this event");
    }

    // Delete response record
    await ctx.db.delete(response._id);
    return { success: true };
  },
});

// Create event from sync (used by calendar sync)
export const createEventFromSync = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    clubId: v.id("clubs"),
    startTime: v.number(),
    endTime: v.number(),
    location: v.optional(v.string()),
    type: v.union(v.literal("training"), v.literal("competition"), v.literal("seminar"), v.literal("grading")),
    calendarSource: v.optional(v.string()),
    externalId: v.optional(v.string()),
    calendarSyncId: v.optional(v.id("calendarSyncs")),
    syncGeneration: v.optional(v.number()),
    recurringEventId: v.optional(v.string()),
    instanceDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      clubId: args.clubId,
      startTime: args.startTime,
      endTime: args.endTime,
      location: args.location,
      type: args.type,
      calendarSource: args.calendarSource,
      externalId: args.externalId,
      calendarSyncId: args.calendarSyncId,
      syncGeneration: args.syncGeneration,
      recurringEventId: args.recurringEventId,
      instanceDate: args.instanceDate,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update event from sync (used by calendar sync)
export const updateEventFromSync = mutation({
  args: {
    id: v.id("events"),
    title: v.string(),
    description: v.optional(v.string()),
    clubId: v.id("clubs"),
    startTime: v.number(),
    endTime: v.number(),
    location: v.optional(v.string()),
    type: v.union(v.literal("training"), v.literal("competition"), v.literal("seminar"), v.literal("grading")),
    calendarSource: v.optional(v.string()),
    externalId: v.optional(v.string()),
    calendarSyncId: v.optional(v.id("calendarSyncs")),
    syncGeneration: v.optional(v.number()),
    recurringEventId: v.optional(v.string()),
    instanceDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});