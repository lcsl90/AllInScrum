import { motion } from 'motion/react';
import styles from './UncertainToggle.module.css';

interface UncertainToggleProps {
  readonly uncertain: boolean;
  readonly disabled: boolean;
  readonly onChange: (uncertain: boolean) => void;
}

/** "Ich bin unsicher" – lässt die eigene Karte für alle orange atmen. */
export function UncertainToggle({ uncertain, disabled, onChange }: UncertainToggleProps) {
  return (
    <motion.button
      type="button"
      className={styles.toggle}
      aria-pressed={uncertain}
      disabled={disabled}
      onClick={() => onChange(!uncertain)}
      whileTap={{ scale: 0.94 }}
    >
      <span className={styles.mark} aria-hidden="true">
        !
      </span>
      Ich bin unsicher
    </motion.button>
  );
}
