import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { Label, type Vec3 } from "../../three/Label";
import StageCanvas from "../../three/StageCanvas";
import { TOOLS, type Flight, type Result, type Step, type ToolId } from "./steps";

const MODEL_POS: Vec3 = [-2, 2.5, 0];
const TOOL_Y = -4;
const TOWER_X = 10;
const TOWER_W = 2.6;
const BASE_Y = -6.5;
/** 示意 token 量 → 3D 高度 */
const UNIT = 0.22;

const RESULT_COLOR: Record<Result["kind"], string> = {
  ok: "#6ee7a8",
  big: "#8a92a6",
  error: "#ff7a8a",
  defs: "#3f7f8f",
};

/** 劇本工具排成一排；萬用的 script_tool 只在第 2 步單獨出現，放在中間 */
const TOOL_POS: Record<ToolId, Vec3> = Object.fromEntries(
  TOOLS.map((t, i) => [t.id, t.id === "script_tool" ? [-2, TOOL_Y, 0] : [-11 + i * 3.2, TOOL_Y, 0]]),
) as Record<ToolId, Vec3>;

/* ---------- 小工具 ---------- */

function Spin({ speed, children }: { speed: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { ref.current.rotation.y += dt * speed; });
  return <group ref={ref}>{children}</group>;
}

/** 依 visible 平滑縮放出現 / 消失 */
function Appear({ visible, position, children }: { visible: boolean; position: Vec3; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 8);
    const s = ref.current.scale.x + ((visible ? 1 : 0.0001) - ref.current.scale.x) * k;
    ref.current.scale.setScalar(s);
    ref.current.visible = s > 0.01;
  });
  return <group ref={ref} position={position} scale={0.0001}>{children}</group>;
}

/* ---------- 模型與工具 ---------- */

function Model({ call }: { call?: string }) {
  return (
    <group position={MODEL_POS}>
      <Spin speed={0.4}>
        <mesh>
          <icosahedronGeometry args={[1.2, 1]} />
          <meshStandardMaterial color="#c08bff" emissive="#c08bff" emissiveIntensity={0.45} flatShading />
        </mesh>
      </Spin>
      <mesh>
        <boxGeometry args={[3.4, 3.4, 3.4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges color="#5a4a7a" />
      </mesh>
      <Label position={[-4.8, 0, 0]} color="#c08bff" title="Model" sub="只讀得到名稱、說明、參數格式" />
      {call && <Label position={[0, 2.5, 0]} color="#f2b84b" title="tool_use" sub={call} />}
    </group>
  );
}

function Tool({ id, color, sub, index, visible, focus }: {
  id: ToolId; color: string; sub: string; index: number; visible: boolean; focus: boolean;
}) {
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(({ clock }, dt) => {
    const k = 1 - Math.exp(-dt * 8);
    const target = focus ? 0.6 + Math.sin(clock.elapsedTime * 5) * 0.3 : 0.12;
    mat.current.emissiveIntensity += (target - mat.current.emissiveIntensity) * k;
  });
  // 相鄰工具的標籤上下錯開；萬用工具單獨出現，放下方
  const labelY = id === "script_tool" || index % 2 === 0 ? -1.2 : 1.2;
  return (
    <Appear visible={visible} position={TOOL_POS[id]}>
      <Spin speed={focus ? 1.5 : 0.3}>
        <mesh>
          <octahedronGeometry args={[0.7]} />
          <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={0.12} />
        </mesh>
      </Spin>
      {visible && <Label position={[0, labelY, 0]} color={color} title={id} sub={focus ? sub : undefined} />}
    </Appear>
  );
}

/** 第 9 步：接上大量 MCP 工具（排在後方一排的小八面體） */
function McpRow({ visible }: { visible: boolean }) {
  const xs = useMemo(() => Array.from({ length: 14 }, (_, i) => -11 + i * 1.3), []);
  return (
    <Appear visible={visible} position={[0, -1.2, -3]}>
      {xs.map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <octahedronGeometry args={[0.32]} />
          <meshStandardMaterial color="#ff9f6e" emissive="#ff9f6e" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {visible && <Label position={[8.8, 0, 0]} color="#ff9f6e" title="＋ 一大串 MCP 工具" />}
    </Appear>
  );
}

/* ---------- 回到 context 的東西 ---------- */

type Placed = { r: Result; y: number; h: number };

function layout(results: Result[]) {
  let acc = BASE_Y;
  const placed: Placed[] = results.map((r) => {
    const h = r.size * UNIT;
    // 虛線對照框都從底部起算，不參與堆疊
    if (r.ghost) return { r, y: BASE_Y + h / 2, h };
    const y = acc + h / 2;
    acc += h + 0.06;
    return { r, y, h };
  });
  return { placed, top: acc };
}

function ResultBlock({ p, labelSide, labelY }: { p: Placed; labelSide: number; labelY: number }) {
  const group = useRef<THREE.Group>(null!);
  const mesh = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 8);
    group.current.position.y += (p.y - group.current.position.y) * k;
    const s = mesh.current.scale;
    s.y += (p.h - s.y) * k;
  });
  const color = RESULT_COLOR[p.r.kind];
  const w = p.r.ghost ? TOWER_W + 0.3 : TOWER_W;
  return (
    <group ref={group} position={[TOWER_X, p.y, 0]}>
      <mesh ref={mesh} scale={[1, 0.0001, 1]}>
        <boxGeometry args={[w, 1, w]} />
        {p.r.ghost
          ? <meshBasicMaterial transparent opacity={0.03} depthWrite={false} />
          : <meshStandardMaterial color={color} transparent opacity={0.9} />}
        {p.r.ghost && <Edges color="#8a92a6" />}
      </mesh>
      <Label
        position={[labelSide * (TOWER_W / 2 + 2.6), labelY - p.y, 0]}
        color={p.r.ghost ? "#8a92a6" : color}
        title={p.r.ghost ? p.r.label : `${p.r.label}（≈${p.r.size}）`}
      />
    </group>
  );
}

