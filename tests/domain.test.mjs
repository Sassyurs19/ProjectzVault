import {test} from 'node:test';
import assert from 'node:assert/strict';
import {utcDate,streakFor,estimatePoints,nextReset} from '../src/domain.mjs';
const checks=(dates)=>dates.map(date=>({date,txHash:'0x'+date}));
test('UTC reset corresponds to 5:30 AM IST',()=>{assert.equal(utcDate('2026-10-28T05:29:59+05:30'),'2026-10-27');assert.equal(utcDate('2026-10-28T05:30:00+05:30'),'2026-10-28');assert.equal(nextReset(Date.parse('2026-10-28T17:48:00Z')),'6h 12m');});
test('streak survives a pending today but breaks after a missed day',()=>{const c=checks(['2026-10-26','2026-10-27']);assert.equal(streakFor(c,Date.parse('2026-10-28T12:00Z')),2);assert.equal(streakFor(c,Date.parse('2026-10-29T12:00Z')),0);});
test('duplicates do not inflate streaks or bonus points',()=>{const c=checks(['2026-10-21','2026-10-22','2026-10-23','2026-10-24','2026-10-25','2026-10-26','2026-10-27','2026-10-27']);assert.equal(streakFor(c,Date.parse('2026-10-28T12:00Z')),7);assert.equal(estimatePoints(c),45);});
test('bonus repeats each seven days, gaps reset the bonus',()=>{const c=checks(Array.from({length:14},(_,i)=>`2026-10-${String(i+1).padStart(2,'0')}`));assert.equal(estimatePoints(c),90);assert.equal(estimatePoints([...c,{date:'2026-10-16'}]),95);});
