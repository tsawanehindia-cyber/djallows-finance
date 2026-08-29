"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  Eraser,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Redo2,
  Save,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";

import FinancePageShell from "@/components/FinancePageShell";
import { supabase } from "@/lib/supabase";

const RICH_TEXT_PREFIX =
  "__DJALLOWS_RICH_TEXT_V1__";

function today() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function sanitizeRichText(
  html: string
) {
  const parser =
    new DOMParser();

  const doc =
    parser.parseFromString(
      `<div id="editor-root">${html}</div>`,
      "text/html"
    );

  const root =
    doc.getElementById(
      "editor-root"
    );

  if (!root) {
    return "";
  }

  const blocked = [
    "script",
    "iframe",
    "object",
    "embed",
    "style",
    "link",
    "meta",
    "form",
    "input",
    "button",
    "textarea",
  ];

  root
    .querySelectorAll(
      blocked.join(",")
    )
    .forEach((node) => {
      node.remove();
    });

  root
    .querySelectorAll("*")
    .forEach((element) => {
      const attrs =
        Array.from(
          element.attributes
        );

      attrs.forEach(
        (attr) => {
          const name =
            attr.name.toLowerCase();

          if (
            name.startsWith(
              "on"
            )
          ) {
            element.removeAttribute(
              attr.name
            );

            return;
          }

          const allowed =
            name === "style" ||
            name === "face" ||
            name === "size" ||
            name === "color";

          if (!allowed) {
            element.removeAttribute(
              attr.name
            );
          }
        }
      );

      const style =
        element.getAttribute(
          "style"
        );

      if (style) {
        const allowedProperties =
          new Set([
            "text-align",
            "font-family",
            "font-size",
            "font-weight",
            "font-style",
            "text-decoration",
            "color",
            "margin-left",
          ]);

        const safeStyle =
          style
            .split(";")
            .map((part) =>
              part.trim()
            )
            .filter(Boolean)
            .filter((part) => {
              const property =
                part
                  .split(":")[0]
                  ?.trim()
                  .toLowerCase();

              return (
                property &&
                allowedProperties.has(
                  property
                )
              );
            })
            .join("; ");

        if (safeStyle) {
          element.setAttribute(
            "style",
            safeStyle
          );
        } else {
          element.removeAttribute(
            "style"
          );
        }
      }
    });

  return root.innerHTML.trim();
}

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(
        event
      ) => {
        event.preventDefault();
      }}
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-[#17488f] hover:bg-blue-50 hover:text-[#17488f]"
    >
      {children}
    </button>
  );
}

