"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  ShieldCheck,
  Cpu,
  FlaskConical,
  BarChart2,
  FileCheck2,
  FileText,
  History,
  Settings as SettingsIcon,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Dataset Laboratory", href: "/datasets", icon: Database },
  { name: "Spam Classifier", href: "/classifier", icon: Cpu },
  { name: "Leakage Audit", href: "/leakage", icon: ShieldCheck, badge: "SERC" },
  { name: "Experiment Runner", href: "/runner", icon: FlaskConical },
  { name: "Model Comparison", href: "/comparison", icon: BarChart2 },
  { name: "SERC-RCS Evaluator", href: "/serc", icon: FileCheck2 },
  { name: "Research Reports", href: "/reports", icon: FileText },
  { name: "Experiment History", href: "/history", icon: History },
  { name: "Settings", href: "/settings", icon: SettingsIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-[#E5E5E5] bg-[#FFFFFF] flex flex-col h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#E5E5E5] flex items-center justify-between">
        <div>
          <div className="font-bold text-sm tracking-tight text-[#111111] uppercase font-mono">
            SERC-RCS LAB
          </div>
          <div className="text-[11px] text-[#666666] tracking-normal font-sans">
            Spam Evaluation &amp; Reproducibility
          </div>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 border border-[#CCCCCC] rounded text-[#333333] bg-[#F7F7F7]">
          v1.0
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider text-[#888888]">
          Research Workspace
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded text-xs transition-colors group ${
                isActive
                  ? "bg-[#111111] text-[#FFFFFF] font-medium"
                  : "text-[#333333] hover:bg-[#F0F0F0] hover:text-[#000000]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  size={15}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className={isActive ? "text-[#FFFFFF]" : "text-[#666666] group-hover:text-[#111111]"}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                    isActive
                      ? "border-[#555555] bg-[#222222] text-[#FFFFFF]"
                      : "border-[#E5E5E5] bg-[#F7F7F7] text-[#666666]"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Academic Citation Footer */}
      <div className="p-4 border-t border-[#E5E5E5] bg-[#F7F7F7] text-[11px] text-[#666666]">
        <div className="font-medium text-[#111111]">Jain University &bull; CSBS</div>
        <div className="text-[10px] text-[#888888] mt-0.5">
          SERC-RCS Benchmark Framework
        </div>
      </div>
    </aside>
  );
}
