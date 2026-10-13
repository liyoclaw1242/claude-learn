import { createRoot } from "react-dom/client";
import { StrictMode, useEffect } from "react";
import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import AgentLoop from "./chapters/01-agent-loop";
import ContextWindow from "./chapters/02-context-window";
import SystemPrompt from "./chapters/03-system-prompt";
import Tools from "./chapters/04-tools";
import PermissionsHooks from "./chapters/05-permissions-hooks";
import Subagents from "./chapters/06-subagents";
import SkillsMcp from "./chapters/07-skills-mcp";
import Memory from "./chapters/08-memory";
import Architecture from "./chapters/09-architecture";
import Prototype from "./chapters/10-prototype";
import MapGrid from "./mapgen/01-grid";
import MapCellular from "./mapgen/02-cellular-automata";
import MapPerlin from "./mapgen/03-perlin-noise";
import MapBsp from "./mapgen/04-bsp";
import MapEuler from "./mapgen/05-euler";
import MapWfc from "./mapgen/06-wfc";
import MapPipeline from "./mapgen/07-pipeline";
import "./styles/base.css";

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
      <Routes>
        <Route path="/" element={<Home />} />
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
    </HashRouter>
  </StrictMode>,
);
