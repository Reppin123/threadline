export function Sparkline({ data, height = 36 }: { data: number[]; height?: number }) {
  const w = 280;
  const max = Math.max(1, ...data);
  const step = w / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => [i * step, height - 3 - (v / max) * (height - 8)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${height} L0,${height} Z`;
  const total = data.reduce((a, b) => a + b, 0);
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${total} chats in the last ${data.length} days`} style={{ height }}>
      <defs>
        <linearGradient id="spk" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#0a7cff" stopOpacity=".18" /><stop offset="1" stopColor="#0a7cff" stopOpacity="0" /></linearGradient>
      </defs>
      <path d={area} fill="url(#spk)" />
      <path d={line} fill="none" stroke={total ? "#0a7cff" : "#cfccc3"} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r="2.6" fill={total ? "#0a7cff" : "#cfccc3"} />
    </svg>
  );
}
