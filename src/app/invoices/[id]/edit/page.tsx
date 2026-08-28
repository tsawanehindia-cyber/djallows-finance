"use client";

import { useParams } from "next/navigation";
import InvoiceForm from "@/components/InvoiceForm";

export default function EditInvoicePage() {
  const params = useParams();
  const invoiceId = String(params.id ?? "");

  return <InvoiceForm mode="edit" invoiceId={invoiceId} />;
}
