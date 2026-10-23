import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "SERC-RCS Research Lab | Email Spam Evaluation Platform",
  description:
    "Scientific audit platform evaluating feature leakage, false-alarm penalties, and experimental reproducibility in machine learning email spam classifiers through the SERC-RCS rubric.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#FFFFFF] text-[#111111] antialiased min-h-screen flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-[#FFFFFF]">
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
