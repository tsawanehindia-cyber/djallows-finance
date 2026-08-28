"use client";

import { useRouter } from "next/navigation";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Landmark,
  Loader2,
  Smartphone,
  Wallet,
} from "lucide-react";

import FinancePageShell from "@/components/FinancePageShell";

import { supabase } from "@/lib/supabase";

// ============================================================
// TYPES
// ============================================================

type Account = {
  id: string;
  name: string;
  account_type: string;
  opening_balance: number;
  active: boolean;
};

type Transaction = {
  id: string;
  transaction_number: string;
  transaction_date: string;
  transaction_type: string;
  description: string;
  amount: number;
  account_id: string | null;
  destination_account_id: string | null;
  payment_method: string | null;
  notes: string | null;
};

type Membership = {
  business_id: string;
};

type AccountSummary = Account & {
  balance: number;
  moneyIn: number;
  moneyOut: number;
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

function transactionLabel(
  type: string
) {
  switch (type) {
    case "income":
      return "Income";

    case "expense":
      return "Expense";

    case "transfer":
      return "Transfer";

    case "capital_introduced":
      return "Capital Added";

    case "owner_withdrawal":
      return "Owner Withdrawal";

    case "payroll":
      return "Payroll";

    default:
      return type;
  }
}

function accountIcon(
  type: string
) {
  if (
    type === "cash"
  ) {
    return (
      <Banknote size={23} />
    );
  }

  if (
    type === "wave" ||
    type === "mobile_money"
  ) {
    return (
      <Smartphone size={23} />
    );
  }

  if (
    type === "bank"
  ) {
    return (
      <Landmark size={23} />
    );
  }

  return (
    <Wallet size={23} />
  );
}

// ============================================================
// PAGE
// ============================================================

export default function AccountsPage() {
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
    accounts,
    setAccounts,
  ] =
    useState<Account[]>(
      []
    );

  const [
    transactions,
    setTransactions,
  ] =
    useState<Transaction[]>(
      []
    );

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadAccounts() {
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
        // BUSINESS
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
            opening_balance,
            active
          `
          )
          .eq(
            "business_id",
            membership.business_id
          )
          .eq(
            "active",
            true
          )
          .order(
            "name",
            {
              ascending:
                true,
            }
          );

        if (
          accountError
        ) {
          throw new Error(
            `Unable to load accounts: ${accountError.message}`
          );
        }

        // ----------------------------------------------------
        // LEDGER
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
            transaction_type,
            description,
            amount,
            account_id,
            destination_account_id,
            payment_method,
            notes
          `
          )
          .eq(
            "business_id",
            membership.business_id
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
            `Unable to load account activity: ${transactionError.message}`
          );
        }

        if (!active) {
          return;
        }

        setAccounts(
          (
            accountRows ??
            []
          ).map(
            (row) => ({
              id: row.id,

              name:
                row.name,

              account_type:
                row.account_type,

              opening_balance:
                Number(
                  row.opening_balance ??
                    0
                ),

              active:
                Boolean(
                  row.active
                ),
            })
          )
        );

        setTransactions(
          (
            transactionRows ??
            []
          ).map(
            (row) => ({
              id: row.id,

              transaction_number:
                row.transaction_number,

              transaction_date:
                row.transaction_date,

              transaction_type:
                row.transaction_type,

              description:
                row.description ??
                "",

              amount:
                Number(
                  row.amount ??
                    0
                ),

              account_id:
                row.account_id,

              destination_account_id:
                row.destination_account_id,

              payment_method:
                row.payment_method,

              notes:
                row.notes,
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
              : "Unable to load cash and account information."
          );

          setLoading(false);
        }
      }
    }

    loadAccounts();

    return () => {
      active = false;
    };
  }, [router]);

  // ==========================================================
  // ACCOUNT CALCULATIONS
  // ==========================================================

  const accountSummaries =
    useMemo<
      AccountSummary[]
    >(() => {
      return accounts.map(
        (account) => {
          let balance =
            account.opening_balance;

          let moneyIn = 0;
          let moneyOut = 0;

          transactions.forEach(
            (
              transaction
            ) => {
              // ----------------------------------------------
              // INCOME
              // ----------------------------------------------

              if (
                transaction.transaction_type ===
                  "income" &&
                transaction.account_id ===
                  account.id
              ) {
                balance +=
                  transaction.amount;

                moneyIn +=
                  transaction.amount;
              }

              // ----------------------------------------------
              // CAPITAL ADDED
              // ----------------------------------------------

              if (
                transaction.transaction_type ===
                  "capital_introduced" &&
                transaction.account_id ===
                  account.id
              ) {
                balance +=
                  transaction.amount;

                moneyIn +=
                  transaction.amount;
              }

              // ----------------------------------------------
              // EXPENSES
              // ----------------------------------------------

              if (
                transaction.transaction_type ===
                  "expense" &&
                transaction.account_id ===
                  account.id
              ) {
                balance -=
                  transaction.amount;

                moneyOut +=
                  transaction.amount;
              }

              // ----------------------------------------------
              // PAYROLL
              // ----------------------------------------------

              if (
                transaction.transaction_type ===
                  "payroll" &&
                transaction.account_id ===
                  account.id
              ) {
                balance -=
                  transaction.amount;

                moneyOut +=
                  transaction.amount;
              }

              // ----------------------------------------------
              // OWNER WITHDRAWALS
              // ----------------------------------------------

              if (
                transaction.transaction_type ===
                  "owner_withdrawal" &&
                transaction.account_id ===
                  account.id
              ) {
                balance -=
                  transaction.amount;

                moneyOut +=
                  transaction.amount;
              }

              // ----------------------------------------------
              // TRANSFER OUT
              // ----------------------------------------------

              if (
                transaction.transaction_type ===
                  "transfer" &&
                transaction.account_id ===
                  account.id
              ) {
                balance -=
                  transaction.amount;
              }

              // ----------------------------------------------
              // TRANSFER IN
              // ----------------------------------------------

              if (
                transaction.transaction_type ===
                  "transfer" &&
                transaction.destination_account_id ===
                  account.id
              ) {
                balance +=
                  transaction.amount;
              }
            }
          );

          return {
            ...account,
            balance,
            moneyIn,
            moneyOut,
          };
        }
      );
    }, [
      accounts,
      transactions,
    ]);

  // ==========================================================
  // TOTALS
  // ==========================================================

  const totalAvailable =
    accountSummaries.reduce(
      (
        total,
        account
      ) =>
        total +
        account.balance,
      0
    );

  const totalMoneyReceived =
    transactions
      .filter(
        (
          transaction
        ) =>
          transaction.transaction_type ===
            "income" ||
          transaction.transaction_type ===
            "capital_introduced"
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

  const totalMoneyPaidOut =
    transactions
      .filter(
        (
          transaction
        ) =>
          transaction.transaction_type ===
            "expense" ||
          transaction.transaction_type ===
            "payroll" ||
          transaction.transaction_type ===
            "owner_withdrawal"
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

  const accountNameMap =
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
  // RECENT ACCOUNT ACTIVITY
  // ==========================================================

  const recentActivity =
    transactions.slice(
      0,
      12
    );

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
            Loading cash and accounts...
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
      eyebrow="Farm Funds"
      title="Cash & Accounts"
      description="See exactly where Djallows Farm's money is held and how money has moved through each account."
      recordText={`${accountSummaries.length} active accounts`}
    >

      {/* ERROR */}

      {error && (
        <div className="mb-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-[15px] font-semibold text-red-800">
          {error}
        </div>
      )}

      {/* ======================================================
          MAIN SUMMARY
      ====================================================== */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        <SummaryCard
          title="Total Available"
          value={money(
            totalAvailable
          )}
          note="Money currently available across all accounts"
          icon={
            <Wallet
              size={23}
            />
          }
          featured
        />

        <SummaryCard
          title="Active Accounts"
          value={String(
            accountSummaries.length
          )}
          note="Accounts currently used by the farm"
          icon={
            <Landmark
              size={23}
            />
          }
        />

        <SummaryCard
          title="Money Received"
          value={money(
            totalMoneyReceived
          )}
          note="Income and capital added"
          icon={
            <ArrowUpRight
              size={23}
            />
          }
        />

        <SummaryCard
          title="Money Paid Out"
          value={money(
            totalMoneyPaidOut
          )}
          note="Expenses, payroll and owner withdrawals"
          icon={
            <ArrowDownRight
              size={23}
            />
          }
        />

      </div>

      {/* ======================================================
          ACCOUNT BALANCES
      ====================================================== */}

      <section className="mt-6">

        <div className="mb-4">

          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
            Current Balances
          </p>

          <h2 className="mt-1 text-[22px] font-bold text-slate-950">
            Where the Money Is Now
          </h2>

          <p className="mt-1 text-[15px] leading-6 text-slate-600">
            Current balance of each active Djallows Farm account.
          </p>

        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

          {accountSummaries.map(
            (account) => (
              <AccountCard
                key={
                  account.id
                }
                account={
                  account
                }
              />
            )
          )}

        </div>

      </section>

      {/* ======================================================
          ACCOUNT EXPLANATION
      ====================================================== */}

      <section className="mt-6 rounded-[24px] border border-emerald-100 bg-[#0b5136] p-5 text-white shadow-[0_16px_40px_rgba(13,61,42,0.18)] sm:p-6">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-100">
              Important
            </p>

            <h2 className="mt-1 text-[21px] font-bold">
              Moving money between accounts is not income or an expense
            </h2>

            <p className="mt-2 max-w-4xl text-[15px] leading-6 text-emerald-50/90">
              For example, moving GMD 10,000 from Cash on Hand to the Bank only changes where the money is held. It does not increase or reduce the farm&apos;s profit.
            </p>

          </div>

          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <ArrowLeftRight
              size={27}
            />
          </div>

        </div>

      </section>

      {/* ======================================================
          RECENT ACCOUNT ACTIVITY
      ====================================================== */}

      <section className="mt-6 overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.08)]">

        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">

          <div>

            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              Account Activity
            </p>

            <h2 className="mt-1 text-[21px] font-bold text-slate-950">
              Recent Money Movements
            </h2>

            <p className="mt-1 text-[15px] text-slate-600">
              Latest income, expenses, transfers and other movements affecting the farm&apos;s accounts.
            </p>

          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5">

            <p className="text-[12px] font-bold uppercase text-slate-600">
              Showing
            </p>

            <p className="mt-1 text-[16px] font-bold text-slate-950">
              {recentActivity.length}
            </p>

          </div>

        </div>

        {recentActivity.length >
        0 ? (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[1120px] table-fixed text-left">

              <colgroup>
                <col className="w-[150px]" />
                <col className="w-[300px]" />
                <col className="w-[180px]" />
                <col className="w-[220px]" />
                <col className="w-[170px]" />
              </colgroup>

              <thead>

                <tr className="border-b border-slate-200 bg-[#f4f7f5] text-[13px] font-bold uppercase tracking-[0.05em] text-slate-600">

                  <th className="px-6 py-4">
                    Date
                  </th>

                  <th className="px-6 py-4">
                    Description
                  </th>

                  <th className="px-6 py-4">
                    Type
                  </th>

                  <th className="px-6 py-4">
                    Account
                  </th>

                  <th className="px-6 py-4 text-right">
                    Amount
                  </th>

                </tr>

              </thead>

              <tbody>

                {recentActivity.map(
                  (
                    transaction,
                    index
                  ) => {
                    const sourceAccount =
                      transaction.account_id
                        ? accountNameMap.get(
                            transaction.account_id
                          )
                        : null;

                    const destinationAccount =
                      transaction.destination_account_id
                        ? accountNameMap.get(
                            transaction.destination_account_id
                          )
                        : null;

                    const accountText =
                      transaction.transaction_type ===
                        "transfer"
                        ? `${sourceAccount ?? "—"} → ${destinationAccount ?? "—"}`
                        : sourceAccount ??
                          transaction.payment_method ??
                          "—";

                    const positive =
                      transaction.transaction_type ===
                        "income" ||
                      transaction.transaction_type ===
                        "capital_introduced";

                    const negative =
                      transaction.transaction_type ===
                        "expense" ||
                      transaction.transaction_type ===
                        "payroll" ||
                      transaction.transaction_type ===
                        "owner_withdrawal";

                    return (
                      <tr
                        key={
                          transaction.id
                        }
                        className={`border-b border-slate-200 last:border-none hover:bg-emerald-50/60 ${
                          index %
                            2 ===
                          1
                            ? "bg-slate-50/60"
                            : "bg-white"
                        }`}
                      >

                        <td className="whitespace-nowrap px-6 py-5 text-[15px] font-semibold text-slate-700">
                          {formatDate(
                            transaction.transaction_date
                          )}
                        </td>

                        <td className="px-6 py-5">

                          <p className="text-[15px] font-bold text-slate-950">
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

                        <td className="px-6 py-5">

                          <span className="inline-flex whitespace-nowrap rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-bold text-slate-800">
                            {transactionLabel(
                              transaction.transaction_type
                            )}
                          </span>

                        </td>

                        <td className="px-6 py-5 text-[15px] font-semibold text-slate-700">
                          {
                            accountText
                          }
                        </td>

                        <td
                          className={`whitespace-nowrap px-6 py-5 text-right text-[15px] font-bold ${
                            positive
                              ? "text-emerald-700"
                              : "text-slate-950"
                          }`}
                        >

                          {positive
                            ? "+"
                            : negative
                              ? "-"
                              : ""}

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
          <div className="flex min-h-[260px] items-center justify-center text-center">

            <div>

              <Wallet
                size={28}
                className="mx-auto text-[#0b5136]"
              />

              <p className="mt-4 text-[17px] font-bold text-slate-950">
                No account activity yet
              </p>

              <p className="mt-2 text-[15px] text-slate-600">
                Income and expenses will appear here automatically.
              </p>

            </div>

          </div>
        )}

      </section>

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
      className={`rounded-[22px] border p-6 shadow-[0_10px_30px_rgba(15,23,42,0.07)] ${
        featured
          ? "border-[#0b5136] bg-[#0b5136] text-white"
          : "border-white bg-white text-slate-950"
      }`}
    >

      <div className="flex items-start justify-between gap-4">

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

          <p className="mt-3 break-words text-[28px] font-bold leading-tight tracking-tight">
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
// ACCOUNT CARD
// ============================================================

function AccountCard({
  account,
}: {
  account: AccountSummary;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white bg-white shadow-[0_12px_35px_rgba(15,23,42,0.07)]">

      <div className="flex items-start justify-between gap-4 p-6">

        <div>

          <p className="text-[15px] font-semibold text-slate-700">
            {account.name}
          </p>

          <p className="mt-3 text-[30px] font-bold tracking-tight text-slate-950">
            {money(
              account.balance
            )}
          </p>

          <p className="mt-2 text-[14px] font-medium text-slate-600">
            Current balance
          </p>

        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#0b5136]">
          {accountIcon(
            account.account_type
          )}
        </div>

      </div>

      <div className="grid grid-cols-2 border-t border-slate-200 bg-[#f8faf9]">

        <div className="border-r border-slate-200 p-4">

          <p className="text-[13px] font-semibold text-slate-600">
            Money In
          </p>

          <p className="mt-1 text-[16px] font-bold text-emerald-700">
            {money(
              account.moneyIn
            )}
          </p>

        </div>

        <div className="p-4">

          <p className="text-[13px] font-semibold text-slate-600">
            Money Out
          </p>

          <p className="mt-1 text-[16px] font-bold text-slate-950">
            {money(
              account.moneyOut
            )}
          </p>

        </div>

      </div>

      {account.opening_balance !==
        0 && (
        <div className="border-t border-slate-200 px-5 py-3 text-[13px] font-medium text-slate-600">
          Opening balance:{" "}
          <strong className="text-slate-900">
            {money(
              account.opening_balance
            )}
          </strong>
        </div>
      )}

    </div>
  );
}