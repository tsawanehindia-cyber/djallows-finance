"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  Printer,
} from "lucide-react";

import FinancePageShell from "@/components/FinancePageShell";
import DocumentLetterhead, {
  DocumentFooter,
  DocumentSignatureBlock,
} from "@/components/DocumentLetterhead";
import { supabase } from "@/lib/supabase";

type PaymentRow = {
  id: string;
  receipt_number: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  account_id: string | null;
  notes: string | null;
  invoice_id: string;
  voided_at: string | null;
  void_reason: string | null;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  invoice_date: string;
  subtotal: number;
  discount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  invoice_type: string;
  notes: string | null;
  document_kind: "invoice" | "direct_receipt";
};

type GenericRow = Record<string, unknown>;

type DisplayLine = {
  title: string;
  meta?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
};

type ReceiptDocumentProps = {
  payment: PaymentRow;
  invoice: InvoiceRow;
  customer: GenericRow | null;
  lines: DisplayLine[];
  note: string;
};

function pickText(row: GenericRow | null, ...keys: string[]) {
  if (!row) return "";
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function pickNumber(row: GenericRow | null, ...keys: string[]) {
  if (!row) return null;

  for (const key of keys) {
    const value = row[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function money(amount: number) {
  return (
    "GMD " +
    Number(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

function formatDate(value: string) {
  const clean = String(value).slice(0, 10);
  const date = new Date(clean + "T12:00:00");

  if (Number.isNaN(date.getTime())) {
    return clean;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function invoiceTypeLabel(value: string) {
  if (value === "sheep_sale") return "Sheep Sale";
  if (value === "product_sale") return "Farm Product Sale";
  if (value === "service") return "Consultancy / Service";
  return "Other";
}

function unitForType(value: string) {
  if (value === "sheep_sale") return "Sheep";
  if (value === "service") return "Service";
  return "Item";
}


function ReceiptDocument({
  payment,
  invoice,
  customer,
  lines,
  note,
}: ReceiptDocumentProps) {
  const customerName =
    pickText(customer, "name", "customer_name") || "Customer";

  const customerPhone = pickText(
    customer,
    "phone",
    "phone_number",
    "mobile"
  );

  const customerLocation = pickText(
    customer,
    "location",
    "address",
    "town",
    "city"
  );

  const receivedInto = payment.payment_method || "Recorded payment";
  const isDirectReceipt = invoice.document_kind === "direct_receipt";
  const isVoided = Boolean(payment.voided_at);

  return (
    <article className="receipt-document">
      <div className="receipt-page-watermark" aria-hidden="true" />

      {isVoided && <div className="void-watermark">VOID</div>}

      <div className="receipt-sheet">
        <DocumentLetterhead
          documentTitle="RECEIPT"
          documentNumber={payment.receipt_number}
          documentDate={formatDate(payment.payment_date)}
        />

        <div className="brand-divider" aria-hidden="true">
          <div className="blue-line" />
          <div className="green-line" />
        </div>

        {isVoided && (
          <div className="void-notice">
            <strong>VOID RECEIPT</strong>
            <span>This receipt has been reversed and is no longer valid.</span>
            {payment.void_reason && <span>Reason: {payment.void_reason}</span>}
          </div>
        )}

        <section className="receipt-party-grid">
          <div className="receipt-panel">
            <p className="panel-label">Received From</p>

            <p className="panel-primary">{customerName}</p>

            <div className="panel-meta">
              {customerPhone && (
                <p>
                  <Phone size={13} strokeWidth={1.8} />
                  <span>{customerPhone}</span>
                </p>
              )}

              {customerLocation && (
                <p>
                  <MapPin size={13} strokeWidth={1.8} />
                  <span>{customerLocation}</span>
                </p>
              )}
            </div>
          </div>

          <div className="receipt-panel">
            <p className="panel-label">Receipt Details</p>

            <dl className="receipt-facts">
              <div>
                <dt>Receipt Date</dt>
                <dd>{formatDate(payment.payment_date)}</dd>
              </div>

              <div>
                <dt>Sale Type</dt>
                <dd>{invoiceTypeLabel(invoice.invoice_type)}</dd>
              </div>

              <div>
                <dt>Received Into</dt>
                <dd>{receivedInto}</dd>
              </div>

              {!isDirectReceipt && (
                <div>
                  <dt>Invoice Ref</dt>
                  <dd>{invoice.invoice_number}</dd>
                </div>
              )}
            </dl>
          </div>
        </section>

        <section className="items-section">
          <table className="items-table">
            <thead>
              <tr>
                <th className="description-column">Description</th>
                <th className="quantity-column">Qty</th>
                <th className="unit-column">Unit</th>
                <th className="price-column">Unit Price</th>
                <th className="amount-column">Amount</th>
              </tr>
            </thead>

            <tbody>
              {lines.map((line, index) => (
                <tr key={line.title + "-" + index}>
                  <td>
                    <div className="line-main">{line.title}</div>
                    {line.meta && <div className="line-meta">{line.meta}</div>}
                  </td>

                  <td className="center">{line.quantity}</td>
                  <td className="center">{line.unit}</td>
                  <td className="right">{money(line.unitPrice)}</td>
                  <td className="right strong">{money(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {note && (
          <section className="receipt-note-panel">
            <p className="summary-eyebrow">Note</p>
            <p className="receipt-note-text">{note}</p>
          </section>
        )}

        <section className="receipt-summary-grid">
          <div className="payment-highlight">
            <p className="summary-eyebrow">Amount Received</p>
            <p className="received-amount">{money(payment.amount)}</p>

            <div className="payment-support">
              <p>
                <span>Payment Method</span>
                <strong>{receivedInto}</strong>
              </p>


            </div>
          </div>

          <div className="totals-card">
            <div className="totals-lines">
              <div>
                <span>Subtotal</span>
                <strong>{money(invoice.subtotal)}</strong>
              </div>

              <div>
                <span>Discount</span>
                <strong>{money(invoice.discount)}</strong>
              </div>

              <div className="total-line">
                <span>Total</span>
                <strong>{money(invoice.total_amount)}</strong>
              </div>

              <div>
                <span>Received</span>
                <strong>{money(payment.amount)}</strong>
              </div>
            </div>

            <div className="balance-line">
              <span>Balance</span>
              <strong>{money(invoice.balance_due)}</strong>
            </div>
          </div>
        </section>

        <div className="receipt-closing">
          <DocumentSignatureBlock />

          <DocumentFooter className="receipt-document-footer" />
        </div>
      </div>
    </article>
  );
}

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const paymentId = String(params.id ?? "");
  const savedParam = searchParams.get("saved");

  const [mounted, setMounted] = useState(false);
  const [showSaved, setShowSaved] = useState(savedParam === "receipt");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [invoice, setInvoice] = useState<InvoiceRow | null>(null);
  const [customer, setCustomer] = useState<GenericRow | null>(null);
  const [items, setItems] = useState<GenericRow[]>([]);
  const [sheepDetails, setSheepDetails] = useState<GenericRow | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (savedParam !== "receipt") {
      return;
    }

    setShowSaved(true);

    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });

      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });

    const timer = window.setTimeout(() => {
      setShowSaved(false);
      window.history.replaceState({}, "", "/receipts/" + paymentId);
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [paymentId, savedParam]);

  useEffect(() => {
    let active = true;

    async function loadReceipt() {
      try {
        setLoading(true);
        setError("");

        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData.session) {
          router.replace("/login");
          return;
        }

        const paymentResult = await supabase
          .from("payments")
          .select(
            [
              "id",
              "receipt_number",
              "payment_date",
              "amount",
              "payment_method",
              "account_id",
              "notes",
              "invoice_id",
              "voided_at",
              "void_reason",
            ].join(",")
          )
          .eq("id", paymentId)
          .single();

        if (paymentResult.error || !paymentResult.data) {
          throw new Error(paymentResult.error?.message || "Receipt not found.");
        }

        const paymentData = paymentResult.data as unknown as PaymentRow;

        const invoiceResult = await supabase
          .from("invoices")
          .select(
            [
              "id",
              "invoice_number",
              "customer_id",
              "invoice_date",
              "subtotal",
              "discount",
              "total_amount",
              "amount_paid",
              "balance_due",
              "invoice_type",
              "notes",
              "document_kind",
            ].join(",")
          )
          .eq("id", paymentData.invoice_id)
          .single();

        if (invoiceResult.error || !invoiceResult.data) {
          throw new Error(
            invoiceResult.error?.message || "Related sale could not be found."
          );
        }

        const invoiceData = invoiceResult.data as unknown as InvoiceRow;

        const [itemResult, sheepResult] = await Promise.all([
          supabase
            .from("invoice_items")
            .select("*")
            .eq("invoice_id", invoiceData.id),

          supabase
            .from("sheep_sale_details")
            .select("*")
            .eq("invoice_id", invoiceData.id)
            .limit(1)
            .maybeSingle(),
        ]);

        let customerData: GenericRow | null = null;

        if (invoiceData.customer_id) {
          const customerResult = await supabase
            .from("contacts")
            .select("*")
            .eq("id", invoiceData.customer_id)
            .maybeSingle();

          if (!customerResult.error && customerResult.data) {
            customerData = customerResult.data as unknown as GenericRow;
          }
        }

        if (!active) return;

        setPayment(paymentData);
        setInvoice(invoiceData);
        setCustomer(customerData);
        setItems((itemResult.data ?? []) as unknown as GenericRow[]);
        setSheepDetails(
          sheepResult.error ? null : (sheepResult.data as unknown as GenericRow)
        );
        setLoading(false);
      } catch (loadError) {
        console.error(loadError);

        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load receipt."
          );
          setLoading(false);
        }
      }
    }

    loadReceipt();

    return () => {
      active = false;
    };
  }, [paymentId, router]);

  const displayLines = useMemo<DisplayLine[]>(() => {
    if (!invoice) {
      return [];
    }

    const sheepName = pickText(sheepDetails, "sheep_name", "name");
    const sheepTag = pickText(
      sheepDetails,
      "tag_id",
      "tag",
      "sheep_tag",
      "tag_number"
    );
    const sheepCategory = pickText(
      sheepDetails,
      "sale_category",
      "category"
    );

    if (items.length > 0) {
      return items.map((item, index) => {
        const quantity = pickNumber(item, "quantity", "qty") ?? 1;

        const lineAmount =
          pickNumber(
            item,
            "line_total",
            "total_amount",
            "total",
            "line_amount",
            "amount"
          ) ?? (items.length === 1 ? invoice.total_amount : 0);

        const explicitUnitPrice = pickNumber(item, "unit_price", "price", "rate");

        const unitPrice =
          explicitUnitPrice ?? (quantity > 0 ? lineAmount / quantity : lineAmount);

        const rawDescription =
          pickText(
            item,
            "description",
            "item_description",
            "name",
            "item_name",
            "service_name",
            "product_name"
          ) || invoiceTypeLabel(invoice.invoice_type);

        let title =
            rawDescription;

          const metaParts:
            string[] =
              [];

          if (
            index ===
              0 &&
            invoice.invoice_type ===
              "sheep_sale"
          ) {

            title =
              sheepName ||
              "Sheep";

            if (
              sheepTag
            ) {

              metaParts.push(
                "Tag: " +
                sheepTag
              );
            }

            if (
              sheepCategory
            ) {

              metaParts.push(
                sheepCategory
              );
            }
          }

          return {
          title,
          meta: metaParts.length > 0 ? metaParts.join(" ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ ") : undefined,
          quantity,
          unit: pickText(item, "unit", "unit_name") || unitForType(invoice.invoice_type),
          unitPrice,
          amount: lineAmount,
        };
      });
    }

    const metaParts: string[] = [];

    if (sheepTag) {
      metaParts.push("Tag: " + sheepTag);
    }

    if (sheepCategory) {
      metaParts.push(sheepCategory);
    }

    return [
      {
        title: sheepName || invoiceTypeLabel(invoice.invoice_type),
        meta: metaParts.length > 0 ? metaParts.join(" ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ ") : undefined,
        quantity: 1,
        unit: unitForType(invoice.invoice_type),
        unitPrice: invoice.total_amount,
        amount: invoice.total_amount,
      },
    ];
  }, [invoice, items, sheepDetails]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#edf3ef]">
        <Loader2 size={34} className="animate-spin text-[#0b5136]" />
      </main>
    );
  }

  if (error || !payment || !invoice) {
    return (
      <FinancePageShell
        eyebrow="Receipt"
        title="Receipt"
        description="Customer payment receipt."
      >
        <div className="rounded-2xl border border-red-300 bg-red-50 p-5 font-semibold text-red-800">
          {error || "Receipt not found."}
        </div>
      </FinancePageShell>
    );
  }

  const note =
    invoice.notes?.trim() ||
    payment.notes?.trim() ||
    "";

  const receiptProps: ReceiptDocumentProps = {
    payment,
    invoice,
    customer,
    lines: displayLines,
    note,
  };

  return (
    <>
      <style>{`
        :root {
          --receipt-blue: #17488f;
          --receipt-green: #2d9b45;
          --receipt-border: #cbd6e4;
          --receipt-text: #182333;
          --receipt-muted: #667386;
        }

        #receipt-print-root {
          display: none;
        }

        .receipt-document {
          position: relative;
          box-sizing: border-box;
          width: min(190mm, 100%);
          min-height: 274mm;
          margin: 0 auto;
          overflow: hidden;
          border: 1px solid #d8e0ea;
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
          color: var(--receipt-text);
          font-family: Arial, Helvetica, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .receipt-page-watermark {
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

        .receipt-sheet {
          position: relative;
          z-index: 2;
          box-sizing: border-box;
          display: flex;
          min-height: 274mm;
          flex-direction: column;
          padding: 9mm 10mm 7mm;
        }

        .brand-divider {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3mm;
          margin-top: 5mm;
        }

        .blue-line,
        .green-line {
          height: 1.2mm;
          border-radius: 999px;
        }

        .blue-line {
          background: var(--receipt-blue);
        }

        .green-line {
          background: var(--receipt-green);
        }

        .void-notice {
          display: grid;
          justify-items: center;
          gap: 0.8mm;
          margin-top: 5mm;
          padding: 3mm 4mm;
          border: 1px solid #fecaca;
          border-radius: 2.5mm;
          background: #fff6f6;
          color: #b91c1c;
          text-align: center;
        }

        .void-notice strong {
          font-size: 11pt;
          letter-spacing: 1.2px;
        }

        .void-notice span {
          font-size: 7.5pt;
        }

        .void-watermark {
          position: absolute;
          top: 47%;
          left: 50%;
          z-index: 1;
          transform: translate(-50%, -50%) rotate(-28deg);
          color: rgba(185, 28, 28, 0.055);
          font-size: 64pt;
          font-weight: 900;
          letter-spacing: 8px;
          pointer-events: none;
        }

        .receipt-party-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5mm;
          margin-top: 6mm;
        }

        .receipt-panel {
          min-height: 34mm;
          padding: 4.5mm 5mm;
          border: 1px solid var(--receipt-border);
          border-top: 1.2mm solid var(--receipt-blue);
          border-radius: 2.5mm;
          background: rgba(255, 255, 255, 0.97);
        }

        .panel-label,
        .summary-eyebrow {
          margin: 0;
          color: var(--receipt-blue);
          font-size: 7.5pt;
          font-weight: 900;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .panel-primary {
          margin: 3.5mm 0 0;
          color: #16243a;
          font-size: 12pt;
          font-weight: 900;
        }

        .panel-meta {
          display: grid;
          gap: 1.8mm;
          margin-top: 3mm;
          color: #556274;
          font-size: 8.3pt;
        }

        .panel-meta p {
          display: flex;
          align-items: center;
          gap: 1.8mm;
          margin: 0;
        }

        .receipt-facts {
          display: grid;
          margin: 2.5mm 0 0;
          font-size: 8.2pt;
        }

        .receipt-facts div {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 4mm;
          padding: 1.8mm 0;
          border-bottom: 1px dotted #d4dde8;
        }

        .receipt-facts div:last-child {
          border-bottom: none;
        }

        .receipt-facts dt {
          color: var(--receipt-muted);
        }

        .receipt-facts dd {
          margin: 0;
          font-weight: 800;
          text-align: right;
        }

        .items-section {
          margin-top: 6mm;
        }

        .items-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          overflow: hidden;
          border: 1px solid var(--receipt-border);
          border-radius: 2.5mm;
          table-layout: fixed;
          font-size: 8.3pt;
        }

        .items-table thead tr {
          background: var(--receipt-blue);
          color: #ffffff;
        }

        .items-table th {
          padding: 3mm 2.6mm;
          border-right: 1px solid rgba(255, 255, 255, 0.2);
          font-weight: 800;
          text-align: left;
        }

        .items-table th:last-child,
        .items-table td:last-child {
          border-right: none;
        }

        .items-table td {
          padding: 3.2mm 2.6mm;
          border-top: 1px solid #dbe3ed;
          border-right: 1px solid #dbe3ed;
          background: rgba(255, 255, 255, 0.97);
          vertical-align: top;
          word-break: break-word;
        }

        .description-column {
          width: 42%;
        }

        .quantity-column {
          width: 9%;
          text-align: center !important;
        }

        .unit-column {
          width: 12%;
          text-align: center !important;
        }

        .price-column {
          width: 17%;
          text-align: right !important;
        }

        .amount-column {
          width: 20%;
          text-align: right !important;
        }

        .line-main {
          color: #1f2e44;
          font-weight: 800;
          line-height: 1.35;
        }

        .line-meta {
          margin-top: 1mm;
          color: #64748b;
          font-size: 7.5pt;
          line-height: 1.35;
        }

        .center {
          text-align: center;
        }

        .right {
          text-align: right;
          white-space: nowrap;
        }

        .strong {
          font-weight: 900;
        }

        .receipt-note-panel {
          margin-top: 5mm;
          padding: 4mm 5mm;
          border: 1px solid #b7d7bd;
          border-left: 1.4mm solid var(--receipt-green);
          border-radius: 2.5mm;
          background: rgba(255, 255, 255, 0.97);
        }

        .receipt-note-panel .summary-eyebrow {
          color: var(--receipt-green);
        }

        .receipt-note-text {
          margin: 2.5mm 0 0;
          color: #4d5b6e;
          font-size: 8.5pt;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .receipt-summary-grid {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 5mm;
          margin-top: 7mm;
          align-items: stretch;
        }

        .payment-highlight {
          padding: 5mm;
          border: 1px solid #b7d7bd;
          border-left: 1.4mm solid var(--receipt-green);
          border-radius: 2.5mm;
          background: #fbfefb;
        }

        .received-amount {
          margin: 3mm 0 0;
          color: #1c7a39;
          font-size: 20pt;
          font-weight: 900;
          letter-spacing: -0.2px;
        }

        .payment-support {
          display: grid;
          gap: 2mm;
          margin-top: 4mm;
          padding-top: 3mm;
          border-top: 1px solid #dce9de;
          font-size: 8pt;
        }

        .payment-support p {
          display: flex;
          justify-content: space-between;
          gap: 4mm;
          margin: 0;
        }

        .payment-support span {
          color: var(--receipt-muted);
        }

        .payment-support strong {
          text-align: right;
        }

        .payment-note {
          align-items: flex-start;
        }

        .payment-note strong {
          max-width: 65%;
          white-space: pre-wrap;
        }

        .totals-card {
          overflow: hidden;
          border: 1px solid var(--receipt-border);
          border-radius: 2.5mm;
          background: #ffffff;
        }

        .totals-lines {
          padding: 4mm 5mm;
          font-size: 8.5pt;
        }

        .totals-lines > div {
          display: flex;
          justify-content: space-between;
          gap: 4mm;
          padding: 1.9mm 0;
          border-bottom: 1px dotted #d5dee9;
        }

        .totals-lines .total-line {
          margin-top: 0.8mm;
          padding-top: 2.6mm;
          color: var(--receipt-blue);
          font-size: 10pt;
          font-weight: 900;
          border-bottom: 1px solid #aac0dc;
        }

        .balance-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 3.5mm 5mm;
          background: var(--receipt-blue);
          color: #ffffff;
          font-size: 9.5pt;
          font-weight: 900;
        }

        .receipt-closing {
          margin-top: auto;
          padding-top: 12mm;
        }

        .receipt-document-footer {
          margin-top: 9mm;
        }

        .receipt-screen-wrap {
          overflow-x: auto;
          padding: 0 0 8mm;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
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

          body > *:not(#receipt-print-root) {
            display: none !important;
          }

          #receipt-print-root {
            display: block !important;
            position: static !important;
            width: 190mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          #receipt-print-root .receipt-document {
            width: 190mm !important;
            max-width: 190mm !important;
            min-height: 274mm !important;
            margin: 0 !important;
            overflow: hidden !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            page-break-after: avoid !important;
            break-after: avoid-page !important;
          }

          #receipt-print-root .receipt-sheet {
            min-height: 274mm !important;
            padding: 5mm 6mm 4mm !important;
          }

          #receipt-print-root .receipt-party-grid,
          #receipt-print-root .receipt-summary-grid,
          #receipt-print-root .document-signatures,
          #receipt-print-root .document-footer {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          #receipt-print-root .items-table thead {
            display: table-header-group !important;
          }

          #receipt-print-root .items-table tbody tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          #receipt-print-root,
          #receipt-print-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }

        @media screen and (max-width: 860px) {
          .receipt-document {
            width: 100%;
            min-width: 720px;
          }
        }
      `}</style>

      <FinancePageShell
        eyebrow="Receipt"
        title="Receipt Details"
        description="Review and print the customer receipt."
        recordText={payment.receipt_number}
      >
        {showSaved && (
          <div className="fixed right-5 top-5 z-[200] flex w-[300px] max-w-[calc(100vw-40px)] items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-2xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={20} />
            </div>

            <div>
              <p className="text-[13px] font-black text-slate-950">
                Saved successfully
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Receipt recorded successfully.
              </p>
            </div>
          </div>
        )}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/invoices"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-[13px] font-bold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back to Invoices & Receipts
          </Link>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0b5136] px-5 py-3 text-[13px] font-bold text-white hover:bg-[#083c29]"
          >
            <Printer size={16} />
            Print / Save PDF
          </button>
        </div>

        <div className="receipt-screen-wrap">
          <ReceiptDocument {...receiptProps} />
        </div>
      </FinancePageShell>

      {mounted &&
        createPortal(
          <div id="receipt-print-root" aria-hidden="true">
            <ReceiptDocument {...receiptProps} />
          </div>,
          document.body
        )}
    </>
  );
}

