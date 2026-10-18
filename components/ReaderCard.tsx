'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Flag, MapPin, Shield, X } from 'lucide-react';
import { getArcDetails, getSiteArcs, type StorySite } from '@/lib/story-data';
import { getCharacterByName, type AtlasCharacter } from '@/lib/media-data';
import CharacterPortrait from './CharacterPortrait';
import styles from './ReaderCard.module.css';

type ReaderCardProps = {
  site: StorySite;
  chapter: number;
  arcId?: string;
  onActiveArcChange?: (arcId:string|null)=>void;
  onClose: () => void;
  onExpandedChange?: (expanded: boolean) => void;
};

const TABS = ['Overview', 'Territory'] as const;
type ReaderTab = (typeof TABS)[number];

export default function ReaderCard({ site, chapter, arcId, onActiveArcChange, onClose, onExpandedChange }: ReaderCardProps) {
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const scrollRegion = useRef<HTMLDivElement>(null);
  const handleGesture = useRef<{ pointerId: number; startX: number; startY: number; moved: boolean } | null>(null);
  const suppressHandleClick = useRef(false);
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const availableArcs = useMemo(() => getSiteArcs(site.id, chapter).filter((arc) => !arcId || arcId === 'all' || arc.id === arcId), [site.id, chapter, arcId]);
  const [activeArcId, setActiveArcId] = useState(availableArcs.at(-1)?.id);
  const [tab, setTab] = useState<ReaderTab>('Overview');
  const [portrait, setPortrait] = useState<{ character: AtlasCharacter; launch: number } | null>(null);
  const portraitLaunch = useRef(0);
  const [expanded, setExpanded] = useState(false);
  const reportArc=useRef(onActiveArcChange);reportArc.current=onActiveArcChange;
  const reportExpanded = useRef(onExpandedChange);
  reportExpanded.current = onExpandedChange;
  const arc = availableArcs.find((item) => item.id === activeArcId) ?? availableArcs.at(-1);

  useEffect(() => {
    setActiveArcId(availableArcs.at(-1)?.id);
    setTab('Overview');
  }, [availableArcs]);

  useEffect(() => {
    setExpanded(false);
    scrollRegion.current?.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [site.id]);
  useEffect(()=>{reportArc.current?.(arc?.id??null);},[arc?.id]);
  useEffect(()=>()=>{reportArc.current?.(null);},[]);
  useEffect(() => { setPortrait(null); }, [site.id, arc?.id, chapter]);
  useEffect(() => { reportExpanded.current?.(expanded); }, [expanded]);
  useEffect(() => () => { reportExpanded.current?.(false); }, []);

  function changeTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;
    event.preventDefault();
    setTab(TABS[next]);
    tabButtons.current[next]?.focus();
  }

  function startHandleGesture(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || handleGesture.current) return;
    suppressHandleClick.current = false;
    handleGesture.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function finishHandleGesture(event: PointerEvent<HTMLButtonElement>) {
    const gesture = handleGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const distance = event.clientY - gesture.startY;
    suppressHandleClick.current = gesture.moved;
    handleGesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    // A deliberate swipe changes the sheet state; content scrolling never drives it.
    if (Math.abs(distance) >= 28 && Math.abs(distance) > Math.abs(event.clientX - gesture.startX)) setExpanded(distance < 0);
  }

  if (!arc) return null;
  const details = getArcDetails(arc, chapter);

  return (
    <>
    <section className={`${styles.card} ${site.tier === 'major' ? styles.major : ''}`} data-expanded={expanded} aria-labelledby={`${id}-title`} onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
      <button
        type="button"
        className={styles.sheetHandle}
        aria-label={expanded ? 'Collapse reader card to show more map' : 'Expand reader card for more room'}
        aria-expanded={expanded}
        aria-controls={`${id}-content`}
        onClick={(event) => { const suppress = suppressHandleClick.current && event.detail > 0; suppressHandleClick.current = false; if (!suppress) setExpanded((value) => !value); }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
          event.preventDefault();
          setExpanded(event.key === 'ArrowUp');
        }}
        onPointerDown={startHandleGesture}
        onPointerMove={(event) => {
          const gesture = handleGesture.current;
          if (gesture?.pointerId === event.pointerId && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 6) gesture.moved = true;
        }}
        onPointerUp={finishHandleGesture}
        onPointerCancel={() => { handleGesture.current = null; suppressHandleClick.current = false; }}
        onLostPointerCapture={() => { handleGesture.current = null; }}
      >
        <span className={styles.grip} aria-hidden="true" />
        <span>{expanded ? 'Show more map' : 'More room to read'}</span>
        <ChevronUp size={14} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <div className={styles.topline}>
        <span><MapPin size={12} strokeWidth={1.5} aria-hidden="true" />{site.name}</span>
        <button type="button" className={styles.close} aria-label="Close reader card" onClick={onClose}><X size={18} strokeWidth={1.5} aria-hidden="true" /></button>
      </div>
      <div ref={scrollRegion} id={`${id}-content`} className={styles.scrollRegion}>
      <div className={styles.intro}>
        <div className={styles.eyebrow}>{site.tier === 'major' ? <><Shield size={12} strokeWidth={1.5} aria-hidden="true" />Major campaign</> : <><BookOpen size={12} strokeWidth={1.5} aria-hidden="true" />Story landmark</>}</div>
        <h2 ref={heading} id={`${id}-title`} className={styles.title} tabIndex={-1}>{arc.name}</h2>
        <p className={styles.metadata}><span>Ch. {arc.chapterStart}{arc.chapterEnd === null ? '+' : `–${arc.chapterEnd}`}</span><span>{arc.region}</span></p>
        {arc.chapterEnd === null && <span className={styles.ongoing}>Ongoing</span>}
      </div>
      {availableArcs.length > 1 && (
        <div className={styles.storyPicker}>
          <label htmlFor={`${id}-story`}>Story at this location</label>
          <div className={styles.selectWrap}>
            <select id={`${id}-story`} value={arc.id} onChange={(event) => { setActiveArcId(event.target.value); setTab('Overview'); }}>
              {availableArcs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" />
          </div>
        </div>
      )}
      <div className={styles.keyFigures} aria-labelledby={`${id}-figures-title`}>
        <h3 id={`${id}-figures-title`}>Key figures</h3>
        {details.keyFigures.length ? (
          <ul className={styles.figures}>
            {details.keyFigures.map((name) => {
              const found = getCharacterByName(name);
              const character = found && found.debutChapter <= chapter ? found : undefined;
              const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('');
              return <li key={name}>{character ? <button type="button" className={styles.figure} aria-label={`View ${name} portrait`} onClick={() => setPortrait({ character, launch: ++portraitLaunch.current })} data-character-id={character.id}><span className={styles.figureImage}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={character.thumbnail} alt="" width={64} height={64} loading="lazy" /></span><span>{name}</span></button> : <span className={`${styles.figure} ${styles.figureFallback}`}><span className={styles.figureImage} aria-hidden="true">{initials}</span><span>{name}</span></span>}</li>;
            })}
          </ul>
        ) : <p className={styles.figuresLocked}>Revealed when you finish this arc.</p>}
      </div>
      <div className={styles.tabs} role="tablist" aria-label="Story details">
        {TABS.map((label, index) => <button ref={(element) => { tabButtons.current[index] = element; }} key={label} id={`${id}-${label}-tab`} type="button" role="tab" aria-selected={tab === label} aria-controls={`${id}-${label}-panel`} tabIndex={tab === label ? 0 : -1} onClick={() => setTab(label)} onKeyDown={(event) => changeTab(event, index)}>{label}</button>)}
      </div>
      <div className={styles.body} id={`${id}-${tab}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}-tab`} tabIndex={0}>
        {tab === 'Overview' && <><p className={styles.summary}>{details.summary}</p>{details.inProgress && <p className={styles.readerNote}>You’re still reading this arc. Key figures and its outcome stay hidden until you finish it.</p>}</>}
        {tab === 'Territory' && <div className={styles.territory}><Flag size={18} strokeWidth={1.3} aria-hidden="true" /><div><h3>Territory change</h3><p>{details.territoryDelta || 'The outcome stays hidden until you finish this arc.'}</p></div></div>}
      </div>
      </div>
      <div className={styles.footer}><span className={details.inProgress ? styles.progress : ''}>{details.inProgress ? 'In progress' : 'Arc complete'}</span><span>Explored through {chapter}</span></div>
    </section>
    {portrait && <CharacterPortrait key={`${portrait.character.id}-${portrait.launch}`} character={portrait.character} chapter={chapter} onClose={() => setPortrait((current) => current?.launch === portrait.launch ? null : current)} />}
    </>
  );
}
