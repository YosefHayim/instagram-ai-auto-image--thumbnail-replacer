import { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { LayoutGroup } from "framer-motion";

import { ImageOverlay, type OverlayState } from "@/components/ImageOverlay";
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

  // Mount overlays on posts - now with "button" state by default
  useEffect(() => {
    posts.forEach((post) => {
      if (mountedOverlays.has(post.postId)) return;

      const container = post.element;
      if (!container) return;

      const existingOverlay = container.querySelector("[data-ai-overlay]");
      if (existingOverlay) return;

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
        isolation: isolate;
      `;
      console.log("🎯 [IG-AI] Creating overlay container for post:", post.postId);

      // Inject button styles directly since we're outside the shadow DOM
      const styleEl = document.createElement("style");
      styleEl.textContent = `
        [data-ai-overlay] button {
          position: absolute !important;
          top: 8px !important;
          right: 8px !important;
          z-index: 999999 !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 8px 12px !important;
          background: #9333ea !important;
          backdrop-filter: blur(12px) !important;
          border-radius: 9999px !important;
          color: white !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          border: 2px solid white !important;
          box-shadow: 0 4px 20px rgba(147, 51, 234, 0.5) !important;
          cursor: pointer !important;
          pointer-events: auto !important;
          transition: all 0.2s !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        [data-ai-overlay] button:hover {
          background: #a855f7 !important;
          transform: scale(1.05) !important;
        }
        [data-ai-overlay] button:active {
          transform: scale(0.95) !important;
        }
        [data-ai-overlay] button svg {
          width: 16px !important;
          height: 16px !important;
        }
        [data-ai-overlay] button.processing {
          opacity: 0.5 !important;
          pointer-events: none !important;
        }
      `;
      overlayContainer.appendChild(styleEl);

      const parentStyle = window.getComputedStyle(container);
      if (parentStyle.position === "static") {
        container.style.position = "relative";
      }

      container.appendChild(overlayContainer);

      // Default to "button" state so Generate buttons appear
      const state = postStates.get(post.postId) || {
        state: "button" as OverlayState,
      };

      const root = createRoot(overlayContainer);

      root.render(
        <OverlayWrapper
          post={post}
          state={state}
          onGenerateClick={handleGenerateClick}
        />
      );

      setMountedOverlays((prev) => new Set(prev).add(post.postId));
    });
  }, [posts, postStates]);

  // Handle generate button click
  const handleGenerateClick = useCallback((postId: string, imageUrl: string) => {
    console.log("🎯 [IG-AI] handleGenerateClick called!");
    console.log("🎯 [IG-AI] postId:", postId);
    console.log("🎯 [IG-AI] imageUrl:", imageUrl.slice(0, 50));
    setSelectedImage({ postId, url: imageUrl });
    setIsChatOpen(true);
    console.log("🎯 [IG-AI] Chat should now be open");
  }, []);

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

  if (!isOnProfile) return null;

  return (
    <LayoutGroup>
      {/* Chat Window */}
      <ChatWindow
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setSelectedImage(null);
        }}
        selectedImage={selectedImage}
        onAccept={handleAcceptEnhancement}
        onBulkPrompt={handleBulkPrompt}
      />

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
