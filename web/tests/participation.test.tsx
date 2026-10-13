import assert from "node:assert/strict";
import test from "node:test";
import { participationLevel } from "../lib/participation-store";

test("only questions, comments, and upvotes determine the three levels", () => {
  assert.equal(participationLevel({ questions: 0, comments: 0, upvotes: 9 }), "No Record");
  assert.equal(participationLevel({ questions: 1, comments: 0, upvotes: 0 }), "No Record");
  assert.equal(participationLevel({ questions: 0, comments: 1, upvotes: 1 }), "Contributor");
  assert.equal(participationLevel({ questions: 1, comments: 1, upvotes: 3 }), "Sustained Contributor");
});
