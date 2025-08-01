import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Force clear ALL data - for development emergencies
export const forceClearAll = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all table names from the schema
    const tableNames = [
      "users", "authSessions", "authAccounts", "authVerificationCodes", "authVerifiers",
      "profiles", "clubs", "clubMemberships", "clubFeed",
      "events", "calendarSyncs"
    ];

    let totalDeleted = 0;

    for (const tableName of tableNames) {
      try {
        // Get all documents in this table
        const documents = await ctx.db.query(tableName as any).collect();
        console.log(`Found ${documents.length} documents in ${tableName}`);

        // Delete each document
        for (const doc of documents) {
          await ctx.db.delete(doc._id);
          totalDeleted++;
        }
      } catch (error) {
        console.log(`Could not clear table ${tableName}:`, error);
      }
    }

    console.log(`Force cleared database - deleted ${totalDeleted} documents total`);
    return {
      message: `Force cleared database - deleted ${totalDeleted} documents total`,
      tablesCleared: tableNames.length
    };
  },
});

// Clear all existing data (for development only)
export const clearDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all records from all tables
    const tables = [
      "users", "authSessions", "authAccounts", "authVerificationCodes", "authVerifiers",
      "profiles", "clubs", "clubMemberships", "clubFeed",
      "events", "calendarSyncs"
    ];

    for (const tableName of tables) {
      const records = await ctx.db.query(tableName as any).collect();
      await Promise.all(records.map(record => ctx.db.delete(record._id)));
    }

    console.log("Database cleared successfully");
    return { message: "Database cleared successfully" };
  },
});

export const seedData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Create sample clubs first
    const helsinkiKendoClub = await ctx.db.insert("clubs", {
      name: "Helsinki Kendo Club",
      location: "Helsinki, Finland",
      practiceSchedule: "Tuesdays 18:00-20:00, Fridays 17:00-19:00",
      sports: ["kendo"],
      createdAt: now,
      updatedAt: now,
    });

    const tampereKendoClub = await ctx.db.insert("clubs", {
      name: "Tampere Martial Arts Dojo",
      location: "Tampere, Finland",
      practiceSchedule: "Mondays 19:00-21:00, Wednesdays 18:00-20:00, Saturdays 10:00-12:00",
      sports: ["kendo", "iaido", "jodo"],
      createdAt: now,
      updatedAt: now,
    });

    const espooBudoClub = await ctx.db.insert("clubs", {
      name: "Espoo Budo Club",
      location: "Espoo, Finland",
      practiceSchedule: "Thursdays 18:30-20:30, Sundays 14:00-16:00",
      sports: ["kendo", "naginata"],
      createdAt: now,
      updatedAt: now,
    });

    // Create demo user profiles (these will be linked when users sign up with matching emails)
    // Note: We can't create Convex Auth users via seed, but we can prepare profiles
    const demoProfiles = [
      {
        name: "Takeshi Yamamoto",
        danKyuGrade: "7 dan",
        clubId: helsinkiKendoClub,
        sport: "kendo" as const,
        userId: "demo-sensei-id" as Id<"users">, // Will be updated when real user signs up
        userEmail: "sensei@helsinkikendo.fi",
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Matti Virtanen",
        danKyuGrade: "2 kyu",
        clubId: helsinkiKendoClub,
        sport: "kendo" as const,
        userId: "demo-student-id" as Id<"users">, // Will be updated when real user signs up
        userEmail: "student@example.com",
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Anna Korhonen",
        danKyuGrade: "1 dan",
        clubId: tampereKendoClub,
        sport: "iaido" as const,
        userId: "demo-anna-id" as Id<"users">, // Will be updated when real user signs up
        userEmail: "anna@example.com",
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Kenji Sato",
        danKyuGrade: "5 dan",
        clubId: espooBudoClub,
        sport: "naginata" as const,
        userId: "demo-admin-id" as Id<"users">, // Will be updated when real user signs up
        userEmail: "admin@espoobudo.fi",
        createdAt: now,
        updatedAt: now,
      }
    ];

    // Insert demo profiles
    const profileIds = await Promise.all(
      demoProfiles.map(profile => ctx.db.insert("profiles", profile))
    );

    // Create club memberships for demo accounts
    const memberships = [
      { userId: "demo-sensei-id" as Id<"users">, clubId: helsinkiKendoClub, role: "admin" as const },
      { userId: "demo-student-id" as Id<"users">, clubId: helsinkiKendoClub, role: "member" as const },
      { userId: "demo-anna-id" as Id<"users">, clubId: tampereKendoClub, role: "admin" as const },
      { userId: "demo-anna-id" as Id<"users">, clubId: helsinkiKendoClub, role: "member" as const },
      { userId: "demo-admin-id" as Id<"users">, clubId: espooBudoClub, role: "admin" as const },
    ];

    await Promise.all(
      memberships.map(membership =>
        ctx.db.insert("clubMemberships", {
          ...membership,
          status: "active" as const,
          joinedAt: now,
          updatedAt: now,
        })
      )
    );

    // Create sample club feed posts
    await ctx.db.insert("clubFeed", {
      clubId: helsinkiKendoClub,
      authorId: "demo-sensei-id" as Id<"users">,
      title: "Next Keiko Theme: Basic Men Strikes",
      content: "This week we will focus on proper men striking technique. Please bring your full bogu and arrive 15 minutes early for warm-up.",
      type: "keiko_theme",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("clubFeed", {
      clubId: helsinkiKendoClub,
      authorId: "demo-sensei-id" as Id<"users">,
      title: "Club Tournament Announcement",
      content: "Our annual club tournament will be held on March 15th. Registration is now open. Please see the notice board for details.",
      type: "announcement",
      createdAt: now - 86400000, // 1 day ago
      updatedAt: now - 86400000,
    });

    // Create sample events
    const trainingEvent = await ctx.db.insert("events", {
      title: "Regular Kendo Training",
      description: "Weekly kendo practice session for all levels",
      clubId: helsinkiKendoClub,
      startTime: now + 86400000, // Tomorrow
      endTime: now + 86400000 + 7200000, // Tomorrow + 2 hours
      type: "training",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("events", {
      title: "Dan Grading Seminar",
      description: "Preparation seminar for upcoming dan grading examination",
      clubId: tampereKendoClub,
      startTime: now + 604800000, // 1 week from now
      endTime: now + 604800000 + 14400000, // 1 week + 4 hours
      type: "seminar",
      createdAt: now,
      updatedAt: now,
    });

    console.log("Seed data created successfully with demo profiles");
    return {
      message: "Seed data created successfully with demo profiles",
      clubs: [helsinkiKendoClub, tampereKendoClub, espooBudoClub],
      profilesCreated: profileIds.length,
      note: "Demo users will need to sign up with matching emails to link to these profiles",
      demoEmails: [
        "sensei@helsinkikendo.fi",
        "student@example.com",
        "anna@example.com",
        "admin@espoobudo.fi"
      ]
    };
  },
});