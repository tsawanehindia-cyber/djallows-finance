/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");

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

const newIncomePath =
  path.join(
    root,
    "src",
    "app",
    "income",
    "new",
    "page.tsx"
  );

const routePath =
  path.join(
    root,
    "src",
    "app",
    "api",
    "local",
    "income",
    "route.ts"
  );


for (
  const filePath of [
    incomePath,
    newIncomePath,
  ]
) {

  if (
    !fs.existsSync(
      filePath
    )
  ) {

    throw new Error(
      `Required file not found: ${filePath}`
    );
  }
}


function normalise(
  text
) {

  return text
    .replace(
      /^\uFEFF/,
      ""
    )
    .replace(
      /\r\n/g,
      "\n"
    );
}


let income =
  normalise(
    fs.readFileSync(
      incomePath,
      "utf8"
    )
  );


let newIncome =
  normalise(
    fs.readFileSync(
      newIncomePath,
      "utf8"
    )
  );


// ============================================================
// BACKUP
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
    `BEFORE-LOCAL-INCOME-${stamp}`
  );


fs.mkdirSync(
  backupDir,
  {
    recursive: true,
  }
);


fs.copyFileSync(
  incomePath,
  path.join(
    backupDir,
    "income-page.tsx"
  )
);


fs.copyFileSync(
  newIncomePath,
  path.join(
    backupDir,
    "income-new-page.tsx"
  )
);


// ============================================================
// HELPER
// ============================================================

function replaceSection(
  text,
  startMarker,
  endMarker,
  replacement,
  label
) {

  const start =
    text.indexOf(
      startMarker
    );

  const end =
    text.indexOf(
      endMarker,
      start +
        startMarker.length
    );


  if (
    start < 0 ||
    end < 0 ||
    end <= start
  ) {

    throw new Error(
      `${label} markers not found. No files were changed.`
    );
  }


  return (
    text.slice(
      0,
      start
    ) +
    replacement +
    text.slice(
      end
    )
  );
}


// ============================================================
// INCOME LIST PAGE
// ============================================================

income =
  income.replace(
    /^import \{ supabase \} from "@\/lib\/supabase";\n/m,
    ""
  );


income =
  income.replace(
    /type Membership = \{\n  business_id: string;\n  role: MemberRole;\n\};\n\n/,
    ""
  );


const incomeLoadStart =
`  // ==========================================================
  // LOAD INCOME DATA
  // ==========================================================`;


const incomeLoadEnd =
`  // ==========================================================
  // MAPS
  // ==========================================================`;


const incomeLoadBlock =
`  // ==========================================================
  // LOAD LOCAL INCOME DATA
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadIncome() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            "/api/local/income",
            {
              cache:
                "no-store",
            }
          );

        if (
          response.status ===
          401
        ) {
          router.replace(
            "/login"
          );

          return;
        }

        const data =
          (await response.json()) as {
            success?: boolean;
            error?: string;
            business_id?: string;
            user_id?: string;
            role?: MemberRole;

            transactions?:
              IncomeTransaction[];

            categories?:
              Category[];

            accounts?:
              Account[];
          };

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "Unable to load income records."
          );
        }

        if (!active) {
          return;
        }

        setBusinessId(
          data.business_id ??
          ""
        );

        setCurrentUserId(
          data.user_id ??
          ""
        );

        setMemberRole(
          data.role ??
          "staff"
        );

        setTransactions(
          data.transactions ??
          []
        );

        setCategories(
          data.categories ??
          []
        );

        setAccounts(
          data.accounts ??
          []
        );

        setLoading(
          false
        );

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
              : "Unable to load income records."
          );

          setLoading(
            false
          );
        }
      }
    }

    loadIncome();

    return () => {
      active = false;
    };

  }, [
    router,
  ]);

`;


income =
  replaceSection(
    income,
    incomeLoadStart,
    incomeLoadEnd,
    incomeLoadBlock,
    "Income load"
  );


// ============================================================
// EDIT INCOME
// ============================================================

const updateStart =
`      const {
        data:
          updatedRow,
        error:
          updateError,
      } = await supabase`;


const updateEnd =
`      const updatedTransaction:
        IncomeTransaction = {`;


const updateStartIndex =
  income.indexOf(
    updateStart
  );


const updateEndIndex =
  income.indexOf(
    updateEnd,
    updateStartIndex
  );


if (
  updateStartIndex < 0 ||
  updateEndIndex < 0
) {

  throw new Error(
    "Income update block not found. No files were changed."
  );
}


