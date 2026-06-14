import { Extension, InputRule } from "@tiptap/core";

export type SlashCommandType = "recordatorio" | "progreso";

type SlashOptions = {
  onCommand: (cmd: SlashCommandType) => void;
};

// Detecta cuando el usuario termina de escribir "/recordatorio" o "/progreso"
// y dispara el callback (abrir el modal correspondiente), borrando el comando.
export const SlashCommands = Extension.create<SlashOptions>({
  name: "slashCommands",

  addOptions() {
    return { onCommand: () => {} };
  },

  addInputRules() {
    const trigger = (cmd: SlashCommandType) => {
      // Diferir para no llamar setState de React dentro del dispatch de ProseMirror.
      setTimeout(() => this.options.onCommand(cmd), 0);
    };
    return [
      new InputRule({
        find: /\/recordatorio$/,
        handler: ({ range, chain }) => {
          chain().deleteRange(range).run();
          trigger("recordatorio");
        },
      }),
      new InputRule({
        find: /\/progreso$/,
        handler: ({ range, chain }) => {
          chain().deleteRange(range).run();
          trigger("progreso");
        },
      }),
    ];
  },
});
