// This is a temporary file to fix TypeScript compilation
// Run `npx convex dev` to generate the actual API file

export const api = {
  auth: {
    getCurrentUser: 'auth:getCurrentUser',
    createUser: 'auth:createUser',
    updateUserPasskey: 'auth:updateUserPasskey',
    createOrUpdateProfile: 'auth:createOrUpdateProfile',
    getUserByEmail: 'auth:getUserByEmail',
  },
  clubs: {
    getClubs: 'clubs:getClubs',
    getClub: 'clubs:getClub',
    getClubMembers: 'clubs:getClubMembers',
    createClub: 'clubs:createClub',
    updateClub: 'clubs:updateClub',
  },
  clubFeed: {
    getClubFeed: 'clubFeed:getClubFeed',
    createClubFeedPost: 'clubFeed:createClubFeedPost',
    updateClubFeedPost: 'clubFeed:updateClubFeedPost',
    deleteClubFeedPost: 'clubFeed:deleteClubFeedPost',
  },
  attendance: {
    generateAttendanceQR: 'attendance:generateAttendanceQR',
    scanAttendanceQR: 'attendance:scanAttendanceQR',
    getEventAttendance: 'attendance:getEventAttendance',
    getProfileAttendance: 'attendance:getProfileAttendance',
    recordManualAttendance: 'attendance:recordManualAttendance',
    getActiveQRCode: 'attendance:getActiveQRCode',
  },
  seed: {
    seedData: 'seed:seedData',
  },
};