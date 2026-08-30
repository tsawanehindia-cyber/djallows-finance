import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

import {
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


type LocalUserRow = {
  id: string;
  username: string;
  email: string | null;
  password_hash: string;
  full_name: string | null;
  phone: string | null;
  platform_role: string;
  is_active: number;
  must_change_password: number;
};


type AccessRow = {
  business_id: string;
  access_role: string;
  active: number;
};


function cleanUsername(
  value: unknown
) {

  return String(
    value ?? ""
  )
    .trim()
    .toLowerCase();
}


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


function verifyPassword(
  password: string,
  storedHash: string
) {

  try {

    const parts =
      storedHash.split(
        "$"
      );


    if (
      parts.length !== 3 ||
      parts[0] !== "scrypt"
    ) {
      return false;
    }


    const salt =
      Buffer.from(
        parts[1],
        "base64"
      );


    const expectedHash =
      Buffer.from(
        parts[2],
        "base64"
      );


    const actualHash =
      scryptSync(
        password,
        salt,
        expectedHash.length
      );


    if (
      actualHash.length !==
      expectedHash.length
    ) {
      return false;
    }


    return timingSafeEqual(
      expectedHash,
      actualHash
    );

  } catch {

    return false;
  }
}


export async function POST(
  request: Request
) {

  try {

    const body =
      await request.json();


    const username =
      cleanUsername(
        body.username
      );


    const password =
      String(
        body.password ?? ""
      );


    if (
      !username ||
      !password
    ) {

      return NextResponse.json(
        {
          success: false,

          error:
            "Enter your username and password.",
        },
        {
          status: 400,
        }
      );
    }


    const db =
      getLocalDb();


    const user =
      db
        .prepare(`
          SELECT
            id,
            username,
            email,
            password_hash,
            full_name,
            phone,
            platform_role,
            is_active,
            must_change_password

          FROM local_users

          WHERE LOWER(username) = ?

          LIMIT 1
        `)
        .get(
          username
        ) as LocalUserRow | undefined;


    if (
      !user ||
      user.is_active !== 1
    ) {

      return NextResponse.json(
        {
          success: false,

          error:
            "Invalid username or password.",
        },
        {
          status: 401,
        }
      );
    }


    const validPassword =
      verifyPassword(
        password,
        user.password_hash
      );


    if (
      !validPassword
    ) {

      return NextResponse.json(
        {
          success: false,

          error:
            "Invalid username or password.",
        },
        {
          status: 401,
        }
      );
    }


    const access =
      db
        .prepare(`
          SELECT
            business_id,
            access_role,
            active

          FROM business_user_access

          WHERE user_id = ?

          LIMIT 1
        `)
        .get(
          user.id
        ) as AccessRow | undefined;


    if (
      user.platform_role !==
        "super_admin" &&
      (
        !access ||
        access.active !== 1
      )
    ) {

      return NextResponse.json(
        {
          success: false,

          error:
            "You do not have access to Djallows Farm.",
        },
        {
          status: 403,
        }
      );
    }


    const now =
      new Date();


    const expires =
      new Date(
        now.getTime() +
        12 * 60 * 60 * 1000
      );


    db
      .prepare(`
        DELETE FROM local_sessions
        WHERE expires_at <= ?
      `)
      .run(
        now.toISOString()
      );


    const rawToken =
      randomBytes(
        32
      ).toString(
        "hex"
      );


    const tokenHash =
      hashToken(
        rawToken
      );


    db
      .prepare(`
        INSERT INTO local_sessions (
          id,
          user_id,
          token,
          created_at,
          expires_at
        )
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        randomUUID(),
        user.id,
        tokenHash,
        now.toISOString(),
        expires.toISOString()
      );


    const response =
      NextResponse.json({
        success: true,

        must_change_password:
          user.must_change_password ===
          1,

        user: {
          id:
            user.id,

          username:
            user.username,

          full_name:
            user.full_name,

          platform_role:
            user.platform_role,

          business_id:
            access?.business_id ??
            null,

          role:
            access?.access_role ??
            (
              user.platform_role ===
              "super_admin"
                ? "owner"
                : null
            ),
        },
      });


    response.cookies.set({
      name:
        COOKIE_NAME,

      value:
        rawToken,

      httpOnly:
        true,

      sameSite:
        "lax",

      secure:
        false,

      path:
        "/",

      expires,
    });


    return response;

  } catch (
    error
  ) {

    console.error(
      "LOCAL LOGIN ERROR:",
      error
    );


    return NextResponse.json(
      {
        success: false,

        error:
          "Unable to sign in.",
      },
      {
        status: 500,
      }
    );
  }
}