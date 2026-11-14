import { Check } from "lucide-react";

// The five steps of the NASA challenge. Step 1 here covers "Choose a region".
const STEPS = ["Location", "Variables", "Time period", "Trends", "Significance"];

export default function StepRail({ active }: { active: number }) {
  return (
    <ol className="hidden items-center gap-1.5 text-xs md:flex" aria-label="Investigation steps">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const done = n < active;
        const on = n === active;
        return (
          <li
            key={s}
            aria-current={on ? "step" : undefined}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${
              on ? "border-cyan text-cyan shadow-[0_0_12px_rgba(34,211,238,.25)]"
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
