"use client";

import { type Editor, useEditorState } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TEXT_COLORS } from "./editor/colors";

function Btn({
  active,
  onClick,
  children,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-md transition-colors [&_svg]:size-4",
        active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

export function EditorToolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      color: e.getAttributes("textStyle").color as string | undefined,
    }),
  });

  const sep = <span className="mx-1 h-5 w-px bg-border" />;

  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center gap-0.5 rounded-t-xl border-b border-border bg-card px-2 py-1.5 shadow-sm">
      <Btn label="Negrita" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold />
      </Btn>
      <Btn label="Itálica" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic />
      </Btn>
      <Btn label="Subrayado" active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <Underline />
      </Btn>
      <Btn label="Tachado" active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough />
      </Btn>
      {sep}
      <Btn label="Título 1" active={state.h1} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 />
      </Btn>
      <Btn label="Título 2" active={state.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 />
      </Btn>
      <Btn label="Lista" active={state.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List />
      </Btn>
      <Btn label="Lista numerada" active={state.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered />
      </Btn>
      {sep}
      {/* Colores de texto: rojo, verde, azul — siempre a mano */}
      {TEXT_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().setColor(c.value).run()}
          aria-label={`Color ${c.name}`}
          title={c.name}
          className={cn(
            "flex size-8 items-center justify-center rounded-md transition-colors hover:bg-muted",
            state.color === c.value && "ring-2 ring-offset-1 ring-offset-card"
          )}
          style={state.color === c.value ? ({ ["--tw-ring-color" as string]: c.value }) : undefined}
        >
          <span className="size-4 rounded-full" style={{ backgroundColor: c.value }} />
        </button>
      ))}
      <Btn label="Quitar color" onClick={() => editor.chain().focus().unsetColor().run()}>
        <Ban />
      </Btn>
    </div>
  );
}
