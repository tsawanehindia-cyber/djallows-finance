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
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Banknote,
  FileText,
  Loader2,
  PackageOpen,
  PawPrint,
  Percent,
  Plus,
  ReceiptText,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import AppNotification from "@/components/AppNotification";
import FinancePageShell from "@/components/FinancePageShell";
import { supabase } from "@/lib/supabase";

// ============================================================
// TYPES
// ============================================================

type MemberRole = "owner" | "admin" | "staff";

type Membership = {
  business_id: string;
  role: MemberRole;
};

type TobaskiSeason = {
  id: string;
  season_name: string;
  season_year: number;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
};

type ExpenseTransaction = {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  category_id: string | null;
  tobaski_season_id: string | null;
  tobaski_quantity: number | null;
};

type Category = {
  id: string;
  name: string;
};

type TobaskiInvoice = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  tobaski_season_id: string | null;
};

type SheepSale = {
  id: string;
  invoice_id: string | null;
  sale_date: string;
  sale_price: number;
  breed_type: string | null;
  sex: string | null;
  tobaski_season_id: string | null;
};

type TobaskiStockRow = {
  id: string;
  business_id: string;
  tobaski_season_id: string;
  purchase_transaction_id: string | null;
  purchase_line_number: number;
  stock_number: string;
  sheep_name: string | null;
  sheep_tag: string | null;
  breed_type: string | null;
  sex: string | null;
  purchase_date: string;
  notes: string | null;
  stock_status: string;
  sheep_sale_detail_id: string | null;
  sale_date: string | null;
  sale_price: number | null;
  invoice_id: string | null;
  invoice_number: string | null;
};

type ExpenseBreakdown = {
  id: string;
  name: string;
  amount: number;
  count: number;
};

