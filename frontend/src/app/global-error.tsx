"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
    // Automatic chunk reload recovery
    if (
      typeof window !== "undefined" &&
      (error?.message?.includes("Loading chunk") ||
        error?.message?.includes("ChunkLoadError") ||
        error?.message?.includes("Failed to fetch dynamically imported module"))
    ) {
      window.location.reload();
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#FFFFFF] text-[#111111] antialiased min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full border border-[#111111] rounded p-6 bg-[#FAFAFA] space-y-4 shadow-sm font-sans">
          <div className="border-b border-[#E5E5E5] pb-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-bold block">
              SERC-RCS Research Lab &bull; System Recovery
            </span>
            <h2 className="text-sm font-bold text-[#111111] mt-1">
              Application Bundle Update Detected
            </h2>
          </div>

          <p className="text-xs text-[#555555] leading-relaxed">
            The application components have been updated on the server. Please click below to refresh and load the latest verified build.
          </p>

          {error?.message && (
            <div className="p-2.5 bg-[#FFFFFF] border border-[#CCCCCC] rounded text-[11px] font-mono text-[#111111] break-all">
              {error.message}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = window.location.pathname + "?t=" + Date.now();
                } else {
                  reset();
                }
              }}
              className="w-full py-2.5 px-4 text-xs font-mono font-bold bg-[#111111] text-[#FFFFFF] rounded hover:bg-[#333333] transition"
            >
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
