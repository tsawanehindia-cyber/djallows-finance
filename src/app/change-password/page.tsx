"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
} from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  // ==========================================================
  // VERIFY SESSION
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const {
        data: { session },
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (
        sessionError ||
        !session
      ) {
        router.replace("/login");

        return;
      }

      setCheckingSession(false);
    }

    void checkSession();

    return () => {
      active = false;
    };
  }, [router]);

  // ==========================================================
  // SAVE PASSWORD
  // ==========================================================

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      newPassword.length < 8
    ) {
      setError(
        "Your password must contain at least 8 characters."
      );

      return;
    }

    if (
      !/[A-Z]/.test(
        newPassword
      )
    ) {
      setError(
        "Your password must contain at least one uppercase letter."
      );

      return;
    }

    if (
      !/[a-z]/.test(
        newPassword
      )
    ) {
      setError(
        "Your password must contain at least one lowercase letter."
      );

      return;
    }

    if (
      !/[0-9]/.test(
        newPassword
      )
    ) {
      setError(
        "Your password must contain at least one number."
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        "The passwords do not match."
      );

      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !session
      ) {
        setError(
          "Your login session has expired. Please sign in again."
        );

        setLoading(false);

        return;
      }

      const response =
        await fetch(
          "/api/auth/change-password",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body: JSON.stringify({
              new_password:
                newPassword,
            }),
          }
        );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !data.success
      ) {
        setError(
          data.error ??
            "Unable to change your password."
        );

        setLoading(false);

        return;
      }

      setSuccess(
        "Password changed successfully."
      );

      await supabase.auth.signOut();

      window.setTimeout(
        () => {
          router.replace(
            "/login"
          );

          router.refresh();
        },
        1200
      );
    } catch (submitError) {
      console.error(
        "Change password:",
        submitError
      );

      setError(
        "Unable to change your password. Please try again."
      );

      setLoading(false);
    }
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f7f5] px-5">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-100 border-t-[#0d3d2a]" />

          <p className="mt-4 text-sm text-slate-500">
            Checking your account...
          </p>
        </div>
      </main>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <main className="min-h-screen bg-[#f4f7f5]">
      <div className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          {/* LOGO */}
          <div className="mb-7 text-center">
            <div className="mx-auto inline-flex rounded-3xl bg-white p-3 shadow-sm">
              <Image
                src="/djallows-logo.png"
                alt="Djallows Farm logo"
                width={105}
                height={105}
                className="h-24 w-24 object-contain"
                priority
              />
            </div>

            <h1 className="mt-4 text-2xl font-bold text-[#0d3d2a]">
              Djallows Farm
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Financial Management
            </p>
          </div>

          {/* CARD */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <KeyRound
                size={24}
              />
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                First Login
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                Create your password
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Your temporary password
                was only for your first
                login. Create a private
                password that only you
                know.
              </p>
            </div>

            {/* SECURITY MESSAGE */}
            <div className="mt-5 flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <ShieldCheck
                size={20}
                className="mt-0.5 shrink-0 text-emerald-700"
              />

              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  Password requirements
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-800/80">
                  At least 8 characters,
                  including an uppercase
                  letter, lowercase
                  letter and number.
                </p>
              </div>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="mt-6 space-y-5"
            >
              {/* NEW PASSWORD */}
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  New password
                </label>

                <div className="flex items-center rounded-xl border border-slate-200 px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                  <LockKeyhole
                    size={18}
                    className="shrink-0 text-slate-400"
                  />

                  <input
                    id="new-password"
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={
                      newPassword
                    }
                    onChange={(
                      event
                    ) =>
                      setNewPassword(
                        event.target
                          .value
                      )
                    }
                    placeholder="Create your password"
                    className="w-full bg-transparent px-3 py-3.5 text-sm outline-none placeholder:text-slate-400"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowNewPassword(
                        (
                          current
                        ) =>
                          !current
                      )
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label={
                      showNewPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff
                        size={18}
                      />
                    ) : (
                      <Eye
                        size={18}
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* CONFIRM PASSWORD */}
              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Confirm password
                </label>

                <div className="flex items-center rounded-xl border border-slate-200 px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                  <LockKeyhole
                    size={18}
                    className="shrink-0 text-slate-400"
                  />

                  <input
                    id="confirm-password"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={
                      confirmPassword
                    }
                    onChange={(
                      event
                    ) =>
                      setConfirmPassword(
                        event.target
                          .value
                      )
                    }
                    placeholder="Enter password again"
                    className="w-full bg-transparent px-3 py-3.5 text-sm outline-none placeholder:text-slate-400"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (
                          current
                        ) =>
                          !current
                      )
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff
                        size={18}
                      />
                    ) : (
                      <Eye
                        size={18}
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* SUCCESS */}
              {success && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  <CheckCircle2
                    size={18}
                  />

                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  Boolean(success)
                }
                className="flex w-full items-center justify-center rounded-xl bg-[#0d3d2a] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a3222] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Saving..."
                  : "Create Password"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            © 2026 Djallows Farm ·
            Tujereng, The Gambia
          </p>
        </div>
      </div>
    </main>
  );
}