import { motion, useReducedMotion } from "motion/react";

export function Card({ title, onOpen }: { title: string; onOpen: () => void }) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      initial={{ opacity: 0, y: reduce ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl bg-stone-50 text-stone-900 transition-shadow duration-300 ease-out hover:shadow-lg"
    >
      <h3 className="font-display">{title}</h3>
      <button type="button" onClick={() => onOpen()} className="focus-visible:ring-2 outline-none">
        Open
      </button>
      <div className="z-10 min-h-dvh" />
    </motion.article>
  );
}
