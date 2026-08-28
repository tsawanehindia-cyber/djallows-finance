import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

const DJALLOWS_BUSINESS_ID =
  "2ea46220-b539-4921-8750-3f582414aad6";

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
    // CALLER PROFILE
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

    const isSuperAdmin =
      callerProfile
        .platform_role ===
      "super_admin";

    // =========================================================
    // VERIFY FARM ADMIN
    // =========================================================

    let callerBusinessRole:
      | string
      | null = null;

    if (!isSuperAdmin) {
      const {
        data: callerAccess,
        error:
          callerAccessError,
      } =
        await supabaseAdmin
          .from(
            "business_user_access"
          )
          .select(
            `
            access_role,
            active
          `
          )
          .eq(
            "business_id",
            DJALLOWS_BUSINESS_ID
          )
          .eq(
            "user_id",
            callerId
          )
          .maybeSingle();

      if (
        callerAccessError ||
        !callerAccess ||
        callerAccess.active ===
          false ||
        callerAccess.access_role !==
          "admin"
      ) {
        return NextResponse.json(
          {
            error:
              "You do not have permission to manage users.",
          },
          {
            status: 403,
          }
        );
      }

      callerBusinessRole =
        callerAccess.access_role;
    }

    // =========================================================
    // INPUT
    // =========================================================

    const body =
      await request.json();

    const targetUserId =
      String(
        body.user_id ?? ""
      ).trim();

    const newActiveStatus =
      body.is_active;

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

    if (
      typeof newActiveStatus !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "Select a valid account status.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================================
    // PREVENT NORMAL ADMIN FROM MANAGING SELF
    // =========================================================

    if (
      !isSuperAdmin &&
      targetUserId === callerId
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot disable or enable your own Admin account.",
        },
        {
          status: 403,
        }
      );
    }

    // =========================================================
    // LOAD TARGET FARM ACCESS
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
          access_role,
          active
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
    // ADMIN RESTRICTIONS
    //
    // Admin may only manage Staff or Viewer.
    // =========================================================

    if (
      !isSuperAdmin &&
      callerBusinessRole ===
        "admin" &&
      targetAccess.access_role ===
        "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Only the Super Admin can disable or enable an Admin account.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      !isSuperAdmin &&
      targetAccess.access_role !==
        "staff" &&
      targetAccess.access_role !==
        "viewer"
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to manage this account.",
        },
        {
          status: 403,
        }
      );
    }

    // =========================================================
    // LOAD TARGET PROFILE
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
          full_name,
          platform_role,
          is_active
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
    // NEVER MANAGE SUPER ADMIN THROUGH FARM USER CONTROLS
    // =========================================================

    if (
      targetProfile
        .platform_role ===
      "super_admin"
    ) {
      return NextResponse.json(
        {
          error:
            "The Super Admin account cannot be managed from farm user controls.",
        },
        {
          status: 403,
        }
      );
    }

    const previousAccessStatus =
      targetAccess.active !==
      false;

    const previousProfileStatus =
      targetProfile.is_active !==
      false;

    // =========================================================
    // UPDATE BUSINESS ACCESS FIRST
    //
    // Re-enabling Staff/Viewer also passes through the
    // existing 5-user limit trigger.
    // =========================================================

    const {
      error:
        accessUpdateError,
    } =
      await supabaseAdmin
        .from(
          "business_user_access"
        )
        .update({
          active:
            newActiveStatus,
        })
        .eq(
          "business_id",
          DJALLOWS_BUSINESS_ID
        )
        .eq(
          "user_id",
          targetUserId
        );

    if (
      accessUpdateError
    ) {
      console.error(
        "Account access update error:",
        accessUpdateError
      );

      return NextResponse.json(
        {
          error:
            accessUpdateError.message ??
            "Unable to update the account.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================================
    // UPDATE USER PROFILE
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
          is_active:
            newActiveStatus,
        })
        .eq(
          "id",
          targetUserId
        );

    if (
      profileUpdateError
    ) {
      // Roll back access.

      await supabaseAdmin
        .from(
          "business_user_access"
        )
        .update({
          active:
            previousAccessStatus,
        })
        .eq(
          "business_id",
          DJALLOWS_BUSINESS_ID
        )
        .eq(
          "user_id",
          targetUserId
        );

      console.error(
        "Account profile update error:",
        profileUpdateError
      );

      return NextResponse.json(
        {
          error:
            "Unable to update the account.",
        },
        {
          status: 500,
        }
      );
    }

    // =========================================================
    // AUTH LOGIN BAN
    //
    // Disabled:
    // Block Supabase Auth login.
    //
    // Enabled:
    // Remove the login ban.
    // =========================================================

    const {
      error:
        authUpdateError,
    } =
      await supabaseAdmin
        .auth.admin
        .updateUserById(
          targetUserId,
          {
            ban_duration:
              newActiveStatus
                ? "none"
                : "876000h",
          }
        );

    if (
      authUpdateError
    ) {
      // Roll back database changes.

      await supabaseAdmin
        .from(
          "business_user_access"
        )
        .update({
          active:
            previousAccessStatus,
        })
        .eq(
          "business_id",
          DJALLOWS_BUSINESS_ID
        )
        .eq(
          "user_id",
          targetUserId
        );

      await supabaseAdmin
        .from(
          "user_profiles"
        )
        .update({
          is_active:
            previousProfileStatus,
        })
        .eq(
          "id",
          targetUserId
        );

      console.error(
        "Account auth status error:",
        authUpdateError
      );

      return NextResponse.json(
        {
          error:
            "Unable to update the user's login access.",
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

        is_active:
          newActiveStatus,
      },
    });
  } catch (error) {
    console.error(
      "Set account status error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to update the account. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}