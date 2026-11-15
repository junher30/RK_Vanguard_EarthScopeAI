"use client";

import { useEffect, useRef, useState } from "react";
import { Glasses, Box } from "lucide-react";
import type { XRMode } from "@/lib/xr/world";
import { useT } from "@/lib/i18n";
import { useXRState } from "@/lib/xr/state";

type Support = { vr: boolean; ar: boolean; headset: boolean };

// botones para entrar en VR o realidad mixta; solo aparecen si el dispositivo lo soporta
export default function XRButtons({ big = false }: { big?: boolean }) {
  const t = useT();
  const [sup, setSup] = useState<Support | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const stop = useRef<(() => void) | null>(null);

  useEffect(() => {
    let live = true;
    import("@/lib/xr/world").then(({ xrSupport }) => xrSupport()).then((s) => live && setSup(s)).catch(() => {});
    return () => { live = false; stop.current?.(); };
  }, []);

  if (!sup || (!sup.vr && !sup.ar)) return null;
  if (big && !sup.headset) return null;

  const enter = async (mode: XRMode) => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const { requestXR, startXR } = await import("@/lib/xr/world");
      const session = await requestXR(mode);
      // el globo de la página se desmonta mientras estás dentro: la memoria queda para la VR
      useXRState.setState({ active: true });
      session.addEventListener("end", () => {
        stop.current?.();
        stop.current = null;
        setBusy(false);
        useXRState.setState({ active: false });
      });
      stop.current = await startXR(session, mode);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
      useXRState.setState({ active: false });
    }
  };

  const cls = big ? "btn-primary !px-5 !py-3 text-base" : "btn !px-3 !py-2 text-sm";
  return (
    <div className={big ? "flex flex-wrap gap-3" : "hidden items-center gap-2 sm:flex"}>
      {sup.ar && (
        <button onClick={() => enter("immersive-ar")} className={cls} disabled={busy} title={t("El globo flota en tu espacio real", "The globe floats in your real space")}>
          <Box className="size-4" /> {big ? t("Ver en tu espacio (MR)", "See it in your space (MR)") : "MR"}
        </button>
      )}
      {sup.vr && (
        <button onClick={() => enter("immersive-vr")} className={cls} disabled={busy} title={t("Entrar en realidad virtual", "Enter virtual reality")}>
          <Glasses className="size-4" /> {big ? t("Entrar en VR", "Enter VR") : "VR"}
        </button>
      )}
      {err && <span className="text-xs text-red-300">{err}</span>}
    </div>
  );
}
