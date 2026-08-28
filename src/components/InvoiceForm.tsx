"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  CheckCircle2,
  Loader2,
  Package,
  PawPrint,
  Plus,
  Trash2,
  Wallet,
  Wrench,
} from "lucide-react";

import FinancePageShell from "@/components/FinancePageShell";
import { supabase } from "@/lib/supabase";

type InvoiceType =
  | "sheep_sale"
  | "product_sale"
  | "service"
  | "other";

type MemberRole =
  | "owner"
  | "admin"
  | "staff";

type CustomerMode =
  | "existing"
  | "new";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  location: string | null;
  active: boolean;
};

type Account = {
  id: string;
  name: string;
  active: boolean;
};

type Membership = {
  business_id: string;
  role: MemberRole;
};

type TobaskiSeason = {
  id: string;
  season_name: string;
  season_year: number;
  active: boolean;
};

type TobaskiStockOption = {
  id: string;
  tobaski_season_id: string;
  stock_number: string;
  sheep_name: string | null;
  sheep_tag: string | null;
  breed_type: string | null;
  sex: string | null;
  purchase_date: string | null;
  stock_status: string;
  invoice_id: string | null;
};

type SheepRow = {
  localId: string;
  tobaskiStockId: string;
  sheepName: string;
  sheepTag: string;
  breedType: string;
  sex: "" | "male" | "female";
  dateOfBirth: string;
  ageMonths: string;
  salePrice: string;
  notes: string;
};

type ItemRow = {
  localId: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

type DocumentKind = "invoice" | "direct_receipt";

type InvoiceFormProps = {
  mode: "create" | "edit";
  invoiceId?: string;
  documentKind?: DocumentKind;
};

function today() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function makeLocalId() {
  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .slice(2)
  );
}

