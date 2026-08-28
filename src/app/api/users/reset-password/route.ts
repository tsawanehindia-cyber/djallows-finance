import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

const DJALLOWS_BUSINESS_ID =
  "2ea46220-b539-4921-8750-3f582414aad6";

function generateTemporaryPassword() {
  return `Dj7-${randomBytes(
    8
  ).toString("base64url")}`;
}

export async function POST(
  request: Request
) {
  try {
    // =========================================================
    // VERIFY CURRENT LOGIN
    // =========================================================

    const authorization =
      request.headers.get(
        "authorization"
      );

    const accessToken =
      authorization?.startsWith(
        "Bearer "
      )
        ? authorization.slice(7)
        : "";

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Please sign in again.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: callerData,
      error: callerError,
    } =
      await supabaseAdmin.auth
        .getUser(
          accessToken
        );

    if (
      callerError ||
      !callerData.user
    ) {
      return NextResponse.json(
        {
          error:
            "Your login session has expired. Please sign in again.",
        },
        {
          status: 401,
        }
      );
    }

    const callerId =
      callerData.user.id;

    // =========================================================
    // ONLY SUPER ADMIN CAN RESET PASSWORDS
    // =========================================================

    const {
      data: callerProfile,
      error:
        callerProfileError,
    } =
      await supabaseAdmin
        .from(
          "user_profiles"
        )
        .select(
          `
          id,
          platform_role,
          is_active
        `
        )
        .eq(
          "id",
          callerId
        )
        .maybeSingle();

    if (
      callerProfileError ||
      !callerProfile
    ) {
      return NextResponse.json(
        {
          error:
            "Your user profile could not be found.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      callerProfile.is_active ===
      false
    ) {
      return NextResponse.json(
        {
          error:
            "Your account is disabled.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      callerProfile.platform_role !==
      "super_admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Only the Super Admin can reset passwords.",
        },
        {
          status: 403,
        }
      );
    }

    // =========================================================
    // TARGET USER
    // =========================================================

    const body =
      await request.json();

    const targetUserId =
      String(
        body.user_id ?? ""
      ).trim();

    if (!targetUserId) {
      return NextResponse.json(
        {
          error:
            "Select a user.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================================
    // CONFIRM USER BELONGS TO DJALLOWS FARM
    // =========================================================

    const {
      data: targetAccess,
      error:
        targetAccessError,
    } =
      await supabaseAdmin
        .from(
          "business_user_access"
        )
        .select(
          `
          user_id,
          access_role
        `
        )
        .eq(
          "business_id",
          DJALLOWS_BUSINESS_ID
        )
        .eq(
          "user_id",
          targetUserId
        )
        .maybeSingle();

    if (
      targetAccessError ||
      !targetAccess
    ) {
      return NextResponse.json(
        {
          error:
            "The selected Djallows Farm user could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    // =========================================================
    // CONFIRM PROFILE
    // =========================================================

    const {
      data: targetProfile,
      error:
        targetProfileError,
    } =
      await supabaseAdmin
        .from(
          "user_profiles"
        )
        .select(
          `
          id,
          username,
          full_name
        `
        )
        .eq(
          "id",
          targetUserId
        )
        .maybeSingle();

    if (
      targetProfileError ||
      !targetProfile
    ) {
      return NextResponse.json(
        {
          error:
            "The selected user profile could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    // =========================================================
    // GENERATE NEW TEMPORARY PASSWORD
    // =========================================================

    const temporaryPassword =
      generateTemporaryPassword();

    // =========================================================
    // UPDATE AUTH PASSWORD
    // =========================================================

    const {
      error:
        passwordUpdateError,
    } =
      await supabaseAdmin.auth.admin
        .updateUserById(
          targetUserId,
          {
            password:
              temporaryPassword,
          }
        );

    if (
      passwordUpdateError
    ) {
      console.error(
        "Reset password auth error:",
        passwordUpdateError
      );

      return NextResponse.json(
        {
          error:
            "Unable to reset the password.",
        },
        {
          status: 500,
        }
      );
    }

    // =========================================================
    // FORCE PASSWORD CHANGE AT NEXT LOGIN
    // =========================================================

    const {
      error:
        profileUpdateError,
    } =
      await supabaseAdmin
        .from(
          "user_profiles"
        )
        .update({
          must_change_password:
            true,
        })
        .eq(
          "id",
          targetUserId
        );

    if (
      profileUpdateError
    ) {
      console.error(
        "Reset password profile error:",
        profileUpdateError
      );

      return NextResponse.json(
        {
          error:
            "The password was reset, but the account could not be marked for first-login password change.",
        },
        {
          status: 500,
        }
      );
    }

    // =========================================================
    // SUCCESS
    // =========================================================

    return NextResponse.json({
      success: true,

      user: {
        id:
          targetProfile.id,

        username:
          targetProfile.username,

        full_name:
          targetProfile.full_name,

        role:
          targetAccess.access_role,
      },

      temporary_password:
        temporaryPassword,
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to reset the password. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}