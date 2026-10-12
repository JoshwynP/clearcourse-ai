import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const directory = path.join(process.cwd(), ".data");

export function readJson<T>(name: string, empty: T): T {
  try {
    return JSON.parse(readFileSync(path.join(directory, name), "utf8")) as T;
  } catch {
    return empty;
  }
}

export function writeJson(name: string, value: unknown) {
  mkdirSync(directory, { recursive: true });
  const file = path.join(directory, name);
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, JSON.stringify(value));
  renameSync(temporary, file);
}
