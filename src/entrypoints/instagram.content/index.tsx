import { useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { LayoutGroup } from "framer-motion";

import { type OverlayState } from "@/components/ImageOverlay";
import { ChatWindow } from "@/components/ChatWindow";
import { BulkConfirmDialog } from "@/components/BulkConfirmDialog";
import { BulkProgressBar, type BulkResult } from "@/components/BulkProgressBar";
import {
  ConfettiCelebration,
  fireSuccessConfetti,
} from "@/components/ConfettiCelebration";
import {
  getInstagramFeedManager,
  type GridPost,
} from "@/lib/instagram-feed-manager";
import { useBulkEnhance } from "@/hooks/useBulkEnhance";
import cssText from "@/style.css?inline";

export default defineContentScript({
  matches: ["https://www.instagram.com/*", "https://instagram.com/*"],
  cssInjectionMode: "ui",

  async main(ctx) {
    // Log immediately when content script starts
    console.log("🚀 [IG-AI] Content script MAIN executing...");
    console.log("🚀 [IG-AI] Current URL:", window.location.href);
    console.log("🚀 [IG-AI] Pathname:", window.location.pathname);
    console.log("🚀 [IG-AI] Timestamp:", new Date().toISOString());

    // Add document-level event capture to intercept clicks on our overlay buttons
    // This runs before any Instagram handlers
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const overlay = target.closest('[data-ai-overlay]');
      if (overlay && target.tagName === 'BUTTON') {
        console.log("🚀 [IG-AI] Document captured button click in overlay!");
        // Don't prevent here - let the button's own handler fire
      }
    }, true);

    // Prevent Instagram from handling clicks on our buttons by intercepting link clicks
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      // Check if click is on or inside our button
      if (target.closest('[data-ai-overlay] button')) {
        console.log("🚀 [IG-AI] Preventing link navigation for overlay button click");
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    const ui = await createShadowRootUi(ctx, {
      name: "instagram-ai-optimizer",
      position: "inline",
      anchor: "body",
      append: "first",
      onMount: (container) => {
        console.log("🚀 [IG-AI] Shadow root MOUNTED");

        const wrapper = document.createElement("div");
        wrapper.id = "instagram-ai-optimizer-root";
        container.appendChild(wrapper);

        const styleEl = document.createElement("style");
        styleEl.textContent = cssText;
        container.appendChild(styleEl);

        const root = createRoot(wrapper);
        root.render(<InstagramAIOptimizer />);
        console.log("🚀 [IG-AI] React component RENDERED");
        return { root, wrapper };
      },
      onRemove: (elements) => {
        elements?.root.unmount();
      },
    });

    ui.mount();
    console.log("🚀 [IG-AI] UI MOUNTED");
  },
});

interface PostState {
  state: OverlayState;
  aiImage?: string;
  isProcessing?: boolean;
}

interface SelectedImage {
  postId: string;
  url: string;
}

