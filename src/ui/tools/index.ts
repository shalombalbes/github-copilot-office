import { getDocumentContent } from "./getDocumentContent";
import { setDocumentContent } from "./setDocumentContent";
import { getSelection } from "./getSelection";
import { webFetch } from "./webFetch";
import { getPresentationContent } from "./getPresentationContent";
import { getPresentationOverview } from "./getPresentationOverview";
import { getSlideImage } from "./getSlideImage";
import { setPresentationContent } from "./setPresentationContent";
import { addSlideFromCode } from "./addSlideFromCode";
import { clearSlide } from "./clearSlide";
import { updateSlideShape } from "./updateSlideShape";
import { getWorkbookContent } from "./getWorkbookContent";
import { setWorkbookContent } from "./setWorkbookContent";
import { getSelectedRange } from "./getSelectedRange";
import { setSelectedRange } from "./setSelectedRange";
import { getWorkbookInfo } from "./getWorkbookInfo";

export const wordTools = [
  getDocumentContent,
  setDocumentContent,
  getSelection,
  webFetch,
];

export const powerpointTools = [
  getPresentationOverview,
  getPresentationContent,
  getSlideImage,
  setPresentationContent,
  addSlideFromCode,
  clearSlide,
  updateSlideShape,
  webFetch,
];

export const excelTools = [
  getWorkbookInfo,
  getWorkbookContent,
  setWorkbookContent,
  getSelectedRange,
  setSelectedRange,
  webFetch,
];

export function getToolsForHost(host: typeof Office.HostType[keyof typeof Office.HostType]) {
  switch (host) {
    case Office.HostType.Word:
      return wordTools;
    case Office.HostType.PowerPoint:
      return powerpointTools;
    case Office.HostType.Excel:
      return excelTools;
    default:
      return [];
  }
}
