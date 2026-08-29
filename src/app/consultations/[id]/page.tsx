"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  Loader2,
  Printer,
} from "lucide-react";

import FinancePageShell from "@/components/FinancePageShell";

import DocumentLetterhead, {
  DocumentFooter,
} from "@/components/DocumentLetterhead";

import { supabase } from "@/lib/supabase";
const RICH_TEXT_PREFIX =
  "__DJALLOWS_RICH_TEXT_V1__";


type Advisory = {
  id: string;
  business_id: string;
  contract_number: string;
  title: string;
  party_name: string;
  party_address: string | null;
  contract_date: string;
  terms: string;
};

type AdvisoryDocumentProps = {
  advisory: Advisory;
  signatureSrc: string;
};


// ============================================================
// DATE
// ============================================================

function formatDate(
  value: string
) {
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
      month: "long",
      year: "numeric",
    }
  ).format(date);
}


// ============================================================
// CONVERT REMOTE SIGNATURE TO PRINT-SAFE DATA IMAGE
// ============================================================

async function makePrintableSignature(
  url: string
) {
  if (!url) {
    return "";
  }

  try {
    const response =
      await fetch(
        url,
        {
          cache: "no-store",
        }
      );

    if (!response.ok) {
      return url;
    }

    const blob =
      await response.blob();

    return await new Promise<string>(
      (
        resolve,
        reject
      ) => {
        const reader =
          new FileReader();

        reader.onloadend =
          () => {
            if (
              typeof reader.result ===
              "string"
            ) {
              resolve(
                reader.result
              );
            } else {
              reject(
                new Error(
                  "Unable to read signature image."
                )
              );
            }
          };

        reader.onerror =
          () => {
            reject(
              new Error(
                "Unable to read signature image."
              )
            );
          };

        reader.readAsDataURL(
          blob
        );
      }
    );
  } catch {
    return url;
  }
}


// ============================================================
// PRELOAD FALLBACK REMOTE IMAGE
// ============================================================

function preloadImage(
  src: string
) {
  return new Promise<void>(
    (resolve) => {
      if (!src) {
        resolve();
        return;
      }

      if (
        src.startsWith(
          "data:"
        )
      ) {
        resolve();
        return;
      }

      const image =
        new Image();

      image.onload =
        () => resolve();

      image.onerror =
        () => resolve();

      image.src =
        src;

      if (image.complete) {
        resolve();
      }
    }
  );
}


// ============================================================
// PRINTABLE DOCUMENT
// ============================================================

function AdvisoryDocument({
  advisory,
  signatureSrc,
}: AdvisoryDocumentProps) {
  return (
    <article className="advisory-document">

      {/* WATERMARK */}

      <div
        className="advisory-watermark"
        aria-hidden="true"
      />


      <div className="advisory-content">

        {/* OFFICIAL LETTERHEAD */}

        <DocumentLetterhead
          documentTitle="CONSULTATION & ADVISORY"
          documentNumber={
            advisory.contract_number
          }
          documentDate={
            formatDate(
              advisory.contract_date
            )
          }
        />


        {/* BRAND DIVIDER */}

        <div className="advisory-divider">

          <div className="blue" />

          <div className="green" />

        </div>


        {/* RECIPIENT */}

        <section className="letter-details">

          <p>
            <strong>
              To:
            </strong>{" "}
            {advisory.party_name}
          </p>


          {advisory.party_address && (
            <p>

              <strong>
                Location:
              </strong>{" "}

              {
                advisory.party_address
              }

            </p>
          )}


          <p className="subject">

            <strong>
              Subject:
            </strong>{" "}

            {
              advisory.title
            }

          </p>

        </section>


        {/* LETTER BODY */}

        <section className="letter-body">

          <p className="salutation">

            Dear{" "}
            {advisory.party_name},

          </p>


          {advisory.terms.startsWith(
            RICH_TEXT_PREFIX
          ) ? (
            <div
              className="recommendations advisory-rich-content"
              dangerouslySetInnerHTML={{
                __html:
                  advisory.terms.slice(
                    RICH_TEXT_PREFIX.length
                  ),
              }}
            />
          ) : (
            <div className="recommendations">
              {advisory.terms}
            </div>
          )}


          {/* SIGN-OFF */}

          <div className="closing">

            <p className="regards">

              Regards,

            </p>


            <div className="signature-area">

              {signatureSrc ? (

                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    signatureSrc
                  }
                  alt="CEO / Manager Signature"
                  className="manager-signature"
                />

              ) : null}

            </div>


            <div className="manager-line" />


            <p className="manager-title">

              CEO / MANAGER

            </p>


            <p className="company-name">

              Djallows Farm and Consulting

            </p>

          </div>

        </section>


        {/* OFFICIAL FOOTER */}

        <DocumentFooter />

      </div>

    </article>
  );
}


