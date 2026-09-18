import type { ReactNode } from "react";

export const metadata = {
  title: "JARVIS",
  description: "JARVIS chat client",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
