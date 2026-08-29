"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Loader2,
  Plus,
} from "lucide-react";

import FinancePageShell from "@/components/FinancePageShell";
import { supabase } from "@/lib/supabase";

type AdvisoryRow = {
  id: string;
  contract_number: string;
  title: string;
  party_name: string;
  party_address: string | null;
  contract_date: string;
};

function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function ConsultationsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<AdvisoryRow[]>([]);

  useEffect(() => {
    let active = true;

    async function loadRecords() {
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

        const { data, error: loadError } =
          await supabase
            .from("contracts")
            .select(`
              id,
              contract_number,
              title,
              party_name,
              party_address,
              contract_date
            `)
            .eq("business_id", membership.business_id)
            .eq("contract_type", "consultancy")
            .order("contract_date", { ascending: false })
            .order("created_at", { ascending: false });

        if (loadError) {
          throw new Error(loadError.message);
        }

        if (!active) return;

        setRecords((data ?? []) as AdvisoryRow[]);
        setLoading(false);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load consultations."
          );

          setLoading(false);
        }
      }
    }

    void loadRecords();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <FinancePageShell
      eyebrow="Consultation & Advisory"
      title="Consultation & Advisory"
      description="Prepare and keep official farm consultation recommendations for customers."
    >
      <div className="space-y-5">
        <div className="flex justify-end">
          <Link
            href="/consultations/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#17488f] px-4 py-2.5 text-sm font-bold text-white"
          >
            <Plus size={17} />
            New Advisory
          </Link>
        </div>

        {loading ? (
          <div className="flex min-h-[250px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <Loader2
              size={30}
              className="animate-spin text-[#17488f]"
            />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-800">
            {error}
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#17488f]">
              <ClipboardList size={27} />
            </div>

            <h2 className="mt-4 text-lg font-black text-slate-900">
              No consultation records yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Consultation and advisory letters created for customers will appear here.
            </p>

            <Link
              href="/consultations/new"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#17488f] px-4 py-2.5 text-sm font-bold text-white"
            >
              <Plus size={17} />
              Create First Advisory
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-xs font-black uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4">Reference</th>
                    <th className="px-5 py-4">To</th>
                    <th className="px-5 py-4">Location</th>
                    <th className="px-5 py-4">Subject</th>
                    <th className="px-5 py-4">Date</th>
                  </tr>
                </thead>

                <tbody>
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/consultations/${record.id}`}
                          className="font-black text-[#17488f] hover:underline"
                        >
                          {record.contract_number}
                        </Link>
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {record.party_name}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {record.party_address || "—"}
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {record.title}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(record.contract_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </FinancePageShell>
  );
}
