"use client";

import Image from "next/image";
import Link from "next/link";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  Banknote,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Plus,
  ReceiptText,
  Settings,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

// ============================================================
// TYPES
// ============================================================

type FinancePageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  recordText?: string;
  children: ReactNode;
};

type NavigationItem = {
  label: string;
  shortLabel: string;
  icon: ReactNode;
  href: string;
};

type MemberRole =
  | "owner"
  | "admin"
  | "staff"
  | "viewer"
  | null;

type UserProfile = {
  username: string | null;
  full_name: string | null;
  platform_role: string | null;
  is_active: boolean | null;
};

type BusinessAccess = {
  access_role: string | null;
  active: boolean | null;
};

// ============================================================
// NAVIGATION
// ============================================================

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    shortLabel: "Home",
    icon: (
      <LayoutDashboard
        size={21}
      />
    ),
    href: "/",
  },

  {
    label: "Income",
    shortLabel: "Income",
    icon: (
      <Banknote
        size={21}
      />
    ),
    href: "/income",
  },

  {
    label: "Expenses",
    shortLabel: "Expenses",
    icon: (
      <ReceiptText
        size={21}
      />
    ),
    href: "/expenses",
  },

  {
    label:
      "Customers & Suppliers",
    shortLabel: "Contacts",
    icon: (
      <Users
        size={21}
      />
    ),
    href: "/contacts",
  },

  {
    label:
      "Invoices & Receipts",
    shortLabel: "Invoices",
    icon: (
      <FileText
        size={21}
      />
    ),
    href: "/invoices",
  },

  {
    label:
      "Consultation & Advisory",
    shortLabel: "Advisory",
    icon: (
      <FileText
        size={21}
      />
    ),
    href: "/consultations",
  },

  {
    label:
      "Staff & Payroll",
    shortLabel: "Payroll",
    icon: (
      <UserRound
        size={21}
      />
    ),
    href: "/staff",
  },

  {
    label: "Reports",
    shortLabel: "Reports",
    icon: (
      <TrendingUp
        size={21}
      />
    ),
    href: "/reports",
  },
];

const mobileNavigationItems: NavigationItem[] = [
  navigationItems[0],
  navigationItems[1],
  navigationItems[2],
  navigationItems[4],
  navigationItems[6],
];

// ============================================================
// HELPERS
// ============================================================

function isNavigationActive(
  pathname: string,
  href: string
) {
  if (
    href === "/"
  ) {
    return pathname === "/";
  }

  return pathname.startsWith(
    href
  );
}

function getRoleLabel(
  memberRole: MemberRole,
  platformRole?: string | null
) {
  if (
    platformRole ===
    "super_admin"
  ) {
    return "Super Admin";
  }

  if (
    memberRole === "owner" ||
    memberRole === "admin"
  ) {
    return "Admin";
  }

  if (
    memberRole === "viewer"
  ) {
    return "Viewer";
  }

  if (
    memberRole === "staff"
  ) {
    return "Staff";
  }

  return "User";
}

