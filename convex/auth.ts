import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get current user
export const getCurrentUser = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (!user) return null;
    
    // Get the associated profile if it exists
    let profile = null;
    if (user.profileId) {
      profile = await ctx.db.get(user.profileId);
    }
    
    return { user, profile };
  },
});

// Create a new user
export const createUser = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("student"), v.literal("sensei"), v.literal("club_admin"), v.literal("guardian")),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existingUser) {
      throw new Error("User with this email already exists");
    }
    
    const now = Date.now();
    
    return await ctx.db.insert("users", {
      email: args.email,
      role: args.role,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update user passkey information
export const updateUserPasskey = mutation({
  args: {
    userId: v.id("users"),
    passkey: v.object({
      credentialId: v.string(),
      publicKey: v.string(),
      counter: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      passkey: args.passkey,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(args.userId);
  },
});

// Create or update user profile
export const createOrUpdateProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    danKyuGrade: v.string(),
    clubId: v.id("clubs"),
    sport: v.union(v.literal("kendo"), v.literal("iaido"), v.literal("jodo"), v.literal("naginata")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const now = Date.now();
    
    // Check if user already has a profile
    if (user.profileId) {
      // Update existing profile
      await ctx.db.patch(user.profileId, {
        name: args.name,
        danKyuGrade: args.danKyuGrade,
        clubId: args.clubId,
        sport: args.sport,
        updatedAt: now,
      });
      
      return await ctx.db.get(user.profileId);
    } else {
      // Create new profile
      const profileId = await ctx.db.insert("profiles", {
        name: args.name,
        danKyuGrade: args.danKyuGrade,
        clubId: args.clubId,
        sport: args.sport,
        userId: args.userId,
        createdAt: now,
        updatedAt: now,
      });
      
      // Link profile to user
      await ctx.db.patch(args.userId, {
        profileId: profileId,
        updatedAt: now,
      });
      
      return await ctx.db.get(profileId);
    }
  },
});

// Get user by email (for authentication)
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});