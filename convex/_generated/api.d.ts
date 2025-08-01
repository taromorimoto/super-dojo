/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as attendance from "../attendance.js";
import type * as auth from "../auth.js";
import type * as calendarSync from "../calendarSync.js";
import type * as clubFeed from "../clubFeed.js";
import type * as clubs from "../clubs.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as seed from "../seed.js";
import type * as utils_icsParser from "../utils/icsParser.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  attendance: typeof attendance;
  auth: typeof auth;
  calendarSync: typeof calendarSync;
  clubFeed: typeof clubFeed;
  clubs: typeof clubs;
  events: typeof events;
  http: typeof http;
  seed: typeof seed;
  "utils/icsParser": typeof utils_icsParser;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
