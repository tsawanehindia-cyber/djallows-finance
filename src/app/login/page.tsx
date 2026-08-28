"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type LoginResponse = {
  success?: boolean;
  error?: string;

  access_token?: string;
  refresh_token?: string;

  must_change_password?: boolean;

  session?: {
    access_token?: string;
    refresh_token?: string;
  };
};

export default function LoginPage() {
  const router = useRouter();

  const [
    username,
    setUsername,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanUsername =
      username
        .trim()
        .toLowerCase();

    if (!cleanUsername) {
      setError(
        "Enter your username."
      );

      return;
    }

    if (!password) {
      setError(
        "Enter your password."
      );

      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/auth/login",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                username:
                  cleanUsername,

                password,
              }),
          }
        );

      const data =
        (await response.json()) as LoginResponse;

      if (
        !response.ok ||
        !data.success
      ) {
        setError(
          data.error ??
            "Unable to sign in."
        );

        return;
      }

      const accessToken =
        data.access_token ??
        data.session
          ?.access_token;

      const refreshToken =
        data.refresh_token ??
        data.session
          ?.refresh_token;

      if (
        !accessToken ||
        !refreshToken
      ) {
        setError(
          "Unable to start your login session."
        );

        return;
      }

      const {
        error:
          sessionError,
      } =
        await supabase.auth
          .setSession({
            access_token:
              accessToken,

            refresh_token:
              refreshToken,
          });

      if (sessionError) {
        setError(
          sessionError.message
        );

        return;
      }

      if (
        data.must_change_password ===
        true
      ) {
        router.replace(
          "/change-password"
        );
      } else {
        router.replace(
          "/"
        );
      }

      router.refresh();
    } catch (
      loginError
    ) {
      console.error(
        "Login error:",
        loginError
      );

      setError(
        "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7f5]">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        {/* =====================================================
            LEFT BRAND PANEL
        ====================================================== */}

        <section className="relative hidden overflow-hidden bg-[#0d3d2a] lg:flex lg:flex-col lg:justify-between">
          {/* DECORATION */}

          <div className="absolute inset-0 opacity-20">
            <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full border border-white/20" />

            <div className="absolute left-24 top-24 h-72 w-72 rounded-full border border-white/10" />

            <div className="absolute bottom-[-120px] right-[-80px] h-[420px] w-[420px] rounded-full border border-white/15" />
          </div>

          {/* BRAND */}

          <div className="relative z-10 px-12 pt-12 xl:px-16">
            <div className="inline-flex rounded-3xl bg-white p-4 shadow-xl">
              <Image
                src="/djallows-logo.png"
                alt="Djallows Farm logo"
                width={150}
                height={150}
                className="h-28 w-28 object-contain"
                priority
              />
            </div>

            <div className="mt-10 max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                Djallows Farm
              </p>

              <h1 className="mt-4 text-4xl font-bold leading-tight text-white xl:text-5xl">
                Financial Management
                <br />
                Command Centre
              </h1>

              <p className="mt-6 max-w-lg text-base leading-7 text-emerald-50/75">
                A complete view of
                the farm&apos;s
                income, expenditure,
                sales, consultancy,
                payroll, cash flow
                and financial
                performance.
              </p>
            </div>
          </div>

          {/* FARM DETAILS */}

          <div className="relative z-10 px-12 pb-12 xl:px-16">
            <div className="grid gap-4 text-sm text-emerald-50/85">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <MapPin
                    size={18}
                    className="text-emerald-300"
                  />
                </div>

                <span>
                  Tujereng, The Gambia
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Phone
                    size={18}
                    className="text-emerald-300"
                  />
                </div>

                <span>
                  +220 789 3464
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <ShieldCheck
                    size={18}
                    className="text-emerald-300"
                  />
                </div>

                <span>
                  Secure business
                  financial records
                </span>
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="text-sm font-medium italic text-emerald-100/70">
                “Success Through Sheep Farming”
              </p>

              <p className="mt-2 text-xs text-emerald-100/50">
                Established 2017
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            LOGIN PANEL
        ====================================================== */}

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            {/* MOBILE LOGO */}

            <div className="mb-8 text-center lg:hidden">
              <div className="mx-auto inline-flex rounded-3xl bg-white p-3 shadow-sm">
                <Image
                  src="/djallows-logo.png"
                  alt="Djallows Farm logo"
                  width={110}
                  height={110}
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

            {/* LOGIN CARD */}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div>
                <div className="flex items-center gap-2 text-emerald-700">
                  <ShieldCheck
                    size={16}
                  />

                  <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                    Secure Access
                  </p>
                </div>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Enter your username
                  and password to
                  access Djallows
                  Farm.
                </p>
              </div>

              <form
                onSubmit={
                  handleLogin
                }
                className="mt-8 space-y-5"
              >
                {/* USERNAME */}

                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Username
                  </label>

                  <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                    <UserRound
                      size={18}
                      className="shrink-0 text-slate-400"
                    />

                    <input
                      id="username"
                      type="text"
                      required
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={
                        false
                      }
                      value={
                        username
                      }
                      onChange={(
                        event
                      ) =>
                        setUsername(
                          event.target
                            .value
                        )
                      }
                      placeholder="Enter your username"
                      className="w-full bg-transparent px-3 py-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* PASSWORD */}

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>

                  <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                    <LockKeyhole
                      size={18}
                      className="shrink-0 text-slate-400"
                    />

                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      required
                      autoComplete="current-password"
                      value={
                        password
                      }
                      onChange={(
                        event
                      ) =>
                        setPassword(
                          event.target
                            .value
                        )
                      }
                      placeholder="Enter your password"
                      className="w-full bg-transparent px-3 py-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (
                            current
                          ) =>
                            !current
                        )
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff
                          size={
                            18
                          }
                        />
                      ) : (
                        <Eye
                          size={
                            18
                          }
                        />
                      )}
                    </button>
                  </div>
                </div>

                {/* ERROR */}

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                {/* SIGN IN */}

                <button
                  type="submit"
                  disabled={
                    loading
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d3d2a] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a3222] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogIn
                    size={18}
                  />

                  {loading
                    ? "Signing in..."
                    : "Sign in"}
                </button>
              </form>

              <div className="mt-7 border-t border-slate-100 pt-5 text-center">
                <div className="flex items-center justify-center gap-2 text-xs leading-5 text-slate-400">
                  <ShieldCheck
                    size={14}
                  />

                  <span>
                    Access is restricted
                    to authorised
                    Djallows Farm
                    personnel.
                  </span>
                </div>
              </div>
            </div>

            {/* FOOTER */}

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <MapPin
                size={13}
              />

              <span>
                © 2026 Djallows Farm ·
                Tujereng, The Gambia
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}