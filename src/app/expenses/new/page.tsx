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
import { supabase } from "@/lib/supabase";

// ============================================================
// CONSTANTS
// ============================================================

const NO_CATEGORY =
  "__none__";

// ============================================================
// TYPES
// ============================================================

type Membership = {
  business_id: string;
};

type Category = {
  id: string;
  name: string;
};

type Account = {
  id: string;
  name: string;
  account_type: string;
};

type TobaskiSeason = {
  id: string;
  season_name: string;
  season_year: number;
  active: boolean;
};

// ============================================================
// HELPERS
// ============================================================

function todayForInput() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

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

function createExpenseNumber() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  const hours =
    String(
      now.getHours()
    ).padStart(
      2,
      "0"
    );

  const minutes =
    String(
      now.getMinutes()
    ).padStart(
      2,
      "0"
    );

  const seconds =
    String(
      now.getSeconds()
    ).padStart(
      2,
      "0"
    );

  const random =
    Math.floor(
      1000 +
        Math.random() *
          9000
    );

  return `EXP-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
}

function getAccountIcon(
  account: Account
) {
  const type =
    account.account_type
      ?.toLowerCase() ??
    "";

  const name =
    account.name
      ?.toLowerCase() ??
    "";

  if (
    type ===
      "bank" ||
    name.includes(
      "bank"
    )
  ) {
    return (
      <Landmark
        size={22}
      />
    );
  }

  if (
    type ===
      "wave" ||
    type ===
      "mobile_money" ||
    name.includes(
      "wave"
    )
  ) {
    return (
      <Smartphone
        size={22}
      />
    );
  }

  return (
    <Banknote
      size={22}
    />
  );
}

// ============================================================
// PAGE
// ============================================================

export default function AddExpensePage() {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] = useState(
    true
  );

  const [
    saving,
    setSaving,
  ] = useState(
    false
  );

  const [
    error,
    setError,
  ] = useState(
    ""
  );

  const [
    businessId,
    setBusinessId,
  ] = useState(
    ""
  );

  const [
    userId,
    setUserId,
  ] = useState(
    ""
  );

  const [
    categories,
    setCategories,
  ] =
    useState<
      Category[]
    >([]);

  const [
    accounts,
    setAccounts,
  ] =
    useState<
      Account[]
    >([]);

  const [
    tobaskiSeasons,
    setTobaskiSeasons,
  ] =
    useState<
      TobaskiSeason[]
    >([]);

  // ==========================================================
  // FORM
  // ==========================================================

  const [
    datePaid,
    setDatePaid,
  ] = useState(
    todayForInput()
  );

  const [
    categoryId,
    setCategoryId,
  ] = useState(
    NO_CATEGORY
  );

  const [
    description,
    setDescription,
  ] = useState(
    ""
  );

  const [
    amount,
    setAmount,
  ] = useState(
    ""
  );

  const [
    reference,
    setReference,
  ] = useState(
    ""
  );

  const [
    accountId,
    setAccountId,
  ] = useState(
    ""
  );

  const [
    note,
    setNote,
  ] = useState(
    ""
  );

  // ==========================================================
  // TOBASKI
  // ==========================================================

  const [
    tobaskiLinked,
    setTobaskiLinked,
  ] = useState(
    false
  );

  const [
    tobaskiSeasonId,
    setTobaskiSeasonId,
  ] = useState(
    ""
  );

  const [
    tobaskiQuantity,
    setTobaskiQuantity,
  ] = useState(
    ""
  );

  // ==========================================================
  // LOAD
  // ==========================================================

  useEffect(() => {
    let active =
      true;

    async function loadPage() {
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

        if (!active) {
          return;
        }

        setUserId(
          session.user.id
        );

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

        if (!active) {
          return;
        }

        setBusinessId(
          membership.business_id
        );

        const [
          categoryResult,
          accountResult,
          tobaskiResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "categories"
              )
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
              ),

            supabase
              .from(
                "financial_accounts"
              )
              .select(
                `
                id,
                name,
                account_type
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
              ),

            supabase
              .from(
                "tobaski_seasons"
              )
              .select(
                `
                id,
                season_name,
                season_year,
                active
              `
              )
              .eq(
                "business_id",
                membership.business_id
              )
              .order(
                "season_year",
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
            `Unable to load expense categories: ${categoryResult.error.message}`
          );
        }

        if (
          accountResult.error
        ) {
          throw new Error(
            `Unable to load payment accounts: ${accountResult.error.message}`
          );
        }

        if (
          tobaskiResult.error
        ) {
          throw new Error(
            `Unable to load Tobaski seasons: ${tobaskiResult.error.message}`
          );
        }

        if (!active) {
          return;
        }

        const categoryList =
          (
            categoryResult.data ??
            []
          ) as Category[];

        const accountList =
          (
            accountResult.data ??
            []
          ) as Account[];

        const seasonList =
          (
            tobaskiResult.data ??
            []
          ) as TobaskiSeason[];

        setCategories(
          categoryList
        );

        setAccounts(
          accountList
        );

        setTobaskiSeasons(
          seasonList
        );

        setCategoryId(
          NO_CATEGORY
        );

        // ====================================================
        // DEFAULT CASH
        // ====================================================

        const cashAccount =
          accountList.find(
            (
              account
            ) =>
              account.account_type
                ?.toLowerCase() ===
                "cash" ||
              account.name
                .toLowerCase()
                .includes(
                  "cash"
                )
          );

        if (
          cashAccount
        ) {
          setAccountId(
            cashAccount.id
          );
        } else {
          setAccountId(
            ""
          );
        }

        // ====================================================
        // DEFAULT ACTIVE TOBASKI SEASON
        // ====================================================

        const activeSeason =
          seasonList.find(
            (
              season
            ) =>
              season.active
          );

        if (
          activeSeason
        ) {
          setTobaskiSeasonId(
            activeSeason.id
          );
        }

        setLoading(
          false
        );
      } catch (
        loadError
      ) {
        console.error(
          loadError
        );

        if (
          active
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load the expense form."
          );

          setLoading(
            false
          );
        }
      }
    }

    loadPage();

    return () => {
      active =
        false;
    };
  }, [
    router,
  ]);

  // ==========================================================
  // SELECTED VALUES
  // ==========================================================

  const selectedCategory =
    useMemo(() => {
      if (
        categoryId ===
        NO_CATEGORY
      ) {
        return null;
      }

      return (
        categories.find(
          (
            category
          ) =>
            category.id ===
            categoryId
        ) ??
        null
      );
    }, [
      categories,
      categoryId,
    ]);

  const selectedAccount =
    useMemo(
      () =>
        accounts.find(
          (
            account
          ) =>
            account.id ===
            accountId
        ) ??
        null,
      [
        accounts,
        accountId,
      ]
    );

  const selectedTobaskiSeason =
    useMemo(
      () =>
        tobaskiSeasons.find(
          (
            season
          ) =>
            season.id ===
            tobaskiSeasonId
        ) ??
        null,
      [
        tobaskiSeasons,
        tobaskiSeasonId,
      ]
    );

  const numericAmount =
    amount.trim() ===
    ""
      ? 0
      : Number(
          amount
        );

  const isSheepPurchase =
    selectedCategory
      ?.name
      .trim()
      .toLowerCase() ===
    "sheep purchase";

  // ==========================================================
  // TOBASKI TOGGLE
  // ==========================================================

  function handleTobaskiChange(
    checked:
      boolean
  ) {
    setTobaskiLinked(
      checked
    );

    if (
      checked &&
      !tobaskiSeasonId
    ) {
      const activeSeason =
        tobaskiSeasons.find(
          (
            season
          ) =>
            season.active
        );

      if (
        activeSeason
      ) {
        setTobaskiSeasonId(
          activeSeason.id
        );
      }
    }

    if (
      !checked
    ) {
      setTobaskiQuantity(
        ""
      );
    }
  }

  // ==========================================================
  // SAVE
  // ==========================================================

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setError(
        ""
      );

      if (
        !businessId ||
        !userId
      ) {
        setError(
          "Your session is not ready. Please refresh the page."
        );

        return;
      }

      if (
        !datePaid
      ) {
        setError(
          "Please enter the date the expense was paid."
        );

        return;
      }

      if (
        categoryId ===
          NO_CATEGORY ||
        !selectedCategory
      ) {
        setError(
          "Please select an expense category."
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
        numericAmount <=
          0
      ) {
        setError(
          "Please enter a valid amount paid."
        );

        return;
      }

      if (
        !accountId ||
        !selectedAccount
      ) {
        setError(
          "Please select where the money was paid from."
        );

        return;
      }

      if (
        tobaskiLinked &&
        !tobaskiSeasonId
      ) {
        setError(
          "Please select the Tobaski season."
        );

        return;
      }

      let quantity:
        number | null =
        null;

      if (
        tobaskiLinked &&
        isSheepPurchase
      ) {
        quantity =
          Number(
            tobaskiQuantity
          );

        if (
          !Number.isFinite(
            quantity
          ) ||
          quantity <=
            0 ||
          !Number.isInteger(
            quantity
          )
        ) {
          setError(
            "Please enter the number of sheep purchased."
          );

          return;
        }
      }

      setSaving(
        true
      );

      const noteParts =
        [
          reference.trim()
            ? `Reference: ${reference.trim()}`
            : "",

          note.trim()
            ? note.trim()
            : "",
        ].filter(
          Boolean
        );

      const combinedNotes =
        noteParts.length >
        0
          ? noteParts.join(
              " · "
            )
          : null;

      const transactionNumber =
        createExpenseNumber();

      // ======================================================
      // SPECIAL CASE:
      // TOBASKI SHEEP PURCHASE
      //
      // The database saves the expense AND creates the
      // individual sheep stock in one operation.
      // ======================================================

      if (
        tobaskiLinked &&
        isSheepPurchase &&
        quantity !==
          null
      ) {
        const {
          error:
            purchaseError,
        } =
          await supabase.rpc(
            "record_tobaski_sheep_purchase_expense",
            {
              p_business_id:
                businessId,

              p_transaction_number:
                transactionNumber,

              p_transaction_date:
                `${datePaid}T12:00:00`,

              p_category_id:
                selectedCategory.id,

              p_description:
                description.trim(),

              p_amount:
                numericAmount,

              p_account_id:
                selectedAccount.id,

              p_payment_method:
                selectedAccount.name,

              p_notes:
                combinedNotes,

              p_tobaski_season_id:
                tobaskiSeasonId,

              p_quantity:
                quantity,
            }
          );

        if (
          purchaseError
        ) {
          throw new Error(
            purchaseError.message
          );
        }
      } else {
        // ====================================================
        // NORMAL EXPENSE
        //
        // Also used for Tobaski Feed, Medication,
        // Transport, Labour, etc.
        // ====================================================

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
              transactionNumber,

            transaction_date:
              `${datePaid}T12:00:00`,

            transaction_type:
              "expense",

            category_id:
              selectedCategory.id,

            description:
              description.trim(),

            amount:
              numericAmount,

            account_id:
              selectedAccount.id,

            payment_method:
              selectedAccount.name,

            reference_type:
              "manual_expense",

            notes:
              combinedNotes,

            created_by:
              userId,

            tobaski_season_id:
              tobaskiLinked
                ? tobaskiSeasonId
                : null,

            tobaski_quantity:
              null,
          });

        if (
          insertError
        ) {
          throw new Error(
            insertError.message
          );
        }
      }

      router.push(
        "/expenses"
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
          : "Unable to save expense."
      );

      setSaving(
        false
      );
    }
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
            Loading expense form...
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
      eyebrow="Money Out"
      title="Add Expense"
      description="Record money spent by Djallows Farm on feed, medication, veterinary care, staff, transport and other farm expenses."
      recordText="Expense entry"
    >

      <div className="mb-5">

        <Link
          href="/expenses"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[15px] font-bold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-[#0b5136]"
        >
          <ArrowLeft
            size={18}
          />

          Back to Expenses
        </Link>

      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">

        <section className="overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.08)]">

          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">

            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              Expense Details
            </p>

            <h2 className="mt-1 text-[22px] font-bold text-slate-950">
              Money Spent
            </h2>

            <p className="mt-1 text-[15px] leading-6 text-slate-600">
              Enter the details of the money spent by the farm.
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
                {
                  error
                }
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">

              <Field
                label="Date Paid"
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
                      datePaid
                    }
                    onChange={(
                      event
                    ) =>
                      setDatePaid(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3.5 pl-11 pr-4 text-[15px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />

                </div>

              </Field>

              <Field
                label="Expense Category"
                required
              >

                <select
                  name="expense-category"
                  autoComplete="off"
                  required
                  value={
                    categoryId
                  }
                  onChange={(
                    event
                  ) => {
                    setCategoryId(
                      event.target.value
                    );

                    setTobaskiQuantity(
                      ""
                    );
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] px-4 py-3.5 text-[15px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                >

                  <option
                    value={
                      NO_CATEGORY
                    }
                  >
                    Select expense category
                  </option>

                  {categories.map(
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

              </Field>

            </div>

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
                    placeholder="Example: Purchase of sheep feed"
                    className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3.5 pl-11 pr-4 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />

                </div>

              </Field>

            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">

              <Field
                label="Amount Paid"
                required
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
                      amount
                    }
                    onChange={(
                      event
                    ) =>
                      setAmount(
                        event.target.value
                      )
                    }
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
                    placeholder="Example: Receipt 031"
                    className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3.5 pl-11 pr-4 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />

                </div>

              </Field>

            </div>

            {/* ==================================================
                PAYMENT ACCOUNT
            ================================================== */}

            <div className="mt-7 border-t border-slate-200 pt-6">

              <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                Payment Account
              </p>

              <h3 className="mt-1 text-[19px] font-bold text-slate-950">
                Where Was the Money Paid From?
              </h3>

              <p className="mt-1 text-[14px] text-slate-600">
                Select the account used to pay this expense.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                {accounts.map(
                  (
                    account
                  ) => {
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
                            {
                              account.name
                            }
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

            {/* ==================================================
                TOBASKI
            ================================================== */}

            <div className="mt-7 border-t border-slate-200 pt-6">

              <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-5">

                <div className="flex items-start gap-3">

                  <input
                    id="tobaski-expense"
                    type="checkbox"
                    checked={
                      tobaskiLinked
                    }
                    onChange={(
                      event
                    ) =>
                      handleTobaskiChange(
                        event.target.checked
                      )
                    }
                    className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#0b5136]"
                  />

                  <div>

                    <label
                      htmlFor="tobaski-expense"
                      className="cursor-pointer text-[16px] font-bold text-slate-950"
                    >
                      This expense is part of a Tobaski investment
                    </label>

                    <p className="mt-1 text-[13px] leading-5 text-slate-600">
                      Tick this only when the expense belongs to a Tobaski season.
                    </p>

                  </div>

                </div>

                {tobaskiLinked && (
                  <div className="mt-5 grid gap-5 md:grid-cols-2">

                    <Field
                      label="Tobaski Season"
                      required
                    >

                      <select
                        value={
                          tobaskiSeasonId
                        }
                        onChange={(
                          event
                        ) =>
                          setTobaskiSeasonId(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-amber-300 bg-white px-4 py-3.5 text-[15px] font-semibold text-slate-800 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                      >

                        <option value="">
                          Select Tobaski season
                        </option>

                        {tobaskiSeasons.map(
                          (
                            season
                          ) => (
                            <option
                              key={
                                season.id
                              }
                              value={
                                season.id
                              }
                            >
                              {
                                season.season_name
                              }
                            </option>
                          )
                        )}

                      </select>

                    </Field>

                    {isSheepPurchase && (
                      <Field
                        label="Number of Sheep Purchased"
                        required
                      >

                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={
                            tobaskiQuantity
                          }
                          onChange={(
                            event
                          ) =>
                            setTobaskiQuantity(
                              event.target.value
                            )
                          }
                          placeholder="Example: 15"
                          className="w-full rounded-xl border border-amber-300 bg-white px-4 py-3.5 text-[15px] font-bold text-slate-950 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                        />

                      </Field>
                    )}

                  </div>
                )}

                {tobaskiLinked &&
                  isSheepPurchase && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-white p-4">

                      <p className="text-[14px] font-bold text-slate-900">
                        Tobaski Sheep Stock
                      </p>

                      <p className="mt-1 text-[13px] leading-5 text-slate-600">
                        When saved, the app will automatically create one stock position for every sheep purchased.
                      </p>

                      {selectedTobaskiSeason &&
                        Number(
                          tobaskiQuantity
                        ) >
                          0 && (
                          <p className="mt-2 text-[13px] font-bold text-[#0b5136]">
                            {tobaskiQuantity} sheep will be added to{" "}
                            {
                              selectedTobaskiSeason.season_name
                            } stock.
                          </p>
                        )}

                    </div>
                  )}

              </div>

            </div>

            {/* ==================================================
                NOTE
            ================================================== */}

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
                  placeholder="Add any additional information about this expense..."
                  className="w-full resize-none rounded-xl border border-slate-300 bg-[#f8faf9] px-4 py-3.5 text-[15px] font-medium leading-6 text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />

              </Field>

            </div>

            {/* ==================================================
                ACTIONS
            ================================================== */}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">

              <Link
                href="/expenses"
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

                    Saving Expense...
                  </>
                ) : (
                  <>
                    <Banknote
                      size={19}
                    />

                    Save Expense
                  </>
                )}

              </button>

            </div>

          </form>

        </section>

        {/* ====================================================
            SUMMARY
        ==================================================== */}

        <aside className="space-y-4">

          <section className="rounded-[24px] bg-gradient-to-br from-[#0b5136] to-[#073523] p-6 text-white shadow-[0_16px_40px_rgba(13,61,42,0.20)]">

            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-100">
              Expense Summary
            </p>

            <h2 className="mt-2 text-[22px] font-bold">
              Money Being Spent
            </h2>

            <div className="mt-6 space-y-5">

              <SummaryRow
                label="Expense Category"
                value={
                  selectedCategory
                    ? selectedCategory.name
                    : "Not selected"
                }
              />

              <SummaryRow
                label="Amount"
                value={
                  Number.isFinite(
                    numericAmount
                  ) &&
                  numericAmount >
                    0
                    ? money(
                        numericAmount
                      )
                    : "GMD 0"
                }
              />

              <SummaryRow
                label="Paid From"
                value={
                  selectedAccount
                    ?.name ??
                  "Not selected"
                }
              />

              <SummaryRow
                label="Date"
                value={
                  datePaid ||
                  "Not selected"
                }
              />

              <SummaryRow
                label="Tobaski"
                value={
                  tobaskiLinked
                    ? selectedTobaskiSeason
                        ?.season_name ??
                      "Season not selected"
                    : "Not linked"
                }
              />

              {tobaskiLinked &&
                isSheepPurchase && (
                  <SummaryRow
                    label="Sheep Purchased"
                    value={
                      tobaskiQuantity ||
                      "Not entered"
                    }
                  />
                )}

            </div>

          </section>

          <section className="rounded-[24px] border border-white bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.07)]">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-[#0b5136]">

              <Wallet
                size={21}
              />

            </div>

            <h2 className="mt-4 text-[19px] font-bold text-slate-950">
              What happens after saving?
            </h2>

            {tobaskiLinked &&
            isSheepPurchase ? (
              <>
                <p className="mt-2 text-[15px] leading-6 text-slate-600">
                  The purchase is recorded once as an expense.
                </p>

                <p className="mt-3 text-[15px] leading-6 text-slate-600">
                  The app also creates the individual Tobaski sheep stock automatically.
                </p>

                <p className="mt-3 text-[15px] font-semibold leading-6 text-[#0b5136]">
                  Selling one of those sheep later will reduce the number remaining automatically.
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-[15px] leading-6 text-slate-600">
                  The expense will immediately be included in the Dashboard, Expenses and Reports.
                </p>

                {tobaskiLinked && (
                  <p className="mt-3 text-[15px] leading-6 text-slate-600">
                    It will also count toward the selected Tobaski season&apos;s investment.
                  </p>
                )}
              </>
            )}

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

      {
        children
      }

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
        {
          label
        }
      </p>

      <p className="mt-1 break-words text-[18px] font-bold text-white">
        {
          value
        }
      </p>

    </div>
  );
}