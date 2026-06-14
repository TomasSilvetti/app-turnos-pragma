import { Extension } from "@tiptap/core";
import Suggestion, {
  type SuggestionProps,
  type SuggestionKeyDownProps,
} from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import { PluginKey } from "@tiptap/pm/state";
import type { RefAttributes } from "react";
import { SlashMenu, SLASH_ITEMS, type SlashItem, type SlashMenuRef, type SlashMenuProps } from "./SlashMenu";

export type SlashCommandType = SlashItem["id"];

type SlashOptions = {
  onCommand: (cmd: SlashCommandType) => void;
};

const slashKey = new PluginKey("slashCommands");

// Posiciona el popup del menú usando coordenadas de documento (scroll incluido),
// para que funcione con `position: absolute` dentro del contenedor de la app.
function ubicarPopup(popup: HTMLElement, rect: DOMRect | null) {
  if (!rect) return;
  popup.style.top = `${rect.bottom + window.scrollY + 6}px`;
  popup.style.left = `${rect.left + window.scrollX}px`;
}

// El menú se monta dentro de `.notas-app` para heredar el tema (variables CSS y
// la clase `dark`); cae a `body` si por algún motivo no existe el contenedor.
function contenedorMenu(): HTMLElement {
  return (document.querySelector(".notas-app") as HTMLElement) ?? document.body;
}

function renderSlashMenu() {
  let component:
    | ReactRenderer<SlashMenuRef, SlashMenuProps & RefAttributes<SlashMenuRef>>
    | null = null;
  let popup: HTMLElement | null = null;

  return {
    onStart: (props: SuggestionProps<SlashItem, SlashItem>) => {
      const renderer = new ReactRenderer(SlashMenu, { props, editor: props.editor });
      component = renderer;
      popup = document.createElement("div");
      popup.style.position = "absolute";
      popup.style.zIndex = "130";
      popup.appendChild(renderer.element);
      contenedorMenu().appendChild(popup);
      ubicarPopup(popup, props.clientRect?.() ?? null);
    },
    onUpdate: (props: SuggestionProps<SlashItem, SlashItem>) => {
      component?.updateProps(props);
      if (popup) ubicarPopup(popup, props.clientRect?.() ?? null);
    },
    onKeyDown: (props: SuggestionKeyDownProps) => {
      if (props.event.key === "Escape") {
        popup?.remove();
        return true;
      }
      return component?.ref?.onKeyDown(props.event) ?? false;
    },
    onExit: () => {
      popup?.remove();
      component?.destroy();
      popup = null;
      component = null;
    },
  };
}

// Menú de comandos: al escribir "/" aparece un dropdown con las acciones
// disponibles (recordatorio, progreso). Reemplaza el viejo InputRule que sólo
// disparaba al tipear el comando completo.
export const SlashCommands = Extension.create<SlashOptions>({
  name: "slashCommands",

  addOptions() {
    return { onCommand: () => {} };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        pluginKey: slashKey,
        char: "/",
        startOfLine: false,
        allowSpaces: false,
        items: ({ query }) => {
          const q = query.trim().toLowerCase();
          if (!q) return SLASH_ITEMS;
          return SLASH_ITEMS.filter(
            (item) =>
              item.title.toLowerCase().includes(q) ||
              item.keywords.some((k) => k.includes(q)),
          );
        },
        command: ({ editor, range, props }) => {
          // Borrar el "/comando" escrito y abrir el modal correspondiente.
          editor.chain().focus().deleteRange(range).run();
          this.options.onCommand(props.id);
        },
        render: renderSlashMenu,
      }),
    ];
  },
});
