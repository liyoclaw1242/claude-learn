import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges, Line } from "@react-three/drei";
import * as THREE from "three";
import { Label, type Vec3 } from "../../three/Label";
import StageCanvas from "../../three/StageCanvas";
import { KIND_COLOR, SERVERS, SKILLS, type Anchor, type Block, type Step } from "./steps";

const TOWER_W = 4;
const BASE_Y = -6.5;
const GAP = 0.08;

const MODEL_POS: Vec3 = [12, 3, 0];
const USER_POS: Vec3 = [12, -4.5, 0];
const RACK_X = -10;
const SERVER_Y = -5.8;
const SERVER_X = [-13, -9, -5];

const skillY = (i: number) => -1.2 + i * 1.8;
const RED = "#ff7a8a";
const PINK = KIND_COLOR.skill;
const ORANGE = KIND_COLOR.mcp;

/* ---------- context 塔 ---------- */

function layout(ctx: Block[]) {
  let acc = BASE_Y;
  const ys = new Map<string, number>();
  for (const blk of ctx) {
    ys.set(blk.id, acc + blk.h / 2);
    acc += blk.h + GAP;
  }
  return { ys, top: acc };
}

function TowerBlock({ block, y, hot, warn }: { block: Block; y: number; hot: boolean; warn: boolean }) {
  const group = useRef<THREE.Group>(null!);
  const mesh = useRef<THREE.Mesh>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);

  useFrame(({ clock }, dt) => {
    const k = 1 - Math.exp(-dt * 8);
    group.current.position.y += (y - group.current.position.y) * k;
    const s = mesh.current.scale;
    s.y += (block.h - GAP - s.y) * k;
    const pulse = 0.35 + Math.sin(clock.elapsedTime * 5) * 0.25;
    const target = warn || hot ? pulse : 0;
    mat.current.emissiveIntensity += (target - mat.current.emissiveIntensity) * k;
  });

  const color = KIND_COLOR[block.kind];
  return (
    <group ref={group} position={[0, y, 0]}>
      <mesh ref={mesh} scale={[1, 0.0001, 1]}>
        <boxGeometry args={[TOWER_W, 1, 3]} />
        <meshStandardMaterial ref={mat} color={color} emissive={warn ? RED : color} emissiveIntensity={0} transparent opacity={0.9} />
        {warn && <Edges color={RED} />}
      </mesh>
      <Label position={[TOWER_W / 2 + 3.2, 0, 0]} color={warn ? RED : color} title={block.label} />
    </group>
  );
}

/* ---------- 技能卡匣 ---------- */

