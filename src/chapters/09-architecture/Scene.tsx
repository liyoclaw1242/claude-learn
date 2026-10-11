import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges, Line } from "@react-three/drei";
import * as THREE from "three";
import { Label, type Vec3 } from "../../three/Label";
import StageCanvas from "../../three/StageCanvas";
import { MODULES, ORDER, OWNER_COLOR, type ModuleKey, type Step } from "./steps";

const POS: Record<ModuleKey, Vec3> = {
  user: [-11, 0, 0],
  core: [0, 0, 0],
  context: [-5.5, 3.2, 0],
  rules: [0, 4.6, 0],
  hooks: [4.2, 0, 0],
  tools: [8, 0, 0],
  subagents: [7, 4.6, 0],
  skills: [-5.5, -3.6, 0],
  memory: [1.5, -4.6, 0],
};

/** 標籤相對於元件的位置（各自避開鄰居） */
const LABEL_OFFSET: Record<ModuleKey, Vec3> = {
  user: [0, 1.5, 0],
  core: [0, 2.1, 0],
  context: [0, 1.8, 0],
  rules: [0, 1.3, 0],
  hooks: [0, -2.0, 0],
  tools: [0, 1.2, 0],
  subagents: [0, 1.3, 0],
  skills: [0, 1.0, 0],
  memory: [0, -1.0, 0],
};

/** 連線：誰接到誰（hooks 擋在迴圈和工具之間） */
const LINKS: [ModuleKey, ModuleKey][] = [
  ["user", "core"], ["core", "context"], ["core", "rules"], ["core", "hooks"], ["hooks", "tools"],
  ["core", "subagents"], ["core", "skills"], ["core", "memory"],
];

/* ---------- 各元件的造型 ---------- */

function Spin({ speed, axis = "y", children }: { speed: number; axis?: "x" | "y" | "z"; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { ref.current.rotation[axis] += dt * speed; });
  return <group ref={ref}>{children}</group>;
}

function Shape({ k }: { k: ModuleKey }) {
  const c = MODULES[k].color;
  switch (k) {
    case "user":
      return (
        <Spin speed={0.3}>
          <mesh><boxGeometry args={[1.3, 1.3, 1.3]} /><meshStandardMaterial color={c} roughness={0.4} /></mesh>
        </Spin>
      );
    case "core":
      return (
        <>
          <group rotation={[Math.PI / 2, 0, 0]}>
            <Spin speed={0.8} axis="z">
              <mesh>
                <torusGeometry args={[1.6, 0.12, 16, 64]} />
                <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.3} />
              </mesh>
            </Spin>
          </group>
          <Spin speed={0.4}>
            <mesh>
              <icosahedronGeometry args={[0.9, 1]} />
              <meshStandardMaterial color="#c08bff" emissive="#c08bff" emissiveIntensity={0.45} flatShading />
            </mesh>
          </Spin>
        </>
      );
    case "context":
      return (
        <>
          <mesh>
            <boxGeometry args={[1.8, 2.4, 1.8]} />
            <meshStandardMaterial color="#9fb3ff" transparent opacity={0.05} depthWrite={false} />
            <Edges color={c} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, -0.9 + i * 0.45, 0]}>
              <boxGeometry args={[1.6, 0.38, 1.6]} />
              <meshStandardMaterial color={["#666c80", "#6ee7a8", c][i]} transparent opacity={0.85} />
            </mesh>
          ))}
        </>
      );
    case "rules":
      return (
        <>
          {["#666c80", "#5ec8f2", "#9fd8f0"].map((col, i) => (
            <mesh key={i} position={[0, -0.35 + i * 0.35, 0]}>
              <boxGeometry args={[2.8 - i * 0.5, 0.26, 1.6]} />
              <meshStandardMaterial color={col} />
            </mesh>
          ))}
        </>
      );
    case "hooks":
      return (
        <mesh>
          <boxGeometry args={[0.15, 2.8, 2.8]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.4} transparent opacity={0.55} />
        </mesh>
      );
    case "tools":
      return (
        <>
          {[-0.8, 0, 0.8].map((y, i) => (
            <Spin key={i} speed={0.6 + i * 0.2}>
              <mesh position={[0, y, 0]}>
                <octahedronGeometry args={[0.38]} />
                <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.2} />
              </mesh>
            </Spin>
          ))}
        </>
      );
    case "subagents":
      return (
        <>
          {[-0.9, 0.9].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <Spin speed={0.5}>
                <mesh>
                  <icosahedronGeometry args={[0.42, 0]} />
                  <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.4} flatShading />
                </mesh>
              </Spin>
              <mesh>
                <boxGeometry args={[1.2, 1.2, 1.2]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                <Edges color="#5a4a7a" />
              </mesh>
            </group>
          ))}
        </>
      );
    case "skills":
      return (
        <>
          {["#ffa94d", "#ffc078", "#e8590c"].map((col, i) => (
            <mesh key={i} position={[-0.8 + i * 0.8, 0, 0]}>
              <boxGeometry args={[0.6, 0.6, 0.6]} />
              <meshStandardMaterial color={col} />
            </mesh>
          ))}
        </>
      );
    case "memory":
      return (
        <mesh>
          <cylinderGeometry args={[1.4, 1.4, 0.5, 48]} />
          <meshStandardMaterial color="#1b2233" emissive={c} emissiveIntensity={0.25} metalness={0.5} roughness={0.4} />
        </mesh>
      );
  }
}

