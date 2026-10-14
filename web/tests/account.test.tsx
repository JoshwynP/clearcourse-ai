import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountMenu } from "../components/account-menu";
import { AccountSettings, accountNotice } from "../components/account-settings";

test("manage account shows name, email, and password controls without a role change", () => {
  const html = renderToStaticMarkup(
    <AccountSettings name="Ada Lovelace" email="ada@example.com" roleLabel="Professor" notice={accountNotice({ updated: "details" })} />,
  );
  assert.match(html, /Manage my account/);
  assert.match(html, /Name and email saved/);
  assert.match(html, /value="Ada Lovelace"/);
  assert.match(html, /value="ada@example.com"/);
  assert.match(html, /Role: Professor/);
  assert.match(html, /Save details/);
  assert.match(html, /Change password/);
  assert.match(html, /Required if you change your email/);
  assert.doesNotMatch(html, /name="role"/);
  assert.equal(accountNotice({ error: "password-match" })?.text, "Passwords do not match. Please enter them again.");
  assert.equal(accountNotice({ error: "email-taken" })?.kind, "error");
});

test("the sidebar links to manage account", () => {
  const html = renderToStaticMarkup(<AccountMenu name="Ada Lovelace" roleLabel="Student" current />);
  assert.match(html, /href="\/account"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /Manage account/);
  assert.match(html, /Sign out/);
  assert.match(html, /Ada Lovelace/);
  assert.match(html, /Student/);
});
