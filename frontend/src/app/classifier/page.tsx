"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { classifyEmail, fetchSampleEmails } from "@/lib/api";
import { Cpu, Send, Info, CheckCircle2, AlertOctagon } from "lucide-react";

export default function ClassifierPage() {
  const [samples, setSamples] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSampleEmails().then((s) => {
      setSamples(s);
      if (s.length > 1) {
        // Default to Sample 2 (Tricky Hard-Ham newsletter) to highlight false alarm prevention
        setInputText(s[1].text);
        classifyText(s[1].text);
      }
    });
  }, []);

  const classifyText = (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    classifyEmail({ text })
      .then((res) => {
        setResult(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleSelectSample = (sample: any) => {
    setInputText(sample.text);
    classifyText(sample.text);
  };

  const applyHomoglyphs = () => {
    const map: Record<string, string> = { a: "а", e: "е", o: "о", p: "р", c: "с", x: "х" };
    const modified = inputText.split("").map((ch) => (map[ch.toLowerCase()] && Math.random() > 0.3 ? map[ch.toLowerCase()] : ch)).join("");
    setInputText(modified);
    classifyText(modified);
  };

  const applyGoodWordPadding = () => {
    const padding = " quarterly forecast spreadsheet deployment committee schedule compliance board agenda operations reconciliation";
    const modified = inputText + padding;
    setInputText(modified);
    classifyText(modified);
  };

  const applyZeroWidthSpaces = () => {
    const modified = inputText.replace(/\b(lottery|winner|prize|wire_transfer|viagra|cialis|phish|account|confirm)\b/gi, (w) => w.split("").join("\u200B"));
    setInputText(modified);
    classifyText(modified);
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <Header
        title="Spam Classifier & Diagnostic Engine"
        description="Real-time multi-model inference comparing default cutoffs (tau = 0.50) against SERC cost-calibrated thresholds (tau*)."
      />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Canonical Sample Presets */}
        <div className="border border-[#E5E5E5] rounded p-5 bg-[#FAFAFA]">
          <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-[#111111] mb-2">
            Load Benchmark Test Samples (from Manuscript)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {samples.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectSample(s)}
                className={`p-3 rounded border text-left text-xs transition-colors ${
                  inputText === s.text
                    ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                    : "border-[#E5E5E5] bg-[#FFFFFF] text-[#111111] hover:bg-[#F0F0F0]"
                }`}
              >
                <div className="font-bold truncate">{s.title}</div>
                <div className={`text-[10px] mt-1 line-clamp-2 ${inputText === s.text ? "text-[#CCCCCC]" : "text-[#666666]"}`}>
                  {s.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Input Text Box */}
        <div className="border border-[#E5E5E5] rounded p-5 bg-[#FFFFFF] space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold font-mono uppercase tracking-wider text-[#111111]">
              Email Text Input (Headers &amp; Body Payload)
            </label>
            <span className="text-[11px] text-[#666666] font-mono">
              {inputText.length} characters
            </span>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={4}
            className="w-full p-3 text-xs font-mono border border-[#CCCCCC] rounded bg-[#FFFFFF] text-[#111111] focus:border-[#111111] focus:ring-0 resize-y"
            placeholder="Paste raw email header and body lines here..."
          />

          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] text-[#666666] flex items-center gap-1.5">
              <Info size={13} />
              <span>
                Predictions run simultaneously on Naive Bayes, Linear SVM, Random Forest, and Logistic Regression.
              </span>
            </div>
            <button
              onClick={() => classifyText(inputText)}
              disabled={loading || !inputText.trim()}
              className="px-4 py-2 text-xs font-medium rounded bg-[#111111] text-[#FFFFFF] hover:bg-[#333333] transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send size={13} />
              <span>{loading ? "Analyzing..." : "Classify Email"}</span>
            </button>
          </div>

          {/* Adversarial Robustness Toolbar */}
          <div className="pt-3 border-t border-[#E5E5E5] flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-mono text-[#888888] uppercase tracking-wider">
              Adversarial Perturbation Stress-Tester:
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={applyHomoglyphs}
                className="px-2.5 py-1 text-[11px] font-mono border border-[#CCCCCC] rounded hover:bg-[#F0F0F0] text-[#333333] transition-colors"
                title="Substitute Latin letters with visual Cyrillic lookalikes"
              >
                + Homoglyph Injection
              </button>
              <button
                type="button"
                onClick={applyGoodWordPadding}
                className="px-2.5 py-1 text-[11px] font-mono border border-[#CCCCCC] rounded hover:bg-[#F0F0F0] text-[#333333] transition-colors"
                title="Append corporate dictionary vocabulary"
              >
                + Good-Word Padding
              </button>
              <button
                type="button"
                onClick={applyZeroWidthSpaces}
                className="px-2.5 py-1 text-[11px] font-mono border border-[#CCCCCC] rounded hover:bg-[#F0F0F0] text-[#333333] transition-colors"
                title="Insert zero-width unicode spaces inside spam tokens"
              >
                + Zero-Width Spaces
              </button>
            </div>
          </div>
        </div>

        {/* Live Multi-Model Decision Table */}
        {result && (
          <div className="space-y-6">
            <div className="border border-[#E5E5E5] rounded p-5 bg-[#FFFFFF]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#111111]">
                    Multi-Model Decision &amp; Operational Comparison
                  </h3>
                  <p className="text-xs text-[#666666]">
                    Comparing Protocol A symmetric cutoff (&tau; = 0.50) vs Protocol B calibrated cutoff (&tau;*).
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table-monochrome">
                  <thead>
                    <tr>
                      <th>Classifier Architecture</th>
                      <th>Predicted P(Spam | x)</th>
                      <th>Protocol A (&tau; = 0.50)</th>
                      <th>Calibrated &tau;*</th>
                      <th>Protocol B (&tau; = &tau;*)</th>
                      <th>Operational Diagnostic</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-xs">
                    {result.predictions.map((p: any) => {
                      const prob = p.predicted_probability;
                      const isProtoASpam = prob >= 0.50;
                      const isProtoBSpam = p.predicted_label === "spam";
                      const isPreventedFP = isProtoASpam && !isProtoBSpam;

                      return (
                        <tr key={p.model_key} className={isPreventedFP ? "bg-[#F9F9F9]" : ""}>
                          <td className="font-bold text-[#111111]">{p.display_name}</td>
                          <td>
                            <span className="font-bold">{prob.toFixed(4)}</span>
                          </td>
                          <td>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                isProtoASpam
                                  ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                                  : "border-[#CCCCCC] bg-[#F7F7F7] text-[#111111]"
                              }`}
                            >
                              {isProtoASpam ? "SPAM (>=0.50)" : "HAM (<0.50)"}
                            </span>
                          </td>
                          <td>{p.decision_threshold.toFixed(4)}</td>
                          <td>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                isProtoBSpam
                                  ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                                  : "border-[#555555] bg-[#F7F7F7] text-[#111111]"
                              }`}
                            >
                              {isProtoBSpam ? "SPAM (>=tau*)" : "HAM (<tau*)"}
                            </span>
                          </td>
                          <td className="font-sans text-xs">
                            {isPreventedFP ? (
                              <span className="font-bold text-[#111111] flex items-center gap-1">
                                <CheckCircle2 size={13} />
                                <span>FALSE POSITIVE PREVENTED BY CALIBRATION</span>
                              </span>
                            ) : (
                              <span className="text-[#666666]">{p.diagnostic}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Matched Feature Contributions */}
            <div className="border border-[#E5E5E5] rounded p-5 bg-[#FAFAFA]">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#111111] mb-2">
                Active Vocabulary Tokens Matched ({result.matched_features.length})
              </h3>
              <p className="text-xs text-[#666666] mb-3">
                Token weights from the calibrated benchmark dictionary. Positive weights tilt probability toward spam; negative weights indicate legitimate corporate ham.
              </p>

              {result.matched_features.length === 0 ? (
                <p className="text-xs text-[#888888] font-mono">
                  No vocabulary terms matched the benchmark dictionary. Classifier evaluates at baseline prior.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {result.matched_features.map((f: any) => (
                    <span
                      key={f.token}
                      className={`text-xs font-mono px-2 py-1 rounded border flex items-center gap-1.5 ${
                        f.direction === "spam"
                          ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                          : "border-[#CCCCCC] bg-[#FFFFFF] text-[#111111]"
                      }`}
                    >
                      <span>{f.token}</span>
                      <span
                        className={`text-[10px] ${
                          f.direction === "spam" ? "text-[#CCCCCC]" : "text-[#777777]"
                        }`}
                      >
                        {f.lr_weight > 0 ? `+${f.lr_weight}` : f.lr_weight}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Scientific Disclaimer */}
            <div className="border border-[#E5E5E5] rounded p-4 bg-[#FFFFFF] text-[11px] text-[#666666]">
              <strong className="text-[#111111]">Advisory Decision Notice:</strong> Classification outputs represent statistical estimates of class probability. These models advise filtering rules but do not delete, modify, or quarantine live institutional email without authorized administrator policy.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
