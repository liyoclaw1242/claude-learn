import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges, Line } from "@react-three/drei";
import * as THREE from "three";
import { Label, type Vec3 } from "../../three/Label";
import StageCanvas from "../../three/StageCanvas";
import { FILES, KIND_COLOR, LAYERS, type Layer, type Section, type Step } from "./steps";

const STACK_W = 4.4;
const BASE_Y = -6.5;
const LAYER_GAP = 0.08;
const SECTION_GAP = 0.4;
/** 堆疊左緣再往左一點：檔案連線與快取括號都接在這裡 */
const EDGE_X = -STACK_W / 2 - 0.5;

const MODEL_POS: Vec3 = [13, 2, 0];
const EDIT_POS: Vec3 = [13, -4.5, 0];
const WALL_Y = -1.6;
const FILE_X = -9;

const SECTION_NAME: Record<Section, string> = { tools: "tools", system: "system", messages: "messages[]" };
const RED = "#ff7a8a";
const GREEN = "#6ee7a8";

/* ---------- 版面：依目前可見的層計算每層的位置 ---------- */

type Placed = { layer: Layer; y: number; h: number; visible: boolean };

function layout(visible: Set<string>) {
  let acc = BASE_Y;
  let prev: Section | null = null;
  const placed: Placed[] = LAYERS.map((layer) => {
    if (!visible.has(layer.id)) return { layer, y: acc, h: 0, visible: false };
    if (prev && prev !== layer.section) acc += SECTION_GAP;
    const y = acc + layer.h / 2;
    acc += layer.h + LAYER_GAP;
    prev = layer.section;
    return { layer, y, h: layer.h, visible: true };
  });
  return { placed, top: Math.max(BASE_Y, acc) };
}

/* ---------- 請求裡的一層 ---------- */

function StackLayer({ p, hot, cache, changed, sub, labelX }: {
  p: Placed; hot: boolean; cache?: Step["cache"]; changed: boolean; sub?: string; labelX: number;
}) {
  const group = useRef<THREE.Group>(null!);
  const mesh = useRef<THREE.Mesh>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const glow = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }, dt) => {
    const k = 1 - Math.exp(-dt * 8);
    group.current.position.y += (p.y - group.current.position.y) * k;
    const s = mesh.current.scale;
    s.y += (Math.max(p.h - LAYER_GAP, 0.0001) - s.y) * k;
    mesh.current.visible = s.y > 0.002;

    // 發光：新加入 = 自身顏色脈動；被改動 = 紅色脈動；快取失效 = 淡紅；快取命中 = 淡綠
    const pulse = 0.35 + Math.sin(clock.elapsedTime * 5) * 0.25;
    let intensity = 0;
    if (changed) { glow.set(RED); intensity = pulse + 0.3; }
    else if (hot) { glow.set(KIND_COLOR[p.layer.kind]); intensity = pulse; }
    else if (cache === "miss") { glow.set(RED); intensity = 0.3; }
    else if (cache === "hit") { glow.set(GREEN); intensity = 0.18; }
    mat.current.emissive.copy(glow);
    mat.current.emissiveIntensity += (intensity - mat.current.emissiveIntensity) * k;
  });

  return (
    <group ref={group} position={[0, p.y, 0]}>
      <mesh ref={mesh} scale={[1, 0.0001, 1]}>
        <boxGeometry args={[STACK_W, 1, 3]} />
        <meshStandardMaterial ref={mat} color={KIND_COLOR[p.layer.kind]} transparent opacity={0.9} />
      </mesh>
      {p.visible && (
        <Label position={[labelX, 0, 0]} color={KIND_COLOR[p.layer.kind]} title={p.layer.label} sub={sub} />
      )}
    </group>
  );
}

/* ---------- 第 1 步：還沒有內容時，畫出三個空格 ---------- */

function EmptySlots() {
  const slots: [Section, number][] = [["tools", 1.1], ["system", 2.2], ["messages", 4.5]];
  let acc = BASE_Y;
  return (
    <>
      {slots.map(([name, h]) => {
        const y = acc + h / 2;
        acc += h + SECTION_GAP;
        return (
          <group key={name} position={[0, y, 0]}>
            <mesh>
              <boxGeometry args={[STACK_W, h, 3]} />
              <meshBasicMaterial transparent opacity={0.03} depthWrite={false} />
              <Edges color="#3a4258" />
            </mesh>
            <Label position={[0, 0, 0]} color="#8a92a6" title={SECTION_NAME[name]} />
          </group>
        );
      })}
    </>
  );
}