export default function NewConsultationPage() {
  const router =
    useRouter();

  const editorRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [
    businessId,
    setBusinessId,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    to,
    setTo,
  ] = useState("");

  const [
    location,
    setLocation,
  ] = useState("");

  const [
    subject,
    setSubject,
  ] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        const {
          data: {
            session,
          },
        } =
          await supabase.auth
            .getSession();

        if (!session) {
          router.replace(
            "/login"
          );

          return;
        }

        const {
          data:
            membership,
          error:
            membershipError,
        } =
          await supabase
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
          !membership
        ) {
          throw new Error(
            "Unable to find your business access."
          );
        }

        if (!active) {
          return;
        }

        setBusinessId(
          membership.business_id
        );

        setLoading(false);
      } catch (
        loadError
      ) {
        if (active) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load the page."
          );

          setLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      active = false;
    };
  }, [router]);

  function focusEditor() {
    editorRef.current?.focus();
  }

  function runCommand(
    command: string,
    value?: string
  ) {
    focusEditor();

    document.execCommand(
      command,
      false,
      value
    );
  }

  function setBlock(
    value: string
  ) {
    runCommand(
      "formatBlock",
      value
    );
  }

  function setFont(
    value: string
  ) {
    if (!value) {
      return;
    }

    runCommand(
      "fontName",
      value
    );
  }

  function setFontSize(
    value: string
  ) {
    if (!value) {
      return;
    }

    runCommand(
      "fontSize",
      value
    );
  }

  function setColour(
    value: string
  ) {
    runCommand(
      "foreColor",
      value
    );
  }

  async function saveAdvisory(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const rawHtml =
      editorRef.current
        ?.innerHTML ?? "";

    const plainText =
      editorRef.current
        ?.innerText
        ?.trim() ?? "";

    if (!to.trim()) {
      setError(
        "Please enter who the advisory is for."
      );

      return;
    }

    if (!subject.trim()) {
      setError(
        "Please enter the subject."
      );

      return;
    }

    if (!plainText) {
      setError(
        "Please enter the consultation recommendations."
      );

      return;
    }

    try {
      setSaving(true);

      const {
        data: {
          session,
        },
      } =
        await supabase.auth
          .getSession();

      if (!session) {
        router.replace(
          "/login"
        );

        return;
      }

      const advisoryDate =
        today();

      const year =
        Number(
          advisoryDate.slice(
            0,
            4
          )
        );

      const {
        data:
          reference,
        error:
          numberError,
      } =
        await supabase.rpc(
          "next_advisory_number",
          {
            p_business_id:
              businessId,

            p_year:
              year,
          }
        );

      if (
        numberError ||
        !reference
      ) {
        throw new Error(
          numberError?.message ||
            "Unable to generate advisory reference."
        );
      }

      const safeHtml =
        sanitizeRichText(
          rawHtml
        );

      const storedTerms =
        `${RICH_TEXT_PREFIX}${safeHtml}`;

      const {
        data:
          created,
        error:
          insertError,
      } =
        await supabase
          .from(
            "contracts"
          )
          .insert({
            business_id:
              businessId,

            contract_number:
              reference,

            contract_type:
              "consultancy",

            title:
              subject.trim(),

            party_name:
              to.trim(),

            party_address:
              location.trim() ||
              null,

            contract_date:
              advisoryDate,

            terms:
              storedTerms,

            status:
              "active",

            created_by:
              session.user.id,
          })
          .select(
            "id"
          )
          .single();

      if (
        insertError ||
        !created
      ) {
        throw new Error(
          insertError?.message ||
            "Unable to save consultation."
        );
      }

      router.push(
        `/consultations/${created.id}`
      );

      router.refresh();

    } catch (
      saveError
    ) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "Unable to save consultation."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#edf3ef]">

        <Loader2
          size={32}
          className="animate-spin text-[#17488f]"
        />

      </main>
    );
  }

  return (
    <FinancePageShell
      eyebrow="Consultation & Advisory"
      title="New Consultation Advisory"
      description="Prepare an official recommendation letter following a consultation or farm visit."
    >

      <form
        onSubmit={
          saveAdvisory
        }
        className="space-y-6"
      >

        <Link
          href="/consultations"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#17488f]"
        >

          <ArrowLeft
            size={16}
          />

          Back to Consultation & Advisory

        </Link>


        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">

            {error}

          </div>
        )}


        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="grid gap-5 md:grid-cols-2">

            {/* TO */}

            <label className="grid gap-2">

              <span className="text-sm font-bold text-slate-700">

                To

              </span>

              <input
                value={to}
                onChange={(
                  event
                ) =>
                  setTo(
                    event.target.value
                  )
                }
                placeholder="Example: Mr Jaiteh"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#17488f]"
              />

            </label>


            {/* LOCATION */}

            <label className="grid gap-2">

              <span className="text-sm font-bold text-slate-700">

                Location

              </span>

              <input
                value={
                  location
                }
                onChange={(
                  event
                ) =>
                  setLocation(
                    event.target.value
                  )
                }
                placeholder="Example: Tujereng"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#17488f]"
              />

            </label>


            {/* SUBJECT */}

            <label className="grid gap-2 md:col-span-2">

              <span className="text-sm font-bold text-slate-700">

                Subject

              </span>

              <input
                value={
                  subject
                }
                onChange={(
                  event
                ) =>
                  setSubject(
                    event.target.value
                  )
                }
                placeholder="Enter the subject of the consultation"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#17488f]"
              />

            </label>


            {/* =================================================
                RICH TEXT DOCUMENT EDITOR
            ================================================= */}

            <div className="md:col-span-2">

              <div className="mb-2 flex items-center justify-between gap-3">

                <span className="text-sm font-bold text-slate-700">

                  Consultation / Recommendations

                </span>

                <span className="text-xs font-medium text-slate-400">

                  Format the document as required

                </span>

              </div>


              <div className="overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-[#17488f] focus-within:ring-1 focus-within:ring-[#17488f]/20">

                {/* =============================================
                    TOOLBAR
                ============================================= */}

                <div className="border-b border-slate-200 bg-slate-50 p-2.5">

                  <div className="flex flex-wrap items-center gap-2">


                    {/* FONT */}

                    <select
                      defaultValue=""
                      title="Font"
                      onChange={(
                        event
                      ) => {
                        setFont(
                          event.target.value
                        );

                        event.target.value =
                          "";
                      }}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none"
                    >

                      <option value="">

                        Font

                      </option>

                      <option value="Arial">

                        Arial

                      </option>

                      <option value="Georgia">

                        Georgia

                      </option>

                      <option value="Times New Roman">

                        Times New Roman

                      </option>

                      <option value="Verdana">

                        Verdana

                      </option>

                      <option value="Tahoma">

                        Tahoma

                      </option>

                      <option value="Courier New">

                        Courier New

                      </option>

                    </select>


                    {/* FONT SIZE */}

                    <select
                      defaultValue=""
                      title="Font size"
                      onChange={(
                        event
                      ) => {
                        setFontSize(
                          event.target.value
                        );

                        event.target.value =
                          "";
                      }}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none"
                    >

                      <option value="">

                        Size

                      </option>

                      <option value="1">

                        8

                      </option>

                      <option value="2">

                        10

                      </option>

                      <option value="3">

                        12

                      </option>

                      <option value="4">

                        14

                      </option>

                      <option value="5">

                        18

                      </option>

                      <option value="6">

                        24

                      </option>

                      <option value="7">

                        32

                      </option>

                    </select>


                    {/* PARAGRAPH STYLE */}

                    <select
                      defaultValue=""
                      title="Text style"
                      onChange={(
                        event
                      ) => {
                        setBlock(
                          event.target.value
                        );

                        event.target.value =
                          "";
                      }}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none"
                    >

                      <option value="">

                        Style

                      </option>

                      <option value="p">

                        Normal

                      </option>

                      <option value="h1">

                        Heading 1

                      </option>

                      <option value="h2">

                        Heading 2

                      </option>

                      <option value="h3">

                        Heading 3

                      </option>

                      <option value="blockquote">

                        Quote

                      </option>

                    </select>


                    <div className="mx-1 h-7 w-px bg-slate-300" />


                    {/* BOLD */}

                    <ToolbarButton
                      title="Bold"
                      onClick={() =>
                        runCommand(
                          "bold"
                        )
                      }
                    >

                      <Bold
                        size={16}
                      />

                    </ToolbarButton>


                    {/* ITALIC */}

                    <ToolbarButton
                      title="Italic"
                      onClick={() =>
                        runCommand(
                          "italic"
                        )
                      }
                    >

                      <Italic
                        size={16}
                      />

                    </ToolbarButton>


                    {/* UNDERLINE */}

                    <ToolbarButton
                      title="Underline"
                      onClick={() =>
                        runCommand(
                          "underline"
                        )
                      }
                    >

                      <Underline
                        size={16}
                      />

                    </ToolbarButton>


                    {/* STRIKE */}

                    <ToolbarButton
                      title="Strikethrough"
                      onClick={() =>
                        runCommand(
                          "strikeThrough"
                        )
                      }
                    >

                      <Strikethrough
                        size={16}
                      />

                    </ToolbarButton>


                    {/* TEXT COLOUR */}

                    <label
                      title="Text colour"
                      className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600"
                    >

                      A

                      <input
                        type="color"
                        defaultValue="#263548"
                        onChange={(
                          event
                        ) =>
                          setColour(
                            event.target.value
                          )
                        }
                        className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                      />

                    </label>


                    <div className="mx-1 h-7 w-px bg-slate-300" />


                    {/* ALIGN LEFT */}

                    <ToolbarButton
                      title="Align left"
                      onClick={() =>
                        runCommand(
                          "justifyLeft"
                        )
                      }
                    >

                      <AlignLeft
                        size={16}
                      />

                    </ToolbarButton>


                    {/* ALIGN CENTER */}

                    <ToolbarButton
                      title="Align centre"
                      onClick={() =>
                        runCommand(
                          "justifyCenter"
                        )
                      }
                    >

                      <AlignCenter
                        size={16}
                      />

                    </ToolbarButton>


                    {/* ALIGN RIGHT */}

                    <ToolbarButton
                      title="Align right"
                      onClick={() =>
                        runCommand(
                          "justifyRight"
                        )
                      }
                    >

                      <AlignRight
                        size={16}
                      />

                    </ToolbarButton>


                    {/* JUSTIFY */}

                    <ToolbarButton
                      title="Justify"
                      onClick={() =>
                        runCommand(
                          "justifyFull"
                        )
                      }
                    >

                      <AlignJustify
                        size={16}
                      />

                    </ToolbarButton>


                    <div className="mx-1 h-7 w-px bg-slate-300" />


                    {/* BULLET LIST */}

                    <ToolbarButton
                      title="Bullet list"
                      onClick={() =>
                        runCommand(
                          "insertUnorderedList"
                        )
                      }
                    >

                      <List
                        size={16}
                      />

                    </ToolbarButton>


                    {/* NUMBER LIST */}

                    <ToolbarButton
                      title="Numbered list"
                      onClick={() =>
                        runCommand(
                          "insertOrderedList"
                        )
                      }
                    >

                      <ListOrdered
                        size={16}
                      />

                    </ToolbarButton>


                    {/* OUTDENT */}

                    <ToolbarButton
                      title="Decrease indent"
                      onClick={() =>
                        runCommand(
                          "outdent"
                        )
                      }
                    >

                      <IndentDecrease
                        size={16}
                      />

                    </ToolbarButton>


                    {/* INDENT */}

                    <ToolbarButton
                      title="Increase indent"
                      onClick={() =>
                        runCommand(
                          "indent"
                        )
                      }
                    >

                      <IndentIncrease
                        size={16}
                      />

                    </ToolbarButton>


                    <div className="mx-1 h-7 w-px bg-slate-300" />


                    {/* UNDO */}

                    <ToolbarButton
                      title="Undo"
                      onClick={() =>
                        runCommand(
                          "undo"
                        )
                      }
                    >

                      <Undo2
                        size={16}
                      />

                    </ToolbarButton>


                    {/* REDO */}

                    <ToolbarButton
                      title="Redo"
                      onClick={() =>
                        runCommand(
                          "redo"
                        )
                      }
                    >

                      <Redo2
                        size={16}
                      />

                    </ToolbarButton>


                    {/* CLEAR FORMAT */}

                    <ToolbarButton
                      title="Clear formatting"
                      onClick={() =>
                        runCommand(
                          "removeFormat"
                        )
                      }
                    >

                      <Eraser
                        size={16}
                      />

                    </ToolbarButton>

                  </div>

                </div>


                {/* =============================================
                    WRITING AREA
                ============================================= */}

                <div
                  ref={
                    editorRef
                  }
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Write or paste the complete consultation recommendations here..."
                  className="
                    advisory-rich-editor
                    min-h-[520px]
                    w-full
                    bg-white
                    px-5
                    py-5
                    text-[15px]
                    leading-7
                    text-slate-800
                    outline-none
                  "
                />

              </div>


              <p className="mt-2 text-xs leading-5 text-slate-500">

                Select any text and use the toolbar to change its appearance. The same formatting will appear on the official printed advisory.

              </p>

            </div>

          </div>

        </section>


        <div className="flex justify-end gap-3">

          <Link
            href="/consultations"
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700"
          >

            Cancel

          </Link>


          <button
            type="submit"
            disabled={
              saving
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#17488f] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >

            {saving ? (

              <Loader2
                size={17}
                className="animate-spin"
              />

            ) : (

              <Save
                size={17}
              />

            )}


            {saving
              ? "Saving..."
              : "Save Advisory"}

          </button>

        </div>


        <style>{`

          .advisory-rich-editor:empty::before {
            content:
              attr(data-placeholder);

            color:
              #94a3b8;

            pointer-events:
              none;
          }

          .advisory-rich-editor h1 {
            font-size:
              2em;

            font-weight:
              800;

            line-height:
              1.25;

            margin:
              0.6em 0;
          }

          .advisory-rich-editor h2 {
            font-size:
              1.5em;

            font-weight:
              800;

            margin:
              0.6em 0;
          }

          .advisory-rich-editor h3 {
            font-size:
              1.25em;

            font-weight:
              700;

            margin:
              0.5em 0;
          }

          .advisory-rich-editor ul {
            list-style:
              disc;

            padding-left:
              28px;
          }

          .advisory-rich-editor ol {
            list-style:
              decimal;

            padding-left:
              28px;
          }

          .advisory-rich-editor blockquote {
            border-left:
              3px solid
              #17488f;

            padding-left:
              14px;

            color:
              #475569;

            font-style:
              italic;
          }

        `}</style>

      </form>

    </FinancePageShell>
  );
}
