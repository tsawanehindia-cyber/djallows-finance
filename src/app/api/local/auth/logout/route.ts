import {
  createHash,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getLocalDb,
} from "@/lib/localDb";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const COOKIE_NAME =
  "djallows_session";


function hashToken(
  token: string
) {

  return createHash(
    "sha256"
  )
    .update(
      token
    )
    .digest(
      "hex"
    );
}


export async function POST(
  request: NextRequest
) {

  const rawToken =
    request.cookies.get(
      COOKIE_NAME
    )?.value;


  if (rawToken) {

    const db =
      getLocalDb();


    db
      .prepare(`
        DELETE FROM local_sessions
        WHERE token = ?
      `)
      .run(
        hashToken(
          rawToken
        )
      );
  }


  const response =
    NextResponse.json({
      success: true,
    });


  response.cookies.delete(
    COOKIE_NAME
  );


  return response;
}