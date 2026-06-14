import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Clock } from "lucide-react";

// index por getDay(): 0=Domingo ... 6=Sábado
const DIAS = ["D", "L", "M", "X", "J", "V", "S"];

export type ReminderChipOptions = { onEdit: (reminderId: string) => void };

function ReminderChipView({ node, extension }: NodeViewProps) {
  const reminderId = node.attrs.reminderId as string | null;
  const time = (node.attrs.time as string) || "";
  const days = (node.attrs.days as number[]) || [];
  const onEdit = (extension.options as ReminderChipOptions).onEdit;

  const etiquetaDias = days.length
    ? [...days].sort((a, b) => a - b).map((d) => DIAS[d]).join(" ")
    : "una vez";

  return (
    <NodeViewWrapper as="span" className="inline-flex align-baseline" id={`reminder-${reminderId ?? ""}`}>
      <button
        type="button"
        contentEditable={false}
        onClick={() => reminderId && onEdit(reminderId)}
        className="mx-0.5 inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/15 px-2 py-0.5 align-middle text-xs font-medium text-amber-700 transition-colors hover:bg-amber-400/25 dark:text-amber-300"
        title="Editar recordatorio"
      >
        <Clock className="size-3.5" />
        <span className="font-mono">{time}</span>
        <span className="opacity-70">· {etiquetaDias}</span>
      </button>
    </NodeViewWrapper>
  );
}

export const ReminderChip = Node.create<ReminderChipOptions>({
  name: "reminderChip",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { onEdit: () => {} };
  },

  addAttributes() {
    return {
      reminderId: { default: null },
      time: { default: "" },
      days: { default: [] as number[] },
      text: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-reminder-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        { "data-reminder-id": HTMLAttributes.reminderId, "data-time": HTMLAttributes.time },
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ReminderChipView);
  },
});
