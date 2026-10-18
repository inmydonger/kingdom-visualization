'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Compass, HelpCircle, List, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { STATES, type StateId, type Point } from '@/lib/atlas-data';
import MapScene from './MapScene';
import ReaderSettings from './ReaderSettings';
import ReaderCard from './ReaderCard';
import StoryArcPicker from './StoryArcPicker';
import VolumeFilmstrip from './VolumeFilmstrip';
import CharacterCast from './CharacterCast';
import AtlasIntro from './AtlasIntro';
import { VOLUMES, getVolumeArc, type AtlasVolume, type AtlasCharacter } from '@/lib/media-data';
import { isStateDiscovered } from '@/lib/state-discovery';
import { getArcDestination } from '@/lib/atlas-navigation';
import { advanceExploration, restoreExploration } from '@/lib/reader-progress';
import { getCampaignRoutes } from '@/lib/campaign-data';
import { STORY_SITES } from '@/lib/story-data';
import { DEFAULT_FILTERS, getFilterArcs, getVisibleSites, normalizeFilters, type LandmarkFilters as LandmarkFilterState } from '@/lib/landmark-filters';
import { DEFAULT_READER_CHAPTER, LATEST_RELEASE_CHAPTER, normalizeChapter } from '@/lib/progression';

type MapCommand = { type: 'reset' | 'zoom-in' | 'zoom-out' | 'focus' | 'site' | 'region' | 'campaign'; id: number; stateId?: StateId; siteId?: string; arcId?:string; point?:Point };

function writeFilterParams(url:URL,filters:LandmarkFilterState){
  url.searchParams.delete('filter');
  if(filters.arc==='all')url.searchParams.delete('arc');else url.searchParams.set('arc',filters.arc);
}

