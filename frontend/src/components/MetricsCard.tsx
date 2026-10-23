import React from "react";

interface MetricsCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  indicator?: "neutral" | "highlight" | "danger";
}

export default function MetricsCard({
  label,
  value,
  subtitle,
  badge,
  indicator = "neutral",
}: MetricsCardProps) {
  return (
    <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#666666]">
          {label}
        </span>
        {badge && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#E5E5E5] bg-[#F7F7F7] text-[#444444]">
            {badge}
          </span>
        )}
      </div>

      <div className="my-1">
        <div className="text-2xl font-bold font-mono tracking-tight text-[#111111]">
          {value}
        </div>
      </div>

      {subtitle && (
        <div className="text-[11px] text-[#666666] border-t border-[#F0F0F0] pt-2 mt-1">
          {subtitle}
        </div>
      )}
    </div>
  );
}
