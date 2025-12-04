import { Tool } from "../../../copilot-sdk-nodejs/types";

export const replaceText: Tool = {
  name: "replace_text",
  description: "Find and replace text in the document. The replacement can be OOXML for formatted content.",
  parameters: {
    type: "object",
    properties: {
      find: {
        type: "string",
        description: "The text to find.",
      },
      replaceOoxml: {
        type: "string",
        description: "The replacement OOXML content.",
      },
      matchCase: {
        type: "boolean",
        description: "Whether to match case. Default false.",
      },
      replaceAll: {
        type: "boolean",
        description: "Replace all occurrences. Default true.",
      },
    },
    required: ["find", "replaceOoxml"],
  },
  handler: async ({ arguments: args }) => {
    const { find, replaceOoxml, matchCase = false, replaceAll = true } = args as {
      find: string;
      replaceOoxml: string;
      matchCase?: boolean;
      replaceAll?: boolean;
    };
    
    try {
      return await Word.run(async (context) => {
        const searchResults = context.document.body.search(find, {
          matchCase,
          matchWholeWord: false,
        });
        searchResults.load("items");
        await context.sync();
        
        const count = searchResults.items.length;
        if (count === 0) {
          return `No occurrences of "${find}" found.`;
        }
        
        if (replaceAll) {
          for (const result of searchResults.items) {
            result.insertOoxml(replaceOoxml, Word.InsertLocation.replace);
          }
        } else {
          searchResults.items[0].insertOoxml(replaceOoxml, Word.InsertLocation.replace);
        }
        await context.sync();
        
        const replaced = replaceAll ? count : 1;
        return `Replaced ${replaced} occurrence(s) of "${find}".`;
      });
    } catch (e: any) {
      return { textResultForLlm: e.message, resultType: "failure", error: e.message, toolTelemetry: {} };
    }
  },
};
