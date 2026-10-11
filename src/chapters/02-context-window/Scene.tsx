import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges, Line } from "@react-three/drei";
import * as THREE from "three";
import { Label, type Vec3 } from "../../three/Label";
import StageCanvas from "../../three/StageCanvas";
import { KIND_COLOR, THRESHOLD, type Block, type Step } from "./steps";

/** 100% 視窗對應的 3D 高度 */
const H = 11;
const BASE_Y = -6.5;
const MAIN_X = 0;
const MAIN_W = 5;
const SUB_X = 10.5;
const SUB_W = 3.5;
const DISK_X = -9.8;

const total = (blocks: Block[]) => blocks.reduce((a, x) => a + x.pct, 0);
const FIXED_KINDS: Block["kind"][] = ["system", "tools", "claudemd"];

/* ---------- 一塊訊息：高度、位置、亮度都平滑過渡 ---------- */

function StackBlock({ block, centerY, width, showLabel }: {
  block: Block; centerY: number; width: number; showLabel: boolean;
}) {
  const group = useRef<THREE.Group>(null!);
  const mesh = useRef<THREE.Mesh>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const h = (block.pct / 100) * H;

  useFrame((_, dt) => {
    // 以經過時間計算插值比例：不論幀率高低，大約 0.5 秒到位
    const k = 1 - Math.exp(-dt * 8);
    group.current.position.y += (centerY - group.current.position.y) * k;
    const s = mesh.current.scale;
    s.y += (Math.max(h * 0.94, 0.0001) - s.y) * k;
    mesh.current.visible = s.y > 0.002;
    const targetOpacity = block.dim ? 0.22 : 0.9;
    mat.current.opacity += (targetOpacity - mat.current.opacity) * k;
  });

  return (
    <group ref={group} position={[0, centerY, 0]}>
      <mesh ref={mesh} scale={[1, 0.0001, 1]}>
        <boxGeometry args={[width, 1, width]} />
        <meshStandardMaterial ref={mat} color={KIND_COLOR[block.kind]} transparent opacity={0.9} />
      </mesh>
      {showLabel && (block.pct >= 6 || block.kind === "summary" || block.kind === "report") && (
        <Label
          position={[width / 2 + 2.3, 0, 0]}
          color={KIND_COLOR[block.kind]}
          title={`${block.label}`}
          sub={`${block.pct}%${block.dim ? " · 注意力變弱" : ""}`}
        />
      )}
    </group>
  );
}

/* ---------- 一個 context window（玻璃箱 + 堆疊的訊息） ---------- */

function ContextWindow({ x, width, blocks, title, sub, showLabels }: {
  x: number; width: number; blocks: Block[]; title: string; sub: string; showLabels: boolean;
}) {
  const used = total(blocks);
  const over = used > THRESHOLD;
  const thresholdY = BASE_Y + (THRESHOLD / 100) * H;
  const half = width / 2 + 0.05;
  const fixedPct = total(blocks.filter((x) => FIXED_KINDS.includes(x.kind)));

  let acc = 0;
  const placed = blocks.map((blk) => {
    const h = (blk.pct / 100) * H;
    const centerY = BASE_Y + acc + h / 2;
    acc += h;
    return { blk, centerY };
  });

  const ring = (y: number): Vec3[] => [
    [-half, y, -half], [half, y, -half], [half, y, half], [-half, y, half], [-half, y, -half],
  ];

  return (
    <group position={[x, 0, 0]}>
      {/* 玻璃箱 */}
      <mesh position={[0, BASE_Y + H / 2, 0]}>
        <boxGeometry args={[width + 0.1, H, width + 0.1]} />
        <meshStandardMaterial color="#9fb3ff" transparent opacity={0.04} depthWrite={false} />
        <Edges color={over ? "#ff7a8a" : "#3a4258"} />
      </mesh>

      {/* 自動壓縮門檻線 */}
      <Line points={ring(thresholdY)} color="#ff7a8a" lineWidth={1.5} dashed dashSize={0.3} gapSize={0.2} />

      {placed.map(({ blk, centerY }) => (
        <StackBlock key={blk.id} block={blk} centerY={centerY} width={width} showLabel={showLabels} />
      ))}

      <Label position={[0, BASE_Y + H + 0.9, 0]} color={over ? "#ff7a8a" : "#d8dce6"} title={title} sub={`${sub} · 已用 ${used}%`} />
      {showLabels && (<>
        <Label position={[-width / 2 - 2.2, thresholdY, 0]} color="#ff7a8a" title="自動壓縮門檻" sub="（示意位置）" />
        {fixedPct > 0 && (
          <Label
            position={[-width / 2 - 2.2, BASE_Y + (fixedPct / 200) * H, 0]}
            color="#8a92a6" title={`固定開銷 ${fixedPct}%`} sub="system + tools + CLAUDE.md"
          />
        )}
      </>)}
    </group>
  );
}

