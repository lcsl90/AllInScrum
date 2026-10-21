import type { CSSProperties } from 'react';
import styles from './Avatar.module.css';
import { initialsOf } from './initials.ts';

interface AvatarProps {
  readonly name: string;
  readonly avatar: string | null;
  readonly size?: number;
}

/** Foto des Spielers – oder, ohne Foto, seine Initialen auf einer namensabhängigen Farbe. */
export function Avatar({ name, avatar, size = 48 }: AvatarProps) {
  const style = { '--avatar-size': `${size}px` } as CSSProperties;
  if (avatar) {
    return <img className={styles.avatar} src={avatar} alt={name} style={style} draggable={false} />;
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={`${styles.avatar} ${styles.initials}`}
      style={{ ...style, '--avatar-hue': hueOf(name) } as CSSProperties}
    >
      {initialsOf(name)}
    </span>
  );
}

/** Gleicher Name → gleiche Farbe, damit man sich am Tisch wiedererkennt. */
function hueOf(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) % 360;
  return hash;
}
