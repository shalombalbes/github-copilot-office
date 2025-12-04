import { getDocumentContent } from "./getDocumentContent";
import { insertOoxml } from "./insertOoxml";
import { replaceText } from "./replaceText";
import { getSelection } from "./getSelection";
import { webFetch } from "./webFetch";

export const wordTools = [
  getDocumentContent,
  insertOoxml,
  replaceText,
  getSelection,
  webFetch,
];