function Cartridge({ i, step }: { i: number; step: Step }) {
  const skill = SKILLS[i];
  const ref = useRef<THREE.Group>(null!);
  const focus = step.focusSkill === skill.id;
  const loaded = step.loaded?.includes(skill.id) ?? false;
  const listed = !!step.listed && !skill.manual;
  const y = skillY(i);

  useFrame(({ clock }, dt) => {
    const k = 1 - Math.exp(-dt * 8);
    const s = focus ? 1.12 + Math.sin(clock.elapsedTime * 5) * 0.06 : 1;
    ref.current.scale.x += (s - ref.current.scale.x) * k;
    ref.current.scale.y = ref.current.scale.z = ref.current.scale.x;
  });

  const color = loaded || focus ? PINK : listed ? KIND_COLOR.listing : "#2a3040";
  const showDesc = step.showDesc || focus;
  return (
    <group position={[RACK_X, y, 0]}>
      <group ref={ref}>
        <mesh>
          <boxGeometry args={[2.6, 0.5, 1.6]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={focus ? 0.6 : loaded ? 0.35 : listed ? 0.2 : 0} />
        </mesh>
      </group>
      <Label
        position={[4.2, 0, 0]}
        color={loaded || focus ? PINK : listed ? "#d9a3c9" : "#8a92a6"}
        title={loaded ? `${skill.name}（已載入）` : skill.name}
        sub={showDesc ? skill.desc : undefined}
      />
    </group>
  );
}

/* ---------- MCP server ---------- */

function Server({ i, on, mcpY }: { i: number; on: boolean; mcpY?: number }) {
  const x = SERVER_X[i];
  const s = SERVERS[i];
  return (
    <group>
      <mesh position={[x, SERVER_Y, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 1, 32]} />
        <meshStandardMaterial
          color={on ? ORANGE : "#2a3040"}
          emissive={on ? ORANGE : "#000000"}
          emissiveIntensity={on ? 0.3 : 0}
          metalness={0.4}
          roughness={0.5}
        />
      </mesh>
      <Label position={[x, SERVER_Y + 1.3, 0]} color={on ? ORANGE : "#8a92a6"} title={s.name} sub={s.sub} />
      {on && mcpY !== undefined && (
        <Line
          points={[[x + 0.9, SERVER_Y, 0], [-TOWER_W / 2, mcpY, 0]]}
          color={ORANGE}
          lineWidth={1.5}
          dashed
          dashSize={0.25}
          gapSize={0.15}
        />
      )}
    </group>
  );
}

/* ---------- 模型與使用者 ---------- */

function Spin({ speed, children }: { speed: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { ref.current.rotation.y += dt * speed; });
  return <group ref={ref}>{children}</group>;
}

function Actors() {
  return (
    <>
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
        <Label position={[0, 2.6, 0]} color="#c08bff" title="Model" sub="讀名片、決定要拿什麼" />
      </group>
      <group position={USER_POS}>
        <Spin speed={0.3}>
          <mesh>
            <boxGeometry args={[1.4, 1.4, 1.4]} />
            <meshStandardMaterial color="#f2b84b" roughness={0.4} />
          </mesh>
        </Spin>
        <Label position={[0, 1.5, 0]} color="#f2b84b" title="User" sub="可以直接按 /指令" />
      </group>
    </>
  );
}

/* ---------- 飛行封包 ---------- */

function resolve(a: Anchor, ys: Map<string, number>): Vec3 {
  if (a === "model") return MODEL_POS;
  if (a === "user") return USER_POS;
  if ("skill" in a) return [RACK_X + 1.3, skillY(SKILLS.findIndex((s) => s.id === a.skill)), 0];
  if ("server" in a) return [SERVER_X[a.server], SERVER_Y + 0.5, 0];
  return [0, ys.get(a.block) ?? BASE_Y, 1.5];
}

function Packet({ from, to, color }: { from: Vec3; to: Vec3; color: string }) {
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(0);
  const curve = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().lerp(b, 0.5);
    mid.y += 3;
    mid.z += 1.5;
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
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <pointLight color={color} intensity={6} distance={6} />
    </group>
  );
}

/* ---------- 組合 ---------- */

export default function Scene({ step, stepIndex }: { step: Step; stepIndex: number }) {
  const { ys, top } = layout(step.ctx);
  const hot = new Set(step.hot ?? []);
  const servers = step.servers ?? 0;
  const flight = step.flight && {
    from: resolve(step.flight.from, ys),
    to: resolve(step.flight.to, ys),
    color: step.flight.color,
  };

  return (
    <StageCanvas framing={{ centerX: -0.5, halfWidth: 15.8, camY: 6, targetY: 1, floorY: -6.55 }}>
      {/* context 塔 */}
      {step.ctx.map((blk) => (
        <TowerBlock key={blk.id} block={blk} y={ys.get(blk.id)!} hot={hot.has(blk.id)} warn={step.warn === blk.id} />
      ))}
      <Label position={[0, top + 0.8, 0]} color="#d8dce6" title="Context" sub="模型這次看得到的全部" />

      {/* 技能卡匣 */}
      {SKILLS.map((_, i) => <Cartridge key={i} i={i} step={step} />)}
      <Label position={[RACK_X, skillY(SKILLS.length - 1) + 1.3, 0]} color="#d9a3c9" title="技能卡匣" sub=".claude/skills/（磁碟）" />

      {/* MCP server */}
      {SERVERS.map((_, i) => <Server key={i} i={i} on={i < servers} mcpY={ys.get("mcp")} />)}

      <Actors />

      {/* Plugin 外框：把技能與 MCP 包成一個套件 */}
      {step.plugin && (
        <group position={[-8.75, 0.9, 0]}>
          <mesh>
            <boxGeometry args={[11.8, 14.6, 4]} />
            <meshBasicMaterial color="#9fb3ff" transparent opacity={0.03} depthWrite={false} />
            <Edges color="#9fb3ff" />
          </mesh>
          <Label position={[0, 7.9, 0]} color="#9fb3ff" title="Plugin：film-writers-kit" sub="技能 + MCP + hooks，一次安裝" />
        </group>
      )}

      {flight && <Packet key={stepIndex} {...flight} />}
    </StageCanvas>
  );
}
