import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges, Line } from "@react-three/drei";
import * as THREE from "three";
import { Label, type Vec3 } from "../../three/Label";
import StageCanvas from "../../three/StageCanvas";
import {
  CARDS, CARD_COLOR, KIND_COLOR, SESSION_NAME,
  type Block, type CardId, type CardState, type Place, type Session, type SessionId, type Step,
} from "./steps";

const BOX_W = 4.2;
const BOX_H = 7.6;
/** steps 裡的高度是相對值，這裡統一放大 */
const H_SCALE = 1.35;
const BOX_BASE = -2.1;
const SESSION_X: Record<SessionId, number> = { d1: -9, d2: 0, d3: 9 };
const CARD_Y = -5.2;
const CARD_X: Record<CardId, number> = { idx: -8.4, user: -4.2, fb: 0, proj: 4.2, ref: 8.4, rej: 12.6 };
const GAP = 0.06;

const STATE_TEXT: Record<Session["state"], string> = {
  idle: "尚未開始",
  active: "進行中",
  done: "已結束 · context 清空",
};

/** 飛行動畫的起訖點：session 箱子中段，或檔案卡片 */
function placePos(p: Place): Vec3 {
  if (p === "d1" || p === "d2" || p === "d3") return [SESSION_X[p], BOX_BASE + 2.2, 0];
  return [CARD_X[p], CARD_Y + 0.2, 0];
}

/* ---------- 箱子裡的一塊 context ---------- */

function StackBlock({ block, y, labelSide }: { block: Block; y: number; labelSide: 0 | 1 | -1 }) {
  const group = useRef<THREE.Group>(null!);
  const mesh = useRef<THREE.Mesh>(null!);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 8);
    group.current.position.y += (y - group.current.position.y) * k;
    const s = mesh.current.scale;
    s.y += (Math.max(block.h * H_SCALE - GAP, 0.0001) - s.y) * k;
    mesh.current.visible = s.y > 0.002;
  });

  return (
    <group ref={group} position={[0, y, 0]}>
      <mesh ref={mesh} scale={[1, 0.0001, 1]}>
        <boxGeometry args={[BOX_W - 0.3, 1, BOX_W - 0.3]} />
        <meshStandardMaterial color={KIND_COLOR[block.kind]} transparent opacity={0.88} />
      </mesh>
      {labelSide !== 0 && block.h > 0 && (
        <Label position={[labelSide * (BOX_W / 2 + 2), 0, 0]} color={KIND_COLOR[block.kind]} title={block.label} />
      )}
    </group>
  );
}

/* ---------- 一次 session = 一個會清空的 context 箱 ---------- */

function SessionBox({ id, session, transcript }: { id: SessionId; session: Session; transcript: boolean }) {
  const x = SESSION_X[id];
  const active = session.state === "active";
  const edge = active ? "#c08bff" : session.state === "done" ? "#2c3244" : "#232838";

  let acc = BOX_BASE;
  const placed = session.blocks.map((blk) => {
    const h = blk.h * H_SCALE;
    const y = acc + h / 2;
    acc += h;
    return { blk, y };
  });

  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, BOX_BASE + BOX_H / 2, 0]}>
        <boxGeometry args={[BOX_W, BOX_H, BOX_W]} />
        <meshStandardMaterial color="#9fb3ff" transparent opacity={active ? 0.05 : 0.02} depthWrite={false} />
        <Edges color={edge} />
      </mesh>
      {/* 只有進行中的 session 顯示標籤；相鄰區塊左右交錯，避免薄區塊的標籤疊在一起 */}
      {placed.map(({ blk, y }, i) => (
        <StackBlock key={blk.id} block={blk} y={y} labelSide={active ? (i % 2 === 0 ? 1 : -1) : 0} />
      ))}
      <Label
        position={[0, BOX_BASE + BOX_H + 0.7, 0]}
        color={active ? "#d8dce6" : "#6b7385"}
        title={SESSION_NAME[id]}
        sub={STATE_TEXT[session.state]}
      />
      {transcript && (
        <group position={[0, BOX_BASE - 0.55, 0]}>
          {/* 膠卷：整段對話的逐字紀錄 */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.28, 0.28, 3, 32]} />
            <meshStandardMaterial color="#8a92a6" metalness={0.4} roughness={0.5} />
          </mesh>
          <Label position={[3.3, 0, 0]} color="#8a92a6" title="transcript .jsonl" />
        </group>
      )}
    </group>
  );
}

