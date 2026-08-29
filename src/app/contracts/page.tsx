"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FileSignature,
  Loader2,
  Plus,
} from "lucide-react";

import FinancePageShell from "@/components/FinancePageShell";
import { supabase } from "@/lib/supabase";

type ContractRow = {
  id: string;
  contract_number: string;
  contract_type: string;
  title: string;
  party_name: string;
  contract_date: string;
  start_date: string | null;
  end_date: string | null;
  contract_value: number | null;
  status: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function money(value: number | null) {
  if (value === null) return "—";

  return `GMD ${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function typeLabel(value: string) {
  const labels: Record<string, string> = {
    agreement: "Agreement",
    service_contract: "Service Contract",
    consultancy: "Consultancy",
    livestock: "Livestock Agreement",
    partnership: "Partnership",
    employment: "Employment",
    lease: "Lease",
    other: "Other",
  };

  return labels[value] ?? value;
}

function statusLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ContractsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contracts, setContracts] = useState<ContractRow[]>([]);

  useEffect(() => {
    let active = true;

    async function loadContracts() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          window.location.href = "/login";
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

        const { data, error: contractError } = await supabase
          .from("contracts")
          .select(
            `
              id,
              contract_number,
              contract_type,
              title,
              party_name,
              contract_date,
              start_date,
              end_date,
              contract_value,
              status
            `
          )
          .eq("business_id", membership.business_id)
          .order("contract_date", { ascending: false })
          .order("created_at", { ascending: false });

        if (contractError) {
          throw new Error(contractError.message);
        }

        if (!active) return;

        setContracts(
          (data ?? []).map((row) => ({
            id: row.id,
            contract_number: row.contract_number,
            contract_type: row.contract_type,
            title: row.title,
            party_name: row.party_name,
            contract_date: row.contract_date,
            start_date: row.start_date,
            end_date: row.end_date,
            contract_value:
              row.contract_value === null
                ? null
                : Number(row.contract_value),
            status: row.status,
          }))
        );

        setLoading(false);
      } catch (loadError) {
        console.error(loadError);

        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load contracts."
          );
          setLoading(false);
        }
      }
    }

    loadContracts();

    return () => {
      active = false;
    };
  }, []);

  return (
    <FinancePageShell
      eyebrow="Contracts & Agreements"
      title="Contracts & Agreements"
      description="Create, manage and print official Djallows Farm contracts and agreements."
    >
      <div className="space-y-5">
        <div className="flex justify-end">
          <Link
            href="/contracts/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#17488f] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#123a78]"
          >
            <Plus size={17} />
            New Agreement
          </Link>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="text-center">
              <Loader2
                size={30}
                className="mx-auto animate-spin text-[#17488f]"
              />
              <p className="mt-3 text-sm font-semibold text-slate-500">
                Loading contracts...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-800">
            {error}
          </div>
        ) : contracts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#17488f]">
              <FileSignature size={27} />
            </div>

            <h2 className="mt-4 text-lg font-black text-slate-900">
              No contracts yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Contracts and agreements created for customers, suppliers,
              partners and other parties will appear here.
            </p>

            <Link
              href="/contracts/new"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#17488f] px-4 py-2.5 text-sm font-bold text-white"
            >
              <Plus size={17} />
              Create First Agreement
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-xs font-black uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4">Reference</th>
                    <th className="px-5 py-4">Agreement</th>
                    <th className="px-5 py-4">Party</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Value</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {contracts.map((contract) => (
                    <tr
                      key={contract.id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/contracts/${contract.id}`}
                          className="font-black text-[#17488f] hover:underline"
                        >
                          {contract.contract_number}
                        </Link>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">
                          {contract.title}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          {typeLabel(contract.contract_type)}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                        {contract.party_name}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(contract.contract_date)}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-800">
                        {money(contract.contract_value)}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
                          {statusLabel(contract.status)}
                        </span>
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
