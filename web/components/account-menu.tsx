import Link from "next/link";
import { signOut } from "@/lib/actions";

export function AccountMenu({ name, roleLabel, current = false }: {
  name: string;
  roleLabel: string;
  current?: boolean;
}) {
  return (
    <>
      <div className="account-details">
        <strong className="account-name">{name}</strong>
        <span className="account-role">{roleLabel}</span>
      </div>
      <div className="account-links">
        <Link className="text-action" href="/account" aria-current={current ? "page" : undefined}>Manage account</Link>
        <form action={signOut}>
          <button className="text-action" type="submit">Sign out</button>
        </form>
      </div>
    </>
  );
}