function money(amount: number) {
  return `GMD ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function emptySheep(): SheepRow {
  return {
    localId: makeLocalId(),
    tobaskiStockId: "",
    sheepName: "",
    sheepTag: "",
    breedType: "",
    sex: "",
    dateOfBirth: "",
    ageMonths: "",
    salePrice: "",
    notes: "",
  };
}

function emptyItem(): ItemRow {
  return {
    localId: makeLocalId(),
    description: "",
    quantity: "1",
    unit: "",
    unitPrice: "",
  };
}

function calculateAgeMonths(
  dateOfBirth: string,
  saleDate: string
) {
  if (
    !dateOfBirth ||
    !saleDate
  ) {
    return null;
  }

  const birth = new Date(
    `${dateOfBirth}T12:00:00`
  );

  const sale = new Date(
    `${saleDate}T12:00:00`
  );

  if (
    Number.isNaN(birth.getTime()) ||
    Number.isNaN(sale.getTime()) ||
    birth > sale
  ) {
    return null;
  }

  let months =
    (sale.getFullYear() -
      birth.getFullYear()) *
      12 +
    sale.getMonth() -
    birth.getMonth();

  if (
    sale.getDate() <
    birth.getDate()
  ) {
    months -= 1;
  }

  return Math.max(months, 0);
}

function invoiceTypeName(
  type: InvoiceType
) {
  if (type === "sheep_sale") {
    return "Sheep Sale";
  }

  if (type === "product_sale") {
    return "Farm Product Sale";
  }

  if (type === "service") {
    return "Consultancy / Service";
  }

  return "Other";
}

export default function InvoiceForm({
  mode,
  invoiceId,
  documentKind = "invoice",
}: InvoiceFormProps) {
  const router = useRouter();

  const isDirectReceipt =
    mode === "create" &&
    documentKind === "direct_receipt";

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [businessId, setBusinessId] =
    useState("");

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
    customers,
    setCustomers,
  ] =
    useState<Customer[]>(
      []
    );

  const [
    accounts,
    setAccounts,
  ] =
    useState<Account[]>(
      []
    );

  const [
    tobaskiSeasons,
    setTobaskiSeasons,
  ] =
    useState<
      TobaskiSeason[]
    >([]);

  const [
    customerMode,
    setCustomerMode,
  ] =
    useState<CustomerMode>(
      "existing"
    );

  const [
    customerId,
    setCustomerId,
  ] = useState("");

  const [
    newCustomerName,
    setNewCustomerName,
  ] = useState("");

  const [
    newCustomerPhone,
    setNewCustomerPhone,
  ] = useState("");

  const [
    newCustomerLocation,
    setNewCustomerLocation,
  ] = useState("");

  /*
   * For NEW invoices we deliberately do NOT
   * create a number in the browser.
   *
   * Supabase creates it only when the invoice
   * is actually saved:
   *
   * INV-2026-0001
   * INV-2026-0002
   */
  const [
    invoiceNumber,
    setInvoiceNumber,
  ] = useState("");

  const [
    invoiceType,
    setInvoiceType,
  ] =
    useState<InvoiceType>(
      "sheep_sale"
    );

  const [
    invoiceDate,
    setInvoiceDate,
  ] = useState(today());

  const [
    dueDate,
    setDueDate,
  ] = useState("");

  const [
    discount,
    setDiscount,
  ] = useState("0");

  const [notes, setNotes] =
    useState("");

  const [
    sheepSaleCategory,
    setSheepSaleCategory,
  ] = useState(
    "Regular Sale"
  );

  const [
    tobaskiSeasonId,
    setTobaskiSeasonId,
  ] = useState("");

  const [
    stockOptions,
    setStockOptions,
  ] =
    useState<
      TobaskiStockOption[]
    >([]);

  const [
    stockLoading,
    setStockLoading,
  ] = useState(false);

  const [
    stockError,
    setStockError,
  ] = useState("");

  const [
    sheepRows,
    setSheepRows,
  ] =
    useState<
      SheepRow[]
    >([
      emptySheep(),
    ]);

  const [
    itemRows,
    setItemRows,
  ] =
    useState<
      ItemRow[]
    >([
      emptyItem(),
    ]);

  const [
    originalCreatedBy,
    setOriginalCreatedBy,
  ] =
    useState<
      string | null
    >(null);

  const [
    originalAmountPaid,
    setOriginalAmountPaid,
  ] = useState(0);

  const [
    originalStatus,
    setOriginalStatus,
  ] = useState(
    "unpaid"
  );

  const [
    paymentAmount,
    setPaymentAmount,
  ] = useState("0");

  const [
    paymentAccountId,
    setPaymentAccountId,
  ] = useState("");

  const [
    paymentDate,
    setPaymentDate,
  ] = useState(today());
const isOwnerOrAdmin =
    memberRole === "owner" ||
    memberRole === "admin";

  // ==========================================================
  // LOAD FORM
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadForm() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { session },
          error: sessionError,
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
            `
            business_id,
            role
          `
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
            "Unable to find business access."
          );
        }

        const membership =
          membershipData as Membership;

        const [
          customerResult,
          accountResult,
          seasonResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "contacts"
              )
              .select(
                `
                id,
                name,
                phone,
                location,
                active
              `
              )
              .eq(
                "business_id",
                membership.business_id
              )
              .eq(
                "contact_type",
                "customer"
              )
              .order("name"),

            supabase
              .from(
                "financial_accounts"
              )
              .select(
                `
                id,
                name,
                active
              `
              )
              .eq(
                "business_id",
                membership.business_id
              )
              .order("name"),

            supabase
              .from(
                "tobaski_seasons"
              )
              .select(
                `
                id,
                season_name,
                season_year,
                active
              `
              )
              .eq(
                "business_id",
                membership.business_id
              )
              .order(
                "season_year",
                {
                  ascending:
                    false,
                }
              ),
          ]);

        if (
          customerResult.error
        ) {
          throw new Error(
            customerResult.error.message
          );
        }

        if (
          accountResult.error
        ) {
          throw new Error(
            accountResult.error.message
          );
        }

        if (
          seasonResult.error
        ) {
          throw new Error(
            seasonResult.error.message
          );
        }

        if (!active) {
          return;
        }

        const loadedCustomers =
          (customerResult.data ??
            []) as Customer[];

        const loadedAccounts =
          (accountResult.data ??
            []) as Account[];

        const loadedSeasons =
          (seasonResult.data ??
            []) as TobaskiSeason[];

        setBusinessId(
          membership.business_id
        );

        setCurrentUserId(
          session.user.id
        );

        setMemberRole(
          membership.role
        );

        setCustomers(
          loadedCustomers
        );

        setAccounts(
          loadedAccounts
        );

        setTobaskiSeasons(
          loadedSeasons
        );

        if (
          loadedCustomers.length ===
          0
        ) {
          setCustomerMode(
            "new"
          );
        }

        const activeSeason =
          loadedSeasons.find(
            (season) =>
              season.active
          ) ??
          loadedSeasons[0];

        if (activeSeason) {
          setTobaskiSeasonId(
            activeSeason.id
          );
        }

        const cashAccount =
          loadedAccounts.find(
            (account) =>
              account.name ===
              "Cash on Hand"
          ) ??
          loadedAccounts[0];

        if (cashAccount) {
          setPaymentAccountId(
            cashAccount.id
          );
        }

        if (
          mode === "create"
        ) {
          setLoading(false);
          return;
        }

        if (!invoiceId) {
          throw new Error(
            "Invoice ID is missing."
          );
        }

        const {
          data:
            invoiceData,
          error:
            invoiceError,
        } = await supabase
          .from("invoices")
          .select(
            `
            id,
            invoice_number,
            customer_id,
            invoice_date,
            due_date,
            discount,
            amount_paid,
            status,
            notes,
            created_by,
            invoice_type,
            tobaski_season_id
          `
          )
          .eq(
            "id",
            invoiceId
          )
          .eq(
            "business_id",
            membership.business_id
          )
          .single();

        if (
          invoiceError ||
          !invoiceData
        ) {
          throw new Error(
            invoiceError?.message ||
              "Invoice not found."
          );
        }

        const allowedToEdit =
          membership.role ===
            "owner" ||
          membership.role ===
            "admin" ||
          invoiceData.created_by ===
            session.user.id;

        if (
          !allowedToEdit
        ) {
          router.replace(
            `/invoices/${invoiceId}`
          );

          return;
        }

        const loadedType =
          (invoiceData.invoice_type ??
            "other") as InvoiceType;

        setInvoiceNumber(
          invoiceData.invoice_number ??
            ""
        );

        setCustomerMode(
          "existing"
        );

        setCustomerId(
          invoiceData.customer_id ??
            ""
        );

        setInvoiceType(
          loadedType
        );

        setInvoiceDate(
          String(
            invoiceData.invoice_date
          ).slice(0, 10)
        );

        setDueDate(
          invoiceData.due_date
            ? String(
                invoiceData.due_date
              ).slice(0, 10)
            : ""
        );

        setDiscount(
          String(
            Number(
              invoiceData.discount ??
                0
            )
          )
        );

        setNotes(
          invoiceData.notes ??
            ""
        );

        setOriginalCreatedBy(
          invoiceData.created_by
        );

        setOriginalAmountPaid(
          Number(
            invoiceData.amount_paid ??
              0
          )
        );

        setOriginalStatus(
          invoiceData.status ??
            "unpaid"
        );

        if (
          invoiceData.tobaski_season_id
        ) {
          setTobaskiSeasonId(
            invoiceData.tobaski_season_id
          );
        }

        if (
          loadedType ===
          "sheep_sale"
        ) {
          const {
            data:
              sheepData,
            error:
              sheepError,
          } = await supabase
            .from(
              "sheep_sale_details"
            )
            .select(
              `
              id,
              tobaski_stock_id,
              sheep_name,
              sheep_tag,
              breed_type,
              sale_category,
              tobaski_season_id,
              sex,
              date_of_birth,
              age_months_at_sale,
              sale_price,
              notes
            `
            )
            .eq(
              "invoice_id",
              invoiceId
            );

          if (
            sheepError
          ) {
            throw new Error(
              sheepError.message
            );
          }

          if (
            sheepData &&
            sheepData.length > 0
          ) {
            setSheepSaleCategory(
              sheepData[0]
                .sale_category ??
                "Regular Sale"
            );

            if (
              sheepData[0]
                .tobaski_season_id
            ) {
              setTobaskiSeasonId(
                sheepData[0]
                  .tobaski_season_id
              );
            }

            setSheepRows(
              sheepData.map(
                (row) => {
                  const sex =
                    String(
                      row.sex ?? ""
                    ).toLowerCase();

                  return {
                    localId:
                      row.id,

                    tobaskiStockId:
                      row.tobaski_stock_id ??
                      "",

                    sheepName:
                      row.sheep_name ??
                      "",

                    sheepTag:
                      row.sheep_tag ??
                      "",

                    breedType:
                      row.breed_type ??
                      "",

                    sex:
                      (
                        sex === "male" ||
                        sex === "female"
                          ? sex
                          : ""
                      ) as
                        | ""
                        | "male"
                        | "female",

                    dateOfBirth:
                      row.date_of_birth ??
                      "",

                    ageMonths:
                      row.age_months_at_sale ===
                      null
                        ? ""
                        : String(
                            row.age_months_at_sale
                          ),

                    salePrice:
                      String(
                        Number(
                          row.sale_price ??
                            0
                        )
                      ),

                    notes:
                      row.notes ??
                      "",
                  };
                }
              )
            );
          }
        } else {
          const {
            data:
              itemData,
            error:
              itemError,
          } = await supabase
            .from(
              "invoice_items"
            )
            .select(
              `
              id,
              description,
              quantity,
              unit,
              unit_price
            `
            )
            .eq(
              "invoice_id",
              invoiceId
            );

          if (
            itemError
          ) {
            throw new Error(
              itemError.message
            );
          }

          if (
            itemData &&
            itemData.length > 0
          ) {
            setItemRows(
              itemData.map(
                (row) => ({
                  localId:
                    row.id,

                  description:
                    row.description ??
                    "",

                  quantity:
                    String(
                      Number(
                        row.quantity ??
                          1
                      )
                    ),

                  unit:
                    row.unit ??
                    "",

                  unitPrice:
                    String(
                      Number(
                        row.unit_price ??
                          0
                      )
                    ),
                })
              )
            );
          }
        }

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
              : "Unable to load invoice."
          );

          setLoading(false);
        }
      }
    }

    loadForm();

    return () => {
      active = false;
    };
  }, [
    router,
    mode,
    invoiceId,
  ]);

  // ==========================================================
  // TOBASKI STOCK
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadStock() {
      if (
        !businessId ||
        invoiceType !==
          "sheep_sale" ||
        sheepSaleCategory !==
          "Tobaski Sale" ||
        !tobaskiSeasonId
      ) {
        setStockOptions([]);
        setStockError("");
        setStockLoading(false);
        return;
      }

      try {
        setStockLoading(true);
        setStockError("");

        const {
          data,
          error:
            stockLoadError,
        } = await supabase
          .from(
            "tobaski_sheep_position"
          )
          .select(
            `
            id,
            tobaski_season_id,
            stock_number,
            sheep_name,
            sheep_tag,
            breed_type,
            sex,
            purchase_date,
            stock_status,
            invoice_id
          `
          )
          .eq(
            "business_id",
            businessId
          )
          .eq(
            "tobaski_season_id",
            tobaskiSeasonId
          )
          .order(
            "stock_number",
            {
              ascending:
                true,
            }
          );

        if (
          stockLoadError
        ) {
          throw new Error(
            stockLoadError.message
          );
        }

        if (!active) {
          return;
        }

        const unique =
          new Map<
            string,
            TobaskiStockOption
          >();

        (
          data ?? []
        ).forEach(
          (row) => {
            const option:
              TobaskiStockOption = {
              id: row.id,

              tobaski_season_id:
                row.tobaski_season_id,

              stock_number:
                row.stock_number,

              sheep_name:
                row.sheep_name,

              sheep_tag:
                row.sheep_tag,

              breed_type:
                row.breed_type,

              sex:
                row.sex,

              purchase_date:
                row.purchase_date,

              stock_status:
                row.stock_status ??
                "Remaining",

              invoice_id:
                row.invoice_id,
            };

            const existing =
              unique.get(
                option.id
              );

            if (
              !existing
            ) {
              unique.set(
                option.id,
                option
              );

              return;
            }

            if (
              invoiceId &&
              option.invoice_id ===
                invoiceId
            ) {
              unique.set(
                option.id,
                option
              );
            }
          }
        );

        const available =
          Array.from(
            unique.values()
          ).filter(
            (stock) =>
              stock.stock_status
                .toLowerCase() !==
                "sold" ||
              Boolean(
                invoiceId &&
                  stock.invoice_id ===
                    invoiceId
              )
          );

        setStockOptions(
          available
        );
      } catch (
        stockLoadError
      ) {
        console.error(
          stockLoadError
        );

        if (active) {
          setStockOptions([]);

          setStockError(
            stockLoadError instanceof
              Error
              ? stockLoadError.message
              : "Unable to load Tobaski sheep stock."
          );
        }
      } finally {
        if (active) {
          setStockLoading(
            false
          );
        }
      }
    }

    loadStock();

    return () => {
      active = false;
    };
  }, [
    businessId,
    invoiceType,
    sheepSaleCategory,
    tobaskiSeasonId,
    invoiceId,
  ]);

  // ==========================================================
  // TOTALS
  // ==========================================================

  const sheepSubtotal =
    useMemo(
      () =>
        sheepRows.reduce(
          (
            total,
            row
          ) =>
            total +
            Math.max(
              Number(
                row.salePrice
              ) || 0,
              0
            ),
          0
        ),
      [sheepRows]
    );

  const itemSubtotal =
    useMemo(
      () =>
        itemRows.reduce(
          (
            total,
            row
          ) =>
            total +
            Math.max(
              Number(
                row.quantity
              ) || 0,
              0
            ) *
              Math.max(
                Number(
                  row.unitPrice
                ) || 0,
                0
              ),
          0
        ),
      [itemRows]
    );

  const subtotal =
    invoiceType ===
    "sheep_sale"
      ? sheepSubtotal
      : itemSubtotal;

  const discountAmount =
    Math.max(
      Number(
        discount
      ) || 0,
      0
    );

  const totalAmount =
    Math.max(
      subtotal -
        discountAmount,
      0
    );

  const maleCount =
    sheepRows.filter(
      (row) =>
        row.sex === "male"
    ).length;

  const femaleCount =
    sheepRows.filter(
      (row) =>
        row.sex === "female"
    ).length;

  const selectedStockIds =
    useMemo(
      () =>
        sheepRows
          .map(
            (row) =>
              row.tobaskiStockId
          )
          .filter(Boolean),
      [sheepRows]
    );

  const selectedStockSet =
    useMemo(
      () =>
        new Set(
          selectedStockIds
        ),
      [selectedStockIds]
    );

  const leftAfterSale =
    Math.max(
      stockOptions.length -
        selectedStockIds.length,
      0
    );

  // ==========================================================
  // CUSTOMER
  // ==========================================================

  async function resolveCustomerId() {
    if (
      customerMode ===
      "existing"
    ) {
      if (!customerId) {
        throw new Error(
          "Please select a customer."
        );
      }

      return customerId;
    }

    const name =
      newCustomerName.trim();

    if (!name) {
      throw new Error(
        "Please enter the customer name."
      );
    }

    const {
      data:
        createdCustomer,
      error:
        customerError,
    } = await supabase
      .from("contacts")
      .insert({
        business_id:
          businessId,

        contact_type:
          "customer",

        name,

        phone:
          newCustomerPhone.trim() ||
          null,

        location:
          newCustomerLocation.trim() ||
          null,

        active: true,

        created_by:
          currentUserId,
      })
      .select("id")
      .single();

    if (
      customerError ||
      !createdCustomer
    ) {
      throw new Error(
        customerError?.message ||
          "Unable to save customer."
      );
    }

    return createdCustomer.id;
  }

  // ==========================================================
  // SHEEP
  // ==========================================================

  function updateSheep(
    id: string,
    field:
      keyof Omit<
        SheepRow,
        "localId"
      >,
    value: string
  ) {
    setSheepRows(
      (current) =>
        current.map(
          (row) =>
            row.localId ===
            id
              ? {
                  ...row,
                  [field]:
                    value,
                }
              : row
        )
    );
  }

  function selectTobaskiStock(
    rowId: string,
    stockId: string
  ) {
    if (!stockId) {
      updateSheep(
        rowId,
        "tobaskiStockId",
        ""
      );

      return;
    }

    const stock =
      stockOptions.find(
        (option) =>
          option.id ===
          stockId
      );

    if (!stock) {
      return;
    }

    const stockSex =
      stock.sex?.toLowerCase();

    setSheepRows(
      (current) =>
        current.map(
          (row) =>
            row.localId ===
            rowId
              ? {
                  ...row,

                  tobaskiStockId:
                    stock.id,

                  sheepName:
                    stock.sheep_name ??
                    row.sheepName,

                  sheepTag:
                    stock.sheep_tag ??
                    row.sheepTag,

                  breedType:
                    stock.breed_type ??
                    row.breedType,

                  sex:
                    stockSex ===
                      "male" ||
                    stockSex ===
                      "female"
                      ? stockSex
                      : row.sex,
                }
              : row
        )
    );
  }

  function removeSheep(
    id: string
  ) {
    setSheepRows(
      (current) => {
        const remaining =
          current.filter(
            (row) =>
              row.localId !==
              id
          );

        return remaining.length >
          0
          ? remaining
          : [emptySheep()];
      }
    );
  }

  // ==========================================================
  // ITEMS
  // ==========================================================

  function updateItem(
    id: string,
    field:
      keyof Omit<
        ItemRow,
        "localId"
      >,
    value: string
  ) {
    setItemRows(
      (current) =>
        current.map(
          (row) =>
            row.localId ===
            id
              ? {
                  ...row,
                  [field]:
                    value,
                }
              : row
        )
    );
  }

  function removeItem(
    id: string
  ) {
    setItemRows(
      (current) => {
        const remaining =
          current.filter(
            (row) =>
              row.localId !==
              id
          );

        return remaining.length >
          0
          ? remaining
          : [emptyItem()];
      }
    );
  }

  // ==========================================================
  // VERIFY TOBASKI STOCK
  // ==========================================================

  async function verifySelectedStock() {
    const ids =
      sheepRows.map(
        (row) =>
          row.tobaskiStockId
      );

    const {
      data,
      error:
        stockCheckError,
    } = await supabase
      .from(
        "tobaski_sheep_position"
      )
      .select(
        `
        id,
        stock_status,
        invoice_id
      `
      )
      .in("id", ids);

    if (
      stockCheckError
    ) {
      throw new Error(
        `Unable to verify Tobaski sheep stock: ${stockCheckError.message}`
      );
    }

    const grouped =
      new Map<
        string,
        {
          stock_status: string;
          invoice_id:
            string | null;
        }[]
      >();

    (
      data ?? []
    ).forEach(
      (row) => {
        const current =
          grouped.get(
            row.id
          ) ?? [];

        current.push({
          stock_status:
            row.stock_status ??
            "Remaining",

          invoice_id:
            row.invoice_id,
        });

        grouped.set(
          row.id,
          current
        );
      }
    );

    for (const id of ids) {
      const matches =
        grouped.get(id) ??
        [];

      if (
        matches.length === 0
      ) {
        throw new Error(
          "One of the selected Tobaski sheep could not be found. Please select it again."
        );
      }

      const soldElsewhere =
        matches.some(
          (stock) =>
            stock.stock_status
              .toLowerCase() ===
              "sold" &&
            !(
              invoiceId &&
              stock.invoice_id ===
                invoiceId
            )
        );

      if (
        soldElsewhere
      ) {
        throw new Error(
          "One of the selected Tobaski sheep has already been sold. Please choose another sheep."
        );
      }
    }
  }

  // ==========================================================
  // SAVE
  // ==========================================================

  async function saveInvoice(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !businessId ||
      !currentUserId
    ) {
      return;
    }

    setError("");

    if (!invoiceDate) {
      setError(
        "Please select the invoice date."
      );

      return;
    }

    if (
      dueDate &&
      dueDate < invoiceDate
    ) {
      setError(
        "Due date cannot be before the invoice date."
      );

      return;
    }

    if (
      discountAmount >
      subtotal
    ) {
      setError(
        "Discount cannot be greater than the subtotal."
      );

      return;
    }

    if (
      totalAmount <= 0
    ) {
      setError(
        "Invoice total must be greater than zero."
      );

      return;
    }

    if (
      invoiceType ===
      "sheep_sale"
    ) {
      if (
        sheepSaleCategory ===
          "Tobaski Sale" &&
        !tobaskiSeasonId
      ) {
        setError(
          "Please select the Tobaski season."
        );

        return;
      }

      if (
        sheepSaleCategory ===
        "Tobaski Sale"
      ) {
        if (
          selectedStockIds.length !==
          sheepRows.length
        ) {
          setError(
            "Please select the exact Tobaski sheep being sold for every sheep line."
          );

          return;
        }

        if (
          new Set(
            selectedStockIds
          ).size !==
          selectedStockIds.length
        ) {
          setError(
            "The same Tobaski sheep cannot be selected more than once on an invoice."
          );

          return;
        }
      }

      for (
        let index = 0;
        index <
        sheepRows.length;
        index += 1
      ) {
        const row =
          sheepRows[index];

        

        if (
          Number(
            row.salePrice
          ) <= 0
        ) {
          setError(
            `Please enter a valid sale price for sheep ${
              index + 1
            }.`
          );

          return;
        }

        if (
          row.dateOfBirth &&
          row.dateOfBirth >
            invoiceDate
        ) {
          setError(
            `Sheep ${
              index + 1
            } cannot have a date of birth after the sale date.`
          );

          return;
        }
      }
    } else {
      for (
        let index = 0;
        index <
        itemRows.length;
        index += 1
      ) {
        const row =
          itemRows[index];

        if (
          !row.description.trim()
        ) {
          setError(
            `Please enter a description for item ${
              index + 1
            }.`
          );

          return;
        }

        if (
          Number(
            row.quantity
          ) <= 0
        ) {
          setError(
            `Please enter a valid quantity for item ${
              index + 1
            }.`
          );

          return;
        }

        if (
          Number(
            row.unitPrice
          ) < 0
        ) {
          setError(
            `Please enter a valid price for item ${
              index + 1
            }.`
          );

          return;
        }
      }
    }

    const initialPayment =
      mode === "create"
        ? isDirectReceipt
          ? totalAmount
          : Math.max(
              Number(
                paymentAmount
              ) || 0,
              0
            )
        : originalAmountPaid;

    if (
      mode === "create" &&
      initialPayment >
        totalAmount
    ) {
      setError(
        "Payment cannot be greater than the invoice total."
      );

      return;
    }

    if (
      mode === "create" &&
      initialPayment > 0 &&
      !paymentAccountId
    ) {
      setError(
        "Please select where the payment was received."
      );

      return;
    }

    if (
      mode === "edit" &&
      totalAmount <
        originalAmountPaid
    ) {
      setError(
        "The invoice total cannot be lower than the amount already paid."
      );

      return;
    }

    let createdInvoiceIdForCleanup = "";

    try {
      setSaving(true);

      if (
        invoiceType ===
          "sheep_sale" &&
        sheepSaleCategory ===
          "Tobaski Sale"
      ) {
        await verifySelectedStock();
      }

      const resolvedCustomerId =
        await resolveCustomerId();

      const linkedTobaskiSeasonId =
        invoiceType ===
          "sheep_sale" &&
        sheepSaleCategory ===
          "Tobaski Sale"
          ? tobaskiSeasonId
          : null;

      let savedInvoiceId =
        invoiceId ?? "";

      let finalInvoiceNumber =
        isDirectReceipt
          ? `DR-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)
              .toUpperCase()}`
          : invoiceNumber;

      // ======================================================
      // NEW INVOICE NUMBER
      // ======================================================

      if (
        mode === "create" &&
        !isDirectReceipt
      ) {
        const {
          data:
            generatedNumber,
          error:
            numberError,
        } = await supabase.rpc(
          "generate_next_invoice_number",
          {
            p_business_id:
              businessId,

            p_invoice_date:
              invoiceDate,
          }
        );

        if (
          numberError ||
          !generatedNumber
        ) {
          throw new Error(
            numberError?.message ||
              "Unable to generate invoice number."
          );
        }

        finalInvoiceNumber =
          String(
            generatedNumber
          );

        setInvoiceNumber(
          finalInvoiceNumber
        );
      }

      // ======================================================
      // CREATE INVOICE
      // ======================================================

      if (
        mode === "create"
      ) {
        const {
          data:
            invoiceRow,
          error:
            invoiceError,
        } = await supabase
          .from("invoices")
          .insert({
            business_id:
              businessId,

            invoice_number:
              finalInvoiceNumber,

            customer_id:
              resolvedCustomerId,

            invoice_date:
              invoiceDate,

            due_date:
              isDirectReceipt
                ? null
                : dueDate ||
                  null,

            subtotal,

            discount:
              discountAmount,

            total_amount:
              totalAmount,

            amount_paid: 0,

            balance_due:
              totalAmount,

            status:
              "unpaid",

            notes:
              notes.trim() ||
              null,

            created_by:
              currentUserId,

            invoice_type:
              invoiceType,

            document_kind:
              documentKind,

            tobaski_season_id:
              linkedTobaskiSeasonId,
          })
          .select("id")
          .single();

        if (
          invoiceError ||
          !invoiceRow
        ) {
          throw new Error(
            invoiceError?.message ||
              "Unable to save invoice."
          );
        }

        savedInvoiceId =
          invoiceRow.id;

        createdInvoiceIdForCleanup =
          invoiceRow.id;
      } else {
        if (
          !savedInvoiceId
        ) {
          throw new Error(
            "Invoice ID is missing."
          );
        }

        const allowedToEdit =
          isOwnerOrAdmin ||
          originalCreatedBy ===
            currentUserId;

        if (
          !allowedToEdit
        ) {
          throw new Error(
            "You do not have permission to edit this invoice."
          );
        }

        const newBalance =
          Math.max(
            totalAmount -
              originalAmountPaid,
            0
          );

        let newStatus =
          originalStatus;

        if (
          originalStatus !==
          "cancelled"
        ) {
          newStatus =
            newBalance <= 0
              ? "paid"
              : originalAmountPaid >
                  0
              ? "part_paid"
              : "unpaid";
        }

        const {
          error:
            updateError,
        } = await supabase
          .from("invoices")
          .update({
            customer_id:
              resolvedCustomerId,

            invoice_date:
              invoiceDate,

            due_date:
              dueDate ||
              null,

            subtotal,

            discount:
              discountAmount,

            total_amount:
              totalAmount,

            balance_due:
              newBalance,

            status:
              newStatus,

            notes:
              notes.trim() ||
              null,

            invoice_type:
              invoiceType,

            tobaski_season_id:
              linkedTobaskiSeasonId,
          })
          .eq(
            "id",
            savedInvoiceId
          )
          .eq(
            "business_id",
            businessId
          );

        if (
          updateError
        ) {
          throw new Error(
            updateError.message
          );
        }

        const {
          error:
            itemDeleteError,
        } = await supabase
          .from(
            "invoice_items"
          )
          .delete()
          .eq(
            "invoice_id",
            savedInvoiceId
          );

        if (
          itemDeleteError
        ) {
          throw new Error(
            itemDeleteError.message
          );
        }

        const {
          error:
            sheepDeleteError,
        } = await supabase
          .from(
            "sheep_sale_details"
          )
          .delete()
          .eq(
            "invoice_id",
            savedInvoiceId
          );

        if (
          sheepDeleteError
        ) {
          throw new Error(
            sheepDeleteError.message
          );
        }
      }

      // ======================================================
      // SHEEP SALE
      // ======================================================

      if (
        invoiceType ===
        "sheep_sale"
      ) {
        const invoiceItems =
          sheepRows.map(
            (
              row,
              index
            ) => {
              const description =
                [
                  row.sheepName.trim() ||
                    `Sheep ${
                      index + 1
                    }`,

                  row.breedType,

                  row.sheepTag.trim()
                    ? `Tag ${row.sheepTag.trim()}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" - ");

              const price =
                Number(
                  row.salePrice
                );

              return {
                invoice_id:
                  savedInvoiceId,

                item_id:
                  null,

                description,

                quantity: 1,

                unit:
                  "Sheep",

                unit_price:
                  price,

                line_total:
                  price,
              };
            }
          );

        const {
          error:
            itemInsertError,
        } = await supabase
          .from(
            "invoice_items"
          )
          .insert(
            invoiceItems
          );

        if (
          itemInsertError
        ) {
          throw new Error(
            itemInsertError.message
          );
        }

        const sheepDetails =
          sheepRows.map(
            (row) => {
              const calculatedAge =
                calculateAgeMonths(
                  row.dateOfBirth,
                  invoiceDate
                );

              const manualAge =
                row.ageMonths
                  ? Number(
                      row.ageMonths
                    )
                  : null;

              return {
                business_id:
                  businessId,

                customer_id:
                  resolvedCustomerId,

                sale_id:
                  null,

                invoice_id:
                  savedInvoiceId,

                sheep_name:
                  row.sheepName.trim() ||
                  null,

                sheep_tag:
                  row.sheepTag.trim() ||
                  null,

                breed_type: row.breedType || null,

                sale_category:
                  sheepSaleCategory,

                tobaski_season_id:
                  linkedTobaskiSeasonId,

                tobaski_stock_id:
                  linkedTobaskiSeasonId
                    ? row.tobaskiStockId ||
                      null
                    : null,

                sex: row.sex || null,

                date_of_birth:
                  row.dateOfBirth ||
                  null,

                age_months_at_sale:
                  calculatedAge ??
                  (
                    manualAge !==
                      null &&
                    Number.isFinite(
                      manualAge
                    )
                      ? manualAge
                      : null
                  ),

                sale_date:
                  invoiceDate,

                sale_price:
                  Number(
                    row.salePrice
                  ),

                notes:
                  row.notes.trim() ||
                  null,

                created_by:
                  currentUserId,
              };
            }
          );

        const {
          error:
            sheepInsertError,
        } = await supabase
          .from(
            "sheep_sale_details"
          )
          .insert(
            sheepDetails
          );

        if (
          sheepInsertError
        ) {
          throw new Error(
            sheepInsertError.message
          );
        }
      } else {
        // ====================================================
        // PRODUCTS / SERVICES / OTHER
        // ====================================================

        const items =
          itemRows.map(
            (row) => {
              const quantity =
                Number(
                  row.quantity
                );

              const unitPrice =
                Number(
                  row.unitPrice
                );

              return {
                invoice_id:
                  savedInvoiceId,

                item_id:
                  null,

                description:
                  row.description.trim(),

                quantity,

                unit:
                  row.unit.trim() ||
                  null,

                unit_price:
                  unitPrice,

                line_total:
                  quantity *
                  unitPrice,
              };
            }
          );

        const {
          error:
            itemInsertError,
        } = await supabase
          .from(
            "invoice_items"
          )
          .insert(items);

        if (
          itemInsertError
        ) {
          throw new Error(
            itemInsertError.message
          );
        }
      }

      // ======================================================
      // INITIAL PAYMENT
      // ======================================================

      if (
        mode === "create" &&
        initialPayment > 0
      ) {
        const {
          error:
            paymentError,
        } = await supabase.rpc(
          "record_invoice_payment",
          {
            p_invoice_id:
              savedInvoiceId,

            p_amount:
              initialPayment,

            p_account_id:
              paymentAccountId,

            p_payment_date:
              paymentDate,

            p_notes:
              notes.trim() || null,
          }
        );

        if (
          paymentError
        ) {
          console.error(
            paymentError
          );

          if (
            isDirectReceipt
          ) {
            throw new Error(
              paymentError.message ||
                "Unable to issue receipt."
            );
          }

          router.push(
            `/invoices/${savedInvoiceId}?saved=invoice&payment_error=1`
          );

          return;
        }
      }

      if (
        mode === "create" &&
        isDirectReceipt
      ) {
        const {
          data: receiptPayment,
          error: receiptLookupError,
        } = await supabase
          .from("payments")
          .select("id")
          .eq("invoice_id", savedInvoiceId)
          .order("payment_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (receiptLookupError || !receiptPayment) {
          throw new Error(
            receiptLookupError?.message ||
              "Receipt was recorded but could not be opened."
          );
        }

        router.push(
          `/receipts/${receiptPayment.id}?saved=receipt`
        );
      } else {
        router.push(
          mode === "create"
            ? `/invoices/${savedInvoiceId}?saved=invoice`
            : `/invoices/${savedInvoiceId}?updated=invoice`
        );
      }

      router.refresh();
    } catch (
      saveError
    ) {
      console.error(
        saveError
      );

      if (
        mode === "create" &&
        createdInvoiceIdForCleanup
      ) {
        try {
          const {
            error: cleanupSheepError,
          } = await supabase
            .from("sheep_sale_details")
            .delete()
            .eq(
              "invoice_id",
              createdInvoiceIdForCleanup
            );

          if (cleanupSheepError) {
            console.error(
              "Unable to clean up sheep details:",
              cleanupSheepError
            );
          }

          const {
            error: cleanupItemsError,
          } = await supabase
            .from("invoice_items")
            .delete()
            .eq(
              "invoice_id",
              createdInvoiceIdForCleanup
            );

          if (cleanupItemsError) {
            console.error(
              "Unable to clean up invoice items:",
              cleanupItemsError
            );
          }

          const {
            error: cleanupInvoiceError,
          } = await supabase
            .from("invoices")
            .delete()
            .eq(
              "id",
              createdInvoiceIdForCleanup
            )
            .eq(
              "business_id",
              businessId
            );

          if (cleanupInvoiceError) {
            console.error(
              "Unable to clean up failed invoice:",
              cleanupInvoiceError
            );
          }
        } catch (cleanupError) {
          console.error(
            "Invoice cleanup failed:",
            cleanupError
          );
        }
      }

      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "Unable to save invoice."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#edf3ef]">

        <Loader2
          size={32}
          className="animate-spin text-[#0b5136]"
        />

      </main>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <FinancePageShell
      eyebrow="Invoices & Receipts"
      title={
        mode === "create"
          ? isDirectReceipt
            ? "Issue Receipt"
            : "Create Invoice"
          : "Edit Invoice"
      }
      description={
        isDirectReceipt
          ? "Record a paid sale and issue the customer a receipt."
          : "Create an invoice for sheep, farm products, consultancy or other business income."
      }
      recordText={
        mode === "create"
          ? isDirectReceipt
            ? "Receipt number generated when saved"
            : "Invoice number generated when saved"
          : invoiceNumber
      }
    >

      <form
        onSubmit={
          saveInvoice
        }
      >

        {error && (
          <div className="mb-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-[15px] font-semibold text-red-800">
            {error}
          </div>
        )}

        {/* ====================================================
            CUSTOMER
        ==================================================== */}

        <Section
          eyebrow="Customer"
          title={
            isDirectReceipt
              ? "Who is this receipt for?"
              : "Who is this invoice for?"
          }
        >

          <div className="flex flex-wrap gap-3">

            <ToggleButton
              active={
                customerMode ===
                "existing"
              }
              onClick={() =>
                setCustomerMode(
                  "existing"
                )
              }
            >
              Existing Customer
            </ToggleButton>

            <ToggleButton
              active={
                customerMode ===
                "new"
              }
              onClick={() =>
                setCustomerMode(
                  "new"
                )
              }
            >
              New Customer
            </ToggleButton>

          </div>

          {customerMode ===
          "existing" ? (
            <div className="mt-5">

              <Label>
                Customer
              </Label>

              <select
                value={
                  customerId
                }
                onChange={(
                  event
                ) =>
                  setCustomerId(
                    event.target.value
                  )
                }
                className={
                  inputClass
                }
              >

                <option value="">
                  Select customer
                </option>

                {customers
                  .filter(
                    (customer) =>
                      customer.active !==
                      false
                  )
                  .map(
                    (customer) => (
                      <option
                        key={
                          customer.id
                        }
                        value={
                          customer.id
                        }
                      >
                        {
                          customer.name
                        }
                      </option>
                    )
                  )}

              </select>

            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-3">

              <Field
                label="Customer Name"
                value={
                  newCustomerName
                }
                placeholder="e.g. Lamin Jallow"
                onChange={
                  setNewCustomerName
                }
              />

              <Field
                label="Phone"
                value={
                  newCustomerPhone
                }
                placeholder="+220 ..."
                onChange={
                  setNewCustomerPhone
                }
              />

              <Field
                label="Location"
                value={
                  newCustomerLocation
                }
                placeholder="e.g. Brikama"
                onChange={
                  setNewCustomerLocation
                }
              />

            </div>
          )}

        </Section>

        {/* ====================================================
            INVOICE
        ==================================================== */}

        <Section
          eyebrow={
            isDirectReceipt ? "Receipt" : "Invoice"
          }
          title={
            isDirectReceipt
              ? "Sale & Receipt Details"
              : "Invoice Details"
          }
          className="mt-5"
        >

          <div className="grid gap-5 md:grid-cols-3">

            <div>

              <Label>
                {isDirectReceipt ? "Sale Type" : "Invoice For"}
              </Label>

              <select
                value={
                  invoiceType
                }
                onChange={(
                  event
                ) => {
                  const newType =
                    event.target
                      .value as InvoiceType;

                  setInvoiceType(
                    newType
                  );

                  if (
                    newType ===
                    "service"
                  ) {
                    setItemRows(
                      (current) =>
                        current.map(
                          (row) => ({
                            ...row,

                            quantity:
                              row.quantity ||
                              "1",

                            unit:
                              row.unit ||
                              "Service",
                          })
                        )
                    );
                  }
                }}
                className={
                  inputClass
                }
              >

                <option value="sheep_sale">
                  Sheep Sale
                </option>

                <option value="product_sale">
                  Farm Product Sale
                </option>

                <option value="service">
                  Consultancy / Service
                </option>

                <option value="other">
                  Other
                </option>

              </select>

            </div>

            <div>

              <Label>
                {isDirectReceipt ? "Sale Date" : "Invoice Date"}
              </Label>

              <input
                type="date"
                value={
                  invoiceDate
                }
                onChange={(
                  event
                ) => {
                  setInvoiceDate(
                    event.target.value
                  );

                  if (
                    mode ===
                    "create"
                  ) {
                    setPaymentDate(
                      event.target.value
                    );
                  }
                }}
                className={
                  inputClass
                }
              />

            </div>

            <div>

              <Label>
                Due Date
              </Label>

              <input
                type="date"
                min={
                  invoiceDate
                }
                value={
                  dueDate
                }
                onChange={(
                  event
                ) =>
                  setDueDate(
                    event.target.value
                  )
                }
                className={
                  inputClass
                }
              />

              <p className="mt-2 text-[12px] text-slate-500">
                Optional
              </p>

            </div>

          </div>

        </Section>

        {/* ====================================================
            SHEEP SALE
        ==================================================== */}

        {invoiceType ===
        "sheep_sale" ? (
          <Section
            eyebrow="Sheep Sale"
            title="Sheep Sold"
            icon={
              <PawPrint
                size={18}
              />
            }
            className="mt-5"
            action={
              <button
                type="button"
                onClick={() =>
                  setSheepRows(
                    (current) => [
                      ...current,
                      emptySheep(),
                    ]
                  )
                }
                className={
                  primaryButtonClass
                }
              >
                <Plus
                  size={17}
                />

                Add Sheep
              </button>
            }
          >

            <div className="grid gap-4 md:grid-cols-2">

              <div>

                <Label>
                  Sale Category
                </Label>

                <select
                  value={
                    sheepSaleCategory
                  }
                  onChange={(
                    event
                  ) => {
                    const nextCategory =
                      event.target.value;

                    setSheepSaleCategory(
                      nextCategory
                    );

                    if (
                      nextCategory !==
                      "Tobaski Sale"
                    ) {
                      setSheepRows(
                        (current) =>
                          current.map(
                            (row) => ({
                              ...row,

                              tobaskiStockId:
                                "",
                            })
                          )
                      );
                    }
                  }}
                  className={
                    inputClass
                  }
                >

                  <option value="Regular Sale">
                    Regular Sale
                  </option>

                  <option value="Tobaski Sale">
                    Tobaski Sale
                  </option>

                  <option value="Breeding Stock">
                    Breeding Stock
                  </option>

                  <option value="Other">
                    Other
                  </option>

                </select>

              </div>

              {sheepSaleCategory ===
                "Tobaski Sale" && (
                <div>

                  <Label>
                    Tobaski Season
                  </Label>

                  <select
                    value={
                      tobaskiSeasonId
                    }
                    onChange={(
                      event
                    ) => {
                      setTobaskiSeasonId(
                        event.target.value
                      );

                      setSheepRows(
                        (current) =>
                          current.map(
                            (row) => ({
                              ...row,

                              tobaskiStockId:
                                "",
                            })
                          )
                      );
                    }}
                    className={`${inputClass} border-emerald-300 bg-emerald-50 font-bold text-[#0b5136]`}
                  >

                    <option value="">
                      Select season
                    </option>

                    {tobaskiSeasons.map(
                      (season) => (
                        <option
                          key={
                            season.id
                          }
                          value={
                            season.id
                          }
                        >
                          {
                            season.season_name
                          }
                        </option>
                      )
                    )}

                  </select>

                </div>
              )}

            </div>

            {/* TOBASKI STOCK SUMMARY */}

            {sheepSaleCategory ===
              "Tobaski Sale" &&
              tobaskiSeasonId && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-emerald-700">
                        Tobaski Sheep Stock
                      </p>

                      <p className="mt-1 text-[14px] font-semibold text-slate-700">
                        Select the exact sheep being sold. Once sold, it will no longer appear as available.
                      </p>

                    </div>

                    {stockLoading ? (
                      <span className="inline-flex items-center gap-2 text-[13px] font-bold text-[#0b5136]">

                        <Loader2
                          size={16}
                          className="animate-spin"
                        />

                        Loading...

                      </span>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">

                        <SmallMetric
                          label="Available"
                          value={String(
                            stockOptions.length
                          )}
                        />

                        <SmallMetric
                          label="Selected"
                          value={String(
                            selectedStockIds.length
                          )}
                        />

                        <SmallMetric
                          label="Left"
                          value={String(
                            leftAfterSale
                          )}
                        />

                      </div>
                    )}

                  </div>

                  {stockError && (
                    <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700">
                      Unable to load Tobaski sheep stock: {stockError}
                    </p>
                  )}

                  {!stockLoading &&
                    !stockError &&
                    stockOptions.length ===
                      0 && (
                      <p className="mt-3 text-[13px] font-semibold text-amber-800">
                        No remaining sheep are available for this Tobaski season.
                      </p>
                    )}

                </div>
              )}

            <div className="mt-6 space-y-4">

              {sheepRows.map(
                (
                  row,
                  index
                ) => {
                  const automaticAge =
                    calculateAgeMonths(
                      row.dateOfBirth,
                      invoiceDate
                    );

                  return (
                    <div
                      key={
                        row.localId
                      }
                      className="rounded-2xl border border-slate-200 bg-[#f8faf9] p-4 sm:p-5"
                    >

                      <div className="mb-4 flex items-center justify-between">

                        <p className="font-bold text-slate-950">
                          Sheep{" "}
                          {index + 1}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            removeSheep(
                              row.localId
                            )
                          }
                          className={
                            removeButtonClass
                          }
                          aria-label="Remove sheep"
                        >

                          <Trash2
                            size={16}
                          />

                        </button>

                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

                        {sheepSaleCategory ===
                          "Tobaski Sale" && (
                          <div className="sm:col-span-2 xl:col-span-3">

                            <Label>
                              Tobaski Sheep
                            </Label>

                            <select
                              value={
                                row.tobaskiStockId
                              }
                              onChange={(
                                event
                              ) =>
                                selectTobaskiStock(
                                  row.localId,
                                  event.target.value
                                )
                              }
                              disabled={
                                !tobaskiSeasonId ||
                                stockLoading
                              }
                              className={`${inputClass} border-emerald-300 font-bold text-[#0b5136] disabled:bg-slate-100 disabled:text-slate-500`}
                            >

                              <option value="">
                                Select sheep from Tobaski stock
                              </option>

                              {stockOptions.map(
                                (stock) => {
                                  const alreadySelected =
                                    selectedStockSet.has(
                                      stock.id
                                    ) &&
                                    row.tobaskiStockId !==
                                      stock.id;

                                  const details =
                                    [
                                      stock.sheep_tag
                                        ? `Tag ${stock.sheep_tag}`
                                        : null,

                                      stock.sheep_name,

                                      stock.breed_type,
                                    ]
                                      .filter(Boolean)
                                      .join(" ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· ");

                                  return (
                                    <option
                                      key={
                                        stock.id
                                      }
                                      value={
                                        stock.id
                                      }
                                      disabled={
                                        alreadySelected
                                      }
                                    >
                                      {
                                        stock.stock_number
                                      }
                                      {details
                                        ? ` ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ${details}`
                                        : ""}
                                      {alreadySelected
                                        ? " ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â already selected"
                                        : ""}
                                    </option>
                                  );
                                }
                              )}

                            </select>

                            <p className="mt-2 text-[12px] text-slate-500">
                              Selecting a stock sheep fills any name, tag, breed or sex already recorded.
                            </p>

                          </div>
                        )}

                        <Field
                          label="Sheep Name"
                          value={
                            row.sheepName
                          }
                          placeholder="Optional"
                          onChange={(
                            value
                          ) =>
                            updateSheep(
                              row.localId,
                              "sheepName",
                              value
                            )
                          }
                        />

                        <Field
                          label="Tag / ID"
                          value={
                            row.sheepTag
                          }
                          placeholder="Optional"
                          onChange={(
                            value
                          ) =>
                            updateSheep(
                              row.localId,
                              "sheepTag",
                              value
                            )
                          }
                        />

                        <div className="hidden">

                          <Label>
                            Breed / Type
                          </Label>

                          <select
                            value={
                              row.breedType
                            }
                            onChange={(
                              event
                            ) =>
                              updateSheep(
                                row.localId,
                                "breedType",
                                event.target.value
                              )
                            }
                            className={
                              inputClass
                            }
                          >

                            <option value="">
                              Select
                            </option>

                            <option value="Ladoum">
                              Ladoum
                            </option>

                            <option value="Cross Breed">
                              Cross Breed
                            </option>

                            <option value="Local Breed">
                              Local Breed
                            </option>

                            <option value="Other">
                              Other
                            </option>

                          </select>

                        </div>

                        <div className="hidden">

                          <Label>
                            Sex
                          </Label>

                          <select
                            value={
                              row.sex
                            }
                            onChange={(
                              event
                            ) =>
                              updateSheep(
                                row.localId,
                                "sex",
                                event.target.value
                              )
                            }
                            className={
                              inputClass
                            }
                          >

                            <option value="">
                              Select
                            </option>

                            <option value="male">
                              Male
                            </option>

                            <option value="female">
                              Female
                            </option>

                          </select>

                        </div>

                        <div className="hidden">

                          <Label>
                            Date of Birth
                          </Label>

                          <input
                            type="date"
                            max={
                              invoiceDate
                            }
                            value={
                              row.dateOfBirth
                            }
                            onChange={(
                              event
                            ) =>
                              updateSheep(
                                row.localId,
                                "dateOfBirth",
                                event.target.value
                              )
                            }
                            className={
                              inputClass
                            }
                          />

                        </div>

                        <div className="hidden">

                          <Label>
                            Age at Sale
                          </Label>

                          {automaticAge !==
                          null ? (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[14px] font-bold text-emerald-800">
                              {automaticAge} months
                            </div>
                          ) : (
                            <input
                              type="number"
                              onWheel={(event) => event.currentTarget.blur()}
                              min="0"
                              value={
                                row.ageMonths
                              }
                              onChange={(
                                event
                              ) =>
                                updateSheep(
                                  row.localId,
                                  "ageMonths",
                                  event.target.value
                                )
                              }
                              placeholder="Age in months"
                              className={
                                inputClass
                              }
                            />
                          )}

                        </div>

                        <div>

                          <Label>
                            Sale Price
                          </Label>

                          <div className="relative">

                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-slate-500">
                              GMD
                            </span>

                            <input
                              type="number"
                              onWheel={(event) => event.currentTarget.blur()}
                              min="0"
                              step="0.01"
                              value={
                                row.salePrice
                              }
                              onChange={(
                                event
                              ) =>
                                updateSheep(
                                  row.localId,
                                  "salePrice",
                                  event.target.value
                                )
                              }
                              className={`${inputClass} pl-14`}
                            />

                          </div>

                        </div>

                        <div className="sm:col-span-2 xl:col-span-3">
</div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </Section>
        ) : (
          /* ==================================================
             PRODUCTS / SERVICES / OTHER
          ================================================== */

          <Section
            eyebrow={
              invoiceTypeName(
                invoiceType
              )
            }
            title={
              invoiceType ===
              "product_sale"
                ? "Farm Products"
                : invoiceType ===
                  "service"
                ? "Consultancy / Services"
                : "Other"
            }
            icon={
              invoiceType ===
              "service" ? (
                <Wrench
                  size={18}
                />
              ) : (
                <Package
                  size={18}
                />
              )
            }
            className="mt-5"
            action={
              <button
                type="button"
                onClick={() =>
                  setItemRows(
                    (current) => [
                      ...current,

                      invoiceType ===
                      "service"
                        ? {
                            ...emptyItem(),
                            unit:
                              "Service",
                          }
                        : emptyItem(),
                    ]
                  )
                }
                className={
                  primaryButtonClass
                }
              >

                <Plus
                  size={17}
                />

                Add{" "}
                {invoiceType ===
                "service"
                  ? "Service"
                  : invoiceType ===
                    "product_sale"
                  ? "Product"
                  : "Item"}

              </button>
            }
          >

            <div className="space-y-4">

              {itemRows.map(
                (
                  row,
                  index
                ) => {
                  const lineTotal =
                    (Number(
                      row.quantity
                    ) || 0) *
                    (Number(
                      row.unitPrice
                    ) || 0);

                  return (
                    <div
                      key={
                        row.localId
                      }
                      className="rounded-2xl border border-slate-200 bg-[#f8faf9] p-4"
                    >

                      <div className="mb-4 flex items-center justify-between">

                        <p className="font-bold text-slate-950">
                          {invoiceType ===
                          "service"
                            ? "Service"
                            : "Item"}{" "}
                          {index + 1}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            removeItem(
                              row.localId
                            )
                          }
                          className={
                            removeButtonClass
                          }
                        >

                          <Trash2
                            size={16}
                          />

                        </button>

                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.7fr_0.6fr_0.8fr_1fr_1fr]">

                        <Field
                          label="Description"
                          value={
                            row.description
                          }
                          placeholder={
                            invoiceType ===
                            "product_sale"
                              ? "e.g. Hay, Maize, Feed"
                              : invoiceType ===
                                "service"
                              ? "e.g. Farm Consultancy"
                              : "Describe item or service"
                          }
                          onChange={(
                            value
                          ) =>
                            updateItem(
                              row.localId,
                              "description",
                              value
                            )
                          }
                        />

                        <Field
                          label="Quantity"
                          type="number"
                          value={
                            row.quantity
                          }
                          onChange={(
                            value
                          ) =>
                            updateItem(
                              row.localId,
                              "quantity",
                              value
                            )
                          }
                        />

                        <Field
                          label="Unit"
                          value={
                            row.unit
                          }
                          placeholder={
                            invoiceType ===
                            "service"
                              ? "Service"
                              : "Bag, Bale, Kg, Piece"
                          }
                          onChange={(
                            value
                          ) =>
                            updateItem(
                              row.localId,
                              "unit",
                              value
                            )
                          }
                        />

                        <Field
                          label="Unit Price"
                          type="number"
                          value={
                            row.unitPrice
                          }
                          onChange={(
                            value
                          ) =>
                            updateItem(
                              row.localId,
                              "unitPrice",
                              value
                            )
                          }
                        />

                        <div>

                          <Label>
                            Amount
                          </Label>

                          <div className="flex min-h-[46px] items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-[14px] font-bold text-[#0b5136]">
                            {money(
                              lineTotal
                            )}
                          </div>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </Section>
        )}

        {/* ====================================================
            NOTE + SUMMARY
        ==================================================== */}

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_390px]">

          <div className="rounded-[26px] border border-white/90 bg-white p-5 shadow-sm sm:p-6">

            <Label>
              Note
            </Label>

            <textarea
              rows={5}
              value={notes}
              onChange={(
                event
              ) =>
                setNotes(
                  event.target.value
                )
              }
              placeholder="Optional"
              className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-[15px] font-medium text-slate-800 outline-none focus:border-emerald-600"
            />

            {invoiceType ===
              "sheep_sale" && (
                <div className="hidden">

                  <SmallMetric
                    label="Sheep"
                    value={String(
                      sheepRows.length
                    )}
                  />

                  <SmallMetric
                    label="Male"
                    value={String(
                      maleCount
                    )}
                  />

                  <SmallMetric
                    label="Female"
                    value={String(
                      femaleCount
                    )}
                  />

                </div>
              )}

          </div>

          <div className="rounded-[26px] bg-gradient-to-br from-[#0b5136] to-[#073523] p-5 text-white shadow-sm sm:p-6">

            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-100">
              {isDirectReceipt ? "Receipt Summary" : "Invoice Summary"}
            </p>

            <p className="mt-1 text-[14px] font-semibold text-emerald-50">
              {invoiceTypeName(
                invoiceType
              )}
            </p>

            {invoiceType ===
              "sheep_sale" &&
              sheepSaleCategory ===
                "Tobaski Sale" && (
                <p className="mt-2 text-[13px] font-semibold text-emerald-100">
                  {
                    tobaskiSeasons.find(
                      (season) =>
                        season.id ===
                        tobaskiSeasonId
                    )
                      ?.season_name ??
                    "Tobaski season not selected"
                  }
                </p>
              )}

            <div className="mt-6 space-y-4">

              <SummaryRow
                label="Subtotal"
                value={
                  money(
                    subtotal
                  )
                }
              />

              <div>

                <Label light>
                  Discount Amount
                </Label>

                <input
                  type="number"
                              onWheel={(event) => event.currentTarget.blur()}
                  min="0"
                  step="0.01"
                  value={
                    discount
                  }
                  onChange={(
                    event
                  ) =>
                    setDiscount(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-[14px] font-bold text-white outline-none"
                />

              </div>

              <div className="border-t border-white/20 pt-4">

                <SummaryRow
                  label="Total"
                  value={
                    money(
                      totalAmount
                    )
                  }
                />

              </div>

              {mode ===
                "edit" && (
                <>

                  <SummaryRow
                    label="Paid"
                    value={
                      money(
                        originalAmountPaid
                      )
                    }
                  />

                  <SummaryRow
                    label="Balance"
                    value={
                      money(
                        Math.max(
                          totalAmount -
                            originalAmountPaid,
                          0
                        )
                      )
                    }
                  />

                </>
              )}

            </div>

          </div>

        </section>

        {/* ====================================================
            PAYMENT
        ==================================================== */}

        {mode ===
          "create" && (
            <Section
              eyebrow="Payment"
              title={
                isDirectReceipt
                  ? "Payment Details"
                  : "Payment Received Now"
              }
              icon={
                <Wallet
                  size={18}
                />
              }
              className="mt-5"
            >

              <p className="mb-5 text-[14px] text-slate-600">
                Optional. Leave the amount at 0 if the customer has not paid yet.
              </p>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                {isDirectReceipt ? (
                  <div>
                    <Label>Amount Received (GMD)</Label>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-[17px] font-black text-[#0b5136]">
                      {money(totalAmount)}
                    </div>
                  </div>
                ) : (
                  <Field
                    label="Amount Received (GMD)"
                    type="number"
                    value={paymentAmount}
                    onChange={setPaymentAmount}
                  />
                )}

                <div>

                  <Label>
                    Received Into
                  </Label>

                  <select
                    value={
                      paymentAccountId
                    }
                    onChange={(
                      event
                    ) =>
                      setPaymentAccountId(
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  >

                    <option value="">
                      Select account
                    </option>

                    {accounts
                      .filter(
                        (account) =>
                          account.active !==
                          false
                      )
                      .map(
                        (account) => (
                          <option
                            key={
                              account.id
                            }
                            value={
                              account.id
                            }
                          >
                            {
                              account.name
                            }
                          </option>
                        )
                      )}

                  </select>

                </div>

                <div>

                  <Label>
                    Payment Date
                  </Label>

                  <input
                    type="date"
                    value={
                      paymentDate
                    }
                    onChange={(
                      event
                    ) =>
                      setPaymentDate(
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />

                </div>
</div>

            </Section>
          )}

        {/* ====================================================
            ACTIONS
        ==================================================== */}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">

          <Link
            href={
              mode ===
                "edit" &&
              invoiceId
                ? `/invoices/${invoiceId}`
                : "/invoices"
            }
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-[14px] font-bold text-slate-700"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b5136] px-6 py-3.5 text-[15px] font-bold text-white disabled:opacity-60"
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

                {mode ===
                "create"
                  ? isDirectReceipt
                    ? "Issue Receipt"
                    : "Save Invoice"
                  : "Save Changes"}
              </>
            )}

          </button>

        </div>

      </form>

    </FinancePageShell>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[14px] font-semibold text-slate-800 outline-none focus:border-emerald-600";

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b5136] px-4 py-3 text-[14px] font-bold text-white";

const removeButtonClass =
  "flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600";

function Section({
  eyebrow,
  title,
  icon,
  action,
  className = "",
  children,
}: {
  eyebrow: string;
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`${className} rounded-[26px] border border-white/90 bg-white p-5 shadow-sm sm:p-6`}
    >

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-700">
            {icon}
            {eyebrow}
          </div>

          <h2 className="mt-1 text-[22px] font-bold text-slate-950">
            {title}
          </h2>

        </div>

        {action}

      </div>

      {children}

    </section>
  );
}

function Label({
  children,
  light = false,
}: {
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <label
      className={`mb-2 block text-[13px] font-bold ${
        light
          ? "text-emerald-100"
          : "text-slate-700"
      }`}
    >
      {children}
    </label>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-3 text-[14px] font-bold ${
        active
          ? "bg-[#0b5136] text-white"
          : "border border-slate-300 bg-white text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>

      <Label>
        {label}
      </Label>

      <input
        type={type}
        min={
          type === "number"
            ? "0"
            : undefined
        }
        step={
          type === "number"
            ? "0.01"
            : undefined
        }
        value={value}
        onWheel={(event) => {
          if (type === "number") {
            event.currentTarget.blur();
          }
        }}
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        className={
          inputClass
        }
      />

    </div>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/80 p-3 text-center">

      <p className="text-[10px] font-bold uppercase text-emerald-700">
        {label}
      </p>

      <p className="mt-1 text-[20px] font-black text-[#0b5136]">
        {value}
      </p>

    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">

      <span className="text-[14px] font-semibold text-emerald-50">
        {label}
      </span>

      <span className="text-[15px] font-bold text-white">
        {value}
      </span>

    </div>
  );
}


