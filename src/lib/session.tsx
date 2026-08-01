"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";
import type { AppUser } from "./database.types";

const STORAGE_KEY = "yp2026_device_token";

interface SignUpInput {
  name: string;
  contact_number: string;
  mandal_id: string;
}

interface SessionContextValue {
  user: AppUser | null;
  loading: boolean;
  signUp: (input: SignUpInput) => Promise<{ error: string | null }>;
  updateProfile: (
    input: Partial<Pick<AppUser, "name" | "contact_number" | "mandal_id">>
  ) => Promise<{ error: string | null }>;
  refresh: () => Promise<void>;
  forgetDevice: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFromToken = useCallback(async (token: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("device_token", token)
      .maybeSingle();
    if (error || !data) {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      return;
    }
    setUser(data as AppUser);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    loadFromToken(token).finally(() => setLoading(false));
  }, [loadFromToken]);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) return;
    await loadFromToken(token);
  }, [loadFromToken]);

  const signUp = useCallback(async (input: SignUpInput) => {
    const { data, error } = await supabase
      .from("users")
      .insert({
        name: input.name.trim(),
        contact_number: input.contact_number.trim(),
        mandal_id: input.mandal_id,
      })
      .select("*")
      .single();

    if (error || !data) {
      return { error: error?.message ?? "Could not create your account. Please try again." };
    }

    localStorage.setItem(STORAGE_KEY, data.device_token);
    setUser(data as AppUser);
    return { error: null };
  }, []);

  const updateProfile = useCallback(
    async (input: Partial<Pick<AppUser, "name" | "contact_number" | "mandal_id">>) => {
      if (!user) return { error: "Not signed in." };
      const { data, error } = await supabase
        .from("users")
        .update(input)
        .eq("id", user.id)
        .select("*")
        .single();

      if (error || !data) {
        return { error: error?.message ?? "Could not update your profile." };
      }
      setUser(data as AppUser);
      return { error: null };
    },
    [user]
  );

  const forgetDevice = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <SessionContext.Provider
      value={{ user, loading, signUp, updateProfile, refresh, forgetDevice }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
