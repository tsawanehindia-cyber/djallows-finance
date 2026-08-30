/* eslint-disable @typescript-eslint/no-require-imports */

const fs =
  require("node:fs");

const os =
  require("node:os");

const path =
  require("node:path");

const {
  DatabaseSync,
} =
  require("node:sqlite");


const root =
  process.cwd();


const incomePagePath =
  path.join(
    root,
    "src",
    "app",
    "income",
    "page.tsx"
  );


const incomeApiPath =
  path.join(
    root,
    "src",
    "app",
    "api",
    "local",
    "income",
    "route.ts"
  );


const schemaScriptPath =
  path.join(
    root,
    "scripts",
    "create-local-schema.cjs"
  );


for (
  const requiredPath of [
    incomePagePath,
    incomeApiPath,
    schemaScriptPath,
  ]
) {

  if (
    !fs.existsSync(
      requiredPath
    )
  ) {

    throw new Error(
      `Required file not found: ${requiredPath}`
    );
  }
}


// ============================================================
// LOAD CURRENT FILES
// ============================================================

let incomePage =
  fs.readFileSync(
    incomePagePath,
    "utf8"
  )
  .replace(
    /^\uFEFF/,
    ""
  )
  .replace(
    /\r\n/g,
    "\n"
  );


let schemaScript =
  fs.readFileSync(
    schemaScriptPath,
    "utf8"
  )
  .replace(
    /^\uFEFF/,
    ""
  )
  .replace(
    /\r\n/g,
    "\n"
  );


// ============================================================
// PATCH INCOME TYPE
// ============================================================

if (
  !incomePage.includes(
    "reference: string | null;"
  )
) {

  const oldType =
`  payment_method: string | null;
  notes: string | null;`;


  const newType =
`  payment_method: string | null;
  reference: string | null;
  notes: string | null;`;


  if (
    !incomePage.includes(
      oldType
    )
  ) {

    throw new Error(
      "Income transaction type could not be found."
    );
  }


  incomePage =
    incomePage.replace(
      oldType,
      newType
    );
}


// ============================================================
// ADD EDIT REFERENCE STATE
// ============================================================

if (
  !incomePage.includes(
    "setEditReference"
  )
) {

  const marker =
`  const [
    editNotes,
    setEditNotes,
  ] = useState("");`;


  const replacement =
`  const [
    editReference,
    setEditReference,
  ] = useState("");

  const [
    editNotes,
    setEditNotes,
  ] = useState("");`;


  if (
    !incomePage.includes(
      marker
    )
  ) {

    throw new Error(
      "Edit Note state could not be found."
    );
  }


  incomePage =
    incomePage.replace(
      marker,
      replacement
    );
}


// ============================================================
// SEARCH REFERENCE SEPARATELY
// ============================================================

if (
  !incomePage.includes(
`transaction.reference ??
              ""`
  )
) {

  const oldSearch =
`            (
              transaction.notes ??
              ""
            )
              .toLowerCase()
              .includes(
                searchText
              );`;


  const newSearch =
`            (
              transaction.reference ??
              ""
            )
              .toLowerCase()
              .includes(
                searchText
              ) ||
            (
              transaction.notes ??
              ""
            )
              .toLowerCase()
              .includes(
                searchText
              );`;


  if (
    !incomePage.includes(
      oldSearch
    )
  ) {

    throw new Error(
      "Income search section could not be found."
    );
  }


  incomePage =
    incomePage.replace(
      oldSearch,
      newSearch
    );
}


// ============================================================
// OPEN EDIT - LOAD REFERENCE
// ============================================================

if (
  !incomePage.includes(
`setEditReference(
      transaction.reference`
  )
) {

  const oldOpenEdit =
`    setEditNotes(
      transaction.notes ??
        ""
    );`;


  const newOpenEdit =
`    setEditReference(
      transaction.reference ??
        ""
    );

    setEditNotes(
      transaction.notes ??
        ""
    );`;


  if (
    !incomePage.includes(
      oldOpenEdit
    )
  ) {

    throw new Error(
      "Open Edit note section could not be found."
    );
  }


  incomePage =
    incomePage.replace(
      oldOpenEdit,
      newOpenEdit
    );
}


