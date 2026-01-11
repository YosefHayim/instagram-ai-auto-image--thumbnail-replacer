/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_agents_forge from "../ai/agents/forge.js";
import type * as ai_agents_specialists from "../ai/agents/specialists.js";
import type * as ai_gemini from "../ai/gemini.js";
import type * as chatEnhance from "../chatEnhance.js";
import type * as http from "../http.js";
import type * as optimizations from "../optimizations.js";
import type * as profiles from "../profiles.js";
import type * as stripe from "../stripe.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/agents/forge": typeof ai_agents_forge;
  "ai/agents/specialists": typeof ai_agents_specialists;
  "ai/gemini": typeof ai_gemini;
  chatEnhance: typeof chatEnhance;
  http: typeof http;
  optimizations: typeof optimizations;
  profiles: typeof profiles;
  stripe: typeof stripe;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
