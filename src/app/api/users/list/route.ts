import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

const DJALLOWS_BUSINESS_ID =
  "2ea46220-b539-4921-8750-3f582414aad6";

export async function GET(
  request: Request
) {
  try {
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

    // =========================================================
    // CURRENT AUTH USER
    // =========================================================

    const {
      data: currentUserData,
      error: currentUserError,
    } =
      await supabaseAdmin.auth
        .getUser(
          accessToken
        );

    if (
      currentUserError ||
      !currentUserData.user
    ) {
      return NextResponse.json(
        {
          error:
            "Your login session has expired.",
        },
        {
          status: 401,
        }
      );
    }

    const currentUserId =
      currentUserData.user.id;

    // =========================================================
    // PROFILE
    // =========================================================

    const {
      data: currentProfile,
      error: currentProfileError,
    } =
      await supabaseAdmin
        .from("user_profiles")
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
          currentUserId
        )
        .maybeSingle();

    if (
      currentProfileError ||
      !currentProfile
    ) {
      console.error(
        "Current profile error:",
        currentProfileError
      );

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
      currentProfile.is_active ===
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
      currentProfile.platform_role ===
      "super_admin";

    let currentBusinessRole:
      | string
      | null = null;

    // =========================================================
    // ADMIN ACCESS CHECK
    // =========================================================

    if (!isSuperAdmin) {
      const {
        data: currentAccess,
        error: currentAccessError,
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
            currentUserId
          )
          .maybeSingle();

      if (
        currentAccessError ||
        !currentAccess
      ) {
        return NextResponse.json(
          {
            error:
              "You do not have access to user management.",
          },
          {
            status: 403,
          }
        );
      }

      if (
        currentAccess.active ===
        false
      ) {
        return NextResponse.json(
          {
            error:
              "Your account access is disabled.",
          },
          {
            status: 403,
          }
        );
      }

      currentBusinessRole =
        currentAccess.access_role;

      if (
        currentBusinessRole !==
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
    // USER LIMIT
    // =========================================================

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
    }

    const maxAdditionalUsers =
      Number(
        limitRow
          ?.max_additional_users ??
          5
      );

    // =========================================================
    // BUSINESS USERS
    // =========================================================

    const {
      data: accessRows,
      error: accessRowsError,
    } =
      await supabaseAdmin
        .from(
          "business_user_access"
        )
        .select(
          `
          user_id,
          access_role,
          active,
          can_record_income,
          can_record_expenses,
          can_manage_contacts,
          can_create_invoices,
          can_view_reports,
          can_manage_payroll,
          created_at
        `
        )
        .eq(
          "business_id",
          DJALLOWS_BUSINESS_ID
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );

    if (
      accessRowsError
    ) {
      console.error(
        "Business users error:",
        accessRowsError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load users.",
        },
        {
          status: 500,
        }
      );
    }

    const userIds =
      (accessRows ?? []).map(
        (row) =>
          row.user_id
      );

    let profiles: Array<{
      id: string;
      username: string;
      full_name:
        | string
        | null;
      phone:
        | string
        | null;
      platform_role: string;
      must_change_password: boolean;
    }> = [];

    if (
      userIds.length > 0
    ) {
      const {
        data: profileRows,
        error:
          profileRowsError,
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
            phone,
            platform_role,
            must_change_password
          `
          )
          .in(
            "id",
            userIds
          );

      if (
        profileRowsError
      ) {
        console.error(
          "User profiles error:",
          profileRowsError
        );

        return NextResponse.json(
          {
            error:
              "Unable to load user profiles.",
          },
          {
            status: 500,
          }
        );
      }

      profiles =
        profileRows ?? [];
    }

    const users =
      (accessRows ?? []).map(
        (access) => {
          const profile =
            profiles.find(
              (item) =>
                item.id ===
                access.user_id
            );

          return {
            id:
              access.user_id,

            username:
              profile
                ?.username ??
              "Unknown",

            full_name:
              profile
                ?.full_name ??
              null,

            phone:
              profile
                ?.phone ??
              null,

            role:
              access
                .access_role,

            is_active:
              access.active,

            must_change_password:
              profile
                ?.must_change_password ??
              false,

            permissions: {
              can_record_income:
                access
                  .can_record_income,

              can_record_expenses:
                access
                  .can_record_expenses,

              can_manage_contacts:
                access
                  .can_manage_contacts,

              can_create_invoices:
                access
                  .can_create_invoices,

              can_view_reports:
                access
                  .can_view_reports,

              can_manage_payroll:
                access
                  .can_manage_payroll,
            },
          };
        }
      );

    const activeAdditionalUsers =
      users.filter(
        (user) =>
          user.is_active &&
          (
            user.role ===
              "staff" ||
            user.role ===
              "viewer"
          )
      ).length;

    return NextResponse.json({
      success: true,

      current_user: {
        id:
          currentProfile.id,

        username:
          currentProfile.username,

        full_name:
          currentProfile.full_name,

        platform_role:
          currentProfile.platform_role,

        business_role:
          currentBusinessRole,

        is_super_admin:
          isSuperAdmin,
      },

      business: {
        id:
          DJALLOWS_BUSINESS_ID,

        name:
          "Djallows Farm",
      },

      user_limit: {
        used:
          activeAdditionalUsers,

        maximum:
          maxAdditionalUsers,

        remaining:
          Math.max(
            maxAdditionalUsers -
              activeAdditionalUsers,
            0
          ),
      },

      users,
    });
  } catch (error) {
    console.error(
      "Users list error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load users.",
      },
      {
        status: 500,
      }
    );
  }
}