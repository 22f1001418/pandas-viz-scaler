import { Highlight, themes } from "prism-react-renderer";
import { useStore } from "@/store/useStore";

interface Props {
  code: string; count?: number; kind?: "in" | "out";
  activeLine?: number; active?: boolean;
}

export function CodeCell({ code, count = 1, kind = "in", activeLine, active = false }: Props) {
  const dark = useStore((s) => s.theme === "dark");
  const prismTheme = dark ? themes.nightOwl : themes.oneLight;
  const prompt = kind === "in" ? `In [${count}]:` : `Out[${count}]:`;
  const promptCls = kind === "in" ? "nb-cell__prompt-in" : "nb-cell__prompt-out";

  return (
    <div className={`nb-cell ${active ? "nb-cell--active" : ""}`}>
      <div className={`nb-cell__gutter ${promptCls}`}>{prompt}</div>
      <div className="nb-cell__body">
        <Highlight theme={prismTheme} code={code.trimEnd()} language="python">
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={className} style={{ ...style, background: "transparent", margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.65 }}>
              {tokens.map((line, i) => {
                const isActive = activeLine === i;
                const { key: _k, ...lp } = getLineProps({ line });
                return (
                  <div key={i} {...lp} style={{ ...lp.style, background: isActive ? "var(--accent-soft)" : "transparent", borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent", paddingLeft: 8, marginLeft: -10, borderRadius: 3, transition: "background 150ms" }}>
                    {line.map((token, j) => { const { key: _k2, ...tp } = getTokenProps({ token }); return <span key={j} {...tp} />; })}
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
