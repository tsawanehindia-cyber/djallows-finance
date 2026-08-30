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
  )
  .replace(
    /\r\n/g,
    "\n"
  );


let dashboard =
  fs.readFileSync(
    dashboardPath,
    "utf8"
  )
  .replace(
    /\r\n/g,
    "\n"
  );


// ============================================================
// HELPER
// ============================================================

function replaceRequired(
  text,
  oldText,
  newText,
  label
) {

  if (
    !text.includes(
      oldText
    )
  ) {

    throw new Error(
      label +
      " was not found. Nothing was changed."
    );
  }


  return text.replace(
    oldText,
    newText
  );
}


// ============================================================
// 1. IMPROVE TABLE WIDTHS
// ============================================================

income =
  replaceRequired(
    income,
    '"min-w-[1530px]"',
    '"min-w-[1450px]"',
    "Owner table width"
  );


income =
  replaceRequired(
    income,
    '"min-w-[1370px]"',
    '"min-w-[1390px]"',
    "Staff table width"
  );


const oldColumns = [
  '                  <col className="w-[70px]" />',
  '                )}',
  '',
  '                <col className="w-[145px]" />',
  '                <col className="w-[300px]" />',
  '                <col className="w-[170px]" />',
  '                <col className="w-[180px]" />',
  '                <col className="w-[265px]" />',
  '                <col className="w-[175px]" />',
  '                <col className="w-[220px]" />',
].join("\n");


const newColumns = [
  '                  <col className="w-[55px]" />',
  '                )}',
  '',
  '                <col className="w-[145px]" />',
  '                <col className="w-[235px]" />',
  '                <col className="w-[165px]" />',
  '                <col className="w-[180px]" />',
  '                <col className="w-[310px]" />',
  '                <col className="w-[165px]" />',
  '                <col className="w-[195px]" />',
].join("\n");


income =
  replaceRequired(
    income,
    oldColumns,
    newColumns,
    "Income table columns"
  );


// ============================================================
// 2. HIDE LONG INTERNAL INC NUMBER
// ============================================================

const oldDescription = [
  '                        <td className="px-6 py-5 align-middle">',
  '',
  '                          <p className="text-[15px] font-bold leading-6 text-slate-950">',
  '                            {',
  '                              transaction.description',
  '                            }',
  '                          </p>',
  '',
  '                          <p className="mt-1 text-[13px] font-medium text-slate-500">',
  '                            {',
  '                              transaction.transaction_number',
  '                            }',
  '                          </p>',
  '',
  '                        </td>',
].join("\n");


const newDescription = [
  '                        <td className="px-5 py-4 align-top">',
  '',
  '                          <p className="text-[15px] font-bold leading-6 text-slate-950">',
  '                            {',
  '                              transaction.description',
  '                            }',
  '                          </p>',
  '',
  '                        </td>',
].join("\n");


income =
  replaceRequired(
    income,
    oldDescription,
    newDescription,
    "Income description"
  );


// ============================================================
// 3. MAKE REFERENCE AND NOTE READABLE
// ============================================================

const oldReference = [
  '                        <td className="px-6 py-5 align-middle">',
  '',
  '                          <p',
  '                            title={',
  '                              transaction.notes ??',
  '                              ""',
  '                            }',
  '                            className="truncate text-[15px] font-medium text-slate-600"',
  '                          >',
  '                            {transaction.notes ||',
  '                              "—"}',
  '                          </p>',
  '',
  '                        </td>',
].join("\n");


const newReference = [
  '                        <td className="px-5 py-4 align-top">',
  '',
  '                          {transaction.notes ? (',
  '                            <div className="min-w-0 space-y-1">',
  '',
  '                              {transaction.notes',
  '                                .split(" · ")',
  '                                .map(',
  '                                  (',
  '                                    part,',
  '                                    noteIndex',
  '                                  ) => {',
  '',
  '                                    const isReference =',
  '                                      part',
  '                                        .toLowerCase()',
  '                                        .startsWith(',
  '                                          "reference:"',
  '                                        );',
  '',
  '                                    const cleanText =',
  '                                      isReference',
  '                                        ? part.replace(',
  '                                            /^reference:\\s*/i,',
  '                                            ""',
  '                                          )',
  '                                        : part;',
  '',
  '                                    return (',
  '                                      <p',
  '                                        key={',
  '                                          `${transaction.id}-${noteIndex}`',
  '                                        }',
  '                                        className={',
  '                                          isReference',
  '                                            ? "break-words text-[14px] font-semibold leading-5 text-slate-700"',
  '                                            : "break-words text-[13px] font-medium leading-5 text-slate-500"',
  '                                        }',
  '                                      >',
  '',
  '                                        {isReference && (',
  '                                          <span className="mr-1 text-[11px] font-black uppercase tracking-wide text-slate-400">',
  '                                            Ref:',
  '                                          </span>',
  '                                        )}',
  '',
  '                                        {',
  '                                          cleanText',
  '                                        }',
  '',
  '                                      </p>',
  '                                    );',
  '                                  }',
  '                                )}',
  '',
  '                            </div>',
  '                          ) : (',
  '                            <span className="text-slate-400">',
  '                              —',
  '                            </span>',
  '                          )}',
  '',
  '                        </td>',
].join("\n");


