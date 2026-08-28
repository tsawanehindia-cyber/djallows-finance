"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  Banknote,
  CalendarDays,
  CircleGauge,
  FileText,
  Loader2,
  Pencil,
  Search,
  Smartphone,
  Tags,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import AppNotification from "@/components/AppNotification";
import FinancePageShell from "@/components/FinancePageShell";

import { supabase } from "@/lib/supabase";

// ============================================================
// TYPES
// ============================================================

type MemberRole =
  | "owner"
  | "admin"
  | "staff";

type IncomeTransaction = {
  id: string;
  transaction_number: string;
  transaction_date: string;
  description: string;
  amount: number;
  category_id: string | null;
  account_id: string | null;
  payment_method: string | null;
  notes: string | null;
  created_by: string | null;
};

type Category = {
  id: string;
  name: string;
  active: boolean;
};

type Account = {
  id: string;
  name: string;
  account_type: string;
  active: boolean;
};

type Membership = {
  business_id: string;
  role: MemberRole;
};

type CategorySummary = {
  id: string;
  name: string;
  value: number;
};

// ============================================================
// HELPERS
// ============================================================

function money(amount: number) {
  return `GMD ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(
  dateString: string
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(
    new Date(dateString)
  );
}

function dateInputValue(
  dateString: string
) {
  return dateString.slice(
    0,
    10
  );
}

// ============================================================
// PAGE
// ============================================================

export default function IncomePage() {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    businessId,
    setBusinessId,
  ] = useState("");

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState("");

  const [
    memberRole,
    setMemberRole,
  ] =
    useState<MemberRole>(
      "staff"
    );

  const [
    transactions,
    setTransactions,
  ] =
    useState<
      IncomeTransaction[]
    >([]);

  const [
    categories,
    setCategories,
  ] =
    useState<Category[]>(
      []
    );

  const [
    accounts,
    setAccounts,
  ] =
    useState<Account[]>(
      []
    );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    categoryFilter,
    setCategoryFilter,
  ] =
    useState("all");

  const [
    accountFilter,
    setAccountFilter,
  ] =
    useState("all");

  // ==========================================================
  // NOTIFICATION
  // ==========================================================

  const [
    notification,
    setNotification,
  ] = useState("");

  useEffect(() => {
    if (!notification) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setNotification("");
        },
        3000
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [notification]);

  // ==========================================================
  // SELECTED RECORDS
  // ==========================================================

  const [
    selectedIds,
    setSelectedIds,
  ] =
    useState<Set<string>>(
      new Set()
    );

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  // ==========================================================
  // EDIT STATE
  // ==========================================================

  const [
    editingTransaction,
    setEditingTransaction,
  ] =
    useState<
      IncomeTransaction | null
    >(null);

  const [
    editDate,
    setEditDate,
  ] = useState("");

  const [
    editCategoryId,
    setEditCategoryId,
  ] = useState("");

  const [
    editDescription,
    setEditDescription,
  ] = useState("");

  const [
    editAmount,
    setEditAmount,
  ] = useState("");

  const [
    editAccountId,
    setEditAccountId,
  ] = useState("");

  const [
    editNotes,
    setEditNotes,
  ] = useState("");

  const [
    editError,
    setEditError,
  ] = useState("");

  const [
    savingEdit,
    setSavingEdit,
  ] = useState(false);

  // ==========================================================
  // PERMISSIONS
  // ==========================================================

  const isOwnerOrAdmin =
    memberRole ===
      "owner" ||
    memberRole ===
      "admin";

  function canEditTransaction(
    transaction:
      IncomeTransaction
  ) {
    if (isOwnerOrAdmin) {
      return true;
    }

    return (
      memberRole ===
        "staff" &&
      transaction.created_by ===
        currentUserId
    );
  }

  // ==========================================================
  // LOAD INCOME DATA
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadIncome() {
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

        // ----------------------------------------------------
        // BUSINESS MEMBERSHIP + ROLE
        // ----------------------------------------------------

        const {
          data:
            membershipData,
          error:
            membershipError,
        } = await supabase
          .from(
            "business_members"
          )
          .select(
            "business_id, role"
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

        // ----------------------------------------------------
        // INCOME TRANSACTIONS
        // ----------------------------------------------------

        const {
          data:
            transactionRows,
          error:
            transactionError,
        } = await supabase
          .from(
            "transactions"
          )
          .select(
            `
            id,
            transaction_number,
            transaction_date,
            description,
            amount,
            category_id,
            account_id,
            payment_method,
            notes,
            created_by
          `
          )
          .eq(
            "business_id",
            membership.business_id
          )
          .eq(
            "transaction_type",
            "income"
          )
          .order(
            "transaction_date",
            {
              ascending:
                false,
            }
          );

        if (
          transactionError
        ) {
          throw new Error(
            `Unable to load income records: ${transactionError.message}`
          );
        }

        // ----------------------------------------------------
        // INCOME SOURCES
        // ----------------------------------------------------

        const {
          data:
            categoryRows,
          error:
            categoryError,
        } = await supabase
          .from(
            "categories"
          )
          .select(
            "id, name, active"
          )
          .eq(
            "business_id",
            membership.business_id
          )
          .eq(
            "category_type",
            "income"
          )
          .order("name");

        if (
          categoryError
        ) {
          throw new Error(
            `Unable to load income sources: ${categoryError.message}`
          );
        }

        // ----------------------------------------------------
        // ACCOUNTS
        // ----------------------------------------------------

        const {
          data:
            accountRows,
          error:
            accountError,
        } = await supabase
          .from(
            "financial_accounts"
          )
          .select(
            `
            id,
            name,
            account_type,
            active
          `
          )
          .eq(
            "business_id",
            membership.business_id
          )
          .order("name");

        if (
          accountError
        ) {
          throw new Error(
            `Unable to load financial accounts: ${accountError.message}`
          );
        }

        if (!active) {
          return;
        }

        setBusinessId(
          membership.business_id
        );

        setCurrentUserId(
          session.user.id
        );

        setMemberRole(
          membership.role
        );

        setTransactions(
          (
            transactionRows ??
            []
          ).map(
            (row) => ({
              id:
                row.id,

              transaction_number:
                row.transaction_number,

              transaction_date:
                row.transaction_date,

              description:
                row.description ??
                "",

              amount:
                Number(
                  row.amount ??
                    0
                ),

              category_id:
                row.category_id,

              account_id:
                row.account_id,

              payment_method:
                row.payment_method,

              notes:
                row.notes,

              created_by:
                row.created_by,
            })
          )
        );

        setCategories(
          (
            categoryRows ??
            []
          ).map(
            (row) => ({
              id:
                row.id,

              name:
                row.name,

              active:
                row.active ??
                true,
            })
          )
        );

        setAccounts(
          (
            accountRows ??
            []
          ).map(
            (row) => ({
              id:
                row.id,

              name:
                row.name,

              account_type:
                row.account_type,

              active:
                row.active ??
                true,
            })
          )
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
              : "Unable to load income records."
          );

          setLoading(false);
        }
      }
    }

    loadIncome();

    return () => {
      active = false;
    };
  }, [router]);

  // ==========================================================
  // MAPS
  // ==========================================================

  const categoryMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          string
        >();

      categories.forEach(
        (category) => {
          map.set(
            category.id,
            category.name
          );
        }
      );

      return map;
    }, [categories]);

  const accountMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          string
        >();

      accounts.forEach(
        (account) => {
          map.set(
            account.id,
            account.name
          );
        }
      );

      return map;
    }, [accounts]);

  // ==========================================================
  // FILTERING
  // ==========================================================

  const filteredTransactions =
    useMemo(() => {
      const searchText =
        search
          .trim()
          .toLowerCase();

      return transactions.filter(
        (
          transaction
        ) => {
          const category =
            transaction.category_id
              ? categoryMap.get(
                  transaction.category_id
                ) ?? ""
              : "";

          const account =
            transaction.account_id
              ? accountMap.get(
                  transaction.account_id
                ) ?? ""
              : "";

          const matchesSearch =
            !searchText ||
            transaction.description
              .toLowerCase()
              .includes(
                searchText
              ) ||
            transaction.transaction_number
              .toLowerCase()
              .includes(
                searchText
              ) ||
            category
              .toLowerCase()
              .includes(
                searchText
              ) ||
            account
              .toLowerCase()
              .includes(
                searchText
              ) ||
            (
              transaction.notes ??
              ""
            )
              .toLowerCase()
              .includes(
                searchText
              );

          const matchesCategory =
            categoryFilter ===
              "all" ||
            transaction.category_id ===
              categoryFilter;

          const matchesAccount =
            accountFilter ===
              "all" ||
            transaction.account_id ===
              accountFilter;

          return (
            matchesSearch &&
            matchesCategory &&
            matchesAccount
          );
        }
      );
    }, [
      transactions,
      search,
      categoryFilter,
      accountFilter,
      categoryMap,
      accountMap,
    ]);

  // ==========================================================
  // NUMBERS
  // ==========================================================

  const totalIncome =
    useMemo(() => {
      return filteredTransactions.reduce(
        (
          total,
          transaction
        ) =>
          total +
          transaction.amount,
        0
      );
    }, [
      filteredTransactions,
    ]);

  const averageIncome =
    filteredTransactions.length >
    0
      ? totalIncome /
        filteredTransactions.length
      : 0;

  const latestIncome =
    filteredTransactions[
      0
    ] ?? null;

  const largestIncome =
    useMemo(() => {
      if (
        filteredTransactions.length ===
        0
      ) {
        return null;
      }

      return [
        ...filteredTransactions,
      ].sort(
        (a, b) =>
          b.amount -
          a.amount
      )[0];
    }, [
      filteredTransactions,
    ]);

  // ==========================================================
  // CATEGORY SUMMARY
  // ==========================================================

  const categorySummary =
    useMemo<
      CategorySummary[]
    >(() => {
      const map =
        new Map<
          string,
          CategorySummary
        >();

      filteredTransactions.forEach(
        (
          transaction
        ) => {
          const id =
            transaction.category_id ??
            "uncategorised";

          const name =
            transaction.category_id
              ? categoryMap.get(
                  transaction.category_id
                ) ??
                "Uncategorised"
              : "Uncategorised";

          const current =
            map.get(id);

          if (current) {
            current.value +=
              transaction.amount;
          } else {
            map.set(id, {
              id,
              name,
              value:
                transaction.amount,
            });
          }
        }
      );

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          b.value -
          a.value
      );
    }, [
      filteredTransactions,
      categoryMap,
    ]);

  const highestIncomeSource =
    categorySummary[0] ??
    null;

  // ==========================================================
  // MAIN RECEIVING ACCOUNT
  // ==========================================================

  const mainReceivingAccount =
    useMemo(() => {
      const counts =
        new Map<
          string,
          number
        >();

      filteredTransactions.forEach(
        (
          transaction
        ) => {
          if (
            !transaction.account_id
          ) {
            return;
          }

          counts.set(
            transaction.account_id,
            (
              counts.get(
                transaction.account_id
              ) ?? 0
            ) + 1
          );
        }
      );

      const result =
        Array.from(
          counts.entries()
        ).sort(
          (a, b) =>
            b[1] - a[1]
        )[0];

      if (!result) {
        return "—";
      }

      return (
        accountMap.get(
          result[0]
        ) ?? "—"
      );
    }, [
      filteredTransactions,
      accountMap,
    ]);

  // ==========================================================
  // SELECTION
  // ==========================================================

  const allVisibleSelected =
    filteredTransactions.length >
      0 &&
    filteredTransactions.every(
      (transaction) =>
        selectedIds.has(
          transaction.id
        )
    );

  function toggleSelected(
    id: string
  ) {
    setSelectedIds(
      (current) => {
        const next =
          new Set(
            current
          );

        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }

        return next;
      }
    );
  }

  function toggleSelectAll() {
    setSelectedIds(
      (current) => {
        const next =
          new Set(
            current
          );

        if (
          allVisibleSelected
        ) {
          filteredTransactions.forEach(
            (
              transaction
            ) => {
              next.delete(
                transaction.id
              );
            }
          );
        } else {
          filteredTransactions.forEach(
            (
              transaction
            ) => {
              next.add(
                transaction.id
              );
            }
          );
        }

        return next;
      }
    );
  }

  // ==========================================================
  // OPEN EDIT
  // ==========================================================

  function openEdit(
    transaction:
      IncomeTransaction
  ) {
    if (
      !canEditTransaction(
        transaction
      )
    ) {
      return;
    }

    setEditingTransaction(
      transaction
    );

    setEditDate(
      dateInputValue(
        transaction.transaction_date
      )
    );

    setEditCategoryId(
      transaction.category_id ??
        ""
    );

    setEditDescription(
      transaction.description
    );

    setEditAmount(
      String(
        transaction.amount
      )
    );

    setEditAccountId(
      transaction.account_id ??
        ""
    );

    setEditNotes(
      transaction.notes ??
        ""
    );

    setEditError("");
  }

  function closeEdit() {
    if (savingEdit) {
      return;
    }

    setEditingTransaction(
      null
    );

    setEditError("");
  }

  // ==========================================================
  // SAVE EDIT
  // ==========================================================

  async function saveEdit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !editingTransaction ||
      !businessId
    ) {
      return;
    }

    if (
      !canEditTransaction(
        editingTransaction
      )
    ) {
      setEditError(
        "You do not have permission to edit this record."
      );

      return;
    }

    const description =
      editDescription.trim();

    const amount =
      Number(editAmount);

    if (!editDate) {
      setEditError(
        "Please select the date received."
      );

      return;
    }

    if (!editCategoryId) {
      setEditError(
        "Please select an income source."
      );

      return;
    }

    if (!description) {
      setEditError(
        "Please enter a description."
      );

      return;
    }

    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      setEditError(
        "Please enter a valid amount received."
      );

      return;
    }

    if (!editAccountId) {
      setEditError(
        "Please select where the money was received."
      );

      return;
    }

    const selectedAccount =
      accounts.find(
        (account) =>
          account.id ===
          editAccountId
      );

    if (!selectedAccount) {
      setEditError(
        "The selected account could not be found."
      );

      return;
    }

    try {
      setSavingEdit(true);
      setEditError("");
      setError("");

      const {
        data:
          updatedRow,
        error:
          updateError,
      } = await supabase
        .from(
          "transactions"
        )
        .update({
          transaction_date:
            `${editDate}T12:00:00`,

          category_id:
            editCategoryId,

          description,

          amount,

          account_id:
            editAccountId,

          payment_method:
            selectedAccount.name,

          notes:
            editNotes.trim() ||
            null,
        })
        .eq(
          "id",
          editingTransaction.id
        )
        .eq(
          "business_id",
          businessId
        )
        .eq(
          "transaction_type",
          "income"
        )
        .select(
          `
          id,
          transaction_number,
          transaction_date,
          description,
          amount,
          category_id,
          account_id,
          payment_method,
          notes,
          created_by
        `
        )
        .single();

      if (
        updateError ||
        !updatedRow
      ) {
        throw new Error(
          updateError?.message ||
            "Unable to save changes."
        );
      }

      const updatedTransaction:
        IncomeTransaction = {
          id:
            updatedRow.id,

          transaction_number:
            updatedRow.transaction_number,

          transaction_date:
            updatedRow.transaction_date,

          description:
            updatedRow.description ??
            "",

          amount:
            Number(
              updatedRow.amount ??
                0
            ),

          category_id:
            updatedRow.category_id,

          account_id:
            updatedRow.account_id,

          payment_method:
            updatedRow.payment_method,

          notes:
            updatedRow.notes,

          created_by:
            updatedRow.created_by,
        };

      setTransactions(
        (current) =>
          current
            .map(
              (transaction) =>
                transaction.id ===
                updatedTransaction.id
                  ? updatedTransaction
                  : transaction
            )
            .sort(
              (a, b) =>
                new Date(
                  b.transaction_date
                ).getTime() -
                new Date(
                  a.transaction_date
                ).getTime()
            )
      );

      setEditingTransaction(
        null
      );

      setNotification(
        "Changes saved"
      );
    } catch (
      saveError
    ) {
      console.error(
        saveError
      );

      setEditError(
        saveError instanceof
          Error
          ? saveError.message
          : "Unable to save changes."
      );
    } finally {
      setSavingEdit(false);
    }
  }

  // ==========================================================
  // DELETE ONE
  // ==========================================================

  async function deleteOne(
    transaction:
      IncomeTransaction
  ) {
    if (
      !isOwnerOrAdmin
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${transaction.description}"?\n\nThis action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError("");

      const {
        error:
          deleteError,
      } = await supabase
        .from(
          "transactions"
        )
        .delete()
        .eq(
          "id",
          transaction.id
        )
        .eq(
          "business_id",
          businessId
        )
        .eq(
          "transaction_type",
          "income"
        );

      if (deleteError) {
        throw new Error(
          deleteError.message
        );
      }

      setTransactions(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              transaction.id
          )
      );

      setSelectedIds(
        (current) => {
          const next =
            new Set(
              current
            );

          next.delete(
            transaction.id
          );

          return next;
        }
      );

      setNotification(
        "Deleted successfully"
      );
    } catch (
      deleteError
    ) {
      console.error(
        deleteError
      );

      setError(
        deleteError instanceof
          Error
          ? deleteError.message
          : "Unable to delete the record."
      );
    } finally {
      setDeleting(false);
    }
  }

  // ==========================================================
  // DELETE SELECTED
  // ==========================================================

  async function deleteSelected() {
    if (
      !isOwnerOrAdmin ||
      selectedIds.size ===
        0
    ) {
      return;
    }

    const ids =
      Array.from(
        selectedIds
      );

    const confirmed =
      window.confirm(
        `Delete ${ids.length} selected income record${
          ids.length === 1
            ? ""
            : "s"
        }?\n\nThis action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError("");

      const {
        error:
          deleteError,
      } = await supabase
        .from(
          "transactions"
        )
        .delete()
        .eq(
          "business_id",
          businessId
        )
        .eq(
          "transaction_type",
          "income"
        )
        .in(
          "id",
          ids
        );

      if (deleteError) {
        throw new Error(
          deleteError.message
        );
      }

      const idSet =
        new Set(ids);

      setTransactions(
        (current) =>
          current.filter(
            (transaction) =>
              !idSet.has(
                transaction.id
              )
          )
      );

      setSelectedIds(
        new Set()
      );

      setNotification(
        "Deleted successfully"
      );
    } catch (
      deleteError
    ) {
      console.error(
        deleteError
      );

      setError(
        deleteError instanceof
          Error
          ? deleteError.message
          : "Unable to delete the selected records."
      );
    } finally {
      setDeleting(false);
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
            className="mx-auto animate-spin text-[#0d5138]"
          />

          <p className="mt-4 text-[16px] font-semibold text-slate-600">
            Loading income records...
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
      eyebrow="Money Received"
      title="Income"
      description="See all money received by Djallows Farm, where it came from and which account received it."
      actionHref="/income/new"
      actionLabel="Add Income"
      recordText={`${filteredTransactions.length} income records`}
    >

      <AppNotification
        message={
          notification
        }
        onClose={() =>
          setNotification("")
        }
      />

      {/* ======================================================
          SUMMARY CARDS
      ====================================================== */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        <SummaryCard
          title="Total Income"
          value={money(
            totalIncome
          )}
          note="Total money received in the records shown"
          icon={
            <Banknote
              size={23}
            />
          }
          featured
        />

        <SummaryCard
          title="Income Records"
          value={String(
            filteredTransactions.length
          )}
          note="Number of income transactions recorded"
          icon={
            <FileText
              size={23}
            />
          }
        />

        <SummaryCard
          title="Average Amount Received"
          value={money(
            averageIncome
          )}
          note="Average amount received each time"
          icon={
            <CircleGauge
              size={23}
            />
          }
        />

        <SummaryCard
          title="Highest Income Source"
          value={
            highestIncomeSource
              ? highestIncomeSource.name
              : "—"
          }
          note={
            highestIncomeSource
              ? money(
                  highestIncomeSource.value
                )
              : "No income source data"
          }
          icon={
            <Tags
              size={23}
            />
          }
        />

      </div>

      {/* ======================================================
          SEARCH & FILTER
      ====================================================== */}

      <section className="mt-5 overflow-hidden rounded-[24px] border border-white/90 bg-white/95 shadow-[0_12px_35px_rgba(15,23,42,0.07)]">

        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">

          <div>

            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              Search & Filter
            </p>

            <h2 className="mt-1 text-[21px] font-bold text-slate-900">
              Search Income
            </h2>

            <p className="mt-1 text-[15px] leading-6 text-slate-600">
              Search income by description, income source, account, reference or transaction number.
            </p>

          </div>

          {(
            search ||
            categoryFilter !==
              "all" ||
            accountFilter !==
              "all"
          ) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");

                setCategoryFilter(
                  "all"
                );

                setAccountFilter(
                  "all"
                );
              }}
              className="text-[15px] font-bold text-[#0d5138]"
            >
              Clear filters
            </button>
          )}

        </div>

        <div className="grid gap-3 p-5 sm:p-6 lg:grid-cols-[1.45fr_1fr_1fr]">

          <div className="relative">

            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              type="text"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search income..."
              className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3.5 pl-12 pr-4 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />

          </div>

          <select
            value={
              categoryFilter
            }
            onChange={(
              event
            ) =>
              setCategoryFilter(
                event.target.value
              )
            }
            className="rounded-xl border border-slate-300 bg-[#f8faf9] px-4 py-3.5 text-[15px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          >

            <option value="all">
              All Income Sources
            </option>

            {categories.map(
              (category) => (
                <option
                  key={
                    category.id
                  }
                  value={
                    category.id
                  }
                >
                  {
                    category.name
                  }
                </option>
              )
            )}

          </select>

          <select
            value={
              accountFilter
            }
            onChange={(
              event
            ) =>
              setAccountFilter(
                event.target.value
              )
            }
            className="rounded-xl border border-slate-300 bg-[#f8faf9] px-4 py-3.5 text-[15px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          >

            <option value="all">
              All Accounts
            </option>

            {accounts.map(
              (account) => (
                <option
                  key={
                    account.id
                  }
                  value={
                    account.id
                  }
                >
                  {
                    account.name
                  }
                </option>
              )
            )}

          </select>

        </div>

      </section>

      {/* ======================================================
          INCOME SOURCES + SUMMARY
      ====================================================== */}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_0.85fr]">

        <section className="rounded-[24px] border border-white/90 bg-white/95 p-5 shadow-[0_12px_35px_rgba(15,23,42,0.07)] sm:p-6">

          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
            Income Sources
          </p>

          <h2 className="mt-1 text-[21px] font-bold text-slate-900">
            Where the Money Came From
          </h2>

          <p className="mt-1 text-[15px] leading-6 text-slate-600">
            See how much income came from sheep sales, products, consultancy and other activities.
          </p>

          {categorySummary.length >
          0 ? (
            <div className="mt-6 space-y-6">

              {categorySummary
                .slice(0, 6)
                .map(
                  (
                    category
                  ) => {
                    const percentage =
                      totalIncome >
                      0
                        ? (
                            category.value /
                            totalIncome
                          ) *
                          100
                        : 0;

                    return (
                      <div
                        key={
                          category.id
                        }
                      >

                        <div className="mb-2.5 flex items-center justify-between gap-4">

                          <div className="min-w-0">

                            <p className="truncate text-[16px] font-bold text-slate-900">
                              {
                                category.name
                              }
                            </p>

                            <p className="mt-1 text-[14px] font-medium text-slate-600">
                              {percentage.toFixed(
                                1
                              )}
                              % of all income
                            </p>

                          </div>

                          <p className="shrink-0 text-[17px] font-bold text-slate-950">
                            {money(
                              category.value
                            )}
                          </p>

                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-200">

                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#0b5136] to-emerald-500"
                            style={{
                              width: `${Math.min(
                                percentage,
                                100
                              )}%`,
                            }}
                          />

                        </div>

                      </div>
                    );
                  }
                )}

            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-slate-100 p-6 text-center text-[15px] font-medium text-slate-600">
              No income data available.
            </div>
          )}

        </section>

        <section className="overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0b5136] to-[#073523] text-white shadow-[0_16px_40px_rgba(13,61,42,0.20)]">

          <div className="border-b border-white/15 p-5 sm:p-6">

            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-100">
              Quick View
            </p>

            <h2 className="mt-1 text-[21px] font-bold text-white">
              Income Summary
            </h2>

          </div>

          <div className="divide-y divide-white/15">

            <QuickFact
              label="Largest Income"
              value={
                largestIncome
                  ? money(
                      largestIncome.amount
                    )
                  : "GMD 0"
              }
              note={
                largestIncome
                  ?.description ??
                "No income yet"
              }
            />

            <QuickFact
              label="Main Receiving Account"
              value={
                mainReceivingAccount
              }
              note="Account used most often to receive income"
            />

            <QuickFact
              label="Latest Income"
              value={
                latestIncome
                  ? money(
                      latestIncome.amount
                    )
                  : "GMD 0"
              }
              note={
                latestIncome
                  ?.description ??
                "No income yet"
              }
            />

          </div>

        </section>

      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-[15px] font-semibold text-red-800">
          {error}
        </div>
      )}

      {/* ======================================================
          ALL INCOME
      ====================================================== */}

      <section className="mt-5 overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.08)]">

        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 xl:flex-row xl:items-center xl:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-[#0d5138]">

              <Banknote
                size={22}
              />

            </div>

            <div>

              <h2 className="text-[21px] font-bold text-slate-900">
                All Income
              </h2>

              <p className="mt-1 text-[14px] font-medium text-slate-600">
                Detailed history of money received
              </p>

            </div>

          </div>

          <div className="flex flex-wrap items-center gap-2">

            {isOwnerOrAdmin &&
              selectedIds.size >
                0 && (
                <button
                  type="button"
                  onClick={
                    deleteSelected
                  }
                  disabled={
                    deleting
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[14px] font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Trash2
                      size={17}
                    />
                  )}

                  Delete Selected (
                  {
                    selectedIds.size
                  }
                  )
                </button>
              )}

            <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5">

              <p className="text-[12px] font-bold uppercase text-slate-600">
                Records
              </p>

              <p className="mt-1 text-[16px] font-bold text-slate-900">
                {
                  filteredTransactions.length
                }
              </p>

            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">

              <p className="text-[12px] font-bold uppercase text-emerald-800">
                Total
              </p>

              <p className="mt-1 whitespace-nowrap text-[16px] font-bold text-[#0b5136]">
                {money(
                  totalIncome
                )}
              </p>

            </div>

          </div>

        </div>

        {filteredTransactions.length >
        0 ? (
          <div className="overflow-x-auto">

            <table
              className={`w-full table-fixed text-left ${
                isOwnerOrAdmin
                  ? "min-w-[1530px]"
                  : "min-w-[1370px]"
              }`}
            >

              <colgroup>

                {isOwnerOrAdmin && (
                  <col className="w-[70px]" />
                )}

                <col className="w-[145px]" />
                <col className="w-[300px]" />
                <col className="w-[170px]" />
                <col className="w-[180px]" />
                <col className="w-[265px]" />
                <col className="w-[175px]" />
                <col className="w-[220px]" />

              </colgroup>

              <thead>

                <tr className="border-b border-slate-200 bg-[#f4f7f5] text-[13px] font-bold uppercase tracking-[0.05em] text-slate-600">

                  {isOwnerOrAdmin && (
                    <th className="px-5 py-4 text-center">

                      <input
                        type="checkbox"
                        checked={
                          allVisibleSelected
                        }
                        onChange={
                          toggleSelectAll
                        }
                        className="h-4 w-4 cursor-pointer accent-[#0b5136]"
                        aria-label="Select all visible income records"
                      />

                    </th>
                  )}

                  <th className="px-6 py-4">
                    Date
                  </th>

                  <th className="px-6 py-4">
                    Description
                  </th>

                  <th className="px-6 py-4">
                    Income Source
                  </th>

                  <th className="px-6 py-4">
                    Received In
                  </th>

                  <th className="px-6 py-4">
                    Reference / Note
                  </th>

                  <th className="px-6 py-4 text-right">
                    Amount
                  </th>

                  <th className="px-6 py-4 text-right">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredTransactions.map(
                  (
                    transaction,
                    index
                  ) => {
                    const category =
                      transaction.category_id
                        ? categoryMap.get(
                            transaction.category_id
                          ) ??
                          "—"
                        : "—";

                    const account =
                      transaction.account_id
                        ? accountMap.get(
                            transaction.account_id
                          ) ??
                          transaction.payment_method ??
                          "—"
                        : transaction.payment_method ??
                          "—";

                    const canEdit =
                      canEditTransaction(
                        transaction
                      );

                    return (
                      <tr
                        key={
                          transaction.id
                        }
                        className={`border-b border-slate-200 last:border-none transition hover:bg-emerald-50/60 ${
                          index %
                            2 ===
                          1
                            ? "bg-slate-50/60"
                            : "bg-white"
                        }`}
                      >

                        {isOwnerOrAdmin && (
                          <td className="px-5 py-5 text-center align-middle">

                            <input
                              type="checkbox"
                              checked={
                                selectedIds.has(
                                  transaction.id
                                )
                              }
                              onChange={() =>
                                toggleSelected(
                                  transaction.id
                                )
                              }
                              className="h-4 w-4 cursor-pointer accent-[#0b5136]"
                              aria-label={`Select ${transaction.description}`}
                            />

                          </td>
                        )}

                        <td className="px-6 py-5 align-middle">

                          <div className="flex items-center gap-2.5 whitespace-nowrap">

                            <CalendarDays
                              size={17}
                              className="shrink-0 text-slate-500"
                            />

                            <span className="text-[15px] font-semibold text-slate-700">
                              {formatDate(
                                transaction.transaction_date
                              )}
                            </span>

                          </div>

                        </td>

                        <td className="px-6 py-5 align-middle">

                          <p className="text-[15px] font-bold leading-6 text-slate-950">
                            {
                              transaction.description
                            }
                          </p>

                          <p className="mt-1 text-[13px] font-medium text-slate-500">
                            {
                              transaction.transaction_number
                            }
                          </p>

                        </td>

                        <td className="px-6 py-5 align-middle">

                          <span className="inline-flex whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[13px] font-bold text-[#0b5136]">
                            {
                              category
                            }
                          </span>

                        </td>

                        <td className="px-6 py-5 align-middle">

                          <div className="flex items-center gap-2.5 whitespace-nowrap">

                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#0b5136]">

                              {account ===
                              "Wave" ? (
                                <Smartphone
                                  size={16}
                                />
                              ) : (
                                <Wallet
                                  size={16}
                                />
                              )}

                            </div>

                            <span className="text-[15px] font-semibold text-slate-700">
                              {
                                account
                              }
                            </span>

                          </div>

                        </td>

                        <td className="px-6 py-5 align-middle">

                          <p
                            title={
                              transaction.notes ??
                              ""
                            }
                            className="truncate text-[15px] font-medium text-slate-600"
                          >
                            {transaction.notes ||
                              "—"}
                          </p>

                        </td>

                        <td className="px-6 py-5 text-right align-middle">

                          <span className="inline-flex whitespace-nowrap rounded-lg bg-emerald-50 px-3 py-2 text-[15px] font-bold text-emerald-800">
                            +{" "}
                            {money(
                              transaction.amount
                            )}
                          </span>

                        </td>

                        <td className="px-6 py-5 text-right align-middle">

                          <div className="flex items-center justify-end gap-2">

                            {canEdit ? (
                              <button
                                type="button"
                                onClick={() =>
                                  openEdit(
                                    transaction
                                  )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-[14px] font-bold text-[#0b5136] transition hover:bg-emerald-50"
                              >
                                <Pencil
                                  size={16}
                                />

                                Edit
                              </button>
                            ) : (
                              <span className="inline-flex rounded-xl bg-slate-100 px-3.5 py-2.5 text-[13px] font-bold text-slate-500">
                                View only
                              </span>
                            )}

                            {isOwnerOrAdmin && (
                              <button
                                type="button"
                                onClick={() =>
                                  deleteOne(
                                    transaction
                                  )
                                }
                                disabled={
                                  deleting
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-[14px] font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Trash2
                                  size={16}
                                />

                                Delete
                              </button>
                            )}

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>
        ) : (
          <div className="flex min-h-[300px] items-center justify-center p-6 text-center">

            <div>

              <p className="text-[18px] font-bold text-slate-900">
                No income records found
              </p>

              <p className="mt-2 text-[15px] font-medium text-slate-600">
                Try changing your search or filters.
              </p>

              <Link
                href="/income/new"
                className="mt-5 inline-flex rounded-xl bg-[#0d5138] px-5 py-3 text-[15px] font-bold text-white"
              >
                Add Income
              </Link>

            </div>

          </div>
        )}

      </section>

      {/* ======================================================
          EDIT INCOME
      ====================================================== */}

      {editingTransaction && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">

          <div className="max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-[26px] border border-white bg-[#f7faf8] shadow-[0_30px_90px_rgba(15,23,42,0.35)]">

            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-6">

              <div>

                <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                  Income Record
                </p>

                <h2 className="mt-1 text-[23px] font-bold text-slate-950">
                  Edit Income
                </h2>

                <p className="mt-1 text-[14px] font-medium text-slate-600">
                  {
                    editingTransaction.transaction_number
                  }
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeEdit
                }
                disabled={
                  savingEdit
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <X
                  size={20}
                />
              </button>

            </div>

            <form
              onSubmit={
                saveEdit
              }
              className="p-5 sm:p-6"
            >

              {editError && (
                <div className="mb-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-[14px] font-semibold text-red-800">
                  {
                    editError
                  }
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">

                <div>

                  <label className="mb-2 block text-[14px] font-bold text-slate-800">
                    Date Received
                  </label>

                  <input
                    type="date"
                    value={
                      editDate
                    }
                    onChange={(
                      event
                    ) =>
                      setEditDate(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-[14px] font-bold text-slate-800">
                    Income Source
                  </label>

                  <select
                    value={
                      editCategoryId
                    }
                    onChange={(
                      event
                    ) =>
                      setEditCategoryId(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  >

                    <option value="">
                      Select income source
                    </option>

                    {categories
                      .filter(
                        (
                          category
                        ) =>
                          category.active ||
                          category.id ===
                            editCategoryId
                      )
                      .map(
                        (
                          category
                        ) => (
                          <option
                            key={
                              category.id
                            }
                            value={
                              category.id
                            }
                          >
                            {
                              category.name
                            }
                          </option>
                        )
                      )}

                  </select>

                </div>

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-[14px] font-bold text-slate-800">
                    Description
                  </label>

                  <input
                    type="text"
                    value={
                      editDescription
                    }
                    onChange={(
                      event
                    ) =>
                      setEditDescription(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] font-medium text-slate-800 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-[14px] font-bold text-slate-800">
                    Amount Received
                  </label>

                  <div className="relative">

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-bold text-slate-500">
                      GMD
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        editAmount
                      }
                      onChange={(
                        event
                      ) =>
                        setEditAmount(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-16 pr-4 text-[15px] font-bold text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                    />

                  </div>

                </div>

                <div>

                  <label className="mb-2 block text-[14px] font-bold text-slate-800">
                    Received In
                  </label>

                  <select
                    value={
                      editAccountId
                    }
                    onChange={(
                      event
                    ) =>
                      setEditAccountId(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  >

                    <option value="">
                      Select account
                    </option>

                    {accounts
                      .filter(
                        (
                          account
                        ) =>
                          account.active ||
                          account.id ===
                            editAccountId
                      )
                      .map(
                        (
                          account
                        ) => (
                          <option
                            key={
                              account.id
                            }
                            value={
                              account.id
                            }
                          >
                            {
                              account.name
                            }
                          </option>
                        )
                      )}

                  </select>

                </div>

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-[14px] font-bold text-slate-800">
                    Reference / Note
                  </label>

                  <textarea
                    rows={4}
                    value={
                      editNotes
                    }
                    onChange={(
                      event
                    ) =>
                      setEditNotes(
                        event.target.value
                      )
                    }
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] font-medium text-slate-800 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />

                </div>

              </div>

              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

                <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-emerald-800">
                  Income Summary
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">

                  <EditSummaryItem
                    label="Income Source"
                    value={
                      editCategoryId
                        ? categoryMap.get(
                            editCategoryId
                          ) ??
                          "Not selected"
                        : "Not selected"
                    }
                  />

                  <EditSummaryItem
                    label="Amount"
                    value={
                      Number(
                        editAmount
                      ) >
                      0
                        ? money(
                            Number(
                              editAmount
                            )
                          )
                        : "GMD 0"
                    }
                  />

                  <EditSummaryItem
                    label="Received In"
                    value={
                      editAccountId
                        ? accountMap.get(
                            editAccountId
                          ) ??
                          "Not selected"
                        : "Not selected"
                    }
                  />

                  <EditSummaryItem
                    label="Date"
                    value={
                      editDate ||
                      "Not selected"
                    }
                  />

                </div>

              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    closeEdit
                  }
                  disabled={
                    savingEdit
                  }
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-[15px] font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    savingEdit
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b5136] px-5 py-3.5 text-[15px] font-bold text-white transition hover:bg-[#083c29] disabled:opacity-60"
                >

                  {savingEdit ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <Pencil
                        size={17}
                      />

                      Save Changes
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </FinancePageShell>
  );
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  title,
  value,
  note,
  icon,
  featured = false,
}: {
  title: string;
  value: string;
  note: string;
  icon: ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[22px] border p-5 shadow-[0_10px_30px_rgba(15,23,42,0.07)] sm:p-6 ${
        featured
          ? "border-[#0b5136] bg-gradient-to-br from-[#0b5136] to-[#073724] text-white"
          : "border-white bg-white text-slate-950"
      }`}
    >

      <div className="relative flex items-start justify-between gap-4">

        <div className="min-w-0">

          <p
            className={`text-[15px] font-semibold ${
              featured
                ? "text-emerald-50"
                : "text-slate-700"
            }`}
          >
            {title}
          </p>

          <p
            className={`mt-3 break-words text-[28px] font-bold leading-tight tracking-tight ${
              featured
                ? "text-white"
                : "text-[#0f172a]"
            }`}
          >
            {value}
          </p>

          <p
            className={`mt-3 text-[14px] font-semibold leading-5 ${
              featured
                ? "text-emerald-50/90"
                : "text-slate-600"
            }`}
          >
            {note}
          </p>

        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            featured
              ? "bg-white/15 text-white"
              : "bg-emerald-100 text-[#0b5136]"
          }`}
        >
          {icon}
        </div>

      </div>

    </div>
  );
}

// ============================================================
// QUICK FACT
// ============================================================

function QuickFact({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="p-5 sm:p-6">

      <p className="text-[13px] font-bold uppercase tracking-[0.10em] text-emerald-100">
        {label}
      </p>

      <p className="mt-2 break-words text-[22px] font-bold text-white">
        {value}
      </p>

      <p className="mt-2 text-[14px] font-medium leading-5 text-emerald-50/85">
        {note}
      </p>

    </div>
  );
}

// ============================================================
// EDIT SUMMARY ITEM
// ============================================================

function EditSummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/80 p-3">

      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-[15px] font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}