import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppError, toAppError } from "./errors";
import { invoke } from "./api";
import { purchasesLogIn, purchasesLogOut } from "./purchases";
import { supabase } from "./supabase";

interface AuthState {
  session: Session | null;
  initialising: boolean;
  /** Set when the session ended unexpectedly (expired / revoked). */
  sessionExpired: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [initialising, setInitialising] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [manualSignOut, setManualSignOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) setSessionExpired(true);
        setSession(data.session);
      })
      .finally(() => mounted && setInitialising(false));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_OUT") {
        qc.clear();
        purchasesLogOut();
        setManualSignOut((wasManual) => {
          if (!wasManual) setSessionExpired(true);
          return false;
        });
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") setSessionExpired(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [qc]);

  useEffect(() => {
    if (session?.user.id) purchasesLogIn(session.user.id);
  }, [session?.user.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new AppError(error.message === "Invalid login credentials" ? "That email and password don't match." : error.message, "auth");
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName }, emailRedirectTo: Linking.createURL("/") },
    });
    if (error) throw new AppError(error.message, "auth");
    return { needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    setManualSignOut(true);
    await supabase.auth.signOut();
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: Linking.createURL("/reset-password") });
    if (error) throw toAppError(error);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw toAppError(error);
  }, []);

  const deleteAccount = useCallback(async () => {
    await invoke("account-delete", { confirm: "DELETE" });
    setManualSignOut(true);
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    qc.clear();
  }, [qc]);

  const value = useMemo(
    () => ({ session, initialising, sessionExpired, signIn, signUp, signOut, sendPasswordReset, updatePassword, deleteAccount }),
    [session, initialising, sessionExpired, signIn, signUp, signOut, sendPasswordReset, updatePassword, deleteAccount],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}

export function useUserId(): string {
  const { session } = useAuth();
  if (!session) throw new AppError("Not signed in", "unauthenticated");
  return session.user.id;
}
