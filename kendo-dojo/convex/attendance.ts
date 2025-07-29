import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Generate QR code for event attendance
export const generateAttendanceQR = mutation({
  args: {
    eventId: v.id("events"),
    createdBy: v.id("users"),
    expiresInMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify that the user is a sensei or club admin
    const user = await ctx.db.get(args.createdBy);
    if (!user || (user.role !== "sensei" && user.role !== "club_admin")) {
      throw new Error("Only sensei and club admins can generate attendance QR codes");
    }
    
    // Verify that the event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }
    
    // Deactivate any existing QR codes for this event
    const existingCodes = await ctx.db
      .query("attendanceQrCodes")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    for (const code of existingCodes) {
      await ctx.db.patch(code._id, { isActive: false });
    }
    
    // Generate unique code
    const code = `event_${args.eventId}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = Date.now() + (args.expiresInMinutes || 60) * 60 * 1000; // Default 1 hour
    
    const qrCodeId = await ctx.db.insert("attendanceQrCodes", {
      eventId: args.eventId,
      code: code,
      createdBy: args.createdBy,
      expiresAt: expiresAt,
      isActive: true,
      createdAt: Date.now(),
    });
    
    return await ctx.db.get(qrCodeId);
  },
});

// Scan QR code and record attendance
export const scanAttendanceQR = mutation({
  args: {
    code: v.string(),
    profileId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
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
    
    // Verify profile exists
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }
    
    // Record attendance
    const attendanceId = await ctx.db.insert("attendance", {
      eventId: qrCode.eventId,
      profileId: args.profileId,
      attendedAt: Date.now(),
      recordedBy: qrCode.createdBy,
      method: "qr_code",
      createdAt: Date.now(),
    });
    
    return {
      attendance: await ctx.db.get(attendanceId),
      event: await ctx.db.get(qrCode.eventId),
      profile: profile,
    };
  },
});

// Get attendance for an event
export const getEventAttendance = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    
    // Get profile information for each attendance record
    const attendanceWithProfiles = await Promise.all(
      attendance.map(async (record) => {
        const profile = await ctx.db.get(record.profileId);
        return {
          ...record,
          profile: profile,
        };
      })
    );
    
    return attendanceWithProfiles;
  },
});

// Get attendance for a profile
export const getProfileAttendance = query({
  args: { 
    profileId: v.id("profiles"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .order("desc")
      .take(limit);
    
    // Get event information for each attendance record
    const attendanceWithEvents = await Promise.all(
      attendance.map(async (record) => {
        const event = await ctx.db.get(record.eventId);
        return {
          ...record,
          event: event,
        };
      })
    );
    
    return attendanceWithEvents;
  },
});

// Manually record attendance (for sensei)
export const recordManualAttendance = mutation({
  args: {
    eventId: v.id("events"),
    profileId: v.id("profiles"),
    recordedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify that the user is a sensei or club admin
    const user = await ctx.db.get(args.recordedBy);
    if (!user || (user.role !== "sensei" && user.role !== "club_admin")) {
      throw new Error("Only sensei and club admins can manually record attendance");
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
    
    // Verify event and profile exist
    const event = await ctx.db.get(args.eventId);
    const profile = await ctx.db.get(args.profileId);
    
    if (!event) {
      throw new Error("Event not found");
    }
    
    if (!profile) {
      throw new Error("Profile not found");
    }
    
    // Record attendance
    const attendanceId = await ctx.db.insert("attendance", {
      eventId: args.eventId,
      profileId: args.profileId,
      attendedAt: Date.now(),
      recordedBy: args.recordedBy,
      method: "manual",
      createdAt: Date.now(),
    });
    
    return await ctx.db.get(attendanceId);
  },
});

// Get active QR codes for an event
export const getActiveQRCode = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("attendanceQrCodes")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .filter((q) => q.gt(q.field("expiresAt"), Date.now()))
      .first();
  },
});