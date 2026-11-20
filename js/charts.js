/* Mfit · gráficas SVG ligeras (sin librerías) */
'use strict';

const Charts = (() => {
  const W = 340;

  function line(points, { unit = '', height = 170 } = {}) {
    if (points.length < 2) return '<p class="muted small">Necesitas al menos 2 registros para ver la gráfica.</p>';
    const H = height, P = { l: 40, r: 12, t: 14, b: 24 };
    const xs = points.map(p => +p.x), ys = points.map(p => p.y);
    let minX = Math.min(...xs), maxX = Math.max(...xs);
    if (minX === maxX) { minX -= 864e5; maxX += 864e5; }
    let minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = (maxY - minY) * 0.15 || 1;
    minY -= pad; maxY += pad;
    const sx = x => P.l + (x - minX) / (maxX - minX) * (W - P.l - P.r);
    const sy = y => H - P.b - (y - minY) / (maxY - minY) * (H - P.t - P.b);
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(+p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
    const area = `${d} L${sx(+points[points.length - 1].x).toFixed(1)},${H - P.b} L${sx(+points[0].x).toFixed(1)},${H - P.b} Z`;
    const ticks = [0, 0.5, 1].map(t => minY + (maxY - minY) * t);
    const fmt = v => Calc.fmtNum(Calc.round(v, 1));
    const date = x => new Date(x).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Gráfica">
      ${ticks.map(t => `<line x1="${P.l}" x2="${W - P.r}" y1="${sy(t)}" y2="${sy(t)}" class="grid"/><text x="${P.l - 6}" y="${sy(t) + 4}" text-anchor="end" class="axis">${fmt(t)}</text>`).join('')}
      <path d="${area}" class="area"/>
      <path d="${d}" class="line"/>
      ${points.map(p => `<circle cx="${sx(+p.x)}" cy="${sy(p.y)}" r="3.5" class="dot"><title>${date(p.x)}: ${fmt(p.y)} ${unit}</title></circle>`).join('')}
      <text x="${P.l}" y="${H - 6}" class="axis">${date(minX)}</text>
      <text x="${W - P.r}" y="${H - 6}" text-anchor="end" class="axis">${date(maxX)}</text>
    </svg>`;
  }

  function bars(items, { height = 150, highlightLast = true } = {}) {
    const H = height, P = { l: 8, r: 8, t: 18, b: 22 };
    const max = Math.max(1, ...items.map(i => i.value));
    const bw = (W - P.l - P.r) / items.length;
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Gráfica de barras">
      ${items.map((it, i) => {
        const h = (it.value / max) * (H - P.t - P.b);
        const x = P.l + i * bw + bw * 0.18, y = H - P.b - h;
        const cls = highlightLast && i === items.length - 1 ? 'bar bar-hi' : 'bar';
        return `<rect x="${x}" y="${y}" width="${bw * 0.64}" height="${Math.max(h, 1)}" rx="4" class="${cls}"/>
          ${it.value ? `<text x="${x + bw * 0.32}" y="${y - 4}" text-anchor="middle" class="axis">${it.short ?? it.value}</text>` : ''}
          <text x="${x + bw * 0.32}" y="${H - 6}" text-anchor="middle" class="axis">${it.label}</text>`;
      }).join('')}
    </svg>`;
  }

  return { line, bars };
})();
