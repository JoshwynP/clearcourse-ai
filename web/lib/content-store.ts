import { emptyContent, type ContentState } from "@/lib/content-model";
import { readJson, writeJson } from "@/lib/file-state";

const file = "content.json";

export function readContent(): ContentState {
  return readJson(file, emptyContent());
}

export function writeContent(state: ContentState) {
  writeJson(file, state);
}
