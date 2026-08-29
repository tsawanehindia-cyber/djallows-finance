"use client";

import { useEffect, useRef, useState } from "react";
import {
  ImageUp,
  Loader2,
  Trash2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Props = {
  businessId: string;
};

export default function BusinessSignatureSettings({
  businessId,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSignature() {
      if (!businessId) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        const { data, error: loadError } = await supabase
          .from("businesses")
          .select("signature_url")
          .eq("id", businessId)
          .maybeSingle();

        if (loadError) {
          throw new Error(loadError.message);
        }

        if (!active) return;

        const url =
          typeof data?.signature_url === "string"
            ? data.signature_url
            : null;

        setSignatureUrl(url);

        if (url) {
          window.localStorage.setItem(
            "djallows-manager-signature",
            url
          );
        } else {
          window.localStorage.removeItem(
            "djallows-manager-signature"
          );
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load signature."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSignature();

    return () => {
      active = false;
    };
  }, [businessId]);

  async function uploadSignature(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a PNG, JPG or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Signature image must be 2 MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);
      setError("");
      setMessage("");

      const extension =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";

      const possibleFiles = [
        `${businessId}/manager-signature.png`,
        `${businessId}/manager-signature.jpg`,
        `${businessId}/manager-signature.webp`,
      ];

      await supabase.storage
        .from("business-assets")
        .remove(possibleFiles);

      const path =
        `${businessId}/manager-signature.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("business-assets")
          .upload(path, file, {
            upsert: true,
            cacheControl: "3600",
            contentType: file.type,
          });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicData } =
        supabase.storage
          .from("business-assets")
          .getPublicUrl(path);

      const finalUrl =
        `${publicData.publicUrl}?v=${Date.now()}`;

      const { error: saveError } =
        await supabase.rpc(
          "set_business_signature_url",
          {
            p_business_id: businessId,
            p_signature_url: finalUrl,
          }
        );

      if (saveError) {
        throw new Error(saveError.message);
      }

      setSignatureUrl(finalUrl);

      window.localStorage.setItem(
        "djallows-manager-signature",
        finalUrl
      );

      window.dispatchEvent(
        new CustomEvent(
          "manager-signature-updated",
          {
            detail: finalUrl,
          }
        )
      );

      setMessage("Signature saved successfully");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload signature."
      );
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function removeSignature() {
    try {
      setUploading(true);
      setError("");
      setMessage("");

      const { error: saveError } =
        await supabase.rpc(
          "set_business_signature_url",
          {
            p_business_id: businessId,
            p_signature_url: null,
          }
        );

      if (saveError) {
        throw new Error(saveError.message);
      }

      setSignatureUrl(null);

      window.localStorage.removeItem(
        "djallows-manager-signature"
      );

      window.dispatchEvent(
        new CustomEvent(
          "manager-signature-updated",
          {
            detail: null,
          }
        )
      );

      setMessage("Signature removed successfully");
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove signature."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="mt-5 overflow-hidden rounded-[24px] border border-emerald-100 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#0b5136]">
            <ImageUp size={23} />
          </div>

          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              Official Documents
            </p>

            <h2 className="mt-1 text-[20px] font-bold text-slate-950">
              CEO / Manager Signature
            </h2>

            <p className="mt-1 max-w-2xl text-[14px] leading-6 text-slate-600">
              Upload the authorized signature once. It will appear automatically
              on official agreements, invoices and receipts.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {message}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-[90px] w-[220px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4">
            {loading ? (
              <Loader2
                size={24}
                className="animate-spin text-[#0b5136]"
              />
            ) : signatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signatureUrl}
                alt="CEO or Manager signature"
                className="max-h-[70px] max-w-[190px] object-contain"
              />
            ) : (
              <p className="text-center text-xs font-semibold text-slate-400">
                No signature uploaded
              </p>
            )}
          </div>

          <div>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={uploadSignature}
              className="hidden"
              id="manager-signature-upload"
            />

            <div className="flex flex-wrap gap-3">
              <label
                htmlFor="manager-signature-upload"
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0b5136] px-5 py-3 text-sm font-bold text-white ${
                  uploading
                    ? "pointer-events-none opacity-60"
                    : ""
                }`}
              >
                {uploading ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <ImageUp size={17} />
                )}

                {signatureUrl
                  ? "Replace Signature"
                  : "Upload Signature"}
              </label>

              {signatureUrl && (
                <button
                  type="button"
                  onClick={removeSignature}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-700 disabled:opacity-50"
                >
                  <Trash2 size={17} />
                  Remove
                </button>
              )}
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              PNG with a transparent background is recommended. JPG and WEBP
              are also supported. Maximum size: 2 MB.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
