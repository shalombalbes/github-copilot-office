import { Tool } from "../../../copilot-sdk-nodejs/types";

export const webFetch: Tool = {
  name: "web_fetch",
  description: "Fetch content from a URL. Returns the response text. Useful for getting web page content, API data, etc.",
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The URL to fetch.",
      },
      method: {
        type: "string",
        enum: ["GET", "POST"],
        description: "HTTP method. Default GET.",
      },
      body: {
        type: "string",
        description: "Request body for POST requests.",
      },
    },
    required: ["url"],
  },
  handler: async ({ arguments: args }) => {
    const { url, method = "GET", body } = args as { url: string; method?: string; body?: string };
    
    try {
      const response = await fetch(url, {
        method,
        body: method === "POST" ? body : undefined,
        headers: body ? { "Content-Type": "application/json" } : undefined,
      });
      
      if (!response.ok) {
        return `HTTP ${response.status}: ${response.statusText}`;
      }
      
      const text = await response.text();
      // Truncate very long responses
      if (text.length > 50000) {
        return text.slice(0, 50000) + "\n\n[Truncated - response exceeded 50KB]";
      }
      return text;
    } catch (e: any) {
      return { textResultForLlm: e.message, resultType: "failure", error: e.message, toolTelemetry: {} };
    }
  },
};
