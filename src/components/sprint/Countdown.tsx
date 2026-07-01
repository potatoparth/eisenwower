import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Countdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);

  useEffect(() => {
    if (n === 0) {
      const t = setTimeout(onDone, 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN((x) => x - 1), 900);
    return () => clearTimeout(t);
  }, [n, onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] grid place-items-center"
      style={{
        background: "color-mix(in oklab, var(--sp-background) 55%, transparent)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center">
        <div
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: "0.3em",
            color: "color-mix(in oklab, var(--sp-foreground) 30%, transparent)",
          }}
        >
          Entering focus
        </div>
        <div className="mt-10 grid h-40 place-items-center">
          <AnimatePresence mode="wait">
            {n > 0 ? (
              <motion.div
                key={n}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="font-display tabular-nums"
                style={{
                  fontSize: "10rem",
                  fontWeight: 200,
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                  color: "var(--sp-foreground)",
                }}
              >
                {n}
              </motion.div>
            ) : (
              <motion.div
                key="go"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="font-display"
                style={{
                  fontSize: "3.5rem",
                  fontWeight: 300,
                  letterSpacing: "-0.02em",
                  color: "var(--sp-foreground)",
                }}
              >
                Locked in.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
