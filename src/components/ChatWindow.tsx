import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ImageIcon, Check, Trash2, Download } from "lucide-react";
import { cn, springConfig } from "@/lib/utils";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { useChatSession, type SelectedImage } from "@/hooks/useChatSession";

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  selectedImage: SelectedImage | null;
  onAccept: (postId: string, enhancedUrl: string) => void;
  onBulkPrompt?: (prompt: string) => void;
}

export function ChatWindow({
  isOpen,
  onClose,
  selectedImage,
  onAccept,
  onBulkPrompt,
}: ChatWindowProps) {
  const {
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
  } = useChatSession();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastPromptRef = useRef<string>("");

  // Set current image when selected
  useEffect(() => {
    if (selectedImage && (!currentImage || currentImage.postId !== selectedImage.postId)) {
      setCurrentImage(selectedImage);
    }
  }, [selectedImage, currentImage, setCurrentImage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (content: string) => {
    lastPromptRef.current = content;
    await sendMessage(content);
  };

  const handleAccept = () => {
    if (enhancedResult && currentImage) {
      onAccept(currentImage.postId, enhancedResult.enhancedUrl);
      acceptResult();

      // Ask about bulk processing
      if (onBulkPrompt && lastPromptRef.current) {
        onBulkPrompt(lastPromptRef.current);
      }
    }
  };

  const handleDiscard = () => {
    discardResult();
  };

  const handleDownload = async () => {
    if (!enhancedResult) return;

    try {
      const response = await fetch(enhancedResult.enhancedUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `enhanced-${currentImage?.postId || "image"}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleClose = () => {
    clearSession();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Chat Window */}
          <motion.div
            className={cn(
              "fixed right-0 top-0 bottom-0 z-[9999]",
              "w-full max-w-md",
              "bg-gray-50 shadow-2xl",
              "flex flex-col"
            )}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={springConfig.snappy}
          >
            {/* Header */}
            <header className="bg-gradient-to-r from-primary-500 to-fuchsia-500 px-4 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">AI Image Enhancer</h2>
                  <p className="text-xs text-white/80">
                    {isProcessing ? processingStage || "Processing..." : "Ready to enhance"}
                  </p>
                </div>
              </div>
              <motion.button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </header>

            {/* Selected Image Preview */}
            {currentImage && (
              <div className="px-4 py-3 bg-white border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <img
                    src={currentImage.url}
                    alt="Selected"
                    className="w-16 h-16 rounded-lg object-cover shadow-md"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Selected Image</p>
                    <p className="text-xs text-gray-500">
                      Tell me how you'd like to enhance this photo
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                    <ImageIcon className="w-8 h-8 text-primary-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Ready to Transform
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Describe the look you want. Our AI will analyze composition, lighting, colors, mood, and details to create the perfect enhancement.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {["Make it cinematic", "More vibrant colors", "Warm and cozy", "Clean minimal look"].map(
                      (suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => handleSend(suggestion)}
                          className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50 hover:border-primary-300 transition-colors"
                        >
                          {suggestion}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-4">
                  {messages.map((message, index) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isLatest={index === messages.length - 1 && message.role === "system"}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Enhanced Result Preview */}
            <AnimatePresence>
              {enhancedResult && (
                <motion.div
                  className="border-t border-gray-200 bg-white p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-800">
                      Enhancement Preview
                    </p>
                    <motion.button
                      onClick={handleDownload}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </motion.button>
                  </div>

                  <BeforeAfterSlider
                    beforeImage={enhancedResult.originalUrl}
                    afterImage={enhancedResult.enhancedUrl}
                    showActions={false}
                    className="rounded-xl overflow-hidden"
                  />

                  <div className="flex gap-2 mt-3">
                    <motion.button
                      onClick={handleAccept}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl font-semibold text-sm",
                        "bg-gradient-to-r from-primary-500 to-fuchsia-500 text-white",
                        "shadow-lg shadow-primary-500/25",
                        "flex items-center justify-center gap-2"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Check className="w-4 h-4" />
                      Accept
                    </motion.button>
                    <motion.button
                      onClick={handleDiscard}
                      className="px-4 py-2.5 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Trash2 className="w-5 h-5" />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <ChatInput
              onSend={handleSend}
              isLoading={isProcessing}
              disabled={!currentImage || !!enhancedResult}
              placeholder={
                !currentImage
                  ? "Select an image first..."
                  : enhancedResult
                  ? "Accept or discard the current result first"
                  : "Make it more vibrant and cinematic..."
              }
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
