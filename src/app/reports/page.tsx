"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  ArrowRight,
  Banknote,
  CalendarDays,
  Filter,
  Loader2,
  PawPrint,
  ReceiptText,
  RotateCcw,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

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
  category_type: "income" | "expense";
  active: boolean;
};

type Transaction = {
  id: string;
  transaction_number: string;
  transaction_date: string;
  transaction_type: "income" | "expense";
  category_id: string | null;
  description: string;
  amount: number;
  payment_method: string | null;
  notes: string | null;
};

type RecordType =
  | "all"
  | "income"
  | "expense";

// ============================================================
// HELPERS
// ============================================================



function money(
  amount: number
) {
  return `GMD ${amount.toLocaleString(
    undefined,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatDate(
  value: string
) {
  const cleanDate =
    value.slice(
      0,
      10
    );

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(
    new Date(
      `${cleanDate}T00:00:00`
    )
  );
}

function displayPaymentMethod(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    normalized ===
      "cash" ||
    normalized ===
      "cash on hand"
  ) {
    return "Cash on Hand";
  }

  if (
    normalized ===
    "wave"
  ) {
    return "Wave";
  }

  if (
    normalized ===
      "bank" ||
    normalized ===
      "bank account"
  ) {
    return "Bank Account";
  }

  return value;
}

// ============================================================
// PAGE
// ============================================================

export default function ReportsPage() {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] = useState(
    true
  );

  const [
    error,
    setError,
  ] = useState(
    ""
  );

  const [
    transactions,
    setTransactions,
  ] =
    useState<
      Transaction[]
    >([]);

  const [
    categories,
    setCategories,
  ] =
    useState<
      Category[]
    >([]);

  // ==========================================================
  // FILTERS
  // ==========================================================

  const [
    fromDate,
    setFromDate,
  ] = useState("");

  const [
    toDate,
    setToDate,
  ] = useState("");

  const [
    recordType,
    setRecordType,
  ] =
    useState<RecordType>(
      "all"
    );

  const [
    categoryId,
    setCategoryId,
  ] = useState(
    "all"
  );

  const [
    searchText,
    setSearchText,
  ] = useState(
    ""
  );

  // ==========================================================
  // LOAD REPORT DATA
  // ==========================================================

  useEffect(() => {
    let active =
      true;

    async function loadReports() {
      try {
        setLoading(
          true
        );

        setError(
          ""
        );

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

        // ====================================================
        // BUSINESS
        // ====================================================

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
            "business_id"
          )
          .eq(
            "user_id",
            session.user.id
          )
          .limit(
            1
          )
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

        // ====================================================
        // LOAD CATEGORIES + TRANSACTIONS
        // ====================================================

        const [
          categoryResult,
          transactionResult,
        ] =
          await Promise.all([
            supabase
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
              ),

            supabase
              .from(
                "transactions"
              )
              .select(
                `
                id,
                transaction_number,
                transaction_date,
                transaction_type,
                category_id,
                description,
                amount,
                payment_method,
                notes
              `
              )
              .eq(
                "business_id",
                membership.business_id
              )
              .in(
                "transaction_type",
                [
                  "income",
                  "expense",
                  "payroll",
                ]
              )
              .order(
                "transaction_date",
                {
                  ascending:
                    false,
                }
              ),
          ]);

        if (
          categoryResult.error
        ) {
          throw new Error(
            `Unable to load report categories: ${categoryResult.error.message}`
          );
        }

        if (
          transactionResult.error
        ) {
          throw new Error(
            `Unable to load report records: ${transactionResult.error.message}`
          );
        }

        if (!active) {
          return;
        }

        setCategories(
          (
            categoryResult.data ??
            []
          ).map(
            (
              category
            ) => ({
              id:
                category.id,

              name:
                category.name,

              category_type:
                category.category_type,

              active:
                Boolean(
                  category.active
                ),
            })
          )
        );

        setTransactions(
          (
            transactionResult.data ??
            []
          ).map(
            (
              transaction
            ) => ({
              id:
                transaction.id,

              transaction_number:
                transaction.transaction_number,

              transaction_date:
                transaction.transaction_date,

              transaction_type:
                transaction.transaction_type === "payroll"
                  ? "expense"
                  : transaction.transaction_type,

              category_id:
                transaction.category_id,

              description:
                transaction.description ??
                "",

              amount:
                Number(
                  transaction.amount ??
                    0
                ),

              payment_method:
                transaction.payment_method,

              notes:
                transaction.notes,
            })
          )
        );

        setLoading(
          false
        );
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
              : "Unable to load reports."
          );

          setLoading(
            false
          );
        }
      }
    }

    loadReports();

    return () => {
      active =
        false;
    };
  }, [
    router,
  ]);

  // ==========================================================
  // CATEGORY LOOKUP
  // ==========================================================

  const categoryMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          Category
        >();

      categories.forEach(
        (
          category
        ) => {
          map.set(
            category.id,
            category
          );
        }
      );

      return map;
    }, [
      categories,
    ]);

  // ==========================================================
  // FILTER LABEL
  // ==========================================================

  const categoryFilterLabel =
    useMemo(() => {
      if (
        recordType ===
        "income"
      ) {
        return "Income Source";
      }

      if (
        recordType ===
        "expense"
      ) {
        return "Expense Category";
      }

      return "Source / Category";
    }, [
      recordType,
    ]);

  // ==========================================================
  // CATEGORY OPTIONS
  // ==========================================================

  const availableCategories =
    useMemo(() => {
      if (
        recordType ===
        "income"
      ) {
        return categories.filter(
          (
            category
          ) =>
            category.category_type ===
            "income"
        );
      }

      if (
        recordType ===
        "expense"
      ) {
        return categories.filter(
          (
            category
          ) =>
            category.category_type ===
            "expense"
        );
      }

      return categories;
    }, [
      categories,
      recordType,
    ]);

  // ==========================================================
  // RECORD TYPE CHANGE
  // ==========================================================

  function handleRecordTypeChange(
    value:
      RecordType
  ) {
    setRecordType(
      value
    );

    if (
      categoryId ===
      "all"
    ) {
      return;
    }

    const selected =
      categoryMap.get(
        categoryId
      );

    if (!selected) {
      setCategoryId(
        "all"
      );

      return;
    }

    if (
      value !==
        "all" &&
      selected.category_type !==
        value
    ) {
      setCategoryId(
        "all"
      );
    }
  }

  // ==========================================================
  // FILTERED TRANSACTIONS
  // ==========================================================

  const filteredTransactions =
    useMemo(() => {
      const search =
        searchText
          .trim()
          .toLowerCase();

      return transactions.filter(
        (
          transaction
        ) => {
          const date =
            transaction.transaction_date.slice(
              0,
              10
            );

          if (
            fromDate &&
            date <
              fromDate
          ) {
            return false;
          }

          if (
            toDate &&
            date >
              toDate
          ) {
            return false;
          }

          if (
            recordType !==
              "all" &&
            transaction.transaction_type !==
              recordType
          ) {
            return false;
          }

          if (
            categoryId !==
              "all" &&
            transaction.category_id !==
              categoryId
          ) {
            return false;
          }

          if (
            search
          ) {
            const categoryName =
              transaction.category_id
                ? categoryMap.get(
                    transaction.category_id
                  )
                    ?.name ??
                  ""
                : "";

            const searchable =
              [
                transaction.description,
                transaction.transaction_number,
                categoryName,
                transaction.payment_method ??
                  "",
                transaction.notes ??
                  "",
              ]
                .join(
                  " "
                )
                .toLowerCase();

            if (
              !searchable.includes(
                search
              )
            ) {
              return false;
            }
          }

          return true;
        }
      );
    }, [
      transactions,
      fromDate,
      toDate,
      recordType,
      categoryId,
      searchText,
      categoryMap,
    ]);

  // ==========================================================
  // TOTALS
  // ==========================================================

  const totalIncome =
    useMemo(
      () =>
        filteredTransactions
          .filter(
            (
              transaction
            ) =>
              transaction.transaction_type ===
              "income"
          )
          .reduce(
            (
              total,
              transaction
            ) =>
              total +
              transaction.amount,
            0
          ),
      [
        filteredTransactions,
      ]
    );

  const totalExpenses =
    useMemo(
      () =>
        filteredTransactions
          .filter(
            (
              transaction
            ) =>
              transaction.transaction_type ===
              "expense"
          )
          .reduce(
            (
              total,
              transaction
            ) =>
              total +
              transaction.amount,
            0
          ),
      [
        filteredTransactions,
      ]
    );

  const moneyRemaining =
    totalIncome -
    totalExpenses;

  // ==========================================================
  // BREAKDOWN
  // ==========================================================

  function buildBreakdown(
    type:
      | "income"
      | "expense"
  ) {
    const totals =
      new Map<
        string,
        {
          name: string;
          amount: number;
        }
      >();

    filteredTransactions
      .filter(
        (
          transaction
        ) =>
          transaction.transaction_type ===
          type
      )
      .forEach(
        (
          transaction
        ) => {
          const category =
            transaction.category_id
              ? categoryMap.get(
                  transaction.category_id
                )
              : null;

          const name =
            category?.name ??
            "Uncategorised";

          const current =
            totals.get(
              name
            );

          totals.set(
            name,
            {
              name,

              amount:
                (
                  current?.amount ??
                  0
                ) +
                transaction.amount,
            }
          );
        }
      );

    return Array.from(
      totals.values()
    ).sort(
      (
        a,
        b
      ) =>
        b.amount -
        a.amount
    );
  }

  const incomeBreakdown =
    useMemo(
      () =>
        buildBreakdown(
          "income"
        ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        filteredTransactions,
        categoryMap,
      ]
    );

  const expenseBreakdown =
    useMemo(
      () =>
        buildBreakdown(
          "expense"
        ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        filteredTransactions,
        categoryMap,
      ]
    );

  // ==========================================================
  // RESET FILTERS
  // ==========================================================

  function resetFilters() {
    setFromDate("");

    setToDate("");

    setRecordType(
      "all"
    );

    setCategoryId(
      "all"
    );

    setSearchText(
      ""
    );
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#edf3ef]">

        <div className="text-center">

          <Loader2
            size={32}
            className="mx-auto animate-spin text-[#0b5136]"
          />

          <p className="mt-4 text-[16px] font-semibold text-slate-600">
            Loading reports...
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
      eyebrow="Financial Reports"
      title="Reports"
      description="Choose a period and see exactly how much money came in, how much was spent and where the money was spent."
      recordText={`${filteredTransactions.length} records shown`}
    >

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="mb-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-[15px] font-semibold text-red-800">
          {
            error
          }
        </div>
      )}

      {/* ======================================================
          SPECIAL REPORT
      ====================================================== */}

      <section className="mb-5 overflow-hidden rounded-[26px] border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white shadow-[0_12px_35px_rgba(15,23,42,0.06)]">

        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-start gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0b5136] text-white">

              <PawPrint
                size={24}
              />

            </div>

            <div>

              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                Special Report
              </p>

              <h2 className="mt-1 text-[22px] font-bold text-slate-950">
                Tobaski Investment & Yearly Performance
              </h2>

              <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-slate-600">
                Track investment, sheep bought, sheep sold, remaining sheep, sales return, profit or loss, ROI and year-to-year Tobaski performance.
              </p>

            </div>

          </div>

          <Link
            href="/reports/tobaski"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0b5136] px-5 py-3.5 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#083c29]"
          >
            View Tobaski Report

            <ArrowRight
              size={18}
            />

          </Link>

        </div>

      </section>

      {/* ======================================================
          FILTERS
      ====================================================== */}

      <section className="overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.07)]">

        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <div className="flex items-center gap-2 text-emerald-700">

              <Filter
                size={17}
              />

              <p className="text-[13px] font-bold uppercase tracking-[0.14em]">
                Report Period
              </p>

            </div>

            <h2 className="mt-2 text-[22px] font-bold text-slate-950">
              Choose What You Want to See
            </h2>

            <p className="mt-1 text-[15px] leading-6 text-slate-600">
              Filter by date, income or expense, source/category, or search for a specific record.
            </p>

          </div>

          <button
            type="button"
            onClick={
              resetFilters
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-[14px] font-bold text-slate-700 transition hover:bg-slate-100"
          >

            <RotateCcw
              size={17}
            />

            Reset Filters

          </button>

        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-5">

          <FilterField
            label="From Date"
          >

            <div className="relative">

              <CalendarDays
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="date"
                value={
                  fromDate
                }
                onChange={(
                  event
                ) =>
                  setFromDate(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3 pl-10 pr-3 text-[14px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />

            </div>

          </FilterField>

          <FilterField
            label="To Date"
          >

            <div className="relative">

              <CalendarDays
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="date"
                value={
                  toDate
                }
                onChange={(
                  event
                ) =>
                  setToDate(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3 pl-10 pr-3 text-[14px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />

            </div>

          </FilterField>

          <FilterField
            label="Record Type"
          >

            <select
              value={
                recordType
              }
              onChange={(
                event
              ) =>
                handleRecordTypeChange(
                  event.target.value as RecordType
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] px-3 py-3 text-[14px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            >

              <option value="all">
                Income & Expenses
              </option>

              <option value="income">
                Income Only
              </option>

              <option value="expense">
                Expenses Only
              </option>

            </select>

          </FilterField>

          <FilterField
            label={
              categoryFilterLabel
            }
          >

            <select
              value={
                categoryId
              }
              onChange={(
                event
              ) =>
                setCategoryId(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] px-3 py-3 text-[14px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            >

              <option value="all">
                {recordType ===
                "income"
                  ? "All Income Sources"
                  : recordType ===
                    "expense"
                  ? "All Expense Categories"
                  : "All Sources / Categories"}
              </option>

              {availableCategories.map(
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

          </FilterField>

          <FilterField
            label="Search"
          >

            <div className="relative">

              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="search"
                value={
                  searchText
                }
                onChange={(
                  event
                ) =>
                  setSearchText(
                    event.target.value
                  )
                }
                placeholder="Search records..."
                className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3 pl-10 pr-3 text-[14px] font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />

            </div>

          </FilterField>

        </div>

      </section>

      {/* ======================================================
          TOTALS
      ====================================================== */}

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

        <SummaryCard
          title="Total Income"
          value={
            money(
              totalIncome
            )
          }
          note="Money received during the selected period"
          icon={
            <TrendingUp
              size={23}
            />
          }
          featured
        />

        <SummaryCard
          title="Total Expenses"
          value={
            money(
              totalExpenses
            )
          }
          note="Money spent during the selected period"
          icon={
            <TrendingDown
              size={23}
            />
          }
        />

        <SummaryCard
          title="Money Remaining"
          value={
            money(
              moneyRemaining
            )
          }
          note="Income minus expenses"
          icon={
            <Wallet
              size={23}
            />
          }
        />

      </div>

      {/* ======================================================
          BREAKDOWNS
      ====================================================== */}

      <div className="mt-5 grid gap-5 xl:grid-cols-2">

        <BreakdownSection
          eyebrow="Income"
          title="Where the Money Came From"
          description="Total income received from each source during the selected period."
          total={
            totalIncome
          }
          rows={
            incomeBreakdown
          }
          emptyText="No income records match the selected filters."
        />

        <BreakdownSection
          eyebrow="Expenses"
          title="Where the Money Was Spent"
          description="See exactly how much was spent on Feed, Medication, Labour, Transport, Electricity and other areas."
          total={
            totalExpenses
          }
          rows={
            expenseBreakdown
          }
          emptyText="No expense records match the selected filters."
        />

      </div>

      {/* ======================================================
          DETAILED RECORDS
      ====================================================== */}

      <section className="mt-5 overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.07)]">

        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">

          <div>

            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              Detailed Records
            </p>

            <h2 className="mt-1 text-[22px] font-bold text-slate-950">
              Income & Expense Records
            </h2>

            <p className="mt-1 text-[15px] text-slate-600">
              Individual records included in this report.
            </p>

          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5">

            <p className="text-[12px] font-bold uppercase text-slate-600">
              Records
            </p>

            <p className="mt-1 text-[17px] font-bold text-slate-950">
              {
                filteredTransactions.length
              }
            </p>

          </div>

        </div>

        {filteredTransactions.length >
        0 ? (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[1100px] text-left">

              <thead>

                <tr className="border-b border-slate-200 bg-[#f4f7f5] text-[12px] font-bold uppercase tracking-wide text-slate-600">

                  <th className="px-6 py-4">
                    Date
                  </th>

                  <th className="px-6 py-4">
                    Description
                  </th>

                  <th className="px-6 py-4">
                    Source / Category
                  </th>

                  <th className="px-6 py-4">
                    Type
                  </th>

                  <th className="px-6 py-4">
                    Paid / Received Via
                  </th>

                  <th className="px-6 py-4 text-right">
                    Amount
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredTransactions.map(
                  (
                    transaction
                  ) => {
                    const category =
                      transaction.category_id
                        ? categoryMap.get(
                            transaction.category_id
                          )
                        : null;

                    const isIncome =
                      transaction.transaction_type ===
                      "income";

                    return (
                      <tr
                        key={
                          transaction.id
                        }
                        className="border-b border-slate-200 last:border-none hover:bg-emerald-50/40"
                      >

                        <td className="whitespace-nowrap px-6 py-5 text-[14px] font-semibold text-slate-700">
                          {formatDate(
                            transaction.transaction_date
                          )}
                        </td>

                        <td className="max-w-[390px] px-6 py-5">

                          <p className="text-[15px] font-bold leading-6 text-slate-950">
                            {transaction.description ||
                              "—"}
                          </p>

                          <p className="mt-1 text-[12px] font-medium text-slate-500">
                            {
                              transaction.transaction_number
                            }
                          </p>

                        </td>

                        <td className="px-6 py-5">

                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-[13px] font-bold text-slate-700">
                            {category?.name ??
                              "Uncategorised"}
                          </span>

                        </td>

                        <td className="px-6 py-5">

                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-[13px] font-bold ${
                              isIncome
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {isIncome
                              ? "Income"
                              : "Expense"}
                          </span>

                        </td>

                        <td className="px-6 py-5">

                          <div className="flex items-center gap-2">

                            <Wallet
                              size={16}
                              className="shrink-0 text-[#0b5136]"
                            />

                            <span className="text-[14px] font-semibold text-slate-700">
                              {displayPaymentMethod(
                                transaction.payment_method
                              )}
                            </span>

                          </div>

                        </td>

                        <td
                          className={`whitespace-nowrap px-6 py-5 text-right text-[16px] font-bold ${
                            isIncome
                              ? "text-emerald-700"
                              : "text-slate-950"
                          }`}
                        >
                          {isIncome
                            ? "+"
                            : "-"}
                          {money(
                            transaction.amount
                          )}
                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>
        ) : (
          <div className="flex min-h-[240px] items-center justify-center px-5 text-center">

            <div>

              <ReceiptText
                size={31}
                className="mx-auto text-[#0b5136]"
              />

              <p className="mt-4 text-[17px] font-bold text-slate-950">
                No records found
              </p>

              <p className="mt-2 text-[15px] text-slate-600">
                Try changing the report filters or date range.
              </p>

            </div>

          </div>
        )}

      </section>

    </FinancePageShell>
  );
}

// ============================================================
// FILTER FIELD
// ============================================================

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">

      <span className="mb-2 block text-[13px] font-bold text-slate-700">
        {label}
      </span>

      {children}

    </label>
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
      className={`min-w-0 rounded-[22px] border p-5 shadow-[0_10px_30px_rgba(15,23,42,0.07)] sm:p-6 ${
        featured
          ? "border-[#0b5136] bg-[#0b5136] text-white"
          : "border-white bg-white text-slate-950"
      }`}
    >

      <div className="flex items-start justify-between gap-4">

        <p
          className={`min-w-0 text-[15px] font-bold leading-5 ${
            featured
              ? "text-white"
              : "text-slate-800"
          }`}
        >
          {
            title
          }
        </p>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            featured
              ? "bg-white/15 text-white"
              : "bg-emerald-100 text-[#0b5136]"
          }`}
        >
          {
            icon
          }
        </div>

      </div>

      <p className="mt-4 whitespace-nowrap text-[clamp(25px,2.6vw,34px)] font-bold leading-none tracking-tight tabular-nums">
        {
          value
        }
      </p>

      <p
        className={`mt-5 max-w-[280px] text-[14px] font-semibold leading-5 ${
          featured
            ? "text-emerald-50/90"
            : "text-slate-600"
        }`}
      >
        {
          note
        }
      </p>

    </div>
  );
}

