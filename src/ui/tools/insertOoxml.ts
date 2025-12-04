import { Tool } from "../../../copilot-sdk-nodejs/types";

export const insertOoxml: Tool = {
  name: "insert_ooxml",
  description: "Insert OOXML content into the document. Use this to insert formatted content with precise control.",
  parameters: {
    type: "object",
    properties: {
      ooxml: {
        type: "string",
        description: "OOXML content to insert.",
      },
      location: {
        type: "string",
        enum: ["cursor", "end", "start"],
        description: "Where to insert: 'cursor' (replaces selection, default), 'end', or 'start'.",
      },
    },
    required: ["ooxml"],
  },
  handler: async ({ arguments: args }) => {
    const { ooxml, location = "cursor" } = args as { ooxml: string; location?: string };
    
    try {
      return await Word.run(async (context) => {
        if (location === "end") {
          context.document.body.insertOoxml(ooxml, Word.InsertLocation.end);
        } else if (location === "start") {
          context.document.body.insertOoxml(ooxml, Word.InsertLocation.start);
        } else {
          const selection = context.document.getSelection();
          selection.insertOoxml(ooxml, Word.InsertLocation.replace);
        }
        await context.sync();
        return "Content inserted successfully.";
      });
    } catch (e: any) {
      return { textResultForLlm: e.message, resultType: "failure", error: e.message, toolTelemetry: {} };
    }
  },
};