function getInitials(
  value: string
) {
  const parts =
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return "U";
  }

  if (
    parts.length === 1
  ) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${
    parts[
      parts.length - 1
    ][0]
  }`.toUpperCase();
}

function formatSidebarDate(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

function formatSidebarTime(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  ).format(date);
}

// ============================================================
// MAIN SHELL
// ============================================================

export default function FinancePageShell({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
  recordText,
  children,
}: FinancePageShellProps) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  const [
    memberRole,
    setMemberRole,
  ] =
    useState<MemberRole>(
      null
    );

  const [
    accessChecked,
    setAccessChecked,
  ] = useState(false);

  const [
    loginFullName,
    setLoginFullName,
  ] = useState("User");

  const [
    loginRole,
    setLoginRole,
  ] = useState("User");

  const [
    currentTime,
    setCurrentTime,
  ] =
    useState(
      () => new Date()
    );

  // ==========================================================
  // CLOCK
  // ==========================================================

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setCurrentTime(
            new Date()
          );
        },
        60000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, []);

  // ==========================================================
  // CURRENT USER
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      try {
        const {
          data: {
            session,
          },
          error:
            sessionError,
        } =
          await supabase.auth.getSession();

        if (
          sessionError ||
          !session
        ) {
          router.replace(
            "/login"
          );

          return;
        }

        const {
          data:
            profileData,
          error:
            profileError,
        } =
          await supabase
            .from(
              "user_profiles"
            )
            .select(
              `
              username,
              full_name,
              platform_role,
              is_active
            `
            )
            .eq(
              "id",
              session.user.id
            )
            .maybeSingle();

        if (
          profileError
        ) {
          console.error(
            "Unable to load user profile:",
            profileError
          );
        }

        const profile =
          profileData as
            | UserProfile
            | null;

        if (
          profile?.is_active ===
          false
        ) {
          await supabase.auth.signOut();

          router.replace(
            "/login"
          );

          return;
        }

        const fallbackUsername =
          session.user
            .user_metadata
            ?.username ||
          session.user.email
            ?.split("@")[0] ||
          "User";

        const fullName =
          profile?.full_name
            ?.trim() ||
          profile?.username
            ?.trim() ||
          fallbackUsername;

        // ======================================================
        // SUPER ADMIN
        // ======================================================

        if (
          profile?.platform_role ===
          "super_admin"
        ) {
          if (
            !active
          ) {
            return;
          }

          setLoginFullName(
            fullName
          );

          setLoginRole(
            "Super Admin"
          );

          setMemberRole(
            "owner"
          );

          setAccessChecked(
            true
          );

          return;
        }

        // ======================================================
        // FARM MEMBER
        // ======================================================

        const {
          data:
            membership,
          error:
            membershipError,
        } =
          await supabase
            .from(
              "business_members"
            )
            .select(
              `
              business_id,
              role
            `
            )
            .eq(
              "user_id",
              session.user.id
            )
            .limit(1)
            .maybeSingle();

        if (
          membershipError ||
          !membership
        ) {
          console.error(
            "Unable to load business membership:",
            membershipError
          );

          await supabase.auth.signOut();

          router.replace(
            "/login"
          );

          return;
        }

        const {
          data:
            accessData,
          error:
            accessError,
        } =
          await supabase
            .from(
              "business_user_access"
            )
            .select(
              `
              access_role,
              active
            `
            )
            .eq(
              "business_id",
              membership.business_id
            )
            .eq(
              "user_id",
              session.user.id
            )
            .maybeSingle();

        if (
          accessError
        ) {
          console.error(
            "Unable to load business access:",
            accessError
          );
        }

        const access =
          accessData as
            | BusinessAccess
            | null;

        if (
          access &&
          access.active ===
          false
        ) {
          await supabase.auth.signOut();

          router.replace(
            "/login"
          );

          return;
        }

        const rawRole =
          access?.access_role ||
          membership.role ||
          "staff";

        let resolvedRole:
          MemberRole =
            "staff";

        if (
          rawRole === "owner"
        ) {
          resolvedRole =
            "owner";
        }
        else if (
          rawRole === "admin"
        ) {
          resolvedRole =
            "admin";
        }
        else if (
          rawRole === "viewer"
        ) {
          resolvedRole =
            "viewer";
        }
        else {
          resolvedRole =
            "staff";
        }

        if (
          !active
        ) {
          return;
        }

        setLoginFullName(
          fullName
        );

        setLoginRole(
          getRoleLabel(
            resolvedRole,
            profile?.platform_role
          )
        );

        setMemberRole(
          resolvedRole
        );

        setAccessChecked(
          true
        );
      } catch (
        loadError
      ) {
        console.error(
          "Unable to load current user:",
          loadError
        );

        if (
          active
        ) {
          setAccessChecked(
            true
          );
        }
      }
    }

    loadCurrentUser();

    return () => {
      active = false;
    };
  }, [
    router,
  ]);

  // ==========================================================
  // PERMISSIONS
  // ==========================================================

  const isViewer =
    memberRole ===
    "viewer";

  const canModify =
    accessChecked &&
    memberRole !==
      null &&
    !isViewer;

  const canAccessPayroll =
    accessChecked &&
    (
      memberRole ===
        "owner" ||
      memberRole ===
        "admin"
    );

  // ==========================================================
  // ROUTE PROTECTION
  // ==========================================================

  useEffect(() => {
    if (
      !accessChecked
    ) {
      return;
    }

    const isPayrollPage =
      pathname.startsWith(
        "/staff"
      );

    if (
      isPayrollPage &&
      !canAccessPayroll
    ) {
      router.replace(
        "/"
      );

      return;
    }

    if (
      !isViewer
    ) {
      return;
    }

    const isSettingsPage =
      pathname.startsWith(
        "/settings"
      );

    const isCreatePage =
      pathname.endsWith(
        "/new"
      );

    const isEditPage =
      pathname.includes(
        "/edit"
      );

    if (
      isSettingsPage ||
      isCreatePage ||
      isEditPage
    ) {
      router.replace(
        "/"
      );
    }
  }, [
    accessChecked,
    canAccessPayroll,
    isViewer,
    pathname,
    router,
  ]);

  // ==========================================================
  // SIGN OUT
  // ==========================================================

  async function handleSignOut() {
    await supabase.auth.signOut();

    router.replace(
      "/login"
    );

    router.refresh();
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <main className="min-h-screen bg-[#eef3f1] font-sans text-slate-950">

      <div className="flex min-h-screen">

        {/* ====================================================
            MOBILE OVERLAY
        ==================================================== */}

        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() =>
              setMobileMenuOpen(
                false
              )
            }
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] lg:hidden"
          />
        )}

        {/* ====================================================
            MOBILE SIDEBAR
        ==================================================== */}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[310px] flex-col overflow-y-auto bg-gradient-to-b from-[#033a32] via-[#04362f] to-[#052b28] text-white shadow-2xl transition-transform duration-300 lg:hidden ${
            mobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }`}
        >

          <SidebarHeader
            onClose={() =>
              setMobileMenuOpen(
                false
              )
            }
          />

          <SidebarNavigation
            pathname={
              pathname
            }
            showPayroll={
              canAccessPayroll
            }
            onNavigate={() =>
              setMobileMenuOpen(
                false
              )
            }
          />

          <SidebarFooter
            pathname={
              pathname
            }
            loginFullName={
              loginFullName
            }
            loginRole={
              loginRole
            }
            showSettings={
              accessChecked &&
              !isViewer
            }
            currentTime={
              currentTime
            }
            onSignOut={
              handleSignOut
            }
            onNavigate={() =>
              setMobileMenuOpen(
                false
              )
            }
          />

        </aside>

        {/* ====================================================
            DESKTOP SIDEBAR
        ==================================================== */}

        <aside className="sticky top-0 hidden h-screen w-[310px] shrink-0 flex-col overflow-y-auto border-r border-white/5 bg-gradient-to-b from-[#033a32] via-[#04362f] to-[#052b28] text-white shadow-[10px_0_35px_rgba(15,23,42,0.10)] lg:flex">

          <SidebarHeader />

          <SidebarNavigation
            pathname={
              pathname
            }
            showPayroll={
              canAccessPayroll
            }
          />

          <SidebarFooter
            pathname={
              pathname
            }
            loginFullName={
              loginFullName
            }
            loginRole={
              loginRole
            }
            showSettings={
              accessChecked &&
              !isViewer
            }
            currentTime={
              currentTime
            }
            onSignOut={
              handleSignOut
            }
          />

        </aside>

        {/* ====================================================
            MAIN APPLICATION
        ==================================================== */}

        <section className="relative min-w-0 flex-1 overflow-hidden">

          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(
                  circle at 8% 5%,
                  rgba(16,185,129,0.08),
                  transparent 22%
                ),
                radial-gradient(
                  circle at 93% 75%,
                  rgba(15,118,110,0.06),
                  transparent 24%
                ),
                linear-gradient(
                  135deg,
                  #f8faf9 0%,
                  #eef3f1 52%,
                  #f5f8f6 100%
                )
              `,
            }}
          />

          {/* ==================================================
              MOBILE TOP BAR
          ================================================== */}

          <header className="relative z-30 flex min-h-[74px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 shadow-sm backdrop-blur-xl lg:hidden">

            <div className="flex items-center gap-3">

              <button
                type="button"
                onClick={() =>
                  setMobileMenuOpen(
                    true
                  )
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#07553d]"
                aria-label="Open navigation"
              >
                <Menu
                  size={23}
                />
              </button>

              <div>
                <p className="text-[18px] font-black tracking-[0.03em] text-[#07553d]">
                  DJALLOWS FARM
                </p>

                <p className="mt-0.5 text-[13px] font-semibold text-slate-500">
                  Success Through Sheep Farming
                </p>
              </div>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#118253] text-[13px] font-black text-white">
              {getInitials(
                loginFullName
              )}
            </div>

          </header>

          <div className="relative z-10 pb-24 lg:pb-0">

            {/* =================================================
                FARM BANNER
            ================================================= */}

            <section className="mx-auto max-w-[1600px] px-3 pt-4 sm:px-5 lg:px-6 xl:px-7">

              <div
                className="relative h-[190px] overflow-hidden rounded-[26px] border border-white/80 bg-cover bg-center bg-no-repeat shadow-[0_16px_42px_rgba(15,23,42,0.14)] sm:h-[205px] xl:h-[215px]"
                style={{
                  backgroundImage:
                    "url('/djallows-farm-banner.png')",
                }}
              >

                <div className="absolute inset-0 bg-gradient-to-r from-[#032c24]/95 via-[#064738]/70 via-55% to-black/15" />

                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

                

                <div className="absolute inset-0 flex items-start sm:items-center">

                  <div className="w-full px-6 sm:px-8 lg:px-10">

                    <div className="max-w-[850px]">

                      <div className="flex flex-wrap items-center gap-2">

                        <span className="inline-flex rounded-full border border-white/20 bg-black/20 px-3.5 py-1.5 text-[13px] font-black uppercase tracking-[0.10em] text-[#f2d98f] backdrop-blur-md">
                          {eyebrow}
                        </span>

                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/25 px-3.5 py-1.5 text-[13px] font-bold text-white backdrop-blur-md">
                          <MapPin
                            size={15}
                          />

                          Tujereng, The Gambia
                        </span>

                      </div>

                      <h1 className="mt-3 text-[32px] font-black leading-tight tracking-[-0.02em] text-white drop-shadow sm:text-[37px] lg:text-[41px]">
                        {title}
                      </h1>

                      <p className="mt-2 max-w-[780px] text-[15px] font-medium leading-6 text-white/95 drop-shadow sm:text-[16px]">
                        {description}
                      </p>

                      {((
                        actionHref &&
                        actionLabel &&
                        canModify
                      ) ||
                        recordText) && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">

                          {actionHref &&
                            actionLabel &&
                            canModify && (
                              <Link
                                href={
                                  actionHref
                                }
                                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[14px] font-black text-[#07553d] shadow-lg transition hover:bg-emerald-50"
                              >
                                <Plus
                                  size={17}
                                />

                                {
                                  actionLabel
                                }
                              </Link>
                            )}

                          {recordText && (
                            <div className="rounded-xl border border-white/20 bg-black/25 px-4 py-2.5 text-[14px] font-bold text-white backdrop-blur-md">
                              {recordText}
                            </div>
                          )}

                        </div>
                      )}

                    </div>

                  </div>

                </div>

              </div>

            </section>

            {/* =================================================
                PAGE BODY
            ================================================= */}

            <section className="mx-auto max-w-[1600px] px-3 pb-6 pt-4 sm:px-5 lg:px-6 xl:px-7">

              {children}

            </section>

            {/* =================================================
                FOOTER
            ================================================= */}

            <footer className="mx-auto max-w-[1650px] px-3 pb-6 sm:px-5 lg:px-6 xl:px-8">
              <div className="border-t border-slate-200/80 pt-4">

                {/* MOBILE FOOTER */}
                <p className="whitespace-nowrap text-center text-[10px] font-semibold tracking-tight text-slate-500 sm:hidden">
                  <span className="font-black text-[#0b6b47]">
                    DJALLOWS FARM
                  </span>
                  {" | Copyright "}
                  {new Date().getFullYear()}
                  {" | Tujereng, The Gambia"}
                </p>

                {/* TABLET / DESKTOP FOOTER */}
                <div className="hidden items-center justify-between gap-4 text-[13px] font-semibold text-slate-500 sm:flex">
                  <p>
                    <span className="font-black text-[#0b6b47]">
                      DJALLOWS FARM
                    </span>
                    {" | "}
                    Success Through Sheep Farming
                  </p>

                  <p>
                    Copyright {new Date().getFullYear()}
                    {" | "}
                    Tujereng, The Gambia
                  </p>
                </div>

              </div>
            </footer>

          </div>

          <MobileBottomNavigation
            pathname={
              pathname
            }
          />

        </section>

      </div>

    </main>
  );
}

// ============================================================
// MOBILE NAVIGATION
// ============================================================

function MobileBottomNavigation({
  pathname,
}: {
  pathname: string;
}) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl lg:hidden"
    >

      <div className="mx-auto grid max-w-[720px] grid-cols-5 gap-1">

        {mobileNavigationItems.map(
          (item) => {
            const active =
              isNavigationActive(
                pathname,
                item.href
              );

            return (
              <Link
                key={
                  item.href
                }
                href={
                  item.href
                }
                className={`flex min-w-0 flex-col items-center justify-center rounded-xl px-1 py-2 text-center ${
                  active
                    ? "bg-emerald-50 text-[#0b6b47]"
                    : "text-slate-500"
                }`}
              >

                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    active
                      ? "bg-[#0b6b47] text-white"
                      : ""
                  }`}
                >
                  {item.icon}
                </span>

                <span className="mt-1 truncate text-[12px] font-bold">
                  {item.shortLabel}
                </span>

              </Link>
            );
          }
        )}

      </div>

    </nav>
  );
}

