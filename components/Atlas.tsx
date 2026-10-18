'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Compass, HelpCircle, Layers3, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { STATES, type StateId, type Point } from '@/lib/atlas-data';
import MapScene from './MapScene';
import ReaderSettings from './ReaderSettings';
import ReaderCard from './ReaderCard';
import LandmarkFilters from './LandmarkFilters';
import StateDock from './StateDock';
import VolumeFilmstrip from './VolumeFilmstrip';
import CharacterCast from './CharacterCast';
import AtlasIntro from './AtlasIntro';
import { getVolumeArc, type AtlasVolume, type AtlasCharacter } from '@/lib/media-data';
import { isStateDiscovered } from '@/lib/state-discovery';
import { getArcDestination } from '@/lib/atlas-navigation';
import { STORY_SITES } from '@/lib/story-data';
import { DEFAULT_FILTERS, getFilterArcs, getVisibleSites, normalizeFilters, type LandmarkFilters as LandmarkFilterState } from '@/lib/landmark-filters';
import { DEFAULT_READER_CHAPTER, LATEST_RELEASE_CHAPTER, normalizeChapter } from '@/lib/progression';

type MapCommand = { type: 'reset' | 'zoom-in' | 'zoom-out' | 'focus' | 'site' | 'region'; id: number; stateId?: StateId; siteId?: string; point?:Point };

function writeFilterParams(url:URL,filters:LandmarkFilterState){
  if(filters.state==='all')url.searchParams.delete('filter');else url.searchParams.set('filter',filters.state);
  if(filters.arc==='all')url.searchParams.delete('arc');else url.searchParams.set('arc',filters.arc);
}

