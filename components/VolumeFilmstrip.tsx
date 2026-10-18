'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, LockKeyhole, X } from 'lucide-react';
import { VOLUMES, getCurrentVolume, type AtlasVolume } from '@/lib/media-data';
import styles from './VolumeFilmstrip.module.css';

type Props = { chapter:number; dockOpen:boolean; onChoose:(volume:AtlasVolume)=>void };

export default function VolumeFilmstrip({chapter,dockOpen,onChoose}:Props){
  const id=useId();
  const trigger=useRef<HTMLButtonElement>(null);
  const panel=useRef<HTMLDivElement>(null);
  const strip=useRef<HTMLDivElement>(null);
  const [open,setOpen]=useState(false);
  const [scrollEdges,setScrollEdges]=useState({start:true,end:false});
  const current=getCurrentVolume(chapter);

  useEffect(()=>{
    if(!open)return;
    const frame=requestAnimationFrame(()=>{
      const row=strip.current,cover=row?.querySelector<HTMLElement>('[data-current="true"]');
      if(row&&cover){
        row.scrollLeft=cover.offsetLeft-row.clientWidth/2+cover.clientWidth/2;
        setScrollEdges({start:row.scrollLeft<2,end:row.scrollLeft+row.clientWidth>=row.scrollWidth-2});
      }
    });
    return()=>cancelAnimationFrame(frame);
  },[open,current.volume]);

  function closeStrip(){
    panel.current?.hidePopover();
    trigger.current?.focus({preventScroll:true});
  }

  return <div className={styles.root} data-dock-open={dockOpen}>
    <button ref={trigger} type="button" className={styles.chip} popoverTarget={id} aria-controls={id} aria-expanded={open} aria-label={`Volume filmstrip. Current volume ${current.volume}`}>
      <img src={current.file} width={30} height={43} alt=""/>
      <span><small>Your bookshelf</small><strong>Vol {current.volume}</strong></span>
      <ChevronRight size={13} aria-hidden="true"/>
    </button>
    <div ref={panel} id={id} popover="auto" className={styles.panel} role="region" aria-label="Volume bookshelf" onToggle={event=>setOpen(event.newState==='open')} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeStrip();}}}>
      <div className={styles.heading}>
        <div><span>The story, bound</span><h2>Volume bookshelf <small>80 volumes</small></h2></div>
        <button type="button" aria-label="Close volume filmstrip" onClick={closeStrip}><X size={17} aria-hidden="true"/></button>
      </div>
      <div className={styles.strip} ref={strip} onScroll={event=>{const row=event.currentTarget,start=row.scrollLeft<2,end=row.scrollLeft+row.clientWidth>=row.scrollWidth-2;setScrollEdges(previous=>previous.start===start&&previous.end===end?previous:{start,end});}}>
        {VOLUMES.map(volume=>{
          const locked=volume.chapters[0]>chapter;
          return <button key={volume.volume} type="button" className={styles.cover} data-current={volume.volume===current.volume} data-locked={locked} disabled={locked}
            title={locked?`Undiscovered at chapter ${chapter}`:`Chapters ${volume.chapters[0]}–${volume.chapters[1]}`}
            aria-label={`Volume ${volume.volume}${locked?`. Locked beyond chapter ${chapter}`:`. Jump to chapter ${volume.chapters[0]}`}`}
            onClick={()=>{if(!locked)onChoose(volume);}}>
            <span className={styles.art}><img src={volume.file} width={80} height={116} alt={`Kingdom volume ${volume.volume} cover`} loading="lazy" decoding="async"/>{locked&&<LockKeyhole size={15} aria-hidden="true"/>}</span>
            <strong>Vol {volume.volume}</strong><small>{volume.chapters[0]}–{volume.chapters[1]}</small>
          </button>;
        })}
      </div>
      <div className={styles.footer}><p>Scroll covers or choose a volume to travel.</p><div><button type="button" aria-label="Earlier volumes" disabled={scrollEdges.start} onClick={()=>strip.current?.scrollBy({left:-320,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}><ChevronLeft size={16} aria-hidden="true"/></button><button type="button" aria-label="Later volumes" disabled={scrollEdges.end} onClick={()=>strip.current?.scrollBy({left:320,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}><ChevronRight size={16} aria-hidden="true"/></button></div></div>
    </div>
  </div>;
}
