"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { login as apiLogin, me as apiMe, signup as apiSignup, updateProfile as apiUpdateProfile } from "./api/auth";
import type { User } from "./api/types";

const STORAGE_KEY = "yuvasabha_auth_token";

interface SignUpInput {
  name: string;
  contact_number: string;
  mandal_id: string;
}

interface LoginInput {
  name: string;
  contact_number: string;
  pin: string;
}

interface SessionContextValue {
  user: User | null;
  /** Bearer token for the Laravel API (name kept for the not-yet-migrated pages that already destructure it). */
  deviceToken: string | null;
  loading: boolean;
  signUp: (input: SignUpInput) => Promise<{ error: string | null }>;
  login: (input: LoginInput) => Promise<{ error: string | null }>;
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
  const [user, setUser] = useState<User | null>(null);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFromToken = useCallback(async (token: string) => {
    const { data, error } = await apiMe(token);
    if (error || !data) {
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
    const { data, error } = await apiSignup({
      name: input.name.trim(),
      contact_number: input.contact_number.trim(),
      mandal_id: input.mandal_id,
    });

    if (error || !data) {
      return { error: error ?? "Could not create your account. Please try again." };
    }

    localStorage.setItem(STORAGE_KEY, data.token);
    setUser(data.user);
    setDeviceToken(data.token);
    return { error: null };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const { data, error } = await apiLogin({
      name: input.name.trim(),
      contact_number: input.contact_number.trim(),
      pin: input.pin.trim(),
    });

    if (error || !data) {
      return { error: error ?? "Name, contact number, or PIN is incorrect." };
    }

    localStorage.setItem(STORAGE_KEY, data.token);
    setUser(data.user);
    setDeviceToken(data.token);
    return { error: null };
  }, []);

  const updateProfile = useCallback(
    async (input: { name: string; contact_number: string; mandal_id: string }) => {
      if (!deviceToken) return { error: "Not signed in." };
      const { data, error } = await apiUpdateProfile(deviceToken, {
        name: input.name.trim(),
        contact_number: input.contact_number.trim(),
        mandal_id: input.mandal_id,
      });

      if (error || !data) {
        return { error: error ?? "Could not update your profile." };
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
      value={{ user, deviceToken, loading, signUp, login, updateProfile, refresh, forgetDevice }}
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
