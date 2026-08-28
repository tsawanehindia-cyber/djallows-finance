"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";

import {
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  PackageOpen,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import AppNotification from "@/components/AppNotification";
import FinancePageShell from "@/components/FinancePageShell";
import { supabase } from "@/lib/supabase";

// ============================================================
// TYPES
// ============================================================

type MemberRole =
  | "owner"
  | "admin"
  | "staff";

type ContactType =
  | "customer"
  | "supplier";

type Contact = {
  id: string;
  business_id: string;
  contact_type: ContactType;
  name: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  supplies: string | null;
  notes: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type Membership = {
  business_id: string;
  role: MemberRole;
};

// ============================================================
// HELPERS
// ============================================================

function formatDate(
  dateString: string
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(
    new Date(dateString)
  );
}

// ============================================================
// PAGE
// ============================================================

export default function ContactsPage() {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    notification,
    setNotification,
  ] = useState("");

  const [
    businessId,
    setBusinessId,
  ] = useState("");

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState("");

  const [
    memberRole,
    setMemberRole,
  ] =
    useState<MemberRole>(
      "staff"
    );

  const [
    contacts,
    setContacts,
  ] =
    useState<Contact[]>(
      []
    );

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ContactType>(
      "customer"
    );

  const [
    search,
    setSearch,
  ] = useState("");

  // ==========================================================
  // FORM STATE
  // ==========================================================

  const [
    formOpen,
    setFormOpen,
  ] = useState(false);

  const [
    editingContact,
    setEditingContact,
  ] =
    useState<Contact | null>(
      null
    );

  const [
    formType,
    setFormType,
  ] =
    useState<ContactType>(
      "customer"
    );

  const [
    formName,
    setFormName,
  ] = useState("");

  const [
    formPhone,
    setFormPhone,
  ] = useState("");

  const [
    formEmail,
    setFormEmail,
  ] = useState("");

  const [
    formLocation,
    setFormLocation,
  ] = useState("");

  const [
    formSupplies,
    setFormSupplies,
  ] = useState("");

  const [
    formNotes,
    setFormNotes,
  ] = useState("");

  const [
    formActive,
    setFormActive,
  ] = useState(true);

  const [
    formError,
    setFormError,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] =
    useState<string | null>(
      null
    );

  // ==========================================================
  // PERMISSIONS
  // ==========================================================

  const isOwnerOrAdmin =
    memberRole ===
      "owner" ||
    memberRole ===
      "admin";

  function canEditContact(
    contact: Contact
  ) {
    if (isOwnerOrAdmin) {
      return true;
    }

    return (
      memberRole ===
        "staff" &&
      contact.created_by ===
        currentUserId
    );
  }

  // ==========================================================
  // NOTIFICATION TIMER
  // ==========================================================

  useEffect(() => {
    if (!notification) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setNotification("");
        },
        3000
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [notification]);

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadContacts() {
      try {
        setLoading(true);
        setError("");

        const {
          data: {
            session,
          },
          error:
            sessionError,
        } =
          await supabase.auth.getSession();

        if (
          sessionError ||
          !session
        ) {
          router.replace(
            "/login"
          );

          return;
        }

        const {
          data:
            membershipData,
          error:
            membershipError,
        } = await supabase
          .from(
            "business_members"
          )
          .select(
            "business_id, role"
          )
          .eq(
            "user_id",
            session.user.id
          )
          .limit(1)
          .maybeSingle();

        if (
          membershipError ||
          !membershipData
        ) {
          throw new Error(
            "Unable to find your Djallows Farm business access."
          );
        }

        const membership =
          membershipData as Membership;

        const {
          data:
            contactRows,
          error:
            contactError,
        } = await supabase
          .from(
            "contacts"
          )
          .select(
            `
            id,
            business_id,
            contact_type,
            name,
            phone,
            email,
            location,
            supplies,
            notes,
            active,
            created_by,
            created_at,
            updated_at
          `
          )
          .eq(
            "business_id",
            membership.business_id
          )
          .in(
            "contact_type",
            [
              "customer",
              "supplier",
            ]
          )
          .order(
            "name",
            {
              ascending:
                true,
            }
          );

        if (
          contactError
        ) {
          throw new Error(
            `Unable to load customers and suppliers: ${contactError.message}`
          );
        }

        if (!active) {
          return;
        }

        setBusinessId(
          membership.business_id
        );

        setCurrentUserId(
          session.user.id
        );

        setMemberRole(
          membership.role
        );

        setContacts(
          (
            contactRows ??
            []
          ).map(
            (row) => ({
              id:
                row.id,

              business_id:
                row.business_id,

              contact_type:
                row.contact_type as ContactType,

              name:
                row.name ??
                "",

              phone:
                row.phone,

              email:
                row.email,

              location:
                row.location,

              supplies:
                row.supplies,

              notes:
                row.notes,

              active:
                row.active ??
                true,

              created_by:
                row.created_by,

              created_at:
                row.created_at,

              updated_at:
                row.updated_at,
            })
          )
        );

        setLoading(false);
      } catch (
        loadError
      ) {
        console.error(
          loadError
        );

        if (active) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load customers and suppliers."
          );

          setLoading(false);
        }
      }
    }

    loadContacts();

    return () => {
      active = false;
    };
  }, [router]);

  // ==========================================================
  // COUNTS
  // ==========================================================

  const customers =
    useMemo(
      () =>
        contacts.filter(
          (contact) =>
            contact.contact_type ===
            "customer"
        ),
      [contacts]
    );

  const suppliers =
    useMemo(
      () =>
        contacts.filter(
          (contact) =>
            contact.contact_type ===
            "supplier"
        ),
      [contacts]
    );

  const activeCustomers =
    customers.filter(
      (contact) =>
        contact.active
    ).length;

  const activeSuppliers =
    suppliers.filter(
      (contact) =>
        contact.active
    ).length;

  const filteredContacts =
    useMemo(() => {
      const searchText =
        search
          .trim()
          .toLowerCase();

      return contacts
        .filter(
          (contact) =>
            contact.contact_type ===
            activeTab
        )
        .filter(
          (contact) => {
            if (!searchText) {
              return true;
            }

            return (
              contact.name
                .toLowerCase()
                .includes(
                  searchText
                ) ||
              (
                contact.phone ??
                ""
              )
                .toLowerCase()
                .includes(
                  searchText
                ) ||
              (
                contact.email ??
                ""
              )
                .toLowerCase()
                .includes(
                  searchText
                ) ||
              (
                contact.location ??
                ""
              )
                .toLowerCase()
                .includes(
                  searchText
                ) ||
              (
                contact.supplies ??
                ""
              )
                .toLowerCase()
                .includes(
                  searchText
                ) ||
              (
                contact.notes ??
                ""
              )
                .toLowerCase()
                .includes(
                  searchText
                )
            );
          }
        );
    }, [
      contacts,
      activeTab,
      search,
    ]);

  // ==========================================================
  // FORM HELPERS
  // ==========================================================

  function resetForm() {
    setEditingContact(
      null
    );

    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormLocation("");
    setFormSupplies("");
    setFormNotes("");
    setFormActive(true);
    setFormError("");
  }

  function openAddForm() {
    resetForm();

    setFormType(
      activeTab
    );

    setFormOpen(true);
  }

  function openEditForm(
    contact: Contact
  ) {
    if (
      !canEditContact(
        contact
      )
    ) {
      return;
    }

    setEditingContact(
      contact
    );

    setFormType(
      contact.contact_type
    );

    setFormName(
      contact.name
    );

    setFormPhone(
      contact.phone ??
        ""
    );

    setFormEmail(
      contact.email ??
        ""
    );

    setFormLocation(
      contact.location ??
        ""
    );

    setFormSupplies(
      contact.supplies ??
        ""
    );

    setFormNotes(
      contact.notes ??
        ""
    );

    setFormActive(
      contact.active
    );

    setFormError("");
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setFormOpen(false);
    resetForm();
  }

  // ==========================================================
  // SAVE CONTACT
  // ==========================================================

  async function saveContact(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const name =
      formName.trim();

    if (!name) {
      setFormError(
        `Please enter the ${
          formType ===
          "customer"
            ? "customer"
            : "supplier"
        } name.`
      );

      return;
    }

    try {
      setSaving(true);
      setFormError("");
      setError("");

      if (
        editingContact
      ) {
        if (
          !canEditContact(
            editingContact
          )
        ) {
          throw new Error(
            "You do not have permission to edit this record."
          );
        }

        const {
          data:
            updatedRow,
          error:
            updateError,
        } = await supabase
          .from(
            "contacts"
          )
          .update({
            contact_type:
              formType,

            name,

            phone:
              formPhone.trim() ||
              null,

            email:
              formEmail.trim() ||
              null,

            location:
              formLocation.trim() ||
              null,

            supplies:
              formType ===
              "supplier"
                ? formSupplies.trim() ||
                  null
                : null,

            notes:
              formNotes.trim() ||
              null,

            active:
              formActive,
          })
          .eq(
            "id",
            editingContact.id
          )
          .eq(
            "business_id",
            businessId
          )
          .select(
            `
            id,
            business_id,
            contact_type,
            name,
            phone,
            email,
            location,
            supplies,
            notes,
            active,
            created_by,
            created_at,
            updated_at
          `
          )
          .single();

        if (
          updateError ||
          !updatedRow
        ) {
          throw new Error(
            updateError?.message ||
              "Unable to save changes."
          );
        }

        const updatedContact:
          Contact = {
            id:
              updatedRow.id,

            business_id:
              updatedRow.business_id,

            contact_type:
              updatedRow.contact_type as ContactType,

            name:
              updatedRow.name,

            phone:
              updatedRow.phone,

            email:
              updatedRow.email,

            location:
              updatedRow.location,

            supplies:
              updatedRow.supplies,

            notes:
              updatedRow.notes,

            active:
              updatedRow.active ??
              true,

            created_by:
              updatedRow.created_by,

            created_at:
              updatedRow.created_at,

            updated_at:
              updatedRow.updated_at,
          };

        setContacts(
          (current) =>
            current
              .map(
                (contact) =>
                  contact.id ===
                  updatedContact.id
                    ? updatedContact
                    : contact
              )
              .sort(
                (a, b) =>
                  a.name.localeCompare(
                    b.name
                  )
              )
        );

        setActiveTab(
          updatedContact.contact_type
        );

        setNotification(
          "Changes saved"
        );
      } else {
        const {
          data:
            newRow,
          error:
            insertError,
        } = await supabase
          .from(
            "contacts"
          )
          .insert({
            business_id:
              businessId,

            contact_type:
              formType,

            name,

            phone:
              formPhone.trim() ||
              null,

            email:
              formEmail.trim() ||
              null,

            location:
              formLocation.trim() ||
              null,

            supplies:
              formType ===
              "supplier"
                ? formSupplies.trim() ||
                  null
                : null,

            notes:
              formNotes.trim() ||
              null,

            active:
              formActive,

            created_by:
              currentUserId,
          })
          .select(
            `
            id,
            business_id,
            contact_type,
            name,
            phone,
            email,
            location,
            supplies,
            notes,
            active,
            created_by,
            created_at,
            updated_at
          `
          )
          .single();

        if (
          insertError ||
          !newRow
        ) {
          throw new Error(
            insertError?.message ||
              "Unable to save the record."
          );
        }

        const newContact:
          Contact = {
            id:
              newRow.id,

            business_id:
              newRow.business_id,

            contact_type:
              newRow.contact_type as ContactType,

            name:
              newRow.name,

            phone:
              newRow.phone,

            email:
              newRow.email,

            location:
              newRow.location,

            supplies:
              newRow.supplies,

            notes:
              newRow.notes,

            active:
              newRow.active ??
              true,

            created_by:
              newRow.created_by,

            created_at:
              newRow.created_at,

            updated_at:
              newRow.updated_at,
          };

        setContacts(
          (current) =>
            [
              ...current,
              newContact,
            ].sort(
              (a, b) =>
                a.name.localeCompare(
                  b.name
                )
            )
        );

        setActiveTab(
          newContact.contact_type
        );

        setNotification(
          "Saved successfully"
        );
      }

      setFormOpen(false);
      resetForm();
    } catch (
      saveError
    ) {
      console.error(
        saveError
      );

      setFormError(
        saveError instanceof
          Error
          ? saveError.message
          : "Unable to save the record."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // DELETE
  // ==========================================================

  async function deleteContact(
    contact: Contact
  ) {
    if (
      !isOwnerOrAdmin
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete ${contact.name}?\n\nThis action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        contact.id
      );

      setError("");

      const {
        error:
          deleteError,
      } = await supabase
        .from(
          "contacts"
        )
        .delete()
        .eq(
          "id",
          contact.id
        )
        .eq(
          "business_id",
          businessId
        );

      if (deleteError) {
        throw new Error(
          deleteError.message
        );
      }

      setContacts(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              contact.id
          )
      );

      setNotification(
        "Deleted successfully"
      );
    } catch (
      deleteError
    ) {
      console.error(
        deleteError
      );

      setError(
        deleteError instanceof
          Error
          ? deleteError.message
          : "Unable to delete the record."
      );
    } finally {
      setDeletingId(
        null
      );
    }
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#edf3ef]">

        <div className="text-center">

          <Loader2
            size={32}
            className="mx-auto animate-spin text-[#0d5138]"
          />

          <p className="mt-4 text-[16px] font-semibold text-slate-600">
            Loading customers and suppliers...
          </p>

        </div>

      </main>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <FinancePageShell
      eyebrow="Business Contacts"
      title="Customers & Suppliers"
      description="Keep customer and supplier information organised in one place."
      recordText={`${contacts.length} contacts`}
    >

      <AppNotification
        message={
          notification
        }
        onClose={() =>
          setNotification("")
        }
      />

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <SummaryCard
          title="Customers"
          value={String(
            customers.length
          )}
          note={`${activeCustomers} active`}
          icon={
            <UsersRound
              size={23}
            />
          }
          featured
        />

        <SummaryCard
          title="Suppliers"
          value={String(
            suppliers.length
          )}
          note={`${activeSuppliers} active`}
          icon={
            <Building2
              size={23}
            />
          }
        />

        <SummaryCard
          title="Active Contacts"
          value={String(
            activeCustomers +
              activeSuppliers
          )}
          note="Customers and suppliers currently active"
          icon={
            <CheckCircle2
              size={23}
            />
          }
        />

        <SummaryCard
          title="Total Contacts"
          value={String(
            contacts.length
          )}
          note="All saved business contacts"
          icon={
            <UserRound
              size={23}
            />
          }
        />

      </div>

      {/* ======================================================
          TABS / SEARCH / ADD
      ====================================================== */}

      <section className="mt-5 overflow-hidden rounded-[24px] border border-white/90 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.07)]">

        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">

          <div className="inline-flex w-full rounded-xl bg-slate-100 p-1 sm:w-auto">

            <button
              type="button"
              onClick={() => {
                setActiveTab(
                  "customer"
                );

                setSearch("");
              }}
              className={`flex-1 rounded-lg px-5 py-3 text-[15px] font-bold transition sm:flex-none ${
                activeTab ===
                "customer"
                  ? "bg-[#0b5136] text-white shadow-sm"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              Customers
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab(
                  "supplier"
                );

                setSearch("");
              }}
              className={`flex-1 rounded-lg px-5 py-3 text-[15px] font-bold transition sm:flex-none ${
                activeTab ===
                "supplier"
                  ? "bg-[#0b5136] text-white shadow-sm"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              Suppliers
            </button>

          </div>

          <button
            type="button"
            onClick={
              openAddForm
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b5136] px-5 py-3 text-[15px] font-bold text-white transition hover:bg-[#083d2a]"
          >
            <Plus
              size={19}
            />

            {activeTab ===
            "customer"
              ? "Add Customer"
              : "Add Supplier"}
          </button>

        </div>

        <div className="p-5 sm:p-6">

          <div className="relative max-w-[620px]">

            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              type="text"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder={
                activeTab ===
                "customer"
                  ? "Search customers..."
                  : "Search suppliers..."
              }
              className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3.5 pl-12 pr-4 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />

          </div>

        </div>

      </section>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-[15px] font-semibold text-red-800">
          {error}
        </div>
      )}

      {/* ======================================================
          CONTACT LIST
      ====================================================== */}

      <section className="mt-5 overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.08)]">

        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-5 sm:px-6">

          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
            {activeTab ===
            "customer"
              ? "Customer Records"
              : "Supplier Records"}
          </p>

          <div className="flex items-end justify-between gap-4">

            <div>

              <h2 className="text-[22px] font-bold text-slate-950">
                {activeTab ===
                "customer"
                  ? "Customers"
                  : "Suppliers"}
              </h2>

              <p className="mt-1 text-[14px] font-medium text-slate-600">
                {filteredContacts.length} record
                {filteredContacts.length ===
                1
                  ? ""
                  : "s"}{" "}
                shown
              </p>

            </div>

          </div>

        </div>

        {filteredContacts.length >
        0 ? (
          <div className="divide-y divide-slate-200">

            {filteredContacts.map(
              (contact) => {
                const canEdit =
                  canEditContact(
                    contact
                  );

                return (
                  <div
                    key={
                      contact.id
                    }
                    className="p-5 transition hover:bg-emerald-50/40 sm:p-6"
                  >

                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">

                      <div className="flex min-w-0 gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-[#0b5136]">

                          {contact.contact_type ===
                          "customer" ? (
                            <UserRound
                              size={23}
                            />
                          ) : (
                            <Building2
                              size={23}
                            />
                          )}

                        </div>

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="text-[18px] font-bold text-slate-950">
                              {
                                contact.name
                              }
                            </h3>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${
                                contact.active
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {contact.active
                                ? "Active"
                                : "Inactive"}
                            </span>

                          </div>

                          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-medium text-slate-600">

                            {contact.phone && (
                              <span className="inline-flex items-center gap-2">
                                <Phone
                                  size={15}
                                />

                                {
                                  contact.phone
                                }
                              </span>
                            )}

                            {contact.location && (
                              <span className="inline-flex items-center gap-2">
                                <MapPin
                                  size={15}
                                />

                                {
                                  contact.location
                                }
                              </span>
                            )}

                            {contact.email && (
                              <span className="inline-flex items-center gap-2">
                                <Mail
                                  size={15}
                                />

                                {
                                  contact.email
                                }
                              </span>
                            )}

                          </div>

                          {contact.contact_type ===
                            "supplier" &&
                            contact.supplies && (
                              <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[14px] font-bold text-amber-900">

                                <PackageOpen
                                  size={16}
                                  className="shrink-0"
                                />

                                <span className="truncate">
                                  Supplies:{" "}
                                  {
                                    contact.supplies
                                  }
                                </span>

                              </div>
                            )}

                          {contact.notes && (
                            <p className="mt-3 max-w-[760px] text-[14px] font-medium leading-6 text-slate-600">
                              {
                                contact.notes
                              }
                            </p>
                          )}

                          <p className="mt-3 text-[12px] font-semibold text-slate-400">
                            Added{" "}
                            {formatDate(
                              contact.created_at
                            )}
                          </p>

                        </div>

                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">

                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(
                                contact
                              )
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-[14px] font-bold text-[#0b5136] transition hover:bg-emerald-50"
                          >
                            <Pencil
                              size={16}
                            />

                            Edit
                          </button>
                        ) : (
                          <span className="rounded-xl bg-slate-100 px-4 py-2.5 text-[13px] font-bold text-slate-500">
                            View only
                          </span>
                        )}

                        {isOwnerOrAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              deleteContact(
                                contact
                              )
                            }
                            disabled={
                              deletingId ===
                              contact.id
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-[14px] font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId ===
                            contact.id ? (
                              <Loader2
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2
                                size={16}
                              />
                            )}

                            Delete
                          </button>
                        )}

                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        ) : (
          <div className="flex min-h-[280px] items-center justify-center p-6 text-center">

            <div>

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-[#0b5136]">

                {activeTab ===
                "customer" ? (
                  <UserRound
                    size={25}
                  />
                ) : (
                  <Building2
                    size={25}
                  />
                )}

              </div>

              <p className="mt-4 text-[18px] font-bold text-slate-950">
                {search
                  ? "No matching records"
                  : activeTab ===
                    "customer"
                  ? "No customers yet"
                  : "No suppliers yet"}
              </p>

              <p className="mt-2 text-[14px] font-medium text-slate-600">
                {search
                  ? "Try another search."
                  : activeTab ===
                    "customer"
                  ? "Add the first customer when you are ready."
                  : "Add the first supplier when you are ready."}
              </p>

              {!search && (
                <button
                  type="button"
                  onClick={
                    openAddForm
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0b5136] px-5 py-3 text-[14px] font-bold text-white"
                >
                  <Plus
                    size={18}
                  />

                  {activeTab ===
                  "customer"
                    ? "Add Customer"
                    : "Add Supplier"}
                </button>
              )}

            </div>

          </div>
        )}

      </section>

      {/* ======================================================
          ADD / EDIT MODAL
      ====================================================== */}

      {formOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">

          <div className="max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-[26px] border border-white bg-[#f7faf8] shadow-[0_30px_90px_rgba(15,23,42,0.35)]">

            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-6">

              <div>

                <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                  {formType ===
                  "customer"
                    ? "Customer"
                    : "Supplier"}
                </p>

                <h2 className="mt-1 text-[23px] font-bold text-slate-950">
                  {editingContact
                    ? `Edit ${
                        formType ===
                        "customer"
                          ? "Customer"
                          : "Supplier"
                      }`
                    : `Add ${
                        formType ===
                        "customer"
                          ? "Customer"
                          : "Supplier"
                      }`}
                </h2>

              </div>

              <button
                type="button"
                onClick={
                  closeForm
                }
                disabled={
                  saving
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close form"
              >
                <X
                  size={20}
                />
              </button>

            </div>

            <form
              onSubmit={
                saveContact
              }
              className="p-5 sm:p-6"
            >

              {formError && (
                <div className="mb-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-[14px] font-semibold text-red-800">
                  {
                    formError
                  }
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-[14px] font-bold text-slate-800">
                    Contact Type
                  </label>

                  <div className="grid grid-cols-2 gap-3">

                    <button
                      type="button"
                      onClick={() =>
                        setFormType(
                          "customer"
                        )
                      }
                      className={`rounded-xl border px-4 py-3.5 text-[14px] font-bold transition ${
                        formType ===
                        "customer"
                          ? "border-[#0b5136] bg-emerald-50 text-[#0b5136]"
                          : "border-slate-300 bg-white text-slate-600"
                      }`}
                    >
                      Customer
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setFormType(
                          "supplier"
                        )
                      }
                      className={`rounded-xl border px-4 py-3.5 text-[14px] font-bold transition ${
                        formType ===
                        "supplier"
                          ? "border-[#0b5136] bg-emerald-50 text-[#0b5136]"
                          : "border-slate-300 bg-white text-slate-600"
                      }`}
                    >
                      Supplier
                    </button>

                  </div>

                </div>

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-[14px] font-bold text-slate-800">
                    {formType ===
                    "customer"
                      ? "Customer Name"
                      : "Supplier Name"}
                  </label>

                  <input
                    type="text"
                    value={
                      formName
                    }
                    onChange={(
                      event
                    ) =>
                      setFormName(
                        event.target.value
                      )
                    }
                    placeholder={
                      formType ===
                      "customer"
                        ? "Enter customer name"
                        : "Enter supplier name"
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-[14px] font-bold text-slate-800">
                    Phone
                  </label>

                  <input
                    type="tel"
                    value={
                      formPhone
                    }
                    onChange={(
                      event
                    ) =>
                      setFormPhone(
                        event.target.value
                      )
                    }
                    placeholder="+220..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-[14px] font-bold text-slate-800">
                    Email
                  </label>

                  <input
                    type="email"
                    value={
                      formEmail
                    }
                    onChange={(
                      event
                    ) =>
                      setFormEmail(
                        event.target.value
                      )
                    }
                    placeholder="Optional"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />

                </div>

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-[14px] font-bold text-slate-800">
                    Location
                  </label>

                  <input
                    type="text"
                    value={
                      formLocation
                    }
                    onChange={(
                      event
                    ) =>
                      setFormLocation(
                        event.target.value
                      )
                    }
                    placeholder="Town, village or address"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />

                </div>

                {formType ===
                  "supplier" && (
                  <div className="sm:col-span-2">

                    <label className="mb-2 block text-[14px] font-bold text-slate-800">
                      What Do They Supply?
                    </label>

                    <input
                      type="text"
                      value={
                        formSupplies
                      }
                      onChange={(
                        event
                      ) =>
                        setFormSupplies(
                          event.target.value
                        )
                      }
                      placeholder="Example: Feed, medication, farm supplies"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                    />

                  </div>
                )}

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-[14px] font-bold text-slate-800">
                    Notes
                  </label>

                  <textarea
                    rows={4}
                    value={
                      formNotes
                    }
                    onChange={(
                      event
                    ) =>
                      setFormNotes(
                        event.target.value
                      )
                    }
                    placeholder="Optional notes"
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />

                </div>

                <div className="sm:col-span-2">

                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-300 bg-white px-4 py-4">

                    <div>

                      <p className="text-[14px] font-bold text-slate-900">
                        Active
                      </p>

                      <p className="mt-1 text-[13px] font-medium text-slate-500">
                        Turn this off if the contact is no longer active.
                      </p>

                    </div>

                    <input
                      type="checkbox"
                      checked={
                        formActive
                      }
                      onChange={(
                        event
                      ) =>
                        setFormActive(
                          event.target.checked
                        )
                      }
                      className="h-5 w-5 accent-[#0b5136]"
                    />

                  </label>

                </div>

              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  disabled={
                    saving
                  }
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-[15px] font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b5136] px-5 py-3.5 text-[15px] font-bold text-white transition hover:bg-[#083d2a] disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {saving ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2
                        size={18}
                      />

                      {editingContact
                        ? "Save Changes"
                        : formType ===
                          "customer"
                        ? "Save Customer"
                        : "Save Supplier"}
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </FinancePageShell>
  );
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  title,
  value,
  note,
  icon,
  featured = false,
}: {
  title: string;
  value: string;
  note: string;
  icon: ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-[22px] border p-5 shadow-[0_10px_30px_rgba(15,23,42,0.07)] sm:p-6 ${
        featured
          ? "border-[#0b5136] bg-gradient-to-br from-[#0b5136] to-[#073724] text-white"
          : "border-white bg-white text-slate-950"
      }`}
    >

      <div className="flex items-start justify-between gap-4">

        <div className="min-w-0">

          <p
            className={`text-[15px] font-semibold ${
              featured
                ? "text-emerald-50"
                : "text-slate-700"
            }`}
          >
            {title}
          </p>

          <p
            className={`mt-3 text-[29px] font-bold leading-tight ${
              featured
                ? "text-white"
                : "text-slate-950"
            }`}
          >
            {value}
          </p>

          <p
            className={`mt-3 text-[14px] font-semibold ${
              featured
                ? "text-emerald-50/90"
                : "text-slate-600"
            }`}
          >
            {note}
          </p>

        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            featured
              ? "bg-white/15 text-white"
              : "bg-emerald-100 text-[#0b5136]"
          }`}
        >
          {icon}
        </div>

      </div>

    </div>
  );
}