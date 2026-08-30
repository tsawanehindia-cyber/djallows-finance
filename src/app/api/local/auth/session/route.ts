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


type SessionRow = {
  session_id: string;
  expires_at: string;
  user_id: string;
  username: string;
  email: string | null;
  full_name: string | null;
  platform_role: string;
  is_active: number;
  must_change_password: number;
};


type AccessRow = {
  business_id: string;
  access_role: string;
  active: number;
};


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


export async function GET(
  request: NextRequest
) {

  try {

    const rawToken =
      request.cookies.get(
        COOKIE_NAME
      )?.value;


    if (!rawToken) {

      return NextResponse.json(
        {
          success: false,
          session: null,
        },
        {
          status: 401,
        }
      );
    }


    const db =
      getLocalDb();


    const now =
      new Date().toISOString();


    db
      .prepare(`
        DELETE FROM local_sessions
        WHERE expires_at <= ?
      `)
      .run(
        now
      );


    const session =
      db
        .prepare(`
          SELECT
            s.id AS session_id,
            s.expires_at,

            u.id AS user_id,
            u.username,
            u.email,
            u.full_name,
            u.platform_role,
            u.is_active,
            u.must_change_password

          FROM local_sessions s

          INNER JOIN local_users u
            ON u.id = s.user_id

          WHERE s.token = ?
            AND s.expires_at > ?

          LIMIT 1
        `)
        .get(
          hashToken(
            rawToken
          ),
          now
        ) as SessionRow | undefined;


    if (
      !session ||
      session.is_active !== 1
    ) {

      const response =
        NextResponse.json(
          {
            success: false,
            session: null,
          },
          {
            status: 401,
          }
        );


      response.cookies.delete(
        COOKIE_NAME
      );


      return response;
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
          session.user_id
        ) as AccessRow | undefined;


    return NextResponse.json({
      success: true,

      session: {
        expires_at:
          session.expires_at,

        user: {
          id:
            session.user_id,

          email:
            session.email,

          user_metadata: {
            username:
              session.username,

            full_name:
              session.full_name,
          },
        },
      },

      profile: {
        id:
          session.user_id,

        username:
          session.username,

        full_name:
          session.full_name,

        platform_role:
          session.platform_role,

        is_active:
          session.is_active === 1,

        must_change_password:
          session.must_change_password ===
          1,
      },

      business_access: {
        business_id:
          access?.business_id ??
          null,

        access_role:
          access?.access_role ??
          (
            session.platform_role ===
            "super_admin"
              ? "owner"
              : null
          ),

        active:
          access?.active === 1 ||
          session.platform_role ===
            "super_admin",
      },
    });

  } catch (
    error
  ) {

    console.error(
      "LOCAL SESSION ERROR:",
      error
    );


    return NextResponse.json(
      {
        success: false,
        session: null,
      },
      {
        status: 500,
      }
    );
  }
}