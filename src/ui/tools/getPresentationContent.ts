import type { Tool } from "@github/copilot-sdk";

const CHUNK_SIZE = 10; // Slides per batch in a single PowerPoint.run()

async function getSlideChunkContent(startIdx: number, endIdx: number, slideCount: number): Promise<string[]> {
  return await PowerPoint.run(async (context) => {
    const slides = context.presentation.slides;
    slides.load("items");
    await context.sync();

    // Get slides in this chunk range
    const slideRefs = slides.items.slice(startIdx, endIdx + 1);
    
    // Load shapes for all slides in chunk
    for (const slide of slideRefs) {
      slide.shapes.load("items");
    }
    await context.sync();

    // Load text from all shapes
    for (const slide of slideRefs) {
      for (const shape of slide.shapes.items) {
        try {
          shape.textFrame.textRange.load("text");
        } catch {}
      }
    }
    await context.sync();

    // Extract text
    const results: string[] = [];
    for (let i = 0; i < slideRefs.length; i++) {
      const slide = slideRefs[i];
      const slideIndex = startIdx + i;
      const texts: string[] = [];
      
      for (const shape of slide.shapes.items) {
        try {
          if (shape.textFrame?.textRange?.text) {
            texts.push(shape.textFrame.textRange.text);
          }
        } catch {}
      }
      results.push(`=== Slide ${slideIndex + 1} of ${slideCount} ===\n${texts.join("\n\n") || "(empty slide)"}`);
    }
    return results;
  });
}

async function getSlideCount(): Promise<number> {
  return await PowerPoint.run(async (context) => {
    const slides = context.presentation.slides;
    slides.load("items");
    await context.sync();
    return slides.items.length;
  });
}

export const getPresentationContent: Tool = {
  name: "get_presentation_content",
  description: "Get the text content of slides in the PowerPoint presentation. Can read a single slide by index, a range of slides, or all slides. For very large presentations (50+ slides), consider making parallel calls with different ranges (e.g., 0-24, 25-49, etc.).",
  parameters: {
    type: "object",
    properties: {
      slideIndex: {
        type: "number",
        description: "0-based slide index for reading a single slide. Omit to read all or use range.",
      },
      startIndex: {
        type: "number",
        description: "0-based start index for reading a range. Use with endIndex. For parallel reads, split into ~25 slide ranges.",
      },
      endIndex: {
        type: "number",
        description: "0-based end index (inclusive) for reading a range. Use with startIndex.",
      },
    },
    required: [],
  },
  handler: async ({ arguments: args }) => {
    const { slideIndex, startIndex, endIndex } = args as { 
      slideIndex?: number; 
      startIndex?: number; 
      endIndex?: number;
    };

    try {
      const slideCount = await getSlideCount();

      if (slideCount === 0) {
        return "Presentation has no slides.";
      }

      let start: number;
      let end: number;

      if (slideIndex !== undefined) {
        if (slideIndex < 0 || slideIndex >= slideCount) {
          return { 
            textResultForLlm: `Invalid slideIndex ${slideIndex}. Must be 0-${slideCount - 1} (current slide count: ${slideCount})`, 
            resultType: "failure", 
            error: "Invalid slideIndex", 
            toolTelemetry: {} 
          };
        }
        start = slideIndex;
        end = slideIndex;
      } else if (startIndex !== undefined && endIndex !== undefined) {
        start = Math.max(0, startIndex);
        end = Math.min(slideCount - 1, endIndex);
        if (start > end) {
          return { 
            textResultForLlm: `Invalid range: startIndex (${startIndex}) must be <= endIndex (${endIndex})`, 
            resultType: "failure", 
            error: "Invalid range", 
            toolTelemetry: {} 
          };
        }
      } else {
        start = 0;
        end = slideCount - 1;
      }

      // Process in chunks, each chunk uses one PowerPoint.run()
      const results: string[] = [];
      for (let i = start; i <= end; i += CHUNK_SIZE) {
        const chunkEnd = Math.min(i + CHUNK_SIZE - 1, end);
        const chunkResults = await getSlideChunkContent(i, chunkEnd, slideCount);
        results.push(...chunkResults);
      }

      return results.join("\n\n");
    } catch (e: any) {
      return { textResultForLlm: e.message, resultType: "failure", error: e.message, toolTelemetry: {} };
    }
  },
};
