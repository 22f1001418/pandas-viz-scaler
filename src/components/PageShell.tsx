import { motion } from "framer-motion";
import { topicIcon } from "@/lib/icons";
import type { ReactNode } from "react";
import type { PageMeta } from "@/types";

interface Props { meta: PageMeta; children: ReactNode; }

export function PageShell({ meta, children }: Props) {
  const Icon = topicIcon(meta.icon);
  return (
    <motion.div key={meta.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }}
      className="flex flex-col gap-6 max-w-[1280px] mx-auto px-6 py-6 w-full">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center rounded-lg" style={{ width: 40, height: 40, background: "var(--accent-soft)", color: "var(--accent)" }}>
            {/* topicIcon looks Icon up in a module-level map rather than defining it
                here, so the reference is stable across renders. */}
            {/* eslint-disable-next-line react-hooks/static-components */}
            <Icon size={20} strokeWidth={2} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[22px] font-bold leading-tight text-fg">{meta.title}</h1>
            <p className="text-[13px] text-fg-muted">{meta.blurb}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
          <Ctx label="What" tone="what" body={meta.context.what} />
          <Ctx label="Why" tone="why" body={meta.context.why} />
          <Ctx label="How" tone="how" body={meta.context.how} />
        </div>
      </header>
      <div className="flex flex-col gap-5">{children}</div>
    </motion.div>
  );
}

function Ctx({ label, body, tone }: { label: string; body: string; tone: "what" | "why" | "how" }) {
  return (
    <div className={`ctx-box ctx-box--${tone}`}>
      <div className="ctx-box__label">{label}</div>
      <p>{body}</p>
    </div>
  );
}
