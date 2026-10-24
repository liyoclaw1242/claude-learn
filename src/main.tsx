import { createRoot } from "react-dom/client";
import { StrictMode, Suspense, lazy, useEffect } from "react";
import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import BookContents from "./pages/BookContents";
import PageTurn from "./book/PageTurn";
import "./styles/base.css";
import "./styles/book.css";

/* 每課各自打包，用到才載入 */
const AgentLoop = lazy(() => import("./chapters/01-agent-loop"));
const ContextWindow = lazy(() => import("./chapters/02-context-window"));
const SystemPrompt = lazy(() => import("./chapters/03-system-prompt"));
const Tools = lazy(() => import("./chapters/04-tools"));
const PermissionsHooks = lazy(() => import("./chapters/05-permissions-hooks"));
const Subagents = lazy(() => import("./chapters/06-subagents"));
const SkillsMcp = lazy(() => import("./chapters/07-skills-mcp"));
const Memory = lazy(() => import("./chapters/08-memory"));
const Architecture = lazy(() => import("./chapters/09-architecture"));
const Prototype = lazy(() => import("./chapters/10-prototype"));
const MapGrid = lazy(() => import("./mapgen/01-grid"));
const MapCellular = lazy(() => import("./mapgen/02-cellular-automata"));
const MapPerlin = lazy(() => import("./mapgen/03-perlin-noise"));
const MapBsp = lazy(() => import("./mapgen/04-bsp"));
const MapEuler = lazy(() => import("./mapgen/05-euler"));
const MapWfc = lazy(() => import("./mapgen/06-wfc"));
const MapPipeline = lazy(() => import("./mapgen/07-pipeline"));

/** 切換章節時回到頁首 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <ScrollToTop />
      <PageTurn />
      <Suspense fallback={<div className="desk loading">翻頁中…</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/book/:id" element={<BookContents />} />
        <Route path="/01-agent-loop" element={<AgentLoop />} />
        <Route path="/02-context-window" element={<ContextWindow />} />
        <Route path="/03-system-prompt" element={<SystemPrompt />} />
        <Route path="/04-tools" element={<Tools />} />
        <Route path="/05-permissions-hooks" element={<PermissionsHooks />} />
        <Route path="/06-subagents" element={<Subagents />} />
        <Route path="/07-skills-mcp" element={<SkillsMcp />} />
        <Route path="/08-memory" element={<Memory />} />
        <Route path="/09-architecture" element={<Architecture />} />
        <Route path="/10-prototype" element={<Prototype />} />
        <Route path="/map/01-grid" element={<MapGrid />} />
        <Route path="/map/02-cellular-automata" element={<MapCellular />} />
        <Route path="/map/03-perlin-noise" element={<MapPerlin />} />
        <Route path="/map/04-bsp" element={<MapBsp />} />
        <Route path="/map/05-euler" element={<MapEuler />} />
        <Route path="/map/06-wfc" element={<MapWfc />} />
        <Route path="/map/07-pipeline" element={<MapPipeline />} />
      </Routes>
      </Suspense>
    </HashRouter>
  </StrictMode>,
);
