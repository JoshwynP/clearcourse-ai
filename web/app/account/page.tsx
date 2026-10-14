import { AccountSettings, accountNotice } from "@/components/account-settings";
import { SignedInShell } from "@/components/signed-in-shell";
import { currentAccount } from "@/lib/accounts";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  const search = await searchParams;
  const roleLabel = user.role === "instructor" ? "Professor" : "Student";
  return (
    <SignedInShell account>
      <AccountSettings name={user.name} email={user.email} roleLabel={roleLabel} notice={accountNotice(search)} />
    </SignedInShell>
  );
}
