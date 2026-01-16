import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Check,
  LogOut,
  Coins,
  CreditCard,
  Clock,
  Image,
  ExternalLink,
} from "lucide-react";
import { cn, springConfig } from "@/lib/utils";
import { auth, type AuthUser } from "@/lib/auth";
import { lemonSqueezy, PRICING } from "@/lib/lemon-squeezy";
import { analytics } from "@/lib/analytics";

type ViewState = "loading" | "auth" | "dashboard";

interface UserCredits {
  credits: number;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  totalImagesEnhanced: number;
}

function App() {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analytics.init();

    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      setUser(authUser);

      if (authUser) {
        setViewState("dashboard");
        await fetchUserCredits(authUser.id);
      } else {
        setViewState("auth");
      }
    });

    return unsubscribe;
  }, []);

  const fetchUserCredits = async (userId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_CONVEX_URL}/api/query?path=users:getUserCredits`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ args: { userId } }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        setCredits(data);
      }
    } catch (err) {
      console.error("Failed to fetch credits:", err);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const authUser = await auth.signInWithGoogle();
      analytics.track("user_signed_in", { method: "google" });
      setUser(authUser);
      setViewState("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      analytics.captureException(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await auth.signOut();
    analytics.track("user_signed_out");
    setUser(null);
    setCredits(null);
    setViewState("auth");
  };

  const handleBuyCredits = async () => {
    setIsLoading(true);

    try {
      const { checkoutUrl } = await lemonSqueezy.createCheckout({
        credits: PRICING.CREDITS_PER_DOLLAR,
      });
      lemonSqueezy.openCheckout(checkoutUrl);
      analytics.track("checkout_initiated", {
        credits: PRICING.CREDITS_PER_DOLLAR,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create checkout",
      );
      analytics.captureException(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openInstagram = () => {
    chrome.tabs.create({ url: "https://www.instagram.com" });
    analytics.track("instagram_opened");
  };

  return (
    <div className="w-[360px] min-h-[480px] bg-white overflow-hidden">
      <motion.div
        className="gradient-primary p-6 pb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="flex items-center justify-center mb-4"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={springConfig.bouncy}
        >
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </motion.div>

        <motion.h1
          className="text-2xl font-bold text-white text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Instagram AI Optimizer
        </motion.h1>

        <motion.p
          className="text-white/80 text-center mt-2 text-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Transform your feed with AI-enhanced thumbnails
        </motion.p>
      </motion.div>

      <div className="p-6 -mt-4">
        <motion.div
          className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <AnimatePresence mode="wait">
            {viewState === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-8 flex flex-col items-center"
              >
                <motion.div
                  className="w-12 h-12 rounded-full border-4 border-primary-200"
                  style={{ borderTopColor: "#a855f7" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <p className="mt-4 text-gray-600">Loading...</p>
              </motion.div>
            )}

            {viewState === "auth" && (
              <motion.div
                key="auth-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <motion.button
                  className={cn(
                    "w-full p-4 rounded-xl",
                    "bg-white border-2 border-gray-200",
                    "flex items-center justify-center gap-3",
                    "font-medium text-gray-700",
                    "hover:border-gray-300 hover:shadow-md",
                    "transition-all duration-200",
                    isLoading && "opacity-50 cursor-not-allowed",
                  )}
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  whileHover={!isLoading ? { scale: 1.02 } : {}}
                  whileTap={!isLoading ? { scale: 0.98 } : {}}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  Continue with Google
                </motion.button>

                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    Start your{" "}
                    <span className="font-semibold text-purple-600">
                      {PRICING.FREE_TRIAL_DAYS}-day free trial
                    </span>{" "}
                    with {PRICING.FREE_TRIAL_CREDITS} credits
                  </p>
                </div>
              </motion.div>
            )}

            {viewState === "dashboard" && user && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name || "User"}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-600 font-semibold">
                          {user.name?.[0] || user.email[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {user.name || "User"}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-medium text-purple-600">
                        Credits
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {credits?.credits ?? 0}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Image className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600">
                        Enhanced
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {credits?.totalImagesEnhanced ?? 0}
                    </p>
                  </div>
                </div>

                {credits?.isTrialActive && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <p className="text-sm text-amber-700">
                      <span className="font-semibold">
                        {credits.trialDaysRemaining} days
                      </span>{" "}
                      left in your free trial
                    </p>
                  </div>
                )}

                {(credits?.credits ?? 0) < 5 && (
                  <motion.button
                    onClick={handleBuyCredits}
                    disabled={isLoading}
                    className={cn(
                      "w-full p-4 rounded-xl",
                      "bg-gradient-to-r from-purple-600 to-pink-600",
                      "text-white font-semibold",
                      "shadow-lg shadow-purple-500/25",
                      "flex items-center justify-center gap-2",
                      "hover:shadow-purple-500/40 transition-shadow",
                      isLoading && "opacity-50 cursor-not-allowed",
                    )}
                    whileHover={!isLoading ? { scale: 1.02 } : {}}
                    whileTap={!isLoading ? { scale: 0.98 } : {}}
                  >
                    <CreditCard className="w-4 h-4" />
                    Buy {PRICING.CREDITS_PER_DOLLAR} Credits - $1
                  </motion.button>
                )}

                <motion.button
                  onClick={openInstagram}
                  className={cn(
                    "w-full p-4 rounded-xl",
                    "bg-gradient-to-r from-purple-600 to-pink-600",
                    "text-white font-semibold",
                    "shadow-lg shadow-purple-500/25",
                    "flex items-center justify-center gap-2",
                    "hover:shadow-purple-500/40 transition-shadow",
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Open Instagram
                  <ExternalLink className="w-4 h-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          className="mt-6 space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[
            "AI-enhanced thumbnails",
            "8 preset styles to choose from",
            "Before/After comparison slider",
          ].map((feature, index) => (
            <motion.div
              key={feature}
              className="flex items-center gap-3 text-sm text-gray-600"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-white" />
              </div>
              {feature}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export default App;
