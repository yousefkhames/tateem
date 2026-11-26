import puppeteer from 'puppeteer-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const base = process.env.BASE_URL; let server, url = base;
const root = path.resolve(new URL('..', import.meta.url).pathname);
if (!base) {
  server = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); });
  await new Promise(r => server.listen(0, r)); url = `http://localhost:${server.address().port}/`;
}
const shotDir = process.env.SHOTS || '/tmp/tateem-shots'; fs.mkdirSync(shotDir, { recursive: true });
const b = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const errs = [];
try {
  const pg = await b.newPage(); await pg.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const TODAY = '2026-11-26';
  await pg.goto(url + '?nosw=1&today=' + TODAY, { waitUntil: 'networkidle0' });
  const txt = async s => pg.$eval(s, e => e.innerText);
  ok((await pg.$eval('html', e => e.dir)) === 'rtl', 'default Arabic RTL');
  ok(await pg.$('.welcome'), 'welcome screen shows when empty');
  await pg.screenshot({ path: shotDir + '/01-welcome.png' });
  await pg.click('[data-act=lang]'); ok((await pg.$eval('html', e => e.dir)) === 'ltr', 'switch to English LTR');
  ok((await txt('h1')).includes('Welcome'), 'English copy');
  await pg.click('[data-act=lang]');
  await pg.click('[data-act=demo]'); await pg.waitForSelector('.hero'); ok((await txt('.hero h2')).includes('تجريبي'), 'demo child loads');
  ok(Number(await pg.$eval('.stat.g b', e => e.innerText.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)))) === 8, 'demo child has birth + 2-month doses done (8)');
  await pg.click('[data-act=tab][data-v=more]'); await pg.click('[data-act=editChild]'); await pg.waitForSelector('#fChild'); await pg.evaluate(() => { window.confirm = () => true; }); await pg.click('[data-act=delChild]'); await pg.waitForSelector('.welcome');
  await pg.click('[data-act=addChild]'); await pg.waitForSelector('#fChild');
  await pg.click('#fChild button[type=submit]'); ok((await txt('#err')).length > 0, 'empty child form is rejected');
  await pg.type('input[name=name]', 'ليلى'); await pg.$eval('input[name=dob]', e => { e.value = '2026-08-20'; });
  await pg.click('input[name=sex][value=f]'); await pg.click('#fChild button[type=submit]');
  await pg.waitForSelector('.hero'); ok((await txt('.hero h2')) === 'ليلى', 'child created, shown on home');
  const st = JSON.parse(await pg.evaluate(() => localStorage.getItem('tateem.v1'))); ok(st.children.length === 1 && st.children[0].dob === '2026-08-20', 'saved in localStorage');
  // age 3 months+6 days: birth + 2m done? none done -> overdue birth doses & 2m
  ok((await pg.$$('.stat'))[2] && Number(await pg.$eval('.stat.r b', e => e.innerText.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)))) === 8, '8 overdue doses (birth 3 + 2-month 5)');
  await pg.screenshot({ path: shotDir + '/02-home.png' });
  await pg.click('[data-act=tab][data-v=plan]'); await pg.waitForSelector('.timeline');
  ok((await pg.$$('.stage')).length === 8, 'timeline has 8 stages');
  await pg.click('[data-act=stageDone][data-st=s0]'); 
  ok((await pg.$$eval('.stage.done', e => e.length)) === 1, 'stage-done marks whole birth stage');
  await pg.click('.vrow[data-key="s2:penta"]'); await pg.waitForSelector('#fDose');
  ok((await txt('.prot')).includes('الدفتيريا'), 'dose sheet shows what it protects against');
  await pg.$eval('#fDose input[name=date]', e => { e.value = '2026-10-22'; });
  await pg.click('#fDose button[data-v=done]'); await pg.waitForSelector('.timeline');
  const st2 = JSON.parse(await pg.evaluate(() => localStorage.getItem('tateem.v1'))).children[0].records;
  ok(st2['s2:penta'] && st2['s2:penta'].status === 'done' && st2['s2:penta'].date === '2026-10-22', 'dose recorded with date');
  await pg.click('.vrow[data-key="s2:rota"]'); await pg.waitForSelector('#fDose'); await pg.click('#fDose button[data-v=skipped]'); await pg.waitForSelector('.timeline');
  ok((await pg.$$eval('.vrow[data-key="s2:rota"] .pill.skipped', e => e.length)) === 1, 'skip works');
  await pg.click('.vrow[data-key="s2:rota"]'); await pg.waitForSelector('#fDose'); await pg.click('[data-act=resetDose]'); await pg.waitForSelector('.timeline');
  ok((await pg.$$eval('.vrow[data-key="s2:rota"] .pill.overdue', e => e.length)) === 1, 'reset returns to overdue');
  await pg.click('[data-act=filter][data-f=done]'); ok((await pg.$$eval('.vrow', e => e.length)) === 4, 'filter done shows 4');
  await pg.click('[data-act=filter][data-f=all]');
  await pg.click('[data-act=addCustom]'); await pg.waitForSelector('#fCustom'); await pg.type('#fCustom input[name=name]', 'الأنفلونزا الموسمية'); await pg.$eval('#fCustom input[name=months]', e => e.value = '7'); await pg.click('#fCustom button[type=submit]');
  await pg.waitForSelector('.timeline'); ok((await txt('.timeline')).includes('الأنفلونزا الموسمية'), 'custom vaccine added to timeline');
  await pg.screenshot({ path: shotDir + '/03-plan.png' });
  await pg.click('[data-act=tab][data-v=growth]'); ok((await txt('.empty')).length > 0, 'growth empty state');
  await pg.click('[data-act=addGrowth]'); await pg.waitForSelector('#fGrowth');
  await pg.$eval('#fGrowth input[name=date]', e => e.value = '2026-09-20'); await pg.type('input[name=w]', '4.1'); await pg.type('input[name=h]', '54');
  await pg.click('#fGrowth button[type=submit]'); await pg.waitForSelector('.chart');
  await pg.click('[data-act=addGrowth]'); await pg.waitForSelector('#fGrowth'); await pg.type('input[name=w]', '999'); await pg.click('#fGrowth button[type=submit]');
  ok((await txt('#err')).length > 0, 'absurd weight rejected');
  await pg.$eval('#fGrowth input[name=w]', e => e.value = ''); await pg.type('input[name=w]', '5,3'); await pg.type('input[name=h]', '60'); await pg.type('input[name=note]', 'بعد التطعيم');
  await pg.click('#fGrowth button[type=submit]'); await pg.waitForFunction(() => document.querySelectorAll('.gitem').length === 2);
  ok((await pg.$$eval('.chart .delta', e => e.length)) === 2, 'delta shown on both charts');
  ok((await pg.$$eval('.chart polyline', e => e.length)) === 2, 'two line charts drawn');
  await pg.screenshot({ path: shotDir + '/04-growth.png' });
  await pg.click('[data-act=delGrowth]'); await pg.waitForFunction(() => document.querySelectorAll('.gitem').length === 1); ok(true, 'delete growth entry');
  await pg.click('[data-act=tab][data-v=more]');
  // ICS download content
  const ics = await pg.evaluate(async () => { let txt = ''; const orig = URL.createObjectURL; URL.createObjectURL = b => { b.text().then(t => window.__ics = t); return orig.call(URL, b); }; document.querySelector('[data-act=ics]').click(); await new Promise(r => setTimeout(r, 300)); return window.__ics; });
  ok(ics && ics.startsWith('BEGIN:VCALENDAR') && ics.includes('VALARM') && ics.includes('ليلى'), 'ICS download has events and alarms');
  const exp = await pg.evaluate(() => localStorage.getItem('tateem.v1'));
  await pg.screenshot({ path: shotDir + '/05-more.png' });
  // add second child + switch
  await pg.click('[data-act=addChild]'); await pg.waitForSelector('#fChild'); await pg.type('input[name=name]', 'Omar'); await pg.$eval('input[name=dob]', e => e.value = '2026-11-20'); await pg.click('#fChild button[type=submit]');
  await pg.waitForSelector('#kidSel'); ok((await pg.$$eval('#kidSel option', e => e.length)) === 2, 'second child, switcher appears');
  await pg.click('[data-act=tab][data-v=home]'); ok((await txt('.hero h2')) === 'Omar', 'switched to new child');
  await pg.select('#kidSel', JSON.parse(exp).children[0].id); ok((await txt('.hero h2')) === 'ليلى', 'switch back via selector');
  // reload persistence
  await pg.reload({ waitUntil: 'networkidle0' }); ok((await txt('.hero h2')) === 'ليلى', 'data survives reload');
  // import invalid & valid via file input
  fs.writeFileSync('/tmp/bad.json', '{"x":1}'); fs.writeFileSync('/tmp/good.json', exp);
  await pg.click('[data-act=tab][data-v=more]'); const inp = await pg.$('#imp');
  await inp.uploadFile('/tmp/bad.json'); await pg.waitForFunction(() => document.querySelector('#toast').className === 'show'); ok((await txt('#toast')).includes('ملف'), 'invalid import rejected');
  await new Promise(r => setTimeout(r, 2400));
  await (await pg.$('#imp')).uploadFile('/tmp/good.json'); await pg.waitForSelector('.hero'); ok((await pg.$$eval('#kidSel', e => e.length)) === 0, 'import replaced data (single child)');
  // edit + delete child
  await pg.click('[data-act=tab][data-v=more]'); await pg.click('[data-act=editChild]'); await pg.waitForSelector('#fChild'); ok((await pg.$eval('input[name=name]', e => e.value)) === 'ليلى', 'edit sheet prefilled');
  await pg.click('[data-act=closeSheet].btn'); ok(!(await pg.$('.sheet')), 'sheet closes');
  // English pass
  await pg.click('[data-act=lang]'); await pg.click('[data-act=tab][data-v=plan]'); ok((await txt('.timeline')).includes('Pentavalent'), 'English vaccine names');
  await pg.screenshot({ path: shotDir + '/06-plan-en.png' });
  // overflow check
  const ov = await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1); ok(!ov, 'no horizontal overflow at 390px');
  // desktop
  await pg.setViewport({ width: 1280, height: 800 }); await pg.screenshot({ path: shotDir + '/07-desktop.png' });
  // dialogs for delete child
  pg.on('dialog', d => d.accept());
  await pg.click('[data-act=tab][data-v=more]'); await pg.click('[data-act=editChild]'); await pg.waitForSelector('#fChild'); await pg.click('[data-act=delChild]'); await pg.waitForSelector('.welcome'); ok(true, 'delete child returns to welcome');

  // notifications (stubbed granted permission) + Escape + keyboard
  const p2 = await b.newPage(); await p2.setViewport({ width: 390, height: 844 });
  await p2.evaluateOnNewDocument(() => { window.__n = []; window.Notification = function (t, o) { window.__n.push([t, o && o.body]); }; Notification.permission = 'granted'; Notification.requestPermission = () => Promise.resolve('granted'); });
  await p2.goto(url + '?nosw=1&today=2026-11-26', { waitUntil: 'networkidle0' });
  await p2.evaluate(() => localStorage.setItem('tateem.v1', JSON.stringify({ v: 1, lang: 'en', active: 'k', notify: false, lead: 3, children: [{ id: 'k', name: 'Sam', dob: '2026-09-27', sex: 'm', records: {}, growth: [], custom: [] }] })));
  await p2.reload({ waitUntil: 'networkidle0' });
  ok((await p2.evaluate(() => window.__n.length)) === 0, 'no notification while setting is off');
  await p2.click('[data-act=tab][data-v=more]'); await p2.click('#notify + .sl'); await p2.waitForFunction(() => window.__n.length === 1);
  const nn = await p2.evaluate(() => window.__n[0]); ok(nn[0].includes('Sam') && /\d+ doses/.test(nn[1]), 'notification fired with child name and count: ' + nn.join(' / '));
  await p2.reload({ waitUntil: 'networkidle0' }); ok((await p2.evaluate(() => window.__n.length)) === 0, 'not re-fired the same day after reload');
  await p2.click('[data-act=tab][data-v=plan]'); await p2.click('.vrow'); await p2.waitForSelector('.sheet'); await p2.keyboard.press('Escape'); ok(!(await p2.$('.sheet')), 'Escape closes sheet');
  await p2.close();
  ok(errs.length === 0, 'no console/page errors ' + errs.join('|'));
} catch (e) { fails++; console.log('EXCEPTION', e.message); try{(await b.pages())[0].screenshot({path:'/tmp/fail.png'})}catch(x){} }
await new Promise(r=>setTimeout(r,500)); await b.close(); server && server.close();
console.log(`${n - fails}/${n} checks passed`); process.exit(fails ? 1 : 0);
