import { Fragment } from "react";

/** 課文字串的兩種行內標記：**粗體** 與 `程式碼` */
export default function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b>
        : p.startsWith("`") ? <code key={i}>{p.slice(1, -1)}</code>
        : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}
