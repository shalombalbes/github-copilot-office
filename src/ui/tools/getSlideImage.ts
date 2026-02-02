import type { Tool } from "@github/copilot-sdk";

export const getSlideImage: Tool = {
  name: "get_slide_image",
  description: "Capture an image of a slide to see its visual design, layout, colors, and styling. Returns the slide as a PNG image. Use this to understand the visual style before making design suggestions or creating new slides.",
  parameters: {
    type: "object",
    properties: {
      slideIndex: {
        type: "number",
        description: "0-based slide index. Use 0 for first slide, 1 for second, etc.",
      },
      width: {
        type: "number",
        description: "Optional width in pixels for the image. Aspect ratio is preserved. Default is 800.",
      },
    },
    required: ["slideIndex"],
  },
  handler: async ({ arguments: args }) => {
    const { slideIndex, width = 800 } = args as { slideIndex: number; width?: number };

    try {
      return await PowerPoint.run(async (context) => {
        const slides = context.presentation.slides;
        slides.load("items");
        await context.sync();

        const slideCount = slides.items.length;

        if (slideIndex < 0 || slideIndex >= slideCount) {
          return {
            textResultForLlm: `Invalid slideIndex ${slideIndex}. Must be 0-${slideCount - 1} (current slide count: ${slideCount})`,
            resultType: "failure",
            error: "Invalid slideIndex",
            toolTelemetry: {},
          };
        }

        const slide = slides.items[slideIndex];
        const imageResult = slide.getImageAsBase64({ width });
        await context.sync();

        const base64Image = imageResult.value;

        return {
          textResultForLlm: `Captured image of slide ${slideIndex + 1} of ${slideCount} (${width}px wide)`,
          binaryResultsForLlm: [
            {
              data: base64Image,
              mimeType: "image/png",
              type: "image",
              description: `Slide ${slideIndex + 1} of ${slideCount}`,
            },
          ],
          resultType: "success",
          toolTelemetry: {},
        };
      });
    } catch (e: any) {
      // Handle case where API might not be available
      if (e.message?.includes("getImageAsBase64") || e.code === "InvalidOperation") {
        return {
          textResultForLlm: "Slide image capture is not supported in this version of PowerPoint. Please ensure you're using a recent version (Windows 16.0.17628+, Mac 16.85+, or PowerPoint on the web).",
          resultType: "failure",
          error: "API not available",
          toolTelemetry: {},
        };
      }
      return { textResultForLlm: e.message, resultType: "failure", error: e.message, toolTelemetry: {} };
    }
  },
};
