import { motion } from "framer-motion";
import { User, Bot, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/hooks/useChatSession";

interface ChatMessageProps {
  message: ChatMessageType;
  isLatest?: boolean;
}

export function ChatMessage({ message, isLatest = false }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <motion.div
      className={cn(
        "flex gap-3 px-4 py-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Avatar */}
      {!isSystem && (
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            isUser
              ? "bg-primary-500 text-white"
              : "bg-gray-100 text-gray-600"
          )}
        >
          {isUser ? (
            <User className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </div>
      )}

      {/* Message content */}
      <div
        className={cn(
          "flex-1 max-w-[80%]",
          isSystem && "text-center max-w-full"
        )}
      >
        <div
          className={cn(
            "inline-block rounded-2xl px-4 py-2.5",
            isUser
              ? "bg-gradient-to-r from-primary-500 to-fuchsia-500 text-white"
              : isSystem
              ? "bg-gray-100 text-gray-600 text-sm"
              : "bg-white border border-gray-200 text-gray-800"
          )}
        >
          {isSystem && isLatest && (
            <Loader2 className="inline-block w-3 h-3 mr-2 animate-spin" />
          )}
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Timestamp */}
        <p
          className={cn(
            "text-[10px] text-gray-400 mt-1",
            isUser ? "text-right" : "text-left",
            isSystem && "text-center"
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </motion.div>
  );
}
