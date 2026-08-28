"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
  CheckCircle2,
  Eye,
  FilePenLine,
  Loader2,
  ReceiptText,
  Trash2,
  X,
} from "lucide-react";

import FinancePageShell from "@/components/FinancePageShell";

import {
  supabase,
} from "@/lib/supabase";


type InvoiceData = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  invoice_date: string;
  total_amount: number;
  status: string;
  invoice_type: string | null;
  document_kind:
    | "invoice"
    | "direct_receipt";
};


type PaymentData = {
  id: string;
  receipt_number: string;
  payment_date: string;
  amount: number;
  invoice_id: string | null;
  customer_id: string | null;
  voided_at: string | null;
  void_reason: string | null;
};


type ContactData = {
  id: string;
  name: string;
};


type RegisterRow = {
  id: string;

  kind:
    | "invoice"
    | "receipt";

  documentNumber: string;

  customer: string;

  type: string;

  date: string;

  amount: number;

  status: string;

  invoiceId: string | null;

  canDelete: boolean;

  voidReason:
    | string
    | null;
};


type FilterType =
  | "all"
  | "receipts"
  | "invoices";


function money(
  amount: number
) {

  return (
    "GMD " +
    Number(
      amount || 0
    ).toLocaleString(
      "en-US",
      {
        minimumFractionDigits:
          0,

        maximumFractionDigits:
          2,
      }
    )
  );
}


function formatDate(
  value: string
) {

  if (
    !value
  ) {

    return "";
  }


  const clean =
    value.slice(
      0,
      10
    );


  const date =
    new Date(
      clean +
      "T12:00:00"
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
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  ).format(
    date
  );
}


function typeLabel(
  value:
    string |
    null
) {

  if (
    value ===
    "sheep_sale"
  ) {

    return "Sheep Sale";
  }


  if (
    value ===
    "product_sale"
  ) {

    return "Farm Product Sale";
  }


  if (
    value ===
    "service"
  ) {

    return "Consultancy / Service";
  }


  return "Other";
}


function statusClass(
  status: string
) {

  const clean =
    status.toLowerCase();


  if (
    clean ===
    "void" ||
    clean ===
    "cancelled"
  ) {

    return "border-red-200 bg-red-50 text-red-700";
  }


  if (
    clean ===
    "received" ||
    clean ===
    "paid"
  ) {

    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }


  if (
    clean ===
    "part_paid"
  ) {

    return "border-amber-200 bg-amber-50 text-amber-700";
  }


  return "border-red-200 bg-red-50 text-red-700";
}


function statusLabel(
  status: string
) {

  if (
    status ===
    "part_paid"
  ) {

    return "PART PAID";
  }


  return status
    .replace(
      /_/g,
      " "
    )
    .toUpperCase();
}