function Tower({ results }: { results: Result[] }) {
  const { placed } = layout(results);
  // 標籤至少間隔 LABEL_GAP，薄方塊的標籤才不會疊在一起
  const LABEL_GAP = 1.7;
  let last = -Infinity;
  const labelYs = placed.map((p) => {
    if (p.r.ghost) return p.y + p.h / 2 - 0.3;
    last = Math.max(p.y, last + LABEL_GAP);
    return last;
  });
  return (
    <>
      {placed.map((p, i) => (
        // 對照框的標籤放左邊，其餘放右邊，避免疊在一起
        <ResultBlock key={p.r.id} p={p} labelSide={p.r.ghost ? -1 : 1} labelY={labelYs[i]} />
      ))}
      <Label
        // 固定在最高的塔（讀全文）上方，不會壓到小方塊的標籤
        position={[TOWER_X, BASE_Y + 30 * UNIT + 1.2, 0]}
        color="#d8dce6"
        title="回到 context 的東西"
        sub="方塊高度 = 示意的 token 量"
      />
    </>
  );
}

/* ---------- 飛行：模型 → 工具 → 結果塔 ---------- */

function Packet({ flight, towerTop }: { flight: Flight; towerTop: number }) {
  const ref = useRef<THREE.Group>(null!);
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  const t = useRef(-flight.delay);

  const [go, back] = useMemo(() => {
    const m = new THREE.Vector3(...MODEL_POS);
    const tool = new THREE.Vector3(...TOOL_POS[flight.to]);
    const tower = new THREE.Vector3(TOWER_X, towerTop + 0.4, 0);
    const mid1 = m.clone().lerp(tool, 0.5).add(new THREE.Vector3(0, 0.5, 1.5));
    const mid2 = tool.clone().lerp(tower, 0.5).add(new THREE.Vector3(0, 3, 1.5));
    return [new THREE.QuadraticBezierCurve3(m, mid1, tool), new THREE.QuadraticBezierCurve3(tool, mid2, tower)];
  }, [flight, towerTop]);

  useFrame((_, dt) => {
    t.current += dt;
    const x = t.current;
    const ease = (v: number) => (v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2);
    ref.current.visible = x >= 0 && x < 2.2;
    if (x < 0) return;
    if (x < 1) {
      ref.current.position.copy(go.getPoint(ease(x)));
      mat.current.color.set("#f2b84b");
    } else {
      ref.current.position.copy(back.getPoint(ease(Math.min(1, Math.max(0, x - 1.2)))));
      mat.current.color.set(flight.error ? "#ff7a8a" : "#6ee7a8");
    }
  });

  return (
    <group ref={ref} visible={false}>
      <mesh>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshBasicMaterial ref={mat} color="#f2b84b" />
      </mesh>
      <pointLight color="#f2b84b" intensity={5} distance={5} />
    </group>
  );
}

/* ---------- 組合 ---------- */

export default function Scene({ step, stepIndex }: { step: Step; stepIndex: number }) {
  const visible = new Set(step.tools);
  const focus = new Set(step.focus ?? []);
  const { top } = layout(step.results);
  let scriptIndex = 0;

  return (
    <StageCanvas framing={{ centerX: 1.5, halfWidth: 15.5, camY: 5, targetY: -0.8, floorY: -6.55 }}>
      <Model call={step.call} />
      {TOOLS.map((t) => (
        <Tool
          key={t.id}
          {...t}
          index={t.id === "script_tool" ? 0 : scriptIndex++}
          visible={visible.has(t.id)}
          focus={focus.has(t.id)}
        />
      ))}
      <McpRow visible={!!step.mcp} />
      <Tower results={step.results} />
      {step.flights?.map((f, i) => (
        <Packet key={`${stepIndex}-${i}`} flight={f} towerTop={top} />
      ))}
    </StageCanvas>
  );
}
