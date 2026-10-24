interface Stage { label: string; value: number; color: string; }

export default function PipelineFunnel({ stages }: { stages: Stage[] }) {
  const max = Math.max(...stages.map((s) => s.value), 1);
  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const width = Math.max(24, (s.value / max) * 100);
        const prev = i === 0 ? null : stages[i - 1].value;
        const rate = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null;
        return (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-32 text-sm text-[#0D2B55] font-medium">{s.label}</div>
            <div className="flex-1 relative h-10 bg-[#0D2B5510] rounded-md overflow-hidden">
              <div
                className="h-full flex items-center justify-end px-3 text-white text-sm font-semibold transition-all"
                style={{ width: `${width}%`, background: s.color }}
              >
                {s.value.toLocaleString()}
              </div>
            </div>
            <div className="w-16 text-xs text-[#0D2B55]/70 text-right">
              {rate !== null ? `${rate}%` : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}