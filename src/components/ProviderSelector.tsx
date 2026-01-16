import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Brain, Cpu, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ImageProvider, PROVIDERS, DEFAULT_PROVIDER } from "@/lib/types";
import { storage } from "wxt/storage";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Zap,
  Brain,
  Cpu,
};

const PROVIDER_STORAGE_KEY = "local:selected_provider";

interface ProviderSelectorProps {
  selectedProvider: ImageProvider;
  onSelect: (provider: ImageProvider) => void;
  className?: string;
}

export function ProviderSelector({
  selectedProvider,
  onSelect,
  className,
}: ProviderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentProvider =
    PROVIDERS.find((p) => p.id === selectedProvider) || PROVIDERS[0];
  const Icon = iconMap[currentProvider.icon] || Sparkles;

  const handleSelect = async (provider: ImageProvider) => {
    onSelect(provider);
    setIsOpen(false);
    await storage.setItem(PROVIDER_STORAGE_KEY, provider);
  };

  return (
    <div className={cn("relative", className)}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5",
          "bg-[#1a1a2e]/80 border border-white/10 rounded-lg",
          "text-white text-xs font-medium",
          "hover:bg-[#252542] transition-colors",
        )}
        whileTap={{ scale: 0.98 }}
      >
        <Icon className="w-3.5 h-3.5 text-purple-400" />
        <span>{currentProvider.name}</span>
        <ChevronDown
          className={cn(
            "w-3 h-3 text-gray-400 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "absolute top-full right-0 mt-1 z-50 min-w-[160px]",
              "bg-[#1a1a2e] border border-white/10 rounded-lg",
              "shadow-xl shadow-black/50 overflow-hidden",
            )}
          >
            {PROVIDERS.map((provider, index) => {
              const ProviderIcon = iconMap[provider.icon] || Sparkles;
              const isSelected = currentProvider.id === provider.id;

              return (
                <motion.button
                  key={provider.id}
                  onClick={() => handleSelect(provider.id)}
                  disabled={!provider.available}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2",
                    "hover:bg-white/5 transition-colors text-left",
                    isSelected && "bg-purple-500/10",
                    !provider.available && "opacity-50 cursor-not-allowed",
                  )}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <ProviderIcon
                    className={cn(
                      "w-4 h-4",
                      provider.id === "openai" && "text-green-400",
                      provider.id === "gemini" && "text-blue-400",
                      provider.id === "claude" && "text-orange-400",
                      provider.id === "replicate" && "text-purple-400",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-medium">
                      {provider.name}
                    </div>
                    <div className="text-gray-500 text-[10px]">
                      {provider.description}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export async function getSavedProvider(): Promise<ImageProvider> {
  const saved = await storage.getItem<ImageProvider>(PROVIDER_STORAGE_KEY);
  return saved || DEFAULT_PROVIDER;
}
