import "server-only";

import {
  createHash,
} from "node:crypto";

import type {
  NextRequest,
} from "next/server";

import {
  getLocalDb,
} from "@/lib/localDb";

const COOKIE_NAME =
  "djallows_session";

type SessionRow = {
  user_id: string;
  username: string;
  email: string | null;
  full_name: string | null;
  platform_role: string;
  is_active: number;
  must_change_password: number;
  expires_at: string;
};

type AccessRow = {
  business_id: string;
  access_role: string;
  active: number;
};

function hashToken(
  token: string
) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export function getLocalSessionUser(
  request: NextRequest
) {
  const rawToken =
    request.cookies.get(
      COOKIE_NAME
    )?.value;

  if (!rawToken) {
    return null;
  }

  const db = getLocalDb();
  const now = new Date().toISOString();

  db.prepare(
    `DELETE FROM local_sessions WHERE expires_at <= ?`
  ).run(now);

  const session =
    db.prepare(
      `
        SELECT
          u.id AS user_id,
          u.username,
          u.email,
          u.full_name,
          u.platform_role,
          u.is_active,
          u.must_change_password,
          s.expires_at
        FROM local_sessions s
        INNER JOIN local_users u
          ON u.id = s.user_id
        WHERE s.token = ?
          AND s.expires_at > ?
        LIMIT 1
      `
    ).get(
      hashToken(rawToken),
      now
    ) as SessionRow | undefined;

  if (
    !session ||
    session.is_active !== 1
  ) {
    return null;
  }

  const access =
    db.prepare(
      `
        SELECT
          business_id,
          access_role,
          active
        FROM business_user_access
        WHERE user_id = ?
        LIMIT 1
      `
    ).get(
      session.user_id
    ) as AccessRow | undefined;

  if (
    session.platform_role !==
      "super_admin" &&
    (
      !access ||
      access.active !== 1
    )
  ) {
    return null;
  }

  return {
    user: session,
    access: access ?? null,
  };
}
