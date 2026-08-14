"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Loader2 } from "lucide-react";

const fieldBase =
  "w-full rounded-2xl border border-foreground/10 bg-background-elevated/80 px-4 py-3 text-[15px] text-foreground placeholder:text-foreground-muted/70 outline-none transition focus:border-saffron-deep/50 focus:ring-2 focus:ring-saffron-deep/20";

const SEARCH_DEBOUNCE_MS = 250;

interface SearchSelectProps<T> {
  value: T | null;
  onChange: (value: T) => void;
  /** Called with the current query (empty string on first open) — return the first page of matches. */
  onSearch: (query: string) => Promise<T[]>;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  placeholder?: string;
  disabled?: boolean;
  /** Adds a top row that resets the selection to null — for filter use (e.g. "All Mandals"). */
  clearable?: boolean;
  clearLabel?: string;
  onClear?: () => void;
}

/**
 * Async searchable combobox — stands in for a plain `<select>` once the
 * option list is too large to render in full (e.g. Mandals at scale).
 */
export function SearchSelect<T>({
  value,
  onChange,
  onSearch,
  getId,
  getLabel,
  placeholder = "Search…",
  disabled,
  clearable,
  clearLabel = "All",
  onClear,
}: SearchSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      const data = await onSearch(query);
      if (!cancelled) {
        setResults(data);
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  function handleOpen() {
    if (disabled) return;
    setQuery("");
    setResults(null);
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleSelect(item: T) {
    onChange(item);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        disabled={disabled}
        className={`${fieldBase} flex items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className={value ? "" : "text-foreground-muted/70"}>
          {value ? getLabel(value) : placeholder}
        </span>
        <ChevronDown size={16} className="shrink-0 text-foreground-muted" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="glass-card-strong absolute z-50 mt-2 w-full rounded-2xl p-2"
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="mb-2 w-full rounded-xl border border-foreground/10 bg-background-elevated/90 px-3 py-2 text-sm text-foreground outline-none focus:border-saffron-deep/50"
            />

            <div className="max-h-56 overflow-y-auto">
              {clearable && (
                <button
                  type="button"
                  onClick={() => {
                    onClear?.();
                    setOpen(false);
                    setQuery("");
                  }}
                  className="mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-saffron-deep/10"
                >
                  <span>{clearLabel}</span>
                  {!value && <Check size={15} className="shrink-0 text-saffron-deep" />}
                </button>
              )}

              {loading && (
                <p className="flex items-center justify-center gap-2 py-4 text-xs text-foreground-muted">
                  <Loader2 size={14} className="animate-spin" />
                  Searching…
                </p>
              )}

              {!loading && results && results.length === 0 && (
                <p className="py-4 text-center text-xs text-foreground-muted">No matches.</p>
              )}

              {!loading &&
                results?.map((item) => {
                  const selected = value ? getId(value) === getId(item) : false;
                  return (
                    <button
                      key={getId(item)}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-foreground hover:bg-saffron-deep/10"
                    >
                      <span>{getLabel(item)}</span>
                      {selected && <Check size={15} className="shrink-0 text-saffron-deep" />}
                    </button>
                  );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
