/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_agents_artist from "../ai/agents/artist.js";
import type * as ai_agents_curator from "../ai/agents/curator.js";
import type * as ai_agents_forge from "../ai/agents/forge.js";
import type * as ai_agents_intake from "../ai/agents/intake.js";
import type * as ai_agents_strategist from "../ai/agents/strategist.js";
import type * as ai_agents_vision from "../ai/agents/vision.js";
import type * as ai_enhance from "../ai/enhance.js";
import type * as ai_gemini from "../ai/gemini.js";
import type * as ai_pipeline from "../ai/pipeline.js";
import type * as ai_types from "../ai/types.js";
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
  "ai/agents/artist": typeof ai_agents_artist;
  "ai/agents/curator": typeof ai_agents_curator;
  "ai/agents/forge": typeof ai_agents_forge;
  "ai/agents/intake": typeof ai_agents_intake;
  "ai/agents/strategist": typeof ai_agents_strategist;
  "ai/agents/vision": typeof ai_agents_vision;
  "ai/enhance": typeof ai_enhance;
  "ai/gemini": typeof ai_gemini;
  "ai/pipeline": typeof ai_pipeline;
  "ai/types": typeof ai_types;
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
