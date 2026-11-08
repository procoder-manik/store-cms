"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Bold, Heading2, Heading3, Italic, LinkIcon, List, ListOrdered, Quote, Redo, Undo } from "lucide-react";
import { cn } from "@/lib/utils";

/** Minimal rich text editor for descriptions. Output is sanitised on the server before saving. */
export function RichText({ value, onChange, placeholder }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] } }), Link.configure({ openOnClick: false })],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose-admin min-h-48 px-4 py-3 outline-none text-[15px] leading-relaxed [&_h2]:text-[20px] [&_h2]:font-semibold [&_h3]:text-[17px] [&_h3]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_p]:my-2 [&_a]:text-accent [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-3",
        "aria-label": placeholder ?? "Description",
      },
    },
  });
  if (!editor) return <div className="h-60 rounded-[12px] bg-fill" />;

  const btn = (active: boolean) => cn("flex h-8 w-8 items-center justify-center rounded-[8px]", active ? "bg-surface text-accent shadow-card" : "text-fg-muted hover:text-fg");
  const tools = [
    { icon: Bold, run: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), label: "Bold" },
    { icon: Italic, run: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), label: "Italic" },
    { icon: Heading2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }), label: "Heading" },
    { icon: Heading3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }), label: "Subheading" },
    { icon: List, run: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), label: "Bullet list" },
    { icon: ListOrdered, run: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), label: "Numbered list" },
    { icon: Quote, run: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), label: "Quote" },
    { icon: LinkIcon, run: () => {
        const url = prompt("Link URL", editor.getAttributes("link").href ?? "https://");
        if (url === null) return;
        if (url === "") editor.chain().focus().unsetLink().run();
        else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      }, active: editor.isActive("link"), label: "Link" },
    { icon: Undo, run: () => editor.chain().focus().undo().run(), active: false, label: "Undo" },
    { icon: Redo, run: () => editor.chain().focus().redo().run(), active: false, label: "Redo" },
  ];
  return (
    <div className="overflow-hidden rounded-[12px] bg-fill focus-within:ring-2 focus-within:ring-accent">
      <div className="flex flex-wrap gap-0.5 border-b border-line p-1.5">
        {tools.map(({ icon: Icon, run, active, label }) => (
          <button key={label} type="button" onClick={run} className={btn(active)} aria-label={label} title={label}><Icon className="h-4 w-4" /></button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
