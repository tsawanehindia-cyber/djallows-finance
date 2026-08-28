import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

const DJALLOWS_BUSINESS_ID =
  "2ea46220-b539-4921-8750-3f582414aad6";

type AccessRole =
  | "admin"
  | "staff"
  | "viewer";

function cleanUsername(
  value: unknown
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function cleanText(
  value: unknown
) {
  return String(value ?? "")
    .trim();
}

function generateTemporaryPassword() {
  return `Dj7-${randomBytes(
    8
  ).toString("base64url")}`;
}

function validUsername(
  username: string
) {
  return /^[a-z0-9._-]{3,30}$/.test(
    username
  );
}

export async function POST(
  request: Request
) {
  let createdUserId:
    | string
    | null = null;

  try {
    // =========================================================
    // VERIFY LOGIN
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
    // BUSINESS ADMIN CHECK
    // =========================================================

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
    }

    // =========================================================
    // INPUT
    // =========================================================

    const body =
      await request.json();

    const username =
      cleanUsername(
        body.username
      );

    const fullName =
      cleanText(
        body.full_name
      );

    const phone =
      cleanText(
        body.phone
      );

    const requestedRole =
      cleanUsername(
        body.role
      ) as AccessRole;

    if (!fullName) {
      return NextResponse.json(
        {
          error:
            "Enter the user's full name.",
        },
        {
          status: 400,
        }
      );
    }

    if (!username) {
      return NextResponse.json(
        {
          error:
            "Enter a username.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !validUsername(
        username
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Username must be 3 to 30 characters and can only contain letters, numbers, dots, underscores or hyphens.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      requestedRole !==
        "admin" &&
      requestedRole !==
        "staff" &&
      requestedRole !==
        "viewer"
    ) {
      return NextResponse.json(
        {
          error:
            "Select a valid user role.",
        },
        {
          status: 400,
        }
      );
    }

    // Only Super Admin can create an Admin.
    if (
      requestedRole ===
        "admin" &&
      !isSuperAdmin
    ) {
      return NextResponse.json(
        {
          error:
            "Only the Super Admin can create an Admin account.",
        },
        {
          status: 403,
        }
      );
    }

    // =========================================================
    // UNIQUE USERNAME
    // =========================================================

    const {
      data: existingProfile,
      error:
        existingProfileError,
    } =
      await supabaseAdmin
        .from(
          "user_profiles"
        )
        .select("id")
        .eq(
          "username",
          username
        )
        .maybeSingle();

    if (
      existingProfileError
    ) {
      console.error(
        "Username check error:",
        existingProfileError
      );

      return NextResponse.json(
        {
          error:
            "Unable to check the username.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      existingProfile
    ) {
      return NextResponse.json(
        {
          error:
            "That username is already in use.",
        },
        {
          status: 409,
        }
      );
    }

    // =========================================================
    // ADDITIONAL USER LIMIT
    //
    // Both Staff and Viewer count towards the 5-user limit.
    // Admin does not count.
    // =========================================================

    if (
      requestedRole ===
        "staff" ||
      requestedRole ===
        "viewer"
    ) {
      const {
        data: limitRow,
        error: limitError,
      } =
        await supabaseAdmin
          .from(
            "business_user_limits"
          )
          .select(
            "max_additional_users"
          )
          .eq(
            "business_id",
            DJALLOWS_BUSINESS_ID
          )
          .maybeSingle();

      if (limitError) {
        console.error(
          "User limit error:",
          limitError
        );

        return NextResponse.json(
          {
            error:
              "Unable to check the user limit.",
          },
          {
            status: 500,
          }
        );
      }

      const maximum =
        Number(
          limitRow
            ?.max_additional_users ??
            5
        );

      const {
        count,
        error: countError,
      } =
        await supabaseAdmin
          .from(
            "business_user_access"
          )
          .select(
            "user_id",
            {
              count: "exact",
              head: true,
            }
          )
          .eq(
            "business_id",
            DJALLOWS_BUSINESS_ID
          )
          .in(
            "access_role",
            [
              "staff",
              "viewer",
            ]
          )
          .eq(
            "active",
            true
          );

      if (
        countError
      ) {
        console.error(
          "User count error:",
          countError
        );

        return NextResponse.json(
          {
            error:
              "Unable to check the user limit.",
          },
          {
            status: 500,
          }
        );
      }

      if (
        (count ?? 0) >=
        maximum
      ) {
        return NextResponse.json(
          {
            error:
              `The maximum of ${maximum} additional users has been reached.`,
          },
          {
            status: 400,
          }
        );
      }
    }

    // =========================================================
    // AUTH USER
    // =========================================================

    const temporaryPassword =
      generateTemporaryPassword();

    const hiddenEmail =
      `${username}@users.djallowsfinance.invalid`;

    const {
      data: newAuthUser,
      error:
        authCreateError,
    } =
      await supabaseAdmin
        .auth.admin
        .createUser({
          email:
            hiddenEmail,

          password:
            temporaryPassword,

          email_confirm:
            true,

          user_metadata: {
            username,

            full_name:
              fullName,
          },
        });

    if (
      authCreateError ||
      !newAuthUser.user
    ) {
      console.error(
        "Auth user creation error:",
        authCreateError
      );

      return NextResponse.json(
        {
          error:
            "Unable to create the user account.",
        },
        {
          status: 500,
        }
      );
    }

    createdUserId =
      newAuthUser.user.id;

    // =========================================================
    // PROFILE
    // =========================================================

    const {
      error:
        profileInsertError,
    } =
      await supabaseAdmin
        .from(
          "user_profiles"
        )
        .insert({
          id:
            createdUserId,

          username,

          full_name:
            fullName,

          phone:
            phone || null,

          platform_role:
            "user",

          is_active:
            true,

          must_change_password:
            true,
        });

    if (
      profileInsertError
    ) {
      console.error(
        "User profile creation error:",
        profileInsertError
      );

      throw new Error(
        "PROFILE_CREATION_FAILED"
      );
    }

    // =========================================================
    // PERMISSIONS
    // =========================================================

    const permissions =
      requestedRole ===
      "admin"
        ? {
            can_record_income:
              true,

            can_record_expenses:
              true,

            can_manage_contacts:
              true,

            can_create_invoices:
              true,

            can_view_reports:
              true,

            can_manage_payroll:
              true,
          }
        : requestedRole ===
            "staff"
          ? {
              can_record_income:
                true,

              can_record_expenses:
                true,

              can_manage_contacts:
                true,

              can_create_invoices:
                true,

              can_view_reports:
                true,

              can_manage_payroll:
                false,
            }
          : {
              can_record_income:
                false,

              can_record_expenses:
                false,

              can_manage_contacts:
                false,

              can_create_invoices:
                false,

              can_view_reports:
                true,

              can_manage_payroll:
                false,
            };

    // =========================================================
    // BUSINESS USER ACCESS
    // =========================================================

    const {
      error:
        accessInsertError,
    } =
      await supabaseAdmin
        .from(
          "business_user_access"
        )
        .insert({
          business_id:
            DJALLOWS_BUSINESS_ID,

          user_id:
            createdUserId,

          access_role:
            requestedRole,

          active:
            true,

          ...permissions,

          created_by:
            callerId,
        });

    if (
      accessInsertError
    ) {
      console.error(
        "Business access creation error:",
        accessInsertError
      );

      throw new Error(
        "ACCESS_CREATION_FAILED"
      );
    }

    // =========================================================
    // EXISTING FINANCE APP MEMBERSHIP
    // =========================================================

    const {
      error:
        membershipInsertError,
    } =
      await supabaseAdmin
        .from(
          "business_members"
        )
        .insert({
          business_id:
            DJALLOWS_BUSINESS_ID,

          user_id:
            createdUserId,

          role:
            requestedRole,
        });

    if (
      membershipInsertError
    ) {
      console.error(
        "Business membership creation error:",
        membershipInsertError
      );

      throw new Error(
        "MEMBERSHIP_CREATION_FAILED"
      );
    }

    return NextResponse.json({
      success: true,

      user: {
        id:
          createdUserId,

        username,

        full_name:
          fullName,

        phone:
          phone || null,

        role:
          requestedRole,
      },

      temporary_password:
        temporaryPassword,
    });
  } catch (error) {
    console.error(
      "Create user error:",
      error
    );

    // =========================================================
    // ROLLBACK PARTIAL USER
    // =========================================================

    if (createdUserId) {
      await supabaseAdmin
        .from(
          "business_user_access"
        )
        .delete()
        .eq(
          "business_id",
          DJALLOWS_BUSINESS_ID
        )
        .eq(
          "user_id",
          createdUserId
        );

      await supabaseAdmin
        .from(
          "business_members"
        )
        .delete()
        .eq(
          "business_id",
          DJALLOWS_BUSINESS_ID
        )
        .eq(
          "user_id",
          createdUserId
        );

      await supabaseAdmin
        .from(
          "user_profiles"
        )
        .delete()
        .eq(
          "id",
          createdUserId
        );

      await supabaseAdmin
        .auth.admin
        .deleteUser(
          createdUserId
        );
    }

    return NextResponse.json(
      {
        error:
          "Unable to create the user. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}