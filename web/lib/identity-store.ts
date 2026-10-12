import { emptyIdentity, type IdentityState } from "@/lib/identity-model";
import { readJson, writeJson } from "@/lib/file-state";

const file = "identity.json";

export function readIdentity(): IdentityState {
  return readJson(file, emptyIdentity());
}

export function writeIdentity(state: IdentityState) {
  writeJson(file, state);
}
