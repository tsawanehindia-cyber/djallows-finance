"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  Phone,
  Printer,
  ReceiptText,
  UserRound,
} from "lucide-react";

import FinancePageShell from "@/components/FinancePageShell";
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

      <div className="receipt-content">
        <header className="receipt-header">
          <div className="business-block">
            <div className="logo-box">
              <Image
                src="/djallows-logo.png"
                alt="Djallows Farm"
                width={120}
                height={120}
                priority
                className="receipt-logo"
              />
            </div>

            <div className="business-info">
              <h1>Djallows Farm</h1>
              <p className="tagline">Success Through Sheep Farming</p>

              <div className="business-contact">
                <div>
                  <MapPin size={14} strokeWidth={2} />
                  <span>Tujereng, The Gambia</span>
                </div>

                <div>
                  <Phone size={14} strokeWidth={2} />
                  <span>+220 789 3464</span>
                </div>
              </div>
            </div>
          </div>

          <div className="receipt-title-block">
            <h2>RECEIPT</h2>
            <p>Receipt No.</p>

            <div className="receipt-number">{payment.receipt_number}</div>

            <div
              className={
                isVoided ? "receipt-status void" : "receipt-status received"
              }
            >
              {isVoided ? "VOID" : "RECEIVED"}
            </div>
          </div>
        </header>

        <div className="brand-divider">
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

        <section className="details-grid">
          <div className="detail-card">
            <div className="card-title">
              <div className="card-icon">
                <UserRound size={16} strokeWidth={2} />
              </div>

              <div>
                <h3>RECEIVED FROM</h3>
                <div className="title-underline" />
              </div>
            </div>

            <div className="customer-content">
              <strong className="customer-name">{customerName}</strong>

              {customerPhone && (
                <div className="customer-line">
                  <Phone size={14} strokeWidth={1.8} />
                  <span>{customerPhone}</span>
                </div>
              )}

              {customerLocation && (
                <div className="customer-line">
                  <MapPin size={14} strokeWidth={1.8} />
                  <span>{customerLocation}</span>
                </div>
              )}
            </div>
          </div>

          <div className="detail-card">
            <div className="card-title">
              <div className="card-icon">
                <ReceiptText size={16} strokeWidth={2} />
              </div>

              <div>
                <h3>RECEIPT DETAILS</h3>
                <div className="title-underline" />
              </div>
            </div>

            <dl className="receipt-details-list">
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

        <section className="bottom-grid">
          
          <div className="notes-card">

            <div className="notes-head">

              <div className="card-icon green">

                <FileText
                  size={16}
                  strokeWidth={2}
                />

              </div>

              <div>

                <h3>
                  NOTE
                </h3>

                <div className="green-underline" />

              </div>

            </div>

            <p className="note-text">

              {
                note ||
                "No note."
              }

            </p>

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
              <span>BALANCE</span>
              <strong>{money(invoice.balance_due)}</strong>
            </div>
          </div>
        </section>

        <section className="thank-you-section">
          <p>THANK YOU FOR YOUR BUSINESS!</p>

          <div className="thank-you-rule">
            <span />
            <div className="thank-you-logo-watermark" aria-hidden="true" />
            <span />
          </div>
        </section>

        <section className="footer-info">
          <span>DJALLOWS FARM - Success Through Sheep Farming</span>
          <span>Tujereng, The Gambia</span>
        </section>
      </div>

      <footer className="receipt-footer" aria-hidden="true">
        <div className="footer-green" />
        <div className="footer-blue" />
      </footer>
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
          meta: metaParts.length > 0 ? metaParts.join(" Ã¢â‚¬Â¢ ") : undefined,
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
        meta: metaParts.length > 0 ? metaParts.join(" Ã¢â‚¬Â¢ ") : undefined,
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
          --receipt-blue-deep: #123a78;
          --receipt-green: #2d9b45;
          --receipt-green-soft: #e8f7eb;
          --receipt-border: #b8c8dd;
          --receipt-text: #182333;
          --receipt-muted: #6a7687;
          --receipt-bg: #ffffff;
        }

        #receipt-print-root {
          display: none;
        }

        .receipt-document {

          position:
            relative;

          box-sizing:
            border-box;

          display:
            flex;

          flex-direction:
            column;

          width:
            min(
              190mm,
              100%
            );

          min-height:
            275mm;

          margin:
            0 auto;

          overflow:
            hidden;

          background:
            var(
              --receipt-bg
            );

          border:
            1px solid
            #d8e0ea;

          border-radius:
            20px;

          box-shadow:
            0 18px 40px
            rgba(
              15,
              23,
              42,
              0.08
            );

          color:
            var(
              --receipt-text
            );

          font-family:
            Arial,
            Helvetica,
            sans-serif;

          -webkit-print-color-adjust:
            exact;

          print-color-adjust:
            exact;

          color-adjust:
            exact;

          forced-color-adjust:
            none;

        }


        .receipt-page-watermark {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image: url('/djallows-logo.png');
          background-repeat: no-repeat;
          background-position: center 45%;
          background-size: 115mm;
          opacity: 0.045;
        }

        .receipt-content {

          position:
            relative;

          z-index:
            2;

          flex:
            1 0 auto;

          padding:
            10mm
            10mm
            8mm;

        }


        .receipt-header {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 8mm;
          align-items: start;
        }

        .business-block {
          display: flex;
          align-items: center;
          gap: 5mm;
        }

        .logo-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30mm;
          height: 30mm;
          flex: 0 0 auto;
        }

        .receipt-logo {
          width: 27mm;
          height: 27mm;
          object-fit: contain;
        }

        .business-info {
          min-height: 28mm;
          padding-left: 5mm;
          border-left: 1mm solid var(--receipt-blue);
        }

        .business-info h1 {
          margin: 0;
          color: var(--receipt-blue);
          font-size: 18pt;
          line-height: 1;
          font-weight: 800;
        }

        .tagline {
          margin: 2mm 0 0;
          color: var(--receipt-green);
          font-size: 9pt;
          font-style: italic;
          font-weight: 600;
        }

        .business-contact {
          display: grid;
          gap: 1.5mm;
          margin-top: 4mm;
          color: #516072;
          font-size: 8.5pt;
        }

        .business-contact div {
          display: flex;
          align-items: center;
          gap: 2mm;
        }

        .receipt-title-block {
          text-align: right;
        }

        .receipt-title-block h2 {
          margin: 0;
          color: var(--receipt-blue);
          font-size: 27pt;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .receipt-title-block > p {
          margin: 2.5mm 0 1.4mm;
          color: #64748b;
          font-size: 7.8pt;
          font-weight: 700;
        }

        .receipt-number {
          display: inline-block;
          max-width: 100%;
          padding: 3mm 5mm;
          border-radius: 3mm;
          background: var(--receipt-blue);
          color: #ffffff;
          font-size: 10.3pt;
          font-weight: 800;
          white-space: nowrap;
        }

        .receipt-status {
          display: inline-block;
          margin-top: 3mm;
          padding: 1.7mm 6mm;
          border-radius: 2mm;
          font-size: 8pt;
          font-weight: 900;
          letter-spacing: 0.7px;
        }

        .receipt-status.received {
          background: #d9f8e0;
          color: #0c7736;
        }

        .receipt-status.void {
          background: #fee2e2;
          color: #b91c1c;
        }

        .brand-divider {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2.8mm;
          margin-top: 6mm;
        }

        .blue-line,
        .green-line {
          height: 1.6mm;
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
          gap: 1mm;
          margin-top: 4mm;
          padding: 3mm 4mm;
          border: 1px solid #fca5a5;
          border-radius: 3mm;
          background: #fef2f2;
          color: #b91c1c;
          text-align: center;
        }

        .void-notice strong {
          font-size: 12pt;
          letter-spacing: 1.5px;
        }

        .void-notice span {
          font-size: 8pt;
        }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5mm;
          margin-top: 6mm;
        }

        .detail-card {
          min-height: 37mm;
          padding: 5mm;
          border: 1px solid var(--receipt-border);
          border-radius: 4mm;
          background: #ffffff;
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 3mm;
        }

        .card-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 8mm;
          height: 8mm;
          flex: 0 0 auto;
          border-radius: 50%;
          background: var(--receipt-blue);
          color: #ffffff;
        }

        .card-icon.green {
          background: var(--receipt-green);
        }

        .card-title h3 {
          margin: 0;
          color: var(--receipt-blue);
          font-size: 9.6pt;
          font-weight: 900;
          letter-spacing: 0.2px;
        }

        .title-underline {
          width: 26mm;
          height: 0.45mm;
          margin-top: 1.8mm;
          background: var(--receipt-blue);
        }

        .customer-content {
          display: grid;
          gap: 2.5mm;
          margin-top: 4mm;
        }

        .customer-name {
          font-size: 11pt;
        }

        .customer-line {
          display: flex;
          align-items: center;
          gap: 2mm;
          color: #516072;
          font-size: 8.5pt;
        }

        .receipt-details-list {
          display: grid;
          gap: 0;
          margin: 4mm 0 0;
          font-size: 8.5pt;
        }

        .receipt-details-list div {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 4mm;
          padding: 2mm 0;
          border-bottom: 1px dashed #ccd7e4;
        }

        .receipt-details-list dt {
          color: #69778a;
        }

        .receipt-details-list dd {
          margin: 0;
          font-weight: 700;
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
          border-radius: 3mm;
          font-size: 8.3pt;
          table-layout: fixed;
        }

        .items-table thead tr {
          background: var(--receipt-blue);
          color: #ffffff;
        }

        .items-table th {
          padding: 3.1mm 2.6mm;
          border-right: 1px solid rgba(255, 255, 255, 0.25);
          font-weight: 800;
          text-align: left;
        }

        .items-table th:last-child {
          border-right: none;
        }

        .description-column {
          width: 42%;
        }

        .quantity-column {
          width: 10%;
          text-align: center !important;
        }

        .unit-column {
          width: 12%;
          text-align: center !important;
        }

        .price-column {
          width: 16%;
          text-align: right !important;
        }

        .amount-column {
          width: 20%;
          text-align: right !important;
        }

        .items-table td {
          padding: 3.2mm 2.6mm;
          border-top: 1px solid #dbe3ed;
          border-right: 1px solid #dbe3ed;
          background: #ffffff;
          vertical-align: top;
          word-break: break-word;
        }

        .items-table td:last-child {
          border-right: none;
        }

        .line-main {
          font-weight: 700;
          color: #1f2e44;
          line-height: 1.35;
        }

        .line-meta {
          margin-top: 1.2mm;
          color: #64748b;
          font-size: 7.8pt;
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
          font-weight: 800;
        }

        .bottom-grid {
          display: grid;
          grid-template-columns: 1.08fr 0.92fr;
          gap: 5mm;
          margin-top: 7mm;
          align-items: stretch;
        }

        .notes-card {
          min-height: 54mm;
          padding: 5mm;
          border: 1px solid #9ac68f;
          border-radius: 4mm;
          background: #ffffff;
        }

        .notes-head {
          display: flex;
          align-items: center;
          gap: 3mm;
        }

        .notes-head h3 {
          margin: 0;
          color: var(--receipt-green);
          font-size: 9.8pt;
          font-weight: 900;
        }

        .green-underline {
          width: 30mm;
          height: 0.45mm;
          margin-top: 1.8mm;
          background: var(--receipt-green);
        }

        .note-text {

          margin:
            5mm 0 0;

          color:
            #516072;

          font-size:
            8.6pt;

          line-height:
            1.55;

          white-space:
            pre-wrap;

          word-break:
            break-word;

        }


        .totals-card {
          overflow: hidden;
          border: 1px solid var(--receipt-border);
          border-radius: 4mm;
          background: #ffffff;
        }

        .totals-lines {
          display: grid;
          gap: 0;
          padding: 4.5mm 5.5mm;
          font-size: 8.8pt;
        }

        .totals-lines > div {
          display: flex;
          justify-content: space-between;
          gap: 5mm;
          padding: 2.2mm 0;
          border-bottom: 1px dashed #cbd5e1;
        }

        .totals-lines .total-line {
          margin-top: 0.8mm;
          padding-top: 2.8mm;
          border-bottom: 1px solid var(--receipt-blue);
          color: var(--receipt-blue);
          font-size: 10.5pt;
          font-weight: 900;
        }

        .balance-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 3.8mm 5.5mm;
          background: var(--receipt-blue);
          color: #ffffff;
          font-size: 9.7pt;
          font-weight: 900;
        }

        .thank-you-section {
          margin-top: 7mm;
          text-align: center;
        }

        .thank-you-section > p {
          margin: 0;
          color: var(--receipt-blue);
          font-size: 9.3pt;
          font-weight: 900;
          letter-spacing: 1.8px;
        }

        .thank-you-rule {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 4mm;
          width: 72%;
          margin: 4mm auto 0;
        }

        .thank-you-rule span {
          height: 0.4mm;
          background: var(--receipt-green);
        }

        .thank-you-logo-watermark {
          width: 18mm;
          height: 18mm;
          border-radius: 50%;
          background-image: url('/djallows-logo.png');
          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
          opacity: 0.14;
        }

        .footer-info {
          display: flex;
          justify-content: space-between;
          gap: 8mm;
          margin-top: 7mm;
          padding: 0 1mm;
          color: #415066;
          font-size: 7.4pt;
          font-weight: 700;
        }

        .receipt-footer {

          position:
            relative;

          right:
            auto;

          bottom:
            auto;

          left:
            auto;

          flex:
            0 0
            16mm;

          width:
            100%;

          height:
            16mm;

          margin-top:
            auto;

          overflow:
            hidden;

        }


        .footer-green {
          position: absolute;
          right: 52%;
          bottom: -11mm;
          left: -8%;
          height: 18mm;
          border-radius: 50%;
          background: var(--receipt-green);
        }

        .footer-blue {
          position: absolute;
          right: -8%;
          bottom: -10mm;
          left: 34%;
          height: 19mm;
          border-radius: 50%;
          background: var(--receipt-blue);
        }

        .void-watermark {
          position: absolute;
          top: 47%;
          left: 50%;
          z-index: 1;
          transform: translate(-50%, -50%) rotate(-28deg);
          color: rgba(185, 28, 28, 0.08);
          font-size: 68pt;
          font-weight: 900;
          letter-spacing: 8px;
          pointer-events: none;
        }

        .receipt-screen-wrap {
          overflow-x: auto;
          padding-bottom: 8mm;
        }

        @media print {

          @page {

            size:
              A4 portrait;

            margin:
              8mm 10mm 20mm;

          }


          html,
          body {

            width:
              auto !important;

            height:
              auto !important;

            margin:
              0 !important;

            padding:
              0 !important;

            overflow:
              visible !important;

            background:
              #ffffff !important;

            -webkit-print-color-adjust:
              exact !important;

            print-color-adjust:
              exact !important;

            color-adjust:
              exact !important;

            forced-color-adjust:
              none !important;

          }


          body > *:not(
            #receipt-print-root
          ) {

            display:
              none !important;

          }


          #receipt-print-root {

            display:
              block !important;

            position:
              static !important;

            width:
              auto !important;

            height:
              auto !important;

            margin:
              0 !important;

            padding:
              0 !important;

            overflow:
              visible !important;

            background:
              #ffffff !important;

          }


          #receipt-print-root
          .receipt-document {

            display:
              block !important;

            width:
              190mm !important;

            max-width:
              190mm !important;

            min-height: 0 !important;

            height:
              auto !important;

            margin:
              0 auto !important;

            overflow:
              visible !important;

            border:
              none !important;

            border-radius:
              0 !important;

            box-shadow:
              none !important;

            background:
              #ffffff !important;

          }


          #receipt-print-root
          .receipt-content {

            box-sizing:
              border-box !important;

            min-height: 0 !important;

            padding:
              8mm
              8mm
              8mm !important;

          }


          #receipt-print-root
          .receipt-footer {

            position:
              fixed !important;

            left:
              10mm !important;

            right:
              10mm !important;

            bottom:
              4mm !important;

            width:
              auto !important;

            height:
              14mm !important;

            margin:
              0 !important;

            overflow:
              hidden !important;

            break-inside:
              avoid !important;

            page-break-inside:
              avoid !important;

          }


          #receipt-print-root
          .items-table {

            break-inside:
              auto !important;

            page-break-inside:
              auto !important;

          }


          #receipt-print-root
          .items-table
          thead {

            display:
              table-header-group !important;

          }


          #receipt-print-root
          .items-table
          tbody
          tr {

            break-inside:
              avoid !important;

            page-break-inside:
              avoid !important;

          }


          #receipt-print-root
          .details-grid,

          #receipt-print-root
          .detail-card,

          #receipt-print-root
          .bottom-grid,

          #receipt-print-root
          .notes-card,

          #receipt-print-root
          .totals-card,

          #receipt-print-root
          .thank-you-section,

          #receipt-print-root
          .footer-info {
            break-after: avoid-page !important;
            page-break-after: avoid !important;

            break-inside:
              avoid !important;

            page-break-inside:
              avoid !important;

          }


          #receipt-print-root
          * {

            -webkit-print-color-adjust:
              exact !important;

            print-color-adjust:
              exact !important;

            color-adjust:
              exact !important;

            forced-color-adjust:
              none !important;

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