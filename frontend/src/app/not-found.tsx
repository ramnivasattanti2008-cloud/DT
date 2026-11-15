import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center p-6">
      <div className="max-w-md w-full border border-[#E5E5E5] rounded p-6 bg-[#FAFAFA] text-center space-y-4">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#666666] block">
          404 &bull; Page Not Found
        </span>
        <h1 className="text-base font-bold text-[#111111]">
          The requested research lab view does not exist
        </h1>
        <p className="text-xs text-[#666666]">
          Please return to the SERC-RCS Overview or navigate using the left sidebar.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            href="/"
            className="py-2 px-4 text-xs font-mono bg-[#111111] text-[#FFFFFF] rounded hover:bg-[#333333] transition flex items-center gap-2"
          >
            <Home size={13} />
            <span>Return to Overview</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
