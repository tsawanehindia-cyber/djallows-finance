import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getLocalDb,
} from "@/lib/localDb";

import {
  getLocalSessionUser,
} from "@/lib/localSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AccountRow = {
  id: string;
  name: string;
  account_type: string;
  opening_balance: number;
};

type TransactionRow = {
  id: string;
  transaction_number: string;
  transaction_date: string;
  transaction_type: string;
  description: string;
  amount: number;
  account_id: string | null;
  destination_account_id: string | null;
  payment_method: string | null;
  category_id: string | null;
  category_name: string | null;
};

function num(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

export async function GET(
  request: NextRequest
) {
  try {
    const session =
      getLocalSessionUser(request);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorised.",
        },
        { status: 401 }
      );
    }

    const businessId =
      session.access?.business_id;

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error: "No Djallows Farm business access was found.",
        },
        { status: 403 }
      );
    }

    const db = getLocalDb();

    const business =
      db.prepare(
        `
          SELECT id, name, trading_name
          FROM businesses
          WHERE id = ?
          LIMIT 1
        `
      ).get(businessId) as
        | {
            id: string;
            name: string;
            trading_name: string | null;
          }
        | undefined;

    if (!business) {
      throw new Error(
        "Djallows Farm business profile was not found."
      );
    }

    const accountRows =
      db.prepare(
        `
          SELECT
            id, name, account_type, opening_balance
          FROM financial_accounts
          WHERE business_id = ?
            AND active = 1
          ORDER BY name
        `
      ).all(businessId) as unknown as AccountRow[];

    const transactionRows =
      db.prepare(
        `
          SELECT
            t.id,
            t.transaction_number,
            t.transaction_date,
            t.transaction_type,
            t.description,
            t.amount,
            t.account_id,
            t.destination_account_id,
            t.payment_method,
            t.category_id,
            c.name AS category_name
          FROM transactions t
          LEFT JOIN categories c
            ON c.id = t.category_id
          WHERE t.business_id = ?
          ORDER BY t.transaction_date DESC,
                   t.created_at DESC
        `
      ).all(businessId) as unknown as TransactionRow[];

    const transactions =
      transactionRows.map((row) => ({
        ...row,
        amount: num(row.amount),
      }));

    const balances =
      new Map<string, number>();

    for (const account of accountRows) {
      balances.set(
        account.id,
        num(account.opening_balance)
      );
    }

    for (const transaction of transactions) {
      const amount = num(transaction.amount);

      if (
        transaction.transaction_type === "income" ||
        transaction.transaction_type === "capital_introduced"
      ) {
        if (transaction.account_id) {
          balances.set(
            transaction.account_id,
            (balances.get(transaction.account_id) ?? 0) + amount
          );
        }
      }

      if (
        transaction.transaction_type === "expense" ||
        transaction.transaction_type === "payroll" ||
        transaction.transaction_type === "owner_withdrawal"
      ) {
        if (transaction.account_id) {
          balances.set(
            transaction.account_id,
            (balances.get(transaction.account_id) ?? 0) - amount
          );
        }
      }

      if (
        transaction.transaction_type === "transfer"
      ) {
        if (transaction.account_id) {
          balances.set(
            transaction.account_id,
            (balances.get(transaction.account_id) ?? 0) - amount
          );
        }

        if (transaction.destination_account_id) {
          balances.set(
            transaction.destination_account_id,
            (balances.get(transaction.destination_account_id) ?? 0) + amount
          );
        }
      }
    }

    const accounts =
      accountRows.map((account) => ({
        id: account.id,
        name: account.name,
        accountType: account.account_type,
        balance: balances.get(account.id) ?? 0,
      }));

    const totalIncome =
      transactions
        .filter((row) => row.transaction_type === "income")
        .reduce((sum, row) => sum + row.amount, 0);

    const totalExpenses =
      transactions
        .filter(
          (row) =>
            row.transaction_type === "expense" ||
            row.transaction_type === "payroll"
        )
        .reduce((sum, row) => sum + row.amount, 0);

    const financialData = {
      totalIncome,
      totalExpenses,
      netPosition: totalIncome - totalExpenses,
      cashBalance: accounts
        .filter((row) => row.accountType === "cash")
        .reduce((sum, row) => sum + row.balance, 0),
      waveBalance: accounts
        .filter((row) => row.accountType === "wave")
        .reduce((sum, row) => sum + row.balance, 0),
      bankBalance: accounts
        .filter((row) => row.accountType === "bank")
        .reduce((sum, row) => sum + row.balance, 0),
      totalAvailable: accounts
        .reduce((sum, row) => sum + row.balance, 0),
      accounts,
      transactions,
    };

    const invoices =
      (db.prepare(
        `
          SELECT
            id, customer_id, invoice_number, invoice_date,
            total_amount, amount_paid, balance_due, status,
            tobaski_season_id
          FROM invoices
          WHERE business_id = ?
          ORDER BY invoice_date DESC, created_at DESC
        `
      ).all(businessId) as unknown as Array<Record<string, unknown>>)
        .map((row) => ({
          ...row,
          total_amount: num(row.total_amount),
          amount_paid: num(row.amount_paid),
          balance_due: num(row.balance_due),
        }));

    const customers =
      (db.prepare(
        `
          SELECT id, name, active
          FROM contacts
          WHERE business_id = ?
            AND contact_type = 'customer'
          ORDER BY name
        `
      ).all(businessId) as unknown as Array<Record<string, unknown>>)
        .map((row) => ({
          id: String(row.id),
          name: String(row.name),
          active: Number(row.active) === 1,
        }));

    const tobaskiSeasons =
      (db.prepare(
        `
          SELECT id, season_name, season_year, active
          FROM tobaski_seasons
          WHERE business_id = ?
          ORDER BY season_year DESC
        `
      ).all(businessId) as unknown as Array<Record<string, unknown>>)
        .map((row) => ({
          id: String(row.id),
          season_name: String(row.season_name),
          season_year: num(row.season_year),
          active: Number(row.active) === 1,
        }));

    const tobaskiExpenses =
      (db.prepare(
        `
          SELECT id, amount, tobaski_season_id, tobaski_quantity
          FROM transactions
          WHERE business_id = ?
            AND transaction_type = 'expense'
            AND tobaski_season_id IS NOT NULL
        `
      ).all(businessId) as unknown as Array<Record<string, unknown>>)
        .map((row) => ({
          id: String(row.id),
          amount: num(row.amount),
          tobaski_season_id:
            row.tobaski_season_id == null
              ? null
              : String(row.tobaski_season_id),
          tobaski_quantity:
            row.tobaski_quantity == null
              ? null
              : num(row.tobaski_quantity),
        }));

    const sheepSales =
      (db.prepare(
        `
          SELECT id, invoice_id, tobaski_season_id
          FROM sheep_sale_details
          WHERE business_id = ?
            AND tobaski_season_id IS NOT NULL
        `
      ).all(businessId) as unknown as Array<Record<string, unknown>>)
        .map((row) => ({
          id: String(row.id),
          invoice_id:
            row.invoice_id == null ? null : String(row.invoice_id),
          tobaski_season_id:
            row.tobaski_season_id == null
              ? null
              : String(row.tobaski_season_id),
        }));

    const tobaskiStock =
      (db.prepare(
        `
          SELECT
            s.id,
            s.tobaski_season_id,
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM sheep_sale_details d
                WHERE d.tobaski_stock_id = s.id
              ) THEN 'Sold'
              ELSE 'Remaining'
            END AS stock_status
          FROM tobaski_sheep_stock s
          WHERE s.business_id = ?
        `
      ).all(businessId) as unknown as Array<Record<string, unknown>>)
        .map((row) => ({
          id: String(row.id),
          tobaski_season_id: String(row.tobaski_season_id),
          stock_status: String(row.stock_status ?? "Remaining"),
        }));

    const historicalCustomerSales =
      (db.prepare(
        `
          SELECT id, contact_id, transaction_date, amount
          FROM transactions
          WHERE business_id = ?
            AND transaction_type = 'income'
            AND reference_type = 'historical_excel_import'
            AND contact_id IS NOT NULL
          ORDER BY transaction_date DESC
        `
      ).all(businessId) as unknown as Array<Record<string, unknown>>)
        .map((row) => ({
          id: String(row.id),
          contact_id:
            row.contact_id == null ? null : String(row.contact_id),
          transaction_date: String(row.transaction_date),
          amount: num(row.amount),
        }));

    const month =
      new Date().toISOString().slice(0, 7);

    const activeEmployees =
      db.prepare(
        `
          SELECT COUNT(*) AS total
          FROM employees
          WHERE business_id = ?
            AND active = 1
        `
      ).get(businessId) as { total: number };

    const paidPayroll =
      db.prepare(
        `
          SELECT
            COALESCE(SUM(pe.net_pay), 0) AS total,
            COUNT(*) AS payments
          FROM payroll_entries pe
          INNER JOIN payroll_runs pr
            ON pr.id = pe.payroll_run_id
          WHERE pr.business_id = ?
            AND pe.payment_status = 'paid'
            AND substr(COALESCE(pe.payment_date, ''), 1, 7) = ?
        `
      ).get(
        businessId,
        month
      ) as { total: number; payments: number };

    const payrollSummary =
      session.user.platform_role === "super_admin" ||
      session.access?.access_role === "owner" ||
      session.access?.access_role === "admin"
        ? {
            active_employees: num(activeEmployees.total),
            paid_this_month: num(paidPayroll.total),
            payments_this_month: num(paidPayroll.payments),
          }
        : null;

    const memberRole =
      session.user.platform_role === "super_admin"
        ? "super_admin"
        : session.access?.access_role ?? "staff";

    return NextResponse.json({
      success: true,
      business,
      memberRole,
      financialData,
      payrollSummary,
      invoices,
      customers,
      tobaskiSeasons,
      tobaskiExpenses,
      sheepSales,
      tobaskiStock,
      stockAvailable: true,
      historicalCustomerSales,
    });
  } catch (error) {
    console.error("LOCAL DASHBOARD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load local dashboard.",
      },
      { status: 500 }
    );
  }
}
