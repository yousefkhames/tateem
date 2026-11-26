/* Tateem core: pure logic, no DOM. Works in browser (window.TateemCore) and Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TateemCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // INDICATIVE schedule modelled on the Egyptian national routine schedule.
  // It is NOT an official document. Always check against the Ministry of Health calendar.
  var VACCINES = {
    bcg:   { ar: 'الدرن (BCG)', en: 'BCG (tuberculosis)', pr: 'الدرن الشديد عند الأطفال', pe: 'Severe childhood tuberculosis' },
    hepb0: { ar: 'الكبد الوبائي ب (جرعة الميلاد)', en: 'Hepatitis B (birth dose)', pr: 'فيروس الكبد ب', pe: 'Hepatitis B virus' },
    opv:   { ar: 'شلل الأطفال الفموي (OPV)', en: 'Oral polio (OPV)', pr: 'شلل الأطفال', pe: 'Polio' },
    ipv:   { ar: 'شلل الأطفال المحقون (IPV)', en: 'Injected polio (IPV)', pr: 'شلل الأطفال', pe: 'Polio' },
    penta: { ar: 'الخماسي (DTP-HepB-Hib)', en: 'Pentavalent (DTP-HepB-Hib)', pr: 'الدفتيريا والتيتانوس والسعال الديكي والكبد ب والالتهاب السحائي', pe: 'Diphtheria, tetanus, whooping cough, hepatitis B, Hib' },
    rota:  { ar: 'الروتا (الفموي)', en: 'Rotavirus (oral)', pr: 'إسهال الروتا الحاد', pe: 'Severe rotavirus diarrhoea' },
    pcv:   { ar: 'المكورات الرئوية (PCV)', en: 'Pneumococcal (PCV)', pr: 'الالتهاب الرئوي والسحائي', pe: 'Pneumonia and meningitis' },
    meas:  { ar: 'الحصبة', en: 'Measles', pr: 'الحصبة', pe: 'Measles' },
    mmr:   { ar: 'الحصبة والنكاف والحصبة الألماني (MMR)', en: 'MMR (measles, mumps, rubella)', pr: 'الحصبة والنكاف والحصبة الألماني', pe: 'Measles, mumps, rubella' },
    dtp:   { ar: 'الثلاثي (DTP) المنشط', en: 'DTP booster', pr: 'الدفتيريا والتيتانوس والسعال الديكي', pe: 'Diphtheria, tetanus, whooping cough' },
    dt:    { ar: 'الثنائي (DT) عند دخول المدرسة', en: 'DT (school entry)', pr: 'الدفتيريا والتيتانوس', pe: 'Diphtheria, tetanus' }
  };

  var STAGES = [
    { id: 's0',  months: 0,  ar: 'عند الميلاد', en: 'At birth',   v: ['bcg', 'hepb0', 'opv'] },
    { id: 's2',  months: 2,  ar: 'شهران',       en: '2 months',   v: ['penta', 'opv', 'ipv', 'rota', 'pcv'] },
    { id: 's4',  months: 4,  ar: '4 شهور',      en: '4 months',   v: ['penta', 'opv', 'ipv', 'rota', 'pcv'] },
    { id: 's6',  months: 6,  ar: '6 شهور',      en: '6 months',   v: ['penta', 'opv'] },
    { id: 's9',  months: 9,  ar: '9 شهور',      en: '9 months',   v: ['meas', 'opv'] },
    { id: 's12', months: 12, ar: 'سنة',         en: '12 months',  v: ['mmr', 'pcv'] },
    { id: 's18', months: 18, ar: 'سنة ونصف',    en: '18 months',  v: ['dtp', 'opv', 'mmr'] },
    { id: 's72', months: 72, ar: 'دخول المدرسة', en: 'School entry (about 6 years)', v: ['dt', 'opv'] }
  ];

  var DAY = 86400000;

  function parseISO(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var p = s.split('-').map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    if (d.getUTCFullYear() !== p[0] || d.getUTCMonth() !== p[1] - 1 || d.getUTCDate() !== p[2]) return null;
    return d;
  }
  function toISO(d) { return d.toISOString().slice(0, 10); }
  function todayISO(now) {
    var d = now ? new Date(now) : new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  // add whole months, clamp to end of month (31 Jan + 1 month = 28/29 Feb)
  function addMonths(iso, n) {
    var d = parseISO(iso); if (!d) return null;
    var y = d.getUTCFullYear(), m = d.getUTCMonth() + n, day = d.getUTCDate();
    var ty = y + Math.floor(m / 12), tm = ((m % 12) + 12) % 12;
    var last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
    return toISO(new Date(Date.UTC(ty, tm, Math.min(day, last))));
  }
  function addDays(iso, n) { var d = parseISO(iso); return toISO(new Date(d.getTime() + n * DAY)); }
  function diffDays(a, b) { return Math.round((parseISO(a) - parseISO(b)) / DAY); }
  function ageMonths(dob, on) {
    var a = parseISO(dob), b = parseISO(on); if (!a || !b || b < a) return 0;
    var m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
    if (b.getUTCDate() < a.getUTCDate()) m--;
    return Math.max(0, m);
  }
  function ageParts(dob, on) {
    var m = ageMonths(dob, on);
    return { years: Math.floor(m / 12), months: m % 12, total: m };
  }

  function key(stageId, vid) { return stageId + ':' + vid; }

  function status(item, rec, today, soonDays) {
    if (rec && rec.status === 'done') return 'done';
    if (rec && rec.status === 'skipped') return 'skipped';
    var d = diffDays(item.due, today);
    if (d < 0) return 'overdue';
    if (d <= (soonDays == null ? 14 : soonDays)) return 'soon';
    return 'upcoming';
  }

  function buildPlan(child, today, soonDays) {
    var out = [], recs = child.records || {};
    STAGES.forEach(function (st) {
      var due = addMonths(child.dob, st.months);
      st.v.forEach(function (vid) {
        var it = { key: key(st.id, vid), stage: st.id, months: st.months, due: due, vid: vid, custom: false };
        it.status = status(it, recs[it.key], today, soonDays);
        it.rec = recs[it.key] || null;
        out.push(it);
      });
    });
    (child.custom || []).forEach(function (c) {
      var months = Math.max(0, Math.min(240, Number(c.months) || 0));
      var it = { key: 'c:' + c.id, stage: 'c' + months, months: months, due: addMonths(child.dob, months), vid: c.id, custom: true, ar: c.ar, en: c.en, note: c.note || '' };
      it.status = status(it, recs[it.key], today, soonDays);
      it.rec = recs[it.key] || null;
      out.push(it);
    });
    out.sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : 0; });
    return out;
  }

  function summary(child, today, soonDays) {
    var plan = buildPlan(child, today, soonDays);
    var c = { done: 0, skipped: 0, overdue: 0, soon: 0, upcoming: 0, total: plan.length };
    plan.forEach(function (p) { c[p.status]++; });
    var pending = plan.filter(function (p) { return p.status !== 'done' && p.status !== 'skipped'; });
    var next = pending.filter(function (p) { return p.status !== 'overdue'; })[0] || null;
    var nextDate = next ? next.due : null;
    var nextGroup = nextDate ? pending.filter(function (p) { return p.due === nextDate && p.status !== 'overdue'; }) : [];
    var handled = c.done + c.skipped;
    return { counts: c, plan: plan, nextDate: nextDate, nextGroup: nextGroup, pct: c.total ? Math.round(c.done * 100 / c.total) : 0, handled: handled };
  }

  // items that need a reminder now: overdue, or due within lead days
  function dueForReminder(child, today, leadDays) {
    return buildPlan(child, today, leadDays).filter(function (p) { return p.status === 'overdue' || p.status === 'soon'; });
  }

  function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function fold(line) {
    var out = [], l = line;
    while (l.length > 73) { out.push(l.slice(0, 73)); l = ' ' + l.slice(73); }
    out.push(l); return out.join('\r\n');
  }
  function buildICS(child, today, lang, nowStamp) {
    var plan = buildPlan(child, today).filter(function (p) { return p.status !== 'done' && p.status !== 'skipped'; });
    var groups = {};
    plan.forEach(function (p) { (groups[p.due] = groups[p.due] || []).push(p); });
    var stamp = (nowStamp || new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''));
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tateem//Vaccination reminders//EN', 'CALSCALE:GREGORIAN'];
    Object.keys(groups).sort().forEach(function (date) {
      var names = groups[date].map(function (p) { return p.custom ? p[lang] || p.ar : VACCINES[p.vid][lang]; });
      var d0 = date.replace(/-/g, ''), d1 = addDays(date, 1).replace(/-/g, '');
      var title = (lang === 'ar' ? 'تطعيم ' : 'Vaccines: ') + child.name;
      var desc = names.join(', ') + (lang === 'ar' ? '\nتحقق من التقويم الرسمي لوزارة الصحة.' : '\nCheck against the official Ministry of Health calendar.');
      L.push('BEGIN:VEVENT', 'UID:tateem-' + child.id + '-' + d0 + '@tateem', 'DTSTAMP:' + stamp,
        'DTSTART;VALUE=DATE:' + d0, 'DTEND;VALUE=DATE:' + d1, fold('SUMMARY:' + icsEscape(title)), fold('DESCRIPTION:' + icsEscape(desc)),
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(title), 'TRIGGER:-P1D', 'END:VALARM',
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(title), 'TRIGGER:PT9H', 'END:VALARM', 'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.join('\r\n') + '\r\n';
  }

  // growth
  function sortGrowth(list) { return (list || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }); }
  function validGrowth(e, dob, today) {
    var errs = [];
    if (!parseISO(e.date)) errs.push('date');
    else if (e.date > today || e.date < dob) errs.push('date');
    var w = e.w === '' || e.w == null ? null : Number(e.w), h = e.h === '' || e.h == null ? null : Number(e.h), hc = e.hc === '' || e.hc == null ? null : Number(e.hc);
    if (w != null && !(w > 0.3 && w < 60)) errs.push('w');
    if (h != null && !(h > 20 && h < 160)) errs.push('h');
    if (hc != null && !(hc > 20 && hc < 65)) errs.push('hc');
    if (w == null && h == null && hc == null && !(e.note && String(e.note).trim())) errs.push('empty');
    return { ok: errs.length === 0, errs: errs, w: w, h: h, hc: hc };
  }
  function growthDelta(list, field) {
    var s = sortGrowth(list).filter(function (e) { return e[field] != null; });
    if (s.length < 2) return null;
    var a = s[s.length - 2], b = s[s.length - 1];
    return { diff: Math.round((b[field] - a[field]) * 100) / 100, days: diffDays(b.date, a.date) };
  }

  function uid() { return 'x' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }

  // import sanitising: never trust a file
  function sanitize(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.children)) return null;
    var children = [];
    data.children.slice(0, 20).forEach(function (c) {
      if (!c || !parseISO(c.dob)) return;
      var recs = {};
      Object.keys(c.records || {}).forEach(function (k) {
        var r = c.records[k];
        if (r && (r.status === 'done' || r.status === 'skipped') && /^[\w:.-]{1,40}$/.test(k))
          recs[k] = { status: r.status, date: parseISO(r.date) ? r.date : '', note: String(r.note || '').slice(0, 200) };
      });
      var growth = (Array.isArray(c.growth) ? c.growth : []).slice(0, 500).filter(function (g) { return g && parseISO(g.date); }).map(function (g) {
        var n = function (v) { v = v === '' || v == null ? null : Number(v); return isFinite(v) ? v : null; };
        return { id: String(g.id || uid()).slice(0, 20), date: g.date, w: n(g.w), h: n(g.h), hc: n(g.hc), note: String(g.note || '').slice(0, 300) };
      });
      var custom = (Array.isArray(c.custom) ? c.custom : []).slice(0, 50).filter(function (x) { return x && x.ar != null; }).map(function (x) {
        return { id: String(x.id || uid()).slice(0, 20), ar: String(x.ar).slice(0, 80), en: String(x.en || x.ar).slice(0, 80), months: Math.max(0, Math.min(240, Number(x.months) || 0)), note: String(x.note || '').slice(0, 200) };
      });
      children.push({ id: String(c.id || uid()).slice(0, 20), name: String(c.name || '').slice(0, 40) || '?', dob: c.dob, sex: c.sex === 'f' ? 'f' : 'm', records: recs, growth: growth, custom: custom });
    });
    return { v: 1, lang: data.lang === 'en' ? 'en' : 'ar', children: children, active: children.length ? (data.active && children.some(function (c) { return c.id === data.active; }) ? data.active : children[0].id) : null,
      notify: !!data.notify, lead: [1, 3, 7].indexOf(Number(data.lead)) >= 0 ? Number(data.lead) : 3, lastNotified: data.lastNotified && typeof data.lastNotified === 'object' ? data.lastNotified : {} };
  }

  return { VACCINES: VACCINES, STAGES: STAGES, parseISO: parseISO, todayISO: todayISO, addMonths: addMonths, addDays: addDays, diffDays: diffDays,
    ageMonths: ageMonths, ageParts: ageParts, buildPlan: buildPlan, summary: summary, dueForReminder: dueForReminder, buildICS: buildICS,
    sortGrowth: sortGrowth, validGrowth: validGrowth, growthDelta: growthDelta, sanitize: sanitize, uid: uid, key: key };
});
