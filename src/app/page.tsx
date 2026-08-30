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
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Coins,
  PawPrint,
  Plus,
  ReceiptText,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import FinancePageShell from "@/components/FinancePageShell";

import type {
  DashboardFinancialData,
  LedgerTransaction,
} from "@/lib/dashboard";

// ============================================================
// TYPES
// ============================================================

type BusinessProfile = {
  id: string;
  name: string;
  trading_name: string | null;
};

type Period =
  | "month"
  | "quarter"
  | "year"
  | "all";

type MemberRole =
  | "super_admin"
  | "owner"
  | "admin"
  | "staff"
  | "viewer";

type InvoiceRow = {
  id: string;
  customer_id: string | null;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  tobaski_season_id: string | null;
};

type CustomerRow = {
  id: string;
  name: string;
  active: boolean;
};

type TobaskiSeason = {
  id: string;
  season_name: string;
  season_year: number;
  active: boolean;
};

type TobaskiExpense = {
  id: string;
  amount: number;
  tobaski_season_id: string | null;
  tobaski_quantity: number | null;
};

type SheepSaleRow = {
  id: string;
  invoice_id: string | null;
  tobaski_season_id: string | null;
};

type TobaskiStockRow = {
  id: string;
  tobaski_season_id: string;
  stock_status: string;
};

type BreakdownRow = {
  name: string;
  value: number;
};

type CustomerValueRow = {
  id: string;
  name: string;
  value: number;
  invoiceCount: number;
};

type HistoricalCustomerSale = {
  id: string;
  contact_id: string | null;
  transaction_date: string;
  amount: number;
};

type PayrollDashboardSummary = {
  active_employees: number;
  paid_this_month: number;
  payments_this_month: number;
};

type TobaskiSummary = {
  investment: number;
  sales: number;
  outstanding: number;
  bought: number;
  sold: number;
  remaining: number;
  profit: number;
  roi: number;
};

type LocalDashboardResponse = {
  success: boolean;
  error?: string;
  business: BusinessProfile;
  memberRole: MemberRole;
  financialData: DashboardFinancialData;
  payrollSummary: PayrollDashboardSummary | null;
  invoices: InvoiceRow[];
  customers: CustomerRow[];
  tobaskiSeasons: TobaskiSeason[];
  tobaskiExpenses: TobaskiExpense[];
  sheepSales: SheepSaleRow[];
  tobaskiStock: TobaskiStockRow[];
  stockAvailable: boolean;
  historicalCustomerSales: HistoricalCustomerSale[];
};

// ============================================================
// CONSTANTS
// ============================================================

const donutColors = [
  "#15803d",
  "#2563eb",
  "#d97706",
  "#7c3aed",
  "#dc2626",
  "#0f766e",
  "#475569",
  "#0891b2",
];

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

function percentage(
  value: number
) {
  return `${value.toLocaleString(
    undefined,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }
  )}%`;
}

