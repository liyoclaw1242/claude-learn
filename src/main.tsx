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
      </Routes>
    </HashRouter>
  </StrictMode>,
);
