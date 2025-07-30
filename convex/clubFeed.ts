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

// Get club feed posts
export const getClubFeed = query({
  args: {
    clubId: v.id("clubs"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    const posts = await ctx.db
      .query("clubFeed")
      .withIndex("by_club_created", (q) =>
        q.eq("clubId", args.clubId)
      )
      .order("desc")
      .take(limit);

    // Get author profile information for each post
    const postsWithAuthors = await Promise.all(
      posts.map(async (post) => {
        const authorProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", post.authorId))
          .first();

        return {
          ...post,
          author: {
            profile: authorProfile,
          },
        };
      })
    );

    return postsWithAuthors;
  },
});

// Create a new club feed post
export const createClubFeedPost = mutation({
  args: {
    clubId: v.id("clubs"),
    title: v.string(),
    content: v.string(),
    type: v.union(v.literal("announcement"), v.literal("keiko_theme"), v.literal("general")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify that the user is an admin of this club
    const isAdmin = await isClubAdmin(ctx, identity.subject, args.clubId);
    if (!isAdmin) {
      throw new Error("Only club admins can create posts");
    }

    const now = Date.now();

    return await ctx.db.insert("clubFeed", {
      clubId: args.clubId,
      authorId: identity.subject,
      title: args.title,
      content: args.content,
      type: args.type,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a club feed post
export const updateClubFeedPost = mutation({
  args: {
    postId: v.id("clubFeed"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    type: v.optional(v.union(v.literal("announcement"), v.literal("keiko_theme"), v.literal("general"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Check if user is the author or a club admin
    const isAdmin = await isClubAdmin(ctx, identity.subject, post.clubId);
    if (post.authorId !== identity.subject && !isAdmin) {
      throw new Error("You can only edit your own posts or be a club admin");
    }

    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updateData.title = args.title;
    if (args.content !== undefined) updateData.content = args.content;
    if (args.type !== undefined) updateData.type = args.type;

    await ctx.db.patch(args.postId, updateData);
    return await ctx.db.get(args.postId);
  },
});

// Delete a club feed post
export const deleteClubFeedPost = mutation({
  args: {
    postId: v.id("clubFeed"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Check if user is the author or a club admin
    const isAdmin = await isClubAdmin(ctx, identity.subject, post.clubId);
    if (post.authorId !== identity.subject && !isAdmin) {
      throw new Error("You can only delete your own posts or be a club admin");
    }

    await ctx.db.delete(args.postId);
    return { success: true };
  },
});