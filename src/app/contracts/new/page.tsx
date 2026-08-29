"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, FileSignature, Loader2, Save } from "lucide-react";

import FinancePageShell from "@/components/FinancePageShell";
import { supabase } from "@/lib/supabase";

function today() {
  const date = new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function NewContractPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [businessId, setBusinessId] = useState("");
  const [title, setTitle] = useState("");
  const [agreementText, setAgreementText] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        const { data: membership, error: membershipError } =
          await supabase
            .from("business_members")
            .select("business_id")
            .eq("user_id", session.user.id)
            .limit(1)
            .maybeSingle();

        if (membershipError || !membership) {
          throw new Error("Unable to find your business access.");
        }

        if (!active) return;

        setBusinessId(membership.business_id);
        setLoading(false);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load agreement form."
          );
          setLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      active = false;
    };
  }, [router]);

  async function saveAgreement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Please enter the agreement title.");
      return;
    }

    if (!agreementText.trim()) {
      setError("Please enter the agreement.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const agreementDate = today();
      const year = Number(agreementDate.slice(0, 4));

      const { data: contractNumber, error: numberError } =
        await supabase.rpc("next_contract_number", {
          p_business_id: businessId,
          p_year: year,
        });

      if (numberError || !contractNumber) {
        throw new Error(
          numberError?.message || "Unable to generate agreement number."
        );
      }

      const { data: created, error: insertError } = await supabase
        .from("contracts")
        .insert({
          business_id: businessId,
          contract_number: contractNumber,
          contract_type: "agreement",
          title: title.trim(),
          party_name: "As stated in agreement",
          contract_date: agreementDate,
          terms: agreementText.trim(),
          status: "draft",
          created_by: session.user.id,
        })
        .select("id")
        .single();

      if (insertError || !created) {
        throw new Error(insertError?.message || "Unable to save agreement.");
      }

      router.push(`/contracts/${created.id}`);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save agreement."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#17488f]" />
      </main>
    );
  }

  return (
    <FinancePageShell
      eyebrow="Contracts & Agreements"
      title="New Agreement"
      description="Write or paste the complete agreement."
    >
      <form onSubmit={saveAgreement} className="space-y-6">
        <Link
          href="/contracts"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#17488f] hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Contracts
        </Link>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <FileSignature className="text-[#17488f]" />

            <div>
              <h2 className="text-lg font-black text-slate-900">
                Agreement
              </h2>

              <p className="text-sm text-slate-500">
                The agreement number and date will be generated automatically.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">
                Agreement Title
              </span>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: Livestock Management Agreement"
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#17488f]"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">
                Full Agreement
              </span>

              <textarea
                value={agreementText}
                onChange={(event) => setAgreementText(event.target.value)}
                rows={28}
                placeholder="Write or paste the complete agreement here..."
                className="w-full rounded-xl border border-slate-300 px-4 py-4 text-sm leading-7 outline-none focus:border-[#17488f]"
              />
            </label>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Link
            href="/contracts"
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#17488f] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Save size={17} />
            )}

            {saving ? "Saving..." : "Save Agreement"}
          </button>
        </div>
      </form>
    </FinancePageShell>
  );
}
