import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { Label, type Vec3 } from "../../three/Label";
import StageCanvas from "../../three/StageCanvas";
import { KIND_COLOR, UNITS, type Block, type FlightKind, type Step } from "./steps";

const BASE_Y = -6.5;
const GAP = 0.06;
const RED = "#ff7a8a";

const MAIN_MODEL: Vec3 = [-10, 2, 0];
const MAIN_TOWER_X = -5.5;
const MAIN_W = 2.6;

const UNIT_X = [3, 8.5, 14];
const UNIT_MODEL_Y = 2.3;
const UNIT_W = 2;

/* ---------- 小工具 ---------- */

function Spin({ speed, children }: { speed: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { ref.current.rotation.y += dt * speed; });
  return <group ref={ref}>{children}</group>;
}

/** 由下往上堆疊，回傳每塊的中心高度 */
function stack(blocks: Block[]) {
  let acc = BASE_Y;
  return blocks.map((blk) => {
    const y = acc + blk.h / 2;
    acc += blk.h + GAP;
    return { blk, y };
  });
}

/* ---------- 一塊 context ---------- */

function TowerBlock({ blk, y, width, labelX }: { blk: Block; y: number; width: number; labelX?: number }) {
  const group = useRef<THREE.Group>(null!);
  const mesh = useRef<THREE.Mesh>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);

  useFrame(({ clock }, dt) => {
    const k = 1 - Math.exp(-dt * 8);
    group.current.position.y += (y - group.current.position.y) * k;
    const s = mesh.current.scale;
    s.y += (blk.h - s.y) * k;
    const pulse = 0.35 + Math.sin(clock.elapsedTime * 5) * 0.2;
    const target = blk.warn ? pulse + 0.3 : blk.hot ? pulse : 0;
    mat.current.emissiveIntensity += (target - mat.current.emissiveIntensity) * k;
  });

  const color = blk.warn ? RED : KIND_COLOR[blk.kind];
  return (
    <group ref={group} position={[0, y, 0]}>
      <mesh ref={mesh} scale={[1, 0.0001, 1]}>
        <boxGeometry args={[width, 1, width]} />
        <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={0} transparent opacity={0.9} />
      </mesh>
      {labelX !== undefined && blk.hot && !blk.noLabel && (
        <Label position={[labelX, 0, 0]} color={color} title={blk.label} />
      )}
    </group>
  );
}

/* ---------- 主片場 ---------- */

function Main({ blocks }: { blocks: Block[] }) {
  return (
    <>
      <group position={MAIN_MODEL}>
        <Spin speed={0.4}>
          <mesh>
            <icosahedronGeometry args={[1.3, 1]} />
            <meshStandardMaterial color="#c08bff" emissive="#c08bff" emissiveIntensity={0.45} flatShading />
          </mesh>
        </Spin>
        <Label position={[0, 2.1, 0]} color="#c08bff" title="主代理" sub="主片場 · 跟你對話的那一個" />
      </group>
      <group position={[MAIN_TOWER_X, 0, 0]}>
        {stack(blocks).map(({ blk, y }) => (
          <TowerBlock key={blk.id} blk={blk} y={y} width={MAIN_W} labelX={MAIN_W / 2 + 2.2} />
        ))}
        <Label position={[0, BASE_Y - 0.6, 0]} color="#8a92a6" title="主視窗" />
      </group>
    </>
  );
}

/* ---------- 第二攝製組 ---------- */

function UnitSet({ index, blocks, showTools }: { index: number; blocks: Block[] | null; showTools?: boolean }) {
  const group = useRef<THREE.Group>(null!);
  // 消失時保留上一份內容，讓縮小動畫有東西可畫
  const last = useRef<Block[]>([]);
  if (blocks) last.current = blocks;
  const shown = blocks ?? last.current;
  const u = UNITS[index];
  const x = UNIT_X[index];

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 8);
    const target = blocks ? 1 : 0.0001;
    const s = group.current.scale;
    s.setScalar(s.x + (target - s.x) * k);
    group.current.visible = s.x > 0.01;
  });

  return (
    <group ref={group} position={[x, 0, 0]} scale={0.0001}>
      {/* 獨立的片場：半透明的框 */}
      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[4.4, 11, 4.4]} />
        <meshBasicMaterial transparent opacity={0.02} depthWrite={false} />
        <Edges color="#2c3a4a" />
      </mesh>
      <group position={[0, UNIT_MODEL_Y, 0]}>
        <Spin speed={0.7}>
          <mesh>
            <icosahedronGeometry args={[0.8, 0]} />
            <meshStandardMaterial color="#c08bff" emissive="#c08bff" emissiveIntensity={0.3} flatShading />
          </mesh>
        </Spin>
      </group>
      {stack(shown).map(({ blk, y }) => (
        <TowerBlock key={blk.id} blk={blk} y={y} width={UNIT_W} />
      ))}
      {blocks && (
        <Label position={[0, 5.2, 0]} color="#5ec8f2" title={`${u.name}：${u.role}`} sub={showTools ? u.tools : undefined} />
      )}
    </group>
  );
}

/* ---------- 封包 ---------- */

function Packet({ kind, unit }: { kind: FlightKind; unit: number }) {
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(0);
  const color = kind === "brief" ? KIND_COLOR.brief : KIND_COLOR.report;

  const curve = useMemo(() => {
    const m = new THREE.Vector3(...MAIN_MODEL);
    const u = new THREE.Vector3(UNIT_X[unit], UNIT_MODEL_Y, 0);
    const [a, b] = kind === "brief" ? [m, u] : [u, m];
    const mid = a.clone().lerp(b, 0.5);
    mid.y += 3 + unit * 0.8;
    mid.z += 1.5;
    return new THREE.QuadraticBezierCurve3(a, mid, b);
  }, [kind, unit]);

  useFrame((_, dt) => {
    t.current = Math.min(1, t.current + dt / 1.5);
    const x = t.current;
    const eased = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    ref.current.position.copy(curve.getPoint(eased));
    ref.current.visible = x < 1;
  });

  return (
    <group ref={ref} position={curve.getPoint(0)}>
      <mesh>
        {kind === "brief" ? <boxGeometry args={[0.5, 0.5, 0.1]} /> : <sphereGeometry args={[0.3, 20, 20]} />}
        <meshBasicMaterial color={color} />
      </mesh>
      <pointLight color={color} intensity={6} distance={6} />
    </group>
  );
}

/* ---------- 組合 ---------- */

export default function Scene({ step, stepIndex }: { step: Step; stepIndex: number }) {
  return (
    <StageCanvas framing={{ centerX: 2, halfWidth: 15.8, camY: 5, targetY: -1, floorY: -6.55 }}>
      <Main blocks={step.main} />
      {UNITS.map((_, i) => (
        <UnitSet key={i} index={i} blocks={step.units[i]} showTools={step.showTools} />
      ))}
      {step.flights?.map((f) => (
        <Packet key={`${stepIndex}-${f.kind}-${f.unit}`} kind={f.kind} unit={f.unit} />
      ))}
    </StageCanvas>
  );
}