// ============================================================
// PAGE
// ============================================================

export default function AdvisoryDetailPage() {
  const router =
    useRouter();

  const params =
    useParams<{
      id: string;
    }>();

  const id =
    typeof params.id ===
      "string"
      ? params.id
      : "";


  const [
    mounted,
    setMounted,
  ] =
    useState(false);


  const [
    printing,
    setPrinting,
  ] =
    useState(false);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    advisory,
    setAdvisory,
  ] =
    useState<
      Advisory | null
    >(null);


  const [
    signatureSrc,
    setSignatureSrc,
  ] =
    useState("");


  // ==========================================================
  // MOUNT
  // ==========================================================

  useEffect(() => {
    setMounted(true);
  }, []);


  // ==========================================================
  // LOAD ADVISORY + SIGNATURE
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
          await supabase.auth
            .getSession();


        if (
          sessionError ||
          !session
        ) {

          router.replace(
            "/login"
          );

          return;
        }


        // ----------------------------------------------
        // BUSINESS ACCESS
        // ----------------------------------------------

        const {
          data:
            membership,
          error:
            membershipError,
        } =
          await supabase
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
          !membership
        ) {

          throw new Error(
            "Unable to find your business access."
          );
        }


        // ----------------------------------------------
        // ADVISORY
        // ----------------------------------------------

        const {
          data:
            advisoryData,
          error:
            advisoryError,
        } =
          await supabase
            .from(
              "contracts"
            )
            .select(
              `
                id,
                business_id,
                contract_number,
                title,
                party_name,
                party_address,
                contract_date,
                terms
              `
            )
            .eq(
              "id",
              id
            )
            .eq(
              "business_id",
              membership.business_id
            )
            .eq(
              "contract_type",
              "consultancy"
            )
            .maybeSingle();


        if (
          advisoryError ||
          !advisoryData
        ) {

          throw new Error(
            advisoryError?.message ||
              "Consultation record not found."
          );
        }


        // ----------------------------------------------
        // CEO / MANAGER SIGNATURE
        // ----------------------------------------------

        const {
          data:
            businessData,
          error:
            businessError,
        } =
          await supabase
            .from(
              "businesses"
            )
            .select(
              "signature_url"
            )
            .eq(
              "id",
              advisoryData.business_id
            )
            .maybeSingle();


        if (businessError) {

          console.error(
            "Unable to load signature:",
            businessError
          );
        }


        const remoteSignature =
          typeof businessData
            ?.signature_url ===
            "string"
            ? businessData
                .signature_url
            : "";


        // IMPORTANT:
        // Convert to embedded data image so
        // Chrome Print / Save PDF cannot lose it.

        const printableSignature =
          remoteSignature
            ? await makePrintableSignature(
                remoteSignature
              )
            : "";


        if (!active) {
          return;
        }


        setAdvisory(
          advisoryData as Advisory
        );


        setSignatureSrc(
          printableSignature ||
            remoteSignature
        );


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
              : "Unable to load consultation."
          );


          setLoading(false);

        }
      }
    }


    if (id) {
      void loadPage();
    }


    return () => {
      active = false;
    };

  }, [
    id,
    router,
  ]);


  // ==========================================================
  // PRINT
  // ==========================================================

  async function printDocument() {

    /*
      The signature is loaded BEFORE the print
      portal is created.

      This prevents the problem where the
      signature appears on screen but disappears
      from Chrome Print / Save as PDF.
    */

    await preloadImage(
      signatureSrc
    );


    setPrinting(true);


    window.setTimeout(
      () => {

        window.print();

      },
      400
    );
  }


  // ==========================================================
  // AFTER PRINT
  // ==========================================================

  useEffect(() => {

    function afterPrint() {

      setPrinting(false);

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
  // LOADING
  // ==========================================================

  if (loading) {

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#edf3ef]">

        <div className="text-center">

          <Loader2
            size={34}
            className="mx-auto animate-spin text-[#17488f]"
          />


          <p className="mt-3 text-sm font-semibold text-slate-600">

            Loading consultation...

          </p>

        </div>

      </main>
    );
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    error ||
    !advisory
  ) {

    return (
      <FinancePageShell
        eyebrow="Consultation & Advisory"
        title="Advisory"
        description="Official consultation record."
      >

        <div className="rounded-xl border border-red-200 bg-red-50 p-5 font-semibold text-red-800">

          {
            error ||
            "Consultation record not found."
          }

        </div>

      </FinancePageShell>
    );
  }


  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <>

      <style>{`

        /* ====================================================
           PRINT PORTAL
        ==================================================== */

        #advisory-print-root {
          display: none;
        }


        /* ====================================================
           A4 DOCUMENT
        ==================================================== */

        .advisory-document {

          position:
            relative;

          box-sizing:
            border-box;

          width:
            210mm;

          min-height:
            297mm;

          margin:
            0 auto;

          overflow:
            hidden;

          background:
            #ffffff;

          color:
            #263548;

          font-family:
            Arial,
            Helvetica,
            sans-serif;

          -webkit-print-color-adjust:
            exact;

          print-color-adjust:
            exact;
        }


        /* ====================================================
           WATERMARK
        ==================================================== */

        .advisory-watermark {

          position:
            absolute;

          inset:
            0;

          z-index:
            0;

          pointer-events:
            none;

          background-image:
            url('/djallows-logo.png');

          background-repeat:
            no-repeat;

          background-position:
            center 55%;

          background-size:
            90mm;

          opacity:
            0.025;
        }


        /* ====================================================
           CONTENT
        ==================================================== */

        .advisory-content {

          position:
            relative;

          z-index:
            1;

          padding:
            14mm
            16mm
            13mm;
        }


        /* ====================================================
           MAKE ONLY THE ADVISORY TITLE SMALLER

           Invoice and Receipt titles are NOT changed.
        ==================================================== */

        .advisory-document
        header
        > div
        > div:last-child
        > p:first-child {

          font-size:
            14px !important;

          line-height:
            1.08 !important;

          letter-spacing:
            0.045em !important;
        }


        /* ====================================================
           BRAND DIVIDER
        ==================================================== */

        .advisory-divider {

          display:
            grid;

          grid-template-columns:
            3fr
            1fr;

          gap:
            2mm;

          margin-top:
            5mm;
        }


        .advisory-divider div {

          height:
            1.4mm;
        }


        .advisory-divider .blue {

          background:
            #17488f;
        }


        .advisory-divider .green {

          background:
            #2d9b45;
        }


        /* ====================================================
           TO / LOCATION / SUBJECT
        ==================================================== */

        .letter-details {

          margin-top:
            11mm;

          font-size:
            10pt;

          line-height:
            1.7;
        }


        .letter-details p {

          margin:
            0
            0
            2mm;
        }


        .letter-details .subject {

          margin-top:
            4mm;
        }


        /* ====================================================
           BODY
        ==================================================== */

        .letter-body {

          margin-top:
            9mm;

          font-size:
            10pt;

          line-height:
            1.75;
        }


        .salutation {

          font-weight:
            700;
        }


        .recommendations {

          margin-top:
            6mm;

          white-space:
            pre-wrap;

          word-break:
            break-word;
        }
        .advisory-rich-content {
          white-space:
            normal;
        }

        .advisory-rich-content p {
          margin:
            0 0
            3mm;
        }

        .advisory-rich-content h1 {
          margin:
            5mm 0
            3mm;

          font-size:
            20pt;

          font-weight:
            800;

          line-height:
            1.25;
        }

        .advisory-rich-content h2 {
          margin:
            4mm 0
            2.5mm;

          font-size:
            16pt;

          font-weight:
            800;

          line-height:
            1.3;
        }

        .advisory-rich-content h3 {
          margin:
            4mm 0
            2mm;

          font-size:
            13pt;

          font-weight:
            700;
        }

        .advisory-rich-content ul {
          margin:
            2mm 0
            4mm;

          padding-left:
            7mm;

          list-style:
            disc;
        }

        .advisory-rich-content ol {
          margin:
            2mm 0
            4mm;

          padding-left:
            7mm;

          list-style:
            decimal;
        }

        .advisory-rich-content li {
          margin-bottom:
            1.5mm;
        }

        .advisory-rich-content blockquote {
          margin:
            4mm 0;

          padding-left:
            4mm;

          border-left:
            1mm solid
            #17488f;

          color:
            #475569;

          font-style:
            italic;
        }


        /* ====================================================
           SIGNATURE
        ==================================================== */

        .closing {

          width:
            68mm;

          margin-top:
            14mm;

          break-inside:
            avoid;

          page-break-inside:
            avoid;
        }


        .regards {

          margin:
            0;

          color:
            #1f2937;

          font-weight:
            800;
        }


        .signature-area {

          display:
            flex;

          align-items:
            flex-end;

          justify-content:
            flex-start;

          width:
            60mm;

          height:
            15mm;

          margin-top:
            2mm;

          overflow:
            hidden;
        }


        .manager-signature {

          display:
            block;

          width:
            auto;

          height:
            auto;

          max-width:
            50mm;

          max-height:
            14mm;

          object-fit:
            contain;
        }


        .manager-line {

          width:
            55mm;

          margin-top:
            1mm;

          border-top:
            1px solid
            #64748b;
        }


        .manager-title {

          margin-top:
            2mm;

          margin-bottom:
            0;

          font-size:
            8pt;

          font-weight:
            900;

          text-transform:
            uppercase;
        }


        .company-name {

          margin-top:
            1mm;

          margin-bottom:
            0;

          color:
            #64748b;

          font-size:
            7pt;

          font-weight:
            700;
        }


        /* ====================================================
           SCREEN
        ==================================================== */

        @media screen {

          .advisory-screen {

            overflow-x:
              auto;

            padding-bottom:
              12px;
          }


          .advisory-document {

            border:
              1px solid
              #d8e0ea;

            border-radius:
              4mm;

            box-shadow:
              0
              18px
              40px
              rgba(
                15,
                23,
                42,
                0.08
              );
          }
        }


        /* ====================================================
           PRINT / SAVE PDF
        ==================================================== */

        @media print {

          @page {

            size:
              A4 portrait;

            margin:
              0;
          }


          html,
          body {

            margin:
              0 !important;

            padding:
              0 !important;

            background:
              #ffffff !important;
          }


          body
          > *
          :not(
            #advisory-print-root
          ) {
          }


          body > *:not(
            #advisory-print-root
          ) {

            display:
              none !important;
          }


          #advisory-print-root {

            display:
              block !important;
          }


          #advisory-print-root
          .advisory-document {

            width:
              210mm !important;

            min-height:
              297mm !important;

            border:
              none !important;

            border-radius:
              0 !important;

            box-shadow:
              none !important;
          }


          /*
             FORCE SIGNATURE INTO PRINT OUTPUT
          */

          #advisory-print-root
          .signature-area {

            display:
              flex !important;

            visibility:
              visible !important;

            opacity:
              1 !important;
          }


          #advisory-print-root
          .manager-signature {

            display:
              block !important;

            visibility:
              visible !important;

            opacity:
              1 !important;

            max-width:
              50mm !important;

            max-height:
              14mm !important;

            -webkit-print-color-adjust:
              exact !important;

            print-color-adjust:
              exact !important;
          }


          #advisory-print-root * {

            -webkit-print-color-adjust:
              exact !important;

            print-color-adjust:
              exact !important;
          }
        }


        /* ====================================================
           SMALL SCREEN
        ==================================================== */

        @media screen and
        (max-width: 900px) {

          .advisory-document {

            min-width:
              794px;
          }
        }

      `}</style>


      <FinancePageShell
        eyebrow="Consultation & Advisory"
        title={
          advisory.contract_number
        }
        description={
          advisory.title
        }
      >

        <div className="space-y-5">


          {/* ACTION BAR */}

          <div className="flex flex-wrap items-center justify-between gap-3">

            <Link
              href="/consultations"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#17488f]"
            >

              <ArrowLeft
                size={16}
              />

              Back to Consultation & Advisory

            </Link>


            <button
              type="button"
              onClick={
                printDocument
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#17488f] px-4 py-2.5 text-sm font-bold text-white shadow-sm"
            >

              <Printer
                size={17}
              />

              Print / Save PDF

            </button>

          </div>


          {/* SCREEN DOCUMENT */}

          <div className="advisory-screen">

            <AdvisoryDocument
              advisory={
                advisory
              }
              signatureSrc={
                signatureSrc
              }
            />

          </div>

        </div>

      </FinancePageShell>


      {/* ======================================================
          PRINT DOCUMENT

          Uses the SAME already-loaded signature.
      ====================================================== */}

      {mounted &&
        printing &&
        createPortal(

          <div id="advisory-print-root">

            <AdvisoryDocument
              advisory={
                advisory
              }
              signatureSrc={
                signatureSrc
              }
            />

          </div>,

          document.body
        )}

    </>
  );
}

