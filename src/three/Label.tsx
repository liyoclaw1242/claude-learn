import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";

export type Vec3 = [number, number, number];

/**
 * 3D 文字標籤：用 three 原生的 CSS2DObject（一個跟著 3D 座標移動的 DOM 元素）。
 * 不用 drei 的 <Html>，因為它每個標籤都開一個 React root，在 React 19 下會掉標籤。
 * 需要場景裡有一個 <LabelLayer />（StageCanvas 已內建）。
 */
export function Label({
  position, color, title, sub,
}: { position: Vec3; color: string; title: string; sub?: string }) {
  const obj = useMemo(() => {
    const div = document.createElement("div");
    div.className = "label3d";
    div.style.color = color;
    div.textContent = title;
    if (sub) {
      const small = document.createElement("small");
      small.textContent = sub;
      div.appendChild(small);
    }
    return new CSS2DObject(div);
  }, [color, title, sub]);
  return <primitive object={obj} position={position} />;
}

/** 每幀把所有 CSS2DObject 的位置同步到 DOM 上 */
export function LabelLayer() {
  const { gl, scene, camera, size } = useThree();
  const renderer = useMemo(() => new CSS2DRenderer(), []);

  useEffect(() => {
    const el = renderer.domElement;
    Object.assign(el.style, { position: "absolute", top: "0", left: "0", pointerEvents: "none" });
    gl.domElement.parentElement!.appendChild(el);
    return () => el.remove();
  }, [gl, renderer]);

  useEffect(() => { renderer.setSize(size.width, size.height); }, [renderer, size]);
  useFrame(() => renderer.render(scene, camera));
  return null;
}
