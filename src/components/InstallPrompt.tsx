"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share, SquarePlus, Download } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

const DISMISS_KEY = "yuvasabha_install_dismissed_at";
const DISMISS_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const ANDROID_FALLBACK_DELAY_MS = 3500;
const IOS_SHOW_DELAY_MS = 1200;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type Mode = "android-native" | "android-manual" | "ios" | null;

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function recentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const at = Number(raw);
  return !Number.isNaN(at) && Date.now() - at < DISMISS_COOLDOWN_MS;
}

export function InstallPrompt() {
  const [mode, setMode] = useState<Mode>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandaloneDisplay() || recentlyDismissed()) return;

    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    if (!isIOS && !isAndroid) return;

    if (isIOS) {
      const t = setTimeout(() => setMode("ios"), IOS_SHOW_DELAY_MS);
      return () => clearTimeout(t);
    }

    // Android: wait for the real install event. If the browser never fires
    // it (e.g. non-Chrome Android browsers don't support it), fall back to
    // manual instructions instead of a dead button.
    let fired = false;
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      fired = true;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode("android-native");
    }
    function onInstalled() {
      setMode(null);
      localStorage.removeItem(DISMISS_KEY);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const fallback = setTimeout(() => {
      if (!fired) setMode("android-manual");
    }, ANDROID_FALLBACK_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(fallback);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setMode(null);
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome !== "accepted") {
      dismiss();
    } else {
      setMode(null);
    }
  }

  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
          className="fixed inset-x-3 z-[60] mx-auto max-w-md bottom-[calc(0.75rem+env(safe-area-inset-bottom))]"
        >
          <GlassCard strong className="relative">
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-foreground-muted"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <Image
                src="/icon-192.png"
                alt=""
                width={44}
                height={44}
                className="shrink-0 rounded-xl"
              />
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold">Install Yuva Sabha</p>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  {mode === "ios"
                    ? "Add it to your Home Screen for quick, full-screen access."
                    : "Install the app for quick access, right from your home screen."}
                </p>
              </div>
            </div>

            {mode === "android-native" && (
              <Button type="button" onClick={handleInstallClick} className="mt-4 w-full">
                <Download size={16} />
                Install app
              </Button>
            )}

            {mode === "android-manual" && (
              <p className="mt-4 rounded-2xl bg-background-elevated/70 px-3 py-2.5 text-xs text-foreground-muted">
                Tap your browser&apos;s menu (⋮) and choose <strong>&quot;Install app&quot;</strong>{" "}
                or <strong>&quot;Add to Home screen&quot;</strong>.
              </p>
            )}

            {mode === "ios" && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-background-elevated/70 px-3 py-2.5 text-xs text-foreground-muted">
                <span className="flex items-center gap-1 whitespace-nowrap">
                  Tap <Share size={14} className="text-saffron-deep" />
                </span>
                <span>then</span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <SquarePlus size={14} className="text-saffron-deep" /> &quot;Add to Home Screen&quot;
                </span>
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
