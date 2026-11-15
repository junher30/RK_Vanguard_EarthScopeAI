// hojas de sprites de la mascota (PixelLab): cuadros de 128 px en cuadrícula, a 8 fps
export type SheetName = "welcome" | "idle" | "talk";

export const SPRITE = 128;
export const SHEETS: Record<SheetName, { url: string; cols: number; rows: number; frames: number }> = {
  welcome: { url: "/mascot/Robot_Welcome_Wave_sheet.png", cols: 5, rows: 4, frames: 17 },
  idle: { url: "/mascot/Robot_Hover_Idle_sheet.png", cols: 6, rows: 5, frames: 29 },
  talk: { url: "/mascot/Robot_Talking_sheet.png", cols: 5, rows: 4, frames: 17 },
};

export const cell = (s: SheetName, i: number) => {
  const sh = SHEETS[s];
  const k = i % sh.frames;
  return { col: k % sh.cols, row: Math.floor(k / sh.cols) };
};
