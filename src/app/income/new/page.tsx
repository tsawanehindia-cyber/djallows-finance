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
  CheckCircle2,
  FileText,
  Landmark,
  Loader2,
  ReceiptText,
  Smartphone,
  Wallet,
} from "lucide-react";

import FinancePageShell from "@/components/FinancePageShell";

// ============================================================
// CONSTANTS
// ============================================================

const NO_SOURCE = "__none__";

// ============================================================
// TYPES
// ============================================================

type IncomeSource = {
  id: string;
  name: string;
};

type Account = {
  id: string;
  name: string;
  account_type: string;
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

function getAccountIcon(
  account: Account
) {
  const type =
    account.account_type?.toLowerCase() ?? "";

  const name =
    account.name?.toLowerCase() ?? "";

  if (
    type === "bank" ||
    name.includes("bank")
  ) {
    return (
      <Landmark size={22} />
    );
  }

  if (
    type === "wave" ||
    type === "mobile_money" ||
    name.includes("wave")
  ) {
    return (
      <Smartphone size={22} />
    );
  }

  return (
    <Banknote size={22} />
  );
}

// ============================================================
// PAGE
// ============================================================

export default function AddIncomePage() {
  const router = useRouter();

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
    businessId,
    setBusinessId,
  ] = useState("");

  const [
    userId,
    setUserId,
  ] = useState("");

  const [
    incomeSources,
    setIncomeSources,
  ] = useState<IncomeSource[]>([]);

  const [
    accounts,
    setAccounts,
  ] = useState<Account[]>([]);

  // ==========================================================
  // FORM
  // ==========================================================

  const [
    dateReceived,
    setDateReceived,
  ] = useState(
    todayForInput()
  );

  const [
    sourceId,
    setSourceId,
  ] = useState(
    NO_SOURCE
  );

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    reference,
    setReference,
  ] = useState("");

  const [
    accountId,
    setAccountId,
  ] = useState("");

  const [
    note,
    setNote,
  ] = useState("");

  // ==========================================================
  // LOAD LOCAL PAGE
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadPage() {

      try {

        setLoading(
          true
        );

        setError(
          ""
        );

        const response =
          await fetch(
            "/api/local/income",
            {
              cache:
                "no-store",
            }
          );

        if (
          response.status ===
          401
        ) {

          router.replace(
            "/login"
          );

          return;
        }

        const data =
          (await response.json()) as {
            success?: boolean;
            error?: string;
            business_id?: string;
            user_id?: string;

            categories?: Array<{
              id: string;
              name: string;
              active: boolean;
            }>;

            accounts?: Array<{
              id: string;
              name: string;
              account_type: string;
              active: boolean;
            }>;
          };

        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.error ||
              "Unable to load the income form."
          );
        }

        if (!active) {
          return;
        }

        setUserId(
          data.user_id ??
          ""
        );

        setBusinessId(
          data.business_id ??
          ""
        );

        const sourceList =
          (
            data.categories ??
            []
          )
            .filter(
              (
                source
              ) =>
                source.active
            )
            .map(
              (
                source
              ) => ({
                id:
                  source.id,

                name:
                  source.name,
              })
            );

        const accountList =
          (
            data.accounts ??
            []
          )
            .filter(
              (
                account
              ) =>
                account.active
            )
            .map(
              (
                account
              ) => ({
                id:
                  account.id,

                name:
                  account.name,

                account_type:
                  account.account_type,
              })
            );

        setIncomeSources(
          sourceList
        );

        setAccounts(
          accountList
        );

        setSourceId(
          NO_SOURCE
        );

        setAccountId(
          accountList[0]?.id ??
          ""
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
              : "Unable to load the income form."
          );

          setLoading(
            false
          );
        }
      }
    }

    loadPage();

    return () => {
      active = false;
    };

  }, [
    router,
  ]);

  // ==========================================================
  // SELECTED VALUES
  // ==========================================================

  const selectedIncomeSource =
    useMemo(() => {
      if (
        sourceId ===
        NO_SOURCE
      ) {
        return null;
      }

      return (
        incomeSources.find(
          (source) =>
            source.id ===
            sourceId
        ) ?? null
      );
    }, [
      incomeSources,
      sourceId,
    ]);

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

  const numericAmount =
    amount.trim() === ""
      ? 0
      : Number(amount);

  // ==========================================================
  // SAVE INCOME
  // ==========================================================

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setError("");

      if (
        !businessId ||
        !userId
      ) {
        setError(
          "Your session is not ready. Please refresh the page."
        );

        return;
      }

      if (!dateReceived) {
        setError(
          "Please enter the date the money was received."
        );

        return;
      }

      if (
        sourceId ===
          NO_SOURCE ||
        !selectedIncomeSource
      ) {
        setError(
          "Please select an income source."
        );

        return;
      }

      if (
        !description.trim()
      ) {
        setError(
          "Please enter a description."
        );

        return;
      }

      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        setError(
          "Please enter a valid amount received."
        );

        return;
      }

      if (!accountId) {
        setError(
          "Please select where the money was received."
        );

        return;
      }

      if (
        !selectedAccount
      ) {
        setError(
          "The selected receiving account could not be found."
        );

        return;
      }

      setSaving(true);

      const response =
        await fetch(
          "/api/local/income",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                date_received:
                  dateReceived,

                category_id:
                  selectedIncomeSource.id,

                description:
                  description.trim(),

                amount:
                  numericAmount,

                account_id:
                  selectedAccount.id,

                reference:
                  reference.trim() ||
                  null,

                note:
                  note.trim() ||
                  null,
              }),
          }
        );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.error ||
            "Unable to save income."
        );
      }

      router.push(
        "/?saved=income"
      );

      router.refresh();
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
          : "Unable to save income."
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
            Loading income form...
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
      eyebrow="Money In"
      title="Add Income"
      description="Record money received by Djallows Farm from sheep sales, breeding services, consultancy and other farm income."
      recordText="Income entry"
    >

      {/* ======================================================
          BACK
      ====================================================== */}

      <div className="mb-5">

        <Link
          href="/income"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[15px] font-bold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-[#0b5136]"
        >

          <ArrowLeft size={18} />

          Back to Income

        </Link>

      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">

        {/* ====================================================
            FORM
        ==================================================== */}

        <section className="overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.08)]">

          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">

            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              Income Details
            </p>

            <h2 className="mt-1 text-[22px] font-bold text-slate-950">
              Money Received
            </h2>

            <p className="mt-1 text-[15px] leading-6 text-slate-600">
              Enter the details of the money received by the farm.
            </p>

          </div>

          <form
            autoComplete="off"
            onSubmit={
              handleSubmit
            }
            className="p-5 sm:p-6"
          >

            {error && (
              <div className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-[15px] font-semibold text-red-800">
                {error}
              </div>
            )}

            {/* DATE + SOURCE */}

            <div className="grid gap-5 md:grid-cols-2">

              <Field
                label="Date Received"
                required
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
                      dateReceived
                    }
                    onChange={(
                      event
                    ) =>
                      setDateReceived(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3.5 pl-11 pr-4 text-[15px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />

                </div>

              </Field>

              <Field
                label="Income Source"
                required
              >

                <select
                  key="income-source-select"
                  name="income-source"
                  autoComplete="off"
                  required
                  value={
                    sourceId
                  }
                  onChange={(
                    event
                  ) =>
                    setSourceId(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] px-4 py-3.5 text-[15px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                >

                  <option
                    value={
                      NO_SOURCE
                    }
                  >
                    Select income source
                  </option>

                  {incomeSources.map(
                    (source) => (
                      <option
                        key={
                          source.id
                        }
                        value={
                          source.id
                        }
                      >
                        {source.name}
                      </option>
                    )
                  )}

                </select>

              </Field>

            </div>

            {/* DESCRIPTION */}

            <div className="mt-5">

              <Field
                label="Description"
                required
              >

                <div className="relative">

                  <FileText
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    type="text"
                    required
                    value={
                      description
                    }
                    onChange={(
                      event
                    ) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    placeholder="Example: Sale of one Ladoum ram"
                    className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3.5 pl-11 pr-4 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />

                </div>

              </Field>

            </div>

            {/* AMOUNT + REFERENCE */}

            <div className="mt-5 grid gap-5 md:grid-cols-2">

              <Field
                label="Amount Received"
                required
              >

                <div className="relative">

                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-bold text-slate-600">
                    GMD
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={
                      amount
                    }
                    onChange={(
                      event
                    ) => {
                      const value =
                        event.target.value;

                      if (
                        /^\d*(\.\d{0,2})?$/.test(
                          value
                        )
                      ) {
                        setAmount(
                          value
                        );
                      }
                    }}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3.5 pl-16 pr-4 text-[17px] font-bold text-slate-950 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />

                </div>

              </Field>

              <Field
                label="Reference / Receipt Note"
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
                    placeholder="Example: Receipt 025"
                    className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3.5 pl-11 pr-4 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />

                </div>

              </Field>

            </div>

            {/* ==================================================
                RECEIVING ACCOUNT
            ================================================== */}

            <div className="mt-7 border-t border-slate-200 pt-6">

              <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                Payment Location
              </p>

              <h3 className="mt-1 text-[19px] font-bold text-slate-950">
                Where Was the Money Received?
              </h3>

              <p className="mt-1 text-[14px] text-slate-600">
                Select the account that received the money.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                {accounts.map(
                  (account) => {
                    const selected =
                      account.id ===
                      accountId;

                    return (
                      <button
                        key={
                          account.id
                        }
                        type="button"
                        onClick={() =>
                          setAccountId(
                            account.id
                          )
                        }
                        className={`relative flex min-h-[105px] items-center gap-4 rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-[#0b5136] bg-emerald-50 shadow-sm ring-2 ring-emerald-100"
                            : "border-slate-200 bg-[#f8faf9] hover:border-emerald-300 hover:bg-emerald-50/50"
                        }`}
                      >

                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            selected
                              ? "bg-[#0b5136] text-white"
                              : "bg-white text-[#0b5136] shadow-sm"
                          }`}
                        >
                          {getAccountIcon(
                            account
                          )}
                        </div>

                        <div className="min-w-0">

                          <p className="text-[15px] font-bold text-slate-950">
                            {account.name}
                          </p>

                          <p className="mt-1 text-[13px] font-medium capitalize text-slate-500">
                            {account.account_type.replace(
                              /_/g,
                              " "
                            )}
                          </p>

                        </div>

                        {selected && (
                          <CheckCircle2
                            size={19}
                            className="absolute right-3 top-3 text-[#0b5136]"
                          />
                        )}

                      </button>
                    );
                  }
                )}

              </div>

            </div>

            {/* NOTE */}

            <div className="mt-6">

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
                  placeholder="Add any additional information about this income..."
                  className="w-full resize-none rounded-xl border border-slate-300 bg-[#f8faf9] px-4 py-3.5 text-[15px] font-medium leading-6 text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />

              </Field>

            </div>

            {/* ACTIONS */}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">

              <Link
                href="/income"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-[15px] font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={
                  saving
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b5136] px-6 py-3.5 text-[15px] font-bold text-white shadow-sm transition hover:bg-[#083c29] disabled:cursor-not-allowed disabled:opacity-60"
              >

                {saving ? (
                  <>
                    <Loader2
                      size={19}
                      className="animate-spin"
                    />

                    Saving Income...
                  </>
                ) : (
                  <>
                    <Banknote
                      size={19}
                    />

                    Save Income
                  </>
                )}

              </button>

            </div>

          </form>

        </section>

        {/* ====================================================
            LIVE SUMMARY
        ==================================================== */}

        <aside className="space-y-4">

          <section className="rounded-[24px] bg-gradient-to-br from-[#0b5136] to-[#073523] p-6 text-white shadow-[0_16px_40px_rgba(13,61,42,0.20)]">

            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-100">
              Income Summary
            </p>

            <h2 className="mt-2 text-[22px] font-bold">
              Money Being Recorded
            </h2>

            <div className="mt-6 space-y-5">

              <SummaryRow
                label="Income Source"
                value={
                  selectedIncomeSource
                    ? selectedIncomeSource.name
                    : "Not selected"
                }
              />

              <SummaryRow
                label="Amount"
                value={
                  Number.isFinite(
                    numericAmount
                  ) &&
                  numericAmount > 0
                    ? money(
                        numericAmount
                      )
                    : "GMD 0"
                }
              />

              <SummaryRow
                label="Received Into"
                value={
                  selectedAccount
                    ?.name ??
                  "Not selected"
                }
              />

              <SummaryRow
                label="Date"
                value={
                  dateReceived ||
                  "Not selected"
                }
              />

            </div>

          </section>

          <section className="rounded-[24px] border border-white bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.07)]">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-[#0b5136]">

              <Wallet size={21} />

            </div>

            <h2 className="mt-4 text-[19px] font-bold text-slate-950">
              What happens after saving?
            </h2>

            <p className="mt-2 text-[15px] leading-6 text-slate-600">
              The income will immediately be included in Djallows Farm&apos;s Dashboard, Income records and Reports.
            </p>

            <p className="mt-3 text-[15px] leading-6 text-slate-600">
              The selected income source allows the app to show exactly where the farm&apos;s income came from.
            </p>

          </section>

        </aside>

      </div>

    </FinancePageShell>
  );
}

// ============================================================
// FIELD
// ============================================================

function Field({
  label,
  required = false,
  optional = false,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">

      <div className="mb-2 flex items-center gap-2">

        <span className="text-[15px] font-bold text-slate-800">
          {label}

          {required && (
            <span className="ml-1 text-emerald-700">
              *
            </span>
          )}
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
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-white/15 pb-4 last:border-none last:pb-0">

      <p className="text-[13px] font-semibold text-emerald-100/85">
        {label}
      </p>

      <p className="mt-1 break-words text-[18px] font-bold text-white">
        {value}
      </p>

    </div>
  );
}