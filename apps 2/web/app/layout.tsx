import type { Metadata, Viewport } from "next";
import { SWRegister } from "@/components/sw-register";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Sentinel V1",
  description:
    "Real-time personal safety, infrastructure awareness, and environmental risk intelligence for South Africa.",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#0f5f4f"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SWRegister />
        {children}
      </body>
    </html>
  );
}
