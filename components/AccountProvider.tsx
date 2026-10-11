"use client";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type AccountContextValue = {
  enabled: boolean;
  loading: boolean;
  client: SupabaseClient | null;
  user: User | null;
  refreshUser: () => Promise<void>;
};

const AccountContext = createContext<AccountContextValue>({
  enabled: false,
  loading: true,
  client: null,
  user: null,
  refreshUser: async () => {},
});

function validConfig(value: unknown): value is { enabled: true; url: string; publishableKey: string } {
  if (!value || typeof value !== "object") return false;
  const config = value as Record<string, unknown>;
  if (config.enabled !== true || typeof config.url !== "string" || typeof config.publishableKey !== "string" || !config.publishableKey.trim()) return false;
  try { return new URL(config.url).protocol === "https:"; } catch { return false; }
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    fetch("/api/account/config/", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((config: unknown) => {
        if (!active) return;
        if (!validConfig(config)) { setLoading(false); return; }
        const supabase = createClient(config.url, config.publishableKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        });
        setClient(supabase);
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!active) return;
          setUser(session?.user ?? null);
          setLoading(false);
        });
        unsubscribe = () => data.subscription.unsubscribe();
      })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; unsubscribe?.(); };
  }, []);

  async function refreshUser() {
    if (!client) return;
    const { data } = await client.auth.getUser();
    setUser(data.user ?? null);
  }

  return <AccountContext.Provider value={{ enabled: Boolean(client), loading, client, user, refreshUser }}>{children}</AccountContext.Provider>;
}

export function useAccount() { return useContext(AccountContext); }
