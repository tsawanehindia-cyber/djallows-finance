/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");

const filePath =
  path.join(
    process.cwd(),
    "src",
    "app",
    "income",
    "page.tsx"
  );

let content =
  fs.readFileSync(
    filePath,
    "utf8"
  )
  .replace(/\r\n/g, "\n");


// ============================================================
// 1. TABLE WIDTH
// ============================================================

content =
  content.replace(
    '"min-w-[1450px]"',
    '"min-w-[1530px]"'
  );

content =
  content.replace(
    '"min-w-[1390px]"',
    '"min-w-[1470px]"'
  );


// ============================================================
// 2. SPLIT THE EXISTING REFERENCE/NOTE COLUMN WIDTH
// ============================================================

const oldColumns =
`                <col className="w-[180px]" />
                <col className="w-[310px]" />
                <col className="w-[165px]" />
                <col className="w-[195px]" />`;

const newColumns =
`                <col className="w-[180px]" />
                <col className="w-[175px]" />
                <col className="w-[220px]" />
                <col className="w-[165px]" />
                <col className="w-[195px]" />`;

if (
  content.includes(
    oldColumns
  )
) {

  content =
    content.replace(
      oldColumns,
      newColumns
    );

} else if (
  !content.includes(
    '<col className="w-[175px]" />'
  )
) {

  throw new Error(
    "Income column widths could not be found. Nothing was changed."
  );
}


// ============================================================
// 3. SPLIT TABLE HEADER
// ============================================================

const headerPattern =
  /<th([^>]*)>\s*Reference &amp; Note\s*<\/th>|<th([^>]*)>\s*Reference & Note\s*<\/th>/i;

if (
  headerPattern.test(
    content
  )
) {

  content =
    content.replace(
      headerPattern,
      (
        _match,
        attributes1,
        attributes2
      ) => {

        const attributes =
          attributes1 ??
          attributes2 ??
          "";

        return (
          `<th${attributes}>Reference</th>\n` +
          `<th${attributes}>Note</th>`
        );
      }
    );

} else if (
  !content.includes(
    ">Reference</th>"
  ) ||
  !content.includes(
    ">Note</th>"
  )
) {

  throw new Error(
    "Reference & Note table heading could not be found. Nothing was changed."
  );
}


// ============================================================
// 4. SPLIT REFERENCE AND NOTE INTO TWO CELLS
// ============================================================

const oldCell =
`                        <td className="px-5 py-4 align-top">

                          <div className="min-w-0 space-y-1">

                            {transaction.reference ? (
                              <p className="break-words text-[14px] font-semibold leading-5 text-slate-700">

                                <span className="mr-1 text-[11px] font-black uppercase tracking-wide text-slate-400">
                                  Ref:
                                </span>

                                {
                                  transaction.reference
                                }

                              </p>
                            ) : null}


                            {transaction.notes ? (
                              <p className="break-words text-[13px] font-medium leading-5 text-slate-500">
                                {
                                  transaction.notes
                                }
                              </p>
                            ) : null}


                            {!transaction.reference &&
                            !transaction.notes ? (
                              <span className="text-slate-400">
                                —
                              </span>
                            ) : null}

                          </div>

                        </td>`;

const newCells =
`                        <td className="px-5 py-4 align-top">

                          {transaction.reference ? (
                            <p className="break-words text-[14px] font-semibold leading-5 text-slate-700">
                              {
                                transaction.reference
                              }
                            </p>
                          ) : (
                            <span className="text-slate-400">
                              —
                            </span>
                          )}

                        </td>


                        <td className="px-5 py-4 align-top">

                          {transaction.notes ? (
                            <p className="break-words text-[13px] font-medium leading-5 text-slate-600">
                              {
                                transaction.notes
                              }
                            </p>
                          ) : (
                            <span className="text-slate-400">
                              —
                            </span>
                          )}

                        </td>`;

if (
  content.includes(
    oldCell
  )
) {

  content =
    content.replace(
      oldCell,
      newCells
    );

} else if (
  !content.includes(
    "{transaction.reference ? ("
  )
) {

  throw new Error(
    "Reference/Note record cell could not be found. Nothing was changed."
  );
}


// ============================================================
// 5. UPDATE TABLE COLSPANS FOR THE EXTRA COLUMN
// ============================================================

content =
  content.replaceAll(
    "isOwnerOrAdmin ? 8 : 7",
    "isOwnerOrAdmin ? 9 : 8"
  );


// ============================================================
// 6. CLEAN LABELS
// ============================================================

content =
  content.replaceAll(
    "Reference & Note",
    "Reference"
  );


// ============================================================
// 7. WRITE
// ============================================================

fs.writeFileSync(
  filePath,
  content,
  "utf8"
);


console.log("");
console.log(
  "INCOME REFERENCE AND NOTE UI FIXED"
);

console.log(
  "Reference: separate table column"
);

console.log(
  "Note: separate table column"
);

console.log(
  "Edit form: already separate"
);

console.log(
  "SQLite database: unchanged"
);