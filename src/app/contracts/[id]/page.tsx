"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Printer } from "lucide-react";

import FinancePageShell from "@/components/FinancePageShell";
import DocumentLetterhead, {
  DocumentFooter,
  DocumentSignatureBlock,
} from "@/components/DocumentLetterhead";
import { supabase } from "@/lib/supabase";

type ContractRow = {
  id: string;
  business_id: string;
  contract_number: string;
  title: string;
  contract_date: string;
  terms: string;
  status: string;
};

function formatDate(value: string) {
  const clean = String(value).slice(0, 10);
  const date = new Date(`${clean}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return clean;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function PrintableAgreement({
  contract,
}: {
  contract: ContractRow;
}) {
  return (
    <article className="agreement-document">
      <div
        className="agreement-watermark"
        aria-hidden="true"
      />

      <div className="agreement-content">
        <DocumentLetterhead
          documentTitle="AGREEMENT"
          documentNumber={contract.contract_number}
          documentDate={formatDate(contract.contract_date)}
        />

        <div className="agreement-divider">
          <div className="blue" />
          <div className="green" />
        </div>

        <section className="agreement-title">
          <h1>{contract.title}</h1>
        </section>

        <section className="agreement-body">
          {contract.terms}
        </section>

        <section className="agreement-signatures">
          <DocumentSignatureBlock />
        </section>

        <DocumentFooter />
      </div>
    </article>
  );
}

export default function ContractDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const contractId =
    typeof params.id === "string" ? params.id : "";

  const [mounted, setMounted] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contract, setContract] =
    useState<ContractRow | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadContract() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        const { data: membership, error: membershipError } =
          await supabase
            .from("business_members")
            .select("business_id")
            .eq("user_id", session.user.id)
            .limit(1)
            .maybeSingle();

        if (membershipError || !membership) {
          throw new Error(
            "Unable to find your business access."
          );
        }

        const { data, error: contractError } =
          await supabase
            .from("contracts")
            .select(
              `
                id,
                business_id,
                contract_number,
                title,
                contract_date,
                terms,
                status
              `
            )
            .eq("id", contractId)
            .eq(
              "business_id",
              membership.business_id
            )
            .maybeSingle();

        if (contractError || !data) {
          throw new Error(
            contractError?.message ||
              "Agreement not found."
          );
        }

        if (!active) return;

        setContract(data as ContractRow);
        setLoading(false);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load agreement."
          );
          setLoading(false);
        }
      }
    }

    if (contractId) {
      loadContract();
    }

    return () => {
      active = false;
    };
  }, [contractId, router]);

  function printAgreement() {
    setPrinting(true);

    window.setTimeout(() => {
      window.print();
    }, 250);
  }

  useEffect(() => {
    function afterPrint() {
      setPrinting(false);
    }

    window.addEventListener("afterprint", afterPrint);

    return () => {
      window.removeEventListener(
        "afterprint",
        afterPrint
      );
    };
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#edf3ef]">
        <Loader2
          size={34}
          className="animate-spin text-[#17488f]"
        />
      </main>
    );
  }

  if (error || !contract) {
    return (
      <FinancePageShell
        eyebrow="Contracts & Agreements"
        title="Agreement"
        description="Official Djallows Farm agreement."
      >
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 font-semibold text-red-800">
          {error || "Agreement not found."}
        </div>
      </FinancePageShell>
    );
  }

  return (
    <>
      <style>{`
        #agreement-print-root {
          display: none;
        }

        .agreement-document {
          position: relative;
          box-sizing: border-box;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          overflow: hidden;
          background: #ffffff;
          color: #263548;
          font-family: Arial, Helvetica, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .agreement-watermark {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image: url('/djallows-logo.png');
          background-repeat: no-repeat;
          background-position: center 52%;
          background-size: 90mm;
          opacity: 0.025;
        }

        .agreement-content {
          position: relative;
          z-index: 1;
          padding: 14mm 16mm 13mm;
        }

        .agreement-divider {
          display: grid;
          grid-template-columns: 3fr 1fr;
          gap: 2mm;
          margin-top: 5mm;
        }

        .agreement-divider div {
          height: 1.4mm;
        }

        .agreement-divider .blue {
          background: #17488f;
        }

        .agreement-divider .green {
          background: #2d9b45;
        }

        .agreement-title {
          margin-top: 10mm;
          text-align: center;
        }

        .agreement-title h1 {
          margin: 0 auto;
          max-width: 160mm;
          color: #17243a;
          font-size: 18pt;
          line-height: 1.3;
          font-weight: 900;
        }

        .agreement-body {
          margin-top: 11mm;
          color: #37465a;
          font-size: 10pt;
          line-height: 1.75;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .agreement-signatures {
          margin-top: 16mm;
          break-inside: avoid;
        }

        @media screen {
          .agreement-screen-wrap {
            overflow-x: auto;
            padding: 4px 0 12px;
          }

          .agreement-document {
            border: 1px solid #d8e0ea;
            border-radius: 4mm;
            box-shadow: 0 18px 40px rgba(15,23,42,0.08);
          }
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          body > *:not(#agreement-print-root) {
            display: none !important;
          }

          #agreement-print-root {
            display: block !important;
          }

          #agreement-print-root .agreement-document {
            width: 210mm !important;
            min-height: 297mm !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          #agreement-print-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }

        @media screen and (max-width: 900px) {
          .agreement-document {
            min-width: 794px;
          }
        }
      `}</style>

      <FinancePageShell
        eyebrow="Contracts & Agreements"
        title={contract.contract_number}
        description={contract.title}
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/contracts"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#17488f] hover:underline"
            >
              <ArrowLeft size={16} />
              Back to Contracts
            </Link>

            <button
              type="button"
              onClick={printAgreement}
              className="inline-flex items-center gap-2 rounded-xl bg-[#17488f] px-4 py-2.5 text-sm font-bold text-white shadow-sm"
            >
              <Printer size={17} />
              Print / Save PDF
            </button>
          </div>

          <div className="agreement-screen-wrap">
            <PrintableAgreement contract={contract} />
          </div>
        </div>
      </FinancePageShell>

      {mounted &&
        printing &&
        createPortal(
          <div id="agreement-print-root">
            <PrintableAgreement contract={contract} />
          </div>,
          document.body
        )}
    </>
  );
}
