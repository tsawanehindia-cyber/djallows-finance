"use client";

import { createPortal } from "react-dom";

import Link from "next/link";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Printer,
  ReceiptText,
  Wallet,
  X,
} from "lucide-react";

import FinancePageShell from "@/components/FinancePageShell";
import DocumentLetterhead, {
  DocumentFooter,
  DocumentSignatureBlock,
} from "@/components/DocumentLetterhead";
import { supabase } from "@/lib/supabase";

// ============================================================
// TYPES
// ============================================================

type InvoiceRow = {
  id: string;
  business_id: string;
  invoice_number: string;
  customer_id: string | null;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  discount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  notes: string | null;
  invoice_type: string;
  tobaski_season_id: string | null;
};

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  location: string | null;
};

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  line_total: number;
};

type SheepDetail = {
  id: string;
  sheep_name: string | null;
  sheep_tag: string | null;
  breed_type: string | null;
  sex: string | null;
  date_of_birth: string | null;
  age_months_at_sale: number | null;
  sale_category: string | null;
  sale_price: number;
  tobaski_stock_id: string | null;
};

type PaymentRow = {
  id: string;
  receipt_number: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  account_id: string | null;
  notes: string | null;
};

type AccountRow = {
  id: string;
  name: string;
  active: boolean;
};

type MemberRole =
  | "owner"
  | "admin"
  | "staff"
  | "viewer";

type PrintTarget =
  | {
      type: "invoice";
    }
  | {
      type: "receipt";
      paymentId: string;
    }
  | null;

// ============================================================
// HELPERS
// ============================================================