/* ---------- 磁碟上的檔案 ---------- */

function Files({ placed, hot }: { placed: Placed[]; hot: Set<string> }) {
  const byId = new Map(placed.map((p) => [p.layer.id, p]));
  // 依對應層在堆疊中的順序排列，連線才不會交叉
  const order = [...FILES].sort(
    (a, b) => LAYERS.findIndex((l) => l.id === a.layer) - LAYERS.findIndex((l) => l.id === b.layer),
  );
  return (
    <>
      {order.map((f, i) => {
        const y = -4.7 + i * 2.4;
        const p = byId.get(f.layer)!;
        const color = KIND_COLOR[p.layer.kind];
        return (
          <group key={f.id}>
            <mesh position={[FILE_X, y, 0]}>
              <boxGeometry args={[1.8, 0.12, 1.2]} />
              <meshStandardMaterial
                color={p.visible ? color : "#2a3040"}
                emissive={p.visible ? color : "#000000"}
                emissiveIntensity={hot.has(f.layer) ? 0.6 : 0.15}
              />
            </mesh>
            <Label position={[FILE_X, y + 0.6, 0]} color={p.visible ? color : "#6b7385"} title={f.name} sub={f.note} />
            {hot.has(f.layer) && (
              <Line points={[[FILE_X + 0.9, y, 0], [EDGE_X, p.y, 0]]} color={color} lineWidth={1.5} dashed dashSize={0.25} gapSize={0.15} />
            )}
          </group>
        );
      })}
      <Label position={[FILE_X, -6.6, 0]} color="#8a92a6" title="磁碟" sub="檔案本身不在請求裡" />
    </>
  );
}

/* ---------- 模型（密室）與 hook 擋板 ---------- */

function Spin({ speed, children }: { speed: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { ref.current.rotation.y += dt * speed; });
  return <group ref={ref}>{children}</group>;
}

