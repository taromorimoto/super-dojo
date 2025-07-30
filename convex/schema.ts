import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  // Convex Auth tables
  ...authTables,

  // User profiles (public information) - now linked to Convex Auth users
  profiles: defineTable({
    name: v.string(),
    danKyuGrade: v.string(), // e.g., "3 dan", "2 kyu"
    clubId: v.optional(v.id("clubs")), // Primary club (optional)
    sport: v.union(v.literal("kendo"), v.literal("iaido"), v.literal("jodo"), v.literal("naginata")),
    userId: v.string(), // Convex Auth user ID (subject)
    userEmail: v.string(), // Email for easier queries
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_club", ["clubId"])
   .index("by_user", ["userId"])
   .index("by_user_email", ["userEmail"]),

  // Clubs
  clubs: defineTable({
    name: v.string(),
    location: v.string(),
    practiceSchedule: v.string(), // Text description of practice times
    sports: v.array(v.union(v.literal("kendo"), v.literal("iaido"), v.literal("jodo"), v.literal("naginata"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // Club memberships - tracks user membership in clubs
  clubMemberships: defineTable({
    userId: v.string(), // Convex Auth user ID (subject)
    clubId: v.id("clubs"),
    role: v.union(v.literal("member"), v.literal("admin")), // member or admin
    status: v.union(v.literal("active"), v.literal("pending"), v.literal("inactive")),
    joinedAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
   .index("by_club", ["clubId"])
   .index("by_user_club", ["userId", "clubId"])
   .index("by_club_status", ["clubId", "status"])
   .index("by_user_status", ["userId", "status"]),

  // Club feed posts for announcements
  clubFeed: defineTable({
    clubId: v.id("clubs"),
    authorId: v.string(), // Convex Auth user ID
    title: v.string(),
    content: v.string(),
    type: v.union(v.literal("announcement"), v.literal("keiko_theme"), v.literal("general")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_club", ["clubId"])
   .index("by_club_created", ["clubId", "createdAt"]),

  // Events (training sessions, competitions, etc.)
  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    clubId: v.id("clubs"),
    startTime: v.number(),
    endTime: v.number(),
    location: v.optional(v.string()),
    type: v.union(v.literal("training"), v.literal("competition"), v.literal("seminar"), v.literal("grading")),
    calendarSource: v.optional(v.string()), // ICS file source URL
    externalId: v.optional(v.string()), // External calendar event ID
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_club", ["clubId"])
   .index("by_club_start_time", ["clubId", "startTime"]),

  // Event attendance tracking
  attendance: defineTable({
    eventId: v.id("events"),
    profileId: v.id("profiles"),
    attendedAt: v.number(),
    recordedBy: v.string(), // Convex Auth user ID
    method: v.union(v.literal("qr_code"), v.literal("manual")),
    createdAt: v.number(),
  }).index("by_event", ["eventId"])
   .index("by_profile", ["profileId"])
   .index("by_event_profile", ["eventId", "profileId"]),

  // QR codes for attendance tracking
  attendanceQrCodes: defineTable({
    eventId: v.id("events"),
    code: v.string(), // Unique QR code string
    createdBy: v.string(), // Convex Auth user ID
    expiresAt: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_code", ["code"])
   .index("by_event", ["eventId"]),

  // Marketplace listings for second-hand gear
  marketplaceListings: defineTable({
    title: v.string(),
    description: v.string(),
    price: v.optional(v.number()),
    category: v.union(
      v.literal("bogu"),
      v.literal("shinai"),
      v.literal("keikogi"),
      v.literal("hakama"),
      v.literal("accessories"),
      v.literal("other")
    ),
    condition: v.union(v.literal("new"), v.literal("excellent"), v.literal("good"), v.literal("fair")),
    images: v.array(v.string()), // URLs to uploaded images
    sellerId: v.string(), // Convex Auth user ID
    clubId: v.id("clubs"),
    isAvailable: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_club", ["clubId"])
   .index("by_seller", ["sellerId"])
   .index("by_category", ["category"])
   .index("by_available", ["isAvailable"]),

  // Messages for marketplace communications
  marketplaceMessages: defineTable({
    listingId: v.id("marketplaceListings"),
    senderId: v.string(), // Convex Auth user ID
    receiverId: v.string(), // Convex Auth user ID
    content: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  }).index("by_listing", ["listingId"])
   .index("by_conversation", ["listingId", "senderId", "receiverId"])
   .index("by_receiver", ["receiverId", "isRead"]),

  // Calendar sync configurations
  calendarSyncs: defineTable({
    clubId: v.id("clubs"),
    name: v.string(),
    icsUrl: v.string(),
    isActive: v.boolean(),
    lastSyncAt: v.optional(v.number()),
    lastSyncStatus: v.optional(v.union(v.literal("success"), v.literal("error"))),
    lastSyncError: v.optional(v.string()),
    createdBy: v.string(), // Convex Auth user ID
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_club", ["clubId"])
   .index("by_active", ["isActive"]),
});