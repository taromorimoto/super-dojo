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

// Get all clubs
export const getClubs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("clubs").collect();
  },
});

// Get a specific club by ID
export const getClub = query({
  args: { id: v.id("clubs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get club members (profiles)
export const getClubMembers = query({
  args: { clubId: v.id("clubs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .collect();
  },
});

// Get club members with membership details
export const getClubMembersWithRoles = query({
  args: { clubId: v.id("clubs") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("clubMemberships")
      .withIndex("by_club_status", (q) => q.eq("clubId", args.clubId).eq("status", "active"))
      .collect();

    const membersWithDetails = await Promise.all(
      memberships.map(async (membership) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", membership.userId))
          .first();

        return {
          membership,
          user: {
            _id: membership.userId,
            email: profile?.userEmail,
          },
          profile,
        };
      })
    );

    return membersWithDetails;
  },
});

// Get user's club memberships
export const getUserMemberships = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("clubMemberships")
      .withIndex("by_user_status", (q) => q.eq("userId", args.userId).eq("status", "active"))
      .collect();

    const membershipDetails = await Promise.all(
      memberships.map(async (membership) => {
        const club = await ctx.db.get(membership.clubId);
        return {
          ...membership,
          club,
        };
      })
    );

    return membershipDetails;
  },
});

// Check if user is member of a club
export const isUserMemberOfClub = query({
  args: {
    userId: v.id("users"),
    clubId: v.id("clubs"),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("clubMemberships")
      .withIndex("by_user_club", (q) => q.eq("userId", args.userId).eq("clubId", args.clubId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    return {
      isMember: !!membership,
      role: membership?.role || null,
      membership,
    };
  },
});

// Join a club
export const joinClub = mutation({
  args: { clubId: v.id("clubs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Extract user ID from compound subject (format: userId|sessionId)
    const userId = identity.subject.split('|')[0] as Id<"users">;

    // Check if already a member
    const existingMembership = await ctx.db
      .query("clubMemberships")
      .withIndex("by_user_club", (q) => q.eq("userId", userId).eq("clubId", args.clubId))
      .first();

    if (existingMembership) {
      if (existingMembership.status === "active") {
        throw new Error("Already a member of this club");
      } else {
        // Reactivate membership
        await ctx.db.patch(existingMembership._id, {
          status: "active",
          updatedAt: Date.now(),
        });
        return existingMembership._id;
      }
    }

    // Create new membership
    const now = Date.now();
    return await ctx.db.insert("clubMemberships", {
      userId: userId,
      clubId: args.clubId,
      role: "member",
      status: "active",
      joinedAt: now,
      updatedAt: now,
    });
  },
});

// Leave a club
export const leaveClub = mutation({
  args: { clubId: v.id("clubs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Extract user ID from compound subject (format: userId|sessionId)
    const userId = identity.subject.split('|')[0] as Id<"users">;

    const membership = await ctx.db
      .query("clubMemberships")
      .withIndex("by_user_club", (q) => q.eq("userId", userId).eq("clubId", args.clubId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error("Not a member of this club");
    }

    // Set membership to inactive
    await ctx.db.patch(membership._id, {
      status: "inactive",
      updatedAt: Date.now(),
    });

    return membership._id;
  },
});

// Promote user to admin or demote admin to member
export const updateMemberRole = mutation({
  args: {
    clubId: v.id("clubs"),
    targetUserId: v.id("users"),
    newRole: v.union(v.literal("member"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Extract user ID from compound subject (format: userId|sessionId)
    const userId = identity.subject.split('|')[0];

    // Check if current user is admin of this club
    const isAdmin = await isClubAdmin(ctx, userId, args.clubId);
    if (!isAdmin) {
      throw new Error("Only club admins can change member roles");
    }

    // Get target user's membership
    const targetMembership = await ctx.db
      .query("clubMemberships")
      .withIndex("by_user_club", (q) => q.eq("userId", args.targetUserId).eq("clubId", args.clubId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!targetMembership) {
      throw new Error("User is not a member of this club");
    }

    // Update role
    await ctx.db.patch(targetMembership._id, {
      role: args.newRole,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(targetMembership._id);
  },
});

// Create a new club (authenticated users only)
export const createClub = mutation({
  args: {
    name: v.string(),
    location: v.string(),
    practiceSchedule: v.string(),
    sports: v.array(v.union(v.literal("kendo"), v.literal("iaido"), v.literal("jodo"), v.literal("naginata"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Extract user ID from compound subject (format: userId|sessionId)
    const userId = identity.subject.split('|')[0] as Id<"users">;

    const now = Date.now();

    // Create the club
    const clubId = await ctx.db.insert("clubs", {
      name: args.name,
      location: args.location,
      practiceSchedule: args.practiceSchedule,
      sports: args.sports,
      createdAt: now,
      updatedAt: now,
    });

    // Make the creator an admin member of the club
    await ctx.db.insert("clubMemberships", {
      userId: userId,
      clubId: clubId,
      role: "admin",
      status: "active",
      joinedAt: now,
      updatedAt: now,
    });

    return clubId;
  },
});

// Update club information
export const updateClub = mutation({
  args: {
    id: v.id("clubs"),
    name: v.optional(v.string()),
    location: v.optional(v.string()),
    practiceSchedule: v.optional(v.string()),
    sports: v.optional(v.array(v.union(v.literal("kendo"), v.literal("iaido"), v.literal("jodo"), v.literal("naginata")))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Extract user ID from compound subject (format: userId|sessionId)
    const userId = identity.subject.split('|')[0];

    // Check if user is admin of this club
    const isAdmin = await isClubAdmin(ctx, userId, args.id);
    if (!isAdmin) {
      throw new Error("Only club admins can update club information");
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