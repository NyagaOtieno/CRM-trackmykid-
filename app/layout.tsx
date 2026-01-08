// app/layout.tsx
import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata = {
  title: "TrackMyKid CRM",
  description: "CRM system for managing devices, jobs, users, and telemetry",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
