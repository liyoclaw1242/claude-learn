import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges, Line } from "@react-three/drei";
import * as THREE from "three";
import { Label, type Vec3 } from "../../three/Label";
import StageCanvas from "../../three/StageCanvas";
import { COLORS, GATE_INFO, type GateKey, type GateState, type Leg, type Step, type Waypoint } from "./steps";

const LOW_Y = -3.6;

const POS: Record<Waypoint, Vec3> = {
  model: [-12, 0, 0],
  pre: [-6.5, 0, 0],
  rules: [-1, 0, 0],
  user: [-1, 5.2, 0],
  tool: [4.5, 0, 0],
  post: [10, 0, 0],
  stop: [-9.7, -1.4, 0],
  lowModel: [-12, LOW_Y, 0],
  lowPre: [-6.5, LOW_Y, 0],
  lowRules: [-1, LOW_Y, 0],
  lowTool: [4.5, LOW_Y, 0],
  lowPost: [10, LOW_Y, 0],
};

const STATE_COLOR: Record<GateState, string> = {
  idle: COLORS.idle,
  pass: COLORS.pass,
  block: COLORS.block,
  ask: COLORS.ask,
  warn: COLORS.warn,
};

function Spin({ speed, children }: { speed: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { ref.current.rotation.y += dt * speed; });
  return <group ref={ref}>{children}</group>;
}

/* ---------- 一道關卡（hook 檢查站或權限規則門） ---------- */

function Gate({ k, state, focus, mode }: { k: Exclude<GateKey, "stop">; state: GateState; focus: boolean; mode?: string }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const color = STATE_COLOR[state];
  const target = useMemo(() => new THREE.Color(color), [color]);
  const info = GATE_INFO[k];

  useFrame(({ clock }, dt) => {
    const k8 = 1 - Math.exp(-dt * 8);
    const alert = state === "block" || state === "ask" || state === "warn";
    const opacity = state === "idle" ? 0.1 : alert ? 0.35 + Math.sin(clock.elapsedTime * 6) * 0.15 : 0.3;
    mat.current.opacity += (opacity - mat.current.opacity) * k8;
    mat.current.color.lerp(target, k8);
    mat.current.emissive.copy(mat.current.color);
  });

  const sub = mode ? `模式：${mode}` : focus ? info.sub : undefined;
  return (
    <group position={POS[k]}>
      <mesh>
        <boxGeometry args={[0.3, 3.2, 3.2]} />
        <meshStandardMaterial ref={mat} color={COLORS.idle} emissiveIntensity={0.6} transparent opacity={0.1} depthWrite={false} />
        <Edges color={state === "idle" ? info.color : color} />
      </mesh>
      <Label position={[0, 2.4, 0]} color={state === "idle" ? info.color : color} title={info.title} sub={sub} />
    </group>
  );
}

