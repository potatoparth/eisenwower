import { motion } from "framer-motion";
import type { AtmosphereId } from "@/lib/sprint/atmospheres";
import { atmosphereById } from "@/lib/sprint/atmospheres";

interface Props {
  atmosphere?: AtmosphereId;
  intense?: boolean;
}

export function AmbientBackground({ atmosphere, intense = false }: Props) {
  const atm = atmosphere ? atmosphereById[atmosphere] : null;
  const glow1 = atm?.glow ?? "var(--sp-accent-glow, rgba(100,180,255,0.1))";
  const glow2 = atm?.glowSecondary ?? glow1;
  const particle = atm?.particleColor ?? "rgba(255,255,255,0.4)";

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-grid opacity-60" />
      {/* floating orbs */}
      <motion.div
        className="absolute -top-32 left-1/4 h-[40rem] w-[40rem] rounded-full blur-3xl"
        style={{ background: glow1 }}
        animate={{ x: [0, 60, -40, 0], y: [0, 40, -20, 0], opacity: [0.25, 0.5, 0.35, 0.25] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 right-0 h-[36rem] w-[36rem] rounded-full blur-3xl"
        style={{ background: glow2 }}
        animate={{ x: [0, -50, 30, 0], y: [0, -30, 20, 0], opacity: [0.2, 0.45, 0.3, 0.2] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* particles */}
      {Array.from({ length: intense ? 24 : 14 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full"
          style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%`, background: particle }}
          animate={{ y: [0, -30, 0], opacity: [0.1, 0.6, 0.1] }}
          transition={{ duration: 8 + (i % 6), repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />
    </div>
  );
}
