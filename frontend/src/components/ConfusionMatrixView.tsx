"use client";

import React from "react";

interface ConfusionMatrixProps {
  tp: number;
  tn: number;
  fp: number;
  fn: number;
  title?: string;
  subtitle?: string;
}

export default function ConfusionMatrixView({
  tp,
  tn,
  fp,
  fn,
  title = "Confusion Matrix",
  subtitle = "Binary spam classification outcomes (Positive = Spam, Negative = Ham)",
}: ConfusionMatrixProps) {
  const total = tp + tn + fp + fn || 1;
  const tpPct = ((tp / total) * 100).toFixed(1);
  const tnPct = ((tn / total) * 100).toFixed(1);
  const fpPct = ((fp / total) * 100).toFixed(1);
  const fnPct = ((fn / total) * 100).toFixed(1);

  return (
    <div className="border border-[#E5E5E5] rounded p-5 bg-[#FFFFFF]">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-[#111111]">{title}</h3>
        <p className="text-xs text-[#666666]">{subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center font-mono">
        {/* Top Left: TP */}
        <div className="p-4 border border-[#111111] bg-[#111111] text-[#FFFFFF] rounded">
          <div className="text-[10px] tracking-wider uppercase text-[#CCCCCC] mb-1">
            True Positive (TP)
          </div>
          <div className="text-2xl font-bold">{tp.toLocaleString()}</div>
          <div className="text-[11px] text-[#AAAAAA] mt-1">
            {tpPct}% &bull; Spam Quarantined
          </div>
        </div>

        {/* Top Right: FP */}
        <div className="p-4 border border-[#CCCCCC] bg-[#F7F7F7] text-[#111111] rounded">
          <div className="text-[10px] tracking-wider uppercase text-[#666666] mb-1">
            False Positive (FP)
          </div>
          <div className="text-2xl font-bold text-[#111111]">{fp.toLocaleString()}</div>
          <div className="text-[11px] text-[#666666] mt-1">
            {fpPct}% &bull; False Alarms (Lost Ham)
          </div>
        </div>

        {/* Bottom Left: FN */}
        <div className="p-4 border border-[#CCCCCC] bg-[#F7F7F7] text-[#111111] rounded">
          <div className="text-[10px] tracking-wider uppercase text-[#666666] mb-1">
            False Negative (FN)
          </div>
          <div className="text-2xl font-bold text-[#111111]">{fn.toLocaleString()}</div>
          <div className="text-[11px] text-[#666666] mt-1">
            {fnPct}% &bull; Missed Spam
          </div>
        </div>

        {/* Bottom Right: TN */}
        <div className="p-4 border border-[#888888] bg-[#EFEFEF] text-[#111111] rounded">
          <div className="text-[10px] tracking-wider uppercase text-[#444444] mb-1">
            True Negative (TN)
          </div>
          <div className="text-2xl font-bold">{tn.toLocaleString()}</div>
          <div className="text-[11px] text-[#555555] mt-1">
            {tnPct}% &bull; Ham Delivered Safely
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#EEEEEE] flex justify-between text-xs text-[#666666]">
        <span>Total Evaluated Messages: <strong className="font-mono text-[#111111]">{total.toLocaleString()}</strong></span>
        <span>
          Spam Positive Rate:{" "}
          <strong className="font-mono text-[#111111]">
            {(((tp + fn) / total) * 100).toFixed(1)}%
          </strong>
        </span>
      </div>
    </div>
  );
}
