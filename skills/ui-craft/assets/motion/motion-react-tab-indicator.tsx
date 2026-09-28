/*
 * Sliding tab indicator with Motion for React (layoutId)
 * ----------------------------------------------------------------------------
 * Communicates: "selection moved from here to there." The indicator travels
 *   between tabs instead of blinking, which tells the eye what changed.
 * Use: `npm install motion`. Render one <motion.span layoutId="…"> inside the
 *   active tab only; Motion animates it between positions with transforms
 *   (FLIP), so no width/left animation happens. Use a unique layoutId per
 *   tab group (or wrap the group in <LayoutGroup id="…">).
 *   Keyboard: this is a presentational sketch of the indicator. For real
 *   tabs, use your primitives library's Tabs (roving tabindex, arrow keys) and
 *   drop the indicator into its trigger.
 * Reduced motion: MotionConfig reducedMotion="user" disables layout
 *   animations, so the indicator jumps to the new tab instantly.
 * Support: React 18+; import path "motion/react".
 */
'use client';

import { MotionConfig, motion } from 'motion/react';
import { useId, useState } from 'react';

const SPRING = { type: 'spring', stiffness: 500, damping: 40, mass: 1 } as const;

export function SegmentedTabs({ tabs, onChange }: { tabs: string[]; onChange?: (tab: string) => void }) {
  const [active, setActive] = useState(tabs[0]);
  const groupId = useId();

  return (
    <MotionConfig reducedMotion="user">
      <div role="tablist" className="segmented">
        {tabs.map((tab) => {
          const isActive = tab === active;
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              className="segmented__tab"
              onClick={() => {
                setActive(tab);
                onChange?.(tab);
              }}
            >
              {isActive && (
                <motion.span
                  layoutId={`${groupId}-indicator`}
                  className="segmented__indicator"
                  transition={SPRING}
                  aria-hidden="true"
                />
              )}
              <span className="segmented__label">{tab}</span>
            </button>
          );
        })}
      </div>
    </MotionConfig>
  );
}

/*
 * .segmented { display: inline-flex; gap: 4px; padding: 4px; border-radius: 999px; background: var(--surface); }
 * .segmented__tab { position: relative; padding: 8px 14px; border-radius: inherit; }
 * .segmented__indicator { position: absolute; inset: 0; border-radius: 999px; background: var(--accent); }
 * .segmented__label { position: relative; }   // sits above the indicator
 */
