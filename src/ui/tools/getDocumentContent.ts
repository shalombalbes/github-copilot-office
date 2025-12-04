import { Tool } from "../../../copilot-sdk-nodejs/types";

export const getDocumentContent: Tool = {
  name: "get_document_content",
  description: "Get the OOXML content of the Word document, preserving all formatting and structure.",
  parameters: {
    type: "object",
    properties: {},
  },
  handler: async () => {
    try {
      return await Word.run(async (context) => {
        const ooxml = context.document.body.getOoxml();
        await context.sync();
        return ooxml.value || "(empty document)";
      });
    } catch (e: any) {
      return { textResultForLlm: e.message, resultType: "failure", error: e.message, toolTelemetry: {} };
    }
  },
};
