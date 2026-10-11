import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges, Line } from "@react-three/drei";
import * as THREE from "three";
import { Label, type Vec3 } from "../../three/Label";
import StageCanvas from "../../three/StageCanvas";
import { COLORS, type Flight, type Msg, type NodeKey, type Step } from "./steps";

const POS: Record<NodeKey, Vec3> = {
  user: [-10, 0, 0],
  harness: [-3, 0, 0],
  model: [5, 0, 0],
  Read: [-6.5, -5, 0],
  Edit: [-3, -5, 0],
  Bash: [0.5, -5, 0],
};
const TOWER_POS: Vec3 = [11, -6.8, 0];
const TOOLS: NodeKey[] = ["Read", "Edit", "Bash"];
/** 場景左右兩端（User x=-10、塔 x=11）的中點 */
const CENTER_X = 0.5;

const ROLE_COLOR: Record<Msg["kind"], string> = {
  system: COLORS.system,
  user: COLORS.user,
  assistant: COLORS.model,
  tool_result: COLORS.tool,
};

/* ---------- 小工具 ---------- */

/** 當前步驟的焦點節點會脈動放大 */
function Node({ k, focus, children }: { k: NodeKey; focus: NodeKey; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const s = k === focus ? 1.12 + Math.sin(clock.elapsedTime * 5) * 0.08 : 1;
    ref.current.scale.lerp(target.setScalar(s), 0.15);
  });
  return <group ref={ref} position={POS[k]}>{children}</group>;
}

function Spin({ speed, axis = "y", children }: { speed: number; axis?: "x" | "y" | "z"; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { ref.current.rotation[axis] += dt * speed; });
  return <group ref={ref}>{children}</group>;
}

/* ---------- 角色 ---------- */

function Actors({ focus }: { focus: NodeKey }) {
  return (
    <>
      <Node k="user" focus={focus}>
        <Spin speed={0.3}>
          <mesh>
            <boxGeometry args={[1.6, 1.6, 1.6]} />
            <meshStandardMaterial color={COLORS.user} roughness={0.4} />
          </mesh>
        </Spin>
        <Label position={[0, 1.7, 0]} color={COLORS.user} title="User" sub="你 / 導演" />
      </Node>

      <Node k="harness" focus={focus}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <Spin speed={0.8} axis="z">
            <mesh>
              <torusGeometry args={[1.5, 0.12, 16, 64]} />
              <meshStandardMaterial color={COLORS.harness} emissive={COLORS.harness} emissiveIntensity={0.3} />
            </mesh>
          </Spin>
        </group>
        <mesh>
          <cylinderGeometry args={[0.6, 0.6, 1.2, 6]} />
          <meshStandardMaterial color="#1d3b4a" metalness={0.6} roughness={0.3} />
        </mesh>
        <Label position={[0, 2.2, 0]} color={COLORS.harness} title="Harness" sub="Claude Code 本體 · while 迴圈" />
      </Node>

      <Node k="model" focus={focus}>
        <Spin speed={0.4}>
          <mesh>
            <icosahedronGeometry args={[1.4, 1]} />
            <meshStandardMaterial color={COLORS.model} emissive={COLORS.model} emissiveIntensity={0.45} flatShading />
          </mesh>
        </Spin>
        {/* 密室 */}
        <mesh>
          <boxGeometry args={[4, 4, 4]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges color="#5a4a7a" />
        </mesh>
        <Label position={[0, 2.6, 0]} color={COLORS.model} title="Model (Claude)" sub="無狀態函數 · 密室裡的編劇" />
      </Node>

      {TOOLS.map((t) => (
        <Node key={t} k={t} focus={focus}>
          <mesh>
            <octahedronGeometry args={[0.7]} />
            <meshStandardMaterial color={COLORS.tool} emissive={COLORS.tool} emissiveIntensity={0.15} />
          </mesh>
          <Label position={[0, 1.1, 0]} color={COLORS.tool} title={t} />
        </Node>
      ))}

      {/* 連線 */}
      {(["user", "model", ...TOOLS] as NodeKey[]).map((k) => (
        <Line key={k} points={[POS.harness, POS[k]]} color="#24303f" lineWidth={1} />
      ))}
    </>
  );
}

/* ---------- messages[] 塔 ---------- */

function towerLayers(msgs: Msg[]) {
  let y = 0;
  return msgs.map((m) => {
    const h = Math.max(0.25, m.tok / 120);
    const layer = { kind: m.kind, h, y: y + h / 2 };
    y += h;
    return layer;
  });
}

function Tower({ msgs, newFrom }: { msgs: Msg[]; newFrom: number }) {
  const layers = towerLayers(msgs);
  return (
    <group position={TOWER_POS}>
      {layers.map((l, i) => {
        const isNew = i >= newFrom;
        return (
          <mesh key={i} position={[0, l.y, 0]}>
            <boxGeometry args={[2.4, l.h * 0.92, 2.4]} />
            <meshStandardMaterial
              color={ROLE_COLOR[l.kind]}
              emissive={isNew ? COLORS.ctx : "#000000"}
              emissiveIntensity={isNew ? 0.55 : 0}
              transparent
              opacity={0.9}
            />
          </mesh>
        );
      })}
      <Label position={[0, -1.4, 0]} color={COLORS.ctx} title="messages[]" sub="context window · 每次呼叫整疊送出" />
    </group>
  );
}

/* ---------- 飛行中的訊息封包 ---------- */

function Packet({ flight, msgs }: { flight: Flight; msgs: Msg[] }) {
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(0);

  const curve = useMemo(() => {
    const a = new THREE.Vector3(...(flight.from === "tower" ? TOWER_POS : POS[flight.from]));
    const b = new THREE.Vector3(...POS[flight.to]);
    if (flight.from === "tower") a.y += 1.5;
    const mid = a.clone().lerp(b, 0.5);
    mid.y += a.y === b.y ? 2.5 : 1;
    mid.z += 1.5;
    return new THREE.QuadraticBezierCurve3(a, mid, b);
  }, [flight]);

  useFrame((_, dt) => {
    t.current = Math.min(1, t.current + dt / 1.3);
    const x = t.current;
    const eased = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    ref.current.position.copy(curve.getPoint(eased));
    ref.current.visible = x < 1;
  });

  return (
    <group ref={ref} position={curve.getPoint(0)}>
      <mesh>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshBasicMaterial color={flight.color} />
      </mesh>
      <pointLight color={flight.color} intensity={6} distance={6} />
      {/* API 呼叫時，縮小版的整疊 context 跟著飛 */}
      {flight.carryCtx && (
        <group scale={0.3}>
          {towerLayers(msgs).map((l, i) => (
            <mesh key={i} position={[0, l.y, 0]}>
              <boxGeometry args={[2.4, l.h * 0.92, 2.4]} />
              <meshStandardMaterial color={ROLE_COLOR[l.kind]} transparent opacity={0.35} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/* ---------- 組合 ---------- */

export default function Scene({ step, stepIndex }: { step: Step; stepIndex: number }) {
  return (
    <StageCanvas framing={{ centerX: CENTER_X, halfWidth: 14.5 }}>
      <Actors focus={step.focus} />
      <Tower msgs={step.msgs} newFrom={step.newFrom} />
      {/* key 讓每一步都重新掛載封包，動畫從頭播放 */}
      {step.fly && <Packet key={stepIndex} flight={step.fly} msgs={step.msgs} />}
    </StageCanvas>
  );
}
