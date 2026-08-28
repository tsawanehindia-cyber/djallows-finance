import { supabase } from "@/lib/supabase";

// ============================================================
// TYPES
// ============================================================

export type FinancialAccount = {
  id: string;
  name: string;
  account_type: string;
  opening_balance: number;
};

export type LedgerTransaction = {
  id: string;
  transaction_number: string;
  transaction_date: string;
  transaction_type:
    | "income"
    | "expense"
    | "transfer"
    | "capital_introduced"
    | "owner_withdrawal"
    | "payroll";
  description: string;
  amount: number;
  account_id: string | null;
  destination_account_id: string | null;
  payment_method: string | null;
  category_id: string | null;
  category_name: string | null;
};

export type AccountBalance = {
  id: string;
  name: string;
  accountType: string;
  balance: number;
};

export type DashboardFinancialData = {
  totalIncome: number;
  totalExpenses: number;
  netPosition: number;

  cashBalance: number;
  waveBalance: number;
  bankBalance: number;
  totalAvailable: number;

  accounts: AccountBalance[];

  transactions: LedgerTransaction[];
};

// ============================================================
// HELPERS
// ============================================================

function numberValue(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function getCategoryName(
  category:
    | { name?: string | null }
    | { name?: string | null }[]
    | null
    | undefined
) {
  if (!category) {
    return null;
  }

  if (Array.isArray(category)) {
    return category[0]?.name ?? null;
  }

  return category.name ?? null;
}

// ============================================================
// LOAD DASHBOARD FINANCIAL DATA
// ============================================================

export async function getDashboardFinancialData(
  businessId: string
): Promise<DashboardFinancialData> {
  // ----------------------------------------------------------
  // LOAD ACCOUNTS
  // ----------------------------------------------------------

  const {
    data: accountRows,
    error: accountError,
  } = await supabase
    .from("financial_accounts")
    .select(
      `
      id,
      name,
      account_type,
      opening_balance
    `
    )
    .eq("business_id", businessId)
    .eq("active", true)
    .order("name");

  if (accountError) {
    throw new Error(
      `Unable to load financial accounts: ${accountError.message}`
    );
  }

  const accounts: FinancialAccount[] = (
    accountRows ?? []
  ).map((account) => ({
    id: account.id,
    name: account.name,
    account_type: account.account_type,
    opening_balance: numberValue(
      account.opening_balance
    ),
  }));

  // ----------------------------------------------------------
  // LOAD MASTER LEDGER
  //
  // The category name is loaded here as well so the dashboard
  // can summarise income and expenses properly.
  // ----------------------------------------------------------

  const {
    data: transactionRows,
    error: transactionError,
  } = await supabase
    .from("transactions")
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
      category_id,
      category:categories (
        name
      )
    `
    )
    .eq("business_id", businessId)
    .order("transaction_date", {
      ascending: false,
    });

  if (transactionError) {
    throw new Error(
      `Unable to load transactions: ${transactionError.message}`
    );
  }

  const transactions: LedgerTransaction[] = (
    transactionRows ?? []
  ).map((transaction) => ({
    id: transaction.id,

    transaction_number:
      transaction.transaction_number,

    transaction_date:
      transaction.transaction_date,

    transaction_type:
      transaction.transaction_type,

    description:
      transaction.description ?? "",

    amount:
      numberValue(transaction.amount),

    account_id:
      transaction.account_id,

    destination_account_id:
      transaction.destination_account_id,

    payment_method:
      transaction.payment_method,

    category_id:
      transaction.category_id,

    category_name:
      getCategoryName(
        transaction.category
      ),
  }));

  // ----------------------------------------------------------
  // START ACCOUNT BALANCES
  // ----------------------------------------------------------

  const balanceMap =
    new Map<string, number>();

  for (const account of accounts) {
    balanceMap.set(
      account.id,
      account.opening_balance
    );
  }

  // ----------------------------------------------------------
  // APPLY LEDGER MOVEMENTS
  // ----------------------------------------------------------

  for (const transaction of transactions) {
    const amount =
      numberValue(
        transaction.amount
      );

    // Money entering an account
    if (
      transaction.transaction_type ===
        "income" ||
      transaction.transaction_type ===
        "capital_introduced"
    ) {
      if (transaction.account_id) {
        const current =
          balanceMap.get(
            transaction.account_id
          ) ?? 0;

        balanceMap.set(
          transaction.account_id,
          current + amount
        );
      }
    }

    // Money leaving an account
    if (
      transaction.transaction_type ===
        "expense" ||
      transaction.transaction_type ===
        "payroll" ||
      transaction.transaction_type ===
        "owner_withdrawal"
    ) {
      if (transaction.account_id) {
        const current =
          balanceMap.get(
            transaction.account_id
          ) ?? 0;

        balanceMap.set(
          transaction.account_id,
          current - amount
        );
      }
    }

    // Transfer between accounts
    if (
      transaction.transaction_type ===
      "transfer"
    ) {
      if (transaction.account_id) {
        const sourceBalance =
          balanceMap.get(
            transaction.account_id
          ) ?? 0;

        balanceMap.set(
          transaction.account_id,
          sourceBalance - amount
        );
      }

      if (
        transaction.destination_account_id
      ) {
        const destinationBalance =
          balanceMap.get(
            transaction.destination_account_id
          ) ?? 0;

        balanceMap.set(
          transaction.destination_account_id,
          destinationBalance + amount
        );
      }
    }
  }

  // ----------------------------------------------------------
  // CALCULATED ACCOUNTS
  // ----------------------------------------------------------

  const calculatedAccounts: AccountBalance[] =
    accounts.map((account) => ({
      id: account.id,

      name: account.name,

      accountType:
        account.account_type,

      balance:
        balanceMap.get(account.id) ??
        0,
    }));

  // ----------------------------------------------------------
  // TOTAL INCOME
  // ----------------------------------------------------------

  const totalIncome =
    transactions
      .filter(
        (transaction) =>
          transaction.transaction_type ===
          "income"
      )
      .reduce(
        (total, transaction) =>
          total +
          transaction.amount,
        0
      );

  // ----------------------------------------------------------
  // TOTAL EXPENSES
  // ----------------------------------------------------------

  const totalExpenses =
    transactions
      .filter(
        (transaction) =>
          transaction.transaction_type ===
            "expense" ||
          transaction.transaction_type ===
            "payroll"
      )
      .reduce(
        (total, transaction) =>
          total +
          transaction.amount,
        0
      );

  const netPosition =
    totalIncome -
    totalExpenses;

  // ----------------------------------------------------------
  // CASH
  // ----------------------------------------------------------

  const cashBalance =
    calculatedAccounts
      .filter(
        (account) =>
          account.accountType ===
          "cash"
      )
      .reduce(
        (total, account) =>
          total +
          account.balance,
        0
      );

  // ----------------------------------------------------------
  // WAVE
  // ----------------------------------------------------------

  const waveBalance =
    calculatedAccounts
      .filter(
        (account) =>
          account.accountType ===
          "wave"
      )
      .reduce(
        (total, account) =>
          total +
          account.balance,
        0
      );

  // ----------------------------------------------------------
  // BANK
  // ----------------------------------------------------------

  const bankBalance =
    calculatedAccounts
      .filter(
        (account) =>
          account.accountType ===
          "bank"
      )
      .reduce(
        (total, account) =>
          total +
          account.balance,
        0
      );

  // ----------------------------------------------------------
  // TOTAL AVAILABLE
  // ----------------------------------------------------------

  const totalAvailable =
    calculatedAccounts.reduce(
      (total, account) =>
        total +
        account.balance,
      0
    );

  return {
    totalIncome,
    totalExpenses,
    netPosition,

    cashBalance,
    waveBalance,
    bankBalance,
    totalAvailable,

    accounts:
      calculatedAccounts,

    transactions,
  };
}