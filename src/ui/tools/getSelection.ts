import { Tool } from "../../../copilot-sdk-nodejs/types";

export const getSelection: Tool = {
  name: "get_selection",
  description: "Get the currently selected OOXML content in the document.",
  parameters: {
    type: "object",
    properties: {},
  },
  handler: async () => {
    try {
      return await Word.run(async (context) => {
        const selection = context.document.getSelection();
        const ooxml = selection.getOoxml();
        await context.sync();
        return ooxml.value || "(no selection)";
      });
    } catch (e: any) {
      return { textResultForLlm: e.message, resultType: "failure", error: e.message, toolTelemetry: {} };
    }
  },
};
