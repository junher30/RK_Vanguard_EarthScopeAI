"use client";

// descargas del panel de análisis: la gráfica como PNG y los datos como CSV

export function download(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const cellCsv = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// CSV con encabezado de metadatos (líneas con #) y una fila por dato
export function downloadCsv(name: string, meta: [string, string][], header: string[], rows: unknown[][]) {
  const lines = [
    ...meta.map(([k, v]) => `# ${k}: ${v}`),
    header.map(cellCsv).join(","),
    ...rows.map((r) => r.map(cellCsv).join(",")),
  ];
  // BOM para que Excel abra bien las tildes
  download(name, new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
}

// copia los estilos calculados al SVG clonado (los colores de Recharts vienen de CSS)
function inlineStyles(src: Element, dst: Element) {
  const cs = getComputedStyle(src);
  const el = dst as SVGElement;
  for (const p of ["fill", "stroke", "stroke-width", "stroke-dasharray", "opacity", "fill-opacity", "stroke-opacity", "font-size", "font-family", "font-weight"]) {
    const v = cs.getPropertyValue(p);
    if (v) el.style.setProperty(p, v);
  }
  for (let i = 0; i < src.children.length; i++) inlineStyles(src.children[i], dst.children[i]);
}

// dibuja la gráfica (SVG de Recharts) en una imagen con título y fuente
export async function downloadChartPng(name: string, box: HTMLElement, title: string, subtitle: string, footer: string) {
  const svg = box.querySelector("svg.recharts-surface") ?? box.querySelector("svg");
  if (!svg) return;
  const r = svg.getBoundingClientRect();
  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineStyles(svg, clone);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(r.width));
  clone.setAttribute("height", String(r.height));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
  const img = new Image();
  await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = url; });
  URL.revokeObjectURL(url);

  const k = 2; // doble resolución
  const pad = 24, top = 70, bottom = 54;
  const W = r.width + pad * 2, H = r.height + top + bottom;
  const c = document.createElement("canvas");
  c.width = W * k;
  c.height = H * k;
  const ctx = c.getContext("2d")!;
  ctx.scale(k, k);
  ctx.fillStyle = "#050c1d";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fc3d21";
  ctx.font = "600 11px system-ui, sans-serif";
  ctx.fillText("EARTHSCOPE AI", pad, 24);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "600 17px system-ui, sans-serif";
  ctx.fillText(title, pad, 46);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(subtitle, pad, 63);
  ctx.drawImage(img, pad, top, r.width, r.height);
  ctx.fillStyle = "#64748b";
  ctx.font = "10px system-ui, sans-serif";
  // fuente en dos líneas (nombre del dataset y DOI) para que no se corte
  const [f1, f2] = footer.split(" · ");
  ctx.fillText(f1, pad, H - 30);
  if (f2) ctx.fillText(f2, pad, H - 15);
  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/png"));
  if (blob) download(name, blob);
}
