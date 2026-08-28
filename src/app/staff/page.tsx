"use client";

import { useRouter } from "next/navigation";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  Loader2,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  Save,
  Trash2,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";

import AppNotification from "@/components/AppNotification";
import FinancePageShell from "@/components/FinancePageShell";
import { supabase } from "@/lib/supabase";

// ============================================================
// TYPES
// ============================================================

type Membership = {
  business_id: string;
};

type Employee = {
  id: string;
  employee_number: string | null;
  full_name: string;
  phone: string | null;
  position: string | null;
  date_joined: string | null;
  date_left: string | null;
  pay_type: string | null;
  pay_amount: number;
  status: string | null;
};

type SalaryPayment = {
  id: string;
  transaction_number: string;
  transaction_date: string;
  description: string;
  amount: number;
  reference_id: string | null;
  payment_method: string | null;
  notes: string | null;
};

// ============================================================
// HELPERS
// ============================================================

function money(amount: number) {
  return `GMD ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function todayForInput() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(
  dateString: string | null
) {
  if (!dateString) {
    return "—";
  }

  const cleanDate =
    dateString.slice(0, 10);

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(
    new Date(
      `${cleanDate}T00:00:00`
    )
  );
}

function nicePayType(
  payType: string | null
) {
  if (!payType) {
    return "—";
  }

  if (payType === "monthly") {
    return "Monthly";
  }

  if (payType === "weekly") {
    return "Weekly";
  }

  if (payType === "daily") {
    return "Daily";
  }

  return payType;
}

function createEmployeeNumber() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  const random = Math.floor(
    1000 +
      Math.random() * 9000
  );

  return `EMP-${year}${month}${day}-${random}`;
}

function extractNoteValue(
  notes: string | null,
  label: string
) {
  if (!notes) {
    return "";
  }

  const parts =
    notes.split(" · ");

  const match =
    parts.find((part) =>
      part
        .toLowerCase()
        .startsWith(
          `${label.toLowerCase()}:`
        )
    );

  if (!match) {
    return "";
  }

  return match
    .slice(
      match.indexOf(":") + 1
    )
    .trim();
}

function getEmployeeFromDescription(
  description: string
) {
  return description
    .replace(
      /^Salary Payment\s*-\s*/i,
      ""
    )
    .trim();
}

// ============================================================
// PAGE
// ============================================================

export default function StaffPage() {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState("");

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
    canManagePayroll,
    setCanManagePayroll,
  ] = useState(false);

  const [
    employees,
    setEmployees,
  ] =
    useState<Employee[]>([]);

  const [
    salaryPayments,
    setSalaryPayments,
  ] =
    useState<SalaryPayment[]>([]);

  // ==========================================================
  // EDIT MODE
  // ==========================================================

  const [
    editingEmployeeId,
    setEditingEmployeeId,
  ] = useState("");

  const isEditing =
    Boolean(
      editingEmployeeId
    );

  // ==========================================================
  // FORM
  // ==========================================================

  const [
    fullName,
    setFullName,
  ] = useState("");

  const [
    position,
    setPosition,
  ] = useState("");

  const [
    phone,
    setPhone,
  ] = useState("");

  const [
    dateJoined,
    setDateJoined,
  ] = useState(
    todayForInput()
  );

  const [
    dateLeft,
    setDateLeft,
  ] = useState("");

  const [
    payType,
    setPayType,
  ] =
    useState("monthly");

  const [
    payAmount,
    setPayAmount,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState("active");

  // ==========================================================
  // LOAD STAFF + SALARY HISTORY
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadStaff() {
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
            "business_id"
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

        if (!active) {
          return;
        }

        setBusinessId(
          membership.business_id
        );

        // ----------------------------------------------------
        // PAYROLL PERMISSION
        // ----------------------------------------------------

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("user_profiles")
          .select(
            `
            platform_role,
            is_active
          `
          )
          .eq(
            "id",
            session.user.id
          )
          .maybeSingle();

        if (
          profileError ||
          !profileData
        ) {
          throw new Error(
            "Unable to verify your payroll access."
          );
        }

        const activeProfile =
          profileData.is_active !==
          false;

        const isSuperAdmin =
          activeProfile &&
          profileData.platform_role ===
            "super_admin";

        let payrollAllowed =
          isSuperAdmin;

        if (!isSuperAdmin) {
          const {
            data: accessData,
            error: accessError,
          } = await supabase
            .from(
              "business_user_access"
            )
            .select(
              `
              active,
              can_manage_payroll
            `
            )
            .eq(
              "business_id",
              membership.business_id
            )
            .eq(
              "user_id",
              session.user.id
            )
            .maybeSingle();

          if (accessError) {
            throw new Error(
              "Unable to verify your payroll access."
            );
          }

          payrollAllowed =
            activeProfile &&
            accessData?.active ===
              true &&
            accessData
              ?.can_manage_payroll ===
              true;
        }

        setCanManagePayroll(
          payrollAllowed
        );

        // ----------------------------------------------------
        // EMPLOYEES
        // ----------------------------------------------------

        const {
          data:
            employeeRows,
          error:
            employeeError,
        } = await supabase
          .from("employees")
          .select(
            `
            id,
            employee_number,
            full_name,
            phone,
            position,
            date_joined,
            date_left,
            pay_type,
            pay_amount,
            status
          `
          )
          .eq(
            "business_id",
            membership.business_id
          )
          .order(
            "full_name",
            {
              ascending: true,
            }
          );

        if (
          employeeError
        ) {
          throw new Error(
            `Unable to load staff: ${employeeError.message}`
          );
        }

        // ----------------------------------------------------
        // SALARY PAYMENTS
        // ----------------------------------------------------

        const {
          data:
            paymentRows,
          error:
            paymentError,
        } = await supabase
          .from("transactions")
          .select(
            `
            id,
            transaction_number,
            transaction_date,
            description,
            amount,
            reference_id,
            payment_method,
            notes
          `
          )
          .eq(
            "business_id",
            membership.business_id
          )
          .in(
            "transaction_type",
            [
              "expense",
              "payroll",
            ]
          )
          .eq(
            "reference_type",
            "salary_payment"
          )
          .order(
            "transaction_date",
            {
              ascending: false,
            }
          );

        if (
          paymentError
        ) {
          throw new Error(
            `Unable to load salary history: ${paymentError.message}`
          );
        }

        if (!active) {
          return;
        }

        setEmployees(
          (
            employeeRows ?? []
          ).map(
            (employee) => ({
              id:
                employee.id,

              employee_number:
                employee.employee_number,

              full_name:
                employee.full_name,

              phone:
                employee.phone,

              position:
                employee.position,

              date_joined:
                employee.date_joined,

              date_left:
                employee.date_left,

              pay_type:
                employee.pay_type,

              pay_amount:
                Number(
                  employee.pay_amount ??
                    0
                ),

              status:
                employee.status,
            })
          )
        );

        setSalaryPayments(
          (
            paymentRows ?? []
          ).map(
            (payment) => ({
              id:
                payment.id,

              transaction_number:
                payment.transaction_number,

              transaction_date:
                payment.transaction_date,

              description:
                payment.description ??
                "",

              amount:
                Number(
                  payment.amount ??
                    0
                ),

              reference_id:
                payment.reference_id,

              payment_method:
                payment.payment_method,

              notes:
                payment.notes,
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
              : "Unable to load staff."
          );

          setLoading(false);
        }
      }
    }

    loadStaff();

    return () => {
      active = false;
    };
  }, [router]);

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

    return () =>
      window.clearTimeout(
        timer
      );
  }, [notification]);

  // ==========================================================
  // SUMMARY
  // ==========================================================

  const activeStaff =
    useMemo(
      () =>
        employees.filter(
          (employee) =>
            employee.status !==
            "inactive"
        ),
      [employees]
    );

  const employeeNameMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          string
        >();

      employees.forEach(
        (employee) => {
          map.set(
            employee.id,
            employee.full_name
          );
        }
      );

      return map;
    }, [employees]);

  const totalSalaryPaid =
    useMemo(
      () =>
        salaryPayments.reduce(
          (
            total,
            payment
          ) =>
            total +
            payment.amount,
          0
        ),
      [salaryPayments]
    );

  const salaryPaidThisMonth =
    useMemo(() => {
      const now =
        new Date();

      const currentYear =
        now.getFullYear();

      const currentMonth =
        now.getMonth();

      return salaryPayments
        .filter(
          (payment) => {
            const date =
              new Date(
                payment.transaction_date
              );

            return (
              date.getFullYear() ===
                currentYear &&
              date.getMonth() ===
                currentMonth
            );
          }
        )
        .reduce(
          (
            total,
            payment
          ) =>
            total +
            payment.amount,
          0
        );
    }, [salaryPayments]);

  // ==========================================================
  // RESET FORM
  // ==========================================================

  function resetStaffForm() {
    setEditingEmployeeId("");

    setFullName("");
    setPosition("");
    setPhone("");

    setDateJoined(
      todayForInput()
    );

    setDateLeft("");

    setPayType(
      "monthly"
    );

    setPayAmount("");

    setStatus(
      "active"
    );

    setError("");
  }

  // ==========================================================
  // EDIT STAFF
  // ==========================================================

  function startEdit(
    employee: Employee
  ) {
    if (!canManagePayroll) {
      setError(
        "You do not have permission to manage payroll."
      );

      return;
    }

    setError("");
    setNotification("");

    setEditingEmployeeId(
      employee.id
    );

    setFullName(
      employee.full_name
    );

    setPosition(
      employee.position ??
        ""
    );

    setPhone(
      employee.phone ??
        ""
    );

    setDateJoined(
      employee.date_joined
        ? employee.date_joined.slice(
            0,
            10
          )
        : ""
    );

    setDateLeft(
      employee.date_left
        ? employee.date_left.slice(
            0,
            10
          )
        : ""
    );

    setPayType(
      employee.pay_type ??
        "monthly"
    );

    setPayAmount(
      String(
        employee.pay_amount
      )
    );

    setStatus(
      employee.status ??
        "active"
    );

    window.setTimeout(
      () => {
        document
          .getElementById(
            "staff-form"
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      },
      50
    );
  }

  // ==========================================================
  // STATUS
  // ==========================================================

  function handleStatusChange(
    newStatus: string
  ) {
    setStatus(newStatus);

    if (
      newStatus ===
      "active"
    ) {
      setDateLeft("");
    }
  }

  // ==========================================================
  // SAVE / UPDATE STAFF
  // ==========================================================

  async function handleSaveStaff(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!canManagePayroll) {
      setError(
        "You do not have permission to manage payroll."
      );

      return;
    }

    try {
      setError("");
      setNotification("");

      if (!businessId) {
        setError(
          "Business information is not ready. Please refresh the page."
        );

        return;
      }

      if (
        !fullName.trim()
      ) {
        setError(
          "Please enter the staff member's name."
        );

        return;
      }

      if (!dateJoined) {
        setError(
          "Please enter the date joined."
        );

        return;
      }

      if (
        status ===
          "inactive" &&
        !dateLeft
      ) {
        setError(
          "Please enter the date the staff member left."
        );

        return;
      }

      if (
        dateLeft &&
        dateJoined &&
        dateLeft < dateJoined
      ) {
        setError(
          "Date Left cannot be before Date Joined."
        );

        return;
      }

      const numericPay =
        Number(payAmount);

      if (
        !Number.isFinite(
          numericPay
        ) ||
        numericPay < 0
      ) {
        setError(
          "Please enter a valid pay amount."
        );

        return;
      }

      setSaving(true);

      // ======================================================
      // UPDATE
      // ======================================================

      if (
        editingEmployeeId
      ) {
        const {
          data:
            updatedEmployee,
          error:
            updateError,
        } = await supabase
          .from("employees")
          .update({
            full_name:
              fullName.trim(),

            phone:
              phone.trim() ||
              null,

            position:
              position.trim() ||
              null,

            date_joined:
              dateJoined,

            date_left:
              status ===
              "inactive"
                ? dateLeft
                : null,

            pay_type:
              payType,

            pay_amount:
              numericPay,

            status,
          })
          .eq(
            "id",
            editingEmployeeId
          )
          .eq(
            "business_id",
            businessId
          )
          .select(
            `
            id,
            employee_number,
            full_name,
            phone,
            position,
            date_joined,
            date_left,
            pay_type,
            pay_amount,
            status
          `
          )
          .single();

        if (
          updateError
        ) {
          throw new Error(
            updateError.message
          );
        }

        if (
          updatedEmployee
        ) {
          setEmployees(
            (current) =>
              current
                .map(
                  (employee) =>
                    employee.id ===
                    updatedEmployee.id
                      ? {
                          id:
                            updatedEmployee.id,

                          employee_number:
                            updatedEmployee.employee_number,

                          full_name:
                            updatedEmployee.full_name,

                          phone:
                            updatedEmployee.phone,

                          position:
                            updatedEmployee.position,

                          date_joined:
                            updatedEmployee.date_joined,

                          date_left:
                            updatedEmployee.date_left,

                          pay_type:
                            updatedEmployee.pay_type,

                          pay_amount:
                            Number(
                              updatedEmployee.pay_amount ??
                                0
                            ),

                          status:
                            updatedEmployee.status,
                        }
                      : employee
                )
                .sort(
                  (a, b) =>
                    a.full_name.localeCompare(
                      b.full_name
                    )
                )
          );
        }

        resetStaffForm();

        setNotification(
          "Changes saved"
        );

        setSaving(false);

        return;
      }

      // ======================================================
      // CREATE
      // ======================================================

      const employeeNumber =
        createEmployeeNumber();

      const {
        data:
          insertedEmployee,
        error:
          insertError,
      } = await supabase
        .from("employees")
        .insert({
          business_id:
            businessId,

          employee_number:
            employeeNumber,

          full_name:
            fullName.trim(),

          phone:
            phone.trim() ||
            null,

          position:
            position.trim() ||
            null,

          date_joined:
            dateJoined,

          date_left:
            status ===
            "inactive"
              ? dateLeft
              : null,

          pay_type:
            payType,

          pay_amount:
            numericPay,

          status,
        })
        .select(
          `
          id,
          employee_number,
          full_name,
          phone,
          position,
          date_joined,
          date_left,
          pay_type,
          pay_amount,
          status
        `
        )
        .single();

      if (
        insertError
      ) {
        throw new Error(
          insertError.message
        );
      }

      if (
        insertedEmployee
      ) {
        setEmployees(
          (current) =>
            [
              ...current,
              {
                id:
                  insertedEmployee.id,

                employee_number:
                  insertedEmployee.employee_number,

                full_name:
                  insertedEmployee.full_name,

                phone:
                  insertedEmployee.phone,

                position:
                  insertedEmployee.position,

                date_joined:
                  insertedEmployee.date_joined,

                date_left:
                  insertedEmployee.date_left,

                pay_type:
                  insertedEmployee.pay_type,

                pay_amount:
                  Number(
                    insertedEmployee.pay_amount ??
                      0
                  ),

                status:
                  insertedEmployee.status,
              },
            ].sort(
              (a, b) =>
                a.full_name.localeCompare(
                  b.full_name
                )
            )
        );
      }

      resetStaffForm();

      setNotification(
        "Saved successfully"
      );

      setSaving(false);
    } catch (
      saveError
    ) {
      console.error(
        saveError
      );

      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "Unable to save staff member."
      );

      setSaving(false);
    }
  }

  // ==========================================================
  // DELETE STAFF
  // ==========================================================

  async function deleteStaff(
    employee: Employee
  ) {
    if (!canManagePayroll) {
      setError(
        "You do not have permission to manage payroll."
      );

      return;
    }

    try {
      setError("");
      setNotification("");

      const hasSalaryHistory =
        salaryPayments.some(
          (payment) =>
            payment.reference_id ===
            employee.id
        );

      if (
        hasSalaryHistory
      ) {
        setError(
          "This staff record cannot be deleted because salary payments are already linked to it. Change the staff status to Inactive instead."
        );

        return;
      }

      const confirmed =
        window.confirm(
          "Delete this staff record?"
        );

      if (!confirmed) {
        return;
      }

      setDeletingId(
        employee.id
      );

      const {
        error:
          deleteError,
      } = await supabase
        .from("employees")
        .delete()
        .eq(
          "id",
          employee.id
        )
        .eq(
          "business_id",
          businessId
        );

      if (
        deleteError
      ) {
        throw new Error(
          deleteError.message
        );
      }

      setEmployees(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              employee.id
          )
      );

      if (
        editingEmployeeId ===
        employee.id
      ) {
        resetStaffForm();
      }

      setNotification(
        "Deleted successfully"
      );

      setDeletingId("");
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
          : "Unable to delete staff member."
      );

      setDeletingId("");
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
            className="mx-auto animate-spin text-[#0b5136]"
          />

          <p className="mt-4 text-[16px] font-semibold text-slate-600">
            Loading staff and salary records...
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
      eyebrow="Farm Staff"
      title="Staff & Payroll"
      description="Keep a simple record of Djallows Farm staff, their agreed pay and salary payments."
      actionHref={
        canManagePayroll &&
        activeStaff.length > 0
          ? "/staff/pay"
          : undefined
      }
      actionLabel={
        canManagePayroll &&
        activeStaff.length > 0
          ? "Record Salary Payment"
          : undefined
      }
      recordText={`${activeStaff.length} active staff`}
    >

      {/* ======================================================
          SHARED NOTIFICATION
      ====================================================== */}

      <AppNotification
        message={
          notification
        }
        onClose={() =>
          setNotification("")
        }
      />

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-red-300 bg-red-50 p-4">

          <p className="text-[15px] font-semibold leading-6 text-red-800">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            className="shrink-0 text-red-600"
            aria-label="Close error"
          >
            <X size={18} />
          </button>

        </div>
      )}

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">

        <SummaryCard
          title="Active Staff"
          value={String(
            activeStaff.length
          )}
          note="Staff currently working at the farm"
          icon={
            <Users size={23} />
          }
          featured
        />

        <SummaryCard
          title="Salary Paid This Month"
          value={money(
            salaryPaidThisMonth
          )}
          note="Salary payments recorded this month"
          icon={
            <CalendarDays
              size={23}
            />
          }
        />

        <SummaryCard
          title="Total Salary Paid"
          value={money(
            totalSalaryPaid
          )}
          note="All salary payments recorded"
          icon={
            <Banknote
              size={23}
            />
          }
        />

        <SummaryCard
          title="Salary Payments"
          value={String(
            salaryPayments.length
          )}
          note="Number of salary payments recorded"
          icon={
            <ReceiptText
              size={23}
            />
          }
        />

      </div>

      {/* ======================================================
          NO STAFF NOTICE
      ====================================================== */}

      {activeStaff.length ===
        0 &&
        canManagePayroll && (
        <div className="mt-5 rounded-[22px] border border-emerald-200 bg-emerald-50 p-5">

          <p className="text-[16px] font-bold text-[#0b5136]">
            Add a staff member before recording salary payments.
          </p>

          <p className="mt-1 text-[14px] leading-6 text-emerald-900/80">
            Once an active staff member is saved, Record Salary Payment will become available.
          </p>

        </div>
      )}

      {/* ======================================================
          ADD / EDIT STAFF
      ====================================================== */}

      {canManagePayroll && (
        <section
          id="staff-form"
        className="mt-5 scroll-mt-5 overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.08)]"
      >

        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">

          <div>

            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              {isEditing
                ? "Update Staff Record"
                : "New Staff Member"}
            </p>

            <h2 className="mt-1 text-[21px] font-bold text-slate-950">
              {isEditing
                ? "Edit Staff"
                : "Add Staff"}
            </h2>

            <p className="mt-1 text-[15px] leading-6 text-slate-600">
              {isEditing
                ? "Update the staff member's information, pay or employment status."
                : "Record the staff member, their role, start date and normal pay."}
            </p>

          </div>

          {isEditing && (
            <button
              type="button"
              onClick={
                resetStaffForm
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-bold text-slate-700 transition hover:bg-slate-100"
            >
              <X size={17} />

              Cancel Edit
            </button>
          )}

        </div>

        <form
          onSubmit={
            handleSaveStaff
          }
          className="p-5 sm:p-6"
        >

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            <Field
              label="Staff Name"
            >

              <div className="relative">

                <UserRound
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="text"
                  required
                  value={
                    fullName
                  }
                  onChange={(
                    event
                  ) =>
                    setFullName(
                      event.target.value
                    )
                  }
                  placeholder="Enter full name"
                  className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3.5 pl-11 pr-4 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />

              </div>

            </Field>

            <Field
              label="Position / Role"
            >

              <div className="relative">

                <BriefcaseBusiness
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="text"
                  value={
                    position
                  }
                  onChange={(
                    event
                  ) =>
                    setPosition(
                      event.target.value
                    )
                  }
                  placeholder="Example: Farm Worker"
                  className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3.5 pl-11 pr-4 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />

              </div>

            </Field>

            <Field
              label="Phone Number"
              optional
            >

              <div className="relative">

                <Phone
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="text"
                  value={
                    phone
                  }
                  onChange={(
                    event
                  ) =>
                    setPhone(
                      event.target.value
                    )
                  }
                  placeholder="+220..."
                  className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3.5 pl-11 pr-4 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />

              </div>

            </Field>

            <Field
              label="Date Joined"
            >

              <input
                type="date"
                required
                value={
                  dateJoined
                }
                onChange={(
                  event
                ) =>
                  setDateJoined(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] px-4 py-3.5 text-[15px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />

            </Field>

            <Field
              label="Pay Type"
            >

              <select
                value={
                  payType
                }
                onChange={(
                  event
                ) =>
                  setPayType(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] px-4 py-3.5 text-[15px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              >

                <option value="monthly">
                  Monthly
                </option>

                <option value="weekly">
                  Weekly
                </option>

                <option value="daily">
                  Daily
                </option>

              </select>

            </Field>

            <Field
              label="Normal Pay Amount"
            >

              <div className="relative">

                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-bold text-slate-600">
                  GMD
                </span>

                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={
                    payAmount
                  }
                  onChange={(
                    event
                  ) =>
                    setPayAmount(
                      event.target.value
                    )
                  }
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] py-3.5 pl-16 pr-4 text-[16px] font-bold text-slate-900 outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />

              </div>

            </Field>

            <Field
              label="Status"
            >

              <select
                value={
                  status
                }
                onChange={(
                  event
                ) =>
                  handleStatusChange(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] px-4 py-3.5 text-[15px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              >

                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>

              </select>

            </Field>

            {status ===
              "inactive" && (
              <Field
                label="Date Left"
              >

                <input
                  type="date"
                  required
                  value={
                    dateLeft
                  }
                  onChange={(
                    event
                  ) =>
                    setDateLeft(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-[#f8faf9] px-4 py-3.5 text-[15px] font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />

              </Field>
            )}

          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">

            <button
              type="submit"
              disabled={
                saving
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b5136] px-5 py-3.5 text-[15px] font-bold text-white shadow-sm transition hover:bg-[#083c29] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >

              {saving ? (
                <>
                  <Loader2
                    size={19}
                    className="animate-spin"
                  />

                  {isEditing
                    ? "Saving Changes..."
                    : "Saving Staff..."}
                </>
              ) : isEditing ? (
                <>
                  <Save size={19} />

                  Save Changes
                </>
              ) : (
                <>
                  <Plus size={19} />

                  Save Staff
                </>
              )}

            </button>

            {isEditing && (
              <button
                type="button"
                onClick={
                  resetStaffForm
                }
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-[15px] font-bold text-slate-700 transition hover:bg-slate-100 sm:w-auto"
              >
                Cancel
              </button>
            )}

          </div>

        </form>

        </section>
      )}

      {/* ======================================================
          STAFF RECORDS
      ====================================================== */}

      <section className="mt-5 overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.08)]">

        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">

          <div>

            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              Staff Records
            </p>

            <h2 className="mt-1 text-[21px] font-bold text-slate-950">
              Farm Staff
            </h2>

            <p className="mt-1 text-[15px] text-slate-600">
              Staff members, employment status and agreed pay.
            </p>

          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5">

            <p className="text-[12px] font-bold uppercase text-slate-600">
              Total Staff
            </p>

            <p className="mt-1 text-[16px] font-bold text-slate-950">
              {
                employees.length
              }
            </p>

          </div>

        </div>

        {employees.length >
        0 ? (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[1320px] text-left">

              <thead>

                <tr className="border-b border-slate-200 bg-[#f4f7f5] text-[12px] font-bold uppercase tracking-wide text-slate-600">

                  <th className="px-5 py-4">
                    Staff
                  </th>

                  <th className="px-5 py-4">
                    Position
                  </th>

                  <th className="px-5 py-4">
                    Phone
                  </th>

                  <th className="px-5 py-4">
                    Date Joined
                  </th>

                  <th className="px-5 py-4">
                    Date Left
                  </th>

                  <th className="px-5 py-4">
                    Pay Type
                  </th>

                  <th className="px-5 py-4 text-right">
                    Normal Pay
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right">
                    {canManagePayroll
                      ? "Actions"
                      : "Access"}
                  </th>

                </tr>

              </thead>

              <tbody>

                {employees.map(
                  (employee) => {
                    const activeEmployee =
                      employee.status !==
                      "inactive";

                    const deleting =
                      deletingId ===
                      employee.id;

                    return (
                      <tr
                        key={
                          employee.id
                        }
                        className="border-b border-slate-200 last:border-none hover:bg-emerald-50/40"
                      >

                        <td className="px-5 py-5">

                          <p className="text-[15px] font-bold text-slate-950">
                            {
                              employee.full_name
                            }
                          </p>

                          <p className="mt-1 text-[12px] font-medium text-slate-500">
                            {employee.employee_number ||
                              "—"}
                          </p>

                        </td>

                        <td className="px-5 py-5 text-[14px] font-semibold text-slate-700">
                          {employee.position ||
                            "—"}
                        </td>

                        <td className="px-5 py-5 text-[14px] font-medium text-slate-700">
                          {employee.phone ||
                            "—"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-5 text-[14px] font-semibold text-slate-700">
                          {formatDate(
                            employee.date_joined
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-5 text-[14px] font-semibold text-slate-700">
                          {formatDate(
                            employee.date_left
                          )}
                        </td>

                        <td className="px-5 py-5">

                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-[#0b5136]">
                            {nicePayType(
                              employee.pay_type
                            )}
                          </span>

                        </td>

                        <td className="whitespace-nowrap px-5 py-5 text-right text-[15px] font-bold text-slate-950">
                          {money(
                            employee.pay_amount
                          )}
                        </td>

                        <td className="px-5 py-5">

                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-[12px] font-bold ${
                              activeEmployee
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {activeEmployee
                              ? "Active"
                              : "Inactive"}
                          </span>

                        </td>

                        <td className="px-5 py-5">

                          {canManagePayroll ? (
                            <div className="flex items-center justify-end gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  startEdit(
                                    employee
                                  )
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-[#0b5136]"
                              >
                                <Pencil
                                  size={15}
                                />

                                Edit
                              </button>

                              <button
                                type="button"
                                disabled={
                                  deleting
                                }
                                onClick={() =>
                                  deleteStaff(
                                    employee
                                  )
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                              >

                                {deleting ? (
                                  <Loader2
                                    size={15}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2
                                    size={15}
                                  />
                                )}

                                Delete

                              </button>

                            </div>
                          ) : (
                            <span className="block text-right text-[13px] font-semibold text-slate-500">
                              View only
                            </span>
                          )}

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>
        ) : (
          <div className="flex min-h-[230px] items-center justify-center text-center">

            <div>

              <Users
                size={30}
                className="mx-auto text-[#0b5136]"
              />

              <p className="mt-4 text-[17px] font-bold text-slate-950">
                No staff recorded yet
              </p>

              <p className="mt-2 text-[15px] text-slate-600">
                Add the first Djallows Farm staff member above.
              </p>

            </div>

          </div>
        )}

      </section>

      {/* ======================================================
          SALARY HISTORY
      ====================================================== */}

      <section className="mt-5 overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.08)]">

        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">

          <div>

            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              Payroll History
            </p>

            <h2 className="mt-1 text-[21px] font-bold text-slate-950">
              Salary Payments
            </h2>

            <p className="mt-1 text-[15px] text-slate-600">
              See who was paid, when they were paid and how much they received.
            </p>

          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">

            <p className="text-[12px] font-bold uppercase text-emerald-800">
              Total Paid
            </p>

            <p className="mt-1 whitespace-nowrap text-[16px] font-bold text-[#0b5136]">
              {money(
                totalSalaryPaid
              )}
            </p>

          </div>

        </div>

        {salaryPayments.length >
        0 ? (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[1150px] text-left">

              <thead>

                <tr className="border-b border-slate-200 bg-[#f4f7f5] text-[12px] font-bold uppercase tracking-wide text-slate-600">

                  <th className="px-6 py-4">
                    Payment Date
                  </th>

                  <th className="px-6 py-4">
                    Staff Member
                  </th>

                  <th className="px-6 py-4">
                    Pay Period
                  </th>

                  <th className="px-6 py-4">
                    Paid By
                  </th>

                  <th className="px-6 py-4">
                    Reference
                  </th>

                  <th className="px-6 py-4 text-right">
                    Amount Paid
                  </th>

                </tr>

              </thead>

              <tbody>

                {salaryPayments.map(
                  (payment) => {
                    const staffName =
                      payment.reference_id
                        ? employeeNameMap.get(
                            payment.reference_id
                          ) ??
                          getEmployeeFromDescription(
                            payment.description
                          )
                        : getEmployeeFromDescription(
                            payment.description
                          );

                    const payPeriod =
                      extractNoteValue(
                        payment.notes,
                        "Pay Period"
                      );

                    const reference =
                      extractNoteValue(
                        payment.notes,
                        "Reference"
                      );

                    return (
                      <tr
                        key={
                          payment.id
                        }
                        className="border-b border-slate-200 last:border-none hover:bg-emerald-50/40"
                      >

                        <td className="whitespace-nowrap px-6 py-5 text-[14px] font-semibold text-slate-700">
                          {formatDate(
                            payment.transaction_date
                          )}
                        </td>

                        <td className="px-6 py-5">

                          <p className="text-[15px] font-bold text-slate-950">
                            {staffName ||
                              "—"}
                          </p>

                          <p className="mt-1 text-[12px] font-medium text-slate-500">
                            {
                              payment.transaction_number
                            }
                          </p>

                        </td>

                        <td className="px-6 py-5 text-[14px] font-semibold text-slate-700">
                          {payPeriod ||
                            "—"}
                        </td>

                        <td className="px-6 py-5">

                          <div className="flex items-center gap-2">

                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-[#0b5136]">

                              <Wallet
                                size={16}
                              />

                            </div>

                            <span className="text-[14px] font-semibold text-slate-700">
                              {payment.payment_method ||
                                "—"}
                            </span>

                          </div>

                        </td>

                        <td className="px-6 py-5 text-[14px] font-medium text-slate-600">
                          {reference ||
                            "—"}
                        </td>

                        <td className="whitespace-nowrap px-6 py-5 text-right text-[16px] font-bold text-slate-950">
                          {money(
                            payment.amount
                          )}
                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>
        ) : (
          <div className="flex min-h-[230px] items-center justify-center text-center">

            <div>

              <Banknote
                size={30}
                className="mx-auto text-[#0b5136]"
              />

              <p className="mt-4 text-[17px] font-bold text-slate-950">
                No salary payments yet
              </p>

              <p className="mt-2 text-[15px] text-slate-600">
                Salary payments will appear here after they are recorded.
              </p>

            </div>

          </div>
        )}

      </section>

    </FinancePageShell>
  );
}

// ============================================================
// FIELD
// ============================================================

function Field({
  label,
  optional = false,
  children,
}: {
  label: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">

      <div className="mb-2 flex items-center gap-2">

        <span className="text-[15px] font-bold text-slate-800">
          {label}
        </span>

        {optional && (
          <span className="text-[12px] font-medium text-slate-500">
            Optional
          </span>
        )}

      </div>

      {children}

    </label>
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
      className={`min-w-0 rounded-[22px] border p-5 shadow-[0_10px_30px_rgba(15,23,42,0.07)] sm:p-6 ${
        featured
          ? "border-[#0b5136] bg-[#0b5136] text-white"
          : "border-white bg-white text-slate-950"
      }`}
    >

      <div className="flex items-start justify-between gap-4">

        <p
          className={`text-[15px] font-bold leading-5 ${
            featured
              ? "text-white"
              : "text-slate-800"
          }`}
        >
          {title}
        </p>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            featured
              ? "bg-white/15 text-white"
              : "bg-emerald-100 text-[#0b5136]"
          }`}
        >
          {icon}
        </div>

      </div>

      <p className="mt-4 whitespace-nowrap text-[clamp(25px,2.4vw,32px)] font-bold leading-none tracking-tight tabular-nums">
        {value}
      </p>

      <p
        className={`mt-5 text-[14px] font-semibold leading-5 ${
          featured
            ? "text-emerald-50/90"
            : "text-slate-600"
        }`}
      >
        {note}
      </p>

    </div>
  );
}