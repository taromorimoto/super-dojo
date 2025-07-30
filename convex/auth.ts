import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Standard Convex Auth setup with Password provider
export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: params.email as string,
          name: params.name as string,
        };
      },
    }),
  ],
});

// Helper to get user data from compound subject ID
const getUserFromIdentity = async (ctx: any, identity: any) => {
  // If identity already has email, return it as-is
  if (identity.email) {
    return {
      email: identity.email,
      name: identity.name,
      userId: identity.subject.split('|')[0] // Extract user ID from compound subject
    };
  }

  // Extract user ID from compound subject (format: userId|sessionId)
  const userId = identity.subject.split('|')[0];

  try {
    const user = await ctx.db.get(userId);
    if (user && 'email' in user) {
      return {
        email: user.email,
        name: user.name,
        userId: userId
      };
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
  }

  return null;
};

// Helper to link existing demo profiles when users sign up
const linkDemoProfileIfExists = async (ctx: any, identity: any) => {
  const userData = await getUserFromIdentity(ctx, identity);
  if (!userData?.email) {
    return null;
  }

  // Check if there's a demo profile with this email
  const demoProfile = await ctx.db
    .query("profiles")
    .withIndex("by_user_email", (q: any) => q.eq("userEmail", userData.email))
    .filter((q: any) => q.or(
      q.eq(q.field("userId"), "demo-sensei-id"),
      q.eq(q.field("userId"), "demo-student-id"),
      q.eq(q.field("userId"), "demo-anna-id"),
      q.eq(q.field("userId"), "demo-admin-id")
    ))
    .first();

  if (demoProfile) {
    // Update the demo profile with the real user ID
    await ctx.db.patch(demoProfile._id, {
      userId: userData.userId,
      updatedAt: Date.now(),
    });

    // Update any club memberships with the real user ID
    const demoMemberships = await ctx.db
      .query("clubMemberships")
      .withIndex("by_user", (q: any) => q.eq("userId", demoProfile.userId))
      .collect();

    await Promise.all(
      demoMemberships.map((membership: any) =>
        ctx.db.patch(membership._id, {
          userId: userData.userId,
          updatedAt: Date.now(),
        })
      )
    );

    // Update any club feed posts
    const demoFeedPosts = await ctx.db
      .query("clubFeed")
      .filter((q: any) => q.eq(q.field("authorId"), demoProfile.userId))
      .collect();

    await Promise.all(
      demoFeedPosts.map((post: any) =>
        ctx.db.patch(post._id, {
          authorId: userData.userId,
          updatedAt: Date.now(),
        })
      )
    );

    return demoProfile;
  }

  return null;
};

// Helper to get current authenticated user with custom profile data
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Get user data from identity (handles compound subject IDs)
    const userData = await getUserFromIdentity(ctx, identity);

    if (!userData) {
      // Return partial user data without email-based profile lookup
      return {
        user: {
          _id: identity.subject,
          email: "", // Provide empty string for compatibility
          name: identity.name || "",
        },
        profile: null,
      };
    }

    // Check if we need to link a demo profile first
    await linkDemoProfileIfExists(ctx, identity);

    // Get the user's custom profile if it exists
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_email", (q) => q.eq("userEmail", userData.email))
      .first();

    return {
      user: {
        _id: userData.userId,
        email: userData.email,
        name: userData.name || "",
      },
      profile,
    };
  },
});

// Create or update user profile (now linked by email instead of userId)
export const createOrUpdateProfile = mutation({
  args: {
    name: v.string(),
    danKyuGrade: v.string(),
    clubId: v.optional(v.id("clubs")),
    sport: v.union(v.literal("kendo"), v.literal("iaido"), v.literal("jodo"), v.literal("naginata")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user data from identity (handles compound subject IDs)
    const userData = await getUserFromIdentity(ctx, identity);
    if (!userData) {
      throw new Error("Unable to retrieve user data from authentication identity");
    }

    const now = Date.now();

    // Check if there's already a demo profile to link
    const linkedProfile = await linkDemoProfileIfExists(ctx, identity);
    if (linkedProfile) {
      // Update the linked demo profile instead of creating new one
      const updateData: any = {
        name: args.name,
        danKyuGrade: args.danKyuGrade,
        sport: args.sport,
        updatedAt: now,
      };

      // Only update clubId if provided
      if (args.clubId !== undefined) {
        updateData.clubId = args.clubId;
      }

      await ctx.db.patch(linkedProfile._id, updateData);
      return await ctx.db.get(linkedProfile._id);
    }

    // Check if user already has a profile
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user_email", (q) => q.eq("userEmail", userData.email))
      .first();

    if (existingProfile) {
      // Update existing profile
      const updateData: any = {
        name: args.name,
        danKyuGrade: args.danKyuGrade,
        sport: args.sport,
        updatedAt: now,
      };

      // Only update clubId if provided
      if (args.clubId !== undefined) {
        updateData.clubId = args.clubId;
      }

      await ctx.db.patch(existingProfile._id, updateData);
      return await ctx.db.get(existingProfile._id);
    } else {
      // Create new profile
      const profileData: any = {
        name: args.name,
        danKyuGrade: args.danKyuGrade,
        sport: args.sport,
        userEmail: userData.email,
        userId: userData.userId, // Store the actual Convex user ID
        createdAt: now,
        updatedAt: now,
      };

      // Only set clubId if provided
      if (args.clubId !== undefined) {
        profileData.clubId = args.clubId;
      }

      const profileId = await ctx.db.insert("profiles", profileData);
      return await ctx.db.get(profileId);
    }
  },
});

// Set primary club for user profile
export const setPrimaryClub = mutation({
  args: {
    clubId: v.optional(v.id("clubs")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user data from identity (handles compound subject IDs)
    const userData = await getUserFromIdentity(ctx, identity);
    if (!userData) {
      throw new Error("Unable to retrieve user data from authentication identity");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_email", (q) => q.eq("userEmail", userData.email))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // If clubId is provided, verify user is a member of that club
    if (args.clubId) {
      const membership = await ctx.db
        .query("clubMemberships")
        .withIndex("by_user_club", (q) => q.eq("userId", userData.userId).eq("clubId", args.clubId!))
        .filter((q) => q.eq(q.field("status"), "active"))
        .first();

      if (!membership) {
        throw new Error("User is not a member of the specified club");
      }
    }

    await ctx.db.patch(profile._id, {
      clubId: args.clubId,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(profile._id);
  },
});