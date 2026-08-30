/* eslint-disable @typescript-eslint/no-require-imports */

const fs =
  require("node:fs");

const path =
  require("node:path");


const root =
  process.cwd();


const incomePath =
  path.join(
    root,
    "src",
    "app",
    "income",
    "page.tsx"
  );


const dashboardPath =
  path.join(
    root,
    "src",
    "app",
    "page.tsx"
  );


let income =
  fs.readFileSync(
    incomePath,
    "utf8"
  );


let dashboard =
  fs.readFileSync(
    dashboardPath,
    "utf8"
  );


// ============================================================
// 1. IMPROVE INCOME TABLE WIDTHS
// ============================================================

const oldWidths = `              className={\`w-full table-fixed text-left \${\{
                isOwnerOrAdmin
                  ? "min-w-[1530px]"
                  : "min-w-[1370px]"
              \}}\`}
            >

              <colgroup>

                {isOwnerOrAdmin && (
                  <col className="w-[70px]" />
                )}

                <col className="w-[145px]" />
                <col className="w-[300px]" />
                <col className="w-[170px]" />
                <col className="w-[180px]" />
                <col className="w-[265px]" />
                <col className="w-[175px]" />
                <col className="w-[220px]" />`;


const newWidths = `              className={\`w-full table-fixed text-left \${\{
                isOwnerOrAdmin
                  ? "min-w-[1450px]"
                  : "min-w-[1390px]"
              \}}\`}
            >

              <colgroup>

                {isOwnerOrAdmin && (
                  <col className="w-[60px]" />
                )}

                <col className="w-[145px]" />
                <col className="w-[245px]" />
                <col className="w-[165px]" />
                <col className="w-[180px]" />
                <col className="w-[300px]" />
                <col className="w-[165px]" />
                <col className="w-[190px]" />`;


if (
  !income.includes(
    oldWidths
  )
) {

  throw new Error(
    "Income table width section was not found. Nothing was changed."
  );
}


income =
  income.replace(
    oldWidths,
    newWidths
  );


// ============================================================
// 2. REMOVE CONFUSING SYSTEM NUMBER FROM DESCRIPTION
// ============================================================

const oldDescription = `                        <td className="px-6 py-5 align-middle">

                          <p className="text-[15px] font-bold leading-6 text-slate-950">
                            {
                              transaction.description
                            }
                          </p>

                          <p className="mt-1 text-[13px] font-medium text-slate-500">
                            {
                              transaction.transaction_number
                            }
                          </p>

                        </td>`;


const newDescription = `                        <td className="px-5 py-4 align-top">

                          <p className="text-[15px] font-bold leading-6 text-slate-950">
                            {
                              transaction.description
                            }
                          </p>

                        </td>`;


if (
  !income.includes(
    oldDescription
  )
) {

  throw new Error(
    "Income description section was not found. Nothing was changed."
  );
}


income =
  income.replace(
    oldDescription,
    newDescription
  );


// ============================================================
// 3. PREPARE REFERENCE + NOTE AS SEPARATE VALUES
// ============================================================

const oldCanEdit = `                    const canEdit =
                      canEditTransaction(
                        transaction
                      );

                    return (`;


const newCanEdit = `                    const canEdit =
                      canEditTransaction(
                        transaction
                      );


                    const noteParts =
                      (
                        transaction.notes ??
                        ""
                      )
                        .split(
                          " · "
                        )
                        .map(
                          (
                            part
                          ) =>
                            part.trim()
                        )
                        .filter(
                          Boolean
                        );


                    const referencePart =
                      noteParts.find(
                        (
                          part
                        ) =>
                          part
                            .toLowerCase()
                            .startsWith(
                              "reference:"
                            )
                      );


                    const referenceText =
                      referencePart
                        ? referencePart.replace(
                            /^reference:\s*/i,
                            ""
                          )
                        : "";


                    const noteText =
                      noteParts
                        .filter(
                          (
                            part
                          ) =>
                            !part
                              .toLowerCase()
                              .startsWith(
                                "reference:"
                              )
                        )
                        .join(
                          " · "
                        );


                    return (`;


if (
  !income.includes(
    oldCanEdit
  )
) {

  throw new Error(
    "Income row preparation section was not found. Nothing was changed."
  );
}


income =
  income.replace(
    oldCanEdit,
    newCanEdit
  );


// ============================================================
// 4. MAKE REFERENCE / NOTE EASY TO READ
// ============================================================

const oldReference = `                        <td className="px-6 py-5 align-middle">

                          <p
                            title={
                              transaction.notes ??
                              ""
                            }
                            className="truncate text-[15px] font-medium text-slate-600"
                          >
                            {transaction.notes ||
                              "—"}
                          </p>

                        </td>`;


