export type ImageProvider = "openai" | "gemini" | "claude" | "replicate";

export interface ProviderInfo {
  id: ImageProvider;
  name: string;
  available: boolean;
  description: string;
  icon: string;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "openai",
    name: "OpenAI",
    available: true,
    description: "GPT-Image / DALL-E",
    icon: "Sparkles",
  },
  {
    id: "gemini",
    name: "Gemini",
    available: true,
    description: "Google AI",
    icon: "Zap",
  },
  {
    id: "claude",
    name: "Claude",
    available: true,
    description: "Anthropic",
    icon: "Brain",
  },
  {
    id: "replicate",
    name: "Flux",
    available: true,
    description: "Open Source",
    icon: "Cpu",
  },
];

export const DEFAULT_PROVIDER: ImageProvider = "openai";
