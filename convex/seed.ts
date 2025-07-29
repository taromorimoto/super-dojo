import { mutation } from "./_generated/server";

export const seedData = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if data already exists
    const existingClubs = await ctx.db.query("clubs").collect();
    if (existingClubs.length > 0) {
      console.log("Seed data already exists, skipping...");
      return { message: "Seed data already exists" };
    }

    const now = Date.now();

    // Create sample clubs
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

    // Create sample users and profiles
    const sensei1 = await ctx.db.insert("users", {
      email: "sensei@helsinkikendo.fi",
      role: "sensei",
      createdAt: now,
      updatedAt: now,
    });

    const profile1 = await ctx.db.insert("profiles", {
      name: "Takeshi Yamamoto",
      danKyuGrade: "7 dan",
      clubId: helsinkiKendoClub,
      sport: "kendo",
      userId: sensei1,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(sensei1, { profileId: profile1 });

    const student1 = await ctx.db.insert("users", {
      email: "student@example.com",
      role: "student",
      createdAt: now,
      updatedAt: now,
    });

    const profile2 = await ctx.db.insert("profiles", {
      name: "Matti Virtanen",
      danKyuGrade: "2 kyu",
      clubId: helsinkiKendoClub,
      sport: "kendo",
      userId: student1,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(student1, { profileId: profile2 });

    // Create sample club feed posts
    await ctx.db.insert("clubFeed", {
      clubId: helsinkiKendoClub,
      authorId: sensei1,
      title: "Next Keiko Theme: Basic Men Strikes",
      content: "This week we will focus on proper men striking technique. Please bring your full bogu and arrive 15 minutes early for warm-up.",
      type: "keiko_theme",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("clubFeed", {
      clubId: helsinkiKendoClub,
      authorId: sensei1,
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

    console.log("Seed data created successfully");
    return { 
      message: "Seed data created successfully",
      clubs: [helsinkiKendoClub, tampereKendoClub, espooBudoClub],
      users: [sensei1, student1],
      events: [trainingEvent],
    };
  },
});