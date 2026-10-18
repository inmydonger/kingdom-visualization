'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Move, X } from 'lucide-react';
import styles from './AtlasIntro.module.css';

type Props = { ready:boolean; blocked:boolean; onHelp:()=>void };

export default function AtlasIntro({ready,blocked,onHelp}:Props){
  const [showGuide,setShowGuide]=useState(false);
  useEffect(()=>{
    try{setShowGuide(localStorage.getItem('kingdom-atlas-guide-dismissed')!=='true');}catch{setShowGuide(true);}
  },[]);
  const dismiss=useCallback(()=>{
    setShowGuide(false);
    try{localStorage.setItem('kingdom-atlas-guide-dismissed','true');}catch{}
  },[]);
  useEffect(()=>{if(ready&&blocked&&showGuide)dismiss();},[ready,blocked,showGuide,dismiss]);
  useEffect(()=>{
    if(!ready||!showGuide)return;
    const canvas=document.querySelector('canvas');
    const onKey=(event:KeyboardEvent)=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','+','-','Home'].includes(event.key))dismiss();};
    canvas?.addEventListener('pointerdown',dismiss,{once:true});
    canvas?.addEventListener('keydown',onKey);
    return()=>{canvas?.removeEventListener('pointerdown',dismiss);canvas?.removeEventListener('keydown',onKey);};
  },[ready,showGuide,dismiss]);

  return <>
    <div className={styles.loading} data-ready={ready} role="status" aria-hidden={ready} aria-live="polite">
      <span className={styles.seal} aria-hidden="true">國</span>
      <span className={styles.kicker}>Kingdom · Warring States Atlas</span>
      <p>Unfolding the realm</p>
      <span className={styles.caption}>Preparing terrain and the stories you’ve reached.</span>
    </div>
    {ready&&showGuide&&!blocked&&<aside className={styles.guide} data-quick-guide="" aria-label="Map quick guide">
      <div className={styles.guideHeading}><Move size={16} strokeWidth={1.4} aria-hidden="true"/><span>A realm to explore</span><button type="button" className={styles.close} aria-label="Dismiss map quick guide" onClick={dismiss}><X size={15}/></button></div>
      <p>Drag to explore. Scroll or pinch to zoom. Draw a state card below to follow its stories.</p>
      <button type="button" className={styles.more} onClick={()=>{dismiss();onHelp();}}>Map guide<ArrowUpRight size={13}/></button>
    </aside>}
  </>;
}
