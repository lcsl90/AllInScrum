import { type ChangeEvent, useId, useState } from 'react';
import { CameraIcon } from '../ui/icons.tsx';
import { Avatar } from './Avatar.tsx';
import { avatarFromFile } from './avatar-image.ts';
import { useProfile } from './ProfileContext.tsx';
import styles from './ProfileEditor.module.css';

const MAX_NAME_LENGTH = 24;

/** Name und Foto des Nutzers – beides wird sofort im Cookie gemerkt. */
export function ProfileEditor() {
  const { profile, updateProfile } = useProfile();
  const nameId = useId();
  const photoId = useId();

  const [photoFailed, setPhotoFailed] = useState(false);

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const avatar = await avatarFromFile(file).catch(() => null);
    setPhotoFailed(avatar === null);
    if (avatar) updateProfile({ avatar });
  }

  return (
    <div className={styles.editor}>
      <div className={styles.avatarSlot}>
        <Avatar name={profile.name || '?'} avatar={profile.avatar} size={88} />
        <label htmlFor={photoId} className={styles.photoButton} title="Foto hochladen">
          <CameraIcon size={16} />
          <span className="visually-hidden">Foto hochladen</span>
        </label>
        <input
          id={photoId}
          type="file"
          accept="image/*"
          className="visually-hidden"
          onChange={handlePhoto}
        />
        {profile.avatar && (
          <button
            type="button"
            className={styles.removePhoto}
            title="Foto entfernen"
            aria-label="Foto entfernen"
            onClick={() => updateProfile({ avatar: null })}
          >
            ×
          </button>
        )}
      </div>
      <div className={styles.field}>
        <label htmlFor={nameId} className={styles.label}>
          Dein Name
        </label>
        <input
          id={nameId}
          className={styles.input}
          value={profile.name}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="nickname"
          placeholder="z. B. Alex"
          onChange={(event) => updateProfile({ name: event.target.value })}
        />
        {photoFailed && (
          <p role="alert" className={styles.hint}>
            Dieses Bild konnte nicht verwendet werden – probier ein anderes.
          </p>
        )}
      </div>
    </div>
  );
}
