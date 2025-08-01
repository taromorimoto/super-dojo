import { query, mutation } from "./_generated/server";
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
      createdBy: identity.subject as Id<"users">,
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

    // Check if response already recorded
    const existingResponse = await ctx.db
      .query("eventResponses")
      .withIndex("by_event_profile", (q) =>
        q.eq("eventId", qrCode.eventId).eq("profileId", args.profileId)
      )
      .first();

    const now = Date.now();

    if (existingResponse) {
      // Update existing response to "attending"
      return await ctx.db.patch(existingResponse._id, {
        response: "attending",
        updatedAt: now,
      });
    } else {
      // Create new response
      return await ctx.db.insert("eventResponses", {
        eventId: qrCode.eventId,
        profileId: args.profileId,
        response: "attending",
        recordedBy: identity.subject as Id<"users">,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

