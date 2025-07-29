import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

// Create a new club (admin only)
export const createClub = mutation({
  args: {
    name: v.string(),
    location: v.string(),
    practiceSchedule: v.string(),
    sports: v.array(v.union(v.literal("kendo"), v.literal("iaido"), v.literal("jodo"), v.literal("naginata"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("clubs", {
      name: args.name,
      location: args.location,
      practiceSchedule: args.practiceSchedule,
      sports: args.sports,
      createdAt: now,
      updatedAt: now,
    });
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