// ============================================================
// EDIT SAVE - SEND REFERENCE SEPARATELY
// ============================================================

if (
  !incomePage.includes(
`reference:
                  editReference.trim()`
  )
) {

  const oldEditBody =
`                account_id:
                  editAccountId,

                notes:
                  editNotes.trim() ||
                  null,`;


  const newEditBody =
`                account_id:
                  editAccountId,

                reference:
                  editReference.trim() ||
                  null,

                notes:
                  editNotes.trim() ||
                  null,`;


  if (
    !incomePage.includes(
      oldEditBody
    )
  ) {

    throw new Error(
      "Edit Income request body could not be found."
    );
  }


  incomePage =
    incomePage.replace(
      oldEditBody,
      newEditBody
    );
}


// ============================================================
// REPLACE CURRENT REFERENCE/NOTE TABLE DISPLAY
// ============================================================

const oldDisplay =
`                        <td className="px-5 py-4 align-top">

                          {transaction.notes ? (
                            <div className="min-w-0 space-y-1">

                              {transaction.notes
                                .split(" · ")
                                .map(
                                  (
                                    part,
                                    noteIndex
                                  ) => {

                                    const isReference =
                                      part
                                        .toLowerCase()
                                        .startsWith(
                                          "reference:"
                                        );

                                    const cleanText =
                                      isReference
                                        ? part.replace(
                                            /^reference:\\s*/i,
                                            ""
                                          )
                                        : part;

                                    return (
                                      <p
                                        key={
                                          \`\${transaction.id}-\${noteIndex}\`
                                        }
                                        className={
                                          isReference
                                            ? "break-words text-[14px] font-semibold leading-5 text-slate-700"
                                            : "break-words text-[13px] font-medium leading-5 text-slate-500"
                                        }
                                      >

                                        {isReference && (
                                          <span className="mr-1 text-[11px] font-black uppercase tracking-wide text-slate-400">
                                            Ref:
                                          </span>
                                        )}

                                        {
                                          cleanText
                                        }

                                      </p>
                                    );
                                  }
                                )}

                            </div>
                          ) : (
                            <span className="text-slate-400">
                              —
                            </span>
                          )}

                        </td>`;


const newDisplay =
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


if (
  incomePage.includes(
    oldDisplay
  )
) {

  incomePage =
    incomePage.replace(
      oldDisplay,
      newDisplay
    );

} else if (
  !incomePage.includes(
    "transaction.reference ? ("
  )
) {

  throw new Error(
    "Income Reference/Note display section could not be found."
  );
}


// ============================================================
// SPLIT EDIT REFERENCE AND NOTE FIELDS
// ============================================================

const oldEditFields =
`                <div className="sm:col-span-2">

                  <label className="mb-2 block text-[14px] font-bold text-slate-800">
                    Reference & Note
                  </label>

                  <textarea
                    rows={4}
                    value={
                      editNotes
                    }
                    onChange={(
                      event
                    ) =>
                      setEditNotes(
                        event.target.value
                      )
                    }
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] font-medium text-slate-800 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />

                </div>`;


const newEditFields =
`                <div>

                  <label className="mb-2 block text-[14px] font-bold text-slate-800">
                    Reference
                  </label>

                  <input
                    type="text"
                    value={
                      editReference
                    }
                    onChange={(
                      event
                    ) =>
                      setEditReference(
                        event.target.value
                      )
                    }
                    placeholder="Receipt, cheque or other reference"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] font-medium text-slate-800 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />

                </div>


                <div>

                  <label className="mb-2 block text-[14px] font-bold text-slate-800">
                    Note
                  </label>

                  <textarea
                    rows={3}
                    value={
                      editNotes
                    }
                    onChange={(
                      event
                    ) =>
                      setEditNotes(
                        event.target.value
                      )
                    }
                    placeholder="Optional note"
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] font-medium text-slate-800 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />

                </div>`;


if (
  incomePage.includes(
    oldEditFields
  )
) {

  incomePage =
    incomePage.replace(
      oldEditFields,
      newEditFields
    );

} else if (
  !incomePage.includes(
    "value={\n                      editReference"
  )
) {

  throw new Error(
    "Edit Reference/Note fields could not be found."
  );
}