/* ---------- 一個元件：出現時從 0 長大，聚焦時脈動 ---------- */

function ModuleNode({ k, visible, focused, ownership, quiet }: {
  k: ModuleKey; visible: boolean; focused: boolean; ownership: boolean; quiet: boolean;
}) {
  const ref = useRef<THREE.Group>(null!);
  const m = MODULES[k];

  useFrame(({ clock }, dt) => {
    const kk = 1 - Math.exp(-dt * 8);
    const target = !visible ? 0.0001 : focused ? 1.1 + Math.sin(clock.elapsedTime * 5) * 0.06 : 1;
    const s = ref.current.scale.x + (target - ref.current.scale.x) * kk;
    ref.current.scale.setScalar(s);
    ref.current.visible = s > 0.01;
  });

  const color = ownership ? OWNER_COLOR[m.owner] : m.color;
  const sub = ownership ? m.ownerNote : focused ? m.sub : undefined;
  const title = m.ch === "—" ? m.name : `${m.ch} · ${m.name}`;
  const off = LABEL_OFFSET[k];

  return (
    <group position={POS[k]}>
      <group ref={ref} scale={0.0001}>
        <Shape k={k} />
        {ownership && (
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
            <torusGeometry args={[1.5, 0.06, 8, 48]} />
            <meshBasicMaterial color={color} />
          </mesh>
        )}
      </group>
      {visible && (
        <Label
          position={off}
          color={quiet ? "#8a92a6" : color}
          title={title}
          sub={sub}
        />
      )}
    </group>
  );
}

/* ---------- 走一次完整請求的封包 ---------- */

function Tracer({ path }: { path: ModuleKey[] }) {
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(0);
  const curve = useMemo(() => {
    const pts = path.map((k, i) => {
      const [x, y, z] = POS[k];
      // 同一站重複經過時稍微錯開，曲線才不會打結
      return new THREE.Vector3(x, y + (i % 2 ? 0.3 : -0.3), z + 1.2);
    });
    return new THREE.CatmullRomCurve3(pts, false, "centripetal");
  }, [path]);
  const trail = useMemo(() => curve.getPoints(240).map((p) => [p.x, p.y, p.z] as Vec3), [curve]);

  useFrame((_, dt) => {
    // 10 秒走完一圈，停 1.5 秒後重播
    t.current = (t.current + dt) % 11.5;
    const u = Math.min(1, t.current / 10);
    ref.current.position.copy(curve.getPoint(u));
    ref.current.visible = t.current < 10.3;
  });

  return (
    <>
      <Line points={trail} color="#f2b84b" lineWidth={1} transparent opacity={0.35} />
      <group ref={ref}>
        <mesh>
          <sphereGeometry args={[0.32, 24, 24]} />
          <meshBasicMaterial color="#f2b84b" />
        </mesh>
        <pointLight color="#f2b84b" intensity={8} distance={6} />
      </group>
    </>
  );
}

/* ---------- 組合 ---------- */

export default function Scene({ step, stepIndex }: { step: Step; stepIndex: number }) {
  const visible = new Set(step.visible);
  return (
    <StageCanvas framing={{ centerX: -1.2, halfWidth: 12.8, camY: 4, targetY: 0, floorY: -6.5 }}>
      {LINKS.filter(([a, b]) => visible.has(a) && visible.has(b)).map(([a, b]) => (
        <Line
          key={`${a}-${b}`}
          points={[POS[a], POS[b]]}
          color={step.focus && (a === step.focus || b === step.focus) ? MODULES[step.focus].color : "#2a3448"}
          lineWidth={step.focus && (a === step.focus || b === step.focus) ? 2 : 1}
        />
      ))}
      {ORDER.map((k) => (
        <ModuleNode
          key={k}
          k={k}
          visible={visible.has(k)}
          focused={step.focus === k}
          ownership={!!step.ownership}
          quiet={!!step.focus && step.focus !== k}
        />
      ))}
      {step.path && <Tracer key={stepIndex} path={step.path} />}
    </StageCanvas>
  );
}
