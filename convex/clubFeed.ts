import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
      .withIndex("by_club_created", (q) => q.eq("clubId", args.clubId))
      .order("desc")
      .take(limit);
    
    // Get author information for each post
    const postsWithAuthors = await Promise.all(
      posts.map(async (post) => {
        const author = await ctx.db.get(post.authorId);
        let authorProfile = null;
        
        if (author?.profileId) {
          authorProfile = await ctx.db.get(author.profileId);
        }
        
        return {
          ...post,
          author: {
            email: author?.email,
            role: author?.role,
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
    authorId: v.id("users"),
    title: v.string(),
    content: v.string(),
    type: v.union(v.literal("announcement"), v.literal("keiko_theme"), v.literal("general")),
  },
  handler: async (ctx, args) => {
    // Verify that the author is associated with the club
    const author = await ctx.db.get(args.authorId);
    if (!author) {
      throw new Error("Author not found");
    }
    
    // Check if user has permission to post (sensei or club admin)
    if (author.role !== "sensei" && author.role !== "club_admin") {
      throw new Error("Only sensei and club admins can create feed posts");
    }
    
    const now = Date.now();
    
    return await ctx.db.insert("clubFeed", {
      clubId: args.clubId,
      authorId: args.authorId,
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
    authorId: v.id("users"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    type: v.optional(v.union(v.literal("announcement"), v.literal("keiko_theme"), v.literal("general"))),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }
    
    // Verify that the user is the author or has admin privileges
    const author = await ctx.db.get(args.authorId);
    if (!author) {
      throw new Error("User not found");
    }
    
    if (post.authorId !== args.authorId && author.role !== "club_admin") {
      throw new Error("Only the post author or club admin can edit posts");
    }
    
    const { postId, authorId, ...updates } = args;
    
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
    
    await ctx.db.patch(postId, updateData);
    return await ctx.db.get(postId);
  },
});

// Delete a club feed post
export const deleteClubFeedPost = mutation({
  args: {
    postId: v.id("clubFeed"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }
    
    // Verify that the user is the author or has admin privileges
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    if (post.authorId !== args.userId && user.role !== "club_admin") {
      throw new Error("Only the post author or club admin can delete posts");
    }
    
    await ctx.db.delete(args.postId);
    return { success: true };
  },
});