// ============================================================
// FUTURE INSTALL DATABASE SCHEMA
// ============================================================

if (
  !schemaScript.includes(
    "  reference TEXT,"
  )
) {

  const oldSchema =
`  reference_type TEXT,
  reference_id TEXT,
  payment_method TEXT,
  notes TEXT,`;


  const newSchema =
`  reference_type TEXT,
  reference_id TEXT,
  reference TEXT,
  payment_method TEXT,
  notes TEXT,`;


  if (
    !schemaScript.includes(
      oldSchema
    )
  ) {

    throw new Error(
      "Transactions schema section could not be found."
    );
  }


  schemaScript =
    schemaScript.replace(
      oldSchema,
      newSchema
    );
}


// ============================================================
// COMPLETE LOCAL INCOME API
// ============================================================

const incomeApi =
`import {
  randomInt,
  randomUUID,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getLocalDb,
} from "@/lib/localDb";

import {
  getLocalSessionUser,
} from "@/lib/localSession";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


type IncomeRow = {
  id: string;

  transaction_number:
    string;

  transaction_date:
    string;

  description:
    string;

  amount:
    number;

  category_id:
    string | null;

  account_id:
    string | null;

  payment_method:
    string | null;

  reference:
    string | null;

  notes:
    string | null;

  created_by:
    string | null;
};


type CategoryRow = {
  id: string;
  name: string;
  active: number;
};


type AccountRow = {
  id: string;
  name: string;
  account_type: string;
  active: number;
};


function getAccess(
  request:
    NextRequest
) {

  const session =
    getLocalSessionUser(
      request
    );


  if (!session) {
    return null;
  }


  const businessId =
    session.access
      ?.business_id;


  if (!businessId) {
    return null;
  }


  const role =
    session.user
      .platform_role ===
      "super_admin"
        ? "owner"

        : session.access
            ?.access_role ===
          "owner"
        ? "owner"

        : session.access
            ?.access_role ===
          "admin"
        ? "admin"

        : "staff";


  return {
    session,
    businessId,
    role,
  };
}


function amountValue(
  value: unknown
) {

  const amount =
    Number(
      value
    );


  return Number.isFinite(
    amount
  )
    ? amount
    : 0;
}


function createIncomeNumber() {

  const now =
    new Date();


  const year =
    now.getFullYear();


  const month =
    String(
      now.getMonth() +
      1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );


  const hours =
    String(
      now.getHours()
    ).padStart(
      2,
      "0"
    );


  const minutes =
    String(
      now.getMinutes()
    ).padStart(
      2,
      "0"
    );


  const seconds =
    String(
      now.getSeconds()
    ).padStart(
      2,
      "0"
    );


  const random =
    randomInt(
      1000,
      10000
    );


  return (
    \`INC-\${year}\${month}\${day}-\` +
    \`\${hours}\${minutes}\${seconds}-\${random}\`
  );
}


function errorResponse(
  message:
    string,

  status =
    400
) {

  return NextResponse.json(
    {
      success:
        false,

      error:
        message,
    },
    {
      status,
    }
  );
}


export async function GET(
  request:
    NextRequest
) {

  try {

    const access =
      getAccess(
        request
      );


    if (!access) {

      return errorResponse(
        "Unauthorised.",
        401
      );
    }


    const db =
      getLocalDb();


    const transactions =
      (
        db.prepare(
          \`
            SELECT
              id,
              transaction_number,
              transaction_date,
              description,
              amount,
              category_id,
              account_id,
              payment_method,
              reference,
              notes,
              created_by

            FROM transactions

            WHERE business_id = ?
              AND transaction_type =
                'income'

            ORDER BY
              transaction_date DESC,
              created_at DESC
          \`
        )
        .all(
          access.businessId
        ) as unknown as
          IncomeRow[]
      )
      .map(
        (
          row
        ) => ({
          ...row,

          amount:
            amountValue(
              row.amount
            ),
        })
      );


    const categories =
      (
        db.prepare(
          \`
            SELECT
              id,
              name,
              active

            FROM categories

            WHERE business_id = ?
              AND category_type =
                'income'

            ORDER BY name
          \`
        )
        .all(
          access.businessId
        ) as unknown as
          CategoryRow[]
      )
      .map(
        (
          row
        ) => ({
          id:
            row.id,

          name:
            row.name,

          active:
            Number(
              row.active
            ) === 1,
        })
      );


    const accounts =
      (
        db.prepare(
          \`
            SELECT
              id,
              name,
              account_type,
              active

            FROM financial_accounts

            WHERE business_id = ?

            ORDER BY name
          \`
        )
        .all(
          access.businessId
        ) as unknown as
          AccountRow[]
      )
      .map(
        (
          row
        ) => ({
          id:
            row.id,

          name:
            row.name,

          account_type:
            row.account_type,

          active:
            Number(
              row.active
            ) === 1,
        })
      );


    return NextResponse.json({
      success:
        true,

      business_id:
        access.businessId,

      user_id:
        access.session
          .user
          .user_id,

      role:
        access.role,

      transactions,
      categories,
      accounts,
    });

  } catch (
    error
  ) {

    console.error(
      "LOCAL INCOME GET ERROR:",
      error
    );


    return errorResponse(
      error instanceof
        Error
        ? error.message
        : "Unable to load income records.",

      500
    );
  }
}


export async function POST(
  request:
    NextRequest
) {

  try {

    const access =
      getAccess(
        request
      );


    if (!access) {

      return errorResponse(
        "Unauthorised.",
        401
      );
    }


    const body =
      await request.json();


    const dateReceived =
      String(
        body.date_received ??
        ""
      ).trim();


    const categoryId =
      String(
        body.category_id ??
        ""
      ).trim();


    const description =
      String(
        body.description ??
        ""
      ).trim();


    const amount =
      amountValue(
        body.amount
      );


    const accountId =
      String(
        body.account_id ??
        ""
      ).trim();


    const reference =
      String(
        body.reference ??
        ""
      ).trim();


    const note =
      String(
        body.note ??
        ""
      ).trim();


    if (!dateReceived) {

      return errorResponse(
        "Please select the date received."
      );
    }


    if (!categoryId) {

      return errorResponse(
        "Please select an income source."
      );
    }


    if (!description) {

      return errorResponse(
        "Please enter a description."
      );
    }


    if (
      amount <= 0
    ) {

      return errorResponse(
        "Please enter a valid amount received."
      );
    }


    if (!accountId) {

      return errorResponse(
        "Please select where the money was received."
      );
    }


    const db =
      getLocalDb();


    const category =
      db.prepare(
        \`
          SELECT id

          FROM categories

          WHERE id = ?
            AND business_id = ?
            AND category_type =
              'income'
            AND active = 1

          LIMIT 1
        \`
      )
      .get(
        categoryId,
        access.businessId
      );


    if (!category) {

      return errorResponse(
        "The selected income source could not be found."
      );
    }


    const account =
      db.prepare(
        \`
          SELECT
            id,
            name

          FROM financial_accounts

          WHERE id = ?
            AND business_id = ?
            AND active = 1

          LIMIT 1
        \`
      )
      .get(
        accountId,
        access.businessId
      ) as
        | {
            id: string;
            name: string;
          }
        | undefined;


    if (!account) {

      return errorResponse(
        "The selected receiving account could not be found."
      );
    }


    const now =
      new Date()
        .toISOString();


    const id =
      randomUUID();


    const transactionNumber =
      createIncomeNumber();


    db.prepare(
      \`
        INSERT INTO transactions (
          id,
          business_id,
          transaction_number,
          transaction_date,
          transaction_type,
          category_id,
          description,
          amount,
          account_id,
          payment_method,
          reference_type,
          reference,
          notes,
          created_by,
          created_at,
          updated_at
        )

        VALUES (
          ?,
          ?,
          ?,
          ?,
          'income',
          ?,
          ?,
          ?,
          ?,
          ?,
          'manual_income',
          ?,
          ?,
          ?,
          ?,
          ?
        )
      \`
    )
    .run(
      id,
      access.businessId,
      transactionNumber,
      \`\${dateReceived}T12:00:00\`,
      categoryId,
      description,
      amount,
      account.id,
      account.name,
      reference ||
        null,
      note ||
        null,
      access.session
        .user
        .user_id,
      now,
      now
    );


    return NextResponse.json({
      success:
        true,

      id,

      transaction_number:
        transactionNumber,
    });

  } catch (
    error
  ) {

    console.error(
      "LOCAL INCOME POST ERROR:",
      error
    );


    return errorResponse(
      error instanceof
        Error
        ? error.message
        : "Unable to save income.",

      500
    );
  }
}


export async function PATCH(
  request:
    NextRequest
) {

  try {

    const access =
      getAccess(
        request
      );


    if (!access) {

      return errorResponse(
        "Unauthorised.",
        401
      );
    }


    const body =
      await request.json();


    const id =
      String(
        body.id ??
        ""
      ).trim();


    const transactionDate =
      String(
        body.transaction_date ??
        ""
      ).trim();


    const categoryId =
      String(
        body.category_id ??
        ""
      ).trim();


    const description =
      String(
        body.description ??
        ""
      ).trim();


    const amount =
      amountValue(
        body.amount
      );


    const accountId =
      String(
        body.account_id ??
        ""
      ).trim();


    const reference =
      String(
        body.reference ??
        ""
      ).trim();


    const notes =
      String(
        body.notes ??
        ""
      ).trim();


    if (
      !id ||
      !transactionDate ||
      !categoryId ||
      !description ||
      amount <= 0 ||
      !accountId
    ) {

      return errorResponse(
        "Please complete all required income fields."
      );
    }


    const db =
      getLocalDb();


    const existing =
      db.prepare(
        \`
          SELECT
            id,
            created_by

          FROM transactions

          WHERE id = ?
            AND business_id = ?
            AND transaction_type =
              'income'

          LIMIT 1
        \`
      )
      .get(
        id,
        access.businessId
      ) as
        | {
            id: string;

            created_by:
              string | null;
          }
        | undefined;


    if (!existing) {

      return errorResponse(
        "Income record not found.",
        404
      );
    }


    const canEdit =
      access.role ===
        "owner" ||

      access.role ===
        "admin" ||

      existing.created_by ===
        access.session
          .user
          .user_id;


    if (!canEdit) {

      return errorResponse(
        "You do not have permission to edit this record.",
        403
      );
    }


    const account =
      db.prepare(
        \`
          SELECT
            id,
            name

          FROM financial_accounts

          WHERE id = ?
            AND business_id = ?

          LIMIT 1
        \`
      )
      .get(
        accountId,
        access.businessId
      ) as
        | {
            id: string;
            name: string;
          }
        | undefined;


    if (!account) {

      return errorResponse(
        "The selected account could not be found."
      );
    }


    db.prepare(
      \`
        UPDATE transactions

        SET
          transaction_date = ?,
          category_id = ?,
          description = ?,
          amount = ?,
          account_id = ?,
          payment_method = ?,
          reference = ?,
          notes = ?,
          updated_at = ?

        WHERE id = ?
          AND business_id = ?
          AND transaction_type =
            'income'
      \`
    )
    .run(
      transactionDate,
      categoryId,
      description,
      amount,
      account.id,
      account.name,
      reference ||
        null,
      notes ||
        null,
      new Date()
        .toISOString(),
      id,
      access.businessId
    );


    const transaction =
      db.prepare(
        \`
          SELECT
            id,
            transaction_number,
            transaction_date,
            description,
            amount,
            category_id,
            account_id,
            payment_method,
            reference,
            notes,
            created_by

          FROM transactions

          WHERE id = ?

          LIMIT 1
        \`
      )
      .get(
        id
      ) as
        IncomeRow;


    return NextResponse.json({
      success:
        true,

      transaction: {
        ...transaction,

        amount:
          amountValue(
            transaction.amount
          ),
      },
    });

  } catch (
    error
  ) {

    console.error(
      "LOCAL INCOME PATCH ERROR:",
      error
    );


    return errorResponse(
      error instanceof
        Error
        ? error.message
        : "Unable to save changes.",

      500
    );
  }
}


export async function DELETE(
  request:
    NextRequest
) {

  try {

    const access =
      getAccess(
        request
      );


    if (!access) {

      return errorResponse(
        "Unauthorised.",
        401
      );
    }


    if (
      access.role !==
        "owner" &&

      access.role !==
        "admin"
    ) {

      return errorResponse(
        "You do not have permission to delete income records.",
        403
      );
    }


    const body =
      await request.json();


    const ids =
      Array.isArray(
        body.ids
      )
        ? body.ids
            .map(
              (
                value:
                  unknown
              ) =>
                String(
                  value
                ).trim()
            )
            .filter(
              Boolean
            )
        : [];


    if (
      ids.length === 0
    ) {

      return errorResponse(
        "No income records were selected."
      );
    }


    const placeholders =
      ids
        .map(
          () =>
            "?"
        )
        .join(
          ","
        );


    const db =
      getLocalDb();


    const result =
      db.prepare(
        \`
          DELETE FROM transactions

          WHERE business_id = ?
            AND transaction_type =
              'income'

            AND id IN (
              \${placeholders}
            )
        \`
      )
      .run(
        access.businessId,
        ...ids
      );


    return NextResponse.json({
      success:
        true,

      deleted:
        Number(
          result.changes ??
          0
        ),
    });

  } catch (
    error
  ) {

    console.error(
      "LOCAL INCOME DELETE ERROR:",
      error
    );


    return errorResponse(
      error instanceof
        Error
        ? error.message
        : "Unable to delete income records.",

      500
    );
  }
}
`;


