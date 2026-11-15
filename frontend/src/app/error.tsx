"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled client error in SERC-RCS Research Lab:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center p-6">
      <div className="max-w-md w-full border border-[#111111] rounded p-6 bg-[#FAFAFA] space-y-4">
        <div className="flex items-center gap-3 border-b border-[#E5E5E5] pb-3">
          <AlertTriangle size={20} className="text-[#111111]" />
          <div>
            <h2 className="text-sm font-bold text-[#111111] uppercase font-mono tracking-wider">
              Client Rendering Exception Handled
            </h2>
            <span className="text-[10px] text-[#666666] font-mono">
              SERC-RCS Research Lab Fault Recovery
            </span>
          </div>
        </div>

        <p className="text-xs text-[#555555] leading-relaxed">
          The application encountered a client-side exception while rendering. This may occur if your browser has cached a previous bundle version.
        </p>

        {error?.message && (
          <div className="p-3 bg-[#FFFFFF] border border-[#CCCCCC] rounded text-[11px] font-mono text-[#111111] break-all">
            {error.message}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              } else {
                reset();
              }
            }}
            className="flex-1 py-2 px-3 text-xs font-mono font-bold bg-[#111111] text-[#FFFFFF] rounded hover:bg-[#333333] transition flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={13} />
            <span>Hard Refresh</span>
          </button>
          <Link
            href="/"
            className="py-2 px-3 text-xs font-mono border border-[#111111] text-[#111111] rounded hover:bg-[#EAEAEA] transition flex items-center justify-center gap-1.5"
          >
            <Home size={13} />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
