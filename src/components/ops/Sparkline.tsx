interface Props { values: number[]; color?: string; height?: number; width?: number; }

export default function Sparkline({ values, color = "#0D2B55", height = 36, width = 120 }: Props) {
  if (values.length === 0) return <div className="text-xs text-[#0D2B55]/40">no data</div>;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const pts = values.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`);
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={pts.join(" ")} />
      {pts.map((p, i) => {
        const [x, y] = p.split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r={2} fill={color} />;
      })}
    </svg>
  );
}