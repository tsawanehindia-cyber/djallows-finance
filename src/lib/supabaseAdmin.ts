import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL in .env.local"
  );
}

if (!supabaseSecretKey) {
  throw new Error(
    "Missing SUPABASE_SECRET_KEY in .env.local"
  );
}

// ============================================================
// TRANSIENT SUPABASE JWT CLOCK-SKEW RETRY
//
// Occasionally PostgREST may reject a newly issued JWT with:
//
// PGRST303
// JWT issued at future
//
// This wrapper automatically waits briefly and retries.
// It only retries this exact transient authentication problem.
// ============================================================

function sleep(
  milliseconds: number
) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

async function isJwtFutureResponse(
  response: Response
) {
  if (
    response.status !== 401 &&
    response.status !== 403
  ) {
    return false;
  }

  try {
    const body =
      await response
        .clone()
        .text();

    const normalized =
      body.toLowerCase();

    return (
      normalized.includes(
        "jwt issued at future"
      ) ||
      normalized.includes(
        "pgrst303"
      )
    );
  } catch {
    return false;
  }
}

async function fetchWithJwtRetry(
  input:
    | RequestInfo
    | URL,
  init?: RequestInit
) {
  // ----------------------------------------------------------
  // FIRST ATTEMPT
  // ----------------------------------------------------------

  let response =
    await fetch(
      input,
      init
    );

  if (
    !(await isJwtFutureResponse(
      response
    ))
  ) {
    return response;
  }

  console.warn(
    "Supabase JWT clock skew detected. Retrying request..."
  );

  // ----------------------------------------------------------
  // SECOND ATTEMPT
  // ----------------------------------------------------------

  await sleep(1500);

  response =
    await fetch(
      input,
      init
    );

  if (
    !(await isJwtFutureResponse(
      response
    ))
  ) {
    return response;
  }

  // ----------------------------------------------------------
  // FINAL ATTEMPT
  // ----------------------------------------------------------

  console.warn(
    "Supabase JWT clock skew still present. Retrying once more..."
  );

  await sleep(2500);

  return fetch(
    input,
    init
  );
}

// ============================================================
// SERVER-ONLY ADMIN CLIENT
// ============================================================

export const supabaseAdmin =
  createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      global: {
        fetch:
          fetchWithJwtRetry,
      },

      auth: {
        autoRefreshToken:
          false,

        persistSession:
          false,

        detectSessionInUrl:
          false,
      },
    }
  );