function formatDate(
  dateString: string
) {
  const cleanDate = String(
    dateString
  ).slice(0, 10);

  const date = new Date(
    `${cleanDate}T12:00:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return cleanDate;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

function getPeriodStart(
  period: Period
) {
  const now = new Date();

  if (
    period === "all"
  ) {
    return null;
  }

  if (
    period === "month"
  ) {
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );
  }

  if (
    period === "quarter"
  ) {
    const quarterStart =
      Math.floor(
        now.getMonth() / 3
      ) * 3;

    return new Date(
      now.getFullYear(),
      quarterStart,
      1
    );
  }

  return new Date(
    now.getFullYear(),
    0,
    1
  );
}

function getPeriodLabel(
  period: Period
) {
  if (
    period === "month"
  ) {
    return "This Month";
  }

  if (
    period === "quarter"
  ) {
    return "This Quarter";
  }

  if (
    period === "year"
  ) {
    return "This Year";
  }

  return "All Time";
}

function filterTransactionsByPeriod(
  transactions: LedgerTransaction[],
  period: Period
) {
  const start =
    getPeriodStart(period);

  if (!start) {
    return transactions;
  }

  return transactions.filter(
    (transaction) => {
      const date = new Date(
        transaction.transaction_date
      );

      return date >= start;
    }
  );
}

function filterInvoicesByPeriod(
  invoices: InvoiceRow[],
  period: Period
) {
  const start =
    getPeriodStart(period);

  if (!start) {
    return invoices;
  }

  return invoices.filter(
    (invoice) => {
      const date = new Date(
        `${String(
          invoice.invoice_date
        ).slice(
          0,
          10
        )}T12:00:00`
      );

      return date >= start;
    }
  );
}

function groupTransactionsByCategory(
  transactions: LedgerTransaction[],
  type:
    | "income"
    | "expense"
) {
  const grouped =
    new Map<
      string,
      number
    >();

  transactions
    .filter(
      (transaction) =>
        type === "expense"
          ? transaction.transaction_type ===
              "expense" ||
            transaction.transaction_type ===
              "payroll"
          : transaction.transaction_type ===
            type
    )
    .forEach(
      (transaction) => {
        const category =
          transaction.category_name ||
          "Uncategorised";

        grouped.set(
          category,
          (
            grouped.get(
              category
            ) ?? 0
          ) +
            transaction.amount
        );
      }
    );

  return Array.from(
    grouped.entries()
  )
    .map(
      ([
        name,
        value,
      ]) => ({
        name,
        value,
      })
    )
    .sort(
      (
        a,
        b
      ) =>
        b.value -
        a.value
    );
}

// ============================================================
// PAGE
// ============================================================

export default function Home() {
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
    business,
    setBusiness,
  ] =
    useState<BusinessProfile | null>(
      null
    );

  const [
    financialData,
    setFinancialData,
  ] =
    useState<DashboardFinancialData | null>(
      null
    );

  const [
    invoices,
    setInvoices,
  ] =
    useState<InvoiceRow[]>(
      []
    );

  const [
    customers,
    setCustomers,
  ] =
    useState<CustomerRow[]>(
      []
    );

  const [
    historicalCustomerSales,
    setHistoricalCustomerSales,
  ] =
    useState<HistoricalCustomerSale[]>(
      []
    );

  const [
    tobaskiSeasons,
    setTobaskiSeasons,
  ] =
    useState<TobaskiSeason[]>(
      []
    );

  const [
    tobaskiExpenses,
    setTobaskiExpenses,
  ] =
    useState<TobaskiExpense[]>(
      []
    );

  const [
    sheepSales,
    setSheepSales,
  ] =
    useState<SheepSaleRow[]>(
      []
    );

  const [
    tobaskiStock,
    setTobaskiStock,
  ] =
    useState<TobaskiStockRow[]>(
      []
    );

  const [
    stockAvailable,
    setStockAvailable,
  ] =
    useState(false);

  const [
    period,
    setPeriod,
  ] =
    useState<Period>(
      "month"
    );

  const [
    notification,
    setNotification,
  ] = useState("");

  const [
    memberRole,
    setMemberRole,
  ] =
    useState<MemberRole>(
      "staff"
    );

  const [
    payrollSummary,
    setPayrollSummary,
  ] =
    useState<PayrollDashboardSummary | null>(
      null
    );

  // ==========================================================
  // SUCCESS NOTIFICATION
  // ==========================================================

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const saved =
      params.get(
        "saved"
      );

    if (
      saved === "income" ||
      saved === "expense"
    ) {
      setNotification(
        "Saved successfully"
      );

      window.history.replaceState(
        {},
        "",
        window.location.pathname
      );
    }
  }, []);

  useEffect(() => {
    if (
      !notification
    ) {
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
  }, [
    notification,
  ]);

  // ==========================================================
  // LOAD LOCAL DASHBOARD
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            "/api/local/dashboard",
            {
              cache: "no-store",
            }
          );

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data =
          (await response.json()) as LocalDashboardResponse;

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "Unable to load local dashboard."
          );
        }

        if (!active) {
          return;
        }

        setBusiness(data.business);
        setFinancialData(data.financialData);
        setInvoices(data.invoices ?? []);
        setCustomers(data.customers ?? []);
        setTobaskiSeasons(data.tobaskiSeasons ?? []);
        setTobaskiExpenses(data.tobaskiExpenses ?? []);
        setSheepSales(data.sheepSales ?? []);
        setTobaskiStock(data.tobaskiStock ?? []);
        setStockAvailable(data.stockAvailable ?? true);
        setHistoricalCustomerSales(
          data.historicalCustomerSales ?? []
        );
        setMemberRole(data.memberRole);
        setPayrollSummary(data.payrollSummary);
        setLoading(false);
      } catch (loadError) {
        console.error(loadError);

        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load dashboard."
          );

          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [router]);

  // ==========================================================
  // TRANSACTIONS AND PERIOD
  // ==========================================================

  const allTransactions =
    useMemo(
      () =>
        (
          financialData
            ?.transactions ??
          []
        ).filter(
          (transaction) =>
            transaction.transaction_type ===
              "income" ||
            transaction.transaction_type ===
              "expense" ||
            transaction.transaction_type ===
              "payroll"
        ),
      [
        financialData,
      ]
    );

  const periodTransactions =
    useMemo(
      () =>
        filterTransactionsByPeriod(
          allTransactions,
          period
        ),
      [
        allTransactions,
        period,
      ]
    );

  const payrollTransactionsThisMonth =
    useMemo(() => {
      const now =
        new Date();

      const start =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );

      const end =
        new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          1
        );

      return allTransactions.filter(
        (transaction) => {
          if (
            transaction.transaction_type !==
            "payroll"
          ) {
            return false;
          }

          const date =
            new Date(
              transaction.transaction_date
            );

          return (
            date >= start &&
            date < end
          );
        }
      );
    }, [
      allTransactions,
    ]);

  const dashboardPayrollSummary =
    useMemo<
      PayrollDashboardSummary | null
    >(() => {
      if (
        !payrollSummary
      ) {
        return null;
      }

      return {
        ...payrollSummary,

        paid_this_month:
          payrollTransactionsThisMonth.reduce(
            (
              total,
              transaction
            ) =>
              total +
              transaction.amount,
            0
          ),

        payments_this_month:
          payrollTransactionsThisMonth.length,
      };
    }, [
      payrollSummary,
      payrollTransactionsThisMonth,
    ]);

  const validInvoices =
    useMemo(
      () =>
        invoices.filter(
          (invoice) =>
            invoice.status !==
            "cancelled"
        ),
      [
        invoices,
      ]
    );

  const periodInvoices =
    useMemo(
      () =>
        filterInvoicesByPeriod(
          validInvoices,
          period
        ),
      [
        validInvoices,
        period,
      ]
    );

  // ==========================================================
  // CORE FINANCIALS
  // ==========================================================

  const totalIncome =
    useMemo(
      () =>
        periodTransactions
          .filter(
            (transaction) =>
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
        periodTransactions,
      ]
    );

  const rawPeriodExpenses =
    useMemo(
      () =>
        periodTransactions
          .filter(
            (transaction) =>
              transaction.transaction_type ===
                "expense" ||
              transaction.transaction_type ===
                "payroll"
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
        periodTransactions,
      ]
    );

  const viewerPayrollAdjustment = 0;

  const totalExpenses =
    rawPeriodExpenses +
    viewerPayrollAdjustment;

  const netProfit =
    totalIncome -
    totalExpenses;

  const profitMargin =
    totalIncome > 0
      ? (
          netProfit /
          totalIncome
        ) * 100
      : 0;

  const availableCash =
    useMemo(() => {
      const allIncome =
        allTransactions
          .filter(
            (transaction) =>
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
          );

      const allExpenses =
        allTransactions
          .filter(
            (transaction) =>
              transaction.transaction_type ===
                "expense" ||
              transaction.transaction_type ===
                "payroll"
          )
          .reduce(
            (
              total,
              transaction
            ) =>
              total +
              transaction.amount,
            0
          );

      return (
        allIncome -
        allExpenses
      );
    }, [
      allTransactions,
    ]);

  const dashboardAvailableCash =
    memberRole ===
      "viewer"
      ? availableCash -
        viewerPayrollAdjustment
      : availableCash;

  const accountsReceivable =
    useMemo(
      () =>
        validInvoices.reduce(
          (
            total,
            invoice
          ) =>
            total +
            Math.max(
              invoice.balance_due,
              0
            ),
          0
        ),
      [
        validInvoices,
      ]
    );

  const unpaidInvoiceCount =
    useMemo(
      () =>
        validInvoices.filter(
          (invoice) =>
            invoice.balance_due >
            0
        ).length,
      [
        validInvoices,
      ]
    );

  // ==========================================================
  // CUSTOMERS
  // ==========================================================

  const activeCustomers =
    useMemo(
      () =>
        customers.filter(
          (customer) =>
            customer.active !==
            false
        ),
      [
        customers,
      ]
    );

  const periodHistoricalCustomerSales =
    useMemo(() => {
      const start =
        getPeriodStart(
          period
        );

      if (!start) {
        return historicalCustomerSales;
      }

      return historicalCustomerSales.filter(
        (sale) =>
          new Date(
            sale.transaction_date
          ) >= start
      );
    }, [
      historicalCustomerSales,
      period,
    ]);

  const periodCustomerIds =
    useMemo(
      () =>
        new Set(
          [
            ...periodInvoices
              .map(
                (invoice) =>
                  invoice.customer_id
              ),

            ...periodHistoricalCustomerSales
              .map(
                (sale) =>
                  sale.contact_id
              ),
          ].filter(
            (
              customerId
            ): customerId is string =>
              Boolean(
                customerId
              )
          )
        ),
      [
        periodInvoices,
        periodHistoricalCustomerSales,
      ]
    );

  const periodCustomerValue =
    useMemo(
      () => {
        const invoiceValue =
          periodInvoices.reduce(
            (
              total,
              invoice
            ) =>
              invoice.customer_id
                ? total +
                  invoice.total_amount
                : total,
            0
          );

        const historicalValue =
          periodHistoricalCustomerSales.reduce(
            (
              total,
              sale
            ) =>
              total +
              sale.amount,
            0
          );

        return (
          invoiceValue +
          historicalValue
        );
      },
      [
        periodInvoices,
        periodHistoricalCustomerSales,
      ]
    );

  const averageCustomerValue =
    periodCustomerIds.size >
    0
      ? periodCustomerValue /
        periodCustomerIds.size
      : 0;

  const topCustomers =
    useMemo<
      CustomerValueRow[]
    >(() => {
      const customerMap =
        new Map(
          customers.map(
            (customer) => [
              customer.id,
              customer.name,
            ]
          )
        );

      const totals =
        new Map<
          string,
          {
            value: number;
            invoiceCount: number;
          }
        >();

      periodInvoices.forEach(
        (invoice) => {
          if (
            !invoice.customer_id
          ) {
            return;
          }

          const current =
            totals.get(
              invoice.customer_id
            ) ?? {
              value: 0,
              invoiceCount: 0,
            };

          totals.set(
            invoice.customer_id,
            {
              value:
                current.value +
                invoice.total_amount,

              invoiceCount:
                current.invoiceCount +
                1,
            }
          );
        }
      );

      periodHistoricalCustomerSales.forEach(
        (sale) => {
          if (
            !sale.contact_id
          ) {
            return;
          }

          const current =
            totals.get(
              sale.contact_id
            ) ?? {
              value: 0,
              invoiceCount: 0,
            };

          totals.set(
            sale.contact_id,
            {
              value:
                current.value +
                sale.amount,

              invoiceCount:
                current.invoiceCount +
                1,
            }
          );
        }
      );

      return Array.from(
        totals.entries()
      )
        .map(
          ([
            id,
            value,
          ]) => ({
            id,

            name:
              customerMap.get(
                id
              ) ??
              "Customer",

            value:
              value.value,

            invoiceCount:
              value.invoiceCount,
          })
        )
        .sort(
          (
            a,
            b
          ) =>
            b.value -
            a.value
        )
        .slice(
          0,
          5
        );
    }, [
      customers,
      periodInvoices,
      periodHistoricalCustomerSales,
    ]);
  // ==========================================================
  // BREAKDOWNS
  // ==========================================================

  const incomeSources =
    useMemo<
      BreakdownRow[]
    >(
      () =>
        groupTransactionsByCategory(
          periodTransactions,
          "income"
        ).slice(
          0,
          6
        ),
      [
        periodTransactions,
      ]
    );

  const expenseCategories =
    useMemo<
      BreakdownRow[]
    >(() => {
      const rows =
        groupTransactionsByCategory(
          periodTransactions,
          "expense"
        ).map(
          (row) => ({
            ...row,
          })
        );

      if (
        viewerPayrollAdjustment >
        0
      ) {
        const payrollRow =
          rows.find(
            (row) =>
              row.name
                .trim()
                .toLowerCase() ===
              "payroll"
          );

        if (
          payrollRow
        ) {
          payrollRow.value +=
            viewerPayrollAdjustment;
        }
        else {
          rows.push({
            name:
              "Payroll",
            value:
              viewerPayrollAdjustment,
          });
        }
      }

      return rows
        .sort(
          (
            a,
            b
          ) =>
            b.value -
            a.value
        )
        .slice(
          0,
          6
        );
    }, [
      periodTransactions,
      viewerPayrollAdjustment,
    ]);

  // ==========================================================
  // RECENT ACTIVITY
  // ==========================================================

  const recentTransactions =
    useMemo(
      () =>
        allTransactions.slice(
          0,
          5
        ),
      [
        allTransactions,
      ]
    );

  const dashboardTransactionCount =
    periodTransactions.length;

  // ==========================================================
  // TOBASKI
  // ==========================================================

  const currentTobaskiSeason =
    useMemo(
      () =>
        tobaskiSeasons.find(
          (season) =>
            season.active
        ) ??
        tobaskiSeasons[0] ??
        null,
      [
        tobaskiSeasons,
      ]
    );

  const tobaskiSummary =
    useMemo<TobaskiSummary | null>(() => {
      if (
        !currentTobaskiSeason
      ) {
        return null;
      }

      const seasonId =
        currentTobaskiSeason.id;

      const seasonExpenses =
        tobaskiExpenses.filter(
          (expense) =>
            expense.tobaski_season_id ===
            seasonId
        );

      const seasonInvoices =
        validInvoices.filter(
          (invoice) =>
            invoice.tobaski_season_id ===
            seasonId
        );

      const validSeasonInvoiceIds =
        new Set(
          seasonInvoices.map(
            (invoice) =>
              invoice.id
          )
        );

      const seasonSheepSales =
        sheepSales.filter(
          (sheep) =>
            sheep.tobaski_season_id ===
              seasonId &&
            (
              !sheep.invoice_id ||
              validSeasonInvoiceIds.has(
                sheep.invoice_id
              )
            )
        );

      const seasonStock =
        tobaskiStock.filter(
          (stock) =>
            stock.tobaski_season_id ===
            seasonId
        );

      const investment =
        seasonExpenses.reduce(
          (
            total,
            expense
          ) =>
            total +
            expense.amount,
          0
        );

      const sales =
        seasonInvoices.reduce(
          (
            total,
            invoice
          ) =>
            total +
            invoice.total_amount,
          0
        );

      const outstanding =
        seasonInvoices.reduce(
          (
            total,
            invoice
          ) =>
            total +
            Math.max(
              invoice.balance_due,
              0
            ),
          0
        );

      const fallbackBought =
        seasonExpenses.reduce(
          (
            total,
            expense
          ) =>
            total +
            Math.max(
              expense.tobaski_quantity ??
                0,
              0
            ),
          0
        );

      const useStock =
        stockAvailable &&
        seasonStock.length >
          0;

      const bought =
        useStock
          ? seasonStock.length
          : fallbackBought;

      const sold =
        useStock
          ? seasonStock.filter(
              (stock) =>
                stock.stock_status
                  .toLowerCase() ===
                "sold"
            ).length
          : seasonSheepSales.length;

      const remaining =
        Math.max(
          bought -
            sold,
          0
        );

      const profit =
        sales -
        investment;

      const roi =
        investment > 0
          ? (
              profit /
              investment
            ) * 100
          : 0;

      return {
        investment,
        sales,
        outstanding,
        bought,
        sold,
        remaining,
        profit,
        roi,
      };
    }, [
      currentTobaskiSeason,
      tobaskiExpenses,
      validInvoices,
      sheepSales,
      tobaskiStock,
      stockAvailable,
    ]);

  // ==========================================================
  // ROLE RULES
  // ==========================================================

  const canRecordTransactions =
    memberRole !==
    "viewer";

  const canManagePayroll =
    memberRole ===
      "super_admin" ||
    memberRole ===
      "owner" ||
    memberRole ===
      "admin";

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef3f0]">
        <div className="text-center">
          <Coins
            size={31}
            className="mx-auto text-[#0b5136]"
          />

          <p className="mt-4 text-[18px] font-semibold text-slate-600">
            Loading financial dashboard...
          </p>
        </div>
      </main>
    );
  }

  const businessName =
    business
      ?.trading_name ||
    business?.name ||
    "Djallows Farm";

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <FinancePageShell
      eyebrow={
        businessName
      }
      title="Financial Dashboard"
      description="A clear management view of income, expenses, cash position, customers, Tobaski and payroll."
    >
      {notification && (
        <div className="fixed right-5 top-5 z-[100] w-[360px] max-w-[calc(100%-2rem)]">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2
                size={21}
              />
            </div>

            <p className="flex-1 text-[16px] font-bold text-emerald-900">
              {notification}
            </p>

            <button
              type="button"
              onClick={() =>
                setNotification(
                  ""
                )
              }
              className="text-slate-500"
              aria-label="Close notification"
            >
              <X
                size={18}
              />
            </button>
          </div>
        </div>
      )}

      <section className="mb-4 rounded-[22px] border border-white/90 bg-white/95 px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[13px] font-black uppercase tracking-[0.15em] text-[#0b6b47]">
              Management Snapshot
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-[24px] font-black tracking-tight text-slate-950">
                {getPeriodLabel(
                  period
                )}
              </h2>

              {memberRole ===
                "viewer" && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-bold text-slate-500">
                  View only
                </span>
              )}
            </div>

            <p className="mt-1 text-[15px] font-medium text-slate-500">
              Key figures, category mix and latest activity in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
                <CalendarDays
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <select
                  value={
                    period
                  }
                  onChange={(
                    event
                  ) =>
                    setPeriod(
                      event.target
                        .value as Period
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-[14px] font-bold text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="month">
                    This Month
                  </option>

                  <option value="quarter">
                    This Quarter
                  </option>

                  <option value="year">
                    This Year
                  </option>

                  <option value="all">
                    All Time
                  </option>
                </select>
              </div>

            {canRecordTransactions && (
              <>
                <Link
                  href="/income/new"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0b6b47] px-4 py-2.5 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#085638]"
                >
                  <Plus
                    size={15}
                  />
                  Income
                </Link>

                <Link
                  href="/expenses/new"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-[14px] font-bold text-white shadow-sm transition hover:bg-slate-800"
                >
                  <Plus
                    size={15}
                  />
                  Expense
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] font-semibold text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardMetricCard
          title="Total Income"
          amount={
            money(
              totalIncome
            )
          }
          note={
            getPeriodLabel(
              period
            )
          }
          icon={
            <ArrowUpRight
              size={20}
            />
          }
          tone="emerald"
        />

        <DashboardMetricCard
          title="Total Expenses"
          amount={
            money(
              totalExpenses
            )
          }
          note={
            getPeriodLabel(
              period
            )
          }
          icon={
            <ArrowDownRight
              size={20}
            />
          }
          tone="rose"
        />

        <DashboardMetricCard
          title={
            netProfit >= 0
              ? "Net Profit"
              : "Net Loss"
          }
          amount={
            money(
              Math.abs(
                netProfit
              )
            )
          }
          note={`${percentage(
            Math.abs(
              profitMargin
            )
          )} margin`}
          icon={
            <TrendingUp
              size={20}
            />
          }
          tone={
            netProfit >= 0
              ? "emerald"
              : "amber"
          }
          featured={
            netProfit >= 0
          }
        />

        <DashboardMetricCard
          title="Cash Position"
          amount={
            money(
              dashboardAvailableCash
            )
          }
          note="Recorded balance"
          icon={
            <Wallet
              size={20}
            />
          }
          tone="blue"
        />

        <DashboardMetricCard
          title="Outstanding"
          amount={
            money(
              accountsReceivable
            )
          }
          note={`${unpaidInvoiceCount} unpaid invoice${
            unpaidInvoiceCount ===
            1
              ? ""
              : "s"
          }`}
          icon={
            <ReceiptText
              size={20}
            />
          }
          tone="orange"
        />

        <DashboardMetricCard
          title="Transactions"
          amount={
            dashboardTransactionCount
              .toLocaleString()
          }
          note={
            getPeriodLabel(
              period
            )
          }
          icon={
            <Coins
              size={20}
            />
          }
          tone="violet"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1.05fr]">
        <DonutBreakdownCard
          eyebrow="Income Breakdown"
          title="Where Money Came From"
          rows={
            incomeSources
          }
          total={
            totalIncome
          }
          emptyText="No income recorded for this period."
        />

        <DonutBreakdownCard
          eyebrow="Expense Breakdown"
          title="Where Money Was Spent"
          rows={
            expenseCategories
          }
          total={
            totalExpenses
          }
          emptyText="No expenses recorded for this period."
        />

        {currentTobaskiSeason &&
        tobaskiSummary ? (
          <TobaskiSnapshotCard
            seasonName={
              currentTobaskiSeason.season_name
            }
            summary={
              tobaskiSummary
            }
          />
        ) : (
          <BusinessPulseCard
            profitMargin={
              profitMargin
            }
            averageCustomerValue={
              averageCustomerValue
            }
            activeCustomersCount={
              activeCustomers.length
            }
            accountsReceivable={
              accountsReceivable
            }
          />
        )}
      </div>

      <div
        className={`mt-4 grid gap-4 ${
          payrollSummary
            ? "xl:grid-cols-3"
            : "xl:grid-cols-2"
        }`}
      >
        <RecentTransactionsCard
          rows={
            recentTransactions
          }
        />

        <TopCustomersCard
          rows={
            topCustomers
          }
        />

        {dashboardPayrollSummary && (
          <PayrollSummaryCard
            summary={
              dashboardPayrollSummary
            }
            canManage={
              canManagePayroll
            }
          />
        )}
      </div>
    </FinancePageShell>
  );
}

// ============================================================
// DASHBOARD METRIC CARD
// ============================================================

function DashboardMetricCard({
  title,
  amount,
  note,
  icon,
  tone,
  featured = false,
}: {
  title: string;
  amount: string;
  note: string;
  icon: ReactNode;
  tone:
    | "emerald"
    | "rose"
    | "blue"
    | "orange"
    | "violet"
    | "amber";
  featured?: boolean;
}) {
  const toneMap = {
    emerald:
      "bg-emerald-100 text-emerald-700",
    rose:
      "bg-rose-100 text-rose-700",
    blue:
      "bg-blue-100 text-blue-700",
    orange:
      "bg-orange-100 text-orange-700",
    violet:
      "bg-violet-100 text-violet-700",
    amber:
      "bg-amber-100 text-amber-700",
  };

  return (
    <div
      className={`group rounded-[20px] border p-4 shadow-[0_6px_24px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_34px_rgba(15,23,42,0.10)] ${
        featured
          ? "border-[#0b6b47] bg-gradient-to-br from-[#0b6b47] to-[#084d35] text-white"
          : "border-white/90 bg-white text-slate-950"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            featured
              ? "bg-white/15 text-white"
              : toneMap[
                  tone
                ]
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={`whitespace-normal text-[10px] font-black uppercase leading-tight tracking-[0.02em] sm:text-[11px] ${
              featured
                ? "text-emerald-100"
                : "text-slate-500"
            }`}
          >
            {title}
          </p>

          <p
            className={`mt-1.5 whitespace-nowrap text-[18px] font-black leading-tight tracking-tight sm:text-[20px] ${
              featured
                ? "text-white"
                : "text-slate-950"
            }`}
          >
            {amount}
          </p>
        </div>
      </div>

      <div
        className={`mt-3 border-t pt-2 ${
          featured
            ? "border-white/10"
            : "border-slate-100"
        }`}
      >
        <p
          className={`text-[12px] font-semibold ${
            featured
              ? "text-emerald-50"
              : "text-slate-500"
          }`}
        >
          {note}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// DONUT BREAKDOWN CARD
// ============================================================

function DonutBreakdownCard({
  eyebrow,
  title,
  rows,
  total,
  emptyText,
}: {
  eyebrow: string;
  title: string;
  rows: BreakdownRow[];
  total: number;
  emptyText: string;
}) {
  const chartRows =
    rows
      .slice(
        0,
        5
      )
      .map(
        (
          row,
          index
        ) => ({
          ...row,
          color:
            donutColors[
              index %
                donutColors.length
            ],
        })
      );

  return (
    <section className="rounded-[22px] border border-white/90 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#0b6b47]">
            {eyebrow}
          </p>

          <h2 className="mt-1 text-[19px] font-black text-slate-950">
            {title}
          </h2>
        </div>

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
          Top {Math.min(
            chartRows.length,
            5
          )}
        </span>
      </div>

      {chartRows.length >
      0 ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr] sm:items-center">
          <div className="relative h-[160px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={
                    chartRows
                  }
                  dataKey="value"
                  nameKey="name"
                  innerRadius={42}
                  outerRadius={64}
                  paddingAngle={
                    2
                  }
                  strokeWidth={
                    0
                  }
                >
                  {chartRows.map(
                    (row) => (
                      <Cell
                        key={
                          row.name
                        }
                        fill={
                          row.color
                        }
                      />
                    )
                  )}
                </Pie>

                <Tooltip
                  formatter={(
                    value
                  ) =>
                    money(
                      Number(
                        value
                      )
                    )
                  }
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Total
                </p>

                <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                  GMD
                </p>

                <p className="mt-0.5 text-[15px] font-black leading-none text-slate-900">
                  {money(total).replace("GMD ", "")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {chartRows.map(
              (row) => {
                const share =
                  total > 0
                    ? (
                        row.value /
                        total
                      ) * 100
                    : 0;

                return (
                  <div
                    key={
                      row.name
                    }
                    className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-start gap-x-3"
                  >

                    <span
                      className="mt-1.5 h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          row.color,
                      }}
                    />

                    <div className="min-w-0">

                      <p className="truncate text-[14px] font-bold leading-5 text-slate-800">
                        {row.name}
                      </p>

                      <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                        {share.toFixed(
                          1
                        )}
                        %
                      </p>

                    </div>

                    <p className="min-w-[110px] whitespace-nowrap text-right text-[13px] font-black leading-5 text-slate-950">
                      {money(
                        row.value
                      )}
                    </p>

                  </div>
                );
              }
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          text={
            emptyText
          }
        />
      )}
    </section>
  );
}

// ============================================================
// TOBASKI SNAPSHOT CARD
// ============================================================

function TobaskiSnapshotCard({
  seasonName,
  summary,
}: {
  seasonName: string;
  summary: TobaskiSummary;
}) {
  return (
    <section className="overflow-hidden rounded-[22px] border border-emerald-200 bg-gradient-to-br from-[#0b5136] via-[#0a6040] to-[#063522] p-4 text-white shadow-[0_10px_30px_rgba(11,81,54,0.20)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
            <PawPrint
              size={21}
            />
          </div>

          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.13em] text-emerald-100">
              Tobaski Snapshot
            </p>

            <h2 className="mt-1 text-[19px] font-black">
              {seasonName}
            </h2>
          </div>
        </div>

        <Link
          href="/reports/tobaski"
          className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-white/15"
        >
          View report
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <MiniStat
          label="Invested"
          value={
            money(
              summary.investment
            )
          }
          dark
        />

        <MiniStat
          label="Sales"
          value={
            money(
              summary.sales
            )
          }
          dark
        />

        <MiniStat
          label={
            summary.profit >=
            0
              ? "Profit"
              : "Loss"
          }
          value={
            money(
              Math.abs(
                summary.profit
              )
            )
          }
          dark
        />

        <MiniStat
          label="ROI"
          value={
            percentage(
              summary.roi
            )
          }
          dark
        />
      </div>

      <div className="mt-3 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/10 py-3">
        <TobaskiNumber
          label="Bought"
          value={
            summary.bought
          }
        />

        <TobaskiNumber
          label="Sold"
          value={
            summary.sold
          }
        />

        <TobaskiNumber
          label="Remaining"
          value={
            summary.remaining
          }
        />
      </div>

      <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-3 py-3">
        <span className="text-[12px] font-bold uppercase tracking-wide text-emerald-100">
          Outstanding
        </span>

        <strong className="text-[15px] font-black text-white">
          {money(
            summary.outstanding
          )}
        </strong>
      </div>
    </section>
  );
}

