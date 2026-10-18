'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { BookOpen, X } from 'lucide-react';
import { DEFAULT_READER_CHAPTER, LATEST_RELEASE_CHAPTER, normalizeChapter } from '@/lib/progression';
import styles from './ReaderSettings.module.css';

type ReaderSettingsProps = {
  chapter: number;
  onChapterChange: (chapter: number) => void;
  showSilhouettes: boolean;
  onShowSilhouettesChange: (visible: boolean) => void;
};

export default function ReaderSettings({ chapter, onChapterChange, showSilhouettes, onShowSilhouettesChange }: ReaderSettingsProps) {
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(chapter));
  const [error, setError] = useState('');

  function openSettings() {
    if (dialog.current?.matches(':popover-open')) {
      closeSettings();
      return;
    }
    setDraft(String(chapter));
    setError('');
    dialog.current?.showPopover();
    setOpen(true);
    input.current?.focus();
    input.current?.select();
  }

  function closeSettings() {
    dialog.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
  }

  function applyChapter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(draft);
    if (!draft.trim() || !Number.isInteger(value) || value < 1 || value > LATEST_RELEASE_CHAPTER) {
      setError(`Enter a whole chapter number from 1 to ${LATEST_RELEASE_CHAPTER}.`);
      input.current?.focus();
      return;
    }
    onChapterChange(normalizeChapter(value));
    closeSettings();
  }

  return (
    <>
      <button ref={trigger} type="button" className={styles.trigger} aria-label={`Reader settings. Your chapter: ${chapter}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-dialog`} onClick={openSettings}>
        <BookOpen size={16} strokeWidth={1.5} aria-hidden="true" />
        <span className={styles.fullLabel}>Your chapter <strong>{chapter}</strong></span>
        <span className={styles.compactLabel} aria-hidden="true">Ch. <strong>{chapter}</strong></span>
      </button>
      <div ref={dialog} popover="auto" role="dialog" id={`${id}-dialog`} className={styles.dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onToggle={event=>setOpen(event.newState==='open')} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeSettings();}}}>
        <div className={styles.heading}>
          <h2 id={`${id}-title`}>Your reading progress</h2>
          <button type="button" className={styles.close} aria-label="Close reader settings" onClick={closeSettings}><X size={18} strokeWidth={1.6} aria-hidden="true" /></button>
        </div>
        <p id={`${id}-description`} className={styles.description}>Choose your chapter and how unreached places appear.</p>
        <form className={styles.form} onSubmit={applyChapter} noValidate>
          <label htmlFor={`${id}-chapter`}>Last chapter you’ve read</label>
          <div className={styles.inputRow}>
            <input ref={input} id={`${id}-chapter`} name="chapter" type="number" inputMode="numeric" min={1} max={LATEST_RELEASE_CHAPTER} step={1} placeholder={String(DEFAULT_READER_CHAPTER)} value={draft} aria-invalid={Boolean(error)} aria-describedby={`${id}-latest${error ? ` ${id}-error` : ''}`} onChange={(event) => { setDraft(event.target.value); setError(''); }} />
            <button type="submit" className={styles.apply}>Apply chapter</button>
          </div>
          <p id={`${id}-latest`} className={styles.caption}>Latest release estimate: chapter {LATEST_RELEASE_CHAPTER}</p>
          <p id={`${id}-error`} className={styles.error} role="status">{error}</p>
        </form>
        <fieldset className={styles.unexplored}>
          <legend>Unexplored areas</legend>
          <label className={styles.visibilityOption}>
            <input type="radio" name={`${id}-unexplored`} value="silhouettes" checked={showSilhouettes} onChange={() => onShowSilhouettesChange(true)} aria-describedby={`${id}-silhouettes-note`} />
            <span>Faint silhouettes<small id={`${id}-silhouettes-note`}>Grey terrain and unnamed shapes beyond your chapter.</small></span>
          </label>
          <label className={styles.visibilityOption}>
            <input type="radio" name={`${id}-unexplored`} value="hidden" checked={!showSilhouettes} onChange={() => onShowSilhouettesChange(false)} aria-describedby={`${id}-hidden-note`} />
            <span>Fully hidden<small id={`${id}-hidden-note`}>Hide unreached terrain, names, and markers.</small></span>
          </label>
        </fieldset>
      </div>
    </>
  );
}