type SeasonSummary = {
  season: TobaskiSeason;
  investment: number;
  sheepBought: number;
  sheepSold: number;
  remaining: number;
  salesReturn: number;
  cashCollected: number;
  outstanding: number;
  profit: number;
  roi: number;
  averageCostPerSheep: number;
  averageSaleValue: number;
  expenseCount: number;
  invoiceCount: number;
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

function percent(value: number) {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

function formatDate(dateString: string | null) {
  if (!dateString) {
    return "—";
  }

  const dateOnly = String(dateString).slice(0, 10);

  const date = new Date(`${dateOnly}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateOnly;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function currentYear() {
  return new Date().getFullYear();
}

function cleanSex(value: string | null) {
  if (!value) {
    return "—";
  }

  const lower = value.toLowerCase();

  if (lower === "male") {
    return "Male";
  }

  if (lower === "female") {
    return "Female";
  }

  return value;
}

// ============================================================
// PAGE
// ============================================================

export default function TobaskiReportPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [businessId, setBusinessId] = useState("");

  const [userId, setUserId] = useState("");

  const [memberRole, setMemberRole] =
    useState<MemberRole>("staff");

  const [seasons, setSeasons] =
    useState<TobaskiSeason[]>([]);

  const [expenses, setExpenses] =
    useState<ExpenseTransaction[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [invoices, setInvoices] =
    useState<TobaskiInvoice[]>([]);

  const [sheepSales, setSheepSales] =
    useState<SheepSale[]>([]);

  const [stockRows, setStockRows] =
    useState<TobaskiStockRow[]>([]);

  const [
    stockFeatureAvailable,
    setStockFeatureAvailable,
  ] = useState(false);

  const [
    selectedSeasonId,
    setSelectedSeasonId,
  ] = useState("");

  const [searchText, setSearchText] =
    useState("");

  // ==========================================================
  // NEW SEASON
  // ==========================================================

  const [
    showNewSeason,
    setShowNewSeason,
  ] = useState(false);

  const [
    newSeasonYear,
    setNewSeasonYear,
  ] = useState(
    String(currentYear() + 1)
  );

  const [
    creatingSeason,
    setCreatingSeason,
  ] = useState(false);

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
      window.setTimeout(() => {
        setNotification("");
      }, 3000);

    return () =>
      window.clearTimeout(timer);
  }, [notification]);

  // ==========================================================
  // PERMISSION
  // ==========================================================

  const isOwnerOrAdmin =
    memberRole === "owner" ||
    memberRole === "admin";

  // ==========================================================
  // LOAD
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadReport() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { session },
          error: sessionError,
        } =
          await supabase.auth.getSession();

        if (
          sessionError ||
          !session
        ) {
          router.replace("/login");

          return;
        }

        const {
          data: membershipData,
          error: membershipError,
        } = await supabase
          .from("business_members")
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
          !membershipData
        ) {
          throw new Error(
            "Unable to find your Djallows Farm business access."
          );
        }

        const membership =
          membershipData as Membership;

        const [
          seasonResult,
          expenseResult,
          categoryResult,
          invoiceResult,
          sheepResult,
        ] = await Promise.all([
          supabase
            .from("tobaski_seasons")
            .select(
              `
              id,
              season_name,
              season_year,
              active,
              start_date,
              end_date,
              notes
            `
            )
            .eq(
              "business_id",
              membership.business_id
            )
            .order(
              "season_year",
              {
                ascending: false,
              }
            ),

          supabase
            .from("transactions")
            .select(
              `
              id,
              transaction_date,
              description,
              amount,
              category_id,
              tobaski_season_id,
              tobaski_quantity
            `
            )
            .eq(
              "business_id",
              membership.business_id
            )
            .eq(
              "transaction_type",
              "expense"
            )
            .not(
              "tobaski_season_id",
              "is",
              null
            )
            .order(
              "transaction_date",
              {
                ascending: false,
              }
            ),

          supabase
            .from("categories")
            .select(
              `
              id,
              name
            `
            )
            .eq(
              "business_id",
              membership.business_id
            )
            .eq(
              "category_type",
              "expense"
            )
            .order("name"),

          supabase
            .from("invoices")
            .select(
              `
              id,
              invoice_number,
              invoice_date,
              total_amount,
              amount_paid,
              balance_due,
              status,
              tobaski_season_id
            `
            )
            .eq(
              "business_id",
              membership.business_id
            )
            .not(
              "tobaski_season_id",
              "is",
              null
            )
            .order(
              "invoice_date",
              {
                ascending: false,
              }
            ),

          supabase
            .from(
              "sheep_sale_details"
            )
            .select(
              `
              id,
              invoice_id,
              sale_date,
              sale_price,
              breed_type,
              sex,
              tobaski_season_id
            `
            )
            .eq(
              "business_id",
              membership.business_id
            )
            .not(
              "tobaski_season_id",
              "is",
              null
            )
            .order(
              "sale_date",
              {
                ascending: false,
              }
            ),
        ]);

        if (seasonResult.error) {
          throw new Error(
            `Unable to load Tobaski seasons: ${seasonResult.error.message}`
          );
        }

        if (expenseResult.error) {
          throw new Error(
            `Unable to load Tobaski expenses: ${expenseResult.error.message}`
          );
        }

        if (categoryResult.error) {
          throw new Error(
            `Unable to load expense categories: ${categoryResult.error.message}`
          );
        }

        if (invoiceResult.error) {
          throw new Error(
            `Unable to load Tobaski sales: ${invoiceResult.error.message}`
          );
        }

        if (sheepResult.error) {
          throw new Error(
            `Unable to load sheep sales: ${sheepResult.error.message}`
          );
        }

        // ====================================================
        // INDIVIDUAL TOBASKI STOCK
        //
        // This is intentionally optional.
        // If the stock foundation has not been created yet,
        // the report still works using the existing totals.
        // ====================================================

        let loadedStock:
          TobaskiStockRow[] = [];

        let hasStockFeature =
          false;

        const stockResult =
          await supabase
            .from(
              "tobaski_sheep_position"
            )
            .select(
              `
              id,
              business_id,
              tobaski_season_id,
              purchase_transaction_id,
              purchase_line_number,
              stock_number,
              sheep_name,
              sheep_tag,
              breed_type,
              sex,
              purchase_date,
              notes,
              stock_status,
              sheep_sale_detail_id,
              sale_date,
              sale_price,
              invoice_id,
              invoice_number
            `
            )
            .eq(
              "business_id",
              membership.business_id
            )
            .order(
              "stock_number",
              {
                ascending: true,
              }
            );

        if (!stockResult.error) {
          hasStockFeature = true;

          loadedStock =
            (
              stockResult.data ?? []
            ).map((row) => ({
              id: row.id,

              business_id:
                row.business_id,

              tobaski_season_id:
                row.tobaski_season_id,

              purchase_transaction_id:
                row.purchase_transaction_id,

              purchase_line_number:
                Number(
                  row.purchase_line_number ??
                    0
                ),

              stock_number:
                row.stock_number,

              sheep_name:
                row.sheep_name,

              sheep_tag:
                row.sheep_tag,

              breed_type:
                row.breed_type,

              sex:
                row.sex,

              purchase_date:
                row.purchase_date,

              notes:
                row.notes,

              stock_status:
                row.stock_status ??
                "Remaining",

              sheep_sale_detail_id:
                row.sheep_sale_detail_id,

              sale_date:
                row.sale_date,

              sale_price:
                row.sale_price === null
                  ? null
                  : Number(
                      row.sale_price
                    ),

              invoice_id:
                row.invoice_id,

              invoice_number:
                row.invoice_number,
            }));
        } else {
          console.warn(
            "Individual Tobaski stock is not available yet:",
            stockResult.error.message
          );
        }

        if (!active) {
          return;
        }

        const loadedSeasons =
          (
            seasonResult.data ?? []
          ).map((row) => ({
            id: row.id,

            season_name:
              row.season_name,

            season_year:
              Number(
                row.season_year
              ),

            active:
              row.active ?? true,

            start_date:
              row.start_date,

            end_date:
              row.end_date,

            notes:
              row.notes,
          }));

        setBusinessId(
          membership.business_id
        );

        setUserId(
          session.user.id
        );

        setMemberRole(
          membership.role
        );

        setSeasons(
          loadedSeasons
        );

        setExpenses(
          (
            expenseResult.data ?? []
          ).map((row) => ({
            id: row.id,

            transaction_date:
              row.transaction_date,

            description:
              row.description ?? "",

            amount:
              Number(
                row.amount ?? 0
              ),

            category_id:
              row.category_id,

            tobaski_season_id:
              row.tobaski_season_id,

            tobaski_quantity:
              row.tobaski_quantity ===
              null
                ? null
                : Number(
                    row.tobaski_quantity
                  ),
          }))
        );

        setCategories(
          (
            categoryResult.data ?? []
          ).map((row) => ({
            id: row.id,
            name: row.name,
          }))
        );

        setInvoices(
          (
            invoiceResult.data ?? []
          ).map((row) => ({
            id: row.id,

            invoice_number:
              row.invoice_number,

            invoice_date:
              row.invoice_date,

            total_amount:
              Number(
                row.total_amount ?? 0
              ),

            amount_paid:
              Number(
                row.amount_paid ?? 0
              ),

            balance_due:
              Number(
                row.balance_due ?? 0
              ),

            status:
              row.status ?? "unpaid",

            tobaski_season_id:
              row.tobaski_season_id,
          }))
        );

        setSheepSales(
          (
            sheepResult.data ?? []
          ).map((row) => ({
            id: row.id,

            invoice_id:
              row.invoice_id,

            sale_date:
              row.sale_date,

            sale_price:
              Number(
                row.sale_price ?? 0
              ),

            breed_type:
              row.breed_type,

            sex:
              row.sex,

            tobaski_season_id:
              row.tobaski_season_id,
          }))
        );

        setStockRows(
          loadedStock
        );

        setStockFeatureAvailable(
          hasStockFeature
        );

        if (
          loadedSeasons.length > 0
        ) {
          setSelectedSeasonId(
            (current) =>
              current ||
              loadedSeasons[0].id
          );
        }

        setLoading(false);
      } catch (loadError) {
        console.error(loadError);

        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the Tobaski report."
          );

          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      active = false;
    };
  }, [router]);

  // ==========================================================
  // CATEGORY LOOKUP
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

  // ==========================================================
  // SUMMARY FOR EACH YEAR
  // ==========================================================

  const seasonSummaries =
    useMemo(() => {
      return seasons.map(
        (season) => {
          const seasonExpenses =
            expenses.filter(
              (expense) =>
                expense.tobaski_season_id ===
                season.id
            );

          const seasonInvoices =
            invoices.filter(
              (invoice) =>
                invoice.tobaski_season_id ===
                  season.id &&
                invoice.status !==
                  "cancelled"
            );

          const validInvoiceIds =
            new Set(
              seasonInvoices.map(
                (invoice) =>
                  invoice.id
              )
            );

          const seasonSheepSales =
            sheepSales.filter(
              (sheep) => {
                if (
                  sheep.tobaski_season_id !==
                  season.id
                ) {
                  return false;
                }

                if (
                  !sheep.invoice_id
                ) {
                  return true;
                }

                return validInvoiceIds.has(
                  sheep.invoice_id
                );
              }
            );

          const seasonStock =
            stockRows.filter(
              (stock) =>
                stock.tobaski_season_id ===
                season.id
            );

          const investment =
            seasonExpenses.reduce(
              (total, expense) =>
                total +
                expense.amount,
              0
            );

          const fallbackBought =
            seasonExpenses.reduce(
              (total, expense) =>
                total +
                Math.max(
                  expense.tobaski_quantity ??
                    0,
                  0
                ),
              0
            );

          const stockBought =
            seasonStock.length;

          const stockSold =
            seasonStock.filter(
              (stock) =>
                stock.stock_status
                  .toLowerCase() ===
                "sold"
            ).length;

          const useIndividualStock =
            stockFeatureAvailable &&
            stockBought > 0;

          const sheepBought =
            useIndividualStock
              ? stockBought
              : fallbackBought;

          const sheepSold =
            useIndividualStock
              ? stockSold
              : seasonSheepSales.length;

          const remaining =
            Math.max(
              sheepBought -
                sheepSold,
              0
            );

          const salesReturn =
            seasonInvoices.reduce(
              (total, invoice) =>
                total +
                invoice.total_amount,
              0
            );

          const cashCollected =
            seasonInvoices.reduce(
              (total, invoice) =>
                total +
                invoice.amount_paid,
              0
            );

          const outstanding =
            seasonInvoices.reduce(
              (total, invoice) =>
                total +
                invoice.balance_due,
              0
            );

          const profit =
            salesReturn -
            investment;

          const roi =
            investment > 0
              ? (
                  profit /
                  investment
                ) *
                100
              : 0;

          const averageCostPerSheep =
            sheepBought > 0
              ? investment /
                sheepBought
              : 0;

          const averageSaleValue =
            sheepSold > 0
              ? salesReturn /
                sheepSold
              : 0;

          const summary:
            SeasonSummary = {
            season,
            investment,
            sheepBought,
            sheepSold,
            remaining,
            salesReturn,
            cashCollected,
            outstanding,
            profit,
            roi,
            averageCostPerSheep,
            averageSaleValue,
            expenseCount:
              seasonExpenses.length,
            invoiceCount:
              seasonInvoices.length,
          };

          return summary;
        }
      );
    }, [
      seasons,
      expenses,
      invoices,
      sheepSales,
      stockRows,
      stockFeatureAvailable,
    ]);

  const selectedSummary =
    seasonSummaries.find(
      (summary) =>
        summary.season.id ===
        selectedSeasonId
    ) ??
    seasonSummaries[0] ??
    null;

  // ==========================================================
  // SELECTED YEAR DATA
  // ==========================================================

  const selectedExpenses =
    useMemo(() => {
      return expenses.filter(
        (expense) =>
          expense.tobaski_season_id ===
          selectedSeasonId
      );
    }, [
      expenses,
      selectedSeasonId,
    ]);

  const selectedInvoices =
    useMemo(() => {
      return invoices.filter(
        (invoice) =>
          invoice.tobaski_season_id ===
            selectedSeasonId &&
          invoice.status !==
            "cancelled"
      );
    }, [
      invoices,
      selectedSeasonId,
    ]);

  const selectedStock =
    useMemo(() => {
      return stockRows.filter(
        (stock) =>
          stock.tobaski_season_id ===
          selectedSeasonId
      );
    }, [
      stockRows,
      selectedSeasonId,
    ]);

  const remainingStock =
    useMemo(() => {
      return selectedStock.filter(
        (stock) =>
          stock.stock_status
            .toLowerCase() !==
          "sold"
      );
    }, [selectedStock]);

  // ==========================================================
  // SEARCH
  // ==========================================================

  const normalizedSearch =
    searchText
      .trim()
      .toLowerCase();

  const searchedExpenses =
    useMemo(() => {
      if (
        !normalizedSearch
      ) {
        return selectedExpenses;
      }

      return selectedExpenses.filter(
        (expense) => {
          const category =
            expense.category_id
              ? categoryMap.get(
                  expense.category_id
                ) ?? ""
              : "";

          const searchable = [
            expense.description,
            category,
            expense.transaction_date,
            expense.tobaski_quantity !==
            null
              ? String(
                  expense.tobaski_quantity
                )
              : "",
          ]
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            normalizedSearch
          );
        }
      );
    }, [
      selectedExpenses,
      categoryMap,
      normalizedSearch,
    ]);

  const searchedInvoices =
    useMemo(() => {
      if (
        !normalizedSearch
      ) {
        return selectedInvoices;
      }

      return selectedInvoices.filter(
        (invoice) => {
          const searchable = [
            invoice.invoice_number,
            invoice.invoice_date,
            invoice.status,
            String(
              invoice.total_amount
            ),
            String(
              invoice.amount_paid
            ),
            String(
              invoice.balance_due
            ),
          ]
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            normalizedSearch
          );
        }
      );
    }, [
      selectedInvoices,
      normalizedSearch,
    ]);

  const searchedRemainingStock =
    useMemo(() => {
      if (
        !normalizedSearch
      ) {
        return remainingStock;
      }

      return remainingStock.filter(
        (stock) => {
          const searchable = [
            stock.stock_number,
            stock.sheep_name ?? "",
            stock.sheep_tag ?? "",
            stock.breed_type ?? "",
            stock.sex ?? "",
            stock.purchase_date,
          ]
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            normalizedSearch
          );
        }
      );
    }, [
      remainingStock,
      normalizedSearch,
    ]);

  // ==========================================================
  // EXPENSE BREAKDOWN
  // ==========================================================

  const expenseBreakdown =
    useMemo<
      ExpenseBreakdown[]
    >(() => {
      const map =
        new Map<
          string,
          ExpenseBreakdown
        >();

      selectedExpenses.forEach(
        (expense) => {
          const id =
            expense.category_id ??
            "other";

          const name =
            expense.category_id
              ? categoryMap.get(
                  expense.category_id
                ) ??
                "Other Expenses"
              : "Other Expenses";

          const current =
            map.get(id);

          if (current) {
            current.amount +=
              expense.amount;

            current.count += 1;
          } else {
            map.set(id, {
              id,
              name,
              amount:
                expense.amount,
              count: 1,
            });
          }
        }
      );

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          b.amount -
          a.amount
      );
    }, [
      selectedExpenses,
      categoryMap,
    ]);

  // ==========================================================
  // BREEDS SOLD
  // ==========================================================

  const breedSummary =
    useMemo(() => {
      const validInvoiceIds =
        new Set(
          selectedInvoices.map(
            (invoice) =>
              invoice.id
          )
        );

      const counts =
        new Map<
          string,
          number
        >();

      sheepSales
        .filter((sheep) => {
          if (
            sheep.tobaski_season_id !==
            selectedSeasonId
          ) {
            return false;
          }

          if (
            !sheep.invoice_id
          ) {
            return true;
          }

          return validInvoiceIds.has(
            sheep.invoice_id
          );
        })
        .forEach((sheep) => {
          const breed =
            sheep.breed_type ||
            "Other";

          counts.set(
            breed,
            (
              counts.get(breed) ??
              0
            ) +
              1
          );
        });

      return Array.from(
        counts.entries()
      )
        .map(
          ([name, count]) => ({
            name,
            count,
          })
        )
        .sort(
          (a, b) =>
            b.count -
            a.count
        );
    }, [
      sheepSales,
      selectedSeasonId,
      selectedInvoices,
    ]);

  // ==========================================================
  // CREATE SEASON
  // ==========================================================

  async function createSeason(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !businessId ||
      !userId
    ) {
      return;
    }

    const year =
      Number(newSeasonYear);

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      setError(
        "Please enter a valid Tobaski year."
      );

      return;
    }

    const alreadyExists =
      seasons.some(
        (season) =>
          season.season_year ===
          year
      );

    if (alreadyExists) {
      setError(
        `Tobaski ${year} already exists.`
      );

      return;
    }

    try {
      setCreatingSeason(true);
      setError("");

      const {
        data: createdSeason,
        error: createError,
      } = await supabase
        .from("tobaski_seasons")
        .insert({
          business_id:
            businessId,

          season_name:
            `Tobaski ${year}`,

          season_year:
            year,

          active:
            true,

          created_by:
            userId,
        })
        .select(
          `
          id,
          season_name,
          season_year,
          active,
          start_date,
          end_date,
          notes
        `
        )
        .single();

      if (
        createError ||
        !createdSeason
      ) {
        throw new Error(
          createError?.message ||
            "Unable to create Tobaski season."
        );
      }

      const season:
        TobaskiSeason = {
        id:
          createdSeason.id,

        season_name:
          createdSeason.season_name,

        season_year:
          Number(
            createdSeason.season_year
          ),

        active:
          createdSeason.active ??
          true,

        start_date:
          createdSeason.start_date,

        end_date:
          createdSeason.end_date,

        notes:
          createdSeason.notes,
      };

      setSeasons(
        (current) =>
          [
            season,
            ...current,
          ].sort(
            (a, b) =>
              b.season_year -
              a.season_year
          )
      );

      setSelectedSeasonId(
        season.id
      );

      setSearchText("");

      setShowNewSeason(false);

      setNewSeasonYear(
        String(year + 1)
      );

      setNotification(
        "Saved successfully"
      );
    } catch (
      createSeasonError
    ) {
      console.error(
        createSeasonError
      );

      setError(
        createSeasonError instanceof
          Error
          ? createSeasonError.message
          : "Unable to create Tobaski season."
      );
    } finally {
      setCreatingSeason(false);
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
            size={34}
            className="mx-auto animate-spin text-[#0b5136]"
          />

          <p className="mt-4 text-[16px] font-semibold text-slate-600">
            Loading Tobaski performance...
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
      eyebrow="Yearly Performance"
      title="Tobaski Investment"
      description="See how much was invested, how many sheep were sold, what remains and whether the Tobaski season made a profit or loss."
      recordText={`${seasons.length} Tobaski season${
        seasons.length === 1
          ? ""
          : "s"
      }`}
    >

      <AppNotification
        message={notification}
        onClose={() =>
          setNotification("")
        }
      />

      {/* ======================================================
          ACTIONS
      ====================================================== */}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <Link
          href="/reports"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-[14px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={17} />

          Back to Reports
        </Link>

        {isOwnerOrAdmin && (
          <button
            type="button"
            onClick={() =>
              setShowNewSeason(
                (current) =>
                  !current
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b5136] px-5 py-3 text-[14px] font-bold text-white shadow-sm hover:bg-[#083c29]"
          >
            <Plus size={18} />

            New Tobaski Season
          </button>
        )}

      </div>

      {/* ======================================================
          NEW SEASON
      ====================================================== */}

      {showNewSeason &&
        isOwnerOrAdmin && (
          <section className="mb-5 rounded-[24px] border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">

            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              New Year
            </p>

            <h2 className="mt-1 text-[21px] font-bold text-slate-950">
              Create Tobaski Season
            </h2>

            <p className="mt-1 text-[14px] text-slate-600">
              Create the next Tobaski year once. Expenses and sales can then be linked to it.
            </p>

            <form
              onSubmit={createSeason}
              className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
            >

              <div className="w-full sm:max-w-[240px]">

                <label className="mb-2 block text-[14px] font-bold text-slate-800">
                  Tobaski Year
                </label>

                <input
                  type="number"
                  min="2000"
                  max="2100"
                  step="1"
                  value={newSeasonYear}
                  onChange={(event) =>
                    setNewSeasonYear(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] px-4 py-3.5 text-[16px] font-bold text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                />

              </div>

              <button
                type="submit"
                disabled={
                  creatingSeason
                }
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#0b5136] px-5 py-3 text-[14px] font-bold text-white disabled:opacity-60"
              >

                {creatingSeason ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />

                    Saving...
                  </>
                ) : (
                  <>
                    <Plus size={18} />

                    Create Season
                  </>
                )}

              </button>

            </form>

          </section>
        )}

      {error && (
        <div className="mb-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-[15px] font-semibold text-red-800">
          {error}
        </div>
      )}

      {seasons.length === 0 ? (
        <section className="rounded-[26px] border border-white bg-white p-10 text-center shadow-sm">

          <CalendarDays
            size={40}
            className="mx-auto text-emerald-700"
          />

          <h2 className="mt-4 text-[23px] font-bold text-slate-950">
            No Tobaski season yet
          </h2>

          <p className="mx-auto mt-2 max-w-[520px] text-[15px] leading-6 text-slate-600">
            Create a Tobaski season first. Expenses and sheep sales can then be linked to that year.
          </p>

        </section>
      ) : (
        <>

          {/* ==================================================
              TOBASKI YEAR + SEARCH BAR
          ================================================== */}

          <section className="rounded-[24px] border border-white/90 bg-white p-4 shadow-sm sm:p-5">

            <div className="flex flex-col gap-3 md:flex-row md:items-center">

              <div className="md:w-[250px]">

                <label className="sr-only">
                  Select Tobaski Year
                </label>

                <select
                  value={selectedSeasonId}
                  onChange={(event) => {
                    setSelectedSeasonId(
                      event.target.value
                    );

                    setSearchText("");
                  }}
                  className="w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3.5 text-[15px] font-bold text-[#0b5136] outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                >

                  {seasons.map(
                    (season) => (
                      <option
                        key={season.id}
                        value={season.id}
                      >
                        {season.season_name}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div className="relative flex-1">

                <Search
                  size={19}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="search"
                  value={searchText}
                  onChange={(event) =>
                    setSearchText(
                      event.target.value
                    )
                  }
                  placeholder="Search Tobaski records..."
                  className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3.5 pl-12 pr-4 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />

              </div>

            </div>

            {normalizedSearch && (
              <p className="mt-3 text-[13px] font-semibold text-slate-600">
                {searchedExpenses.length} expense record(s),{" "}
                {searchedInvoices.length} invoice(s) and{" "}
                {searchedRemainingStock.length} remaining sheep matched.
              </p>
            )}

          </section>

          {selectedSummary && (
            <>

              {/* ================================================
                  MAIN NUMBERS
              ================================================ */}

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                <MetricCard
                  title="Total Investment"
                  value={money(
                    selectedSummary.investment
                  )}
                  note={`${selectedSummary.expenseCount} linked expense record${
                    selectedSummary.expenseCount ===
                    1
                      ? ""
                      : "s"
                  }`}
                  icon={
                    <Wallet size={23} />
                  }
                  featured
                />

                <MetricCard
                  title="Sales Return"
                  value={money(
                    selectedSummary.salesReturn
                  )}
                  note={`${selectedSummary.invoiceCount} Tobaski invoice${
                    selectedSummary.invoiceCount ===
                    1
                      ? ""
                      : "s"
                  }`}
                  icon={
                    <ReceiptText
                      size={23}
                    />
                  }
                />

                <MetricCard
                  title={
                    selectedSummary.profit >=
                    0
                      ? "Profit"
                      : "Loss"
                  }
                  value={money(
                    Math.abs(
                      selectedSummary.profit
                    )
                  )}
                  note={
                    selectedSummary.profit >=
                    0
                      ? "Sales return minus total investment"
                      : "Investment currently exceeds sales return"
                  }
                  icon={
                    selectedSummary.profit >=
                    0 ? (
                      <TrendingUp
                        size={23}
                      />
                    ) : (
                      <TrendingDown
                        size={23}
                      />
                    )
                  }
                  positive={
                    selectedSummary.profit >=
                    0
                  }
                />

                <MetricCard
                  title="ROI"
                  value={percent(
                    selectedSummary.roi
                  )}
                  note="Return on Tobaski investment"
                  icon={
                    <Percent size={23} />
                  }
                  positive={
                    selectedSummary.roi >=
                    0
                  }
                />

              </div>

              {/* ================================================
                  SHEEP POSITION
              ================================================ */}

              <section className="mt-5 overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-sm">

                <div className="p-5 sm:p-6">

                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-[#0b5136]">

                      <PawPrint size={22} />

                    </div>

                    <div>

                      <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                        Sheep Position
                      </p>

                      <h2 className="text-[21px] font-bold text-slate-950">
                        {selectedSummary.season.season_name}
                      </h2>

                    </div>

                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

                    <SimpleStat
                      label="Sheep Bought"
                      value={String(
                        selectedSummary.sheepBought
                      )}
                    />

                    <SimpleStat
                      label="Sheep Sold"
                      value={String(
                        selectedSummary.sheepSold
                      )}
                    />

                    <SimpleStat
                      label="Remaining"
                      value={String(
                        selectedSummary.remaining
                      )}
                    />

                    <SimpleStat
                      label="Average Cost per Sheep"
                      value={money(
                        selectedSummary.averageCostPerSheep
                      )}
                    />

                    <SimpleStat
                      label="Average Sale per Sheep"
                      value={money(
                        selectedSummary.averageSaleValue
                      )}
                    />

                  </div>

                </div>

                {/* ==============================================
                    EXACT REMAINING SHEEP
                ============================================== */}

                <div className="border-t border-slate-200">

                  <div className="flex flex-col gap-2 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">

                    <div>

                      <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                        Current Stock
                      </p>

                      <h3 className="mt-1 text-[20px] font-bold text-slate-950">
                        Sheep Still Available
                      </h3>

                      <p className="mt-1 text-[13px] text-slate-600">
                        These are the individual Tobaski sheep that have not been sold.
                      </p>

                    </div>

                    {stockFeatureAvailable && (
                      <div className="rounded-xl bg-emerald-50 px-4 py-2 text-[14px] font-bold text-[#0b5136]">
                        {remainingStock.length} Remaining
                      </div>
                    )}

                  </div>

                  {!stockFeatureAvailable ? (
                    <div className="border-t border-slate-200 bg-amber-50 px-5 py-5 text-[14px] leading-6 text-amber-900 sm:px-6">
                      Individual Tobaski stock is not available yet. The Bought, Sold and Remaining totals above will continue using the linked expense and sales records.
                    </div>
                  ) : searchedRemainingStock.length > 0 ? (
                    <div className="overflow-x-auto">

                      <table className="w-full min-w-[850px] text-left">

                        <thead>

                          <tr className="border-y border-slate-200 bg-[#f4f7f5] text-[12px] font-bold uppercase tracking-[0.05em] text-slate-600">

                            <th className="px-5 py-4">
                              Stock No.
                            </th>

                            <th className="px-5 py-4">
                              Sheep / Tag
                            </th>

                            <th className="px-5 py-4">
                              Breed
                            </th>

                            <th className="px-5 py-4">
                              Sex
                            </th>

                            <th className="px-5 py-4">
                              Purchase Date
                            </th>

                            <th className="px-5 py-4">
                              Status
                            </th>

                          </tr>

                        </thead>

                        <tbody>

                          {searchedRemainingStock.map(
                            (stock) => (
                              <tr
                                key={stock.id}
                                className="border-b border-slate-200 last:border-none"
                              >

                                <td className="px-5 py-4">

                                  <span className="rounded-lg bg-emerald-100 px-3 py-1.5 text-[13px] font-black text-[#0b5136]">
                                    {stock.stock_number}
                                  </span>

                                </td>

                                <td className="px-5 py-4">

                                  <p className="text-[14px] font-bold text-slate-950">
                                    {stock.sheep_name ||
                                      stock.sheep_tag ||
                                      "Not named"}
                                  </p>

                                  {stock.sheep_name &&
                                    stock.sheep_tag && (
                                      <p className="mt-1 text-[12px] font-medium text-slate-500">
                                        Tag: {stock.sheep_tag}
                                      </p>
                                    )}

                                </td>

                                <td className="px-5 py-4 text-[14px] font-semibold text-slate-700">
                                  {stock.breed_type ||
                                    "—"}
                                </td>

                                <td className="px-5 py-4 text-[14px] font-semibold text-slate-700">
                                  {cleanSex(
                                    stock.sex
                                  )}
                                </td>

                                <td className="px-5 py-4 text-[14px] font-semibold text-slate-700">
                                  {formatDate(
                                    stock.purchase_date
                                  )}
                                </td>

                                <td className="px-5 py-4">

                                  <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[12px] font-bold text-emerald-800">
                                    Remaining
                                  </span>

                                </td>

                              </tr>
                            )
                          )}

                        </tbody>

                      </table>

                    </div>
                  ) : (
                    <div className="border-t border-slate-200 px-5 py-8 text-center sm:px-6">

                      <PawPrint
                        size={30}
                        className="mx-auto text-emerald-600"
                      />

                      <h3 className="mt-3 text-[17px] font-bold text-slate-950">
                        {normalizedSearch
                          ? "No matching sheep"
                          : selectedStock.length ===
                            0
                          ? "No individual Tobaski sheep recorded yet"
                          : "No sheep remaining"}
                      </h3>

                      <p className="mx-auto mt-2 max-w-[520px] text-[14px] leading-6 text-slate-600">
                        {normalizedSearch
                          ? "Try another stock number, tag, sheep name or breed."
                          : selectedStock.length ===
                            0
                          ? "Individual sheep will appear here when a Tobaski Sheep Purchase creates the stock records."
                          : "All individual sheep recorded for this Tobaski season have been sold."}
                      </p>

                    </div>
                  )}

                </div>

              </section>

              {/* ================================================
                  CASH POSITION
              ================================================ */}

              <div className="mt-5 grid gap-4 md:grid-cols-2">

                <section className="rounded-[24px] bg-gradient-to-br from-[#0b5136] to-[#073523] p-6 text-white shadow-sm">

                  <div className="flex items-center gap-3">

                    <Banknote
                      size={24}
                    />

                    <div>

                      <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-emerald-100">
                        Cash Position
                      </p>

                      <h2 className="text-[21px] font-bold">
                        Money Received
                      </h2>

                    </div>

                  </div>

                  <div className="mt-6 space-y-5">

                    <DarkSummaryRow
                      label="Sales Return"
                      value={money(
                        selectedSummary.salesReturn
                      )}
                    />

                    <DarkSummaryRow
                      label="Cash Collected"
                      value={money(
                        selectedSummary.cashCollected
                      )}
                    />

                    <DarkSummaryRow
                      label="Outstanding"
                      value={money(
                        selectedSummary.outstanding
                      )}
                    />

                  </div>

                </section>

                <section className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">

                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#0b5136]">

                      <TrendingUp
                        size={22}
                      />

                    </div>

                    <div>

                      <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                        Automatic
                      </p>

                      <h2 className="text-[21px] font-bold text-slate-950">
                        Always Up to Date
                      </h2>

                    </div>

                  </div>

                  <p className="mt-5 text-[16px] font-semibold leading-7 text-slate-700">
                    All Tobaski expenses and sales recorded elsewhere in the app are automatically included here.
                  </p>

                  <p className="mt-3 text-[14px] leading-6 text-slate-600">
                    The same financial information does not need to be entered twice.
                  </p>

                </section>

              </div>

              {/* ================================================
                  EXPENSE BREAKDOWN
              ================================================ */}

              <section className="mt-5 overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-sm">

                <SectionHeading
                  eyebrow="Investment Breakdown"
                  title="Where the Tobaski Money Went"
                  icon={
                    <BarChart3 size={21} />
                  }
                />

                {expenseBreakdown.length >
                0 ? (
                  <div className="space-y-5 p-5 sm:p-6">

                    {expenseBreakdown.map(
                      (category) => {
                        const share =
                          selectedSummary.investment >
                          0
                            ? (
                                category.amount /
                                selectedSummary.investment
                              ) *
                              100
                            : 0;

                        return (
                          <div
                            key={
                              category.id
                            }
                          >

                            <div className="mb-2 flex items-center justify-between gap-4">

                              <div>

                                <p className="text-[15px] font-bold text-slate-950">
                                  {category.name}
                                </p>

                                <p className="mt-1 text-[13px] text-slate-500">
                                  {category.count} expense record
                                  {category.count ===
                                  1
                                    ? ""
                                    : "s"}
                                </p>

                              </div>

                              <div className="text-right">

                                <p className="text-[15px] font-bold text-slate-950">
                                  {money(
                                    category.amount
                                  )}
                                </p>

                                <p className="mt-1 text-[12px] font-semibold text-slate-500">
                                  {share.toFixed(
                                    1
                                  )}
                                  %
                                </p>

                              </div>

                            </div>

                            <div className="h-3 overflow-hidden rounded-full bg-slate-200">

                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#0b5136] to-emerald-500"
                                style={{
                                  width: `${Math.min(
                                    share,
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
                  <EmptyState
                    icon={
                      <PackageOpen
                        size={30}
                      />
                    }
                    title="No Tobaski investment expenses yet"
                    description="Link sheep purchases, feed, medication, transport, labour and other Tobaski costs to this season."
                  />
                )}

              </section>

              {/* ================================================
                  BREEDS SOLD
              ================================================ */}

              <section className="mt-5 overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-sm">

                <SectionHeading
                  eyebrow="Sheep Sales"
                  title="Breeds Sold"
                  icon={
                    <PawPrint size={21} />
                  }
                />

                {breedSummary.length >
                0 ? (
                  <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">

                    {breedSummary.map(
                      (breed) => (
                        <div
                          key={breed.name}
                          className="rounded-2xl border border-slate-200 bg-[#f8faf9] p-4"
                        >

                          <p className="text-[13px] font-semibold text-slate-500">
                            {breed.name}
                          </p>

                          <p className="mt-2 text-[26px] font-black text-[#0b5136]">
                            {breed.count}
                          </p>

                          <p className="mt-1 text-[12px] font-medium text-slate-500">
                            sheep sold
                          </p>

                        </div>
                      )
                    )}

                  </div>
                ) : (
                  <EmptyState
                    icon={
                      <PawPrint size={30} />
                    }
                    title="No Tobaski sheep sales yet"
                    description="Tobaski sheep sales linked to this season will appear here automatically."
                  />
                )}

              </section>

              {/* ================================================
                  YEAR BY YEAR
              ================================================ */}

              <section className="mt-5 overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-sm">

                <SectionHeading
                  eyebrow="Historical Performance"
                  title="Tobaski Year-by-Year"
                  icon={
                    <CalendarDays
                      size={21}
                    />
                  }
                />

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[1050px] text-left">

                    <thead>

                      <tr className="border-b border-slate-200 bg-[#f4f7f5] text-[12px] font-bold uppercase tracking-[0.05em] text-slate-600">

                        <th className="px-5 py-4">
                          Season
                        </th>

                        <th className="px-5 py-4 text-right">
                          Investment
                        </th>

                        <th className="px-5 py-4 text-right">
                          Bought
                        </th>

                        <th className="px-5 py-4 text-right">
                          Sold
                        </th>

                        <th className="px-5 py-4 text-right">
                          Remaining
                        </th>

                        <th className="px-5 py-4 text-right">
                          Sales
                        </th>

                        <th className="px-5 py-4 text-right">
                          Profit / Loss
                        </th>

                        <th className="px-5 py-4 text-right">
                          ROI
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {seasonSummaries.map(
                        (summary) => (
                          <tr
                            key={
                              summary.season.id
                            }
                            className="border-b border-slate-200 last:border-none hover:bg-emerald-50/50"
                          >

                            <td className="px-5 py-4">

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSeasonId(
                                    summary.season.id
                                  );

                                  setSearchText("");
                                }}
                                className="text-[15px] font-bold text-[#0b5136] hover:underline"
                              >
                                {summary.season.season_name}
                              </button>

                            </td>

                            <td className="px-5 py-4 text-right font-semibold text-slate-800">
                              {money(
                                summary.investment
                              )}
                            </td>

                            <td className="px-5 py-4 text-right font-semibold text-slate-800">
                              {summary.sheepBought}
                            </td>

                            <td className="px-5 py-4 text-right font-semibold text-slate-800">
                              {summary.sheepSold}
                            </td>

                            <td className="px-5 py-4 text-right font-semibold text-slate-800">
                              {summary.remaining}
                            </td>

                            <td className="px-5 py-4 text-right font-semibold text-slate-800">
                              {money(
                                summary.salesReturn
                              )}
                            </td>

                            <td
                              className={`px-5 py-4 text-right font-bold ${
                                summary.profit >=
                                0
                                  ? "text-emerald-700"
                                  : "text-red-700"
                              }`}
                            >
                              {summary.profit <
                              0
                                ? "-"
                                : ""}
                              {money(
                                Math.abs(
                                  summary.profit
                                )
                              )}
                            </td>

                            <td
                              className={`px-5 py-4 text-right font-bold ${
                                summary.roi >=
                                0
                                  ? "text-emerald-700"
                                  : "text-red-700"
                              }`}
                            >
                              {percent(
                                summary.roi
                              )}
                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </section>

              {/* ================================================
                  RECENT EXPENSES
              ================================================ */}

              <section className="mt-5 overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-sm">

                <SectionHeading
                  eyebrow="Records"
                  title="Recent Tobaski Expenses"
                  icon={
                    <FileText size={21} />
                  }
                />

                {searchedExpenses.length >
                0 ? (
                  <div className="overflow-x-auto">

                    <table className="w-full min-w-[760px] text-left">

                      <thead>

                        <tr className="border-b border-slate-200 bg-[#f4f7f5] text-[12px] font-bold uppercase tracking-[0.05em] text-slate-600">

                          <th className="px-5 py-4">
                            Date
                          </th>

                          <th className="px-5 py-4">
                            Description
                          </th>

                          <th className="px-5 py-4">
                            Category
                          </th>

                          <th className="px-5 py-4 text-right">
                            Sheep
                          </th>

                          <th className="px-5 py-4 text-right">
                            Amount
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {searchedExpenses
                          .slice(0, 20)
                          .map(
                            (expense) => (
                              <tr
                                key={expense.id}
                                className="border-b border-slate-200 last:border-none"
                              >

                                <td className="whitespace-nowrap px-5 py-4 text-[14px] font-semibold text-slate-700">
                                  {formatDate(
                                    expense.transaction_date
                                  )}
                                </td>

                                <td className="px-5 py-4 text-[14px] font-bold text-slate-950">
                                  {expense.description}
                                </td>

                                <td className="px-5 py-4 text-[14px] font-medium text-slate-700">
                                  {expense.category_id
                                    ? categoryMap.get(
                                        expense.category_id
                                      ) ??
                                      "Other"
                                    : "Other"}
                                </td>

                                <td className="px-5 py-4 text-right text-[14px] font-semibold text-slate-700">
                                  {expense.tobaski_quantity ??
                                    "—"}
                                </td>

                                <td className="px-5 py-4 text-right text-[14px] font-bold text-slate-950">
                                  {money(
                                    expense.amount
                                  )}
                                </td>

                              </tr>
                            )
                          )}

                      </tbody>

                    </table>

                  </div>
                ) : (
                  <EmptyState
                    icon={
                      <ReceiptText
                        size={30}
                      />
                    }
                    title={
                      normalizedSearch
                        ? "No matching Tobaski expenses"
                        : "No linked expenses yet"
                    }
                    description={
                      normalizedSearch
                        ? "Try a different search word."
                        : "Expenses linked to this Tobaski season will appear here."
                    }
                  />
                )}

              </section>

            </>
          )}

        </>
      )}

    </FinancePageShell>
  );
}

