import type { Metadata } from "next";
// import "./globals.css"; // Optional: Comment out if relying fully on MUI
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry';

export const metadata: Metadata = {
  title: "CRM Task Manager",
  description: "User management and follow-up system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
