import { motion } from 'motion/react';
import { EyeIcon } from '../ui/icons.tsx';
import styles from './SpectatorToggle.module.css';

interface SpectatorToggleProps {
  readonly spectating: boolean;
  readonly onChange: (spectating: boolean) => void;
}

/** "Nur zuschauen" – z. B. für Scrum Master: nimmt einen dauerhaft aus der Schätzung, bis man zurückkommt. */
export function SpectatorToggle({ spectating, onChange }: SpectatorToggleProps) {
  return (
    <motion.button
      type="button"
      className={styles.toggle}
      aria-pressed={spectating}
      onClick={() => onChange(!spectating)}
      whileTap={{ scale: 0.94 }}
    >
      <span className={styles.mark} aria-hidden="true">
        <EyeIcon size={16} />
      </span>
      Nur zuschauen
    </motion.button>
  );
}
