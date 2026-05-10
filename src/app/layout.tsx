import type { Metadata } from "next";
// import "./globals.css"; // Optional: Comment out if relying fully on MUI
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry';

export const metadata: Metadata = {
  title: "CobraYa!",
  description: "Debt collection CRM for teams. Manage debtors, track follow-ups, and send emails.",
  verification: {
    google: "2vfBRbR67CCsbhL7Z9tCIwzGxVeMzaa_XUB8ecZM9Sk",
  },
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
