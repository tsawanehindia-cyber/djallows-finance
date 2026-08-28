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
  Banknote,
  CalendarDays,
  Loader2,
  ReceiptText,
  Save,
  UserRound,
  Wallet,
  X,
} from "lucide-react";

import AppNotification from "@/components/AppNotification";
import FinancePageShell from "@/components/FinancePageShell";
import { supabase } from "@/lib/supabase";

// ============================================================
// TYPES
// ============================================================

type Membership = {
  business_id: string;
};

type Employee = {
  id: string;
  full_name: string;
  pay_type: string | null;
  pay_amount: number;
  status: string | null;
};

type FinancialAccount = {
  id: string;
  name: string;
  active: boolean;
};

type Category = {
  id: string;
  name: string;
  category_type: string;
  active: boolean;
};

// ============================================================
// HELPERS
// ============================================================

function todayForInput() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function money(amount: number) {
  return `GMD ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function nicePayType(
  value: string | null
) {
  if (!value) {
    return "Not set";
  }

  if (value === "monthly") {
    return "Monthly";
  }

  if (value === "weekly") {
    return "Weekly";
  }

  if (value === "daily") {
    return "Daily";
  }

  return value;
}

function createPaymentNumber() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  const hours = String(
    now.getHours()
  ).padStart(2, "0");

  const minutes = String(
    now.getMinutes()
  ).padStart(2, "0");

  const seconds = String(
    now.getSeconds()
  ).padStart(2, "0");

  const random = Math.floor(
    100 +
      Math.random() * 900
  );

  return `PAY-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
}

// ============================================================
// PAGE
// ============================================================

