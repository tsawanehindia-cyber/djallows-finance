"use client";

import InvoiceForm from "@/components/InvoiceForm";

export default function NewReceiptPage() {
  return (
    <InvoiceForm
      mode="create"
      documentKind="direct_receipt"
    />
  );
}
