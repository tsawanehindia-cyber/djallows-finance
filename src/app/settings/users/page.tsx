"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Eye,
  KeyRound,
  Loader2,
  Phone,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  UserX,
} from "lucide-react";

import FinancePageShell from "@/components/FinancePageShell";
import { supabase } from "@/lib/supabase";

type UserRole =
  | "admin"
  | "staff"
  | "viewer";

type CurrentUser = {
  id: string;
  username: string;
  full_name: string | null;
  platform_role: string;
  business_role: string | null;
  is_super_admin: boolean;
};

type UserLimit = {
  used: number;
  maximum: number;
  remaining: number;
};

type BusinessUser = {
  id: string;
  username: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  must_change_password: boolean;
};

type UsersListResponse = {
  success?: boolean;
  error?: string;

  current_user?: CurrentUser;

  business?: {
    id: string;
    name: string;
  };

  user_limit?: UserLimit;

  users?: BusinessUser[];
};

type CreateUserResponse = {
  success?: boolean;
  error?: string;

  user?: {
    id: string;
    username: string;
    full_name: string;
    phone: string | null;
    role: UserRole;
  };

  temporary_password?: string;
};

type ResetPasswordResponse = {
  success?: boolean;
  error?: string;

  user?: {
    id: string;
    username: string;
    full_name: string | null;
    role: UserRole;
  };

  temporary_password?: string;
};

type SetActiveResponse = {
  success?: boolean;
  error?: string;

  user?: {
    id: string;
    username: string;
    full_name: string | null;
    role: UserRole;
    is_active: boolean;
  };
};

