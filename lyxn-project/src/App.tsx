import { useMemo } from "@lynx-js/react";

export function App() {
  const now = useMemo(() => new Date().toLocaleString(), []);

  return (
    <view className="min-h-screen items-center justify-center bg-slate-900 px-6">
      <view className="w-full max-w-xl rounded-2xl border border-white/20 bg-white/10 p-6">
        <text className="mb-2 text-xs font-semibold text-emerald-300">
          Lynx Bundle Loaded
        </text>
        <text className="mb-3 text-4xl font-bold text-white">lyxn-project</text>
        <text className="mb-3 text-base leading-6 text-white/90">
          This screen is rendered from a single
          <text className="font-mono text-red-500"> main.lynx.bundle </text>
          file copied into each native host app.
        </text>
        <text className="text-sm text-white/65">Built at: {now}</text>
      </view>
    </view>
  );
}