function Model() {
  return (
    <group position={MODEL_POS}>
      <Spin speed={0.4}>
        <mesh>
          <icosahedronGeometry args={[1.3, 1]} />
          <meshStandardMaterial color="#c08bff" emissive="#c08bff" emissiveIntensity={0.45} flatShading />
        </mesh>
      </Spin>
      <mesh>
        <boxGeometry args={[4, 4, 4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges color="#5a4a7a" />
      </mesh>
      <Label position={[0, 2.6, 0]} color="#c08bff" title="Model" sub="只看得到請求裡的東西" />
    </group>
  );
}

function Gate() {
  return (
    <>
      <Line points={[[MODEL_POS[0], MODEL_POS[1] - 2, 0], EDIT_POS]} color="#24303f" lineWidth={1} />
      <mesh position={[MODEL_POS[0], WALL_Y, 0]}>
        <boxGeometry args={[3.4, 0.15, 3.4]} />
        <meshStandardMaterial color={RED} emissive={RED} emissiveIntensity={0.5} transparent opacity={0.75} />
      </mesh>
      <Label position={[MODEL_POS[0], WALL_Y - 1, 0]} color={RED} title="權限規則 / hook" sub="執行前檢查 · 違規直接拒絕" />
      <group position={EDIT_POS}>
        <mesh>
          <octahedronGeometry args={[0.7]} />
          <meshStandardMaterial color={GREEN} emissive={GREEN} emissiveIntensity={0.15} />
        </mesh>
        <Label position={[0, -1.2, 0]} color={GREEN} title="Edit" sub="season1/ep05/scene_03" />
      </group>
    </>
  );
}

/* ---------- 飛行動畫 ---------- */

function Packet({ kind, top, readTarget }: { kind: NonNullable<Step["flight"]>; top: number; readTarget: Vec3 }) {
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(0);

  const { curve, color } = useMemo(() => {
    const m = new THREE.Vector3(...MODEL_POS);
    let a: THREE.Vector3, b: THREE.Vector3, lift: number, color: string;
    if (kind === "send") {
      a = new THREE.Vector3(0, top + 0.3, 0); b = m; lift = 3; color = GREEN;
    } else if (kind === "read") {
      a = m; b = new THREE.Vector3(...readTarget); lift = 6; color = "#5ec8f2";
    } else {
      a = m.clone().setY(MODEL_POS[1] - 2); b = new THREE.Vector3(MODEL_POS[0], WALL_Y + 0.35, 0); lift = 0; color = RED;
    }
    const mid = a.clone().lerp(b, 0.5);
    mid.y += lift;
    mid.z += lift ? 1.5 : 0;
    return { curve: new THREE.QuadraticBezierCurve3(a, mid, b), color };
  }, [kind, top, readTarget]);

  useFrame(({ clock }, dt) => {
    t.current = Math.min(1, t.current + dt / 1.4);
    const x = t.current;
    const eased = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    ref.current.position.copy(curve.getPoint(eased));
    // 被擋下的封包停在擋板上閃爍；其他的抵達後消失
    if (kind === "blocked") ref.current.scale.setScalar(x < 1 ? 1 : 1 + Math.sin(clock.elapsedTime * 8) * 0.25);
    else ref.current.visible = x < 1;
  });

  return (
    <group ref={ref} position={curve.getPoint(0)}>
      <mesh>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <pointLight color={color} intensity={6} distance={6} />
    </group>
  );
}

/* ---------- 組合 ---------- */

export default function Scene({ step, stepIndex }: { step: Step; stepIndex: number }) {
  const visible = useMemo(() => new Set(step.layers), [step.layers]);
  const hot = useMemo(() => new Set(step.hot ?? []), [step.hot]);
  const { placed, top } = layout(visible);
  // 相鄰層的標籤左右交錯，避免薄層的標籤疊在一起
  const labelCol = new Map(placed.filter((p) => p.visible).map((p, i) => [p.layer.id, i % 2 === 1]));

  // 每個區段（tools / system / messages）的中線，用來放區段標籤
  const sections = (["tools", "system", "messages"] as Section[]).flatMap((s) => {
    const ps = placed.filter((p) => p.visible && p.layer.section === s);
    if (!ps.length) return [];
    const lo = ps[0].y - ps[0].h / 2;
    const hi = ps[ps.length - 1].y + ps[ps.length - 1].h / 2;
    return [{ s, y: (lo + hi) / 2 }];
  });

  const readTarget: Vec3 = useMemo(() => {
    const order = [...FILES].sort(
      (a, b) => LAYERS.findIndex((l) => l.id === a.layer) - LAYERS.findIndex((l) => l.id === b.layer),
    );
    const i = order.findIndex((f) => f.id === "fScene");
    return [FILE_X + 0.9, -4.7 + i * 2.4, 0];
  }, []);

  const headline =
    step.cache === "hit" ? { title: "快取命中", sub: "前綴跟上次逐字相同 · 直接重用", color: GREEN }
    : step.cache === "miss" ? { title: "快取失效", sub: "改動點以上全部重算", color: RED }
    : { title: "一次 API 請求", sub: "由下往上 = 送出順序", color: "#d8dce6" };

  return (
    <StageCanvas framing={{ centerX: 2, halfWidth: 15.5, camY: 6, targetY: -0.5, floorY: -6.55 }}>
      {step.layers.length === 0 && <EmptySlots />}
      {placed.map((p) => (
        <StackLayer
          labelX={STACK_W / 2 + (labelCol.get(p.layer.id) ? 5.6 : 2.2)}
          key={p.layer.id}
          p={p}
          hot={hot.has(p.layer.id)}
          cache={step.cache}
          changed={step.changed === p.layer.id}
          // 只有本步驟的焦點層顯示副標，其餘只留名稱，避免標籤擠在一起
          sub={step.note?.[p.layer.id] ?? (hot.has(p.layer.id) || step.changed === p.layer.id || step.layers.length <= 3 ? p.layer.sub : undefined)}
        />
      ))}
      {sections.map(({ s, y }) => (
        <Label key={s} position={[-STACK_W / 2 - 2.3, y, 0]} color="#8a92a6" title={SECTION_NAME[s]} />
      ))}
      {step.layers.length > 0 && (
        <Label position={[0, top + 0.9, 0]} color={headline.color} title={headline.title} sub={headline.sub} />
      )}

      {/* 快取括號：從最底層一路到頂 */}
      {step.cache && (
        <Line
          points={[[EDGE_X + 0.25, BASE_Y, 0], [EDGE_X, BASE_Y, 0], [EDGE_X, top, 0], [EDGE_X + 0.25, top, 0]]}
          color={step.cache === "hit" ? GREEN : RED}
          lineWidth={2.5}
        />
      )}

      <Files placed={placed} hot={hot} />
      <Model />
      {step.gate && <Gate />}
      {step.flight && <Packet key={stepIndex} kind={step.flight} top={top} readTarget={readTarget} />}
    </StageCanvas>
  );
}