/* ---------- 記憶目錄裡的一個檔案 ---------- */

function MemoryCard({ id, file, type, state, below }: {
  id: CardId; file: string; type: string; state: CardState; below: boolean;
}) {
  const ref = useRef<THREE.Group>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const shown = state !== "hidden";
  const color = CARD_COLOR[state];

  useFrame(({ clock }, dt) => {
    const k = 1 - Math.exp(-dt * 8);
    const s = ref.current.scale;
    const target = shown ? 1 : 0.0001;
    s.setScalar(s.x + (target - s.x) * k);
    ref.current.visible = s.x > 0.01;
    const pulse = state === "hot" || state === "stale" ? 0.45 + Math.sin(clock.elapsedTime * 5) * 0.3 : 0.15;
    mat.current.emissiveIntensity += (pulse - mat.current.emissiveIntensity) * k;
  });

  return (
    <group position={[CARD_X[id], CARD_Y, 0]}>
      <group ref={ref} scale={0.0001}>
        <mesh>
          <boxGeometry args={[2.2, 0.14, 1.5]} />
          <meshStandardMaterial
            ref={mat}
            color={color}
            emissive={color}
            emissiveIntensity={0.15}
            transparent
            opacity={state === "rejected" ? 0.35 : 1}
          />
        </mesh>
        {state === "rejected" && (
          <>
            <Line points={[[-1.1, 0.1, -0.75], [1.1, 0.1, 0.75]]} color={color} lineWidth={2.5} />
            <Line points={[[-1.1, 0.1, 0.75], [1.1, 0.1, -0.75]]} color={color} lineWidth={2.5} />
          </>
        )}
      </group>
      {shown && (
        <Label
          position={[0, below ? -0.75 : 0.65, 0]}
          color={color}
          title={file}
          sub={state === "hot" || state === "stale" || state === "rejected" ? type : undefined}
        />
      )}
    </group>
  );
}

/* ---------- 飛行動畫 ---------- */

function Packet({ from, to, color }: { from: Place; to: Place; color: string }) {
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(0);

  const curve = useMemo(() => {
    const a = new THREE.Vector3(...placePos(from));
    const b = new THREE.Vector3(...placePos(to));
    const mid = a.clone().lerp(b, 0.5);
    mid.z += 3;
    return new THREE.QuadraticBezierCurve3(a, mid, b);
  }, [from, to]);

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
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <pointLight color={color} intensity={6} distance={6} />
    </group>
  );
}

/* ---------- 組合 ---------- */

export default function Scene({ step, stepIndex }: { step: Step; stepIndex: number }) {
  const transcripts = new Set(step.transcripts ?? []);
  return (
    <StageCanvas framing={{ centerX: 0, halfWidth: 16.5, camY: 4, targetY: 1.2, floorY: -6.55 }}>
      {(Object.keys(SESSION_X) as SessionId[]).map((id) => (
        <SessionBox key={id} id={id} session={step.sessions[id]} transcript={transcripts.has(id)} />
      ))}

      {/* 時間軸 */}
      <Line points={[[-11.5, BOX_BASE + BOX_H + 1.6, 0], [11.5, BOX_BASE + BOX_H + 1.6, 0]]} color="#2c3244" lineWidth={1} />

      {/* 記憶目錄 */}
      <mesh position={[2.1, CARD_Y - 0.25, 0]}>
        <boxGeometry args={[25.5, 0.2, 2.4]} />
        <meshStandardMaterial color="#232c40" emissive="#1a2133" emissiveIntensity={0.6} roughness={0.8} />
      </mesh>
      <Label position={[-13.1, CARD_Y, 0]} color="#8a92a6" title="記憶目錄" sub="跨 session 保留" />
      {/* 檔名較長：相鄰卡片的標籤上下交錯 */}
      {CARDS.map((c, i) => (
        <MemoryCard key={c.id} id={c.id} file={c.file} type={c.type} state={step.cards[c.id] ?? "hidden"} below={i % 2 === 1} />
      ))}

      {step.flight && <Packet key={stepIndex} {...step.flight} />}
    </StageCanvas>
  );
}