function TobaskiNumber({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="text-center">
      <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100">
        {label}
      </p>

      <p className="mt-1 text-[19px] font-black text-white">
        {value}
      </p>
    </div>
  );
}

// ============================================================
// RECENT TRANSACTIONS
// ============================================================

function RecentTransactionsCard({
  rows,
}: {
  rows: LedgerTransaction[];
}) {
  return (
    <section className="rounded-[22px] border border-white/90 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#0b6b47]">
            Latest Activity
          </p>

          <h2 className="mt-1 text-[19px] font-black text-slate-950">
            Recent Transactions
          </h2>
        </div>

        <Link
          href="/reports"
          className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100"
        >
          View all
        </Link>
      </div>

      {rows.length >
      0 ? (
        <div className="mt-3 divide-y divide-slate-100">
          {rows.map(
            (transaction) => {
              const isIncome =
                transaction.transaction_type ===
                "income";

              return (
                <div
                  key={
                    transaction.id
                  }
                  className="flex items-center gap-3 py-2.5"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      isIncome
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUpRight
                        size={16}
                      />
                    ) : (
                      <ArrowDownRight
                        size={16}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-slate-900">
                      {
                        transaction.description
                      }
                    </p>

                    <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                      {formatDate(
                        transaction.transaction_date
                      )}
                      {" · "}
                      {transaction.category_name ||
                        "Uncategorised"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p
                      className={`whitespace-nowrap text-[13px] font-black ${
                        isIncome
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }`}
                    >
                      {isIncome
                        ? "+"
                        : "-"}
                      {money(
                        transaction.amount
                      )}
                    </p>


                  </div>
                </div>
              );
            }
          )}
        </div>
      ) : (
        <EmptyState
          text="No recent transactions yet."
        />
      )}
    </section>
  );
}

// ============================================================
// TOP CUSTOMERS
// ============================================================

function TopCustomersCard({
  rows,
}: {
  rows: CustomerValueRow[];
}) {
  return (
    <section className="rounded-[22px] border border-white/90 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#0b6b47]">
            Customers
          </p>

          <h2 className="mt-1 text-[19px] font-black text-slate-950">
            Top Customers
          </h2>
        </div>

        <Link
          href="/contacts"
          className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100"
        >
          View all
        </Link>
      </div>

      {rows.length >
      0 ? (
        <div className="mt-3 divide-y divide-slate-100">
          {rows.map(
            (
              customer,
              index
            ) => (
              <div
                key={
                  customer.id
                }
                className="flex items-center gap-3 py-2.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef7f2] text-[13px] font-black text-[#0b6b47]">
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-slate-900">
                    {customer.name}
                  </p>

                  <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                    {customer.invoiceCount} sale
                    {customer.invoiceCount ===
                    1
                      ? ""
                      : "s"}
                  </p>
                </div>

                <p className="whitespace-nowrap text-[13px] font-black text-slate-950">
                  {money(
                    customer.value
                  )}
                </p>
              </div>
            )
          )}
        </div>
      ) : (
        <EmptyState
          text="No customer sales for this period."
        />
      )}
    </section>
  );
}

// ============================================================
// PAYROLL SUMMARY
// ============================================================

function PayrollSummaryCard({
  summary,
  canManage,
}: {
  summary:
    PayrollDashboardSummary;
  canManage: boolean;
}) {
  return (
    <section className="rounded-[22px] border border-white/90 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#0b6b47]">
            Payroll
          </p>

          <h2 className="mt-1 text-[19px] font-black text-slate-950">
            Payroll Summary
          </h2>

          <p className="mt-0.5 text-[11px] font-medium text-slate-400">
            This Month
          </p>
        </div>

        {canManage && (
          <Link
            href="/staff"
            className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100"
          >
            View all
          </Link>
        )}
      </div>

      <div className="mt-3 divide-y divide-slate-100">
        <PayrollRow
          icon={
            <Users
              size={15}
            />
          }
          label="Active Employees"
          value={String(
            summary.active_employees
          )}
        />

        <PayrollRow
          icon={
            <Banknote
              size={15}
            />
          }
          label="Paid This Month"
          value={
            money(
              summary.paid_this_month
            )
          }
          positive
        />

        <PayrollRow
          icon={
            <ReceiptText
              size={15}
            />
          }
          label="Salary Payments"
          value={String(
            summary.payments_this_month
          )}
        />
      </div>

      {canManage ? (
        <Link
          href="/staff/pay"
          className="mt-3 block rounded-xl bg-[#0b6b47] px-3 py-2.5 text-center text-[13px] font-bold text-white shadow-sm transition hover:bg-[#085638]"
        >
          Record Salary Payment
        </Link>
      ) : (
        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-center">
          <p className="text-[11px] font-bold text-slate-400">
            Summary totals only
          </p>
        </div>
      )}
    </section>
  );
}

function PayrollRow({
  icon,
  label,
  value,
  positive = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${
            positive
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {icon}
        </div>

        <span className="text-[13px] font-semibold text-slate-600">
          {label}
        </span>
      </div>

      <span
        className={`whitespace-nowrap text-[14px] font-black ${
          positive
            ? "text-emerald-700"
            : "text-slate-950"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================
// BUSINESS PULSE
// ============================================================

function BusinessPulseCard({
  profitMargin,
  averageCustomerValue,
  activeCustomersCount,
  accountsReceivable,
}: {
  profitMargin: number;
  averageCustomerValue: number;
  activeCustomersCount: number;
  accountsReceivable: number;
}) {
  return (
    <section className="rounded-[22px] border border-white/90 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.06)] sm:p-5">
      <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#0b6b47]">
        Business Pulse
      </p>

      <h2 className="mt-1 text-[19px] font-black text-slate-950">
        Key Highlights
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <MiniStat
          label="Profit Margin"
          value={
            percentage(
              profitMargin
            )
          }
        />

        <MiniStat
          label="Average Customer"
          value={
            money(
              averageCustomerValue
            )
          }
        />

        <MiniStat
          label="Customers"
          value={String(
            activeCustomersCount
          )}
        />

        <MiniStat
          label="Receivables"
          value={
            money(
              accountsReceivable
            )
          }
        />
      </div>
    </section>
  );
}

// ============================================================
// MINI STAT
// ============================================================

function MiniStat({
  label,
  value,
  dark = false,
}: {
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        dark
          ? "border-white/10 bg-white/10"
          : "border-slate-100 bg-slate-50/70"
      }`}
    >
      <p
        className={`text-[11px] font-black uppercase tracking-[0.07em] ${
          dark
            ? "text-emerald-100"
            : "text-slate-500"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-1.5 break-words text-[15px] font-black ${
          dark
            ? "text-white"
            : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex min-h-[150px] items-center justify-center px-5 text-center">
      <div>
        <Coins
          size={24}
          className="mx-auto text-[#0b6b47]"
        />

        <p className="mt-3 text-[14px] font-medium text-slate-500">
          {text}
        </p>
      </div>
    </div>
  );
}
