import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function NotFound() {
  return (
    <AppShell courses={[]} crumb="Not found">
      <div className="page">
        <h1>Page not available</h1>
        <p className="page-subtitle">
          <Link href="/">Back to home</Link>
        </p>
      </div>
    </AppShell>
  );
}
