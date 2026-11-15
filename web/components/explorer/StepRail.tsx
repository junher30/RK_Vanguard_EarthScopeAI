"use client";

import { Check } from "lucide-react";
import { useT } from "@/lib/i18n";


export default function StepRail({ active }: { active: number }) {
  const t = useT();
  const STEPS = [t("Lugar", "Location"), t("Variables", "Variables"), t("Periodo", "Time period"), t("Tendencias", "Trends"), t("Significancia", "Significance")];
  return (
    <ol className="hidden items-center gap-1.5 text-xs 2xl:flex" aria-label="Investigation steps">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const done = n < active;
        const on = n === active;
        return (
          <li
            key={s}
            aria-current={on ? "step" : undefined}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${
              on ? "border-signal text-signal shadow-[0_0_12px_rgba(252,61,33,.25)]"
              : done ? "border-green/50 text-green"
              : "border-line text-muted"
            }`}
          >
            {done ? <Check className="size-3" /> : <span className="font-mono">{n}</span>}
            {s}
          </li>
        );
      })}
    </ol>
  );
}
