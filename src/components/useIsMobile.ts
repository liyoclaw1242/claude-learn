import { useEffect, useState } from "react";

/** 手機版面的斷點：寬度 ≤ 768px 改用全螢幕的圖 + 步驟卡版面 */
export const MOBILE_QUERY = "(max-width: 768px)";

export function useIsMobile() {
  const [mobile, setMobile] = useState(() => matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = matchMedia(MOBILE_QUERY);
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}
