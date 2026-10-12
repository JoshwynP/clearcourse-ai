import type { Metadata } from "next";
import "./globals.css";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "ClearCourse AI",
  description: "Course guidance and an anonymous question board.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
