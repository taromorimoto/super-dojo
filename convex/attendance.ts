import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper function to check if user is admin of a club
const isClubAdmin = async (ctx: any, userId: string, clubId: string): Promise<boolean> => {
  const membership = await ctx.db
    .query("clubMemberships")
    .withIndex("by_user_club", (q: any) => q.eq("userId", userId).eq("clubId", clubId))
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .first();

  return membership?.role === "admin";
};

// Generate QR code for attendance tracking
export const generateAttendanceQrCode = mutation({
  args: {
    eventId: v.id("events"),
    expiresInMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the event to check club membership
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Verify that the user is an admin of the club that owns this event
    const isAdmin = await isClubAdmin(ctx, identity.subject, event.clubId);
    if (!isAdmin) {
      throw new Error("Only club admins can generate attendance QR codes");
    }

    const now = Date.now();
    const expiresAt = now + (args.expiresInMinutes || 60) * 60 * 1000; // Default 1 hour

    // Generate a unique code
    const code = `${args.eventId}_${now}_${Math.random().toString(36).substr(2, 9)}`;

    // Deactivate any existing QR codes for this event
    const existingCodes = await ctx.db
      .query("attendanceQrCodes")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    await Promise.all(
      existingCodes.map(existingCode =>
        ctx.db.patch(existingCode._id, { isActive: false })
      )
    );

    // Create new QR code
    return await ctx.db.insert("attendanceQrCodes", {
      eventId: args.eventId,
      code,
      createdBy: identity.subject,
      expiresAt,
      isActive: true,
      createdAt: now,
    });
  },
});

// Get QR code for an event (for display)
export const getAttendanceQrCode = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("attendanceQrCodes")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

// Scan QR code to record attendance
export const scanAttendanceQrCode = mutation({
  args: {
    code: v.string(),
    profileId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find the QR code
    const qrCode = await ctx.db
      .query("attendanceQrCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!qrCode) {
      throw new Error("Invalid QR code");
    }

    if (!qrCode.isActive) {
      throw new Error("QR code is no longer active");
    }

    if (qrCode.expiresAt < Date.now()) {
      throw new Error("QR code has expired");
    }

    // Check if attendance already recorded
    const existingAttendance = await ctx.db
      .query("attendance")
      .withIndex("by_event_profile", (q) =>
        q.eq("eventId", qrCode.eventId).eq("profileId", args.profileId)
      )
      .first();

    if (existingAttendance) {
      throw new Error("Attendance already recorded for this event");
    }

    // Record attendance
    return await ctx.db.insert("attendance", {
      eventId: qrCode.eventId,
      profileId: args.profileId,
      attendedAt: Date.now(),
      recordedBy: identity.subject,
      method: "qr_code",
      createdAt: Date.now(),
    });
  },
});

// Manually record attendance (for club admins)
export const recordAttendanceManually = mutation({
  args: {
    eventId: v.id("events"),
    profileId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the event to check club membership
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Verify that the user is an admin of the club that owns this event
    const isAdmin = await isClubAdmin(ctx, identity.subject, event.clubId);
    if (!isAdmin) {
      throw new Error("Only club admins can manually record attendance");
    }

    // Check if attendance already recorded
    const existingAttendance = await ctx.db
      .query("attendance")
      .withIndex("by_event_profile", (q) =>
        q.eq("eventId", args.eventId).eq("profileId", args.profileId)
      )
      .first();

    if (existingAttendance) {
      throw new Error("Attendance already recorded for this event");
    }

    // Record attendance
    return await ctx.db.insert("attendance", {
      eventId: args.eventId,
      profileId: args.profileId,
      attendedAt: Date.now(),
      recordedBy: identity.subject,
      method: "manual",
      createdAt: Date.now(),
    });
  },
});

// Get attendance for an event
export const getEventAttendance = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const attendanceRecords = await ctx.db
      .query("attendance")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Get profile information for each attendance record
    const attendanceWithProfiles = await Promise.all(
      attendanceRecords.map(async (record) => {
        const profile = await ctx.db.get(record.profileId);
        return {
          ...record,
          profile,
        };
      })
    );

    return attendanceWithProfiles;
  },
});

// Get user's attendance history
export const getUserAttendance = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const attendanceRecords = await ctx.db
      .query("attendance")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();

    // Get event information for each attendance record
    const attendanceWithEvents = await Promise.all(
      attendanceRecords.map(async (record) => {
        const event = await ctx.db.get(record.eventId);
        return {
          ...record,
          event,
        };
      })
    );

    return attendanceWithEvents;
  },
});