const updateBlock =
`      const response =
        await fetch(
          "/api/local/income",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                id:
                  editingTransaction.id,

                transaction_date:
                  \`\${editDate}T12:00:00\`,

                category_id:
                  editCategoryId,

                description,

                amount,

                account_id:
                  editAccountId,

                notes:
                  editNotes.trim() ||
                  null,
              }),
          }
        );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;

          transaction?:
            IncomeTransaction;
        };

      if (
        !response.ok ||
        !data.success ||
        !data.transaction
      ) {

        throw new Error(
          data.error ||
            "Unable to save changes."
        );
      }

      const updatedRow =
        data.transaction;

`;


income =
  income.slice(
    0,
    updateStartIndex
  ) +
  updateBlock +
  income.slice(
    updateEndIndex
  );


// ============================================================
// DELETE HELPERS
// ============================================================

function replaceDeleteBlock(
  text,
  functionMarker,
  endMarker,
  replacement,
  label
) {

  const functionStart =
    text.indexOf(
      functionMarker
    );


  if (
    functionStart < 0
  ) {

    throw new Error(
      `${label} function not found. No files were changed.`
    );
  }


  const blockStart =
    text.indexOf(
`      const {
        error:
          deleteError,`,
      functionStart
    );


  const blockEnd =
    text.indexOf(
      endMarker,
      blockStart
    );


  if (
    blockStart < 0 ||
    blockEnd < 0
  ) {

    throw new Error(
      `${label} block not found. No files were changed.`
    );
  }


  return (
    text.slice(
      0,
      blockStart
    ) +
    replacement +
    text.slice(
      blockEnd
    )
  );
}


// ============================================================
// DELETE ONE
// ============================================================

const deleteOneBlock =
`      const response =
        await fetch(
          "/api/local/income",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                ids: [
                  transaction.id,
                ],
              }),
          }
        );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.error ||
            "Unable to delete the record."
        );
      }

`;


income =
  replaceDeleteBlock(
    income,
    "  async function deleteOne(",
    "      setTransactions(",
    deleteOneBlock,
    "Delete one"
  );


// ============================================================
// DELETE SELECTED
// ============================================================

const deleteSelectedBlock =
`      const response =
        await fetch(
          "/api/local/income",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                ids,
              }),
          }
        );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.error ||
            "Unable to delete the selected records."
        );
      }

`;


income =
  replaceDeleteBlock(
    income,
    "  async function deleteSelected()",
    "      const idSet =",
    deleteSelectedBlock,
    "Delete selected"
  );


// ============================================================
// NEW INCOME PAGE
// ============================================================

newIncome =
  newIncome.replace(
    /^import \{ supabase \} from "@\/lib\/supabase";\n/m,
    ""
  );


newIncome =
  newIncome.replace(
    /type Membership = \{\n  business_id: string;\n\};\n\n/,
    ""
  );


newIncome =
  newIncome.replace(
    /function createIncomeNumber\(\) \{[\s\S]*?\n\}\n\nfunction getAccountIcon/,
    "function getAccountIcon"
  );


const newIncomeLoadStart =
`  // ==========================================================
  // LOAD PAGE
  // ==========================================================`;


const newIncomeLoadEnd =
`  // ==========================================================
  // SELECTED VALUES
  // ==========================================================`;


const newIncomeLoadBlock =
`  // ==========================================================
  // LOAD LOCAL PAGE
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadPage() {

      try {

        setLoading(
          true
        );

        setError(
          ""
        );

        const response =
          await fetch(
            "/api/local/income",
            {
              cache:
                "no-store",
            }
          );

        if (
          response.status ===
          401
        ) {

          router.replace(
            "/login"
          );

          return;
        }

        const data =
          (await response.json()) as {
            success?: boolean;
            error?: string;
            business_id?: string;
            user_id?: string;

            categories?: Array<{
              id: string;
              name: string;
              active: boolean;
            }>;

            accounts?: Array<{
              id: string;
              name: string;
              account_type: string;
              active: boolean;
            }>;
          };

        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.error ||
              "Unable to load the income form."
          );
        }

        if (!active) {
          return;
        }

        setUserId(
          data.user_id ??
          ""
        );

        setBusinessId(
          data.business_id ??
          ""
        );

        const sourceList =
          (
            data.categories ??
            []
          )
            .filter(
              (
                source
              ) =>
                source.active
            )
            .map(
              (
                source
              ) => ({
                id:
                  source.id,

                name:
                  source.name,
              })
            );

        const accountList =
          (
            data.accounts ??
            []
          )
            .filter(
              (
                account
              ) =>
                account.active
            )
            .map(
              (
                account
              ) => ({
                id:
                  account.id,

                name:
                  account.name,

                account_type:
                  account.account_type,
              })
            );

        setIncomeSources(
          sourceList
        );

        setAccounts(
          accountList
        );

        setSourceId(
          NO_SOURCE
        );

        setAccountId(
          accountList[0]?.id ??
          ""
        );

        setLoading(
          false
        );

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
              : "Unable to load the income form."
          );

          setLoading(
            false
          );
        }
      }
    }

    loadPage();

    return () => {
      active = false;
    };

  }, [
    router,
  ]);

`;