export default function SalaryPaymentPage() {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
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
    userId,
    setUserId,
  ] = useState("");

  const [
    employees,
    setEmployees,
  ] = useState<Employee[]>([]);

  const [
    accounts,
    setAccounts,
  ] = useState<
    FinancialAccount[]
  >([]);

  const [
    payrollCategoryId,
    setPayrollCategoryId,
  ] = useState("");

  // ==========================================================
  // FORM
  // ==========================================================

  const [
    employeeId,
    setEmployeeId,
  ] = useState("");

  const [
    paymentDate,
    setPaymentDate,
  ] = useState(
    todayForInput()
  );

  const [
    payPeriod,
    setPayPeriod,
  ] = useState("");

  const [
    amountPaid,
    setAmountPaid,
  ] = useState("");

  const [
    accountId,
    setAccountId,
  ] = useState("");

  const [
    reference,
    setReference,
  ] = useState("");

  const [
    note,
    setNote,
  ] = useState("");

  // ==========================================================
  // LOAD
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadPage() {
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

        setUserId(
          session.user.id
        );

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

        if (!active) {
          return;
        }

        setBusinessId(
          membership.business_id
        );

        // ----------------------------------------------------
        // PAYROLL ACCESS
        // ----------------------------------------------------

        const {
          data: payrollAllowed,
          error: payrollAccessError,
        } = await supabase.rpc(
          "can_manage_business_payroll",
          {
            p_business_id:
              membership.business_id,
          }
        );

        if (payrollAccessError) {
          throw new Error(
            "Unable to verify payroll access."
          );
        }

        if (!payrollAllowed) {
          router.replace("/staff");
          return;
        }

        // ----------------------------------------------------
        // STAFF
        // ----------------------------------------------------

        const {
          data:
            employeeRows,
          error:
            employeeError,
        } = await supabase
          .from("employees")
          .select(
            `
            id,
            full_name,
            pay_type,
            pay_amount,
            status
          `
          )
          .eq(
            "business_id",
            membership.business_id
          )
          .eq(
            "status",
            "active"
          )
          .order(
            "full_name",
            {
              ascending: true,
            }
          );

        if (
          employeeError
        ) {
          throw new Error(
            `Unable to load staff: ${employeeError.message}`
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
              ascending: true,
            }
          );

        if (
          accountError
        ) {
          throw new Error(
            `Unable to load payment accounts: ${accountError.message}`
          );
        }

        // ----------------------------------------------------
        // PAYROLL CATEGORY
        // ----------------------------------------------------

        const {
          data:
            categoryRows,
          error:
            categoryError,
        } = await supabase
          .from("categories")
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
          .eq(
            "category_type",
            "expense"
          )
          .eq(
            "active",
            true
          );

        if (
          categoryError
        ) {
          throw new Error(
            `Unable to load Payroll category: ${categoryError.message}`
          );
        }

        const payrollCategory =
          (
            categoryRows ?? []
          ).find(
            (category) =>
              category.name
                .trim()
                .toLowerCase() ===
              "payroll"
          ) ??
          (
            categoryRows ?? []
          ).find(
            (category) =>
              category.name
                .trim()
                .toLowerCase()
                .includes(
                  "salary"
                )
          );

        if (
          !payrollCategory
        ) {
          throw new Error(
            "Payroll expense category was not found."
          );
        }

        if (!active) {
          return;
        }

        const loadedEmployees =
          (
            employeeRows ?? []
          ).map(
            (employee) => ({
              id:
                employee.id,

              full_name:
                employee.full_name,

              pay_type:
                employee.pay_type,

              pay_amount:
                Number(
                  employee.pay_amount ??
                    0
                ),

              status:
                employee.status,
            })
          );

        const loadedAccounts =
          (
            accountRows ?? []
          ).map(
            (account) => ({
              id:
                account.id,

              name:
                account.name,

              active:
                Boolean(
                  account.active
                ),
            })
          );

        setEmployees(
          loadedEmployees
        );

        setAccounts(
          loadedAccounts
        );

        setPayrollCategoryId(
          payrollCategory.id
        );

        // ----------------------------------------------------
        // DEFAULT ACCOUNT = CASH ON HAND
        // ----------------------------------------------------

        const cashAccount =
          loadedAccounts.find(
            (account) =>
              account.name
                .trim()
                .toLowerCase() ===
              "cash on hand"
          ) ??
          loadedAccounts.find(
            (account) =>
              account.name
                .trim()
                .toLowerCase() ===
              "cash"
          ) ??
          loadedAccounts[0];

        if (cashAccount) {
          setAccountId(
            cashAccount.id
          );
        }

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
              : "Unable to load salary payment page."
          );

          setLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      active = false;
    };
  }, [router]);

  // ==========================================================
  // NOTIFICATION TIMER
  // ==========================================================

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
  // SELECTED STAFF
  // ==========================================================

  const selectedEmployee =
    useMemo(
      () =>
        employees.find(
          (employee) =>
            employee.id ===
            employeeId
        ) ?? null,
      [
        employees,
        employeeId,
      ]
    );

  // ==========================================================
  // SELECTED ACCOUNT
  // ==========================================================

  const selectedAccount =
    useMemo(
      () =>
        accounts.find(
          (account) =>
            account.id ===
            accountId
        ) ?? null,
      [
        accounts,
        accountId,
      ]
    );

  // ==========================================================
  // STAFF CHANGE
  // ==========================================================

  function handleEmployeeChange(
    value: string
  ) {
    setEmployeeId(value);

    const employee =
      employees.find(
        (item) =>
          item.id === value
      );

    if (employee) {
      setAmountPaid(
        employee.pay_amount >
          0
          ? String(
              employee.pay_amount
            )
          : ""
      );
    } else {
      setAmountPaid("");
    }
  }

  // ==========================================================
  // SAVE PAYMENT
  // ==========================================================

  async function handleSave(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setError("");
      setNotification("");

      if (
        !businessId ||
        !userId
      ) {
        setError(
          "Business information is not ready. Please refresh the page."
        );

        return;
      }

      const {
        data: payrollAllowed,
        error: payrollAccessError,
      } = await supabase.rpc(
        "can_manage_business_payroll",
        {
          p_business_id:
            businessId,
        }
      );

      if (payrollAccessError) {
        throw new Error(
          "Unable to verify payroll access."
        );
      }

      if (!payrollAllowed) {
        router.replace("/staff");
        return;
      }

      if (!employeeId) {
        setError(
          "Please select a staff member."
        );

        return;
      }

      if (!paymentDate) {
        setError(
          "Please select the payment date."
        );

        return;
      }

      if (
        !payPeriod.trim()
      ) {
        setError(
          "Please enter the pay period."
        );

        return;
      }

      const numericAmount =
        Number(
          amountPaid
        );

      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        setError(
          "Please enter a valid amount."
        );

        return;
      }

      if (!accountId) {
        setError(
          "Please select how the salary was paid."
        );

        return;
      }

      if (
        !payrollCategoryId
      ) {
        setError(
          "Payroll expense category is not available."
        );

        return;
      }

      if (
        !selectedEmployee
      ) {
        setError(
          "The selected staff member could not be found."
        );

        return;
      }

      if (
        !selectedAccount
      ) {
        setError(
          "The selected payment account could not be found."
        );

        return;
      }

      setSaving(true);

      // ------------------------------------------------------
      // NOTES
      // ------------------------------------------------------

      const noteParts = [
        `Pay Period: ${payPeriod.trim()}`,
      ];

      if (
        reference.trim()
      ) {
        noteParts.push(
          `Reference: ${reference.trim()}`
        );
      }

      if (note.trim()) {
        noteParts.push(
          note.trim()
        );
      }

      // ------------------------------------------------------
      // TRANSACTION
      // ------------------------------------------------------

      const {
        error:
          insertError,
      } = await supabase
        .from(
          "transactions"
        )
        .insert({
          business_id:
            businessId,

          transaction_number:
            createPaymentNumber(),

          transaction_date:
            `${paymentDate}T12:00:00`,

          transaction_type:
            "expense",

          category_id:
            payrollCategoryId,

          description:
            `Salary Payment - ${selectedEmployee.full_name}`,

          amount:
            numericAmount,

          account_id:
            selectedAccount.id,

          payment_method:
            selectedAccount.name,

          reference_type:
            "salary_payment",

          reference_id:
            selectedEmployee.id,

          notes:
            noteParts.join(
              " · "
            ),

          created_by:
            userId,
        });

      if (
        insertError
      ) {
        throw new Error(
          insertError.message
        );
      }

      // ------------------------------------------------------
      // SIMPLE SUCCESS NOTIFICATION
      // ------------------------------------------------------

      setNotification(
        "Saved successfully"
      );

      // ------------------------------------------------------
      // RESET PAYMENT-SPECIFIC FIELDS
      // ------------------------------------------------------

      setPayPeriod("");
      setReference("");
      setNote("");

      if (
        selectedEmployee.pay_amount >
        0
      ) {
        setAmountPaid(
          String(
            selectedEmployee.pay_amount
          )
        );
      } else {
        setAmountPaid("");
      }

      setSaving(false);
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
          : "Unable to save salary payment."
      );

      setSaving(false);
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
            Loading salary payment...
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
      eyebrow="Payroll"
      title="Record Salary Payment"
      description="Record a staff salary payment and automatically include it in farm expenses."
      recordText="Salary Payment"
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
          BACK
      ====================================================== */}

      <div className="mb-5">

        <Link
          href="/staff"
          className="inline-flex items-center gap-2 text-[14px] font-bold text-[#0b5136] transition hover:text-emerald-800"
        >
          <ArrowLeft
            size={17}
          />

          Back to Staff & Payroll
        </Link>

      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-red-300 bg-red-50 p-4">

          <p className="text-[15px] font-semibold leading-6 text-red-800">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            className="shrink-0 text-red-600"
            aria-label="Close error"
          >
            <X size={18} />
          </button>

        </div>
      )}

      {/* ======================================================
          NO STAFF
      ====================================================== */}

      {employees.length ===
        0 ? (
        <section className="rounded-[26px] border border-white/90 bg-white p-8 text-center shadow-[0_16px_45px_rgba(15,23,42,0.08)]">

          <UserRound
            size={34}
            className="mx-auto text-[#0b5136]"
          />

          <h2 className="mt-4 text-[21px] font-bold text-slate-950">
            No active staff available
          </h2>

          <p className="mx-auto mt-2 max-w-[520px] text-[15px] leading-6 text-slate-600">
            Add an active staff member before recording a salary payment.
          </p>

          <Link
            href="/staff"
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#0b5136] px-5 py-3 text-[15px] font-bold text-white transition hover:bg-[#083c29]"
          >
            Go to Staff & Payroll
          </Link>

        </section>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">

          {/* ==================================================
              FORM
          ================================================== */}

          <section className="overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.08)]">

            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">

              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                Payment Details
              </p>

              <h2 className="mt-1 text-[21px] font-bold text-slate-950">
                Salary Payment
              </h2>

              <p className="mt-1 text-[15px] leading-6 text-slate-600">
                Select the staff member, pay period, amount and how the payment was made.
              </p>

            </div>

            <form
              onSubmit={
                handleSave
              }
              className="p-5 sm:p-6"
            >

              <div className="grid gap-5 md:grid-cols-2">

                {/* STAFF */}

                <Field
                  label="Staff Member"
                >

                  <select
                    required
                    value={
                      employeeId
                    }
                    onChange={(
                      event
                    ) =>
                      handleEmployeeChange(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] px-4 py-3.5 text-[15px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  >

                    <option value="">
                      Select staff member
                    </option>

                    {employees.map(
                      (employee) => (
                        <option
                          key={
                            employee.id
                          }
                          value={
                            employee.id
                          }
                        >
                          {employee.full_name}
                        </option>
                      )
                    )}

                  </select>

                </Field>

                {/* DATE */}

                <Field
                  label="Payment Date"
                >

                  <div className="relative">

                    <CalendarDays
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      type="date"
                      required
                      value={
                        paymentDate
                      }
                      onChange={(
                        event
                      ) =>
                        setPaymentDate(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3.5 pl-11 pr-4 text-[15px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    />

                  </div>

                </Field>

                {/* PAY PERIOD */}

                <Field
                  label="Pay Period"
                >

                  <input
                    type="text"
                    required
                    value={
                      payPeriod
                    }
                    onChange={(
                      event
                    ) =>
                      setPayPeriod(
                        event.target.value
                      )
                    }
                    placeholder="Example: August 2026"
                    className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] px-4 py-3.5 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />

                </Field>

                {/* AMOUNT */}

                <Field
                  label="Amount Paid"
                >

                  <div className="relative">

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-bold text-slate-600">
                      GMD
                    </span>

                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={
                        amountPaid
                      }
                      onChange={(
                        event
                      ) =>
                        setAmountPaid(
                          event.target.value
                        )
                      }
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3.5 pl-16 pr-4 text-[16px] font-bold text-slate-950 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    />

                  </div>

                </Field>

                {/* PAID BY */}

                <Field
                  label="Paid By"
                >

                  <select
                    required
                    value={
                      accountId
                    }
                    onChange={(
                      event
                    ) =>
                      setAccountId(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] px-4 py-3.5 text-[15px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  >

                    <option value="">
                      Select payment method
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
                          {account.name}
                        </option>
                      )
                    )}

                  </select>

                </Field>

                {/* REFERENCE */}

                <Field
                  label="Reference"
                  optional
                >

                  <div className="relative">

                    <ReceiptText
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      type="text"
                      value={
                        reference
                      }
                      onChange={(
                        event
                      ) =>
                        setReference(
                          event.target.value
                        )
                      }
                      placeholder="Receipt or reference"
                      className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3.5 pl-11 pr-4 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    />

                  </div>

                </Field>

              </div>

              {/* NOTE */}

              <div className="mt-5">

                <Field
                  label="Note"
                  optional
                >

                  <textarea
                    rows={4}
                    value={
                      note
                    }
                    onChange={(
                      event
                    ) =>
                      setNote(
                        event.target.value
                      )
                    }
                    placeholder="Optional note about this payment"
                    className="w-full resize-none rounded-xl border border-slate-300 bg-[#f8faf9] px-4 py-3.5 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />

                </Field>

              </div>

              {/* BUTTONS */}

              <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b5136] px-5 py-3.5 text-[15px] font-bold text-white transition hover:bg-[#083c29] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >

                  {saving ? (
                    <>
                      <Loader2
                        size={19}
                        className="animate-spin"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <Save
                        size={19}
                      />

                      Save Payment
                    </>
                  )}

                </button>

                <Link
                  href="/staff"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-[15px] font-bold text-slate-700 transition hover:bg-slate-100 sm:w-auto"
                >
                  Cancel
                </Link>

              </div>

            </form>

          </section>

          {/* ==================================================
              SUMMARY
          ================================================== */}

          <aside className="h-fit overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.08)]">

            <div className="border-b border-slate-200 px-5 py-5">

              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                Payment Summary
              </p>

              <h2 className="mt-1 text-[20px] font-bold text-slate-950">
                Salary Details
              </h2>

            </div>

            <div className="space-y-5 p-5">

              <SummaryRow
                label="Staff Member"
                value={
                  selectedEmployee?.full_name ??
                  "Not selected"
                }
                icon={
                  <UserRound
                    size={18}
                  />
                }
              />

              <SummaryRow
                label="Normal Pay"
                value={
                  selectedEmployee
                    ? money(
                        selectedEmployee.pay_amount
                      )
                    : "GMD 0"
                }
                icon={
                  <Banknote
                    size={18}
                  />
                }
              />

              <SummaryRow
                label="Pay Type"
                value={
                  selectedEmployee
                    ? nicePayType(
                        selectedEmployee.pay_type
                      )
                    : "Not selected"
                }
                icon={
                  <CalendarDays
                    size={18}
                  />
                }
              />

              <SummaryRow
                label="Amount Paid"
                value={
                  amountPaid &&
                  Number.isFinite(
                    Number(
                      amountPaid
                    )
                  )
                    ? money(
                        Number(
                          amountPaid
                        )
                      )
                    : "GMD 0"
                }
                icon={
                  <Banknote
                    size={18}
                  />
                }
              />

              <SummaryRow
                label="Paid By"
                value={
                  selectedAccount?.name ??
                  "Not selected"
                }
                icon={
                  <Wallet
                    size={18}
                  />
                }
              />

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

                <p className="text-[13px] font-bold text-[#0b5136]">
                  Expense Recording
                </p>

                <p className="mt-1 text-[13px] leading-5 text-emerald-900/80">
                  Saving this payment automatically records it under the Payroll expense category.
                </p>

              </div>

            </div>

          </aside>

        </div>
      )}

    </FinancePageShell>
  );
}

// ============================================================
// FIELD
// ============================================================

function Field({
  label,
  optional = false,
  children,
}: {
  label: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">

      <div className="mb-2 flex items-center gap-2">

        <span className="text-[15px] font-bold text-slate-800">
          {label}
        </span>

        {optional && (
          <span className="text-[12px] font-medium text-slate-500">
            Optional
          </span>
        )}

      </div>

      {children}

    </label>
  );
}

// ============================================================
// SUMMARY ROW
// ============================================================

function SummaryRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#0b5136]">
        {icon}
      </div>

      <div className="min-w-0">

        <p className="text-[12px] font-bold uppercase tracking-wide text-slate-500">
          {label}
        </p>

        <p className="mt-1 break-words text-[15px] font-bold text-slate-950">
          {value}
        </p>

      </div>

    </div>
  );
}