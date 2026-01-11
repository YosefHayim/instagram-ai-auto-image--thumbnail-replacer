import { useState, useCallback } from "react";
import { apiClient, type StreamingUpdate } from "@/lib/api-client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    imageUrl?: string;
    stage?: string;
    enhancedUrl?: string;
    superPrompt?: string;
  };
}

export interface SelectedImage {
  postId: string;
  url: string;
}

interface UseChatSessionReturn {
  messages: ChatMessage[];
  isProcessing: boolean;
  processingStage: string;
  currentImage: SelectedImage | null;
  enhancedResult: {
    originalUrl: string;
    enhancedUrl: string;
    superPrompt: string;
  } | null;
  sendMessage: (content: string) => Promise<void>;
  setCurrentImage: (image: SelectedImage | null) => void;
  clearSession: () => void;
  acceptResult: () => void;
  discardResult: () => void;
}

export function useChatSession(): UseChatSessionReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [currentImage, setCurrentImage] = useState<SelectedImage | null>(null);
  const [enhancedResult, setEnhancedResult] = useState<{
    originalUrl: string;
    enhancedUrl: string;
    superPrompt: string;
  } | null>(null);

  const addMessage = useCallback(
    (role: ChatMessage["role"], content: string, metadata?: ChatMessage["metadata"]) => {
      const message: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        role,
        content,
        timestamp: new Date(),
        metadata,
      };
      setMessages((prev) => [...prev, message]);
      return message;
    },
    []
  );

  const updateLastMessage = useCallback((content: string) => {
    setMessages((prev) => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content,
        };
      }
      return updated;
    });
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!currentImage || isProcessing) return;

      // Add user message
      addMessage("user", content);
      setIsProcessing(true);

      try {
        // Add initial system message
        addMessage("system", "Starting enhancement...");

        // Use streaming endpoint for real-time updates
        const stream = apiClient.enhanceWithStream(currentImage.url, content);

        for await (const update of stream) {
          setProcessingStage(update.stage);

          if (update.message) {
            updateLastMessage(update.message);
          }

          if (update.stage === "complete" && update.status === "success") {
            // Enhancement complete
            setEnhancedResult({
              originalUrl: currentImage.url,
              enhancedUrl: update.enhanced_url || "",
              superPrompt: update.super_prompt || "",
            });

            // Add success message
            addMessage(
              "assistant",
              `Enhancement complete! I've applied the following improvements:\n\n${update.super_prompt?.slice(0, 200)}...`,
              {
                enhancedUrl: update.enhanced_url,
                superPrompt: update.super_prompt,
              }
            );
          } else if (update.stage === "error") {
            addMessage("assistant", `Sorry, something went wrong: ${update.message}`);
          }
        }
      } catch (error) {
        console.error("Enhancement error:", error);
        addMessage(
          "assistant",
          `Sorry, I couldn't process that image. ${error instanceof Error ? error.message : "Please try again."}`
        );
      } finally {
        setIsProcessing(false);
        setProcessingStage("");
      }
    },
    [currentImage, isProcessing, addMessage, updateLastMessage]
  );

  const clearSession = useCallback(() => {
    setMessages([]);
    setCurrentImage(null);
    setEnhancedResult(null);
    setIsProcessing(false);
    setProcessingStage("");
  }, []);

  const acceptResult = useCallback(() => {
    if (enhancedResult) {
      addMessage("system", "Enhancement applied successfully!");
    }
    setEnhancedResult(null);
  }, [enhancedResult, addMessage]);

  const discardResult = useCallback(() => {
    addMessage("system", "Enhancement discarded. Feel free to try a different prompt!");
    setEnhancedResult(null);
  }, [addMessage]);

  return {
    messages,
    isProcessing,
    processingStage,
    currentImage,
    enhancedResult,
    sendMessage,
    setCurrentImage,
    clearSession,
    acceptResult,
    discardResult,
  };
}