// ============================================================
// METRIC CARD
// ============================================================

function MetricCard({
  title,
  value,
  note,
  icon,
  featured = false,
  positive,
}: {
  title: string;
  value: string;
  note: string;
  icon: ReactNode;
  featured?: boolean;
  positive?: boolean;
}) {
  return (
    <div
      className={`rounded-[22px] border p-5 shadow-sm sm:p-6 ${
        featured
          ? "border-[#0b5136] bg-gradient-to-br from-[#0b5136] to-[#073724] text-white"
          : "border-white bg-white text-slate-950"
      }`}
    >

      <div className="flex items-start justify-between gap-4">

        <div className="min-w-0">

          <p
            className={`text-[14px] font-semibold ${
              featured
                ? "text-emerald-50"
                : "text-slate-600"
            }`}
          >
            {title}
          </p>

          <p
            className={`mt-3 break-words text-[27px] font-black leading-tight ${
              featured
                ? "text-white"
                : positive === false
                ? "text-red-700"
                : "text-slate-950"
            }`}
          >
            {value}
          </p>

          <p
            className={`mt-3 text-[13px] font-medium leading-5 ${
              featured
                ? "text-emerald-50/90"
                : "text-slate-500"
            }`}
          >
            {note}
          </p>

        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            featured
              ? "bg-white/15 text-white"
              : positive === false
              ? "bg-red-100 text-red-700"
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
// SIMPLE STAT
// ============================================================

function SimpleStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#f8faf9] p-4">

      <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-[22px] font-black text-[#0b5136]">
        {value}
      </p>

    </div>
  );
}

// ============================================================
// DARK ROW
// ============================================================

function DarkSummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-4 last:border-none last:pb-0">

      <span className="text-[14px] font-semibold text-emerald-100">
        {label}
      </span>

      <span className="text-[17px] font-bold text-white">
        {value}
      </span>

    </div>
  );
}

// ============================================================
// SECTION HEADING
// ============================================================

function SectionHeading({
  eyebrow,
  title,
  icon,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
}) {
  return (
    <div className="border-b border-slate-200 px-5 py-5 sm:px-6">

      <div className="flex items-center gap-3">

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-[#0b5136]">
          {icon}
        </div>

        <div>

          <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-emerald-700">
            {eyebrow}
          </p>

          <h2 className="text-[21px] font-bold text-slate-950">
            {title}
          </h2>

        </div>

      </div>

    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-8 text-center">

      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-[#0b5136]">
        {icon}
      </div>

      <h3 className="mt-4 text-[18px] font-bold text-slate-950">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-[520px] text-[14px] leading-6 text-slate-600">
        {description}
      </p>

    </div>
  );
}