// ============================================================
// VALIDATE SOURCE CHANGES BEFORE TOUCHING DATABASE
// ============================================================

if (
  !incomePage.includes(
    "reference: string | null;"
  ) ||
  !incomePage.includes(
    "setEditReference"
  ) ||
  !incomePage.includes(
    "transaction.reference"
  )
) {

  throw new Error(
    "Income page validation failed. Database was NOT changed."
  );
}


// ============================================================
// DATABASE LOCATION
// ============================================================

const dataFolder =
  process.env.LOCALAPPDATA

    ? path.join(
        process.env.LOCALAPPDATA,
        "Djallows Farm",
        "data"
      )

    : path.join(
        os.homedir(),
        ".djallows-farm",
        "data"
      );


const databasePath =
  path.join(
    dataFolder,
    "djallows-farm.db"
  );


if (
  !fs.existsSync(
    databasePath
  )
) {

  throw new Error(
    `Local database not found: ${databasePath}`
  );
}


// ============================================================
// BACKUP SOURCE + SQLITE DATABASE
// ============================================================

const stamp =
  new Date()
    .toISOString()
    .replace(
      /[-:]/g,
      ""
    )
    .replace(
      /\..+/,
      ""
    )
    .replace(
      "T",
      "-"
    );


const backupDir =
  path.join(
    "C:\\djallows-finance-backups",
    `BEFORE-SEPARATE-INCOME-REFERENCE-${stamp}`
  );


