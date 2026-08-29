"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  Banknote,
  ChevronRight,
  Loader2,
  Plus,
  ReceiptText,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import AppNotification from "@/components/AppNotification";
import BusinessSignatureSettings from "@/components/BusinessSignatureSettings";
import FinancePageShell from "@/components/FinancePageShell";
import { supabase } from "@/lib/supabase";

// ============================================================
// TYPES
// ============================================================

type Membership = {
  business_id: string;
};

type Category = {
  id: string;
  name: string;
  category_type:
    | "income"
    | "expense";
  active: boolean;
};

// ============================================================
// PAGE
// ============================================================

export default function SettingsPage() {
  const router = useRouter();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    savingIncome,
    setSavingIncome,
  ] = useState(false);

  const [
    savingExpense,
    setSavingExpense,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    notification,
    setNotification,
  ] = useState("");

  const [
    businessId,
    setBusinessId,
  ] = useState("");

  const [
    categories,
    setCategories,
  ] =
    useState<Category[]>([]);

  const [
    newIncomeSource,
    setNewIncomeSource,
  ] = useState("");

  const [
    newExpenseCategory,
    setNewExpenseCategory,
  ] = useState("");

  // ==========================================================
  // LOAD CATEGORIES
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        setLoading(true);
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

        const {
          data:
            membershipData,
          error:
            membershipError,
        } =
          await supabase
            .from(
              "business_members"
            )
            .select(
              "business_id"
            )
            .eq(
              "user_id",
              session.user.id
            )
            .limit(1)
            .maybeSingle();

        if (
          membershipError ||
          !membershipData
        ) {
          throw new Error(
            "Unable to find your Djallows Farm business access."
          );
        }

        const membership =
          membershipData as Membership;

        if (!active) {
          return;
        }

        setBusinessId(
          membership.business_id
        );

        const {
          data:
            categoryRows,
          error:
            categoryError,
        } =
          await supabase
            .from(
              "categories"
            )
            .select(
              `
              id,
              name,
              category_type,
              active
            `
            )
            .eq(
              "business_id",
              membership.business_id
            )
            .in(
              "category_type",
              [
                "income",
                "expense",
              ]
            )
            .order(
              "name",
              {
                ascending:
                  true,
              }
            );

        if (
          categoryError
        ) {
          throw new Error(
            `Unable to load categories: ${categoryError.message}`
          );
        }

        if (!active) {
          return;
        }

        setCategories(
          (
            categoryRows ??
            []
          ) as Category[]
        );

        setLoading(false);
      } catch (
        loadError
      ) {
        console.error(
          loadError
        );

        if (active) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load settings."
          );

          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, [router]);

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
        3000
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [notification]);

  // ==========================================================
  // LISTS
  // ==========================================================

  const incomeSources =
    useMemo(
      () =>
        categories.filter(
          (category) =>
            category.category_type ===
            "income"
        ),
      [categories]
    );

  const expenseCategories =
    useMemo(
      () =>
        categories.filter(
          (category) =>
            category.category_type ===
            "expense"
        ),
      [categories]
    );

  // ==========================================================
  // ADD CATEGORY
  // ==========================================================

  async function addCategory(
    event:
      FormEvent<HTMLFormElement>,
    type:
      | "income"
      | "expense"
  ) {
    event.preventDefault();

    const name =
      type === "income"
        ? newIncomeSource.trim()
        : newExpenseCategory.trim();

    if (!name) {
      setError(
        type === "income"
          ? "Please enter an income source."
          : "Please enter an expense category."
      );

      return;
    }

    const duplicate =
      categories.some(
        (category) =>
          category.category_type ===
            type &&
          category.name
            .trim()
            .toLowerCase() ===
            name.toLowerCase()
      );

    if (duplicate) {
      setError(
        `"${name}" already exists.`
      );

      return;
    }

    try {
      setError("");

      if (
        type === "income"
      ) {
        setSavingIncome(
          true
        );
      } else {
        setSavingExpense(
          true
        );
      }

      const {
        data:
          insertedCategory,
        error:
          insertError,
      } =
        await supabase
          .from(
            "categories"
          )
          .insert({
            business_id:
              businessId,

            name,

            category_type:
              type,

            active: true,
          })
          .select(
            `
            id,
            name,
            category_type,
            active
          `
          )
          .single();

      if (
        insertError
      ) {
        throw new Error(
          insertError.message
        );
      }

      if (
        insertedCategory
      ) {
        setCategories(
          (current) =>
            [
              ...current,
              insertedCategory as Category,
            ].sort(
              (
                a,
                b
              ) =>
                a.name.localeCompare(
                  b.name
                )
            )
        );
      }

      if (
        type === "income"
      ) {
        setNewIncomeSource(
          ""
        );

        setSavingIncome(
          false
        );

        setNotification(
          "Saved successfully"
        );
      } else {
        setNewExpenseCategory(
          ""
        );

        setSavingExpense(
          false
        );

        setNotification(
          "Saved successfully"
        );
      }
    } catch (
      saveError
    ) {
      console.error(
        saveError
      );

      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "Unable to save category."
      );

      setSavingIncome(
        false
      );

      setSavingExpense(
        false
      );
    }
  }

  // ==========================================================
  // ACTIVE / INACTIVE
  // ==========================================================

  async function toggleCategory(
    category: Category
  ) {
    try {
      setError("");

      const newActive =
        !category.active;

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "categories"
          )
          .update({
            active:
              newActive,
          })
          .eq(
            "id",
            category.id
          );

      if (
        updateError
      ) {
        throw new Error(
          updateError.message
        );
      }

      setCategories(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              category.id
                ? {
                    ...item,

                    active:
                      newActive,
                  }
                : item
          )
      );

      setNotification(
        "Changes saved"
      );
    } catch (
      updateError
    ) {
      console.error(
        updateError
      );

      setError(
        updateError instanceof
          Error
          ? updateError.message
          : "Unable to update category."
      );
    }
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#edf3ef]">
        <div className="text-center">
          <Loader2
            size={32}
            className="mx-auto animate-spin text-[#0b5136]"
          />

          <p className="mt-4 text-[16px] font-semibold text-slate-600">
            Loading settings...
          </p>
        </div>
      </main>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <FinancePageShell
      eyebrow="App Settings"
      title="Income & Expense Categories"
      description="Manage the simple income sources and expense categories used when recording Djallows Farm transactions."
      recordText={`${incomeSources.length + expenseCategories.length} categories`}
    >
      {/* SHARED SUCCESS NOTIFICATION */}

      <AppNotification
        message={
          notification
        }
        onClose={() =>
          setNotification(
            ""
          )
        }
      />

      {/* ERROR */}

      {error && (
        <div className="mb-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-[15px] font-semibold text-red-800">
          {error}
        </div>
      )}

      {/* ======================================================
          SIMPLE EXPLANATION
      ====================================================== */}

      <section className="rounded-[24px] border border-white bg-white p-5 shadow-sm sm:p-6">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#0b5136]">
            <Settings
              size={
                23
              }
            />
          </div>

          <div>
            <h2 className="text-[20px] font-bold text-slate-950">
              Keep the categories simple
            </h2>

            <p className="mt-2 max-w-4xl text-[15px] leading-6 text-slate-600">
              These categories allow
              the Dashboard and Reports
              to show where income came
              from and how much was spent
              on Feed, Medication,
              Payroll, Transport,
              Electricity and other farm
              expenses.
            </p>
          </div>
        </div>
      </section>

            {/* ======================================================
          OFFICIAL DOCUMENT SIGNATURE
      ====================================================== */}

      <BusinessSignatureSettings businessId={businessId} />

      {/* ======================================================
          USERS & ACCESS
      ====================================================== */}

      <section className="mt-5 overflow-hidden rounded-[24px] border border-emerald-100 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#0b5136]">
              <UsersRound
                size={
                  23
                }
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck
                  size={
                    15
                  }
                  className="text-emerald-700"
                />

                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                  Access Control
                </p>
              </div>

              <h2 className="mt-1 text-[20px] font-bold text-slate-950">
                Users & Access
              </h2>

              <p className="mt-1 max-w-2xl text-[14px] leading-6 text-slate-600">
                Create login accounts,
                manage Admin, Staff and
                Viewer access, reset
                passwords and disable or
                enable user accounts.
              </p>
            </div>
          </div>

          <Link
            href="/settings/users"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0b5136] px-5 py-3 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#083c29]"
          >
            Manage Users

            <ChevronRight
              size={
                17
              }
            />
          </Link>
        </div>
      </section>

      {/* ======================================================
          TWO CATEGORY SECTIONS
      ====================================================== */}

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {/* ====================================================
            INCOME SOURCES
        ==================================================== */}

        <section className="overflow-hidden rounded-[26px] border border-white bg-white shadow-[0_12px_35px_rgba(15,23,42,0.07)]">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-[#0b5136]">
                <Banknote
                  size={
                    21
                  }
                />
              </div>

              <div>
                <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                  Money Coming In
                </p>

                <h2 className="mt-1 text-[21px] font-bold text-slate-950">
                  Income Sources
                </h2>
              </div>
            </div>
          </div>

          {/* ADD INCOME SOURCE */}

          <form
            onSubmit={(
              event
            ) =>
              addCategory(
                event,
                "income"
              )
            }
            className="border-b border-slate-200 bg-[#f8faf9] p-5 sm:p-6"
          >
            <label className="block">
              <span className="mb-2 block text-[15px] font-bold text-slate-800">
                Add Income Source
              </span>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={
                    newIncomeSource
                  }
                  onChange={(
                    event
                  ) =>
                    setNewIncomeSource(
                      event.target
                        .value
                    )
                  }
                  placeholder="Example: Farm Tours"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                />

                <button
                  type="submit"
                  disabled={
                    savingIncome
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b5136] px-5 py-3.5 text-[15px] font-bold text-white disabled:opacity-60"
                >
                  {savingIncome ? (
                    <Loader2
                      size={
                        18
                      }
                      className="animate-spin"
                    />
                  ) : (
                    <Plus
                      size={
                        18
                      }
                    />
                  )}

                  Add
                </button>
              </div>
            </label>
          </form>

          {/* LIST */}

          <div className="divide-y divide-slate-200">
            {incomeSources.map(
              (
                category
              ) => (
                <CategoryRow
                  key={
                    category.id
                  }
                  category={
                    category
                  }
                  onToggle={() =>
                    toggleCategory(
                      category
                    )
                  }
                />
              )
            )}
          </div>
        </section>

        {/* ====================================================
            EXPENSE CATEGORIES
        ==================================================== */}

        <section className="overflow-hidden rounded-[26px] border border-white bg-white shadow-[0_12px_35px_rgba(15,23,42,0.07)]">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <ReceiptText
                  size={
                    21
                  }
                />
              </div>

              <div>
                <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                  Money Going Out
                </p>

                <h2 className="mt-1 text-[21px] font-bold text-slate-950">
                  Expense Categories
                </h2>
              </div>
            </div>
          </div>

          {/* ADD EXPENSE */}

          <form
            onSubmit={(
              event
            ) =>
              addCategory(
                event,
                "expense"
              )
            }
            className="border-b border-slate-200 bg-[#f8faf9] p-5 sm:p-6"
          >
            <label className="block">
              <span className="mb-2 block text-[15px] font-bold text-slate-800">
                Add Expense Category
              </span>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={
                    newExpenseCategory
                  }
                  onChange={(
                    event
                  ) =>
                    setNewExpenseCategory(
                      event.target
                        .value
                    )
                  }
                  placeholder="Example: Water"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                />

                <button
                  type="submit"
                  disabled={
                    savingExpense
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b5136] px-5 py-3.5 text-[15px] font-bold text-white disabled:opacity-60"
                >
                  {savingExpense ? (
                    <Loader2
                      size={
                        18
                      }
                      className="animate-spin"
                    />
                  ) : (
                    <Plus
                      size={
                        18
                      }
                    />
                  )}

                  Add
                </button>
              </div>
            </label>
          </form>

          {/* LIST */}

          <div className="divide-y divide-slate-200">
            {expenseCategories.map(
              (
                category
              ) => (
                <CategoryRow
                  key={
                    category.id
                  }
                  category={
                    category
                  }
                  onToggle={() =>
                    toggleCategory(
                      category
                    )
                  }
                />
              )
            )}
          </div>
        </section>
      </div>
    </FinancePageShell>
  );
}

// ============================================================
// CATEGORY ROW
// ============================================================

function CategoryRow({
  category,
  onToggle,
}: {
  category: Category;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
      <div>
        <p
          className={`text-[15px] font-bold ${
            category.active
              ? "text-slate-950"
              : "text-slate-500"
          }`}
        >
          {
            category.name
          }
        </p>

        <p className="mt-1 text-[13px] font-medium text-slate-500">
          {category.active
            ? "Available when recording new transactions"
            : "Hidden from new transactions"}
        </p>
      </div>

      <button
        type="button"
        onClick={
          onToggle
        }
        className={`rounded-xl px-4 py-2 text-[13px] font-bold transition ${
          category.active
            ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
        }`}
      >
        {category.active
          ? "Hide"
          : "Activate"}
      </button>
    </div>
  );
}

