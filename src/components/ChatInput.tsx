import { useState, useCallback, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = "Describe how you want to enhance this image...",
  disabled = false,
}: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed && !isLoading && !disabled) {
      onSend(trimmed);
      setInput("");
    }
  }, [input, onSend, isLoading, disabled]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading || disabled}
            rows={1}
            className={cn(
              "w-full resize-none rounded-xl border border-gray-200",
              "px-4 py-3 pr-12 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
              "placeholder:text-gray-400",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "max-h-32 overflow-y-auto"
            )}
            style={{ minHeight: "48px" }}
          />
        </div>

        <motion.button
          onClick={handleSend}
          disabled={!input.trim() || isLoading || disabled}
          className={cn(
            "flex items-center justify-center",
            "w-10 h-10 rounded-full",
            "bg-gradient-to-r from-primary-500 to-fuchsia-500",
            "text-white shadow-lg shadow-primary-500/25",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all"
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </motion.button>
      </div>

      <p className="text-[10px] text-gray-400 text-center mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
