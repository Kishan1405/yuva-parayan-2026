"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { GlassCard, staggerContainer, staggerItem } from "@/components/ui/GlassCard";
import { Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { WallPost } from "@/lib/database.types";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function WallSection() {
  const { user } = useSession();
  const [posts, setPosts] = useState<WallPost[] | null>(null);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  async function loadPosts() {
    const { data } = await supabase
      .from("wall_posts")
      .select("*")
      .order("created_at", { ascending: false });
    setPosts(data ?? []);
  }

  useEffect(() => {
    loadPosts();
  }, []);

  async function handlePost() {
    if (!user || content.trim().length < 3) return;
    setPosting(true);
    const { error } = await supabase.from("wall_posts").insert({
      user_id: user.id,
      author_name: user.name,
      content: content.trim(),
    });
    setPosting(false);
    if (!error) {
      setContent("");
      loadPosts();
    }
  }

  return (
    <div className="space-y-5">
      <GlassCard strong>
        <p className="mb-2 text-sm font-medium">
          Share a memory or value you gained
        </p>
        <Textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What will you carry with you from Yuva Parayan 2026?"
        />
        <Button
          type="button"
          disabled={posting || content.trim().length < 3}
          onClick={handlePost}
          className="mt-3 w-full"
        >
          <Send size={16} />
          {posting ? "Posting…" : "Share to the wall"}
        </Button>
      </GlassCard>

      <div className="space-y-3">
        {posts === null &&
          [0, 1, 2].map((i) => (
            <div key={i} className="glass-card h-24 animate-pulse rounded-3xl" />
          ))}

        {posts?.length === 0 && (
          <p className="py-8 text-center text-sm text-foreground-muted">
            No memories shared yet — be the first!
          </p>
        )}

        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
          <AnimatePresence initial={false}>
            {posts?.map((post) => (
              <motion.div key={post.id} layout variants={staggerItem} exit={{ opacity: 0, scale: 0.96 }}>
                <GlassCard>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-saffron-deep/12 text-xs font-semibold text-saffron-deep">
                      {post.author_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{post.author_name}</p>
                      <p className="text-[11px] text-foreground-muted">{timeAgo(post.created_at)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground">{post.content}</p>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
