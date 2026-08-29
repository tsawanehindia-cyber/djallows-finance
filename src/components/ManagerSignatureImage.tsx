"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ManagerSignatureImage() {
  const [signatureUrl, setSignatureUrl] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSignature() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          return;
        }

        const { data: membership } =
          await supabase
            .from("business_members")
            .select("business_id")
            .eq("user_id", session.user.id)
            .limit(1)
            .maybeSingle();

        if (!membership) {
          return;
        }

        const { data: business } =
          await supabase
            .from("businesses")
            .select("signature_url")
            .eq("id", membership.business_id)
            .maybeSingle();

        if (!active) {
          return;
        }

        if (
          business &&
          typeof business.signature_url === "string" &&
          business.signature_url.trim()
        ) {
          setSignatureUrl(business.signature_url);
        }
      } catch (error) {
        console.error(
          "Unable to load manager signature:",
          error
        );
      }
    }

    void loadSignature();

    return () => {
      active = false;
    };
  }, []);

  if (!signatureUrl) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={signatureUrl}
      alt="CEO / Manager Signature"
      style={{
        display: "block",
        maxWidth: "48mm",
        maxHeight: "11mm",
        width: "auto",
        height: "auto",
        objectFit: "contain",
      }}
    />
  );
}
