import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { Label, type Vec3 } from "../../three/Label";
import StageCanvas from "../../three/StageCanvas";
import { FLOORS, type Floor, type FloorId, type Spot, type Step } from "./steps";

const W = 6;
const D = 3.6;
const FLOOR_H = 1.1;
const GAP = 0.2;
const BASE_Y = -6.5;

const floorY = (i: number) => BASE_Y + i * (FLOOR_H + GAP) + FLOOR_H / 2;

const SPOTS: Record<Exclude<Spot, FloorId>, Vec3> = {
  director: [-11, -4.5, 0],
  disk: [-11, -0.5, 0],
  model: [12, 1, 0],
  sub: [12, -5, 0],
};

function spotPos(s: Spot): Vec3 {
  if (s in SPOTS) return SPOTS[s as keyof typeof SPOTS];
  const i = FLOORS.findIndex((f) => f.id === s);
  return [0, floorY(i), D / 2 + 0.4];
}

/* ---------- 一層樓 ---------- */

function FloorBlock({ floor, index, built, focus, labelRight }: {
  floor: Floor; index: number; built: boolean; focus: boolean; labelRight: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const y = floorY(index);

  useFrame(({ clock }, dt) => {
    const k = 1 - Math.exp(-dt * 8);
    // 蓋好的樓層長到完整高度；還沒蓋的只剩一片薄薄的地基線
    const target = built ? 1 : 0.04;
    const s = mesh.current.scale;
    s.y += (target - s.y) * k;
    const opacity = !built ? 0.08 : floor.ghost ? 0.18 : 0.88;
    mat.current.opacity += (opacity - mat.current.opacity) * k;
    const glow = focus ? 0.45 + Math.sin(clock.elapsedTime * 4) * 0.25 : built ? 0.12 : 0;
    mat.current.emissiveIntensity += (glow - mat.current.emissiveIntensity) * k;
  });

  const labelX = labelRight ? W / 2 + 2.6 : -W / 2 - 3.3;
  return (
    <group position={[0, y, 0]}>
      <mesh ref={mesh} scale={[1, 0.04, 1]}>
        <boxGeometry args={[W, FLOOR_H, D]} />
        <meshStandardMaterial
          ref={mat} color={floor.color} emissive={floor.color} emissiveIntensity={0}
          transparent opacity={0.08} depthWrite={!floor.ghost}
        />
        {floor.ghost && built && <Edges color={floor.color} />}
      </mesh>
      {/* 未蓋的樓層也畫外框，看得出整棟的輪廓 */}
      {!built && (
        <mesh>
          <boxGeometry args={[W, FLOOR_H, D]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges color="#2a3142" />
        </mesh>
      )}
      <Label
        position={[labelX, 0, 0]}
        color={built ? floor.color : "#4a5266"}
        title={`${floor.ch} · ${floor.name}`}
        sub={focus ? floor.code : undefined}
      />
    </group>
  );
}

/* ---------- 周邊：導演、磁碟、模型、子代理 ---------- */

function Spin({ speed, children }: { speed: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { ref.current.rotation.y += dt * speed; });
  return <group ref={ref}>{children}</group>;
}

function Surroundings({ showSub }: { showSub: boolean }) {
  return (
    <>
      <group position={SPOTS.director}>
        <mesh>
          <boxGeometry args={[1.6, 1.6, 1.6]} />
          <meshStandardMaterial color="#f2b84b" roughness={0.4} />
        </mesh>
        <Label position={[0, 1.5, 0]} color="#f2b84b" title="導演" sub="終端機輸入 · 批准修改" />
      </group>

      <group position={SPOTS.disk}>
        <mesh>
          <cylinderGeometry args={[1.6, 1.6, 0.5, 40]} />
          <meshStandardMaterial color="#1b2233" metalness={0.5} roughness={0.4} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.45 + i * 0.22, 0]}>
            <boxGeometry args={[1.4, 0.1, 1]} />
            <meshStandardMaterial color="#5ec8f2" emissive="#5ec8f2" emissiveIntensity={0.2} />
          </mesh>
        ))}
        <Label position={[0, 1.8, 0]} color="#5ec8f2" title="series/" sub="劇本 · 規則 · 筆記" />
      </group>

      <group position={SPOTS.model}>
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
        <Label position={[0, 2.3, 0]} color="#c08bff" title="claude-opus-5-5" />
      </group>

      {showSub && (
        <group position={SPOTS.sub}>
          <Spin speed={0.6}>
            <mesh>
              <icosahedronGeometry args={[0.7, 1]} />
              <meshStandardMaterial color="#ffa94d" emissive="#ffa94d" emissiveIntensity={0.4} flatShading />
            </mesh>
          </Spin>
          <mesh>
            <boxGeometry args={[2, 2, 2]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            <Edges color="#7a5a3a" />
          </mesh>
          <Label position={[0, -1.6, 0]} color="#ffa94d" title="審稿子代理" sub="獨立 messages · 唯讀" />
        </group>
      )}
    </>
  );
}

/* ---------- 沿路徑循環飛行的封包 ---------- */

function Flow({ path }: { path: Spot[] }) {
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(0);

  // 每段之間抬高一點，讓封包走弧線而不是穿過物體
  const curve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    path.forEach((s, i) => {
      const p = new THREE.Vector3(...spotPos(s));
      if (i > 0) {
        const prev = pts[pts.length - 1];
        const mid = prev.clone().lerp(p, 0.5);
        mid.y += 1.2;
        mid.z += 1.5;
        pts.push(mid);
      }
      pts.push(p);
    });
    return new THREE.CatmullRomCurve3(pts, false, "centripetal");
  }, [path]);

  const period = 1.4 * (path.length - 1);
  useFrame((_, dt) => {
    t.current = (t.current + dt / period) % 1;
    ref.current.position.copy(curve.getPointAt(t.current));
  });

  return (
    <group ref={ref} position={curve.getPointAt(0)}>
      <mesh>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <pointLight color="#ffffff" intensity={5} distance={5} />
    </group>
  );
}

/* ---------- 組合 ---------- */

export default function Scene({ step, stepIndex }: { step: Step; stepIndex: number }) {
  const built = new Set(step.built);
  const top = floorY(FLOORS.length - 1) + FLOOR_H / 2;
  return (
    <StageCanvas framing={{ centerX: 0.5, halfWidth: 15.5, camY: 5, targetY: -1, floorY: -6.55 }}>
      {FLOORS.map((f, i) => (
        <FloorBlock
          key={f.id} floor={f} index={i} built={built.has(f.id)} focus={step.focus === f.id}
          labelRight={i % 2 === 0}
        />
      ))}
      <Label position={[0, top + 0.9, 0]} color="#d8dce6" title="claude_film.py" sub={`${step.built.length} / ${FLOORS.length} 層`} />
      <Surroundings showSub={built.has("f06")} />
      {step.flow && <Flow key={stepIndex} path={step.flow} />}
    </StageCanvas>
  );
}