function today() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function money(
  amount: number
) {
  return `GMD ${Number(
    amount || 0
  ).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  const clean =
    String(value).slice(
      0,
      10
    );

  const date =
    new Date(
      `${clean}T12:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return clean;
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

function invoiceTypeLabel(
  value: string
) {
  if (
    value === "sheep_sale"
  ) {
    return "Sheep Sale";
  }

  if (
    value === "product_sale"
  ) {
    return "Farm Product Sale";
  }

  if (
    value === "service"
  ) {
    return "Consultancy / Service";
  }

  return "Other";
}

function normaliseStatus(
  status: string
) {
  const value =
    String(
      status || ""
    )
      .trim()
      .toLowerCase();

  if (
    value === "paid"
  ) {
    return "paid";
  }

  if (
    value === "part_paid" ||
    value === "partially_paid" ||
    value === "partial"
  ) {
    return "part_paid";
  }

  if (
    value === "cancelled"
  ) {
    return "cancelled";
  }

  return "unpaid";
}

function isInvoiceOverdue(
  invoice: InvoiceRow
) {
  if (
    !invoice.due_date ||
    invoice.balance_due <= 0 ||
    normaliseStatus(
      invoice.status
    ) === "cancelled"
  ) {
    return false;
  }

  const currentDate =
    new Date();

  currentDate.setHours(
    0,
    0,
    0,
    0
  );

  const dueDate =
    new Date(
      `${String(
        invoice.due_date
      ).slice(
        0,
        10
      )}T00:00:00`
    );

  return (
    dueDate <
    currentDate
  );
}

// ============================================================
// PAGE
// ============================================================

export default function InvoiceDetailPage() {
  const router =
    useRouter();

  const params =
    useParams<{
      id: string;
    }>();

  const invoiceId =
    typeof params.id ===
    "string"
      ? params.id
      : "";

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    paymentSaving,
    setPaymentSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    memberRole,
    setMemberRole,
  ] = useState<MemberRole>(
    "staff"
  );

  const [
    notification,
    setNotification,
  ] = useState("");

  const [
    invoice,
    setInvoice,
  ] =
    useState<InvoiceRow | null>(
      null
    );

  const [
    customer,
    setCustomer,
  ] =
    useState<CustomerRow | null>(
      null
    );

  const [
    items,
    setItems,
  ] =
    useState<InvoiceItem[]>(
      []
    );

  const [
    sheepDetails,
    setSheepDetails,
  ] =
    useState<SheepDetail[]>(
      []
    );

  const [
    payments,
    setPayments,
  ] =
    useState<PaymentRow[]>(
      []
    );

  const [
    accounts,
    setAccounts,
  ] =
    useState<AccountRow[]>(
      []
    );

  const [
    showPayment,
    setShowPayment,
  ] = useState(false);

  const [
    paymentAmount,
    setPaymentAmount,
  ] = useState("");

  const [
    paymentAccountId,
    setPaymentAccountId,
  ] = useState("");

  const [
    paymentDate,
    setPaymentDate,
  ] = useState(
    today()
  );

  const [
    paymentNotes,
    setPaymentNotes,
  ] = useState("");

  const [
    printTarget,
    setPrintTarget,
  ] =
    useState<PrintTarget>(
      null
    );

  // ==========================================================
  // LOAD INVOICE
  // ==========================================================

  const loadInvoice =
    useCallback(
      async (
        quiet = false
      ) => {
        try {
          if (
            !invoiceId
          ) {
            setError(
              "Invoice not found."
            );

            setLoading(
              false
            );

            return;
          }

          if (!quiet) {
            setLoading(
              true
            );
          }

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

          const {
            data:
              membership,
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
            !membership
          ) {
            throw new Error(
              "Unable to find your business access."
            );
          }

          const businessId =
            membership.business_id;

          const loadedRole =
            membership.role as
              | MemberRole
              | null;

          setMemberRole(
            loadedRole ??
              "staff"
          );

          const {
            data:
              invoiceData,
            error:
              invoiceError,
          } = await supabase
            .from(
              "invoices"
            )
            .select(
              `
              id,
              business_id,
              invoice_number,
              customer_id,
              invoice_date,
              due_date,
              subtotal,
              discount,
              total_amount,
              amount_paid,
              balance_due,
              status,
              notes,
              invoice_type,
              tobaski_season_id
            `
            )
            .eq(
              "id",
              invoiceId
            )
            .eq(
              "business_id",
              businessId
            )
            .maybeSingle();

          if (
            invoiceError
          ) {
            throw new Error(
              "Unable to load invoice."
            );
          }

          if (
            !invoiceData
          ) {
            setInvoice(
              null
            );

            setError(
              "Invoice not found."
            );

            setLoading(
              false
            );

            return;
          }

          const loadedInvoice:
            InvoiceRow = {
            id:
              invoiceData.id,

            business_id:
              invoiceData.business_id,

            invoice_number:
              invoiceData.invoice_number,

            customer_id:
              invoiceData.customer_id,

            invoice_date:
              invoiceData.invoice_date,

            due_date:
              invoiceData.due_date,

            subtotal:
              Number(
                invoiceData.subtotal ??
                  0
              ),

            discount:
              Number(
                invoiceData.discount ??
                  0
              ),

            total_amount:
              Number(
                invoiceData.total_amount ??
                  0
              ),

            amount_paid:
              Number(
                invoiceData.amount_paid ??
                  0
              ),

            balance_due:
              Number(
                invoiceData.balance_due ??
                  0
              ),

            status:
              invoiceData.status ??
              "unpaid",

            notes:
              invoiceData.notes,

            invoice_type:
              invoiceData.invoice_type ??
              "other",

            tobaski_season_id:
              invoiceData.tobaski_season_id,
          };

          const [
            itemResult,
            sheepResult,
            paymentResult,
            accountResult,
          ] =
            await Promise.all([
              supabase
                .from(
                  "invoice_items"
                )
                .select(
                  `
                  id,
                  description,
                  quantity,
                  unit,
                  unit_price,
                  line_total
                `
                )
                .eq(
                  "invoice_id",
                  invoiceId
                ),

              supabase
                .from(
                  "sheep_sale_details"
                )
                .select(
                  `
                  id,
                  sheep_name,
                  sheep_tag,
                  breed_type,
                  sex,
                  date_of_birth,
                  age_months_at_sale,
                  sale_category,
                  sale_price,
                  tobaski_stock_id
                `
                )
                .eq(
                  "invoice_id",
                  invoiceId
                ),

              supabase
                .from(
                  "payments"
                )
                .select(
                  `
                  id,
                  receipt_number,
                  payment_date,
                  amount,
                  payment_method,
                  account_id,
                  notes
                `
                )
                .eq(
                  "invoice_id",
                  invoiceId
                )
                .order(
                  "payment_date",
                  {
                    ascending:
                      false,
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
                  active
                `
                )
                .eq(
                  "business_id",
                  businessId
                )
                .order(
                  "name"
                ),
            ]);

          if (
            itemResult.error
          ) {
            throw new Error(
              itemResult.error.message
            );
          }

          if (
            sheepResult.error
          ) {
            throw new Error(
              sheepResult.error.message
            );
          }

          if (
            paymentResult.error
          ) {
            throw new Error(
              paymentResult.error.message
            );
          }

          if (
            accountResult.error
          ) {
            throw new Error(
              accountResult.error.message
            );
          }

          let loadedCustomer:
            CustomerRow | null =
            null;

          if (
            loadedInvoice.customer_id
          ) {
            const {
              data:
                customerData,
              error:
                customerError,
            } = await supabase
              .from(
                "contacts"
              )
              .select(
                `
                id,
                name,
                phone,
                location
              `
              )
              .eq(
                "id",
                loadedInvoice.customer_id
              )
              .eq(
                "business_id",
                businessId
              )
              .maybeSingle();

            if (
              customerError
            ) {
              throw new Error(
                customerError.message
              );
            }

            if (
              customerData
            ) {
              loadedCustomer =
                customerData as CustomerRow;
            }
          }

          const loadedItems =
            (
              itemResult.data ??
              []
            ).map(
              (row) => ({
                id:
                  row.id,

                description:
                  row.description ??
                  "",

                quantity:
                  Number(
                    row.quantity ??
                      0
                  ),

                unit:
                  row.unit,

                unit_price:
                  Number(
                    row.unit_price ??
                      0
                  ),

                line_total:
                  Number(
                    row.line_total ??
                      0
                  ),
              })
            );

          const loadedSheep =
            (
              sheepResult.data ??
              []
            ).map(
              (row) => ({
                id:
                  row.id,

                sheep_name:
                  row.sheep_name,

                sheep_tag:
                  row.sheep_tag,

                breed_type:
                  row.breed_type,

                sex:
                  row.sex,

                date_of_birth:
                  row.date_of_birth,

                age_months_at_sale:
                  row.age_months_at_sale ===
                  null
                    ? null
                    : Number(
                        row.age_months_at_sale
                      ),

                sale_category:
                  row.sale_category,

                sale_price:
                  Number(
                    row.sale_price ??
                      0
                  ),

                tobaski_stock_id:
                  row.tobaski_stock_id,
              })
            );

          const loadedPayments =
            (
              paymentResult.data ??
              []
            ).map(
              (row) => ({
                id:
                  row.id,

                receipt_number:
                  row.receipt_number,

                payment_date:
                  row.payment_date,

                amount:
                  Number(
                    row.amount ??
                      0
                  ),

                payment_method:
                  row.payment_method,

                account_id:
                  row.account_id,

                notes:
                  row.notes,
              })
            );

          const loadedAccounts =
            (
              accountResult.data ??
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
            );

          setInvoice(
            loadedInvoice
          );

          setCustomer(
            loadedCustomer
          );

          setItems(
            loadedItems
          );

          setSheepDetails(
            loadedSheep
          );

          setPayments(
            loadedPayments
          );

          setAccounts(
            loadedAccounts
          );

          setPaymentAccountId(
            (current) => {
              if (
                current
              ) {
                return current;
              }

              const defaultAccount =
                loadedAccounts.find(
                  (account) =>
                    account.name ===
                      "Cash on Hand" &&
                    account.active !==
                      false
                ) ??
                loadedAccounts.find(
                  (account) =>
                    account.active !==
                    false
                );

              return (
                defaultAccount?.id ??
                ""
              );
            }
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

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load invoice."
          );

          setLoading(
            false
          );
        }
      },
      [
        invoiceId,
        router,
      ]
    );

  useEffect(() => {
    loadInvoice();
  }, [
    loadInvoice,
  ]);

  // ==========================================================
  // URL NOTIFICATIONS
  // ==========================================================

  useEffect(() => {
    const query =
      new URLSearchParams(
        window.location.search
      );

    if (
      query.get(
        "saved"
      ) === "invoice"
    ) {
      setNotification(
        "Saved successfully"
      );
    }

    if (
      query.get(
        "updated"
      ) === "invoice"
    ) {
      setNotification(
        "Changes saved"
      );
    }

    if (
      query.get(
        "payment_error"
      ) === "1"
    ) {
      setError(
        "The invoice was saved, but the payment could not be recorded."
      );
    }

    if (
      query.toString()
    ) {
      window.history.replaceState(
        {},
        "",
        window.location.pathname
      );
    }
  }, []);

  // ==========================================================
  // AUTO CLOSE NOTIFICATION
  // ==========================================================

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

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    notification,
  ]);

  // ==========================================================
  // ACCOUNT MAP
  // ==========================================================

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
    }, [
      accounts,
    ]);

  // ==========================================================
  // RECORD PAYMENT
  // ==========================================================

  async function recordPayment(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      memberRole ===
      "viewer"
    ) {
      setError(
        "Viewer access is read-only."
      );

      return;
    }

    if (
      !invoice
    ) {
      return;
    }

    setError("");

    const amount =
      Number(
        paymentAmount
      );

    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      setError(
        "Please enter a valid payment amount."
      );

      return;
    }

    if (
      amount >
      invoice.balance_due
    ) {
      setError(
        `Payment cannot be greater than the outstanding balance of ${money(
          invoice.balance_due
        )}.`
      );

      return;
    }

    if (
      !paymentAccountId
    ) {
      setError(
        "Please select where the payment was received."
      );

      return;
    }

    if (
      !paymentDate
    ) {
      setError(
        "Please select the payment date."
      );

      return;
    }

    try {
      setPaymentSaving(
        true
      );

      const {
        error:
          paymentError,
      } = await supabase.rpc(
        "record_invoice_payment",
        {
          p_invoice_id:
            invoice.id,

          p_amount:
            amount,

          p_account_id:
            paymentAccountId,

          p_payment_date:
            paymentDate,

          p_notes:
            paymentNotes.trim() ||
            null,
        }
      );

      if (
        paymentError
      ) {
        throw new Error(
          paymentError.message
        );
      }

      setPaymentAmount(
        ""
      );

      setPaymentNotes(
        ""
      );

      setShowPayment(
        false
      );

      setNotification(
        "Saved successfully"
      );

      await loadInvoice(
        true
      );
    } catch (
      paymentError
    ) {
      console.error(
        paymentError
      );

      setError(
        paymentError instanceof
          Error
          ? paymentError.message
          : "Unable to record payment."
      );
    } finally {
      setPaymentSaving(
        false
      );
    }
  }

  // ==========================================================
  // PRINT
  // ==========================================================

  function printInvoice() {
    setPrintTarget({
      type: "invoice",
    });

    window.setTimeout(
      () => {
        window.print();
      },
      150
    );
  }

  function printReceipt(
    paymentId: string
  ) {
    setPrintTarget({
      type:
        "receipt",

      paymentId,
    });

    window.setTimeout(
      () => {
        window.print();
      },
      150
    );
  }

  useEffect(() => {
    function afterPrint() {
      setPrintTarget(
        null
      );
    }

    window.addEventListener(
      "afterprint",
      afterPrint
    );

    return () => {
      window.removeEventListener(
        "afterprint",
        afterPrint
      );
    };
  }, []);

  // ==========================================================
  // RECEIPT TO PRINT
  // ==========================================================

  const receiptToPrint =
    useMemo(() => {
      if (
        printTarget?.type !==
        "receipt"
      ) {
        return null;
      }

      return (
        payments.find(
          (payment) =>
            payment.id ===
            printTarget.paymentId
        ) ??
        null
      );
    }, [
      printTarget,
      payments,
    ]);

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

          <p className="mt-4 text-[15px] font-semibold text-slate-600">
            Loading invoice...
          </p>

        </div>

      </main>
    );
  }

  // ==========================================================
  // NOT FOUND
  // ==========================================================

  if (
    !invoice
  ) {
    return (
      <FinancePageShell
        eyebrow="Invoices & Receipts"
        title="Invoice Not Found"
        description="The requested invoice could not be found."
      >

        <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-sm">

          <FileText
            size={36}
            className="mx-auto text-[#0b5136]"
          />

          <p className="mt-4 text-[17px] font-bold text-slate-950">
            Invoice not found
          </p>

          <p className="mx-auto mt-2 max-w-[500px] text-[14px] leading-6 text-slate-600">
            This invoice does not exist or is no longer available.
          </p>

          <Link
            href="/invoices"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0b5136] px-5 py-3 text-[14px] font-bold text-white"
          >
            <ArrowLeft
              size={17}
            />

            Back to Invoices
          </Link>

        </div>

      </FinancePageShell>
    );
  }

  const status =
    normaliseStatus(
      invoice.status
    );

  const overdue =
    isInvoiceOverdue(
      invoice
    );

  const isViewer =
    memberRole ===
    "viewer";

  const canReceivePayment =
    !isViewer &&
    status !==
      "cancelled" &&
    invoice.balance_due >
      0;

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <FinancePageShell
      eyebrow="Invoices & Receipts"
      title="Invoice Details"
      description={
        isViewer
          ? "Review the invoice, payment history and available receipts."
          : "Review the invoice, record customer payments and issue receipts."
      }
      recordText={
        invoice.invoice_number
      }
    >

      <style jsx global>{`
        .print-document-root {
          display: none;
        }

        @media print {

          @page {
            size: A4 portrait;
            margin: 7mm;
          }

          html,
          body {
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /*
           * The printable document is now portaled
           * directly under BODY.
           *
           * The application itself is REMOVED from
           * print layout instead of merely being hidden.
           *
           * This eliminates blank pages.
           */
          body > *:not(.print-document-root) {
            display: none !important;
          }

          body > .print-document-root {
            display: block !important;
            position: static !important;
            inset: auto !important;
            width: auto !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          body > .print-document-root
          .invoice-print-document {
            display: block !important;
            position: relative !important;
            box-sizing: border-box !important;
            width: 190mm !important;
            max-width: 190mm !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 auto !important;
            padding: 0 !important;
            overflow: visible !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            page-break-before: auto !important;
            page-break-after: auto !important;
            break-before: auto !important;
            break-after: auto !important;
          }

          body > .print-document-root
          .invoice-body {
            padding: 5mm 6mm 0 !important;
          }

          body > .print-document-root
          .invoice-card {
            min-height: 31mm !important;
          }

          body > .print-document-root
          .invoice-note {
            min-height: 34mm !important;
          }

          body > .print-document-root
          .invoice-print-table {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          body > .print-document-root
          .invoice-print-table thead {
            display: table-header-group !important;
          }

          body > .print-document-root
          .invoice-print-table tbody tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          body > .print-document-root
          .invoice-no-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          body > .print-document-root
          .invoice-footer-wave {
            height: 10mm !important;
            margin-top: 2mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          body > .print-document-root,
          body > .print-document-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

        }

      `}</style>

      {notification && (
        <div className="fixed right-5 top-5 z-[100] w-[360px] max-w-[calc(100%-2rem)]">

          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">

              <CheckCircle2
                size={20}
              />

            </div>

            <p className="flex-1 text-[14px] font-bold text-emerald-900">
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
                size={17}
              />
            </button>

          </div>

        </div>
      )}

      {error && (
        <div className="mb-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-[14px] font-semibold text-red-800">
          {error}
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <Link
          href="/invoices"
          className="inline-flex items-center gap-2 text-[14px] font-bold text-[#0b5136] hover:underline"
        >
          <ArrowLeft
            size={17}
          />

          Back to Invoices
        </Link>

        <div className="flex flex-wrap gap-2">

          <button
            type="button"
            onClick={
              printInvoice
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-[13px] font-bold text-slate-700 hover:bg-slate-50"
          >
            <Printer
              size={16}
            />

            Print / Save PDF
          </button>

          {canReceivePayment && (
            <button
              type="button"
              onClick={() => {
                setPaymentAmount(
                  ""
                );

                setPaymentNotes(
                  ""
                );

                setShowPayment(
                  true
                );
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0b5136] px-5 py-3 text-[13px] font-bold text-white hover:bg-[#083c29]"
            >
              <Wallet
                size={16}
              />

              Record Payment
            </button>
          )}

        </div>

      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <SummaryCard
          title="Invoice Total"
          value={
            money(
              invoice.total_amount
            )
          }
          icon={
            <FileText
              size={21}
            />
          }
          featured
        />

        <SummaryCard
          title="Amount Paid"
          value={
            money(
              invoice.amount_paid
            )
          }
          icon={
            <Banknote
              size={21}
            />
          }
        />

        <SummaryCard
          title="Balance Due"
          value={
            money(
              invoice.balance_due
            )
          }
          icon={
            <Wallet
              size={21}
            />
          }
          warning={
            invoice.balance_due >
            0
          }
        />

        <SummaryCard
          title="Status"
          value={
            overdue
              ? "Overdue"
              : status ===
                  "paid"
              ? "Paid"
              : status ===
                  "part_paid"
              ? "Part Paid"
              : status ===
                  "cancelled"
              ? "Cancelled"
              : "Unpaid"
          }
          icon={
            overdue ? (
              <Clock3
                size={21}
              />
            ) : (
              <CheckCircle2
                size={21}
              />
            )
          }
          warning={
            overdue
          }
        />

      </div>

      <section className="mt-5 overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-sm">

        <div className="border-b border-slate-200 p-5 sm:p-7">

          <DocumentHeader
            title="INVOICE"
            number={
              invoice.invoice_number
            }
          />

          <div className="mt-7 grid gap-6 md:grid-cols-2">

            <div>

              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Bill To
              </p>

              <p className="mt-2 text-[18px] font-black text-slate-950">
                {customer?.name ??
                  "Customer"}
              </p>

              {customer?.phone && (
                <p className="mt-1 text-[14px] font-medium text-slate-600">
                  {
                    customer.phone
                  }
                </p>
              )}

              {customer?.location && (
                <p className="mt-1 text-[14px] text-slate-600">
                  {
                    customer.location
                  }
                </p>
              )}

            </div>

            <div className="grid grid-cols-2 gap-4 md:text-right">

              <DocumentInfo
                label="Invoice Date"
                value={formatDate(
                  invoice.invoice_date
                )}
              />

              <DocumentInfo
                label="Due Date"
                value={formatDate(
                  invoice.due_date
                )}
              />

              <DocumentInfo
                label="Invoice Type"
                value={invoiceTypeLabel(
                  invoice.invoice_type
                )}
              />

              <DocumentInfo
                label="Status"
                value={
                  overdue
                    ? "Overdue"
                    : status ===
                        "part_paid"
                    ? "Part Paid"
                    : status ===
                        "paid"
                    ? "Paid"
                    : status ===
                        "cancelled"
                    ? "Cancelled"
                    : "Unpaid"
                }
              />

            </div>

          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[760px] text-left">

            <thead>

              <tr className="border-b border-slate-200 bg-[#f4f7f5] text-[11px] font-bold uppercase tracking-[0.05em] text-slate-600">

                <th className="px-6 py-4">
                  Description
                </th>

                <th className="px-6 py-4 text-right">
                  Quantity
                </th>

                <th className="px-6 py-4">
                  Unit
                </th>

                <th className="px-6 py-4 text-right">
                  Unit Price
                </th>

                <th className="px-6 py-4 text-right">
                  Amount
                </th>

              </tr>

            </thead>

            <tbody>

              {items.length >
              0 ? (
                items.map(
                  (item) => (
                    <tr
                      key={
                        item.id
                      }
                      className="border-b border-slate-100 last:border-none"
                    >

                      <td className="px-6 py-4 text-[14px] font-bold text-slate-950">
                        {
                          item.description
                        }
                      </td>

                      <td className="px-6 py-4 text-right text-[14px] font-semibold text-slate-700">
                        {
                          item.quantity
                        }
                      </td>

                      <td className="px-6 py-4 text-[14px] font-semibold text-slate-700">
                        {item.unit ||
                          "—"}
                      </td>

                      <td className="px-6 py-4 text-right text-[14px] font-semibold text-slate-700">
                        {money(
                          item.unit_price
                        )}
                      </td>

                      <td className="px-6 py-4 text-right text-[14px] font-black text-slate-950">
                        {money(
                          item.line_total
                        )}
                      </td>

                    </tr>
                  )
                )
              ) : (
                <tr>

                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-[14px] font-semibold text-slate-500"
                  >
                    No invoice items found.
                  </td>

                </tr>
              )}

            </tbody>

          </table>

        </div>

        {invoice.invoice_type ===
          "sheep_sale" &&
          sheepDetails.length >
            0 && (
            <div className="border-t border-slate-200 p-5 sm:p-6">

              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                Sheep Details
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">

                {sheepDetails.map(
                  (
                    sheep,
                    index
                  ) => (
                    <div
                      key={
                        sheep.id
                      }
                      className="rounded-2xl border border-slate-200 bg-[#f8faf9] p-4"
                    >

                      <p className="text-[14px] font-black text-slate-950">
                        Sheep{" "}
                        {index +
                          1}
                        {sheep.sheep_name
                          ? ` · ${sheep.sheep_name}`
                          : ""}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">

                        <MiniInfo
                          label="Tag"
                          value={
                            sheep.sheep_tag ||
                            "—"
                          }
                        />

                        <MiniInfo
                          label="Breed"
                          value={
                            sheep.breed_type ||
                            "—"
                          }
                        />

                        <MiniInfo
                          label="Sex"
                          value={
                            sheep.sex
                              ? sheep.sex
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase() +
                                sheep.sex.slice(
                                  1
                                )
                              : "—"
                          }
                        />

                        <MiniInfo
                          label="Category"
                          value={
                            sheep.sale_category ||
                            "—"
                          }
                        />

                        <MiniInfo
                          label="Age at Sale"
                          value={
                            sheep.age_months_at_sale ===
                            null
                              ? "—"
                              : `${sheep.age_months_at_sale} months`
                          }
                        />

                        <MiniInfo
                          label="Sale Price"
                          value={
                            money(
                              sheep.sale_price
                            )
                          }
                        />

                      </div>

                    </div>
                  )
                )}

              </div>

            </div>
          )}

        <div className="grid gap-6 border-t border-slate-200 p-5 sm:p-7 md:grid-cols-[1fr_360px]">

          <div>

            {invoice.notes ? (
              <>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Note
                </p>

                <p className="mt-2 max-w-[650px] text-[14px] leading-6 text-slate-700">
                  {
                    invoice.notes
                  }
                </p>
              </>
            ) : (
              <p className="text-[13px] text-slate-500">
                No invoice note.
              </p>
            )}

          </div>

          <div className="rounded-2xl bg-[#f4f7f5] p-5">

            <TotalRow
              label="Subtotal"
              value={
                money(
                  invoice.subtotal
                )
              }
            />

            <TotalRow
              label="Discount"
              value={
                money(
                  invoice.discount
                )
              }
            />

            <div className="my-4 border-t border-slate-300" />

            <TotalRow
              label="Total"
              value={
                money(
                  invoice.total_amount
                )
              }
              strong
            />

            <TotalRow
              label="Paid"
              value={
                money(
                  invoice.amount_paid
                )
              }
            />

            <TotalRow
              label="Balance"
              value={
                money(
                  invoice.balance_due
                )
              }
              strong
            />

          </div>

        </div>

      </section>

      <section className="mt-5 overflow-hidden rounded-[24px] border border-white/90 bg-white shadow-sm">

        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">

          <div>

            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              Payment History
            </p>

            <h2 className="mt-1 text-[21px] font-black text-slate-950">
              Receipts
            </h2>

            <p className="mt-1 text-[14px] text-slate-600">
              Every recorded payment creates a receipt automatically.
            </p>

          </div>

          {canReceivePayment && (
            <button
              type="button"
              onClick={() =>
                setShowPayment(
                  true
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b5136] px-4 py-3 text-[13px] font-bold text-white"
            >
              <Wallet
                size={16}
              />

              Record Payment
            </button>
          )}

        </div>

        {payments.length >
        0 ? (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[850px] text-left">

              <thead>

                <tr className="border-b border-slate-200 bg-[#f4f7f5] text-[11px] font-bold uppercase tracking-wide text-slate-600">

                  <th className="px-6 py-4">
                    Receipt
                  </th>

                  <th className="px-6 py-4">
                    Date
                  </th>

                  <th className="px-6 py-4">
                    Received Into
                  </th>

                  <th className="px-6 py-4 text-right">
                    Amount
                  </th>

                  <th className="px-6 py-4 text-right">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {payments.map(
                  (
                    payment
                  ) => (
                    <tr
                      key={
                        payment.id
                      }
                      className="border-b border-slate-100 last:border-none hover:bg-emerald-50/40"
                    >

                      <td className="px-6 py-4 text-[13px] font-black text-[#0b5136]">
                        {
                          payment.receipt_number
                        }
                      </td>

                      <td className="px-6 py-4 text-[13px] font-semibold text-slate-700">
                        {formatDate(
                          payment.payment_date
                        )}
                      </td>

                      <td className="px-6 py-4 text-[13px] font-semibold text-slate-700">
                        {payment.account_id
                          ? accountMap.get(
                              payment.account_id
                            ) ??
                            payment.payment_method ??
                            "—"
                          : payment.payment_method ??
                            "—"}
                      </td>

                      <td className="px-6 py-4 text-right text-[14px] font-black text-emerald-700">
                        {money(
                          payment.amount
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">

                        <button
                          type="button"
                          onClick={() =>
                            printReceipt(
                              payment.id
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-[#0b5136]"
                        >
                          <Printer
                            size={14}
                          />

                          Print Receipt
                        </button>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        ) : (
          <div className="px-6 py-12 text-center">

            <ReceiptText
              size={34}
              className="mx-auto text-emerald-700"
            />

            <p className="mt-4 text-[16px] font-bold text-slate-950">
              No payments recorded yet
            </p>

            <p className="mx-auto mt-2 max-w-[500px] text-[14px] leading-6 text-slate-600">
              The first receipt will appear here when a customer payment is recorded.
            </p>

          </div>
        )}

      </section>

      {showPayment && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">

          <div className="w-full max-w-[560px] overflow-hidden rounded-[26px] bg-white shadow-2xl">

            <div className="flex items-start justify-between border-b border-slate-200 p-5 sm:p-6">

              <div>

                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                  Customer Payment
                </p>

                <h2 className="mt-1 text-[23px] font-black text-slate-950">
                  Record Payment
                </h2>

                <p className="mt-1 text-[14px] text-slate-600">
                  Outstanding:{" "}
                  <span className="font-bold text-slate-950">
                    {money(
                      invoice.balance_due
                    )}
                  </span>
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowPayment(
                    false
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                aria-label="Close payment"
              >
                <X
                  size={18}
                />
              </button>

            </div>

            <form
              onSubmit={
                recordPayment
              }
              className="p-5 sm:p-6"
            >

              <div>

                <label className="mb-2 block text-[13px] font-bold text-slate-700">
                  Amount Received
                </label>

                <div className="relative">

                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-slate-500">
                    GMD
                  </span>

                  <input
                    type="number"
                    min="0.01"
                    max={
                      invoice.balance_due
                    }
                    step="0.01"
                    value={
                      paymentAmount
                    }
                    onChange={(
                      event
                    ) =>
                      setPaymentAmount(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-14 pr-4 text-[15px] font-bold text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                    placeholder="0"
                  />

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPaymentAmount(
                      String(
                        invoice.balance_due
                      )
                    )
                  }
                  className="mt-2 text-[12px] font-bold text-[#0b5136] hover:underline"
                >
                  Use full outstanding balance
                </button>

              </div>

              <div className="mt-4">

                <label className="mb-2 block text-[13px] font-bold text-slate-700">
                  Received Into
                </label>

                <select
                  value={
                    paymentAccountId
                  }
                  onChange={(
                    event
                  ) =>
                    setPaymentAccountId(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[14px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                >

                  <option value="">
                    Select account
                  </option>

                  {accounts
                    .filter(
                      (account) =>
                        account.active !==
                        false
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

              <div className="mt-4">

                <label className="mb-2 block text-[13px] font-bold text-slate-700">
                  Payment Date
                </label>

                <input
                  type="date"
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[14px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                />

              </div>

              <div className="mt-4">

                <label className="mb-2 block text-[13px] font-bold text-slate-700">
                  Payment Note
                </label>

                <textarea
                  rows={3}
                  value={
                    paymentNotes
                  }
                  onChange={(
                    event
                  ) =>
                    setPaymentNotes(
                      event.target.value
                    )
                  }
                  placeholder="Optional"
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[14px] font-medium text-slate-800 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                />

              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={() =>
                    setShowPayment(
                      false
                    )
                  }
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-[14px] font-bold text-slate-700"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    paymentSaving
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b5136] px-5 py-3 text-[14px] font-bold text-white disabled:opacity-60"
                >

                  {paymentSaving ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2
                        size={17}
                      />

                      Save Payment
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {
        typeof document !== "undefined" &&
        createPortal(
          <div className="print-document-root">

        {printTarget?.type ===
          "invoice" && (
          <PrintableInvoice
            invoice={
              invoice
            }
            customer={
              customer
            }
            items={
              items
            }
          />
        )}

        {printTarget?.type ===
          "receipt" &&
          receiptToPrint && (
            <PrintableReceipt
              invoice={
                invoice
              }
              customer={
                customer
              }
              payment={
                receiptToPrint
              }
              accountName={
                receiptToPrint.account_id
                  ? accountMap.get(
                      receiptToPrint.account_id
                    ) ??
                    receiptToPrint.payment_method ??
                    "—"
                  : receiptToPrint.payment_method ??
                    "—"
              }
            />
          )}


          </div>,
          document.body
        )
      }


    </FinancePageShell>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  featured = false,
  warning = false,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  featured?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-[22px] border p-5 shadow-sm ${
        featured
          ? "border-[#0b5136] bg-[#0b5136] text-white"
          : warning
          ? "border-amber-200 bg-white"
          : "border-white bg-white"
      }`}
    >

      <div className="flex items-start justify-between gap-4">

        <div>

          <p
            className={`text-[12px] font-bold ${
              featured
                ? "text-emerald-100"
                : "text-slate-600"
            }`}
          >
            {title}
          </p>

          <p
            className={`mt-3 text-[24px] font-black ${
              featured
                ? "text-white"
                : warning
                ? "text-amber-800"
                : "text-slate-950"
            }`}
          >
            {value}
          </p>

        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            featured
              ? "bg-white/15 text-white"
              : warning
              ? "bg-amber-100 text-amber-800"
              : "bg-emerald-100 text-[#0b5136]"
          }`}
        >
          {icon}
        </div>

      </div>

    </div>
  );
}

function DocumentHeader({
  title,
  number,
}: {
  title: string;
  number: string;
}) {
  return (
    <DocumentLetterhead
      documentTitle={title}
      documentNumber={number}
    />
  );
}

function DocumentInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-[14px] font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-[10px] font-bold uppercase text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}

function TotalRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-1.5">

      <span
        className={`text-[13px] ${
          strong
            ? "font-black text-slate-950"
            : "font-semibold text-slate-600"
        }`}
      >
        {label}
      </span>

      <span
        className={`text-[14px] ${
          strong
            ? "font-black text-[#0b5136]"
            : "font-bold text-slate-900"
        }`}
      >
        {value}
      </span>

    </div>
  );
}


function PrintableInvoice({
  invoice,
  customer,
  items,
}: {
  invoice: InvoiceRow;
  customer: CustomerRow | null;
  items: InvoiceItem[];
}) {
  const statusText =
    invoice.status === "part_paid"
      ? "PART PAID"
      : invoice.status.toUpperCase();

  const typeLabel =
    invoice.invoice_type === "sheep_sale"
      ? "Sheep Sale"
      : invoice.invoice_type === "product_sale"
        ? "Farm Product Sale"
        : invoice.invoice_type === "service"
          ? "Consultancy / Service"
          : "Other";

  function cleanDescription(description: string) {
    const match = description.match(
      /^(.*?)\s*-\s*Tag\s+(.+)$/i
    );

    if (match) {
      return {
        title: match[1].trim(),
        meta: "Tag: " + match[2].trim(),
      };
    }

    return {
      title: description,
      meta: "",
    };
  }

  return (
    <>
      <style>{`
        .invoice-print-document {
          position: relative;
          box-sizing: border-box;
          width: min(190mm, 100%);
          min-height: 274mm;
          margin: 0 auto;
          overflow: hidden;
          background: #ffffff;
          color: #182333;
          font-family: Arial, Helvetica, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .invoice-watermark {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image: url('/djallows-logo.png');
          background-repeat: no-repeat;
          background-position: center 47%;
          background-size: 105mm;
          opacity: 0.028;
        }

        .invoice-body {
          position: relative;
          z-index: 2;
          box-sizing: border-box;
          display: flex;
          min-height: 274mm;
          flex-direction: column;
          padding: 9mm 10mm 7mm;
        }

        .pro-invoice-divider {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3mm;
          margin-top: 5mm;
        }

        .pro-invoice-divider span {
          height: 1.2mm;
          border-radius: 999px;
        }

        .pro-invoice-divider .blue {
          background: #17488f;
        }

        .pro-invoice-divider .green {
          background: #2d9b45;
        }

        .pro-invoice-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5mm;
          margin-top: 6mm;
        }

        .pro-invoice-panel {
          min-height: 34mm;
          padding: 4.5mm 5mm;
          border: 1px solid #cbd6e4;
          border-top: 1.2mm solid #17488f;
          border-radius: 2.5mm;
          background: rgba(255, 255, 255, 0.97);
        }

        .pro-invoice-label {
          margin: 0;
          color: #17488f;
          font-size: 7.5pt;
          font-weight: 900;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .pro-invoice-customer {
          margin: 3.5mm 0 0;
          color: #16243a;
          font-size: 12pt;
          font-weight: 900;
        }

        .pro-invoice-meta {
          display: grid;
          gap: 1.5mm;
          margin-top: 3mm;
          color: #556274;
          font-size: 8.3pt;
        }

        .pro-invoice-facts {
          display: grid;
          margin: 2.5mm 0 0;
          font-size: 8.2pt;
        }

        .pro-invoice-facts div {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 4mm;
          padding: 1.7mm 0;
          border-bottom: 1px dotted #d4dde8;
        }

        .pro-invoice-facts div:last-child {
          border-bottom: none;
        }

        .pro-invoice-facts span {
          color: #667386;
        }

        .pro-invoice-facts strong {
          text-align: right;
        }

        .pro-status {
          display: inline-block;
          padding: 1mm 2mm;
          border-radius: 999px;
          background: #eef4fb;
          color: #17488f;
          font-size: 7pt;
          font-weight: 900;
          letter-spacing: 0.4px;
        }

        .pro-invoice-table-wrap {
          margin-top: 6mm;
        }

        .pro-invoice-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          overflow: hidden;
          border: 1px solid #cbd6e4;
          border-radius: 2.5mm;
          table-layout: fixed;
          font-size: 8.3pt;
        }

        .pro-invoice-table thead {
          background: #17488f;
          color: #ffffff;
        }

        .pro-invoice-table th {
          padding: 3mm 2.6mm;
          border-right: 1px solid rgba(255, 255, 255, 0.2);
          text-align: left;
          font-weight: 800;
        }

        .pro-invoice-table th:last-child,
        .pro-invoice-table td:last-child {
          border-right: none;
        }

        .pro-invoice-table td {
          padding: 3.2mm 2.6mm;
          border-top: 1px solid #dbe3ed;
          border-right: 1px solid #dbe3ed;
          background: rgba(255, 255, 255, 0.97);
          vertical-align: top;
        }

        .pro-desc {
          width: 42%;
        }

        .pro-qty {
          width: 9%;
          text-align: center !important;
        }

        .pro-unit {
          width: 12%;
          text-align: center !important;
        }

        .pro-price {
          width: 17%;
          text-align: right !important;
        }

        .pro-amount {
          width: 20%;
          text-align: right !important;
        }

        .pro-line-title {
          color: #1f2e44;
          font-weight: 800;
          line-height: 1.35;
        }

        .pro-line-meta {
          margin-top: 1mm;
          color: #64748b;
          font-size: 7.5pt;
        }

        .pro-center {
          text-align: center;
        }

        .pro-right {
          text-align: right;
          white-space: nowrap;
        }

        .pro-invoice-summary {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 5mm;
          margin-top: 7mm;
          align-items: stretch;
        }

        .pro-invoice-note {
          padding: 5mm;
          border: 1px solid #b7d7bd;
          border-left: 1.4mm solid #2d9b45;
          border-radius: 2.5mm;
          background: #fbfefb;
        }

        .pro-invoice-note h3 {
          margin: 0;
          color: #2d8740;
          font-size: 7.5pt;
          font-weight: 900;
          letter-spacing: 0.8px;
        }

        .pro-invoice-note p {
          margin: 3mm 0 0;
          color: #556274;
          font-size: 8.3pt;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .pro-invoice-totals {
          overflow: hidden;
          border: 1px solid #cbd6e4;
          border-radius: 2.5mm;
          background: #ffffff;
        }

        .pro-total-lines {
          padding: 4mm 5mm;
          font-size: 8.5pt;
        }

        .pro-total-lines > div {
          display: flex;
          justify-content: space-between;
          gap: 4mm;
          padding: 1.9mm 0;
          border-bottom: 1px dotted #d5dee9;
        }

        .pro-total-lines .grand-total {
          margin-top: 0.8mm;
          padding-top: 2.6mm;
          color: #17488f;
          font-size: 10pt;
          font-weight: 900;
          border-bottom: 1px solid #aac0dc;
        }

        .pro-balance {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 3.5mm 5mm;
          background: #17488f;
          color: #ffffff;
          font-size: 9.5pt;
          font-weight: 900;
        }

        .pro-invoice-closing {
          margin-top: auto;
          padding-top: 12mm;
        }

        .pro-invoice-footer {
          margin-top: 9mm;
        }

        @media print {
          body > .print-document-root .invoice-print-document {
            width: 190mm !important;
            max-width: 190mm !important;
            min-height: 274mm !important;
            margin: 0 auto !important;
            overflow: visible !important;
            border: 0 !important;
            box-shadow: none !important;
          }

          body > .print-document-root .invoice-body {
            min-height: 274mm !important;
            padding: 5mm 6mm 4mm !important;
          }

          body > .print-document-root .pro-invoice-info,
          body > .print-document-root .pro-invoice-summary,
          body > .print-document-root .document-signatures,
          body > .print-document-root .document-footer {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          body > .print-document-root .pro-invoice-table thead {
            display: table-header-group !important;
          }

          body > .print-document-root .pro-invoice-table tbody tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <article className="invoice-print-document">
        <div className="invoice-watermark" aria-hidden="true" />

        <div className="invoice-body">
          <DocumentLetterhead
            documentTitle="INVOICE"
            documentNumber={invoice.invoice_number}
            documentDate={formatDate(invoice.invoice_date)}
          />

          <div className="pro-invoice-divider" aria-hidden="true">
            <span className="blue" />
            <span className="green" />
          </div>

          <section className="pro-invoice-info">
            <div className="pro-invoice-panel">
              <p className="pro-invoice-label">Bill To</p>

              <p className="pro-invoice-customer">
                {customer?.name ?? "Customer"}
              </p>

              <div className="pro-invoice-meta">
                {customer?.phone && <span>{customer.phone}</span>}
                {customer?.location && <span>{customer.location}</span>}
              </div>
            </div>

            <div className="pro-invoice-panel">
              <p className="pro-invoice-label">Invoice Details</p>

              <div className="pro-invoice-facts">
                <div>
                  <span>Invoice Date</span>
                  <strong>{formatDate(invoice.invoice_date)}</strong>
                </div>

                <div>
                  <span>Due Date</span>
                  <strong>
                    {invoice.due_date
                      ? formatDate(invoice.due_date)
                      : "-"}
                  </strong>
                </div>

                <div>
                  <span>Invoice Type</span>
                  <strong>{typeLabel}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong className="pro-status">{statusText}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="pro-invoice-table-wrap">
            <table className="pro-invoice-table">
              <thead>
                <tr>
                  <th className="pro-desc">Description</th>
                  <th className="pro-qty">Qty</th>
                  <th className="pro-unit">Unit</th>
                  <th className="pro-price">Unit Price</th>
                  <th className="pro-amount">Amount</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => {
                  const clean = cleanDescription(item.description);

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="pro-line-title">{clean.title}</div>
                        {clean.meta && (
                          <div className="pro-line-meta">{clean.meta}</div>
                        )}
                      </td>

                      <td className="pro-center">{item.quantity}</td>
                      <td className="pro-center">{item.unit ?? "Item"}</td>
                      <td className="pro-right">{money(item.unit_price)}</td>
                      <td className="pro-right">
                        <strong>{money(item.line_total)}</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="pro-invoice-summary">
            <div className="pro-invoice-note">
              <h3>NOTE</h3>
              <p>{invoice.notes || "No additional note."}</p>
            </div>

            <div className="pro-invoice-totals">
              <div className="pro-total-lines">
                <div>
                  <span>Subtotal</span>
                  <strong>{money(invoice.subtotal)}</strong>
                </div>

                <div>
                  <span>Discount</span>
                  <strong>{money(invoice.discount)}</strong>
                </div>

                <div className="grand-total">
                  <span>Total</span>
                  <strong>{money(invoice.total_amount)}</strong>
                </div>

                <div>
                  <span>Amount Paid</span>
                  <strong>{money(invoice.amount_paid)}</strong>
                </div>
              </div>

              <div className="pro-balance">
                <span>Balance Due</span>
                <strong>{money(invoice.balance_due)}</strong>
              </div>
            </div>
          </section>

          <div className="pro-invoice-closing">
            <DocumentSignatureBlock />
            <DocumentFooter className="pro-invoice-footer" />
          </div>
        </div>
      </article>
    </>
  );
}

function PrintableReceipt({
  invoice,
  customer,
  payment,
  accountName,
}: {
  invoice: InvoiceRow;
  customer: CustomerRow | null;
  payment: PaymentRow;
  accountName: string;
}) {
  return (
    <>
      <style>{`
        .payment-receipt-document {
          position: relative;
          box-sizing: border-box;
          display: flex;
          width: min(190mm, 100%);
          min-height: 274mm;
          margin: 0 auto;
          flex-direction: column;
          overflow: hidden;
          background: #ffffff;
          color: #182333;
          font-family: Arial, Helvetica, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .payment-receipt-watermark {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image: url('/djallows-logo.png');
          background-repeat: no-repeat;
          background-position: center 48%;
          background-size: 105mm;
          opacity: 0.028;
        }

        .payment-receipt-sheet {
          position: relative;
          z-index: 2;
          box-sizing: border-box;
          display: flex;
          min-height: 274mm;
          flex-direction: column;
          padding: 9mm 10mm 7mm;
        }

        .payment-receipt-divider {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3mm;
          margin-top: 5mm;
        }

        .payment-receipt-divider span {
          height: 1.2mm;
          border-radius: 999px;
        }

        .payment-receipt-divider .blue {
          background: #17488f;
        }

        .payment-receipt-divider .green {
          background: #2d9b45;
        }

        .payment-receipt-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5mm;
          margin-top: 7mm;
        }

        .payment-receipt-panel {
          padding: 5mm;
          border: 1px solid #cbd6e4;
          border-top: 1.2mm solid #17488f;
          border-radius: 2.5mm;
          background: rgba(255, 255, 255, 0.97);
        }

        .payment-receipt-label {
          margin: 0;
          color: #17488f;
          font-size: 7.5pt;
          font-weight: 900;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .payment-receipt-name {
          margin: 3.5mm 0 0;
          font-size: 12pt;
          font-weight: 900;
        }

        .payment-receipt-facts {
          display: grid;
          margin: 2.5mm 0 0;
          font-size: 8.3pt;
        }

        .payment-receipt-facts div {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 4mm;
          padding: 2mm 0;
          border-bottom: 1px dotted #d5dee9;
        }

        .payment-receipt-facts div:last-child {
          border-bottom: none;
        }

        .payment-receipt-facts span {
          color: #667386;
        }

        .payment-receipt-facts strong {
          text-align: right;
        }

        .payment-receipt-amount {
          margin-top: 8mm;
          padding: 8mm;
          border: 1px solid #b7d7bd;
          border-left: 1.6mm solid #2d9b45;
          border-radius: 2.5mm;
          background: #fbfefb;
          text-align: center;
        }

        .payment-receipt-amount span {
          color: #2d7f40;
          font-size: 8pt;
          font-weight: 900;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .payment-receipt-amount strong {
          display: block;
          margin-top: 3mm;
          color: #1c7a39;
          font-size: 28pt;
          font-weight: 900;
        }

        .payment-receipt-note {
          margin-top: 6mm;
          padding: 4mm 5mm;
          border-left: 1mm solid #17488f;
          background: #f8fafc;
          color: #556274;
          font-size: 8.5pt;
          line-height: 1.5;
        }

        .payment-receipt-closing {
          margin-top: auto;
          padding-top: 14mm;
        }

        .payment-receipt-footer {
          margin-top: 9mm;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          body > .print-document-root .payment-receipt-document {
            width: 190mm !important;
            max-width: 190mm !important;
            min-height: 274mm !important;
            margin: 0 auto !important;
            overflow: hidden !important;
          }

          body > .print-document-root .payment-receipt-sheet {
            min-height: 274mm !important;
            padding: 5mm 6mm 4mm !important;
          }

          body > .print-document-root .payment-receipt-grid,
          body > .print-document-root .document-signatures,
          body > .print-document-root .document-footer {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <article className="payment-receipt-document">
        <div className="payment-receipt-watermark" aria-hidden="true" />

        <div className="payment-receipt-sheet">
          <DocumentLetterhead
            documentTitle="RECEIPT"
            documentNumber={payment.receipt_number}
            documentDate={formatDate(payment.payment_date)}
          />

          <div className="payment-receipt-divider" aria-hidden="true">
            <span className="blue" />
            <span className="green" />
          </div>

          <section className="payment-receipt-grid">
            <div className="payment-receipt-panel">
              <p className="payment-receipt-label">Received From</p>
              <p className="payment-receipt-name">
                {customer?.name ?? "Customer"}
              </p>
            </div>

            <div className="payment-receipt-panel">
              <p className="payment-receipt-label">Receipt Details</p>

              <div className="payment-receipt-facts">
                <div>
                  <span>Receipt Date</span>
                  <strong>{formatDate(payment.payment_date)}</strong>
                </div>

                <div>
                  <span>Invoice Ref</span>
                  <strong>{invoice.invoice_number}</strong>
                </div>

                <div>
                  <span>Received Into</span>
                  <strong>{accountName}</strong>
                </div>

                <div>
                  <span>Invoice Balance</span>
                  <strong>{money(invoice.balance_due)}</strong>
                </div>
              </div>
            </div>
          </section>

          <div className="payment-receipt-amount">
            <span>Amount Received</span>
            <strong>{money(payment.amount)}</strong>
          </div>

          {payment.notes && (
            <div className="payment-receipt-note">
              <strong>Note: </strong>
              {payment.notes}
            </div>
          )}

          <div className="payment-receipt-closing">
            <DocumentSignatureBlock />
            <DocumentFooter className="payment-receipt-footer" />
          </div>
        </div>
      </article>
    </>
  );
}