/* ---------- 壓縮時飛散的細節碎片 ---------- */

function Debris() {
  const pieces = useMemo(() =>
    Array.from({ length: 48 }, () => ({
      pos: new THREE.Vector3(
        MAIN_X + (Math.random() - 0.5) * MAIN_W,
        BASE_Y + 1.2 + Math.random() * H * 0.75,
        (Math.random() - 0.5) * MAIN_W,
      ),
      vel: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 3, (Math.random() - 0.2) * 5),
      color: Object.values(KIND_COLOR)[3 + Math.floor(Math.random() * 3)],
    })), []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const age = useRef(0);

  useFrame((_, dt) => {
    age.current += dt;
    const fade = Math.max(0, 1 - age.current / 2.6);
    pieces.forEach((p, i) => {
      const m = refs.current[i];
      if (!m) return;
      p.vel.y -= 6 * dt;
      p.pos.addScaledVector(p.vel, dt);
      m.position.copy(p.pos);
      m.rotation.x += dt * 3;
      m.rotation.y += dt * 2;
      (m.material as THREE.MeshStandardMaterial).opacity = fade;
      m.visible = fade > 0;
    });
  });

  return (
    <>
      {pieces.map((p, i) => (
        <mesh key={i} ref={(m) => { refs.current[i] = m; }} position={p.pos}>
          <boxGeometry args={[0.22, 0.22, 0.22]} />
          <meshStandardMaterial color={p.color} transparent />
        </mesh>
      ))}
    </>
  );
}

/* ---------- 磁碟：不在任何視窗裡的檔案 ---------- */

function Disk({ files }: { files: { name: string; note: string }[] }) {
  const all = [{ name: "scenes/*.fountain", note: "劇本檔（一直都在磁碟上）" }, ...files];
  return (
    <group position={[DISK_X, BASE_Y, 0]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[2.2, 2.2, 0.6, 48]} />
        <meshStandardMaterial color="#1b2233" metalness={0.5} roughness={0.4} />
      </mesh>
      {all.map((f, i) => (
        <group key={f.name} position={[0, 1.1 + i * 1.5, 0]}>
          <mesh>
            <boxGeometry args={[1.6, 0.12, 1.2]} />
            <meshStandardMaterial color={i === 0 ? "#6ee7a8" : "#5ec8f2"} emissive={i === 0 ? "#000" : "#5ec8f2"} emissiveIntensity={0.25} />
          </mesh>
          <Label position={[0, 0.55, 0]} color={i === 0 ? "#6ee7a8" : "#5ec8f2"} title={f.name} sub={f.note} />
        </group>
      ))}
      <Label position={[0, -0.6, 0]} color="#8a92a6" title="磁碟" sub="不佔 context · 需要時才讀" />
    </group>
  );
}

/* ---------- 組合 ---------- */

export default function Scene({ step, stepIndex }: { step: Step; stepIndex: number }) {
  return (
    <StageCanvas framing={{ centerX: 0, halfWidth: 14.8, camY: 5, targetY: -1, floorY: -6.55 }}>
      <ContextWindow
        x={MAIN_X} width={MAIN_W} blocks={step.main}
        title="主對話的 Context Window" sub="模型每次呼叫看得到的全部" showLabels
      />
      {step.sub && (
        <ContextWindow
          x={SUB_X} width={SUB_W} blocks={step.sub}
          title="子代理的 Context Window" sub="獨立、用完即丟" showLabels={false}
        />
      )}
      <Disk files={step.disk ?? []} />
      {step.debris && <Debris key={stepIndex} />}
    </StageCanvas>
  );
}
