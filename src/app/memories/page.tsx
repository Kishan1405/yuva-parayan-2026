"use client";

import { useEffect, useState } from "react";
import { X, ImageOff } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import type { MemoryImage } from "@/app/api/memories/route";

export default function MemoriesPage() {
  const [images, setImages] = useState<MemoryImage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/memories")
      .then((res) => res.json())
      .then((data: { images: MemoryImage[]; error: string | null }) => {
        setImages(data.images);
        setError(data.error);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load memories."));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Past Memories</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Glimpses from previous Yuva Parayan gatherings.
        </p>
      </div>

      {error && (
        <GlassCard className="flex items-start gap-3 text-sm text-foreground-muted">
          <ImageOff className="mt-0.5 shrink-0 text-saffron-deep" size={18} />
          <span>{error}</span>
        </GlassCard>
      )}

      {images === null && !error && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl glass-card" />
          ))}
        </div>
      )}

      {images && images.length === 0 && !error && (
        <p className="py-12 text-center text-sm text-foreground-muted">
          No photos have been added yet.
        </p>
      )}

      {images && images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(i)}
              className="glass-card aspect-square overflow-hidden rounded-2xl p-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.thumbUrl}
                alt={img.name}
                loading="lazy"
                className="h-full w-full object-cover transition hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}

      {images && activeIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setActiveIndex(null)}
        >
          <button
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
            onClick={() => setActiveIndex(null)}
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[activeIndex].fullUrl}
            alt={images[activeIndex].name}
            className="max-h-full max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
