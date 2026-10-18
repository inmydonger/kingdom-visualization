import { STATES, type Point, type StateId } from './atlas-data';
import { ARCS, STORY_SITES, isSiteDiscovered } from './story-data';
import { normalizeChapter } from './progression';

export type CampaignRoute = { attacker:StateId; defender:StateId; points:Point[]; label:Point };
// Campaign directions follow the story dataset; paths are schematic, not troop coordinates.
// Coalition membership: https://kingdom.fandom.com/wiki/Coalition_Invasion_Arc
const offensives:Record<string,readonly [StateId,StateId][]> = {
  'keiyou-campaign':[['qin','wei']], 'battle-of-bayou':[['zhao','qin']],
  'sanyou-campaign':[['qin','wei']], 'sanyou-aftermath':[['qin','wei']],
  'coalition-invasion':[['zhao','qin'],['wei','qin'],['chu','qin'],['yan','qin'],['han','qin']],
  'fire-dragons':[['qin','wei']], 'koku-you':[['qin','zhao']],
  'western-zhao':[['qin','zhao']], 'three-states':[['qin','chu'],['wei','chu']],
  'eikyuu':[['qin','zhao']], 'zhao-retaliation':[['qin','zhao']],
  'hango':[['qin','zhao']], 'three-pillars':[['qin','han']],
  'conquest-of-han':[['qin','han']], 'great-qin-zhao-war':[['qin','zhao']],
};
const coalition:Partial<Record<StateId,Point[]>>={
  zhao:[[46,20],[43,23],[39.5,27],[39.2,31.4]],
  wei:[[56,36],[52,32.5],[47,31.8],[41.5,33.3]],
  chu:[[51,53],[46,49],[40,46],[38.7,39.8]],
  yan:[[74,14],[65,13],[53,17],[39,29.5]],
  han:[[46.8,40.7],[46,39.5],[44,38],[40.8,35.7]],
};

export function getCampaignRoutes(arcId:string,readChapter:number):CampaignRoute[]{
  const chapter=normalizeChapter(readChapter),arc=ARCS.find(a=>a.id===arcId);
  if(!arc||arc.chapterStart>chapter||!isSiteDiscovered(arc.siteId,chapter))return [];
  const site=STORY_SITES.find(s=>s.id===arc.siteId)!;
  return (offensives[arcId]??[]).map(([attacker,defender])=>{
    let points:Point[];
    if(arcId==='coalition-invasion')points=coalition[attacker]!;
    else {
      const start:Point=attacker==='qin'?[34,33]:attacker==='wei'?[56,39]:STATES.find(s=>s.id===attacker)!.label;
      const end=site.position,dx=end[0]-start[0],dy=end[1]-start[1];
      const bend=attacker==='wei'?-1.5:2;
      points=[start,[start[0]+dx*.35-dy*.08,start[1]+dy*.35+bend],[start[0]+dx*.7-dy*.06,start[1]+dy*.7+bend],end];
    }
    return {attacker,defender,points,label:points[0]};
  });
}
