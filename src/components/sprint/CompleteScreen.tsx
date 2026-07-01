import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { Sprint } from "@/lib/sprint-store";

const messages = ["Locked in.", "Momentum maintained.", "Strong session.", "Held the line."];

export function CompleteScreen({
  sprint,
  onAnother,
  onHome,
}: {
  sprint: Sprint;
  onAnother: () => void;
  onHome: () => void;
}) {
  const done = sprint.tasks.filter((t) => t.done);
  const open = sprint.tasks.filter((t) => !t.done);
  const msg = messages[Math.floor(Math.random() * messages.length)];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-40 flex items-center justify-center p-6"
    >
      <div className="w-full max-w-lg text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-accent-foreground"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          <Check className="h-7 w-7" strokeWidth={3} />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 font-display text-5xl font-semibold tracking-tight sm:text-6xl"
        >
          {msg}
        </motion.h1>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-3"
        >
          <p
            className="font-mono uppercase"
            style={{
              fontSize: 12,
              letterSpacing: "0.18em",
              color: "var(--muted-foreground)",
            }}
          >
            {sprint.noTimer
              ? `${sprint.actualMinutes ?? sprint.duration} min · ${done.length}/${sprint.tasks.length} complete`
              : sprint.endedEarly
                ? `Ended after ${sprint.actualMinutes ?? sprint.duration} min of ${sprint.duration} min planned.`
                : `${sprint.duration} min · ${done.length}/${sprint.tasks.length} complete`}
          </p>
          {sprint.endedEarly && (
            <p
              className="font-mono mt-1"
              style={{
                fontSize: 12,
                color: "var(--muted-foreground)",
                opacity: 0.7,
              }}
            >
              {done.length === sprint.tasks.length && sprint.tasks.length > 0
                ? "All tasks completed."
                : `${done.length}/${sprint.tasks.length} tasks completed.`}
            </p>
          )}
        </motion.div>


        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-10 space-y-2 text-left"
        >
          {done.map((t) => (
            <div key={t.id} className="flex items-center gap-3 text-sm">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-accent">
                <Check className="h-2.5 w-2.5 text-accent-foreground" strokeWidth={3} />
              </span>
              <span className="line-through opacity-60">{t.title}</span>
            </div>
          ))}
          {open.map((t) => (
            <div key={t.id} className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="h-4 w-4 rounded-full border border-border" />
              <span>{t.title}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 flex flex-col gap-3 sm:flex-row sm:justify-center"
        >
          <button
            onClick={onAnother}
            className="rounded-2xl bg-accent px-7 py-4 font-display text-base font-semibold text-accent-foreground transition hover:scale-[1.02] active:scale-[0.98]"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            Start Another Sprint
          </button>
          <button
            onClick={onHome}
            className="rounded-2xl border border-border bg-surface px-7 py-4 font-display text-base font-medium text-muted-foreground transition hover:border-accent hover:text-foreground"
          >
            Return Home
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