export default function Atlas() {
  const [selectedState, setSelectedState] = useState<StateId | null>(null);
  const [selectedSiteId,setSelectedSiteId]=useState<string|null>(null);
  const [exploredChapter,setExploredChapter]=useState(DEFAULT_READER_CHAPTER);
  const [readerChapter,setReaderChapter]=useState(DEFAULT_READER_CHAPTER);
  const [selectedVolume,setSelectedVolume]=useState<number|null>(null);
  const [readerArcId,setReaderArcId]=useState<string|null>(null);
  const [showSilhouettes,setShowSilhouettes]=useState(true);
  const [filters,setFilters]=useState<LandmarkFilterState>(DEFAULT_FILTERS);
  const [progressReady,setProgressReady]=useState(false);
  const [command, setCommand] = useState<MapCommand | null>(null);
  const [legendOpen,setLegendOpen]=useState(false);
  const [readerExpanded,setReaderExpanded]=useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);
  const commandId = useRef(0);
  const selected = STATES.find((state) => state.id === selectedState);
  const effectiveFilters=useMemo(()=>normalizeFilters(filters,exploredChapter),[filters,exploredChapter]);
  const visibleSites=useMemo(()=>getVisibleSites(exploredChapter,effectiveFilters,showSilhouettes),[exploredChapter,effectiveFilters,showSilhouettes]);
  const campaignArcId=effectiveFilters.arc==='all'?(readerArcId??'all'):effectiveFilters.arc;
  const selectedSite=progressReady?visibleSites.find(site=>site.id===selectedSiteId):undefined;

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
    setSelectedSiteId(siteId);if(!siteId)setReaderArcId(null);
    const url=new URL(window.location.href);
    if(site){
      url.searchParams.set('site',site.id);url.searchParams.delete('state');
      setSelectedState(site.stateId==='multi'?null:site.stateId);
      setCommand({type:'site',id:++commandId.current,siteId:site.id});
    }else url.searchParams.delete('site');
    window.history.replaceState(null,'',url);
  },[visibleSites]);

  const changeFilters=useCallback((value:LandmarkFilterState)=>{
    setSelectedVolume(null);
    const next=normalizeFilters({state:'all',arc:value.arc},exploredChapter);setFilters(next);
    const url=new URL(window.location.href);url.searchParams.delete('volume');writeFilterParams(url,next);
    if(selectedSiteId&&!getVisibleSites(exploredChapter,next,showSilhouettes).some(site=>site.id===selectedSiteId)){
      setSelectedSiteId(null);url.searchParams.delete('site');
    }
    if(next.arc!=='all'){
      const arc=getFilterArcs(exploredChapter,next.state).find(candidate=>candidate.id===next.arc)!;
      const site=STORY_SITES.find(candidate=>candidate.id===arc.siteId)!;
      url.searchParams.delete('state');setSelectedState(site.stateId==='multi'?null:site.stateId);
      if(getCampaignRoutes(arc.id,exploredChapter).length)setCommand({type:'campaign',id:++commandId.current,arcId:arc.id});
      else if(getVisibleSites(exploredChapter,next,showSilhouettes).some(candidate=>candidate.id===site.id))setCommand({type:'site',id:++commandId.current,siteId:site.id});
    }
    if(next.state==='all'&&next.arc==='all'){setSelectedState(null);url.searchParams.delete('state');}
    window.history.replaceState(null,'',url);
  },[exploredChapter,selectedSiteId,showSilhouettes]);

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
    let savedChapter:string|null=null,savedSilhouettes:string|null=null,savedExploration:string|null=null;
    try{savedChapter=localStorage.getItem('kingdom-reader-chapter');savedExploration=localStorage.getItem('kingdom-explored-chapter');savedSilhouettes=localStorage.getItem('kingdom-silhouettes');}catch{}
    const chapter=params.get('chapter')??savedChapter;
    const initialChapter=chapter===null||chapter.trim()===''?DEFAULT_READER_CHAPTER:normalizeChapter(Number(chapter));
    const read=restoreExploration(initialChapter,savedExploration,savedChapter);
    const volume=VOLUMES.find(v=>v.volume===Number(params.get('volume'))&&v.chapters[0]<=read);
    const initialFilters=normalizeFilters({state:'all',arc:params.get('arc')??(volume?getVolumeArc(volume)?.id:undefined)??'all'},read);
    const initialSilhouettes=params.get('spoilers')==='hidden'?false:params.get('spoilers')==='silhouettes'?true:savedSilhouettes!=='false';
    setReaderChapter(initialChapter);setExploredChapter(read);setSelectedVolume(volume?.volume??null);
    setShowSilhouettes(initialSilhouettes);setFilters(initialFilters);
    setProgressReady(true);
    const value = params.get('state');
    const site=STORY_SITES.find(candidate=>candidate.id===params.get('site'));
    if(site&&getVisibleSites(read,initialFilters,initialSilhouettes).some(candidate=>candidate.id===site.id)){
      setSelectedSiteId(site.id);setSelectedState(site.stateId==='multi'?null:site.stateId);
      setCommand({type:'site',id:++commandId.current,siteId:site.id});
    }else if (STATES.some((state) => state.id === value && isStateDiscovered(state.id,read))) {
      setSelectedState(value as StateId);
      sendCommand('focus', value as StateId);
    }else if(initialFilters.arc!=='all'){
      const arc=getFilterArcs(read,initialFilters.state).find(candidate=>candidate.id===initialFilters.arc)!;
      const visible=getVisibleSites(read,initialFilters,initialSilhouettes).find(candidate=>candidate.id===arc.siteId);
      if(visible){setSelectedState(visible.stateId==='multi'?null:visible.stateId);setCommand(getCampaignRoutes(arc.id,read).length?{type:'campaign',id:++commandId.current,arcId:arc.id}:{type:'site',id:++commandId.current,siteId:visible.id});}
    }
    const url=new URL(window.location.href);writeFilterParams(url,initialFilters);if(!volume)url.searchParams.delete('volume');
    if(params.has('state')&&!STATES.some(state=>state.id===value&&isStateDiscovered(state.id,read)))url.searchParams.delete('state');
    if(params.has('site')&&!getVisibleSites(read,initialFilters,initialSilhouettes).some(candidate=>candidate.id===params.get('site')))url.searchParams.delete('site');
    window.history.replaceState(null,'',url);
  }, [sendCommand]);

  useEffect(()=>{
    if(!progressReady)return;
    try{localStorage.setItem('kingdom-reader-chapter',String(readerChapter));localStorage.setItem('kingdom-explored-chapter',String(exploredChapter));}catch{}
  },[readerChapter,exploredChapter,progressReady]);

  const changeChapter=useCallback((value:number)=>{
    const chapter=normalizeChapter(value),read=advanceExploration(exploredChapter,chapter);
    setReaderChapter(chapter);setExploredChapter(read);setSelectedVolume(null);
    const nextFilters=normalizeFilters(filters,read);setFilters(nextFilters);
    const url=new URL(window.location.href);url.searchParams.set('chapter',String(chapter));url.searchParams.delete('volume');
    writeFilterParams(url,nextFilters);window.history.replaceState(null,'',url);
  },[exploredChapter,filters]);
  const changeSilhouettes=useCallback((visible:boolean)=>{
    setShowSilhouettes(visible);try{localStorage.setItem('kingdom-silhouettes',String(visible));}catch{}
    const url=new URL(window.location.href);url.searchParams.set('spoilers',visible?'silhouettes':'hidden');
    const siteId=url.searchParams.get('site');
    if(siteId&&!getVisibleSites(exploredChapter,effectiveFilters,visible).some(site=>site.id===siteId)){setSelectedSiteId(null);url.searchParams.delete('site');}
    window.history.replaceState(null,'',url);
  },[exploredChapter,effectiveFilters]);

  function flyToArc(arcId:string,chapter=exploredChapter){
    const destination=getArcDestination(arcId,chapter,showSilhouettes);
    if(!destination)return;
    setSelectedState(destination.stateId);
    setCommand({type:'region',id:++commandId.current,point:destination.point});
  }

  function chooseVolume(volume:AtlasVolume){
    if(volume.chapters[0]>exploredChapter)return;
    const arc=getVolumeArc(volume);if(!arc)return;
    const next=normalizeFilters({state:'all',arc:arc.id},exploredChapter);
    setSelectedVolume(volume.volume);setFilters(next);setSelectedSiteId(null);setSelectedState(null);
    const url=new URL(window.location.href);url.searchParams.set('volume',String(volume.volume));
    writeFilterParams(url,next);url.searchParams.delete('site');url.searchParams.delete('state');
    window.history.replaceState(null,'',url);
    if(getCampaignRoutes(arc.id,exploredChapter).length)setCommand({type:'campaign',id:++commandId.current,arcId:arc.id});
    else flyToArc(arc.id);
  }

  function locateCharacter(character:AtlasCharacter){
    if(character.debutChapter>exploredChapter)return;
    setFilters(DEFAULT_FILTERS);setSelectedSiteId(null);setSelectedVolume(null);
    const url=new URL(window.location.href);writeFilterParams(url,DEFAULT_FILTERS);
    url.searchParams.delete('site');url.searchParams.delete('state');url.searchParams.delete('volume');window.history.replaceState(null,'',url);
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
    <div className="atlas-shell" data-explored-chapter={exploredChapter} data-reader-open={Boolean(selectedSite)} data-reader-expanded={readerExpanded}>
      <a className="skip-link" href="#atlas-map">Skip to map</a>
      <header className="atlas-header">
        <a className="atlas-brand" href="/" aria-label="Kingdom, Warring States Atlas home">
          <span className="brand-seal" aria-hidden="true"><span>王</span></span>
          <div><h1>Kingdom</h1><span className="brand-subtitle">Warring States Atlas</span></div>
        </a>
        <div className="reader-progress"><ReaderSettings chapter={readerChapter} exploredChapter={exploredChapter} onChapterChange={changeChapter} showSilhouettes={showSilhouettes} onShowSilhouettesChange={changeSilhouettes}/>{progressReady&&<StoryArcPicker chapter={exploredChapter} arc={effectiveFilters.arc} onChange={arc=>changeFilters({state:'all',arc})}/>}
          {effectiveFilters.arc!=='all'&&getCampaignRoutes(effectiveFilters.arc,exploredChapter).length===0&&<span className="arc-context">No interstate offensive in this arc</span>}
        </div>

      </header>

      <main className="atlas-main">
        <section id="atlas-map" className="map-region" tabIndex={0} aria-label="Interactive three-dimensional map of the seven Warring States" aria-describedby="map-instructions" onKeyDown={handleMapKeys}>
          <p id="map-instructions" className="sr-only">Drag to pan, scroll or pinch to zoom. Choose a story arc below your chapter to follow its landmarks. With the map focused, plus and minus zoom, and Home resets the view.</p>
          <div className="scene-viewport" aria-busy={!ready && !error}>
            {progressReady&&<MapScene selectedState={selectedState} onSelectState={selectState} selectedSiteId={selectedSite?.id??null} readerExpanded={readerExpanded} onSelectSite={selectSite}
              readerChapter={exploredChapter} campaignArcId={campaignArcId} showSilhouettes={showSilhouettes} filters={effectiveFilters} command={command} onReady={onReady} onError={onError} />}
          </div>
          {progressReady&&<VolumeFilmstrip chapter={exploredChapter} selectedVolume={selectedVolume} onChoose={chooseVolume}/>}
          {selectedSite&&<ReaderCard key={selectedSite.id} site={selectedSite} chapter={exploredChapter} arcId={effectiveFilters.arc} onClose={closeReader} onActiveArcChange={setReaderArcId} onExpandedChange={setReaderExpanded}/>}
          <div className="map-top-tools" role="group" aria-label="Map tools">
            {progressReady&&<CharacterCast chapter={exploredChapter} onLocate={locateCharacter}/>}
            <button type="button" className="tool-button icon-button" title="Map guide" aria-label="Map controls and about this atlas" onClick={() => helpDialog.current?.showModal()}><HelpCircle size={18} strokeWidth={1.6} /></button>
            <button type="button" className="tool-button icon-button" title="Map legend" aria-label="Map legend" aria-expanded={legendOpen} aria-controls="map-legend" popoverTarget="map-legend"><List size={18} strokeWidth={1.6}/></button>
          </div>
          <div id="map-legend" className="legend-popover" popover="auto" role="region" aria-labelledby="legend-title" onToggle={event=>setLegendOpen(event.newState==='open')}>
            <h2 id="legend-title">Map legend</h2>
            <dl className="legend-keys">
              <div><dt><i className="legend-land"/>Discovered</dt><dd>Exploration saved through chapter {exploredChapter}.</dd></div>
              <div><dt><i className="legend-fog"/>{showSilhouettes?'Uncharted':'Unexplored hidden'}</dt><dd>{showSilhouettes?'Unnamed silhouettes beyond your chapter.':'Unreached places stay out of view.'}</dd></div>
              <div><dt><i className="legend-frontier"/>Discovery frontier</dt><dd>The brass line follows your reading progress.</dd></div>
              <div><dt><i className="legend-reader"/>Explored through · {exploredChapter}</dt><dd>Revisiting older stories keeps this frontier revealed.</dd></div>
              <div><dt><i className="legend-arrow"/>Campaign arrows</dt><dd>Selected offensives use the attacking state’s color. Paths are schematic.</dd></div>
              <div><dt><i className="legend-latest"/>Latest release · {LATEST_RELEASE_CHAPTER}</dt><dd>A configured estimate, rather than a live chapter count.</dd></div>
            </dl>
            <p>A schematic atlas. Borders and terrain are illustrative; distances are not to scale.</p>
          </div>
          <div className="map-navigation" aria-label="Map navigation">
            <span className="north-marker" aria-label="North"><span>N</span><i /></span>
            <div className="zoom-controls">
              <button aria-label="Zoom in" title="Zoom in (+)" onClick={() => sendCommand('zoom-in')}><Plus size={18} /></button>
              <button aria-label="Zoom out" title="Zoom out (−)" onClick={() => sendCommand('zoom-out')}><Minus size={18} /></button>
              <button aria-label="Reset map to realm overview" title="Reset view (Home)" onClick={resetView}><RotateCcw size={16} /></button>
            </div>
          </div>
          {!error&&<AtlasIntro ready={ready}/>}
          {error && <div className="map-error" role="alert"><Compass size={28} /><h2>The map could not open</h2><p>{error}</p><button className="retry-button" onClick={() => window.location.reload()}>Reload atlas</button></div>}
          <div className="sr-only" role="status">{selected ? `${selected.name} selected. Capital: ${selected.capital.name}.` : 'Showing all seven states.'}</div>
        </section>
      </main>

      <dialog ref={helpDialog} className="help-dialog" onClick={(event) => { if (event.target === event.currentTarget) helpDialog.current?.close(); }}>
        <div className="dialog-header"><span className="dialog-icon"><Compass size={22} /></span><button className="icon-button" autoFocus aria-label="Close map help" onClick={() => helpDialog.current?.close()}><X size={20} /></button></div>
        <span className="intro-kicker">Your field guide</span><h2>Explore the atlas.</h2>
        <p>Select a story miniature to travel to it and open its reader card. The brass frontier separates discovered ground from later story regions; later stories have no active targets.</p>
        <dl className="control-guide"><div><dt>Move across the map</dt><dd>Drag with one finger or the left mouse button</dd></div><div><dt>Look closer</dt><dd>Scroll or pinch to zoom</dd></div><div><dt>Follow a story</dt><dd>Choose a story arc below your chapter, or open a recent volume from the comic stack.</dd></div><div><dt>Use the keyboard</dt><dd>Focus the map, then <kbd>+</kbd> / <kbd>−</kbd> to zoom and <kbd>Home</kbd> to reset</dd></div></dl>
        <p className="dialog-note">Camera travel stops when you drag or zoom. On a phone, use the reader card’s handle for more room to read. Your reduced-motion preference is respected. Chapter regions and locations are illustrative.</p>
      </dialog>
    </div>
  );
}