/** Stop hook：套在模型外圍的一圈 */
function StopRing({ state, focus }: { state: GateState; focus: boolean }) {
  const color = state === "idle" ? GATE_INFO.stop.color : STATE_COLOR[state];
  return (
    <group position={POS.model}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <torusGeometry args={[2.9, 0.07, 12, 72]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
      </group>
      <Label position={[0, -2.3, 0]} color={color} title={GATE_INFO.stop.title} sub={focus ? GATE_INFO.stop.sub : undefined} />
    </group>
  );
}

/* ---------- 角色：模型、工具、導演 ---------- */

function Actors({ step }: { step: Step }) {
  const askingUser = step.focus === "user";
  return (
    <>
      <group position={POS.model}>
        <Spin speed={0.4}>
          <mesh>
            <icosahedronGeometry args={[1.3, 1]} />
            <meshStandardMaterial color={COLORS.model} emissive={COLORS.model} emissiveIntensity={0.45} flatShading />
          </mesh>
        </Spin>
        <mesh>
          <boxGeometry args={[4, 4, 4]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges color="#5a4a7a" />
        </mesh>
        <Label position={[0, 2.6, 0]} color={COLORS.model} title="Model" sub="只能提出要求" />
      </group>

      <group position={POS.tool}>
        <Spin speed={0.6}>
          <mesh>
            <octahedronGeometry args={[0.8]} />
            <meshStandardMaterial color={COLORS.tool} emissive={COLORS.tool} emissiveIntensity={0.2} />
          </mesh>
        </Spin>
        <Label position={[0, -1.5, 0]} color={COLORS.tool} title={step.tool.name} sub={step.tool.target} />
      </group>

      <group position={POS.user}>
        <Spin speed={0.3}>
          <mesh>
            <boxGeometry args={[1.2, 1.2, 1.2]} />
            <meshStandardMaterial
              color={COLORS.user}
              emissive={COLORS.user}
              emissiveIntensity={askingUser ? 0.6 : 0.05}
              transparent
              opacity={askingUser ? 1 : 0.35}
            />
          </mesh>
        </Spin>
        <Label position={[0, 1.2, 0]} color={COLORS.user} title="User（導演）" sub={askingUser ? "看 diff · 決定批准或拒絕" : undefined} />
      </group>
    </>
  );
}

/* ---------- 通道與回程車道 ---------- */

function Lanes() {
  return (
    <>
      <Line points={[POS.model, POS.post]} color="#24303f" lineWidth={1} />
      <Line points={[POS.rules, POS.user]} color="#24303f" lineWidth={1} dashed dashSize={0.25} gapSize={0.2} />
      <Line points={[POS.lowModel, POS.lowPost]} color="#2c3550" lineWidth={1} dashed dashSize={0.3} gapSize={0.2} />
      <Label position={[-3.8, LOW_Y - 0.6, 0]} color="#8a92a6" title="回程：tool_result" />
    </>
  );
}

/* ---------- 封包：依序走完每一段路線 ---------- */

const SPEED = 11;
const PAUSE = 0.3;

function Packet({ legs }: { legs: Leg[] }) {
  const ref = useRef<THREE.Group>(null!);
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  const light = useRef<THREE.PointLight>(null!);
  const t = useRef(0);

  const paths = useMemo(() => legs.map((leg) => {
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < leg.via.length - 1; i++) {
      path.add(new THREE.LineCurve3(new THREE.Vector3(...POS[leg.via[i]]), new THREE.Vector3(...POS[leg.via[i + 1]])));
    }
    return { path, duration: path.getLength() / SPEED, color: new THREE.Color(leg.color) };
  }), [legs]);

  useFrame((_, dt) => {
    t.current += dt;
    let acc = 0;
    for (const p of paths) {
      if (t.current <= acc + p.duration + PAUSE) {
        const u = Math.min(1, Math.max(0, (t.current - acc) / p.duration));
        ref.current.position.copy(p.path.getPointAt(u));
        mat.current.color.copy(p.color);
        light.current.color.copy(p.color);
        ref.current.visible = true;
        return;
      }
      acc += p.duration + PAUSE;
    }
    ref.current.visible = false;
  });

  return (
    <group ref={ref} position={POS[legs[0].via[0]]}>
      <mesh>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshBasicMaterial ref={mat} color={legs[0].color} />
      </mesh>
      <pointLight ref={light} intensity={6} distance={6} />
    </group>
  );
}

/* ---------- 組合 ---------- */

export default function Scene({ step, stepIndex }: { step: Step; stepIndex: number }) {
  const st = (k: GateKey): GateState => step.state?.[k] ?? "idle";
  return (
    <StageCanvas framing={{ centerX: -1, halfWidth: 14.6, camY: 5, targetY: 0.6, floorY: -5.2 }}>
      <Lanes />
      <Actors step={step} />
      {(["pre", "rules", "post"] as const).map((k) =>
        step.gates.includes(k) && (
          <Gate key={k} k={k} state={st(k)} focus={step.focus === k} mode={k === "rules" ? step.mode : undefined} />
        ),
      )}
      {step.gates.includes("stop") && <StopRing state={st("stop")} focus={step.focus === "stop"} />}
      {/* key 讓每一步都重新掛載封包，動畫從頭播放 */}
      <Packet key={stepIndex} legs={step.legs} />
    </StageCanvas>
  );
}
