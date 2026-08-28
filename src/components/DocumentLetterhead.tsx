import Image from "next/image";

type DocumentLetterheadProps = {
  documentTitle?: string;
  documentNumber?: string;
  documentDate?: string;
  className?: string;
};

export default function DocumentLetterhead({
  documentTitle,
  documentNumber,
  documentDate,
  className = "",
}: DocumentLetterheadProps) {
  return (
    <header
      className={`border-b-2 border-[#0b5136] pb-5 ${className}`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

        {/* ======================================================
            DJALLOWS FARM BRAND
        ====================================================== */}

        <div className="flex items-center gap-4">

          <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2">

            <Image
              src="/djallows-logo.png"
              alt="Djallows Farm"
              width={64}
              height={64}
              className="h-full w-full object-contain"
              priority
            />

          </div>

          <div>

            <h1 className="text-[24px] font-black leading-tight text-[#0b5136]">
              Djallows Farm
            </h1>

            <p className="mt-1 text-[13px] font-bold italic text-emerald-700">
              Success Through Sheep Farming
            </p>

            <div className="mt-2 space-y-0.5 text-[12px] font-medium text-slate-600">

              <p>
                Tujereng, The Gambia
              </p>

              <p>
                Tel: +220 789 3464
              </p>

            </div>

          </div>

        </div>

        {/* ======================================================
            DOCUMENT INFORMATION
        ====================================================== */}

        {(documentTitle ||
          documentNumber ||
          documentDate) && (
          <div className="sm:text-right">

            {documentTitle && (
              <p className="text-[24px] font-black uppercase tracking-[0.08em] text-slate-950">
                {documentTitle}
              </p>
            )}

            {documentNumber && (
              <p className="mt-2 text-[14px] font-black text-[#0b5136]">
                {documentNumber}
              </p>
            )}

            {documentDate && (
              <p className="mt-1 text-[12px] font-semibold text-slate-600">
                {documentDate}
              </p>
            )}

          </div>
        )}

      </div>
    </header>
  );
}