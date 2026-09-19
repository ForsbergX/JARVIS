import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "JARVIS",
  description: "JARVIS chat client",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "var(--font-command)" }}>
        {children}
      </body>
    </html>
  );
}
