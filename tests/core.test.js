const test = require('node:test'); const assert = require('node:assert/strict');
const C = require('../js/core.js');
test('addMonths clamps month end', () => {
  assert.equal(C.addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(C.addMonths('2024-01-31', 1), '2024-02-29');
  assert.equal(C.addMonths('2026-11-30', 2), '2027-01-30');
  assert.equal(C.addMonths('2026-03-15', 18), '2027-09-15');
  assert.equal(C.addMonths('2026-03-15', 0), '2026-03-15');
});
test('parseISO rejects bad dates', () => {
  assert.equal(C.parseISO('2026-02-30'), null); assert.equal(C.parseISO('abc'), null); assert.equal(C.parseISO(5), null);
  assert.ok(C.parseISO('2026-02-28'));
});
test('ageMonths', () => {
  assert.equal(C.ageMonths('2026-01-15', '2026-03-14'), 1);
  assert.equal(C.ageMonths('2026-01-15', '2026-03-15'), 2);
  assert.equal(C.ageMonths('2026-01-15', '2025-01-01'), 0);
  assert.deepEqual(C.ageParts('2024-01-10', '2026-04-10'), { years: 2, months: 3, total: 27 });
});
test('plan has expected stages and sorted dues', () => {
  const ch = { id: 'a', name: 'A', dob: '2026-01-01', records: {} };
  const p = C.buildPlan(ch, '2026-01-01');
  assert.equal(p.length, 3 + 5 + 5 + 2 + 2 + 2 + 3 + 2);
  for (let i = 1; i < p.length; i++) assert.ok(p[i - 1].due <= p[i].due);
  assert.equal(p[0].due, '2026-01-01');
});
test('status logic', () => {
  const ch = { id: 'a', name: 'A', dob: '2026-01-01', records: { 's0:bcg': { status: 'done', date: '2026-01-02' }, 's0:opv': { status: 'skipped' } } };
  const p = C.buildPlan(ch, '2026-03-10'); const g = k => p.find(x => x.key === k).status;
  assert.equal(g('s0:bcg'), 'done'); assert.equal(g('s0:opv'), 'skipped'); assert.equal(g('s0:hepb0'), 'overdue');
  assert.equal(g('s2:penta'), 'overdue'); // due 2026-03-01
  assert.equal(g('s4:penta'), 'upcoming'); // due 2026-05-01
  assert.equal(C.buildPlan(ch, '2026-04-20').find(x => x.key === 's4:penta').status, 'soon');
});
test('summary counts add up and next group', () => {
  const ch = { id: 'a', name: 'A', dob: '2026-01-01', records: {} };
  const s = C.summary(ch, '2026-01-01');
  const c = s.counts; assert.equal(c.done + c.skipped + c.overdue + c.soon + c.upcoming, c.total);
  assert.equal(s.nextDate, '2026-01-01'); assert.equal(s.nextGroup.length, 3);
  const ch2 = { id: 'a', name: 'A', dob: '2026-01-01', records: { 's0:bcg': { status: 'done' }, 's0:hepb0': { status: 'done' }, 's0:opv': { status: 'done' } } };
  const s2 = C.summary(ch2, '2026-01-10'); assert.equal(s2.nextDate, '2026-03-01'); assert.equal(s2.pct, Math.round(300 / 24));
});
test('custom vaccine joins plan', () => {
  const ch = { id: 'a', name: 'A', dob: '2026-01-01', records: {}, custom: [{ id: 'z1', ar: 'الأنفلونزا', en: 'Flu', months: 7 }] };
  const p = C.buildPlan(ch, '2026-01-01'); const it = p.find(x => x.custom);
  assert.equal(it.due, '2026-08-01'); assert.equal(it.en, 'Flu');
});
test('reminders pick overdue and soon only', () => {
  const ch = { id: 'a', name: 'A', dob: '2026-01-01', records: {} };
  const r = C.dueForReminder(ch, '2026-02-26', 3);
  assert.ok(r.some(x => x.status === 'overdue')); assert.ok(r.some(x => x.status === 'soon')); assert.ok(!r.some(x => x.status === 'upcoming'));
});
test('ICS is valid shape and escapes', () => {
  const ch = { id: 'a', name: 'Sara, "S"; x', dob: '2026-01-01', records: { 's0:bcg': { status: 'done' }, 's0:hepb0': { status: 'done' }, 's0:opv': { status: 'done' } } };
  const ics = C.buildICS(ch, '2026-01-05', 'en', '20260105T000000Z');
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/); assert.match(ics, /END:VCALENDAR\r\n$/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, (ics.match(/END:VEVENT/g) || []).length);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 7);
  assert.ok(ics.includes('Sara\\, "S"\\; x')); assert.ok(ics.includes('DTSTART;VALUE=DATE:20260301'));
  ics.split('\r\n').forEach(l => assert.ok(l.length <= 75, l));
});
test('growth validation', () => {
  const v = (e) => C.validGrowth(e, '2026-01-01', '2026-06-01');
  assert.ok(v({ date: '2026-03-01', w: '5.2', h: '58' }).ok);
  assert.ok(!v({ date: '2025-12-01', w: 5 }).ok); assert.ok(!v({ date: '2026-07-01', w: 5 }).ok);
  assert.ok(!v({ date: '2026-03-01', w: 99 }).ok); assert.ok(!v({ date: '2026-03-01' }).ok);
  assert.ok(v({ date: '2026-03-01', note: 'fever after shot' }).ok);
  assert.deepEqual(C.growthDelta([{ date: '2026-02-01', w: 4 }, { date: '2026-03-01', w: 4.6 }], 'w'), { diff: 0.6, days: 28 });
  assert.equal(C.growthDelta([{ date: '2026-02-01', w: 4 }], 'w'), null);
});
test('sanitize import rejects junk and cleans', () => {
  assert.equal(C.sanitize(null), null); assert.equal(C.sanitize({}), null);
  const s = C.sanitize({ children: [{ id: 'k', name: '<b>x</b>', dob: '2026-01-01', records: { 's0:bcg': { status: 'done', date: 'bad' }, '!!bad': { status: 'done' }, 's0:opv': { status: 'hack' } }, growth: [{ date: 'no' }, { date: '2026-02-01', w: '4' }] }, { dob: 'bad' }], lang: 'zz', lead: 99 });
  assert.equal(s.children.length, 1); assert.equal(Object.keys(s.children[0].records).length, 1);
  assert.equal(s.children[0].records['s0:bcg'].date, ''); assert.equal(s.children[0].growth.length, 1);
  assert.equal(s.lang, 'ar'); assert.equal(s.lead, 3); assert.equal(s.active, 'k');
});
test('leap day birthdays', () => {
  assert.equal(C.addMonths('2024-02-29', 12), '2025-02-28');
  assert.equal(C.addMonths('2024-02-29', 48), '2028-02-29');
  assert.equal(C.ageMonths('2024-02-29', '2025-02-28'), 11);
  assert.equal(C.ageMonths('2024-02-29', '2025-03-01'), 12);
});
test('every stage vaccine id exists and has both languages', () => {
  C.STAGES.forEach(s => s.v.forEach(v => { const x = C.VACCINES[v]; assert.ok(x && x.ar && x.en && x.pr && x.pe, v); }));
});
test('i18n has same keys in ar and en', () => {
  global.window = {}; require('../js/i18n.js'); const I = window.TATEEM_I18N;
  assert.deepEqual(Object.keys(I.ar).sort(), Object.keys(I.en).sort());
});