newIncome =
  replaceSection(
    newIncome,
    newIncomeLoadStart,
    newIncomeLoadEnd,
    newIncomeLoadBlock,
    "New income load"
  );


// Remove old note construction.
// The server now handles reference + notes.

newIncome =
  newIncome.replace(
    /      const noteParts = \[\n[\s\S]*?      \]\.filter\(Boolean\);\n\n/,
    ""
  );


// ============================================================
// SAVE NEW INCOME
// ============================================================

const insertStart =
`      const {
        error:
          insertError,
      } = await supabase`;


const insertEnd =
`      router.push(`;


const insertStartIndex =
  newIncome.indexOf(
    insertStart
  );


const insertEndIndex =
  newIncome.indexOf(
    insertEnd,
    insertStartIndex
  );


if (
  insertStartIndex < 0 ||
  insertEndIndex < 0
) {

  throw new Error(
    "New income save block not found. No files were changed."
  );
}


const insertBlock =
`      const response =
        await fetch(
          "/api/local/income",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                date_received:
                  dateReceived,

                category_id:
                  selectedIncomeSource.id,

                description:
                  description.trim(),

                amount:
                  numericAmount,

                account_id:
                  selectedAccount.id,

                reference:
                  reference.trim() ||
                  null,

                note:
                  note.trim() ||
                  null,
              }),
          }
        );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.error ||
            "Unable to save income."
        );
      }

`;


newIncome =
  newIncome.slice(
    0,
    insertStartIndex
  ) +
  insertBlock +
  newIncome.slice(
    insertEndIndex
  );


// ============================================================
// VERIFY CLIENT CONVERSION
// ============================================================

if (
  income.includes(
    "supabase"
  )
) {

  throw new Error(
    "Income page still contains Supabase references. No files were changed."
  );
}


if (
  newIncome.includes(
    "supabase"
  )
) {

  throw new Error(
    "New Income page still contains Supabase references. No files were changed."
  );
}


// ============================================================
// LOCAL INCOME API
// ============================================================

const route =
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


// ============================================================
// ACCESS
// ============================================================

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


// ============================================================
// HELPERS
// ============================================================

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


// ============================================================
// GET INCOME
// ============================================================

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


// ============================================================
// ADD INCOME
// ============================================================

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
      ) as
        | {
            id: string;
          }
        | undefined;


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


    const noteParts = [
      reference
        ? \`Reference: \${reference}\`
        : "",

      note,
    ].filter(
      Boolean
    );


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

      noteParts.length > 0
        ? noteParts.join(
            " · "
          )
        : null,

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


// ============================================================
// EDIT INCOME
// ============================================================

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


    const category =
      db.prepare(
        \`
          SELECT id

          FROM categories

          WHERE id = ?
            AND business_id = ?
            AND category_type =
              'income'

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
      notes || null,

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


// ============================================================
// DELETE INCOME
// ============================================================

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


    if (
      ids.length > 500
    ) {

      return errorResponse(
        "Too many records selected."
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
// WRITE FILES
// ============================================================

fs.mkdirSync(
  path.dirname(
    routePath
  ),
  {
    recursive: true,
  }
);


fs.writeFileSync(
  routePath,
  route,
  "utf8"
);


fs.writeFileSync(
  incomePath,
  income,
  "utf8"
);


fs.writeFileSync(
  newIncomePath,
  newIncome,
  "utf8"
);


console.log("");
console.log(
  "LOCAL INCOME CONVERSION APPLIED"
);

console.log(
  "Backup:",
  backupDir
);

console.log(
  "Income list: local SQLite"
);

console.log(
  "Add income: local SQLite"
);

console.log(
  "Edit/delete income: local SQLite"
);