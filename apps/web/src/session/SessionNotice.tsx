import { motion } from 'motion/react';
import { useLocation } from 'wouter';
import { Button } from '../ui/Button.tsx';
import styles from './SessionPage.module.css';

/** Ganzseitiger Hinweis, wenn es an diesem Tisch nicht (mehr) weitergeht. */
export function SessionNotice(props: { title: string; message: string }) {
  const [, navigate] = useLocation();
  return (
    <main className={styles.gate}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <h1 className={styles.title}>{props.title}</h1>
        <p role="alert" className={styles.text}>
          {props.message}
        </p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Zur Startseite
        </Button>
      </motion.div>
    </main>
  );
}
