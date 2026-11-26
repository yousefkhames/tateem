// Generates the README screenshots from a seeded demo child (demo data only).
import puppeteer from 'puppeteer-core'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname);
const server = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, r)); const url = `http://localhost:${server.address().port}/?nosw=1&today=2026-11-26`;
const d = (k, date) => [k, { status: 'done', date, note: '' }];
const seed = { v: 1, lang: 'ar', active: 'demo', notify: false, lead: 3, lastNotified: {}, children: [{ id: 'demo', name: 'ليلى', dob: '2026-05-30', sex: 'f', custom: [],
  records: Object.fromEntries([d('s0:bcg', '2026-05-31'), d('s0:hepb0', '2026-05-30'), d('s0:opv', '2026-05-30'), d('s2:penta', '2026-07-30'), d('s2:opv', '2026-07-30'), d('s2:ipv', '2026-07-30'), d('s2:rota', '2026-07-30'), d('s2:pcv', '2026-07-30'),
    d('s4:penta', '2026-09-30'), d('s4:opv', '2026-09-30'), d('s4:ipv', '2026-09-30'), d('s4:rota', '2026-09-30'), d('s4:pcv', '2026-09-30')]),
  growth: [{ id: 'g1', date: '2026-05-30', w: 3.3, h: 50, hc: 34, note: '' }, { id: 'g2', date: '2026-07-30', w: 5.2, h: 58, hc: 38, note: '' }, { id: 'g3', date: '2026-09-30', w: 6.4, h: 63, hc: 40, note: 'بعد التطعيم كانت هادئة' }, { id: 'g4', date: '2026-11-20', w: 7.1, h: 66, hc: 41, note: '' }] }] };
const b = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
const pg = await b.newPage(); await pg.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
await pg.goto(url); await pg.evaluate(s => localStorage.setItem('tateem.v1', JSON.stringify(s)), seed); await pg.reload({ waitUntil: 'networkidle0' });
fs.mkdirSync('docs', { recursive: true }); const shot = async n => { await new Promise(r => setTimeout(r, 300)); await pg.screenshot({ path: `docs/${n}.png` }); };
const tab = async v => { await pg.click(`[data-act=tab][data-v=${v}]`); await pg.evaluate(() => window.scrollTo(0, 0)); };
await shot('home');
await tab('plan'); await shot('schedule');
await pg.click('.vrow[data-key="s6:penta"]'); await pg.waitForSelector('#fDose'); await shot('dose'); await pg.click('.x');
await tab('growth'); await shot('growth');
await tab('more'); await shot('reminders');
await pg.click('[data-act=lang]'); await tab('home'); await shot('home-en');
await b.close(); server.close();
