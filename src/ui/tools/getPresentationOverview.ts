import type { Tool } from "@github/copilot-sdk";

const CHUNK_SIZE = 10;

async function getSlidePreviewChunk(startIdx: number, endIdx: number): Promise<string[]> {
  return await PowerPoint.run(async (context) => {
    const slides = context.presentation.slides;
    slides.load("items");
    await context.sync();
    
    const slideRefs = slides.items.slice(startIdx, endIdx + 1);
    
    for (const slide of slideRefs) {
      slide.shapes.load("items");
    }
    await context.sync();

    // Load text from first few shapes only for preview
    for (const slide of slideRefs) {
      for (const shape of slide.shapes.items.slice(0, 5)) {
        try {
          shape.textFrame.textRange.load("text");
        } catch {}
      }
    }
    await context.sync();

    const results: string[] = [];
    for (let i = 0; i < slideRefs.length; i++) {
      const slide = slideRefs[i];
      const slideIndex = startIdx + i;
      const texts: string[] = [];
      
      for (const shape of slide.shapes.items.slice(0, 5)) {
        try {
          const text = shape.textFrame?.textRange?.text?.trim();
          if (text) {
            texts.push(text.length > 100 ? text.substring(0, 100) + "..." : text);
          }
        } catch {}
      }

      const preview = texts.length > 0 
        ? texts.slice(0, 3).join(" | ") 
        : "(empty or images only)";
      results.push(`Slide ${slideIndex + 1}: ${preview}`);
    }
    return results;
  });
}

export const getPresentationOverview: Tool = {
  name: "get_presentation_overview",
  description: "Get an overview of the entire PowerPoint presentation, including total slide count and a preview of each slide's content. Use this first to understand the presentation structure before reading specific slides.",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  handler: async () => {
    try {
      const slideCount = await PowerPoint.run(async (context) => {
        const slides = context.presentation.slides;
        slides.load("items");
        await context.sync();
        return slides.items.length;
      });

      if (slideCount === 0) {
        return "Presentation has no slides.";
      }

      // Process slides in chunks, each chunk uses one PowerPoint.run()
      const slideOverviews: string[] = [];
      for (let i = 0; i < slideCount; i += CHUNK_SIZE) {
        const chunkEnd = Math.min(i + CHUNK_SIZE - 1, slideCount - 1);
        const chunkResults = await getSlidePreviewChunk(i, chunkEnd);
        slideOverviews.push(...chunkResults);
      }

      return `Presentation has ${slideCount} slide(s):\n\n${slideOverviews.join("\n")}`;
    } catch (e: any) {
      return { textResultForLlm: e.message, resultType: "failure", error: e.message, toolTelemetry: {} };
    }
  },
};