const newReference = `                        <td className="px-5 py-4 align-top">

                          <div className="min-w-0">

                            {referenceText ? (
                              <p className="break-words text-[14px] font-semibold leading-5 text-slate-700">

                                <span className="mr-1 text-[11px] font-black uppercase tracking-wide text-slate-400">
                                  Ref:
                                </span>

                                {
                                  referenceText
                                }

                              </p>
                            ) : null}


                            {noteText ? (
                              <p className={\`\${
                                referenceText
                                  ? "mt-1"
                                  : ""
                              } break-words text-[13px] font-medium leading-5 text-slate-500\`}>
                                {
                                  noteText
                                }
                              </p>
                            ) : null}


                            {!referenceText &&
                            !noteText ? (
                              <span className="text-slate-400">
                                —
                              </span>
                            ) : null}

                          </div>

                        </td>`;


if (
  !income.includes(
    oldReference
  )
) {

  throw new Error(
    "Reference / Note section was not found. Nothing was changed."
  );
}


income =
  income.replace(
    oldReference,
    newReference
  );


// ============================================================
// 5. TOP-ALIGN THE REST OF THE TABLE
// ============================================================

income =
  income.replaceAll(
    'className="px-6 py-5 align-middle"',
    'className="px-5 py-4 align-top"'
  );


income =
  income.replaceAll(
    'className="px-6 py-5 text-right align-middle"',
    'className="px-5 py-4 text-right align-top"'
  );


income =
  income.replaceAll(
    'className="px-5 py-5 text-center align-middle"',
    'className="px-4 py-4 text-center align-top"'
  );


// ============================================================
// 6. CLEAN HEADER SPACING
// ============================================================

income =
  income.replaceAll(
    'className="px-6 py-4"',
    'className="px-5 py-4"'
  );


income =
  income.replaceAll(
    'className="px-6 py-4 text-right"',
    'className="px-5 py-4 text-right"'
  );


income =
  income.replace(
    `                    Reference / Note`,
    `                    Reference & Note`
  );


// ============================================================
// 7. DASHBOARD BREAKDOWN ALIGNMENT
// ============================================================

const oldBreakdownRow = `                  <div
                    key={
                      row.name
                    }
                    className="flex items-center gap-3"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          row.color,
                      }}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-slate-800">
                        {row.name}
                      </p>

                      <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                        {share.toFixed(
                          1
                        )}
                        %
                      </p>
                    </div>

                    <p className="whitespace-nowrap text-[13px] font-black text-slate-950">
                      {money(
                        row.value
                      )}
                    </p>
                  </div>`;


const newBreakdownRow = `                  <div
                    key={
                      row.name
                    }
                    className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-start gap-x-3"
                  >

                    <span
                      className="mt-1.5 h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          row.color,
                      }}
                    />


                    <div className="min-w-0">

                      <p className="truncate text-[14px] font-bold leading-5 text-slate-800">
                        {
                          row.name
                        }
                      </p>

                      <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                        {share.toFixed(
                          1
                        )}
                        %
                      </p>

                    </div>


                    <p className="min-w-[105px] whitespace-nowrap text-right text-[13px] font-black leading-5 text-slate-950">
                      {money(
                        row.value
                      )}
                    </p>

                  </div>`;


if (
  !dashboard.includes(
    oldBreakdownRow
  )
) {

  throw new Error(
    "Dashboard breakdown row was not found. Nothing was changed."
  );
}


dashboard =
  dashboard.replace(
    oldBreakdownRow,
    newBreakdownRow
  );


// ============================================================
// 8. REMOVE CONFUSING INC-XXXX NUMBER FROM DASHBOARD
// ============================================================

const oldTransactionNumber = `                    <p className="mt-0.5 text-[8px] font-medium text-slate-400">
                      {
                        transaction.transaction_number
                      }
                    </p>`;


if (
  !dashboard.includes(
    oldTransactionNumber
  )
) {

  throw new Error(
    "Dashboard transaction number display was not found. Nothing was changed."
  );
}


dashboard =
  dashboard.replace(
    oldTransactionNumber,
    ""
  );


// ============================================================
// WRITE ONLY AFTER ALL CHECKS PASS
// ============================================================

fs.writeFileSync(
  incomePath,
  income,
  "utf8"
);


fs.writeFileSync(
  dashboardPath,
  dashboard,
  "utf8"
);


console.log("");
console.log(
  "INCOME DISPLAY CLEANUP APPLIED"
);

console.log(
  "Income table: aligned"
);

console.log(
  "System transaction number: hidden from normal view"
);

console.log(
  "Reference and note: separated and readable"
);

console.log(
  "Dashboard income breakdown: aligned"
);

console.log(
  "Database: unchanged"
);