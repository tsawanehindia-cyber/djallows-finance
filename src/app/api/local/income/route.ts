import {
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
    `INC-${year}${month}${day}-` +
    `${hours}${minutes}${seconds}-${random}`
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
          `
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
          `
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
          `
            SELECT
              id,
              name,
              active

            FROM categories

            WHERE business_id = ?
              AND category_type =
                'income'

            ORDER BY name
          `
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
          `
            SELECT
              id,
              name,
              account_type,
              active

            FROM financial_accounts

            WHERE business_id = ?

            ORDER BY name
          `
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
        `
          SELECT id

          FROM categories

          WHERE id = ?
            AND business_id = ?
            AND category_type =
              'income'
            AND active = 1

          LIMIT 1
        `
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
        `
          SELECT
            id,
            name

          FROM financial_accounts

          WHERE id = ?
            AND business_id = ?
            AND active = 1

          LIMIT 1
        `
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
      `
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
      `
    )
    .run(
      id,
      access.businessId,
      transactionNumber,
      `${dateReceived}T12:00:00`,
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
        `
          SELECT
            id,
            created_by

          FROM transactions

          WHERE id = ?
            AND business_id = ?
            AND transaction_type =
              'income'

          LIMIT 1
        `
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
        `
          SELECT
            id,
            name

          FROM financial_accounts

          WHERE id = ?
            AND business_id = ?

          LIMIT 1
        `
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
      `
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
      `
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
        `
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
        `
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
        `
          DELETE FROM transactions

          WHERE business_id = ?
            AND transaction_type =
              'income'

            AND id IN (
              ${placeholders}
            )
        `
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