// ============================================================
// SIDEBAR HEADER
// ============================================================

function SidebarHeader({
  onClose,
}: {
  onClose?: () => void;
}) {
  return (
    <div className="shrink-0 border-b border-white/[0.07] px-4 pb-5 pt-5">

      <div className="flex items-center justify-between gap-3">

        <div className="flex min-w-0 items-center gap-3">

          <div className="flex h-[70px] w-[70px] shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-white p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.24)]">

            <Image
              src="/djallows-logo.png"
              alt="Djallows Farm"
              width={66}
              height={66}
              priority
              className="h-full w-full object-contain"
            />

          </div>

          <div className="min-w-0">

            <p className="text-[22px] font-black leading-[1.05] tracking-[0.03em] text-[#e1c47f]">
              DJALLOWS
            </p>

            <p className="mt-1 text-[22px] font-black leading-[1.05] tracking-[0.03em] text-[#e1c47f]">
              FARM
            </p>

          </div>

        </div>

        {onClose && (
          <button
            type="button"
            onClick={
              onClose
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white"
          >
            <X
              size={20}
            />
          </button>
        )}

      </div>

      <div className="mt-4 rounded-xl border border-[#e1c47f]/15 bg-black/10 px-4 py-3">

        <p className="text-[14px] font-semibold italic leading-5 text-emerald-50/90">
          Success Through Sheep Farming
        </p>

      </div>

    </div>
  );
}

// ============================================================
// SIDEBAR NAVIGATION
// ============================================================

function SidebarNavigation({
  pathname,
  onNavigate,
  showPayroll,
}: {
  pathname: string;
  onNavigate?: () => void;
  showPayroll: boolean;
}) {
  return (
    <nav className="flex-1 px-3 py-4">

      <p className="mb-3 px-3 text-[12px] font-black uppercase tracking-[0.15em] text-emerald-100/45">
        Main Menu
      </p>

      <div className="space-y-1.5">

        {navigationItems
          .filter(
            (item) =>
              item.href !==
                "/staff" ||
              showPayroll
          )
          .map(
            (item) => {
              const active =
                isNavigationActive(
                  pathname,
                  item.href
                );

              return (
                <Link
                  key={
                    item.label
                  }
                  href={
                    item.href
                  }
                  onClick={
                    onNavigate
                  }
                  className={`group flex min-h-[50px] items-center gap-3 rounded-[13px] px-3.5 py-2.5 text-[16px] font-bold transition ${
                    active
                      ? "bg-[#178457] text-white shadow-[0_8px_24px_rgba(23,132,87,0.27)]"
                      : "text-white/90 hover:bg-white/[0.08]"
                  }`}
                >

                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${
                      active
                        ? "bg-white/15"
                        : "bg-white/[0.05]"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span className="min-w-0 flex-1">
                    {item.label}
                  </span>

                  {active && (
                    <ChevronRight
                      size={16}
                    />
                  )}

                </Link>
              );
            }
          )}

      </div>

    </nav>
  );
}

// ============================================================
// SIDEBAR FOOTER
// ============================================================

function SidebarFooter({
  pathname,
  loginFullName,
  loginRole,
  showSettings,
  currentTime,
  onSignOut,
  onNavigate,
}: {
  pathname: string;
  loginFullName: string;
  loginRole: string;
  showSettings: boolean;
  currentTime: Date;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  const settingsActive =
    pathname.startsWith(
      "/settings"
    );

  return (
    <div className="shrink-0 border-t border-white/[0.06] px-3 pb-4 pt-3">

      {showSettings && (
        <Link
          href="/settings"
          onClick={
            onNavigate
          }
          className={`mb-3 flex min-h-[50px] items-center gap-3 rounded-[13px] px-3.5 py-2.5 text-[16px] font-bold ${
            settingsActive
              ? "bg-[#178457] text-white"
              : "text-white/90 hover:bg-white/[0.08]"
          }`}
        >

          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/[0.05]">
            <Settings
              size={21}
            />
          </span>

          Settings

        </Link>
      )}

      <div className="rounded-[18px] border border-emerald-400/15 bg-white/[0.06] p-3.5">

        <div className="flex items-center gap-3">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#23a56d] to-[#08734c] text-[14px] font-black text-white">
            {getInitials(
              loginFullName
            )}
          </div>

          <div className="min-w-0 flex-1">

            <p className="truncate text-[15px] font-black text-white">
              {loginFullName}
            </p>

            <p className="mt-1 text-[12px] font-black uppercase tracking-[0.07em] text-[#e1c47f]">
              {loginRole}
            </p>

          </div>

        </div>

      </div>

      <div className="mt-2.5 rounded-[16px] border border-white/[0.07] bg-black/10 px-3.5 py-3">

        <div className="flex items-center gap-2 text-emerald-50/60">

          <CalendarDays
            size={16}
          />

          <p className="text-[12px] font-black uppercase tracking-[0.07em]">
            Today&apos;s Date
          </p>

        </div>

        <p className="mt-2 text-[13px] font-bold leading-5 text-white/95">
          {formatSidebarDate(
            currentTime
          )}
        </p>

        <div className="mt-1.5 flex items-center gap-2">

          <Clock3
            size={16}
          />

          <p className="text-[14px] font-black text-white">
            {formatSidebarTime(
              currentTime
            )}
          </p>

        </div>

      </div>

      <button
        type="button"
        onClick={
          onSignOut
        }
        className="mt-2.5 flex min-h-[45px] w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.04] text-[14px] font-bold text-white/80 transition hover:bg-red-500/10 hover:text-red-100"
      >

        <LogOut
          size={17}
        />

        Sign Out

      </button>

    </div>
  );
}