function InstagramAIOptimizer() {
  console.log("🎯 [IG-AI] InstagramAIOptimizer component INITIALIZING");

  const [isOnProfile, setIsOnProfile] = useState(false);
  const [posts, setPosts] = useState<GridPost[]>([]);
  const [postStates, setPostStates] = useState<Map<string, PostState>>(
    new Map()
  );
  const [mountedOverlays, setMountedOverlays] = useState<Set<string>>(
    new Set()
  );
  const [showConfetti, setShowConfetti] = useState(false);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");

  // Debug: log chat state changes
  useEffect(() => {
    console.log("💬 [IG-AI] Chat state changed - isChatOpen:", isChatOpen, "selectedImage:", selectedImage?.postId);
  }, [isChatOpen, selectedImage]);

  // Render ChatWindow outside shadow DOM for proper fixed positioning
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const chatRootRef = useRef<ReturnType<typeof createRoot> | null>(null);

  useEffect(() => {
    // Create container for ChatWindow outside shadow DOM
    if (!chatContainerRef.current) {
      const container = document.createElement("div");
      container.id = "ig-ai-chat-container";
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        z-index: 2147483647;
        pointer-events: none;
      `;
      document.body.appendChild(container);
      chatContainerRef.current = container;

      // Inject styles for the chat window
      const style = document.createElement("style");
      style.textContent = cssText;
      container.appendChild(style);

      chatRootRef.current = createRoot(container);
      console.log("💬 [IG-AI] Chat container created outside shadow DOM");
    }

    return () => {
      if (chatContainerRef.current) {
        chatRootRef.current?.unmount();
        chatContainerRef.current.remove();
        chatContainerRef.current = null;
        chatRootRef.current = null;
      }
    };
  }, []);

  // Refs for ChatWindow callbacks (to avoid stale closures)
  const handleAcceptEnhancementRef = useRef<(postId: string, enhancedUrl: string) => void>();
  const handleBulkPromptRef = useRef<(prompt: string) => void>();

  // Bulk state
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const {
    isActive: isBulkActive,
    results: bulkResults,
    startBulk,
    acceptAll: acceptAllBulk,
    rejectImage: rejectBulkImage,
    cancelBulk,
  } = useBulkEnhance();

  // Check if on profile page
  useEffect(() => {
    console.log("🎯 [IG-AI] Profile check effect running...");
    console.log("🎯 [IG-AI] Current pathname:", window.location.pathname);

    const manager = getInstagramFeedManager();

    const checkProfile = () => {
      const onProfile = manager.isOnProfilePage();
      console.log("🎯 [IG-AI] isOnProfilePage:", onProfile);
      setIsOnProfile(onProfile);
    };

    checkProfile();

    const handleNavigation = () => {
      console.log("🎯 [IG-AI] Navigation detected, rechecking...");
      setTimeout(checkProfile, 500);
    };

    window.addEventListener("popstate", handleNavigation);

    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      handleNavigation();
    };

    return () => {
      window.removeEventListener("popstate", handleNavigation);
      history.pushState = originalPushState;
    };
  }, []);

  // Start feed manager on profile
  useEffect(() => {
    if (!isOnProfile) {
      console.log("[IG-AI] Not on profile page, skipping feed manager");
      return;
    }

    console.log("[IG-AI] On profile page, starting feed manager");
    const manager = getInstagramFeedManager();
    manager.start();

    const unsubscribe = manager.subscribe((newPosts) => {
      console.log("[IG-AI] Feed manager found posts:", newPosts.length);
      newPosts.forEach(p => console.log(`  - Post ${p.postId}:`, p.imageUrl.slice(0, 50)));

      setPosts((prev) => {
        const existing = new Set(prev.map((p) => p.postId));
        const filtered = newPosts.filter((p) => !existing.has(p.postId));
        if (filtered.length > 0) {
          console.log("[IG-AI] Adding", filtered.length, "new posts to state");
        }
        return [...prev, ...filtered];
      });
    });

    return () => {
      unsubscribe();
      manager.stop();
    };
  }, [isOnProfile]);

  // Store handleGenerateClick in a ref so it's always current
  const handleGenerateClickRef = useRef<(postId: string, imageUrl: string) => void>();

  // Update ref when callback changes
  useEffect(() => {
    handleGenerateClickRef.current = (postId: string, imageUrl: string) => {
      console.log("🎯 [IG-AI] ========================================");
      console.log("🎯 [IG-AI] handleGenerateClick CALLED via ref!");
      console.log("🎯 [IG-AI] postId:", postId);
      console.log("🎯 [IG-AI] imageUrl:", imageUrl.slice(0, 50));
      setSelectedImage({ postId, url: imageUrl });
      setIsChatOpen(true);
      console.log("🎯 [IG-AI] State updated - chat should now be open");
      console.log("🎯 [IG-AI] ========================================");
    };
  }, []);

  // Mount overlays on posts - using pure DOM buttons for reliability
  useEffect(() => {
    console.log("🎯 [IG-AI] Mount overlays effect running, posts:", posts.length);

    posts.forEach((post) => {
      if (mountedOverlays.has(post.postId)) return;

      const container = post.element;
      if (!container) {
        console.log("🎯 [IG-AI] No container for post:", post.postId);
        return;
      }

      const existingOverlay = container.querySelector("[data-ai-overlay]");
      if (existingOverlay) {
        console.log("🎯 [IG-AI] Overlay already exists for post:", post.postId);
        return;
      }

      console.log("🎯 [IG-AI] Creating overlay for post:", post.postId);

      // Create overlay container
      const overlayContainer = document.createElement("div");
      overlayContainer.setAttribute("data-ai-overlay", post.postId);
      overlayContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 999999;
        pointer-events: none;
        overflow: visible;
      `;

      // Ensure parent has relative positioning and visible overflow
      container.style.position = "relative";
      container.style.overflow = "visible";

      // Create the button directly in DOM (bypassing React for reliability)
      const button = document.createElement("button");
      button.setAttribute("data-ai-generate-btn", post.postId);
      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/>
          <path d="m14 7 3 3"/>
          <path d="M5 6v4"/>
          <path d="M19 14v4"/>
          <path d="M10 2v2"/>
          <path d="M7 8H3"/>
          <path d="M21 16h-4"/>
          <path d="M11 3H9"/>
        </svg>
        <span>AI</span>
      `;
      button.style.cssText = `
        position: absolute;
        top: 8px;
        left: -12px;
        z-index: 999999;
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px 6px 8px;
        background: linear-gradient(135deg, #9333ea 0%, #c026d3 100%);
        border-radius: 0 20px 20px 0;
        color: white;
        font-size: 12px;
        font-weight: 700;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        border: none;
        box-shadow: 0 4px 12px rgba(147, 51, 234, 0.4);
        cursor: pointer;
        transition: all 0.2s ease;
      `;

      // Add click handler
      const clickHandler = (e: Event) => {
        console.log("🔘 [Button] CLICKED! postId:", post.postId);

        // Visual feedback - change button color to confirm click worked
        button.style.background = "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)";
        button.querySelector("span")!.textContent = "Opening...";

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (handleGenerateClickRef.current) {
          console.log("🔘 [Button] Calling handleGenerateClickRef...");
          handleGenerateClickRef.current(post.postId, post.imageUrl);
          console.log("🔘 [Button] handleGenerateClickRef called!");
        } else {
          console.error("🔘 [Button] handleGenerateClickRef is NOT set!");
          alert("Error: Click handler not initialized. Please refresh the page.");
        }
        return false;
      };

      button.addEventListener("click", clickHandler, true);
      button.onclick = clickHandler; // Also set onclick as backup

      // Add hover effects
      button.addEventListener("mouseenter", () => {
        button.style.transform = "translateX(4px)";
        button.style.boxShadow = "0 6px 16px rgba(147, 51, 234, 0.5)";
      });
      button.addEventListener("mouseleave", () => {
        button.style.transform = "translateX(0)";
        button.style.boxShadow = "0 4px 12px rgba(147, 51, 234, 0.4)";
      });

      overlayContainer.appendChild(button);
      container.appendChild(overlayContainer);

      console.log("🎯 [IG-AI] Button created and appended for post:", post.postId);

      setMountedOverlays((prev) => new Set(prev).add(post.postId));
    });
  }, [posts]);


  // Handle enhancement accept
  const handleAcceptEnhancement = useCallback(
    (postId: string, enhancedUrl: string) => {
      // Apply enhancement to DOM
      const post = posts.find((p) => p.postId === postId);
      if (post?.element) {
        const img = post.element.querySelector("img") as HTMLImageElement;
        if (img) {
          img.src = enhancedUrl;
          img.srcset = "";
        }
      }

      // Update state
      setPostStates((prev) => {
        const next = new Map(prev);
        next.set(postId, { state: "button" });
        return next;
      });

      fireSuccessConfetti();
    },
    [posts]
  );

  // Handle bulk prompt (called after accepting an enhancement)
  const handleBulkPrompt = useCallback(
    (prompt: string) => {
      setLastPrompt(prompt);

      // Get remaining images (excluding the one just processed)
      const remainingPosts = posts.filter((p) => {
        const state = postStates.get(p.postId);
        return (
          p.postId !== selectedImage?.postId &&
          (!state || state.state === "button")
        );
      });

      if (remainingPosts.length > 0) {
        setShowBulkDialog(true);
      }
    },
    [posts, postStates, selectedImage]
  );

  // Get remaining images for bulk dialog
  const getRemainingImages = useCallback(() => {
    return posts
      .filter((p) => {
        const state = postStates.get(p.postId);
        return (
          p.postId !== selectedImage?.postId &&
          (!state || state.state === "button")
        );
      })
      .map((p) => ({ postId: p.postId, imageUrl: p.imageUrl }));
  }, [posts, postStates, selectedImage]);

  // Handle bulk confirm
  const handleBulkConfirm = useCallback(() => {
    setShowBulkDialog(false);
    setIsChatOpen(false);

    const remainingImages = getRemainingImages();

    startBulk({
      prompt: lastPrompt,
      images: remainingImages,
      onProgress: (completed, total) => {
        console.log(`Bulk progress: ${completed}/${total}`);
      },
      onComplete: (results) => {
        // Apply successful enhancements to DOM
        results.forEach((result) => {
          if (result.status === "success" && result.enhancedUrl) {
            const post = posts.find((p) => p.postId === result.postId);
            if (post?.element) {
              const img = post.element.querySelector("img") as HTMLImageElement;
              if (img) {
                img.src = result.enhancedUrl;
                img.srcset = "";
              }
            }
          }
        });
      },
    });
  }, [getRemainingImages, lastPrompt, startBulk, posts]);

  // Handle bulk cancel
  const handleBulkCancel = useCallback(() => {
    setShowBulkDialog(false);
  }, []);

  // Handle accept all bulk results
  const handleAcceptAllBulk = useCallback(() => {
    // Apply all successful results to DOM
    bulkResults.forEach((result) => {
      if (result.status === "success" && result.enhancedUrl) {
        const post = posts.find((p) => p.postId === result.postId);
        if (post?.element) {
          const img = post.element.querySelector("img") as HTMLImageElement;
          if (img) {
            img.src = result.enhancedUrl;
            img.srcset = "";
          }
        }
      }
    });

    acceptAllBulk();
    fireSuccessConfetti();
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  }, [bulkResults, posts, acceptAllBulk]);

  // Handle close bulk progress
  const handleCloseBulk = useCallback(() => {
    cancelBulk();
  }, [cancelBulk]);

  // Update refs for ChatWindow callbacks
  useEffect(() => {
    handleAcceptEnhancementRef.current = handleAcceptEnhancement;
    handleBulkPromptRef.current = handleBulkPrompt;
  }, [handleAcceptEnhancement, handleBulkPrompt]);

  // Render ChatWindow when state changes
  useEffect(() => {
    if (chatRootRef.current) {
      console.log("💬 [IG-AI] Rendering ChatWindow outside shadow DOM, isOpen:", isChatOpen);
      chatRootRef.current.render(
        <ChatWindow
          isOpen={isChatOpen}
          onClose={() => {
            console.log("💬 [IG-AI] ChatWindow onClose called");
            setIsChatOpen(false);
            setSelectedImage(null);
          }}
          selectedImage={selectedImage}
          onAccept={(postId, enhancedUrl) => {
            handleAcceptEnhancementRef.current?.(postId, enhancedUrl);
          }}
          onBulkPrompt={(prompt) => {
            handleBulkPromptRef.current?.(prompt);
          }}
        />
      );
    }
  }, [isChatOpen, selectedImage]);

  if (!isOnProfile) return null;

  return (
    <LayoutGroup>
      {/* ChatWindow is rendered outside shadow DOM via useEffect */}

      {/* Bulk Confirm Dialog */}
      <BulkConfirmDialog
        isOpen={showBulkDialog}
        remainingImages={getRemainingImages()}
        lastPrompt={lastPrompt}
        onConfirm={handleBulkConfirm}
        onCancel={handleBulkCancel}
      />

      {/* Bulk Progress Bar */}
      <BulkProgressBar
        isActive={isBulkActive}
        results={bulkResults}
        onAcceptAll={handleAcceptAllBulk}
        onRejectImage={rejectBulkImage}
        onClose={handleCloseBulk}
      />

      {/* Confetti Celebration */}
      <ConfettiCelebration trigger={showConfetti} />
    </LayoutGroup>
  );
}

interface OverlayWrapperProps {
  post: GridPost;
  state: PostState;
  onGenerateClick: (postId: string, imageUrl: string) => void;
}

function OverlayWrapper({ post, state, onGenerateClick }: OverlayWrapperProps) {
  return (
    <ImageOverlay
      originalImage={post.imageUrl}
      aiImage={state.aiImage}
      state={state.state}
      postId={post.postId}
      onGenerateClick={onGenerateClick}
      isProcessing={state.isProcessing}
    />
  );
}