export default function UsersAccessPage() {
  const router = useRouter();

  // ==========================================================
  // PAGE STATE
  // ==========================================================

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<CurrentUser | null>(
      null
    );

  const [
    users,
    setUsers,
  ] =
    useState<BusinessUser[]>(
      []
    );

  const [
    userLimit,
    setUserLimit,
  ] =
    useState<UserLimit>({
      used: 0,
      maximum: 5,
      remaining: 5,
    });

  // ==========================================================
  // CREATE USER STATE
  // ==========================================================

  const [
    fullName,
    setFullName,
  ] = useState("");

  const [
    username,
    setUsername,
  ] = useState("");

  const [
    phone,
    setPhone,
  ] = useState("");

  const [
    role,
    setRole,
  ] =
    useState<UserRole>(
      "admin"
    );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    formError,
    setFormError,
  ] = useState("");

  // ==========================================================
  // USER ACTION STATE
  // ==========================================================

  const [
    notification,
    setNotification,
  ] = useState("");

  const [
    userActionError,
    setUserActionError,
  ] = useState("");

  const [
    resettingUserId,
    setResettingUserId,
  ] = useState("");

  const [
    updatingUserId,
    setUpdatingUserId,
  ] = useState("");

  // ==========================================================
  // TEMP PASSWORD
  // ==========================================================

  const [
    temporaryPassword,
    setTemporaryPassword,
  ] = useState("");

  const [
    createdUsername,
    setCreatedUsername,
  ] = useState("");

  const [
    copied,
    setCopied,
  ] = useState(false);

  // ==========================================================
  // LOAD USERS
  // ==========================================================

  const loadUsers =
    useCallback(
      async (
        showLoading = true
      ) => {
        try {
          if (showLoading) {
            setLoading(true);
          }

          setError("");

          const {
            data: {
              session,
            },
            error:
              sessionError,
          } =
            await supabase.auth
              .getSession();

          if (
            sessionError ||
            !session
          ) {
            router.replace(
              "/login"
            );

            return;
          }

          const response =
            await fetch(
              "/api/users/list",
              {
                method: "GET",

                headers: {
                  Authorization:
                    `Bearer ${session.access_token}`,
                },

                cache:
                  "no-store",
              }
            );

          const data =
            (await response.json()) as UsersListResponse;

          if (
            response.status ===
            401
          ) {
            await supabase.auth
              .signOut();

            router.replace(
              "/login"
            );

            return;
          }

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.error ??
                "Unable to load users."
            );
          }

          const loadedCurrentUser =
            data.current_user ??
            null;

          setCurrentUser(
            loadedCurrentUser
          );

          setUsers(
            data.users ?? []
          );

          setUserLimit(
            data.user_limit ?? {
              used: 0,
              maximum: 5,
              remaining: 5,
            }
          );

          if (
            loadedCurrentUser &&
            !loadedCurrentUser
              .is_super_admin
          ) {
            setRole(
              "staff"
            );
          }
        } catch (
          loadError
        ) {
          console.error(
            "Load users:",
            loadError
          );

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load users."
          );
        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      },
      [router]
    );

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  // ==========================================================
  // NOTIFICATION
  // ==========================================================

  useEffect(() => {
    if (!notification) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setNotification(
            ""
          );
        },
        3500
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [notification]);

  // ==========================================================
  // CREATE USER
  // ==========================================================

  async function handleCreateUser(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setFormError("");
    setUserActionError("");
    setNotification("");
    setTemporaryPassword("");
    setCreatedUsername("");
    setCopied(false);

    if (!fullName.trim()) {
      setFormError(
        "Enter the user's full name."
      );

      return;
    }

    if (!username.trim()) {
      setFormError(
        "Enter a username."
      );

      return;
    }

    if (
      (
        role === "staff" ||
        role === "viewer"
      ) &&
      userLimit.remaining <=
        0
    ) {
      setFormError(
        "The maximum number of additional users has been reached."
      );

      return;
    }

    setSaving(true);

    try {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth
          .getSession();

      if (!session) {
        router.replace(
          "/login"
        );

        return;
      }

      const response =
        await fetch(
          "/api/users/create",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify({
                full_name:
                  fullName.trim(),

                username:
                  username
                    .trim()
                    .toLowerCase(),

                phone:
                  phone.trim(),

                role,
              }),
          }
        );

      const data =
        (await response.json()) as CreateUserResponse;

      if (
        !response.ok ||
        !data.success
      ) {
        setFormError(
          data.error ??
            "Unable to create the user."
        );

        return;
      }

      setTemporaryPassword(
        data.temporary_password ??
          ""
      );

      setCreatedUsername(
        data.user
          ?.username ??
          username
            .trim()
            .toLowerCase()
      );

      setNotification(
        "Saved successfully"
      );

      setFullName("");
      setUsername("");
      setPhone("");

      if (
        currentUser
          ?.is_super_admin
      ) {
        setRole(
          "admin"
        );
      } else {
        setRole(
          "staff"
        );
      }

      await loadUsers(
        false
      );
    } catch (
      createError
    ) {
      console.error(
        "Create user:",
        createError
      );

      setFormError(
        "Unable to create the user. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // RESET PASSWORD
  // SUPER ADMIN ONLY
  // ==========================================================

  async function handleResetPassword(
    user: BusinessUser
  ) {
    if (
      !currentUser
        ?.is_super_admin
    ) {
      return;
    }

    const displayName =
      user.full_name ??
      user.username;

    const confirmed =
      window.confirm(
        `Reset the password for ${displayName}? A new temporary password will be created.`
      );

    if (!confirmed) {
      return;
    }

    setUserActionError("");
    setNotification("");
    setTemporaryPassword("");
    setCreatedUsername("");
    setCopied(false);

    setResettingUserId(
      user.id
    );

    try {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth
          .getSession();

      if (!session) {
        router.replace(
          "/login"
        );

        return;
      }

      const response =
        await fetch(
          "/api/users/reset-password",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify({
                user_id:
                  user.id,
              }),
          }
        );

      const data =
        (await response.json()) as ResetPasswordResponse;

      if (
        !response.ok ||
        !data.success
      ) {
        setUserActionError(
          data.error ??
            "Unable to reset the password."
        );

        return;
      }

      setTemporaryPassword(
        data.temporary_password ??
          ""
      );

      setCreatedUsername(
        data.user
          ?.username ??
          user.username
      );

      setNotification(
        "Changes saved"
      );

      await loadUsers(
        false
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (
      resetError
    ) {
      console.error(
        "Reset password:",
        resetError
      );

      setUserActionError(
        "Unable to reset the password. Please try again."
      );
    } finally {
      setResettingUserId(
        ""
      );
    }
  }

  // ==========================================================
  // ENABLE / DISABLE USER
  // ==========================================================

  async function handleSetActive(
    user: BusinessUser
  ) {
    const nextStatus =
      !user.is_active;

    const displayName =
      user.full_name ??
      user.username;

    const action =
      nextStatus
        ? "enable"
        : "disable";

    const confirmed =
      window.confirm(
        nextStatus
          ? `Enable ${displayName}'s account? They will be able to sign in again.`
          : `Disable ${displayName}'s account? They will no longer be allowed to sign in.`
      );

    if (!confirmed) {
      return;
    }

    setUserActionError("");
    setNotification("");
    setTemporaryPassword("");
    setCreatedUsername("");
    setCopied(false);

    setUpdatingUserId(
      user.id
    );

    try {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth
          .getSession();

      if (!session) {
        router.replace(
          "/login"
        );

        return;
      }

      const response =
        await fetch(
          "/api/users/set-active",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify({
                user_id:
                  user.id,

                is_active:
                  nextStatus,
              }),
          }
        );

      const data =
        (await response.json()) as SetActiveResponse;

      if (
        !response.ok ||
        !data.success
      ) {
        setUserActionError(
          data.error ??
            `Unable to ${action} the account.`
        );

        return;
      }

      setNotification(
        "Changes saved"
      );

      await loadUsers(
        false
      );
    } catch (
      statusError
    ) {
      console.error(
        "Account status:",
        statusError
      );

      setUserActionError(
        "Unable to update the account. Please try again."
      );
    } finally {
      setUpdatingUserId(
        ""
      );
    }
  }

  // ==========================================================
  // COPY TEMP PASSWORD
  // ==========================================================

  async function copyTemporaryPassword() {
    if (
      !temporaryPassword
    ) {
      return;
    }

    try {
      await navigator.clipboard
        .writeText(
          temporaryPassword
        );

      setCopied(true);

      window.setTimeout(
        () => {
          setCopied(false);
        },
        2000
      );
    } catch (
      copyError
    ) {
      console.error(
        "Copy password:",
        copyError
      );
    }
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <FinancePageShell
        eyebrow="Settings"
        title="Users & Access"
        description="Manage who can access Djallows Farm."
      >
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-100 border-t-[#0b5136]" />

          <p className="mt-4 text-sm text-slate-500">
            Loading users...
          </p>
        </div>
      </FinancePageShell>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <FinancePageShell
        eyebrow="Settings"
        title="Users & Access"
        description="Manage who can access Djallows Farm."
      >
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-800">
            Unable to load
            Users & Access
          </p>

          <p className="mt-2 text-sm text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadUsers()
            }
            className="mt-5 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Try Again
          </button>
        </div>
      </FinancePageShell>
    );
  }

  const isSuperAdmin =
    currentUser
      ?.is_super_admin ===
    true;

  // ==========================================================
  // PERMISSION TO ENABLE / DISABLE
  // ==========================================================

  function canManageStatus(
    user: BusinessUser
  ) {
    if (isSuperAdmin) {
      return true;
    }

    if (
      currentUser
        ?.business_role !==
      "admin"
    ) {
      return false;
    }

    if (
      user.id ===
      currentUser.id
    ) {
      return false;
    }

    return (
      user.role === "staff" ||
      user.role === "viewer"
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <FinancePageShell
      eyebrow="Settings"
      title="Users & Access"
      description="Create and manage login accounts for Djallows Farm."
      recordText={
        users.length === 1
          ? "1 user"
          : `${users.length} users`
      }
    >
      {/* SUCCESS POPUP */}

      {notification && (
        <div className="fixed right-5 top-5 z-[100] flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-5 py-4 text-sm font-bold text-emerald-800 shadow-xl">
          <CheckCircle2
            size={20}
            className="shrink-0 text-emerald-600"
          />

          {notification}
        </div>
      )}

      <div className="space-y-6">
        {/* BACK */}

        <div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b5136] hover:underline"
          >
            <ArrowLeft
              size={17}
            />

            Back to Settings
          </Link>
        </div>

        {/* SUMMARY */}

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            icon={
              <Users
                size={22}
              />
            }
            label="Farm Users"
            value={String(
              users.length
            )}
            detail="Login accounts assigned to Djallows Farm"
          />

          <SummaryCard
            icon={
              <ShieldCheck
                size={22}
              />
            }
            label="Your Access"
            value={
              isSuperAdmin
                ? "Super Admin"
                : "Admin"
            }
            detail={
              isSuperAdmin
                ? "Full platform control"
                : "Farm user management"
            }
            compactValue
          />

          <SummaryCard
            icon={
              <UserPlus
                size={22}
              />
            }
            label="Additional Users"
            value={`${userLimit.used} of ${userLimit.maximum}`}
            detail={`${userLimit.remaining} remaining`}
          />
        </div>

        {/* TEMP PASSWORD */}

        {temporaryPassword && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <KeyRound
                  size={22}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-bold text-amber-950">
                  Temporary login
                  password
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Give these login
                  details to the user.
                  They must create
                  their own password
                  after first login.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-amber-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Username
                    </p>

                    <p className="mt-1 break-all font-mono text-base font-bold text-slate-900">
                      {
                        createdUsername
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Temporary
                      Password
                    </p>

                    <div className="mt-1 flex items-center justify-between gap-3">
                      <p className="break-all font-mono text-base font-bold text-slate-900">
                        {
                          temporaryPassword
                        }
                      </p>

                      <button
                        type="button"
                        onClick={
                          copyTemporaryPassword
                        }
                        className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                      >
                        <Copy
                          size={15}
                        />

                        {copied
                          ? "Copied"
                          : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CREATE USER */}

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#0b5136]">
              <UserPlus
                size={22}
              />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Create User
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Create a username
                and temporary
                password for an
                authorised Djallows
                Farm user.
              </p>
            </div>
          </div>

          <form
            onSubmit={
              handleCreateUser
            }
            className="mt-6"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="full-name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Full name
                </label>

                <div className="flex items-center rounded-xl border border-slate-200 px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                  <UserRound
                    size={18}
                    className="text-slate-400"
                  />

                  <input
                    id="full-name"
                    required
                    value={
                      fullName
                    }
                    onChange={(
                      event
                    ) =>
                      setFullName(
                        event.target
                          .value
                      )
                    }
                    placeholder="e.g. Ebrima Jallow"
                    className="w-full bg-transparent px-3 py-3.5 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Username
                </label>

                <div className="flex items-center rounded-xl border border-slate-200 px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                  <UserRound
                    size={18}
                    className="text-slate-400"
                  />

                  <input
                    id="username"
                    required
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
                    placeholder="e.g. ebrima"
                    className="w-full bg-transparent px-3 py-3.5 text-sm outline-none"
                  />
                </div>

                <p className="mt-1.5 text-xs text-slate-400">
                  At least 3
                  characters. No
                  spaces.
                </p>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Phone

                  <span className="ml-1 font-normal text-slate-400">
                    Optional
                  </span>
                </label>

                <div className="flex items-center rounded-xl border border-slate-200 px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                  <Phone
                    size={18}
                    className="text-slate-400"
                  />

                  <input
                    id="phone"
                    type="tel"
                    value={
                      phone
                    }
                    onChange={(
                      event
                    ) =>
                      setPhone(
                        event.target
                          .value
                      )
                    }
                    placeholder="+220 ..."
                    className="w-full bg-transparent px-3 py-3.5 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="role"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Role
                </label>

                <select
                  id="role"
                  value={role}
                  onChange={(
                    event
                  ) =>
                    setRole(
                      event.target
                        .value as UserRole
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  {isSuperAdmin && (
                    <option value="admin">
                      Admin
                    </option>
                  )}

                  <option value="staff">
                    Staff
                  </option>

                  <option value="viewer">
                    Viewer
                  </option>
                </select>

                <RoleDescription
                  role={role}
                />
              </div>
            </div>

            {formError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={
                  saving
                }
                className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-[#0b5136] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#083f2a] disabled:opacity-60"
              >
                {saving ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <UserPlus
                    size={18}
                  />
                )}

                {saving
                  ? "Creating..."
                  : "Create User"}
              </button>
            </div>
          </form>
        </div>

        {/* USER ACTION ERROR */}

        {userActionError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {userActionError}
          </div>
        )}

        {/* USERS */}

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Users
                  size={22}
                />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Djallows Farm Users
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Accounts with access
                  to this business.
                </p>
              </div>
            </div>
          </div>

          {users.length ===
          0 ? (
            <div className="p-10 text-center">
              <Users
                size={30}
                className="mx-auto text-slate-400"
              />

              <h3 className="mt-4 font-bold text-slate-900">
                No farm users created yet
              </h3>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map(
                (user) => (
                  <div
                    key={
                      user.id
                    }
                    className="p-5 sm:p-6"
                  >
                    <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
                      {/* USER */}

                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 font-bold text-[#0b5136]">
                          {(
                            user.full_name ??
                            user.username
                          )
                            .slice(
                              0,
                              1
                            )
                            .toUpperCase()}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-900">
                              {user.full_name ??
                                user.username}
                            </p>

                            <RoleBadge
                              role={
                                user.role
                              }
                            />

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                user.is_active
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {user.is_active
                                ? "Active"
                                : "Disabled"}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-slate-500">
                            Username:{" "}
                            <span className="font-semibold text-slate-700">
                              {
                                user.username
                              }
                            </span>
                          </p>

                          {user.phone && (
                            <p className="mt-1 text-sm text-slate-500">
                              {
                                user.phone
                              }
                            </p>
                          )}

                          {user.must_change_password && (
                            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              <KeyRound
                                size={13}
                              />

                              Temporary password active
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ACTIONS */}

                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <span className="mr-1 text-xs font-medium text-slate-400">
                          {user.role ===
                          "admin"
                            ? "Farm Administrator"
                            : user.role ===
                                "viewer"
                              ? "Read Only"
                              : "Farm User"}
                        </span>

                        {/* RESET PASSWORD */}

                        {isSuperAdmin && (
                          <button
                            type="button"
                            disabled={
                              resettingUserId ===
                              user.id
                            }
                            onClick={() =>
                              void handleResetPassword(
                                user
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                          >
                            {resettingUserId ===
                            user.id ? (
                              <Loader2
                                size={15}
                                className="animate-spin"
                              />
                            ) : (
                              <KeyRound
                                size={15}
                              />
                            )}

                            Reset Password
                          </button>
                        )}

                        {/* ENABLE / DISABLE */}

                        {canManageStatus(
                          user
                        ) && (
                          <button
                            type="button"
                            disabled={
                              updatingUserId ===
                              user.id
                            }
                            onClick={() =>
                              void handleSetActive(
                                user
                              )
                            }
                            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition disabled:opacity-60 ${
                              user.is_active
                                ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {updatingUserId ===
                            user.id ? (
                              <Loader2
                                size={15}
                                className="animate-spin"
                              />
                            ) : user.is_active ? (
                              <UserX
                                size={15}
                              />
                            ) : (
                              <UserCheck
                                size={15}
                              />
                            )}

                            {updatingUserId ===
                            user.id
                              ? "Updating..."
                              : user.is_active
                                ? "Disable"
                                : "Enable"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </FinancePageShell>
  );
}

// ============================================================
// ROLE DESCRIPTION
// ============================================================

function RoleDescription({
  role,
}: {
  role: UserRole;
}) {
  if (
    role === "admin"
  ) {
    return (
      <p className="mt-1.5 text-xs leading-5 text-slate-400">
        Admin can manage farm
        operations and create Staff
        or Viewer accounts.
      </p>
    );
  }

  if (
    role === "viewer"
  ) {
    return (
      <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-5 text-slate-400">
        <Eye
          size={14}
          className="mt-0.5 shrink-0"
        />

        Viewer has read-only access
        and cannot create, edit or
        delete records.
      </p>
    );
  }

  return (
    <p className="mt-1.5 text-xs leading-5 text-slate-400">
      Staff can record normal farm
      transactions but cannot manage
      users or payroll.
    </p>
  );
}

// ============================================================
// ROLE BADGE
// ============================================================

function RoleBadge({
  role,
}: {
  role: UserRole;
}) {
  if (
    role === "admin"
  ) {
    return (
      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
        Admin
      </span>
    );
  }

  if (
    role === "viewer"
  ) {
    return (
      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
        Viewer
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
      Staff
    </span>
  );
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  icon,
  label,
  value,
  detail,
  compactValue = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  compactValue?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p
            className={`mt-2 font-bold tracking-tight text-slate-900 ${
              compactValue
                ? "whitespace-nowrap text-xl xl:text-2xl"
                : "text-2xl"
            }`}
          >
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#0b5136]">
          {icon}
        </div>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {detail}
      </p>
    </div>
  );
}