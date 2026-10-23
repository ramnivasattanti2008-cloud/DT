"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchHealth } from "@/lib/api";
import { CheckCircle2, AlertCircle, ArrowUpRight } from "lucide-react";

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, description, actions }: HeaderProps) {
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(() => setIsBackendHealthy(true))
      .catch(() => setIsBackendHealthy(false));
  }, []);

  return (
    <header className="border-b border-[#E5E5E5] bg-[#FFFFFF] px-8 py-5 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#111111]">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-[#666666] mt-0.5 max-w-2xl">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Connection Status Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#E5E5E5] bg-[#F7F7F7] text-[11px] font-mono text-[#444444]">
          <span
            className={`w-2 h-2 rounded-full ${
              isBackendHealthy === true
                ? "bg-[#111111]"
                : isBackendHealthy === false
                ? "bg-[#888888] animate-pulse"
                : "bg-[#CCCCCC]"
            }`}
          />
          <span>
            {isBackendHealthy === true
              ? "API Connected (127.0.0.1:8000)"
              : isBackendHealthy === false
              ? "Backend Offline"
              : "Checking API..."}
          </span>
        </div>

        {actions}
      </div>
    </header>
  );
}
