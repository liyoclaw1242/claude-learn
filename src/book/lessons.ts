import type { Lesson } from "../components/lesson";

/**
 * 各章資料夾裡的 lesson.ts 依路由對應起來：
 * src/chapters/01-agent-loop → /01-agent-loop，src/mapgen/01-grid → /map/01-grid
 */
const mods = import.meta.glob<{ lesson: Lesson }>(["../chapters/*/lesson.ts", "../mapgen/*/lesson.ts"], { eager: true });

const byPath = new Map<string, Lesson>();
for (const [file, mod] of Object.entries(mods)) {
  const m = file.match(/\.\.\/(chapters|mapgen)\/([^/]+)\/lesson\.ts$/);
  if (m) byPath.set(m[1] === "mapgen" ? `/map/${m[2]}` : `/${m[2]}`, mod.lesson);
}

export const lessonFor = (path: string) => byPath.get(path);
