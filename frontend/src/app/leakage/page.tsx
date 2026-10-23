"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { fetchLeakageDefinitions, fetchExperiments } from "@/lib/api";
import { Experiment } from "@/lib/types";
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";

export default function LeakageAuditPage() {
  const [safeguards, setSafeguards] = useState<any[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExp, setSelectedExp] = useState<Experiment | null>(null);

  useEffect(() => {
    fetchLeakageDefinitions().then(setSafeguards);
    fetchExperiments().then((exps) => {
      setExperiments(exps);
      if (exps.length > 0) {
        setSelectedExp(exps[0]);
      }
    });
  }, []);

  const protoA = experiments.find((e) => e.protocol.includes("Protocol A"));
  const protoB = experiments.find((e) => e.protocol.includes("Protocol B"));

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <Header
        title="Leakage Audit Engine"
        description="Automated empirical verification of data leakage safeguards across email filtering experiment artifacts."
      />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Protocol A vs Protocol B Side-by-Side Audit Card */}
        <div className="border border-[#E5E5E5] rounded p-6 bg-[#FFFFFF]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#111111] uppercase font-mono tracking-wider">
                Methodological Safeguard Matrix: Protocol A vs. Protocol B
              </h2>
              <p className="text-xs text-[#666666]">
                Objective verification of the six critical leakage pathways in email spam research.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table-monochrome">
              <thead>
                <tr>
                  <th style={{ width: "22%" }}>Leakage Safeguard</th>
                  <th style={{ width: "28%" }}>Risk / Failure Consequence</th>
                  <th style={{ width: "25%" }}>Protocol A (Flawed Baseline)</th>
                  <th style={{ width: "25%" }}>Protocol B (SERC-Compliant)</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {safeguards.map((sg) => (
                  <tr key={sg.check_id}>
                    <td>
                      <div className="font-bold text-[#111111]">{sg.name}</div>
                      <div className="font-mono text-[10px] text-[#888888]">{sg.check_id}</div>
                    </td>
                    <td className="text-[#555555] leading-relaxed">
                      {sg.failure_consequence}
                    </td>
                    <td>
                      <div className="p-2 border border-[#CCCCCC] rounded bg-[#F7F7F7] font-mono text-[11px]">
                        <span className="font-bold text-[#111111]">FAIL: </span>
                        <span>{sg.protocol_a_status}</span>
                      </div>
                    </td>
                    <td>
                      <div className="p-2 border border-[#111111] rounded bg-[#FAFAFA] font-mono text-[11px]">
                        <span className="font-bold text-[#111111]">PASS: </span>
                        <span>{sg.protocol_b_status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Experiment Audit Inspector */}
        {selectedExp && selectedExp.leakage_report && (
          <div className="border border-[#E5E5E5] rounded p-6 bg-[#FAFAFA] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666]">
                  Active Artifact Audit
                </span>
                <h3 className="text-base font-bold text-[#111111]">
                  {selectedExp.name} ({selectedExp.protocol})
                </h3>
              </div>

              {/* Selector for which experiment to audit */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#666666]">Audit Run:</span>
                <select
                  value={selectedExp.id}
                  onChange={(e) => {
                    const found = experiments.find((x) => x.id === e.target.value);
                    if (found) setSelectedExp(found);
                  }}
                  className="px-2.5 py-1 text-xs font-mono border border-[#CCCCCC] rounded bg-[#FFFFFF] text-[#111111]"
                >
                  {experiments.map((exp) => (
                    <option key={exp.id} value={exp.id}>
                      {exp.protocol} ({exp.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border border-[#CCCCCC] rounded bg-[#FFFFFF] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#111111]">
                  Overall Audit Determination:{" "}
                  <span className={selectedExp.is_safe ? "underline" : "text-[#111111] uppercase"}>
                    {selectedExp.is_safe ? "CERTIFIED LEAKAGE-FREE (VALID)" : "CRITICAL LEAKAGE DETECTED (UNSAFE)"}
                  </span>
                </div>
                <div className="text-xs text-[#666666] mt-0.5">
                  {selectedExp.leakage_report.overall_summary}
                </div>
              </div>
              <div className="font-mono text-xs font-bold px-3 py-1.5 border border-[#111111] rounded bg-[#F7F7F7]">
                {selectedExp.leakage_report.checks_passed} / {selectedExp.leakage_report.total_checks} PASSED
              </div>
            </div>

            {/* Individual Check Evidence List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedExp.leakage_report.checks?.map((chk) => (
                <div
                  key={chk.check_id}
                  className="p-4 border border-[#E5E5E5] rounded bg-[#FFFFFF] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#111111]">{chk.name}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          chk.passed
                            ? "border-[#555555] bg-[#F7F7F7] text-[#111111]"
                            : "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                        }`}
                      >
                        {chk.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#666666] leading-relaxed mb-3">
                      <strong>Measured Evidence:</strong> {chk.evidence}
                    </p>
                  </div>

                  {!chk.passed && (
                    <div className="text-[11px] font-mono text-[#444444] border-t border-[#EEEEEE] pt-2 mt-2">
                      <strong>Remediation:</strong> {chk.remediation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