export default function InvoicesPage() {

  const router =
    useRouter();


  const [
    rows,
    setRows,
  ] =
    useState<
      RegisterRow[]
    >(
      []
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    error,
    setError,
  ] =
    useState(
      ""
    );


  const [
    filter,
    setFilter,
  ] =
    useState<
      FilterType
    >(
      "all"
    );


  const [
    selectedIds,
    setSelectedIds,
  ] =
    useState<
      string[]
    >(
      []
    );


  const [
    toast,
    setToast,
  ] =
    useState(
      ""
    );


  const [
    voidTarget,
    setVoidTarget,
  ] =
    useState<
      RegisterRow |
      null
    >(
      null
    );


  const [
    voidReason,
    setVoidReason,
  ] =
    useState(
      ""
    );


  const [
    voiding,
    setVoiding,
  ] =
    useState(
      false
    );


  const showToast =
    useCallback(
      (
        message:
          string
      ) => {

        setToast(
          message
        );


        window.setTimeout(
          () => {

            setToast(
              ""
            );

          },
          3000
        );

      },
      []
    );


  const loadRows =
    useCallback(
      async () => {

        try {

          setLoading(
            true
          );


          setError(
            ""
          );


          const {
            data:
              sessionData,
          } =
            await supabase.auth.getSession();


          const user =
            sessionData.session?.user;


          if (
            !user
          ) {

            router.replace(
              "/login"
            );

            return;
          }


          const membershipResult =
            await supabase

              .from(
                "business_members"
              )

              .select(
                "business_id"
              )

              .eq(
                "user_id",
                user.id
              )

              .limit(
                1
              )

              .maybeSingle();


          if (
            membershipResult.error
          ) {

            throw membershipResult.error;
          }


          const businessId =
            membershipResult.data?.business_id;


          if (
            !businessId
          ) {

            throw new Error(
              "Business membership was not found."
            );
          }


          const invoiceResult =
            await supabase

              .from(
                "invoices"
              )

              .select(
                [
                  "id",
                  "invoice_number",
                  "customer_id",
                  "invoice_date",
                  "total_amount",
                  "status",
                  "invoice_type",
                  "document_kind",
                ].join(
                  ","
                )
              )

              .eq(
                "business_id",
                businessId
              )

              .order(
                "invoice_date",
                {
                  ascending:
                    false,
                }
              );


          if (
            invoiceResult.error
          ) {

            throw invoiceResult.error;
          }


          const invoices =
            ((invoiceResult.data ?? []) as unknown as InvoiceData[]);


          const invoiceIds =
            invoices.map(
              (
                invoice
              ) =>
                invoice.id
            );


          let payments:
            PaymentData[] =
              [];


          if (
            invoiceIds.length >
            0
          ) {

            const paymentResult =
              await supabase

                .from(
                  "payments"
                )

                .select(
                  [
                    "id",
                    "receipt_number",
                    "payment_date",
                    "amount",
                    "invoice_id",
                    "customer_id",
                    "voided_at",
                    "void_reason",
                  ].join(
                    ","
                  )
                )

                .in(
                  "invoice_id",
                  invoiceIds
                )

                .order(
                  "payment_date",
                  {
                    ascending:
                      false,
                  }
                );


            if (
              paymentResult.error
            ) {

              throw paymentResult.error;
            }


            payments =
              ((paymentResult.data ?? []) as unknown as PaymentData[]);
          }


          const customerIds =
            Array.from(
              new Set(
                [

                  ...invoices.map(
                    (
                      invoice
                    ) =>
                      invoice.customer_id
                  ),

                  ...payments.map(
                    (
                      payment
                    ) =>
                      payment.customer_id
                  ),

                ]
                  .filter(Boolean) as string[]
              )
            );


          const contactMap =
            new Map<
              string,
              string
            >();


          if (
            customerIds.length >
            0
          ) {

            const contactResult =
              await supabase

                .from(
                  "contacts"
                )

                .select(
                  "id,name"
                )

                .in(
                  "id",
                  customerIds
                );


            if (
              contactResult.error
            ) {

              throw contactResult.error;
            }


            const contacts =
              ((contactResult.data ?? []) as ContactData[]);


            for (
              const contact
              of contacts
            ) {

              contactMap.set(
                contact.id,
                contact.name
              );
            }
          }


          const paymentsByInvoice =
            new Map<
              string,
              PaymentData[]
            >();


          for (
            const payment
            of payments
          ) {

            if (
              !payment.invoice_id
            ) {

              continue;
            }


            const current =
              paymentsByInvoice.get(
                payment.invoice_id
              ) ??
              [];


            current.push(
              payment
            );


            paymentsByInvoice.set(
              payment.invoice_id,
              current
            );
          }


          const invoiceMap =
            new Map<
              string,
              InvoiceData
            >();


          for (
            const invoice
            of invoices
          ) {

            invoiceMap.set(
              invoice.id,
              invoice
            );
          }


          const nextRows:
            RegisterRow[] =
              [];


          for (
            const invoice
            of invoices
          ) {

            if (
              invoice.document_kind ===
              "direct_receipt"
            ) {

              continue;
            }


            const paymentHistory =
              paymentsByInvoice.get(
                invoice.id
              ) ??
              [];


            const canDelete =
              invoice.status ===
                "unpaid" &&
              paymentHistory.length ===
                0;


            nextRows.push(
              {

                id:
                  invoice.id,

                kind:
                  "invoice",

                documentNumber:
                  invoice.invoice_number,

                customer:
                  invoice.customer_id

                    ? (
                        contactMap.get(
                          invoice.customer_id
                        ) ??
                        "Customer"
                      )

                    : "Customer",

                type:
                  typeLabel(
                    invoice.invoice_type
                  ),

                date:
                  invoice.invoice_date,

                amount:
                  Number(
                    invoice.total_amount ??
                    0
                  ),

                status:
                  invoice.status,

                invoiceId:
                  invoice.id,

                canDelete,

                voidReason:
                  null,

              }
            );
          }


          for (
            const payment
            of payments
          ) {

            if (
              !payment.invoice_id
            ) {

              continue;
            }


            const invoice =
              invoiceMap.get(
                payment.invoice_id
              );


            if (
              !invoice
            ) {

              continue;
            }


            nextRows.push(
              {

                id:
                  payment.id,

                kind:
                  "receipt",

                documentNumber:
                  payment.receipt_number,

                customer:
                  payment.customer_id

                    ? (
                        contactMap.get(
                          payment.customer_id
                        ) ??
                        "Customer"
                      )

                    : (
                        invoice.customer_id

                          ? (
                              contactMap.get(
                                invoice.customer_id
                              ) ??
                              "Customer"
                            )

                          : "Customer"
                      ),

                type:
                  typeLabel(
                    invoice.invoice_type
                  ),

                date:
                  payment.payment_date,

                amount:
                  Number(
                    payment.amount ??
                    0
                  ),

                status:
                  payment.voided_at

                    ? "void"

                    : "received",

                invoiceId:
                  invoice.id,

                canDelete:
                  false,

                voidReason:
                  payment.void_reason,

              }
            );
          }


          nextRows.sort(
            (
              a,
              b
            ) => {

              const dateA =
                new Date(
                  a.date
                ).getTime();


              const dateB =
                new Date(
                  b.date
                ).getTime();


              return (
                dateB -
                dateA
              );
            }
          );


          setRows(
            nextRows
          );


          setSelectedIds(
            []
          );


          setLoading(
            false
          );

        }
        catch (
          loadError
        ) {

          console.error(
            loadError
          );


          setError(
            loadError instanceof
              Error

              ? loadError.message

              : "Unable to load invoices and receipts."
          );


          setLoading(
            false
          );
        }

      },
      [router]
    );

  useEffect(
    () => {

      loadRows();

    },
    [
      loadRows,
    ]
  );


  const visibleRows =
    useMemo(
      () => {

        if (
          filter ===
          "receipts"
        ) {

          return rows.filter(
            (
              row
            ) =>
              row.kind ===
              "receipt"
          );
        }


        if (
          filter ===
          "invoices"
        ) {

          return rows.filter(
            (
              row
            ) =>
              row.kind ===
              "invoice"
          );
        }


        return rows;

      },
      [
        filter,
        rows,
      ]
    );


  const deletableVisibleIds =
    useMemo(
      () => {

        return visibleRows

          .filter(
            (
              row
            ) =>
              row.kind ===
                "invoice" &&
              row.canDelete
          )

          .map(
            (
              row
            ) =>
              row.id
          );

      },
      [
        visibleRows,
      ]
    );


  const allDeletableSelected =
    deletableVisibleIds.length >
      0 &&
    deletableVisibleIds.every(
      (
        id
      ) =>
        selectedIds.includes(
          id
        )
    );


  function toggleRow(
    id:
      string
  ) {

    setSelectedIds(
      (
        current
      ) => {

        if (
          current.includes(
            id
          )
        ) {

          return current.filter(
            (
              value
            ) =>
              value !==
              id
          );
        }


        return [
          ...current,
          id,
        ];

      }
    );
  }


  function toggleAll() {

    if (
      allDeletableSelected
    ) {

      setSelectedIds(
        (
          current
        ) =>
          current.filter(
            (
              id
            ) =>
              !deletableVisibleIds.includes(
                id
              )
          )
      );

      return;
    }


    setSelectedIds(
      (
        current
      ) =>
        Array.from(
          new Set(
            [
              ...current,
              ...deletableVisibleIds,
            ]
          )
        )
    );
  }


  async function deleteInvoices(
    ids:
      string[]
  ) {

    if (
      ids.length ===
      0
    ) {

      return;
    }


    const confirmed =
      window.confirm(

        ids.length ===
        1

          ? "Delete this unpaid invoice permanently?"

          : "Delete " +
            ids.length +
            " unpaid invoices permanently?"
      );


    if (
      !confirmed
    ) {

      return;
    }


    try {

      const paymentCheck =
        await supabase

          .from(
            "payments"
          )

          .select(
            "id,invoice_id"
          )

          .in(
            "invoice_id",
            ids

          )

          .limit(
            1
          );


      if (
        paymentCheck.error
      ) {

        throw paymentCheck.error;
      }


      if (
        (
          paymentCheck.data ??
          []
        ).length >
        0
      ) {

        throw new Error(
          "An invoice with payment history cannot be permanently deleted."
        );
      }


      const sheepDelete =
        await supabase

          .from(
            "sheep_sale_details"
          )

          .delete()

          .in(
            "invoice_id",
            ids
          );


      if (
        sheepDelete.error
      ) {

        throw sheepDelete.error;
      }


      const itemDelete =
        await supabase

          .from(
            "invoice_items"
          )

          .delete()

          .in(
            "invoice_id",
            ids
          );


      if (
        itemDelete.error
      ) {

        throw itemDelete.error;
      }


      const invoiceDelete =
        await supabase

          .from(
            "invoices"
          )

          .delete()

          .in(
            "id",
            ids
          )

          .eq(
            "status",
            "unpaid"
          )

          .select(
            "id"
          );


      if (
        invoiceDelete.error
      ) {

        throw invoiceDelete.error;
      }


      if (
        (
          invoiceDelete.data ??
          []
        ).length !==
        ids.length
      ) {

        throw new Error(
          "One or more invoices could not be deleted."
        );
      }


      showToast(
        "Deleted successfully"
      );


      await loadRows();

    }
    catch (
      deleteError
    ) {

      console.error(
        deleteError
      );


      window.alert(

        deleteError instanceof
          Error

          ? deleteError.message

          : "Unable to delete invoice."
      );
    }
  }


  async function voidReceipt() {

    if (
      !voidTarget
    ) {

      return;
    }


    try {

      setVoiding(
        true
      );


      const result =
        await supabase.rpc(
          "void_invoice_payment",
          {
            p_payment_id:
              voidTarget.id,

            p_reason:
              voidReason.trim() ||
              null,
          }
        );


      if (
        result.error
      ) {

        throw result.error;
      }


      setVoidTarget(
        null
      );


      setVoidReason(
        ""
      );


      showToast(
        "Changes saved"
      );


      await loadRows();

    }
    catch (
      voidError
    ) {

      console.error(
        voidError
      );


      window.alert(

        voidError instanceof
          Error

          ? voidError.message

          : "Unable to void receipt."
      );

    }
    finally {

      setVoiding(
        false
      );
    }
  }


  return (

    <FinancePageShell

      eyebrow="Sales Documents"

      title="Invoices & Receipts"

      description="Issue a receipt for a paid sale. Create an invoice only when the customer will pay later."

    >


      {
        toast &&
        (

          <div className="fixed right-5 top-5 z-[120] flex max-w-[320px] items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-xl">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">

              <CheckCircle2
                size={19}
              />

            </div>


            <p className="text-[13px] font-black text-slate-900">

              {
                toast
              }

            </p>

          </div>

        )
      }


      <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm">


        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">


          <div>

            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#0b5136]">

              Sales Documents

            </p>


            <h2 className="mt-1 text-[21px] font-black tracking-tight text-slate-950">

              Issue a Sales Document

            </h2>

          </div>


          <div className="flex flex-wrap gap-2">


            <Link

              href="/receipts/new"

              className="inline-flex items-center gap-2 rounded-xl bg-[#0b5136] px-4 py-3 text-[13px] font-black text-white hover:bg-[#083c29]"

            >

              <ReceiptText
                size={16}
              />

              + Issue Receipt

            </Link>


            <Link

              href="/invoices/new"

              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-[13px] font-black text-slate-800 hover:bg-slate-50"

            >

              + Create Invoice

            </Link>


          </div>

        </div>


        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">


          <div className="flex rounded-xl bg-slate-100 p-1">


            {
              [
                {
                  key:
                    "all",

                  label:
                    "All",
                },

                {
                  key:
                    "receipts",

                  label:
                    "Receipts",
                },

                {
                  key:
                    "invoices",

                  label:
                    "Invoices",
                },

              ].map(
                (
                  item
                ) =>
                  (

                    <button

                      key={
                        item.key
                      }

                      type="button"

                      onClick={
                        () =>
                          setFilter(
                            item.key as FilterType
                          )
                      }

                      className={
                        "rounded-lg px-4 py-2 text-[12px] font-black transition " +

                        (
                          filter ===
                          item.key

                            ? "bg-white text-[#0b5136] shadow-sm"

                            : "text-slate-500 hover:text-slate-900"
                        )
                      }

                    >

                      {
                        item.label
                      }

                    </button>

                  )
              )
            }


          </div>


          {
            selectedIds.length >
              0 &&
            (

              <button

                type="button"

                onClick={
                  () =>
                    deleteInvoices(
                      selectedIds
                    )
                }

                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-[12px] font-black text-white hover:bg-red-700"

              >

                <Trash2
                  size={15}
                />

                Delete Selected (
                {
                  selectedIds.length
                }
                )

              </button>

            )
          }


        </div>


        {
          loading

            ? (

              <div className="flex min-h-[280px] items-center justify-center">

                <Loader2

                  size={30}

                  className="animate-spin text-[#0b5136]"

                />

              </div>

            )

            : error

              ? (

                <div className="m-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">

                  {
                    error
                  }

                </div>

              )

              : visibleRows.length ===
                0

                ? (

                  <div className="px-6 py-16 text-center">

                    <ReceiptText

                      size={38}

                      className="mx-auto text-slate-300"

                    />


                    <p className="mt-4 text-[15px] font-black text-slate-700">

                      No records found

                    </p>


                    <p className="mt-1 text-[12px] text-slate-500">

                      New receipts and invoices will appear here.

                    </p>

                  </div>

                )

                : (

                  <div className="overflow-x-auto">


                    <table className="min-w-[1060px] w-full border-collapse">


                      <thead>


                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">


                          <th className="w-[52px] px-4 py-4 text-center">

                            <button

                              type="button"

                              onClick={
                                toggleAll
                              }

                              disabled={
                                deletableVisibleIds.length ===
                                0
                              }

                              className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white disabled:opacity-30"

                            >

                              {
                                allDeletableSelected &&
                                (

                                  <Check
                                    size={14}
                                  />

                                )
                              }

                            </button>

                          </th>


                          <th className="whitespace-nowrap px-3 py-4">
                            Document
                          </th>

                          <th className="whitespace-nowrap px-3 py-4">
                            Type
                          </th>

                          <th className="whitespace-nowrap px-3 py-4">
                            Customer
                          </th>

                          <th className="whitespace-nowrap px-3 py-4">
                            Sale Type
                          </th>

                          <th className="whitespace-nowrap px-3 py-4">
                            Date
                          </th>

                          <th className="whitespace-nowrap px-3 py-4 text-right">
                            Amount
                          </th>

                          <th className="whitespace-nowrap px-3 py-4">
                            Status
                          </th>

                          <th className="whitespace-nowrap px-3 py-4 text-right">
                            Actions
                          </th>


                        </tr>


                      </thead>


                      <tbody>


                        {
                          visibleRows.map(
                            (
                              row
                            ) => {


                              const selected =
                                selectedIds.includes(
                                  row.id
                                );


                              return (

                                <tr

                                  key={
                                    row.kind +
                                    "-" +
                                    row.id
                                  }

                                  className="border-b border-slate-100 text-[13px] hover:bg-slate-50/70"

                                >


                                  <td className="px-4 py-4 text-center">


                                    {
                                      row.kind ===
                                        "invoice" &&
                                      row.canDelete

                                        ? (

                                          <button

                                            type="button"

                                            onClick={
                                              () =>
                                                toggleRow(
                                                  row.id
                                                )
                                            }

                                            className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white"

                                          >

                                            {
                                              selected &&
                                              (

                                                <Check
                                                  size={14}
                                                />

                                              )
                                            }

                                          </button>

                                        )

                                        : (

                                          <span className="inline-block h-5 w-5" />

                                        )
                                    }


                                  </td>


                                  <td className="whitespace-nowrap px-3 py-4 font-black text-slate-900">

                                    {
                                      row.documentNumber
                                    }

                                  </td>


                                  <td className="whitespace-nowrap px-3 py-4">

                                    <span

                                      className={
                                        row.kind ===
                                        "receipt"

                                          ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-700"

                                          : "rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-blue-700"
                                      }

                                    >

                                      {
                                        row.kind ===
                                        "receipt"

                                          ? "Receipt"

                                          : "Invoice"
                                      }

                                    </span>

                                  </td>


                                  <td className="whitespace-nowrap px-3 py-4 font-semibold text-slate-700">

                                    {
                                      row.customer
                                    }

                                  </td>


                                  <td className="whitespace-nowrap px-3 py-4 text-slate-600">

                                    {
                                      row.type
                                    }

                                  </td>


                                  <td className="whitespace-nowrap px-3 py-4 text-slate-600">

                                    {
                                      formatDate(
                                        row.date
                                      )
                                    }

                                  </td>


                                  <td className="whitespace-nowrap px-3 py-4 text-right font-black text-slate-900">

                                    {
                                      money(
                                        row.amount
                                      )
                                    }

                                  </td>


                                  <td className="whitespace-nowrap px-3 py-4">

                                    <span

                                      className={
                                        "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.06em] " +
                                        statusClass(
                                          row.status
                                        )
                                      }

                                    >

                                      {
                                        statusLabel(
                                          row.status
                                        )
                                      }

                                    </span>

                                  </td>


                                  <td className="whitespace-nowrap px-3 py-4 text-right">


                                    <div className="flex items-center justify-end gap-2">


                                      {
                                        row.kind ===
                                        "invoice"

                                          ? (

                                            <>

                                              <Link

                                                href={
                                                  "/invoices/" +
                                                  row.id
                                                }

                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-black text-slate-700 hover:bg-slate-50"

                                              >

                                                <Eye
                                                  size={13}
                                                />

                                                View

                                              </Link>


                                              <Link

                                                href={
                                                  "/invoices/" +
                                                  row.id +
                                                  "/edit"
                                                }

                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-black text-slate-700 hover:bg-slate-50"

                                              >

                                                <FilePenLine
                                                  size={13}
                                                />

                                                Edit

                                              </Link>


                                              {
                                                row.canDelete &&
                                                (

                                                  <button

                                                    type="button"

                                                    onClick={
                                                      () =>
                                                        deleteInvoices(
                                                          [
                                                            row.id,
                                                          ]
                                                        )
                                                    }

                                                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] font-black text-red-700 hover:bg-red-100"

                                                  >

                                                    <Trash2
                                                      size={13}
                                                    />

                                                    Delete

                                                  </button>

                                                )
                                              }

                                            </>

                                          )

                                          : (

                                            <>

                                              <Link

                                                href={
                                                  "/receipts/" +
                                                  row.id
                                                }

                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-black text-slate-700 hover:bg-slate-50"

                                              >

                                                <Eye
                                                  size={13}
                                                />

                                                View

                                              </Link>


                                              {
                                                row.status !==
                                                "void" &&
                                                (

                                                  <button

                                                    type="button"

                                                    onClick={
                                                      () => {

                                                        setVoidTarget(
                                                          row
                                                        );


                                                        setVoidReason(
                                                          ""
                                                        );
                                                      }
                                                    }

                                                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] font-black text-red-700 hover:bg-red-100"

                                                  >

                                                    <X
                                                      size={13}
                                                    />

                                                    Void

                                                  </button>

                                                )
                                              }

                                            </>

                                          )
                                      }


                                    </div>


                                  </td>


                                </tr>

                              );
                            }
                          )
                        }


                      </tbody>


                    </table>


                  </div>

                )
        }


      </div>


      {
        voidTarget &&
        (

          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/45 p-4">


            <div className="w-full max-w-[470px] rounded-[24px] bg-white p-6 shadow-2xl">


              <div className="flex items-start justify-between gap-4">


                <div>

                  <p className="text-[11px] font-black uppercase tracking-[0.13em] text-red-600">

                    Void Receipt

                  </p>


                  <h3 className="mt-1 text-[22px] font-black tracking-tight text-slate-950">

                    Reverse this receipt?

                  </h3>

                </div>


                <button

                  type="button"

                  disabled={
                    voiding
                  }

                  onClick={
                    () => {

                      setVoidTarget(
                        null
                      );


                      setVoidReason(
                        ""
                      );
                    }
                  }

                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"

                >

                  <X
                    size={19}
                  />

                </button>


              </div>


              <div className="mt-5 rounded-2xl bg-slate-50 p-4">


                <div className="flex justify-between gap-4 text-[12px]">

                  <span className="text-slate-500">
                    Receipt
                  </span>

                  <strong className="text-slate-900">
                    {
                      voidTarget.documentNumber
                    }
                  </strong>

                </div>


                <div className="mt-2 flex justify-between gap-4 text-[12px]">

                  <span className="text-slate-500">
                    Customer
                  </span>

                  <strong className="text-slate-900">
                    {
                      voidTarget.customer
                    }
                  </strong>

                </div>


                <div className="mt-2 flex justify-between gap-4 text-[12px]">

                  <span className="text-slate-500">
                    Amount
                  </span>

                  <strong className="text-slate-900">
                    {
                      money(
                        voidTarget.amount
                      )
                    }
                  </strong>

                </div>


              </div>


              <div className="mt-5">


                <label className="text-[12px] font-black text-slate-700">

                  Reason for voiding
                  <span className="font-medium text-slate-400">
                    {" "}
                    (optional)
                  </span>

                </label>


                <textarea

                  value={
                    voidReason
                  }

                  onChange={
                    (
                      event
                    ) =>
                      setVoidReason(
                        event.target.value
                      )
                  }

                  rows={3}

                  placeholder="Example: Receipt entered by mistake"

                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-3 py-3 text-[13px] outline-none transition focus:border-[#0b5136] focus:ring-2 focus:ring-[#0b5136]/10"

                />

              </div>


              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">

                Voiding reverses the payment and its linked income effect. The receipt remains in history and will be marked VOID.

              </div>


              <div className="mt-6 flex justify-end gap-3">


                <button

                  type="button"

                  disabled={
                    voiding
                  }

                  onClick={
                    () => {

                      setVoidTarget(
                        null
                      );


                      setVoidReason(
                        ""
                      );
                    }
                  }

                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[12px] font-black text-slate-700 hover:bg-slate-50"

                >

                  Cancel

                </button>


                <button

                  type="button"

                  disabled={
                    voiding
                  }

                  onClick={
                    voidReceipt
                  }

                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-[12px] font-black text-white hover:bg-red-700 disabled:opacity-60"

                >

                  {
                    voiding

                      ? (

                        <Loader2
                          size={15}
                          className="animate-spin"
                        />

                      )

                      : (

                        <X
                          size={15}
                        />

                      )
                  }

                  {
                    voiding

                      ? "Voiding..."

                      : "Void Receipt"
                  }

                </button>


              </div>


            </div>


          </div>

        )
      }


    </FinancePageShell>

  );
}
