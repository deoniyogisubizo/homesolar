"use client";

import { useRef, useState } from "react";
import { Bold, Italic, Link2, List, ListOrdered } from "lucide-react";
import { sanitizeRichText } from "@/lib/sanitize";

type Command = {
  label: string;
  icon: React.ReactNode;
  before: string;
  after: string;
  block?: boolean;
};

const commands: Command[] = [
  { label: "Bold", icon: <Bold className="h-3.5 w-3.5" />, before: "<strong>", after: "</strong>" },
  { label: "Italic", icon: <Italic className="h-3.5 w-3.5" />, before: "<em>", after: "</em>" },
  {
    label: "Link",
    icon: <Link2 className="h-3.5 w-3.5" />,
    before: '<a href="https://">',
    after: "</a>",
  },
  {
    label: "Bulleted list",
    icon: <List className="h-3.5 w-3.5" />,
    before: "<ul>\n<li>",
    after: "</li>\n</ul>",
    block: true,
  },
  {
    label: "Numbered list",
    icon: <ListOrdered className="h-3.5 w-3.5" />,
    before: "<ol>\n<li>",
    after: "</li>\n</ol>",
    block: true,
  },
];

export function RichTextEditor({
  value,
  onChange,
  id,
  label = "Content",
  hint = "Basic formatting is allowed. Scripts, styles and embedded frames are removed on save.",
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label?: string;
  hint?: string;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const insert = (command: Command) => {
    const element = textarea.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = value.slice(start, end) || (command.block ? "List item" : "Text");
    const next = `${value.slice(0, start)}${command.before}${selected}${command.after}${value.slice(end)}`;
    onChange(next);
    window.requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + command.before.length, start + command.before.length + selected.length);
    });
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="admin-label mb-0" htmlFor={id}>
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowPreview((current) => !current)}
          className="text-[12px] font-medium text-brand-deep hover:underline"
        >
          {showPreview ? "Edit HTML" : "Preview"}
        </button>
      </div>
      {showPreview ? (
        <div
          className="rich-text min-h-[180px] rounded-[6px] border border-admin-line bg-white px-3 py-2"
          dangerouslySetInnerHTML={{
            __html: value
              ? sanitizeRichText(value)
              : "<p class=\"text-admin-muted\">Nothing to preview.</p>",
          }}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1 rounded-t-[6px] border border-b-0 border-admin-line bg-tile px-2 py-1.5">
            {commands.map((command) => (
              <button
                key={command.label}
                type="button"
                onClick={() => insert(command)}
                title={command.label}
                aria-label={command.label}
                className="rounded-[4px] p-1.5 text-admin-muted hover:bg-white hover:text-ink"
              >
                {command.icon}
              </button>
            ))}
          </div>
          <textarea
            ref={textarea}
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="admin-field admin-textarea rounded-t-none font-mono text-[12px]"
            spellCheck={false}
          />
        </>
      )}
      <p className="admin-help">{hint}</p>
    </div>
  );
}
