import {
  NextResponse,
} from "next/server";

import {
  getLocalDatabasePath,
  getLocalDb,
} from "@/lib/localDb";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const BUSINESS_ID =
  "2ea46220-b539-4921-8750-3f582414aad6";


function countTable(
  tableName: string
) {

  const allowedTables =
    new Set([
      "contacts",
      "employees",
      "expenses",
      "invoices",
      "payments",
      "transactions",
      "contracts",
    ]);

  if (
    !allowedTables.has(
      tableName
    )
  ) {
    throw new Error(
      "Invalid table."
    );
  }

  const db =
    getLocalDb();

  const result =
    db
      .prepare(
        `SELECT COUNT(*) AS total FROM ${tableName}`
      )
      .get();

  return Number(
    result?.total ?? 0
  );
}


export async function GET() {

  try {

    const db =
      getLocalDb();

    const business =
      db
        .prepare(`
          SELECT
            name,
            location,
            currency,
            ceo_name,
            tagline
          FROM businesses
          WHERE id = ?
          LIMIT 1
        `)
        .get(
          BUSINESS_ID
        );


    if (!business) {

      return NextResponse.json(
        {
          ok: false,

          error:
            "Djallows Farm local business profile was not found.",
        },
        {
          status: 500,
        }
      );
    }


    return NextResponse.json({
      ok: true,

      mode:
        "local-sqlite",

      database:
        getLocalDatabasePath(),

      business,

      records: {
        contacts:
          countTable(
            "contacts"
          ),

        employees:
          countTable(
            "employees"
          ),

        expenses:
          countTable(
            "expenses"
          ),

        invoices:
          countTable(
            "invoices"
          ),

        payments:
          countTable(
            "payments"
          ),

        transactions:
          countTable(
            "transactions"
          ),

        consultations:
          countTable(
            "contracts"
          ),
      },
    });

  } catch (error) {

    console.error(
      "LOCAL DATABASE HEALTH ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          "Unable to open the Djallows Farm local database.",
      },
      {
        status: 500,
      }
    );
  }
}