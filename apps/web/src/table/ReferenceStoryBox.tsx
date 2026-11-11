import { type Card, type ReferenceStory, SIGNAL_CARDS } from '@allinscrum/protocol';
import { type FormEvent, useId, useState } from 'react';
import { Button } from '../ui/Button.tsx';
import { PencilIcon } from '../ui/icons.tsx';
import styles from './ReferenceStoryBox.module.css';

/** Höchstlänge des Titels – der Server prüft sie ebenfalls. */
const MAX_TITLE_LENGTH = 60;

interface ReferenceStoryBoxProps {
  readonly story: ReferenceStory | null;
  readonly deck: readonly Card[];
  /** Nur der Admin darf die Referenzstory festlegen. */
  readonly editable: boolean;
  readonly onSave: (story: ReferenceStory | null) => void;
}

/** Der Anker der Skala: eine bekannte Story mit ihren Punkten – klein unter der eigenen Hand. */
export function ReferenceStoryBox({ story, deck, editable, onSave }: ReferenceStoryBoxProps) {
  const [editing, setEditing] = useState(false);
  if (!story && !editable) return null;

  const save = (next: ReferenceStory | null) => {
    onSave(next);
    setEditing(false);
  };

  return (
    <section
      aria-label="Referenzstory"
      className={styles.box}
      data-mode={editing ? 'editing' : story ? 'showing' : 'empty'}
    >
      {editing ? (
        <ReferenceStoryForm
          story={story}
          deck={deck}
          onSave={save}
          onCancel={() => setEditing(false)}
        />
      ) : story ? (
        <>
          <span className={styles.label}>Referenz</span>
          <span className={styles.card}>{story.card}</span>
          <span className={styles.title} title={story.title}>
            {story.title}
          </span>
          {editable && (
            <button
              type="button"
              className={styles.edit}
              aria-label="Referenzstory bearbeiten"
              onClick={() => setEditing(true)}
            >
              <PencilIcon size={14} />
            </button>
          )}
        </>
      ) : (
        <button type="button" className={styles.add} onClick={() => setEditing(true)}>
          Referenzstory festlegen
        </button>
      )}
    </section>
  );
}

interface ReferenceStoryFormProps {
  readonly story: ReferenceStory | null;
  readonly deck: readonly Card[];
  readonly onSave: (story: ReferenceStory | null) => void;
  readonly onCancel: () => void;
}

function ReferenceStoryForm({ story, deck, onSave, onCancel }: ReferenceStoryFormProps) {
  const estimates = deck.filter((card) => !SIGNAL_CARDS.includes(card));
  const [title, setTitle] = useState(story?.title ?? '');
  const [card, setCard] = useState(story?.card ?? estimates[0] ?? '');
  const titleId = useId();
  const cardId = useId();

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({ title: title.trim(), card });
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={titleId}>
          Story
        </label>
        <input
          id={titleId}
          className={styles.input}
          value={title}
          maxLength={MAX_TITLE_LENGTH}
          placeholder="z. B. Login-Formular"
          autoFocus
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={cardId}>
          Punkte
        </label>
        <select
          id={cardId}
          className={styles.select}
          value={card}
          onChange={(event) => setCard(event.target.value)}
        >
          {estimates.map((estimate) => (
            <option key={estimate} value={estimate}>
              {estimate}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.actions}>
        {story && (
          <Button variant="ghost" size="small" onClick={() => onSave(null)}>
            Entfernen
          </Button>
        )}
        <Button variant="ghost" size="small" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button variant="primary" size="small" type="submit" disabled={title.trim() === ''}>
          Speichern
        </Button>
      </div>
    </form>
  );
}
