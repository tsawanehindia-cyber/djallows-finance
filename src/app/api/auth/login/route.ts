import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

function cleanUsername(
  value: unknown
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export async function POST(
  request: Request
) {
  try {
    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const publishableKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (
      !supabaseUrl ||
      !publishableKey
    ) {
      return NextResponse.json(
        {
          error:
            "Djallows Finance is not configured correctly.",
        },
        {
          status: 500,
        }
      );
    }

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
          error:
            "Enter your username and password.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================================
    // PROFILE
    // =========================================================

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from("user_profiles")
        .select(
          `
          id,
          username,
          full_name,
          platform_role,
          is_active,
          must_change_password
        `
        )
        .eq(
          "username",
          username
        )
        .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
      console.error(
        "LOGIN PROFILE ERROR:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "Invalid username or password.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      profile.is_active ===
      false
    ) {
      return NextResponse.json(
        {
          error:
            "This account has been disabled. Contact the administrator.",
        },
        {
          status: 403,
        }
      );
    }

    // =========================================================
    // AUTH USER
    // =========================================================

    const {
      data: authUserData,
      error: authUserError,
    } =
      await supabaseAdmin
        .auth.admin
        .getUserById(
          profile.id
        );

    const authUser =
      authUserData.user;

    if (
      authUserError ||
      !authUser ||
      !authUser.email
    ) {
      console.error(
        "LOGIN AUTH USER ERROR:",
        authUserError
      );

      return NextResponse.json(
        {
          error:
            "Invalid username or password.",
        },
        {
          status: 401,
        }
      );
    }

    // =========================================================
    // PASSWORD CHECK
    // =========================================================

    const authClient =
      createClient(
        supabaseUrl,
        publishableKey,
        {
          auth: {
            persistSession:
              false,

            autoRefreshToken:
              false,
          },
        }
      );

    const {
      data: signInData,
      error: signInError,
    } =
      await authClient.auth
        .signInWithPassword({
          email:
            authUser.email,

          password,
        });

    if (
      signInError ||
      !signInData.session ||
      !signInData.user
    ) {
      console.error(
        "LOGIN PASSWORD ERROR:",
        signInError?.message ??
          "No session returned"
      );

      return NextResponse.json(
        {
          error:
            "Invalid username or password.",
        },
        {
          status: 401,
        }
      );
    }

    // =========================================================
    // BUSINESS ACCESS
    // =========================================================

    const {
      data: businessAccess,
      error:
        businessAccessError,
    } =
      await supabaseAdmin
        .from(
          "business_user_access"
        )
        .select(
          `
          business_id,
          access_role,
          active
        `
        )
        .eq(
          "user_id",
          profile.id
        )
        .limit(1)
        .maybeSingle();

    if (
      profile.platform_role !==
      "super_admin"
    ) {
      if (
        businessAccessError ||
        !businessAccess
      ) {
        console.error(
          "LOGIN BUSINESS ACCESS ERROR:",
          businessAccessError
        );

        return NextResponse.json(
          {
            error:
              "You do not have access to Djallows Farm.",
          },
          {
            status: 403,
          }
        );
      }

      if (
        businessAccess.active ===
        false
      ) {
        return NextResponse.json(
          {
            error:
              "Your access to Djallows Farm has been disabled.",
          },
          {
            status: 403,
          }
        );
      }
    }

    // =========================================================
    // SUCCESS
    // =========================================================

    return NextResponse.json({
      success: true,

      must_change_password:
        profile.must_change_password ===
        true,

      session: {
        access_token:
          signInData.session
            .access_token,

        refresh_token:
          signInData.session
            .refresh_token,
      },

      user: {
        id:
          profile.id,

        username:
          profile.username,

        full_name:
          profile.full_name,

        platform_role:
          profile.platform_role,

        business_id:
          businessAccess
            ?.business_id ??
          null,

        role:
          businessAccess
            ?.access_role ??
          null,

        must_change_password:
          profile
            .must_change_password ===
          true,
      },
    });
  } catch (error) {
    console.error(
      "LOGIN GENERAL ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to sign in. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}