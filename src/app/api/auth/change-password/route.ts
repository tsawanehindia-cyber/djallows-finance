import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  request: Request
) {
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
      data: userData,
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !userData.user
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

    const userId =
      userData.user.id;

    // =========================================================
    // LOAD PROFILE
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
          is_active,
          must_change_password
        `
        )
        .eq(
          "id",
          userId
        )
        .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
      return NextResponse.json(
        {
          error:
            "Your user profile could not be found.",
        },
        {
          status: 404,
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
            "Your account is disabled.",
        },
        {
          status: 403,
        }
      );
    }

    // =========================================================
    // PASSWORD
    // =========================================================

    const body =
      await request.json();

    const newPassword =
      String(
        body.new_password ?? ""
      );

    if (!newPassword) {
      return NextResponse.json(
        {
          error:
            "Enter your new password.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      newPassword.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            "Your password must contain at least 8 characters.",
        },
        {
          status: 400,
        }
      );
    }

    const hasUppercase =
      /[A-Z]/.test(
        newPassword
      );

    const hasLowercase =
      /[a-z]/.test(
        newPassword
      );

    const hasNumber =
      /[0-9]/.test(
        newPassword
      );

    if (
      !hasUppercase ||
      !hasLowercase ||
      !hasNumber
    ) {
      return NextResponse.json(
        {
          error:
            "Your password must contain an uppercase letter, a lowercase letter and a number.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================================
    // UPDATE AUTH PASSWORD
    // =========================================================

    const {
      error: passwordError,
    } =
      await supabaseAdmin.auth.admin
        .updateUserById(
          userId,
          {
            password:
              newPassword,
          }
        );

    if (passwordError) {
      console.error(
        "Password update error:",
        passwordError
      );

      return NextResponse.json(
        {
          error:
            "Could not change your password.",
        },
        {
          status: 500,
        }
      );
    }

    // =========================================================
    // REMOVE TEMPORARY PASSWORD FLAG
    // =========================================================

    const {
      error: profileUpdateError,
    } =
      await supabaseAdmin
        .from("user_profiles")
        .update({
          must_change_password:
            false,
        })
        .eq(
          "id",
          userId
        );

    if (
      profileUpdateError
    ) {
      console.error(
        "Profile password flag error:",
        profileUpdateError
      );

      return NextResponse.json(
        {
          error:
            "Your password was changed, but your account could not be finalised. Contact the Super Admin.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Change password error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to change your password. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}