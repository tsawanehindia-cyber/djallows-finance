"use client";

import Image from "next/image";
import {
  useEffect,
  useState,
} from "react";

import {
  CheckCircle2,
  Database,
  LogOut,
  WifiOff,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";


type LocalSession = {
  success?: boolean;

  profile?: {
    username?: string;
    full_name?: string;
    platform_role?: string;
  };

  business_access?: {
    business_id?: string | null;
    access_role?: string | null;
  };
};


export default function LocalReadyPage() {

  const router =
    useRouter();

  const [
    session,
    setSession,
  ] =
    useState<LocalSession | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);


  useEffect(() => {

    let active = true;


    async function loadSession() {

      try {

        const response =
          await fetch(
            "/api/local/auth/session",
            {
              cache:
                "no-store",
            }
          );


        if (
          !response.ok
        ) {

          router.replace(
            "/login"
          );

          return;
        }


        const data =
          (await response.json()) as LocalSession;


        if (
          !data.success
        ) {

          router.replace(
            "/login"
          );

          return;
        }


        if (active) {

          setSession(
            data
          );

          setLoading(
            false
          );
        }

      } catch {

        router.replace(
          "/login"
        );
      }
    }


    loadSession();


    return () => {

      active =
        false;
    };

  }, [
    router,
  ]);


  async function handleLogout() {

    await fetch(
      "/api/local/auth/logout",
      {
        method:
          "POST",
      }
    );


    router.replace(
      "/login"
    );

    router.refresh();
  }


  if (loading) {

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f7f5]">
        <p className="text-sm font-medium text-slate-500">
          Checking local login...
        </p>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#f4f7f5] px-5 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-2xl items-center justify-center">

        <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">

          <div className="text-center">

            <Image
              src="/djallows-logo.png"
              alt="Djallows Farm"
              width={120}
              height={120}
              className="mx-auto h-28 w-28 object-contain"
              priority
            />

            <div className="mt-6 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2
                  size={30}
                />
              </div>
            </div>

            <h1 className="mt-5 text-3xl font-bold text-[#0d3d2a]">
              Local System Ready
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Djallows Farm successfully logged in using the database stored on this laptop.
            </p>

          </div>


          <div className="mt-8 grid gap-3">

            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <Database
                size={21}
                className="text-emerald-700"
              />

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Database
                </p>

                <p className="text-sm font-semibold text-slate-800">
                  Local SQLite
                </p>
              </div>
            </div>


            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <WifiOff
                size={21}
                className="text-emerald-700"
              />

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Internet
                </p>

                <p className="text-sm font-semibold text-slate-800">
                  Not required for login
                </p>
              </div>
            </div>


            <div className="rounded-2xl bg-slate-50 p-4">

              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Logged in as
              </p>

              <p className="mt-1 text-base font-bold text-slate-800">
                {
                  session?.profile?.full_name ??
                  session?.profile?.username ??
                  "Djallows Farm User"
                }
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {
                  session?.profile?.platform_role ??
                  "user"
                }
              </p>

            </div>

          </div>


          <button
            type="button"
            onClick={
              handleLogout
            }
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d3d2a] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0a3222]"
          >
            <LogOut
              size={18}
            />

            Test Sign Out
          </button>


          <p className="mt-5 text-center text-xs leading-5 text-slate-400">
            This temporary screen will disappear once all Djallows Farm pages have been moved from Supabase to the local database.
          </p>

        </div>
      </div>
    </main>
  );
}