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
  deviceToken: string | null;
  loading: boolean;
  signUp: (input: SignUpInput) => Promise<{ error: string | null }>;
  updateProfile: (input: {
    name: string;
    contact_number: string;
    mandal_id: string;
  }) => Promise<{ error: string | null }>;
  refresh: () => Promise<void>;
  forgetDevice: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFromToken = useCallback(async (token: string) => {
    const { data, error } = await supabase.rpc("get_user_by_token", {
      p_device_token: token,
    });
    // A "not found" composite comes back as an object with every field
    // null (not a bare null) — check a required field, not just truthiness.
    if (error || !data || !data.id) {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      setDeviceToken(null);
      return;
    }
    setUser(data);
    setDeviceToken(token);
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
    const { data, error } = await supabase.rpc("signup_user", {
      p_name: input.name.trim(),
      p_contact_number: input.contact_number.trim(),
      p_mandal_id: input.mandal_id,
    });

    if (error || !data) {
      return { error: error?.message ?? "Could not create your account. Please try again." };
    }

    localStorage.setItem(STORAGE_KEY, data.device_token);
    setUser(data);
    setDeviceToken(data.device_token);
    return { error: null };
  }, []);

  const updateProfile = useCallback(
    async (input: { name: string; contact_number: string; mandal_id: string }) => {
      if (!deviceToken) return { error: "Not signed in." };
      const { data, error } = await supabase.rpc("update_own_profile", {
        p_device_token: deviceToken,
        p_name: input.name.trim(),
        p_contact_number: input.contact_number.trim(),
        p_mandal_id: input.mandal_id,
      });

      if (error || !data) {
        return { error: error?.message ?? "Could not update your profile." };
      }
      setUser(data);
      return { error: null };
    },
    [deviceToken]
  );

  const forgetDevice = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setDeviceToken(null);
  }, []);

  return (
    <SessionContext.Provider
      value={{ user, deviceToken, loading, signUp, updateProfile, refresh, forgetDevice }}
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
