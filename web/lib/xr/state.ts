"use client";

// si hay una sesión de VR/MR abierta: la web apaga su globo 2D para no gastar memoria doble
import { create } from "zustand";

export const useXRState = create<{ active: boolean }>(() => ({ active: false }));
