import Image from "next/image";

import ManagerSignatureImage from "@/components/ManagerSignatureImage";

type DocumentLetterheadProps = {
  documentTitle?: string;
  documentNumber?: string;
  documentDate?: string;
  className?: string;
};

type DocumentSignatureBlockProps = {
  className?: string;
};

type DocumentFooterProps = {
  className?: string;
};

function numberLabel(
  documentTitle?: string
) {
  if (
    documentTitle ===
    "RECEIPT"
  ) {
    return "Receipt No.";
  }

  if (
    documentTitle ===
    "INVOICE"
  ) {
    return "Invoice No.";
  }

  if (
    documentTitle ===
      "CONTRACT" ||
    documentTitle ===
      "AGREEMENT" ||
    documentTitle ===
      "CONTRACT / AGREEMENT" ||
    documentTitle ===
      "CONSULTATION & ADVISORY"
  ) {
    return "Reference No.";
  }

  return "Document No.";
}

export default function DocumentLetterhead({
  documentTitle,
  documentNumber,
  documentDate,
  className = "",
}: DocumentLetterheadProps) {
  return (
    <header
      className={
        "document-letterhead w-full bg-white text-slate-900 " +
        className
      }
    >
      <div className="grid grid-cols-[78px_minmax(0,1fr)_172px] items-start gap-4">

        {/* LOGO */}

        <div className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden">

          <Image
            src="/djallows-logo.png"
            alt="Djallows Farm and Consulting"
            width={76}
            height={76}
            priority
            className="h-[76px] w-[76px] scale-[1.08] object-contain"
          />

        </div>


        {/* BUSINESS INFORMATION */}

        <div className="min-w-0 pt-1">

          <h1 className="text-[20px] font-black leading-[1.05] tracking-[0.025em] text-[#17488f]">

            DJALLOWS FARM AND CONSULTING

          </h1>


          <p className="mt-1.5 text-[10.5px] font-bold italic leading-tight text-[#c43d3d]">

            Expert Livestock Management &amp; Agribusiness Solutions

          </p>


          <div className="mt-3 space-y-1 text-[9px] font-semibold leading-[1.35] text-slate-600">

            <p>

              Tujereng, West Coast Region, The Gambia

            </p>


            <p>

              <span className="font-bold text-slate-700">

                +220 789 3464

              </span>

              <span className="mx-1.5 text-slate-300">

                |

              </span>

              <span>

                eblasandson2@gmail.com

              </span>

            </p>


            <p>

              <span>
                Facebook
              </span>

              <span className="mx-1 text-slate-300">
                |
              </span>

              <span>
                YouTube
              </span>

              <span className="mx-1 text-slate-300">
                |
              </span>

              <span>
                TikTok
              </span>

              <span className="mx-1 text-slate-300">
                |
              </span>

              <span className="font-black text-[#17488f]">

                @DjallowsFarm

              </span>

            </p>

          </div>

        </div>


        {/* DOCUMENT INFORMATION */}

        <div className="min-h-[76px] border-l border-slate-200 pl-5 text-right">

          {documentTitle && (

            <p className="text-[25px] font-black uppercase leading-none tracking-[0.075em] text-[#17488f]">

              {documentTitle}

            </p>

          )}


          {documentNumber && (

            <div className="mt-3 inline-block min-w-[122px] border border-slate-200 bg-slate-50 px-3 py-2">

              <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">

                {numberLabel(
                  documentTitle
                )}

              </p>


              <p className="mt-1 whitespace-nowrap text-[10px] font-black text-[#17488f]">

                {documentNumber}

              </p>

            </div>

          )}


          {documentDate && (

            <p className="mt-2 text-[8px] font-bold text-slate-500">

              {documentDate}

            </p>

          )}

        </div>

      </div>

    </header>
  );
}


export function DocumentSignatureBlock({
  className = "",
}: DocumentSignatureBlockProps) {
  return (
    <section
      className={
        "document-signatures grid grid-cols-2 gap-[22mm] [break-inside:avoid] " +
        className
      }
    >

      {/* CUSTOMER SIGNATURE */}

      <div>

        <div className="h-[12mm]" />


        <div className="border-t border-slate-500 pt-2 text-center">

          <p className="text-[8px] font-black uppercase tracking-[0.055em] text-slate-700">

            Customer / Client Signature

          </p>


          <p className="mt-1 text-[6.5px] font-medium text-slate-400">

            Name, Signature &amp; Date

          </p>

        </div>

      </div>


      {/* CEO / MANAGER SIGNATURE */}

      <div>

        <div
          className="manager-electronic-signature flex h-[12mm] items-end justify-center"
          aria-label="CEO or Manager electronic signature area"
        >

          <ManagerSignatureImage />

        </div>


        <div className="border-t border-slate-500 pt-2 text-center">

          <p className="text-[8px] font-black uppercase tracking-[0.055em] text-slate-700">

            CEO / Manager Signature

          </p>


          <p className="mt-1 text-[6.5px] font-medium text-slate-400">

            Authorized Signatory

          </p>

        </div>

      </div>

    </section>
  );
}


export function DocumentFooter({
  className = "",
}: DocumentFooterProps) {
  return (
    <footer
      className={
        "document-footer border-t border-slate-200 pt-3 text-[7px] font-semibold text-slate-500 " +
        className
      }
    >

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">

        <span className="font-black text-[#17488f]">

          DJALLOWS FARM AND CONSULTING

        </span>


        <span className="text-center">

          +220 789 3464

          <span className="mx-1 text-slate-300">

            |

          </span>

          @DjallowsFarm

        </span>


        <span className="text-right">

          Tujereng, West Coast Region, The Gambia

        </span>

      </div>


      <div className="mt-2 flex h-[3px] gap-2">

        <div className="w-[70%] bg-[#17488f]" />

        <div className="flex-1 bg-[#2d9b45]" />

      </div>

    </footer>
  );
}
