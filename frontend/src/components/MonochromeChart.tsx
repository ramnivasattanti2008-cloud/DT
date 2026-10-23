"use client";

import React from "react";

interface DataPoint {
  x: number | string;
  y: number;
}

interface Series {
  name: string;
  data: DataPoint[];
  strokeWidth?: number;
  strokeDasharray?: string;
  strokeColor?: string;
}

interface MonochromeChartProps {
  title: string;
  subtitle?: string;
  series: Series[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
  yRange?: [number, number];
}

export default function MonochromeChart({
  title,
  subtitle,
  series,
  xLabel = "Threshold",
  yLabel = "Metric Value",
  height = 240,
  yRange = [0, 1],
}: MonochromeChartProps) {
  // Chart dimensions
  const svgWidth = 600;
  const svgHeight = height;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };

  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const [minY, maxY] = yRange;

  // Scale functions
  const scaleY = (yVal: number) => {
    const clamped = Math.max(minY, Math.min(maxY, yVal));
    const ratio = (clamped - minY) / (maxY - minY || 1);
    return padding.top + plotHeight - ratio * plotHeight;
  };

  const scaleX = (index: number, total: number) => {
    return padding.left + (index / (total - 1 || 1)) * plotWidth;
  };

  return (
    <div className="border border-[#E5E5E5] rounded p-5 bg-[#FFFFFF]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#111111]">{title}</h3>
          {subtitle && <p className="text-xs text-[#666666]">{subtitle}</p>}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono">
          {series.map((s, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span
                className="w-4 h-0.5 inline-block"
                style={{
                  backgroundColor: s.strokeColor || (idx === 0 ? "#111111" : "#777777"),
                  borderTop: s.strokeDasharray ? "1px dashed #777777" : "none",
                }}
              />
              <span className="text-[#444444]">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full select-none"
          style={{ maxHeight: height }}
        >
          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
            const yVal = minY + frac * (maxY - minY);
            const yPos = scaleY(yVal);
            return (
              <g key={frac}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={svgWidth - padding.right}
                  y2={yPos}
                  stroke="#EEEEEE"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  className="text-[10px] fill-[#888888] font-mono"
                >
                  {yVal.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Series lines */}
          {series.map((s, sIdx) => {
            if (s.data.length === 0) return null;
            const points = s.data.map((pt, idx) => {
              const x = scaleX(idx, s.data.length);
              const y = scaleY(pt.y);
              return `${x},${y}`;
            });

            const pathD = `M ${points.join(" L ")}`;
            const isFirst = sIdx === 0;

            return (
              <g key={sIdx}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={s.strokeColor || (isFirst ? "#111111" : "#666666")}
                  strokeWidth={s.strokeWidth || (isFirst ? 2.5 : 1.8)}
                  strokeDasharray={s.strokeDasharray || (isFirst ? "none" : "4,3")}
                />
                {/* Optional dots on samples */}
                {s.data.length <= 15 &&
                  s.data.map((pt, pIdx) => {
                    const x = scaleX(pIdx, s.data.length);
                    const y = scaleY(pt.y);
                    return (
                      <circle
                        key={pIdx}
                        cx={x}
                        cy={y}
                        r={3}
                        fill="#FFFFFF"
                        stroke={isFirst ? "#111111" : "#666666"}
                        strokeWidth={1.5}
                      />
                    );
                  })}
              </g>
            );
          })}

          {/* Axes */}
          <line
            x1={padding.left}
            y1={padding.top + plotHeight}
            x2={svgWidth - padding.right}
            y2={padding.top + plotHeight}
            stroke="#CCCCCC"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + plotHeight}
            stroke="#CCCCCC"
            strokeWidth="1"
          />

          {/* Axis Labels */}
          <text
            x={svgWidth / 2}
            y={svgHeight - 10}
            textAnchor="middle"
            className="text-[11px] fill-[#666666] font-mono"
          >
            {xLabel}
          </text>
        </svg>
      </div>
    </div>
  );
}
