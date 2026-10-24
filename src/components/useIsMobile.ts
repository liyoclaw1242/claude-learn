import { useEffect, useState } from "react";

/** 手機版面的斷點：寬度 < 960px（或橫拿的手機）只攤開一頁，否則攤開整個跨頁 */
export const MOBILE_QUERY = "(max-width: 959px), (max-height: 560px)";

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
