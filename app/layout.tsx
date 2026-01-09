// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "TrackMyKid CRM",
  description: "CRM system for managing devices, jobs, users, and telemetry",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