income =
  replaceRequired(
    income,
    oldReference,
    newReference,
    "Reference and note"
  );


// ============================================================
// 4. CLEAN ROW ALIGNMENT
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


income =
  income.replaceAll(
    "Reference / Note",
    "Reference & Note"
  );


// ============================================================
// 5. DASHBOARD CATEGORY ALIGNMENT
// ============================================================

const oldDashboardRow = [
  '                  <div',
  '                    key={',
  '                      row.name',
  '                    }',
  '                    className="flex items-center gap-3"',
  '                  >',
  '                    <span',
  '                      className="h-2.5 w-2.5 shrink-0 rounded-full"',
  '                      style={{',
  '                        backgroundColor:',
  '                          row.color,',
  '                      }}',
  '                    />',
  '',
  '                    <div className="min-w-0 flex-1">',
  '                      <p className="truncate text-[14px] font-bold text-slate-800">',
  '                        {row.name}',
  '                      </p>',
  '',
  '                      <p className="mt-0.5 text-[11px] font-semibold text-slate-400">',
  '                        {share.toFixed(',
  '                          1',
  '                        )}',
  '                        %',
  '                      </p>',
  '                    </div>',
  '',
  '                    <p className="whitespace-nowrap text-[13px] font-black text-slate-950">',
  '                      {money(',
  '                        row.value',
  '                      )}',
  '                    </p>',
  '                  </div>',
].join("\n");


const newDashboardRow = [
  '                  <div',
  '                    key={',
  '                      row.name',
  '                    }',
  '                    className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-start gap-x-3"',
  '                  >',
  '',
  '                    <span',
  '                      className="mt-1.5 h-2.5 w-2.5 rounded-full"',
  '                      style={{',
  '                        backgroundColor:',
  '                          row.color,',
  '                      }}',
  '                    />',
  '',
  '                    <div className="min-w-0">',
  '',
  '                      <p className="truncate text-[14px] font-bold leading-5 text-slate-800">',
  '                        {row.name}',
  '                      </p>',
  '',
  '                      <p className="mt-0.5 text-[11px] font-semibold text-slate-400">',
  '                        {share.toFixed(',
  '                          1',
  '                        )}',
  '                        %',
  '                      </p>',
  '',
  '                    </div>',
  '',
  '                    <p className="min-w-[110px] whitespace-nowrap text-right text-[13px] font-black leading-5 text-slate-950">',
  '                      {money(',
  '                        row.value',
  '                      )}',
  '                    </p>',
  '',
  '                  </div>',
].join("\n");


dashboard =
  replaceRequired(
    dashboard,
    oldDashboardRow,
    newDashboardRow,
    "Dashboard income breakdown"
  );


// ============================================================
// 6. HIDE INTERNAL NUMBER FROM RECENT ACTIVITY
// ============================================================

const oldDashboardNumber = [
  '                    <p className="mt-0.5 text-[8px] font-medium text-slate-400">',
  '                      {',
  '                        transaction.transaction_number',
  '                      }',
  '                    </p>',
].join("\n");


dashboard =
  replaceRequired(
    dashboard,
    oldDashboardNumber,
    "",
    "Dashboard transaction number"
  );


// ============================================================
// WRITE ONLY AFTER EVERYTHING PASSES
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
  "INCOME DISPLAY FIX APPLIED"
);

console.log(
  "Income table: aligned"
);

console.log(
  "Reference and note: readable"
);

console.log(
  "INC system number: hidden from normal screen"
);

console.log(
  "Dashboard category values: aligned"
);

console.log(
  "Database: unchanged"
);