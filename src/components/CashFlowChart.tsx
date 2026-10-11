interface DataPoint {
  day: number;
  balance: number;
}

export function CashFlowChart({ data, currentDay }: { data: DataPoint[]; currentDay: number }) {
  if (data.length === 0) return null;

  const width = 100;
  const height = 32;
  const padding = 2;

  const balances = data.map(d => d.balance);
  const minBal = Math.min(...balances, 0);
  const maxBal = Math.max(...balances);
  const range = maxBal - minBal || 1;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((d.balance - minBal) / range) * (height - 2 * padding);
    return { x, y, ...d };
  });

  // Build path string
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');

  // Area path (fill to bottom)
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(2)} ${height - padding} L ${points[0].x.toFixed(2)} ${height - padding} Z`;

  // Zero line position
  const zeroY = height - padding - ((0 - minBal) / range) * (height - 2 * padding);

  // Current day marker
  const currentX = padding + ((currentDay - 1) / (data.length - 1)) * (width - 2 * padding);

  return (
    <svg
      role="img"
      aria-labelledby="cashflow-chart-title"
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-32"
      preserveAspectRatio="none"
    >
      <title id="cashflow-chart-title">30-day cash flow forecast chart</title>
      <defs>
        <linearGradient id="cashFlowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(163 230 53)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(163 230 53)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Zero line */}
      {zeroY > padding && zeroY < height - padding && (
        <line x1={padding} y1={zeroY} x2={width - padding} y2={zeroY} stroke="rgb(100 116 139)" strokeWidth="0.2" strokeDasharray="0.5 0.5" />
      )}
      {/* Area fill */}
      <path d={areaD} fill="url(#cashFlowGrad)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke="rgb(163 230 53)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
      {/* Current day marker */}
      <line x1={currentX} y1={padding} x2={currentX} y2={height - padding} stroke="rgb(251 191 36)" strokeWidth="0.2" strokeDasharray="0.5 0.5" />
      <circle cx={currentX} cy={points[currentDay - 1]?.y ?? height / 2} r="0.8" fill="rgb(251 191 36)" />
    </svg>
  );
}