// ============================================================
// BREAKDOWN
// ============================================================

function BreakdownSection({
  eyebrow,
  title,
  description,
  total,
  rows,
  emptyText,
}: {
  eyebrow: string;
  title: string;
  description: string;
  total: number;

  rows: {
    name: string;
    amount: number;
  }[];

  emptyText: string;
}) {
  return (
    <section className="overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.07)]">

      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">

        <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
          {
            eyebrow
          }
        </p>

        <h2 className="mt-1 text-[21px] font-bold text-slate-950">
          {
            title
          }
        </h2>

        <p className="mt-1 text-[14px] leading-6 text-slate-600">
          {
            description
          }
        </p>

      </div>

      {rows.length >
      0 ? (
        <div className="divide-y divide-slate-200">

          {rows.map(
            (
              row
            ) => {
              const percentage =
                total >
                0
                  ? (
                      (
                        row.amount /
                        total
                      ) *
                      100
                    ).toFixed(
                      1
                    )
                  : "0.0";

              return (
                <div
                  key={
                    row.name
                  }
                  className="px-5 py-4 sm:px-6"
                >

                  <div className="flex items-start justify-between gap-5">

                    <div className="min-w-0 flex-1">

                      <p className="text-[15px] font-bold text-slate-950">
                        {
                          row.name
                        }
                      </p>

                      <p className="mt-1 text-[13px] font-semibold text-slate-500">
                        {
                          percentage
                        }
                        % of total
                      </p>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">

                        <div
                          className="h-full rounded-full bg-[#0b5136]"
                          style={{
                            width: `${Math.min(
                              Number(
                                percentage
                              ),
                              100
                            )}%`,
                          }}
                        />

                      </div>

                    </div>

                    <p className="whitespace-nowrap text-[16px] font-bold text-slate-950">
                      {money(
                        row.amount
                      )}
                    </p>

                  </div>

                </div>
              );
            }
          )}

        </div>
      ) : (
        <div className="flex min-h-[190px] items-center justify-center px-5 text-center">

          <div>

            <Banknote
              size={29}
              className="mx-auto text-[#0b5136]"
            />

            <p className="mt-3 text-[15px] font-semibold text-slate-600">
              {
                emptyText
              }
            </p>

          </div>

        </div>
      )}

    </section>
  );
}