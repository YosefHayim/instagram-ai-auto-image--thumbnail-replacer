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
import type * as ai_claude from "../ai/claude.js";
import type * as ai_gemini from "../ai/gemini.js";
import type * as ai_openai from "../ai/openai.js";
import type * as chatEnhance from "../chatEnhance.js";
import type * as http from "../http.js";
import type * as lemonSqueezy from "../lemonSqueezy.js";
import type * as optimizations from "../optimizations.js";
import type * as presets from "../presets.js";
import type * as stripe from "../stripe.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/agents/forge": typeof ai_agents_forge;
  "ai/agents/specialists": typeof ai_agents_specialists;
  "ai/claude": typeof ai_claude;
  "ai/gemini": typeof ai_gemini;
  "ai/openai": typeof ai_openai;
  chatEnhance: typeof chatEnhance;
  http: typeof http;
  lemonSqueezy: typeof lemonSqueezy;
  optimizations: typeof optimizations;
  presets: typeof presets;
  stripe: typeof stripe;
  users: typeof users;
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
