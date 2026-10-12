import { describe, it, expect } from 'vitest';
import { createGame, buildRoom } from './game';
describe('safe floor planning', () => {
 it('builds while paused and rejects a room over reception without spending cash', () => {
  const game=createGame(0);
  expect(buildRoom(game,'consult',0,3)).toMatch(/entrance/);
  expect(game.cash).toBe(5500);
  expect(buildRoom(game,'consult',2,1)).toBe('');
  expect(game.cash).toBe(4650);
  expect(game.rooms).toHaveLength(1);
  expect(game.tick).toBe(0);
 });
});

import { hireStaff, assignStaff, step, restoreGame, saveGame, SCENARIOS, satisfaction, sellRoom, grant, checkOutcome, dismissStaff, path, ENTRANCE } from './game';
import type { Game, RoomKind } from './game';
function equip(scenario:number):Game {
 const g=createGame(scenario);
 const kinds:RoomKind[]=['consult',...SCENARIOS[scenario].ailments];
 const sites=[[1,1],[3,3],[7,1],[8,3]];
 kinds.forEach((kind,i)=>{expect(buildRoom(g,kind,...sites[i] as [number,number])).toBe('');expect(hireStaff(g,i===0?'clinician':'technician')).toBe('');expect(assignStaff(g,g.staff.at(-1)!.id,g.rooms.at(-1)!.id)).toBe('');});
 return g;
}
it('rejects overlapping rooms, doors, and corridor cuts atomically',()=>{
 const g=createGame();buildRoom(g,'consult',2,1);
 for(const [x,y] of [[2,1],[2,3],[11,2],[3,7],[-1,0]]){const before=saveGame(g);expect(buildRoom(g,'echo',x,y)).not.toBe('');expect(saveGame(g)).toBe(before);}
 // A sealed reception pocket would make the first room inaccessible.
 const sealed=createGame();buildRoom(sealed,'consult',0,1);buildRoom(sealed,'echo',2,0);
 expect(buildRoom(sealed,'echo',2,2)).not.toBe('');
});
it('technicians cannot diagnose; reassignment and dismissal free capacity',()=>{
 const g=createGame();buildRoom(g,'consult',1,1);buildRoom(g,'echo',4,1);hireStaff(g,'technician');
 const member=g.staff[0];expect(assignStaff(g,member.id,g.rooms[0].id)).not.toBe('');expect(member.room).toBeNull();
 expect(assignStaff(g,member.id,g.rooms[1].id)).toBe('');expect(assignStaff(g,member.id,null)).toBe('');expect(member.room).toBeNull();
 hireStaff(g,'clinician');expect(assignStaff(g,g.staff[1].id,g.rooms[0].id)).toBe('');
 expect(assignStaff(g,g.staff[1].id,g.rooms[1].id)).toBe('');expect(g.staff.filter(s=>s.room===g.rooms[0].id)).toHaveLength(0);
 dismissStaff(g,member.id);expect(g.staff).toHaveLength(1);
});
it.each([0,1,2])('scenario %i is winnable using public management commands',scenario=>{
 const g=equip(scenario);for(let i=0;i<720&&g.status==='active';i++){step(g);expect(g.patients.every(p=>path(g,p,ENTRANCE)!==null)).toBe(true);expect(g.cash).toBe(SCENARIOS[scenario].cash+g.income-g.expenses);}
 expect(g.status).toBe('won');expect(g.cures).toBe(SCENARIOS[scenario].cures);expect(satisfaction(g)).toBeGreaterThanOrEqual(SCENARIOS[scenario].satisfaction);expect(g.walkouts).toBe(0);
 expect(restoreGame(saveGame(g))).toEqual(g);
});
it('a cure earns once and service stalls safely when a worker is reassigned',()=>{
 const g=equip(0);while(!g.patients.some(p=>p.mode==='service'&&p.stage==='treat'))step(g);
 const staff=g.staff[1];assignStaff(g,staff.id,null);const progress=g.patients.find(p=>p.stage==='treat')!.progress;
 for(let i=0;i<5;i++)step(g);expect(g.cures).toBe(0);expect(g.patients.find(p=>p.stage==='treat')!.progress).toBe(progress);
 assignStaff(g,staff.id,g.rooms[1].id);while(g.cures<1)step(g);expect(g.income).toBeGreaterThanOrEqual(950);
 const cured=g.patients.find(p=>p.stage==='exit')!.id;assignStaff(g,staff.id,null);for(let i=0;i<8;i++)step(g);expect(g.cures).toBe(1);expect(g.patients.filter(p=>p.id===cured)).toHaveLength(0);
});
it('selling occupied rooms keeps patients reachable and does not duplicate refunds',()=>{
 const g=equip(0);while(!g.patients.some(p=>p.mode==='service'))step(g);const id=g.rooms[0].id,cash=g.cash;
 expect(sellRoom(g,id)).toBe('');expect(g.cash-cash).toBe(595);expect(g.patients.every(p=>p.target!==id&&path(g,p,ENTRANCE)!==null)).toBe(true);
 const after=g.cash;expect(sellRoom(g,id)).not.toBe('');expect(g.cash).toBe(after);
});
it('exact inclusive objectives, strict bankruptcy and one-time rescue grant',()=>{
 const g=createGame();g.cures=8;g.happiness=520;g.cash=1000;checkOutcome(g);expect(g.status).toBe('won');
 const short=createGame();short.cures=8;short.happiness=520;short.cash=999;checkOutcome(short);expect(short.status).toBe('active');
 short.cash=-500;checkOutcome(short);expect(short.status).toBe('active');short.cash=-501;checkOutcome(short);expect(short.status).toBe('lost');
 const rescue=createGame();grant(rescue);expect(rescue.cash).toBe(7300);grant(rescue);expect(rescue.cash).toBe(7300);
});
it('no treatment leads to walkout failure with a fresh retry state',()=>{
 const g=createGame();while(g.status==='active')step(g);expect(g.status).toBe('lost');expect(g.walkouts).toBe(12);const tick=g.tick;step(g);expect(g.tick).toBe(tick);expect(createGame().walkouts).toBe(0);
});
it('batched ticks and save/reload yield the same deterministic outcome',()=>{
 const a=equip(2),b=restoreGame(saveGame(a));for(let i=0;i<40;i++)for(let j=0;j<4;j++)step(a);for(let i=0;i<160;i++)step(b);expect(a).toEqual(b);
 const c=restoreGame(saveGame(b));for(let i=0;i<10;i++){step(b);step(c);}expect(c).toEqual(b);
});
it('malformed and inconsistent saves are rejected',()=>{
 const g=equip(0);step(g);const good=saveGame(g);expect(restoreGame(good)).toEqual(g);
 const mutations=[(s:Game)=>s.cash=NaN,(s:Game)=>s.scenario=9,(s:Game)=>s.rooms[0].x=100,(s:Game)=>s.staff[0].room=999,(s:Game)=>s.rooms[1].x=1,(s:Game)=>s.nextId=1,(s:Game)=>s.status='won',(s:Game)=>s.tick=-1];
 for(const mutate of mutations){const bad=JSON.parse(good);mutate(bad);expect(()=>restoreGame(JSON.stringify(bad))).toThrow();}
 expect(()=>restoreGame('<script>')).toThrow();
});