fs.mkdirSync(
  backupDir,
  {
    recursive:
      true,
  }
);


fs.copyFileSync(
  incomePagePath,
  path.join(
    backupDir,
    "income-page.tsx"
  )
);


fs.copyFileSync(
  incomeApiPath,
  path.join(
    backupDir,
    "income-api-route.ts"
  )
);


fs.copyFileSync(
  schemaScriptPath,
  path.join(
    backupDir,
    "create-local-schema.cjs"
  )
);


// ============================================================
// SQLITE CONSISTENT BACKUP
// ============================================================

const db =
  new DatabaseSync(
    databasePath
  );


db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
`);


const backupDatabasePath =
  path.join(
    backupDir,
    "djallows-farm-before-reference.db"
  );


const safeBackupPath =
  backupDatabasePath.replace(
    /'/g,
    "''"
  );


db.exec(
  `VACUUM INTO '${safeBackupPath}'`
);


// ============================================================
// ADD REAL REFERENCE COLUMN
// ============================================================

const transactionColumns =
  db.prepare(`
    PRAGMA table_info(
      transactions
    )
  `)
  .all();


const hasReferenceColumn =
  transactionColumns.some(
    (
      column
    ) =>
      String(
        column.name
      ) ===
      "reference"
  );


if (
  !hasReferenceColumn
) {

  db.exec(`
    ALTER TABLE transactions
    ADD COLUMN reference TEXT
  `);
}


// ============================================================
// MIGRATE EXISTING INCOME DATA
// Reference: TEST-LOCAL-001 · Local SQLite test record
// becomes:
// reference = TEST-LOCAL-001
// notes     = Local SQLite test record
// ============================================================

const incomeRows =
  db.prepare(`
    SELECT
      id,
      reference,
      notes

    FROM transactions

    WHERE transaction_type =
      'income'
  `)
  .all();


const updateMigration =
  db.prepare(`
    UPDATE transactions

    SET
      reference = ?,
      notes = ?,
      updated_at = ?

    WHERE id = ?
  `);


let migrated =
  0;


db.exec(
  "BEGIN TRANSACTION"
);


try {

  for (
    const row of
      incomeRows
  ) {

    const currentReference =
      row.reference == null
        ? ""
        : String(
            row.reference
          ).trim();


    const currentNotes =
      row.notes == null
        ? ""
        : String(
            row.notes
          ).trim();


    if (
      currentReference ||
      !currentNotes
    ) {
      continue;
    }


    const pieces =
      currentNotes
        .split(
          " · "
        )
        .map(
          (
            value
          ) =>
            value.trim()
        )
        .filter(
          Boolean
        );


    const referenceIndex =
      pieces.findIndex(
        (
          value
        ) =>
          value
            .toLowerCase()
            .startsWith(
              "reference:"
            )
      );


    if (
      referenceIndex < 0
    ) {
      continue;
    }


    const reference =
      pieces[
        referenceIndex
      ]
        .replace(
          /^reference:\s*/i,
          ""
        )
        .trim();


    const remainingNote =
      pieces
        .filter(
          (
            _value,
            index
          ) =>
            index !==
            referenceIndex
        )
        .join(
          " · "
        )
        .trim();


    updateMigration.run(
      reference ||
        null,

      remainingNote ||
        null,

      new Date()
        .toISOString(),

      row.id
    );


    migrated +=
      1;
  }


  db.prepare(`
    INSERT INTO app_meta (
      key,
      value,
      updated_at
    )

    VALUES (?, ?, ?)

    ON CONFLICT(key)
    DO UPDATE SET
      value =
        excluded.value,

      updated_at =
        excluded.updated_at
  `)
  .run(
    "schema_version",
    "3",
    new Date()
      .toISOString()
  );


  db.exec(
    "COMMIT"
  );

} catch (
  error
) {

  db.exec(
    "ROLLBACK"
  );

  db.close();

  throw error;
}


// ============================================================
// VERIFY DATABASE
// ============================================================

const verification =
  db.prepare(`
    SELECT
      description,
      reference,
      notes,
      amount

    FROM transactions

    WHERE transaction_type =
      'income'

    ORDER BY created_at DESC

    LIMIT 5
  `)
  .all();


db.close();


// ============================================================
// WRITE APPLICATION CODE
// ============================================================

fs.writeFileSync(
  incomePagePath,
  incomePage,
  "utf8"
);


fs.writeFileSync(
  incomeApiPath,
  incomeApi,
  "utf8"
);


fs.writeFileSync(
  schemaScriptPath,
  schemaScript,
  "utf8"
);


// ============================================================
// COMPLETE
// ============================================================

console.log("");

console.log(
  "INCOME REFERENCE SEPARATION COMPLETE"
);

console.log("");

console.log(
  "Database backup:",
  backupDatabasePath
);

console.log(
  "Existing records migrated:",
  migrated
);

console.log("");

console.log(
  "Reference: separate SQLite field"
);

console.log(
  "Note: separate SQLite field"
);

console.log(
  "Add Income: separate"
);

console.log(
  "Edit Income: separate"
);

console.log(
  "Search: checks both fields"
);

console.log("");

console.log(
  "DATABASE VERIFICATION"
);

console.table(
  verification
);