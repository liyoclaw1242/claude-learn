import { useEffect, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { LabelLayer } from "./Label";
import { useIsMobile } from "../components/useIsMobile";

export type Framing = {
  /** 場景水平中心 */
  centerX: number;
  /** 場景需要完整入鏡的半寬 */
  halfWidth: number;
  /** 相機高度與注視點高度 */
  camY?: number;
  targetY?: number;
  /** 相機最近距離 */
  minDist?: number;
  /** 地面格線高度 */
  floorY?: number;
};

/** 依畫布比例拉遠相機，確保 halfWidth 範圍都入鏡 */
function CameraFit({ centerX, halfWidth, camY = 7, minDist = 24 }: Framing) {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * (size.width / size.height);
    cam.position.set(centerX, camY, Math.max(minDist, halfWidth / tanH));
  }, [camera, size, centerX, halfWidth, camY, minDist]);
  return null;
}

/** 每章共用的 3D 舞台：背景、霧、燈光、地面、軌道控制、標籤層 */
export default function StageCanvas({ framing, children }: { framing: Framing; children: ReactNode }) {
  const { centerX, camY = 7, targetY = -0.5, floorY = -7 } = framing;
  // 手機上單指滑動用來換步驟，所以關掉旋轉與平移，只保留雙指縮放
  const mobile = useIsMobile();
  return (
    <Canvas camera={{ position: [centerX, camY, 24], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={["#0b0d12"]} />
      {/* 手機直式畫面相機拉得比較遠，霧也跟著往後推 */}
      <fog attach="fog" args={["#0b0d12", mobile ? 60 : 45, mobile ? 110 : 80]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 10, 8]} intensity={1.2} />
      <Grid position={[0, floorY, 0]} args={[40, 40]} cellColor="#141823" sectionColor="#1c2130" fadeDistance={50} infiniteGrid />

      {children}

      {/* 手機上 3D 標籤會超出物體邊緣，多留一點左右餘量 */}
      <CameraFit {...framing} halfWidth={framing.halfWidth * (mobile ? 1.12 : 1)} />
      <OrbitControls enableDamping enableRotate={!mobile} enablePan={!mobile} target={[centerX, targetY, 0]} />
      <LabelLayer />
    </Canvas>
  );
}