export default function Atlas() {
  const [selectedState, setSelectedState] = useState<StateId | null>(null);
  const [selectedSiteId,setSelectedSiteId]=useState<string|null>(null);
  const [terrainVisible, setTerrainVisible] = useState(true);
  const [labelsVisible, setLabelsVisible] = useState(true);
  const [readerChapter,setReaderChapter]=useState(DEFAULT_READER_CHAPTER);
  const [showSilhouettes,setShowSilhouettes]=useState(true);
  const [filters,setFilters]=useState<LandmarkFilterState>(DEFAULT_FILTERS);
  const [progressReady,setProgressReady]=useState(false);
  const [command, setCommand] = useState<MapCommand | null>(null);
  const [dockOpen,setDockOpen]=useState(false);
  const [readerExpanded,setReaderExpanded]=useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);
  const commandId = useRef(0);
  const selected = STATES.find((state) => state.id === selectedState);
  const effectiveFilters=useMemo(()=>normalizeFilters(filters,readerChapter),[filters,readerChapter]);
  const visibleSites=useMemo(()=>getVisibleSites(readerChapter,effectiveFilters,showSilhouettes),[readerChapter,effectiveFilters,showSilhouettes]);
  const selectedSite=progressReady?visibleSites.find(site=>site.id===selectedSiteId):undefined;
  const filteredArc=getFilterArcs(readerChapter,effectiveFilters.state).find(arc=>arc.id===effectiveFilters.arc);
  const stateFilterName=effectiveFilters.state==='multi'?'Multi-state':STATES.find(state=>state.id===effectiveFilters.state)?.name;
  const filtersActive=effectiveFilters.state!=='all'||effectiveFilters.arc!=='all';

  const sendCommand = useCallback((type: MapCommand['type'], stateId?: StateId) => {
    setCommand({ type, id: ++commandId.current, stateId });
  }, []);

  const selectState = useCallback((stateId: StateId | null) => {
    setSelectedSiteId(null);
    setSelectedState(stateId);
    const url = new URL(window.location.href);
    url.searchParams.delete('site');
    if (stateId) url.searchParams.set('state', stateId);
    else url.searchParams.delete('state');
    window.history.replaceState(null, '', url);
  }, []);

  const selectSite=useCallback((siteId:string|null)=>{
    const site=STORY_SITES.find(candidate=>candidate.id===siteId);
    if(siteId&&!visibleSites.some(candidate=>candidate.id===siteId))return;
    setSelectedSiteId(siteId);
    const url=new URL(window.location.href);
    if(site){
      url.searchParams.set('site',site.id);url.searchParams.delete('state');
      setSelectedState(site.stateId==='multi'?null:site.stateId);
      setCommand({type:'site',id:++commandId.current,siteId:site.id});
    }else url.searchParams.delete('site');
    window.history.replaceState(null,'',url);
  },[visibleSites]);

  const changeFilters=useCallback((value:LandmarkFilterState)=>{
    const next=normalizeFilters(value,readerChapter);setFilters(next);
    const url=new URL(window.location.href);writeFilterParams(url,next);
    if(selectedSiteId&&!getVisibleSites(readerChapter,next,showSilhouettes).some(site=>site.id===selectedSiteId)){
      setSelectedSiteId(null);url.searchParams.delete('site');
    }
    if(next.arc!=='all'){
      const arc=getFilterArcs(readerChapter,next.state).find(candidate=>candidate.id===next.arc)!;
      const site=STORY_SITES.find(candidate=>candidate.id===arc.siteId)!;
      url.searchParams.delete('state');setSelectedState(site.stateId==='multi'?null:site.stateId);
      if(getVisibleSites(readerChapter,next,showSilhouettes).some(candidate=>candidate.id===site.id))setCommand({type:'site',id:++commandId.current,siteId:site.id});
    }else if(next.state!=='all'&&next.state!=='multi'){
      setSelectedState(next.state);url.searchParams.set('state',next.state);
      setCommand({type:'focus',id:++commandId.current,stateId:next.state});
    }
    if(next.state==='all'&&next.arc==='all'){setSelectedState(null);url.searchParams.delete('state');}
    window.history.replaceState(null,'',url);
  },[readerChapter,selectedSiteId,showSilhouettes]);

  const closeReader=useCallback(()=>{
    selectSite(null);
    if(selectedSiteId)setCommand({type:'site',siteId:selectedSiteId,id:++commandId.current});
    document.querySelector<HTMLElement>(`[data-story-id="${selectedSiteId}"]`)?.focus({preventScroll:true});
  },[selectSite,selectedSiteId]);

  const resetView = useCallback(() => {
    selectState(null);
    changeFilters(DEFAULT_FILTERS);
    sendCommand('reset');
  }, [selectState, changeFilters, sendCommand]);

  useEffect(() => {
    const params=new URLSearchParams(window.location.search);
    let savedChapter:string|null=null,savedSilhouettes:string|null=null;
    try{savedChapter=localStorage.getItem('kingdom-reader-chapter');savedSilhouettes=localStorage.getItem('kingdom-silhouettes');}catch{}
    const chapter=params.get('chapter')??savedChapter;
    const initialChapter=chapter===null||chapter.trim()===''?DEFAULT_READER_CHAPTER:normalizeChapter(Number(chapter));
    const initialFilters=normalizeFilters({state:params.get('filter') as LandmarkFilterState['state'],arc:params.get('arc')??'all'},initialChapter);
    const initialSilhouettes=params.get('spoilers')==='hidden'?false:params.get('spoilers')==='silhouettes'?true:savedSilhouettes!=='false';
    setReaderChapter(initialChapter);
    setShowSilhouettes(initialSilhouettes);setFilters(initialFilters);
    setProgressReady(true);
    const value = params.get('state');
    const site=STORY_SITES.find(candidate=>candidate.id===params.get('site'));
    if(site&&getVisibleSites(initialChapter,initialFilters,initialSilhouettes).some(candidate=>candidate.id===site.id)){
      setSelectedSiteId(site.id);setSelectedState(site.stateId==='multi'?null:site.stateId);
      setCommand({type:'site',id:++commandId.current,siteId:site.id});
    }else if (STATES.some((state) => state.id === value && isStateDiscovered(state.id,initialChapter))) {
      setSelectedState(value as StateId);
      sendCommand('focus', value as StateId);
    }else if(initialFilters.arc!=='all'){
      const arc=getFilterArcs(initialChapter,initialFilters.state).find(candidate=>candidate.id===initialFilters.arc)!;
      const visible=getVisibleSites(initialChapter,initialFilters,initialSilhouettes).find(candidate=>candidate.id===arc.siteId);
      if(visible){setSelectedState(visible.stateId==='multi'?null:visible.stateId);setCommand({type:'site',id:++commandId.current,siteId:visible.id});}
    }else if(initialFilters.state!=='all'&&initialFilters.state!=='multi'){
      setSelectedState(initialFilters.state);sendCommand('focus',initialFilters.state);
    }
    const url=new URL(window.location.href);writeFilterParams(url,initialFilters);
    if(params.has('state')&&!STATES.some(state=>state.id===value&&isStateDiscovered(state.id,initialChapter)))url.searchParams.delete('state');
    if(params.has('site')&&!getVisibleSites(initialChapter,initialFilters,initialSilhouettes).some(candidate=>candidate.id===params.get('site')))url.searchParams.delete('site');
    window.history.replaceState(null,'',url);
  }, [sendCommand]);

  const changeChapter=useCallback((value:number)=>{
    const chapter=normalizeChapter(value);setReaderChapter(chapter);
    let nextFilters=normalizeFilters(filters,chapter);
    if(nextFilters.state!=='all'&&nextFilters.state!=='multi'&&!isStateDiscovered(nextFilters.state,chapter)){nextFilters=DEFAULT_FILTERS;setSelectedState(null);}
    setFilters(nextFilters);
    const url=new URL(window.location.href);url.searchParams.set('chapter',String(chapter));
    if(selectedState&&!isStateDiscovered(selectedState,chapter)){setSelectedState(null);url.searchParams.delete('state');}
    writeFilterParams(url,nextFilters);
    const siteId=url.searchParams.get('site');
    if(siteId&&!getVisibleSites(chapter,nextFilters,showSilhouettes).some(site=>site.id===siteId)){setSelectedSiteId(null);url.searchParams.delete('site');}
    window.history.replaceState(null,'',url);
    try{localStorage.setItem('kingdom-reader-chapter',String(chapter));}catch{}
  },[filters,showSilhouettes,selectedState]);
  const changeSilhouettes=useCallback((visible:boolean)=>{
    setShowSilhouettes(visible);try{localStorage.setItem('kingdom-silhouettes',String(visible));}catch{}
    const url=new URL(window.location.href);url.searchParams.set('spoilers',visible?'silhouettes':'hidden');
    const siteId=url.searchParams.get('site');
    if(siteId&&!getVisibleSites(readerChapter,effectiveFilters,visible).some(site=>site.id===siteId)){setSelectedSiteId(null);url.searchParams.delete('site');}
    window.history.replaceState(null,'',url);
  },[readerChapter,effectiveFilters]);

  function flyToArc(arcId:string,chapter=readerChapter){
    const destination=getArcDestination(arcId,chapter,showSilhouettes);
    if(!destination)return;
    setSelectedState(destination.stateId);
    setCommand({type:'region',id:++commandId.current,point:destination.point});
  }

  function chooseVolume(volume:AtlasVolume){
    if(volume.chapters[0]>readerChapter)return;
    const chapter=normalizeChapter(volume.chapters[0]);
    setReaderChapter(chapter);setFilters(DEFAULT_FILTERS);setSelectedSiteId(null);
    const url=new URL(window.location.href);url.searchParams.set('chapter',String(chapter));
    writeFilterParams(url,DEFAULT_FILTERS);url.searchParams.delete('site');url.searchParams.delete('state');
    window.history.replaceState(null,'',url);
    try{localStorage.setItem('kingdom-reader-chapter',String(chapter));}catch{}
    const arc=getVolumeArc(volume);if(arc)flyToArc(arc.id,chapter);
  }

  function locateCharacter(character:AtlasCharacter){
    if(character.debutChapter>readerChapter)return;
    setFilters(DEFAULT_FILTERS);setSelectedSiteId(null);
    const url=new URL(window.location.href);writeFilterParams(url,DEFAULT_FILTERS);
    url.searchParams.delete('site');url.searchParams.delete('state');window.history.replaceState(null,'',url);
    flyToArc(character.debutArcId);
  }

  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback((message: string) => setError(message), []);

  function handleMapKeys(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === '+' || event.key === '=') { event.preventDefault(); sendCommand('zoom-in'); }
    if (event.key === '-') { event.preventDefault(); sendCommand('zoom-out'); }
    if (event.key === 'Home' || event.key === 'Escape') { event.preventDefault(); resetView(); }
  }

  return (
    <div className="atlas-shell" data-dock-open={dockOpen} data-reader-open={Boolean(selectedSite)} data-reader-expanded={readerExpanded}>
      <a className="skip-link" href="#atlas-map">Skip to map</a>
      <header className="atlas-header">
        <a className="atlas-brand" href="/" aria-label="Kingdom, Warring States Atlas home">
          <span className="brand-seal" aria-hidden="true"><span>王</span></span>
          <div><h1>Kingdom</h1><span className="brand-subtitle">Warring States Atlas</span></div>
        </a>
        <div className="reader-progress"><ReaderSettings chapter={readerChapter} onChapterChange={changeChapter} showSilhouettes={showSilhouettes} onShowSilhouettesChange={changeSilhouettes}/></div>

      </header>

      <main className="atlas-main">
        <section id="atlas-map" className="map-region" tabIndex={0} aria-label="Interactive three-dimensional map of the seven Warring States" aria-describedby="map-instructions" onKeyDown={handleMapKeys}>
          <p id="map-instructions" className="sr-only">Drag to pan, scroll or pinch to zoom. Open the Seven States hand to filter landmarks and focus a state. With the map focused, plus and minus zoom, and Home resets the view.</p>
          <div className="scene-viewport" aria-busy={!ready && !error}>
            {progressReady&&<MapScene selectedState={selectedState} onSelectState={selectState} selectedSiteId={selectedSite?.id??null} readerExpanded={readerExpanded} onSelectSite={selectSite} terrainVisible={terrainVisible} labelsVisible={labelsVisible}
              readerChapter={readerChapter} showSilhouettes={showSilhouettes} filters={effectiveFilters} command={command} onReady={onReady} onError={onError} />}
          </div>
          {progressReady&&<>
            <StateDock chapter={readerChapter} selectedState={effectiveFilters.state==='all'||effectiveFilters.state==='multi'?null:effectiveFilters.state} onSelect={id=>{if(isStateDiscovered(id,readerChapter)){selectSite(null);changeFilters(effectiveFilters.state===id?DEFAULT_FILTERS:{state:id,arc:'all'});}}} onReset={()=>changeFilters(DEFAULT_FILTERS)} onOpenChange={setDockOpen}/>
            <VolumeFilmstrip chapter={readerChapter} dockOpen={dockOpen} onChoose={chooseVolume}/>
          </>}
          {selectedSite&&<ReaderCard key={selectedSite.id} site={selectedSite} chapter={readerChapter} arcId={effectiveFilters.arc} onClose={closeReader} onExpandedChange={setReaderExpanded}/>}
          <div className="map-heading" aria-hidden="true"><span>中國 · China</span><p>The divided realm</p></div>
          <div className="chapter-legend" aria-label={`Map discovered through chapter ${readerChapter}. Unexplored areas ${showSilhouettes?'show silhouettes':'fully hidden'}. Latest release estimate ${LATEST_RELEASE_CHAPTER}.`}><span><i/>Discovered</span><span><i/>{showSilhouettes?'Uncharted':'Unexplored hidden'}</span><span className="frontier-key">Discovery frontier</span></div>
          {filtersActive&&<div className="active-filter-summary"><span title={filteredArc?.name??stateFilterName}>{filteredArc?.name??stateFilterName}<small>{visibleSites.length} {visibleSites.length===1?'landmark':'landmarks'}</small></span><button type="button" aria-label="Clear landmark filters" onClick={()=>changeFilters(DEFAULT_FILTERS)}><X size={14}/></button></div>}
          <div className="map-top-tools">
            {progressReady&&<CharacterCast chapter={readerChapter} onLocate={locateCharacter}/>}
            {progressReady&&<LandmarkFilters filters={effectiveFilters} chapter={readerChapter} showSilhouettes={showSilhouettes} onChange={changeFilters}/>}
            <button className="tool-button layers-trigger" aria-label="Map layers" popoverTarget="map-layers"><Layers3 size={16} strokeWidth={1.6} /><span>Layers</span></button>
            <button className="tool-button icon-button" aria-label="Map controls and about this atlas" onClick={() => helpDialog.current?.showModal()}><HelpCircle size={18} strokeWidth={1.6} /></button>
          </div>
          <div id="map-layers" className="layers-popover" popover="auto" role="group" aria-label="Map layers">
            <h3>Map layers</h3>
            <label><input type="checkbox" checked={terrainVisible} onChange={(event) => setTerrainVisible(event.target.checked)} /><span>Terrain relief<small>Ridges, cliffs, and woodlands</small></span></label>
            <label><input type="checkbox" checked={labelsVisible} onChange={(event) => setLabelsVisible(event.target.checked)} /><span>Place names<small>States and their capitals</small></span></label>
          </div>
          <div className="map-navigation" aria-label="Map navigation">
            <span className="north-marker" aria-label="North"><span>N</span><i /></span>
            <div className="zoom-controls">
              <button aria-label="Zoom in" title="Zoom in (+)" onClick={() => sendCommand('zoom-in')}><Plus size={18} /></button>
              <button aria-label="Zoom out" title="Zoom out (−)" onClick={() => sendCommand('zoom-out')}><Minus size={18} /></button>
              <button aria-label="Reset map to realm overview" title="Reset view (Home)" onClick={resetView}><RotateCcw size={16} /></button>
            </div>
          </div>
          <div className="map-footer"><span className="map-footnote">A schematic atlas · Borders are illustrative</span></div>
          <div className="map-scale" aria-label="Schematic scale"><span />Schematic · not to scale</div>
          {!error&&<AtlasIntro ready={ready} blocked={Boolean(selectedSite)||dockOpen||filtersActive} onHelp={()=>helpDialog.current?.showModal()}/>}
          {error && <div className="map-error" role="alert"><Compass size={28} /><h2>The map could not open</h2><p>{error}</p><button className="retry-button" onClick={() => window.location.reload()}>Reload atlas</button></div>}
          <div className="sr-only" role="status">{selected ? `${selected.name} selected. Capital: ${selected.capital.name}.` : 'Showing all seven states.'}</div>
        </section>
      </main>

      <dialog ref={helpDialog} className="help-dialog" onClick={(event) => { if (event.target === event.currentTarget) helpDialog.current?.close(); }}>
        <div className="dialog-header"><span className="dialog-icon"><Compass size={22} /></span><button className="icon-button" autoFocus aria-label="Close map help" onClick={() => helpDialog.current?.close()}><X size={20} /></button></div>
        <span className="intro-kicker">Your field guide</span><h2>Explore the divided realm.</h2>
        <p>Select a story miniature to travel to it and open its reader card. The brass frontier separates discovered ground from later story regions; later stories have no active targets.</p>
        <dl className="control-guide"><div><dt>Move across the map</dt><dd>Drag with one finger or the left mouse button</dd></div><div><dt>Look closer</dt><dd>Scroll or pinch to zoom</dd></div><div><dt>Find a state</dt><dd>Draw a card from the Seven States hand</dd></div><div><dt>Use the keyboard</dt><dd>Focus the map, then <kbd>+</kbd> / <kbd>−</kbd> to zoom and <kbd>Home</kbd> to reset</dd></div></dl>
        <p className="dialog-note">The floating atlas · Phase 5<br />Camera travel stops when you drag or zoom. On a phone, use the reader card’s handle for more room to read. Your reduced-motion preference is respected. Chapter regions and locations are illustrative.</p>
      </dialog>
    </div>
  );
}
