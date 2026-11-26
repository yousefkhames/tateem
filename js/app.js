(function () {
  'use strict';
  var C = window.TateemCore, I = window.TATEEM_I18N, KEY = 'tateem.v1';
  var qs = new URLSearchParams(location.search);
  var TODAY = C.parseISO(qs.get('today') || '') ? qs.get('today') : C.todayISO();
  var S, view = 'home', sheet = null, planFilter = 'all';

  function load() {
    try { var s = C.sanitize(JSON.parse(localStorage.getItem(KEY))); if (s) return s; } catch (e) {}
    return { v: 1, lang: 'ar', children: [], active: null, notify: false, lead: 3, lastNotified: {} };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Storage full or blocked'); } }
  function t(k, v) { var s = (I[S.lang][k] != null ? I[S.lang][k] : k); if (v) Object.keys(v).forEach(function (x) { s = s.split('{' + x + '}').join(v[x]); }); return s; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel, r) { return (r || document).querySelector(sel); }
  function child() { return S.children.filter(function (c) { return c.id === S.active; })[0] || null; }
  function num(n) { return S.lang === 'ar' ? String(n).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }) : String(n); }
  function fmt(iso) {
    if (!iso) return '';
    var d = C.parseISO(iso);
    return new Intl.DateTimeFormat(S.lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
  }
  function vname(it) { return it.custom ? (S.lang === 'ar' ? it.ar : it.en) : C.VACCINES[it.vid][S.lang]; }
  function vprot(it) { return it.custom ? (it.note || '') : C.VACCINES[it.vid][S.lang === 'ar' ? 'pr' : 'pe']; }
  function stageName(months) {
    var st = C.STAGES.filter(function (s) { return s.months === months; })[0];
    if (st) return st[S.lang];
    return S.lang === 'ar' ? num(months) + ' شهر' : months + ' months';
  }
  function ageStr(dob) {
    var a = C.ageParts(dob, TODAY);
    if (a.total < 1) return num(C.diffDays(TODAY, dob)) + ' ' + t('days');
    var p = []; if (a.years) p.push(num(a.years) + ' ' + t('yrs')); if (a.months || !a.years) p.push(num(a.months) + ' ' + t('mos'));
    return p.join(' ');
  }
  function when(iso) {
    var d = C.diffDays(iso, TODAY);
    if (d === 0) return t('today'); if (d > 0) return t('inDays', { n: num(d) }); return t('ago', { n: num(-d) });
  }
  function toast(m) { var e = $('#toast'); e.textContent = m; e.className = 'show'; clearTimeout(toast.t); toast.t = setTimeout(function () { e.className = ''; }, 2200); }
  function stLabel(s) { return t(s === 'soon' ? 'soon' : s); }

  var ICON = {
    home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
    plan: '<path d="M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 14l2.5 2.5L16 12"/>',
    growth: '<path d="M4 20V4M4 20h16M8 15l3-4 3 2 5-7"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'
  };
  function ic(n) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + ICON[n] + '</svg>'; }

  function ring(pct) {
    var r = 46, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    return '<svg class="ring" viewBox="0 0 110 110" role="img" aria-label="' + pct + '%"><circle cx="55" cy="55" r="' + r + '" class="ring-bg"/><circle cx="55" cy="55" r="' + r + '" class="ring-fg" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 55 55)"/><text x="55" y="62" text-anchor="middle" class="ring-t">' + num(pct) + '%</text></svg>';
  }

  /* ---------- views ---------- */
  function header() {
    var c = child();
    var kids = S.children.length > 1 ? '<select id="kidSel" aria-label="' + t('chooseChild') + '">' + S.children.map(function (k) { return '<option value="' + esc(k.id) + '"' + (k.id === S.active ? ' selected' : '') + '>' + esc(k.name) + '</option>'; }).join('') + '</select>' : (c ? '<span class="kid-name">' + esc(c.name) + '</span>' : '');
    return '<header class="top"><div class="brand"><img src="logo.svg" alt="" width="34" height="34"><b>' + t('app') + '</b></div><div class="top-r">' + kids +
      '<button class="chip" data-act="lang" aria-label="' + t('language') + '">' + (S.lang === 'ar' ? 'EN' : 'عربي') + '</button></div></header>';
  }
  function disclaimerBar() { return '<div class="note"><b>' + t('honestTitle') + '</b><span>' + t('honest') + '</span></div>'; }

  function vWelcome() {
    return '<main class="welcome"><img src="logo.svg" alt="" width="96" height="96"><h1>' + t('welcome') + '</h1><p>' + t('welcome2') + '</p>' +
      '<button class="btn big" data-act="addChild">' + ic('plus') + t('addChild') + '</button><button class="btn ghost" data-act="demo">' + t('tryDemo') + '</button>' + disclaimerBar() + '<p class="fine">' + t('install') + '</p></main>';
  }

  function banner(c, sm) {
    var n = sm.counts; if (!n.overdue && !n.soon) return '';
    return '<div class="alert ' + (n.overdue ? 'bad' : 'warn') + '" role="alert">' + ic('bell') + '<span>' + t('alertBanner', { name: esc(c.name), a: num(n.overdue), b: num(n.soon) }) + '</span></div>';
  }

  function vHome(c) {
    var sm = C.summary(c, TODAY), n = sm.counts, nx = sm.nextGroup;
    var h = banner(c, sm);
    h += '<section class="hero"><div class="hero-l"><div class="avatar ' + c.sex + '">' + esc(c.name.charAt(0).toUpperCase()) + '</div><div><h2>' + esc(c.name) + '</h2><p>' + t('age') + ': <b>' + ageStr(c.dob) + '</b></p><p class="muted">' + fmt(c.dob) + '</p></div></div>' + ring(sm.pct) + '</section>';
    h += '<section class="stats"><div class="stat g"><b>' + num(n.done) + '</b><span>' + t('doneN') + '</span></div><div class="stat o"><b>' + num(n.soon) + '</b><span>' + t('soonN') + '</span></div><div class="stat r"><b>' + num(n.overdue) + '</b><span>' + t('overdueN') + '</span></div></section>';
    h += '<section class="card next"><h3>' + t('nextDue') + '</h3>';
    if (!nx.length) h += '<p class="empty">' + t(n.overdue ? 'noNext' : 'allDone') + '</p>';
    else {
      h += '<p class="next-date">' + fmt(sm.nextDate) + ' <span class="pill ' + nx[0].status + '">' + when(sm.nextDate) + '</span></p><p class="muted">' + stageName(nx[0].months) + '</p><ul class="vlist">' +
        nx.map(function (it) { return '<li><button class="vrow" data-act="open" data-key="' + esc(it.key) + '"><span class="dot ' + it.status + '"></span><span>' + esc(vname(it)) + '</span></button></li>'; }).join('') + '</ul>';
    }
    h += '</section>';
    if (n.overdue) {
      h += '<section class="card"><h3>' + t('overdue') + '</h3><ul class="vlist">' + sm.plan.filter(function (p) { return p.status === 'overdue'; }).slice(0, 6).map(function (it) {
        return '<li><button class="vrow" data-act="open" data-key="' + esc(it.key) + '"><span class="dot overdue"></span><span>' + esc(vname(it)) + '<small>' + stageName(it.months) + ' · ' + when(it.due) + '</small></span></button></li>'; }).join('') + '</ul></section>';
    }
    h += disclaimerBar();
    return h;
  }

  function vPlan(c) {
    var sm = C.summary(c, TODAY), groups = {}, order = [];
    sm.plan.forEach(function (p) { if (!groups[p.stage]) { groups[p.stage] = []; order.push(p.stage); } groups[p.stage].push(p); });
    var filters = ['all', 'overdue', 'soon', 'upcoming', 'done'];
    var h = '<div class="filters" role="tablist">' + filters.map(function (f) { return '<button class="chip' + (planFilter === f ? ' on' : '') + '" data-act="filter" data-f="' + f + '">' + (f === 'all' ? (S.lang === 'ar' ? 'الكل' : 'All') : t(f)) + '</button>'; }).join('') + '</div>';
    h += '<ol class="timeline">';
    order.forEach(function (sid) {
      var items = groups[sid].filter(function (p) { return planFilter === 'all' || p.status === planFilter || (planFilter === 'done' && p.status === 'skipped'); });
      if (!items.length) return;
      var all = groups[sid], pend = all.filter(function (p) { return p.status !== 'done' && p.status !== 'skipped'; }).length;
      var worst = all.some(function (p) { return p.status === 'overdue'; }) ? 'overdue' : all.some(function (p) { return p.status === 'soon'; }) ? 'soon' : pend ? 'upcoming' : 'done';
      var m = all[0].months;
      h += '<li class="stage ' + worst + '"><div class="badge"><b>' + num(m) + '</b><small>' + (S.lang === 'ar' ? 'شهر' : 'mo') + '</small></div><div class="stage-body"><div class="stage-h"><div><h3>' + stageName(m) + '</h3><p class="muted">' + fmt(all[0].due) + '</p></div>' +
        (pend ? '<button class="mini" data-act="stageDone" data-st="' + sid + '">' + t('doneAll') + '</button>' : '') + '</div><ul class="vlist">' +
        items.map(function (it) {
          return '<li><button class="vrow" data-act="open" data-key="' + esc(it.key) + '"><span class="dot ' + it.status + '"></span><span class="vt">' + esc(vname(it)) + '<small>' + (it.status === 'done' && it.rec && it.rec.date ? fmt(it.rec.date) : (it.status === 'skipped' ? t('skipped') : when(it.due))) + (it.custom ? ' · ' + t('custom') : '') + '</small></span><span class="pill ' + it.status + '">' + stLabel(it.status) + '</span></button></li>'; }).join('') + '</ul></div></li>';
    });
    h += '</ol><button class="btn ghost" data-act="addCustom">' + ic('plus') + t('addVaccine') + '</button>' + disclaimerBar();
    return h;
  }

  function chart(list, field, label, color) {
    var pts = C.sortGrowth(list).filter(function (e) { return e[field] != null; });
    if (!pts.length) return '';
    var c = child(), W = 320, H = 150, pad = 26;
    var xs = pts.map(function (e) { return C.diffDays(e.date, c.dob) / 30.44; }), ys = pts.map(function (e) { return e[field]; });
    var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys);
    if (x1 - x0 < 1) { x1 = x0 + 1; } if (y1 - y0 < 0.5) { y1 = y0 + 0.5; y0 = y0 - 0.25; }
    var px = function (x) { return (pad + (x - x0) / (x1 - x0) * (W - 2 * pad)).toFixed(1); };
    var py = function (y) { return (H - pad - (y - y0) / (y1 - y0) * (H - 2 * pad)).toFixed(1); };
    var line = pts.map(function (e, i) { return px(xs[i]) + ',' + py(ys[i]); }).join(' ');
    var dots = pts.map(function (e, i) { return '<circle cx="' + px(xs[i]) + '" cy="' + py(ys[i]) + '" r="4.5" fill="' + color + '"><title>' + fmt(e.date) + ': ' + e[field] + '</title></circle>'; }).join('');
    var d = C.growthDelta(list, field), dtxt = d ? '<span class="delta ' + (d.diff >= 0 ? 'up' : 'down') + '">' + (d.diff > 0 ? '+' : '') + num(d.diff) + '</span>' : '';
    return '<div class="card chart"><div class="chart-h"><h3>' + label + '</h3>' + dtxt + '</div><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + label + '"><line x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - pad) + '" y2="' + (H - pad) + '" class="axis"/><line x1="' + pad + '" y1="' + pad / 2 + '" x2="' + pad + '" y2="' + (H - pad) + '" class="axis"/>' +
      (pts.length > 1 ? '<polyline points="' + line + '" fill="none" stroke="' + color + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' : '') + dots +
      '<text x="' + pad + '" y="' + (H - 8) + '" class="ax-t">' + num(Math.round(x0)) + (S.lang === 'ar' ? ' شهر' : ' mo') + '</text><text x="' + (W - pad) + '" y="' + (H - 8) + '" text-anchor="end" class="ax-t">' + num(Math.round(x1)) + (S.lang === 'ar' ? ' شهر' : ' mo') + '</text>' +
      '<text x="' + (pad + 4) + '" y="' + (pad / 2 + 8) + '" class="ax-t">' + num(y1) + '</text><text x="' + (pad + 4) + '" y="' + (H - pad - 4) + '" class="ax-t">' + num(y0) + '</text></svg></div>';
  }

  function vGrowth(c) {
    var g = C.sortGrowth(c.growth);
    var h = '<div class="sec-h"><h2>' + t('growthTitle') + '</h2><button class="btn sm" data-act="addGrowth">' + ic('plus') + t('addGrowth') + '</button></div><p class="muted pad">' + t('growthHint') + '</p>';
    if (!g.length) return h + '<div class="card empty">' + t('noGrowth') + '</div>';
    h += chart(g, 'w', t('chartW'), '#ff7a59') + chart(g, 'h', t('chartH'), '#12807a');
    h += '<ul class="glist">' + g.slice().reverse().map(function (e) {
      var parts = []; if (e.w != null) parts.push(num(e.w) + ' ' + (S.lang === 'ar' ? 'كجم' : 'kg')); if (e.h != null) parts.push(num(e.h) + ' ' + (S.lang === 'ar' ? 'سم' : 'cm')); if (e.hc != null) parts.push(t('head').split(' (')[0] + ' ' + num(e.hc));
      return '<li class="card gitem"><div><b>' + fmt(e.date) + '</b><span class="muted"> · ' + num(C.ageMonths(c.dob, e.date)) + ' ' + t('mos') + '</span><p>' + parts.join(' · ') + '</p>' + (e.note ? '<p class="gnote">' + esc(e.note) + '</p>' : '') + '</div><button class="mini bad" data-act="delGrowth" data-id="' + esc(e.id) + '" aria-label="' + t('del') + '">' + t('del') + '</button></li>'; }).join('') + '</ul>';
    return h;
  }

  function vMore(c) {
    var supported = 'Notification' in window, perm = supported ? Notification.permission : 'denied';
    var h = '<h2 class="pad">' + t('reminders') + '</h2><section class="card"><p class="muted">' + t('remindIntro') + '</p>' +
      '<label class="fld">' + t('leadDays') + '<select id="lead"><option value="1"' + (S.lead === 1 ? ' selected' : '') + '>' + t('d1') + '</option><option value="3"' + (S.lead === 3 ? ' selected' : '') + '>' + t('d3') + '</option><option value="7"' + (S.lead === 7 ? ' selected' : '') + '>' + t('d7') + '</option></select></label>' +
      '<button class="btn" data-act="ics">' + ic('plan') + t('downloadIcs') + '</button><p class="fine">' + t('icsHelp') + '</p><hr>' +
      '<label class="switch"><input type="checkbox" id="notify"' + (S.notify && perm === 'granted' ? ' checked' : '') + (supported ? '' : ' disabled') + '><span class="sl"></span><span>' + t('notifyOn') + '</span></label><p class="fine">' + (supported ? (perm === 'denied' ? t('notifyDenied') : t('notifyHelp')) : t('notifyUnsupported')) + '</p></section>';
    h += '<h2 class="pad">' + t('children') + '</h2><section class="card"><ul class="vlist">' + S.children.map(function (k) { return '<li class="krow"><span class="avatar sm ' + k.sex + '">' + esc(k.name.charAt(0).toUpperCase()) + '</span><span class="vt">' + esc(k.name) + '<small>' + fmt(k.dob) + '</small></span><button class="mini" data-act="editChild" data-id="' + esc(k.id) + '">' + t('edit') + '</button></li>'; }).join('') + '</ul><button class="btn ghost" data-act="addChild">' + ic('plus') + t('addChild') + '</button></section>';
    h += '<h2 class="pad">' + t('backup') + '</h2><section class="card btns"><button class="btn ghost" data-act="print">' + t('printCard') + '</button><button class="btn ghost" data-act="export">' + t('export') + '</button><label class="btn ghost filebtn">' + t('import') + '<input type="file" id="imp" accept="application/json,.json"></label><button class="btn danger" data-act="wipe">' + t('wipe') + '</button></section>';
    h += '<div class="note"><b>' + t('honestTitle') + '</b><span>' + t('honest') + '</span></div><div class="note alt"><b>' + t('limitsTitle') + '</b><span>' + t('limits') + '</span></div><p class="fine center">Tateem · MIT · <a href="https://github.com/yousefkhames/tateem" target="_blank" rel="noopener">GitHub</a></p>';
    return h;
  }

  function nav() {
    var tabs = ['home', 'plan', 'growth', 'more'];
    return '<nav class="tabs" aria-label="main">' + tabs.map(function (k) { return '<button data-act="tab" data-v="' + k + '" class="' + (view === k ? 'on' : '') + '" ' + (view === k ? 'aria-current="page"' : '') + '>' + ic(k) + '<span>' + t(k) + '</span></button>'; }).join('') + '</nav>';
  }

  /* ---------- sheets ---------- */
  function sheetHTML() {
    if (!sheet) return '';
    var c = child(), body = '';
    if (sheet.type === 'child') {
      var k = sheet.id ? S.children.filter(function (x) { return x.id === sheet.id; })[0] : null;
      body = '<h3>' + t(k ? 'edit' : 'addChild') + '</h3><form id="fChild" novalidate><label class="fld">' + t('childName') + '<input name="name" maxlength="40" required value="' + esc(k ? k.name : '') + '" autocomplete="off"></label>' +
        '<label class="fld">' + t('dob') + '<input type="date" name="dob" required max="' + TODAY + '" value="' + esc(k ? k.dob : '') + '"></label>' +
        '<div class="fld">' + t('sex') + '<div class="seg"><label><input type="radio" name="sex" value="m"' + (!k || k.sex === 'm' ? ' checked' : '') + '><span>' + t('boy') + '</span></label><label><input type="radio" name="sex" value="f"' + (k && k.sex === 'f' ? ' checked' : '') + '><span>' + t('girl') + '</span></label></div></div><p class="err" id="err"></p>' +
        '<div class="row"><button class="btn" type="submit">' + t('save') + '</button>' + (k ? '<button class="btn danger" type="button" data-act="delChild" data-id="' + esc(k.id) + '">' + t('deleteChild') + '</button>' : '') + '<button class="btn ghost" type="button" data-act="closeSheet">' + t('cancel') + '</button></div></form>';
    } else if (sheet.type === 'dose') {
      var it = C.buildPlan(c, TODAY).filter(function (p) { return p.key === sheet.key; })[0]; if (!it) return '';
      var rec = it.rec || {};
      body = '<h3>' + esc(vname(it)) + '</h3><p class="muted">' + stageName(it.months) + ' · ' + fmt(it.due) + ' <span class="pill ' + it.status + '">' + stLabel(it.status) + '</span></p>' +
        (vprot(it) ? '<p class="prot"><b>' + t('protects') + ':</b> ' + esc(vprot(it)) + '</p>' : '') +
        '<form id="fDose" data-key="' + esc(it.key) + '" novalidate><label class="fld">' + t('dateGiven') + '<input type="date" name="date" min="' + c.dob + '" max="' + TODAY + '" value="' + esc(rec.date || (TODAY < it.due ? TODAY : TODAY)) + '"></label><label class="fld">' + t('noteLabel') + '<input name="note" maxlength="200" value="' + esc(rec.note || '') + '"></label><p class="err" id="err"></p>' +
        '<div class="row"><button class="btn" type="submit" data-v="done">' + t('markDone') + '</button><button class="btn ghost" type="submit" data-v="skipped">' + t('markSkip') + '</button>' + (it.rec ? '<button class="btn ghost" type="button" data-act="resetDose">' + t('reset') + '</button>' : '') + (it.custom ? '<button class="btn danger" type="button" data-act="delCustom" data-id="' + esc(it.vid) + '">' + t('del') + '</button>' : '') + '</div></form>';
    } else if (sheet.type === 'growth') {
      body = '<h3>' + t('addGrowth') + '</h3><form id="fGrowth" novalidate><label class="fld">' + t('date') + '<input type="date" name="date" min="' + c.dob + '" max="' + TODAY + '" value="' + TODAY + '"></label>' +
        '<div class="grid3"><label class="fld">' + t('weight') + '<input name="w" inputmode="decimal" placeholder="5.2"></label><label class="fld">' + t('height') + '<input name="h" inputmode="decimal" placeholder="58"></label><label class="fld">' + t('head') + '<input name="hc" inputmode="decimal" placeholder="39"></label></div>' +
        '<label class="fld">' + t('noteLabel') + '<input name="note" maxlength="300"></label><p class="err" id="err"></p><div class="row"><button class="btn" type="submit">' + t('save') + '</button><button class="btn ghost" type="button" data-act="closeSheet">' + t('cancel') + '</button></div></form>';
    } else if (sheet.type === 'custom') {
      body = '<h3>' + t('addVaccine') + '</h3><form id="fCustom" novalidate><label class="fld">' + t('vacName') + '<input name="name" maxlength="80" required></label><label class="fld">' + t('vacAtMonths') + '<input name="months" type="number" min="0" max="240" value="6" required></label><label class="fld">' + t('noteLabel') + '<input name="note" maxlength="200"></label><p class="err" id="err"></p><div class="row"><button class="btn" type="submit">' + t('save') + '</button><button class="btn ghost" type="button" data-act="closeSheet">' + t('cancel') + '</button></div></form>';
    }
    return '<div class="scrim" data-act="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true"><button class="x" data-act="closeSheet" aria-label="' + t('close') + '">×</button>' + body + '</div>';
  }

  function printCard(c) {
    var sm = C.summary(c, TODAY);
    return '<div class="print"><h1>' + t('cardTitle') + '</h1><p><b>' + esc(c.name) + '</b> · ' + t('dob') + ': ' + fmt(c.dob) + '</p><table><thead><tr><th>' + t('vaccine') + '</th><th>' + t('dueOn') + '</th><th>' + t('dateGiven') + '</th></tr></thead><tbody>' +
      sm.plan.map(function (p) { return '<tr><td>' + esc(vname(p)) + '</td><td>' + fmt(p.due) + '</td><td>' + (p.status === 'done' ? (p.rec.date ? fmt(p.rec.date) : '✓') : (p.status === 'skipped' ? t('skipped') : '')) + '</td></tr>'; }).join('') +
      '</tbody></table><p class="fine">' + t('honest') + '</p><p class="fine">' + t('printedOn') + ' ' + fmt(TODAY) + '</p></div>';
  }

  function render() {
    document.documentElement.lang = S.lang; document.documentElement.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
    document.title = S.lang === 'ar' ? 'تطعيم | Tateem' : 'Tateem | Vaccine schedule';
    var c = child(), h;
    if (!c) h = header() + vWelcome();
    else {
      var body = view === 'plan' ? vPlan(c) : view === 'growth' ? vGrowth(c) : view === 'more' ? vMore(c) : vHome(c);
      h = header() + '<main class="view v-' + view + '">' + body + '</main>' + nav() + printCard(c);
    }
    $('#app').innerHTML = h + sheetHTML();
    if (sheet) { var f = $('.sheet input:not([type=radio]), .sheet button.btn'); if (f && !sheet.noFocus) f.focus(); }
  }

  /* ---------- actions ---------- */
  function setRec(c, key, rec) { if (rec) c.records[key] = rec; else delete c.records[key]; }
  function download(name, text, type) {
    var a = document.createElement('a'), u = URL.createObjectURL(new Blob([text], { type: type }));
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 500);
  }
  function checkReminders() {
    var c = child(); if (!c || !S.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
    if (S.lastNotified[c.id] === TODAY) return;
    var due = C.dueForReminder(c, TODAY, S.lead); if (!due.length) return;
    S.lastNotified[c.id] = TODAY; save();
    try { new Notification(t('alertTitle', { name: c.name }), { body: t('alertBody', { n: num(due.length) }), icon: 'logo.svg' }); } catch (e) {}
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var a = el.getAttribute('data-act'), c = child();
    if (a === 'closeSheet') { if (e.target.closest('.sheet') && !el.classList.contains('x') && !el.classList.contains('btn')) return; sheet = null; render(); return; }
    if (a === 'tab') { view = el.getAttribute('data-v'); sheet = null; render(); window.scrollTo(0, 0); return; }
    if (a === 'lang') { S.lang = S.lang === 'ar' ? 'en' : 'ar'; save(); render(); return; }
    if (a === 'demo') { var dk = { id: C.uid(), name: S.lang === 'ar' ? 'طفل تجريبي' : 'Demo baby', dob: C.addMonths(TODAY, -5), sex: 'm', records: {}, growth: [], custom: [] };
      C.buildPlan(dk, TODAY).filter(function (p) { return p.months <= 2; }).forEach(function (p) { dk.records[p.key] = { status: 'done', date: p.due, note: '' }; });
      S.children.push(dk); S.active = dk.id; view = 'home'; save(); render(); return; }
    if (a === 'addChild') { sheet = { type: 'child' }; render(); return; }
    if (a === 'editChild') { sheet = { type: 'child', id: el.getAttribute('data-id') }; render(); return; }
    if (a === 'delChild') { var id = el.getAttribute('data-id'), k = S.children.filter(function (x) { return x.id === id; })[0]; if (confirm(t('deleteSure', { name: k.name }))) { S.children = S.children.filter(function (x) { return x.id !== id; }); S.active = S.children[0] ? S.children[0].id : null; save(); sheet = null; render(); toast(t('deleted')); } return; }
    if (a === 'filter') { planFilter = el.getAttribute('data-f'); render(); return; }
    if (a === 'open') { sheet = { type: 'dose', key: el.getAttribute('data-key') }; render(); return; }
    if (a === 'resetDose') { setRec(c, sheet.key, null); save(); sheet = null; render(); return; }
    if (a === 'stageDone') {
      var st = el.getAttribute('data-st');
      C.buildPlan(c, TODAY).filter(function (p) { return p.stage === st && p.status !== 'done' && p.status !== 'skipped'; }).forEach(function (p) { setRec(c, p.key, { status: 'done', date: TODAY, note: '' }); });
      save(); render(); toast(t('saved')); return;
    }
    if (a === 'addCustom') { sheet = { type: 'custom' }; render(); return; }
    if (a === 'delCustom') { var cid = el.getAttribute('data-id'); c.custom = c.custom.filter(function (x) { return x.id !== cid; }); delete c.records['c:' + cid]; save(); sheet = null; render(); toast(t('deleted')); return; }
    if (a === 'addGrowth') { sheet = { type: 'growth' }; render(); return; }
    if (a === 'delGrowth') { var gid = el.getAttribute('data-id'); c.growth = c.growth.filter(function (x) { return x.id !== gid; }); save(); render(); toast(t('deleted')); return; }
    if (a === 'ics') { download('tateem-' + c.name.replace(/[^\w\u0600-\u06FF-]+/g, '_') + '.ics', C.buildICS(c, TODAY, S.lang), 'text/calendar'); return; }
    if (a === 'export') { download('tateem-backup-' + TODAY + '.json', JSON.stringify(S, null, 1), 'application/json'); return; }
    if (a === 'print') { window.print(); return; }
    if (a === 'wipe') { if (confirm(t('wipeSure'))) { localStorage.removeItem(KEY); S = load(); view = 'home'; render(); } return; }
  });

  document.addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target, c = child(), err = $('#err'), fd = new FormData(f);
    function bad(m) { err.textContent = m; }
    if (f.id === 'fChild') {
      var name = String(fd.get('name') || '').trim(), dob = String(fd.get('dob') || '');
      if (!name) return bad(t('invalid')); if (!C.parseISO(dob) || dob > TODAY) return bad(t('invalidDate'));
      if (sheet.id) { var k = S.children.filter(function (x) { return x.id === sheet.id; })[0]; k.name = name; k.dob = dob; k.sex = fd.get('sex'); }
      else { var nk = { id: C.uid(), name: name, dob: dob, sex: fd.get('sex'), records: {}, growth: [], custom: [] }; S.children.push(nk); S.active = nk.id; view = 'home'; }
      save(); sheet = null; render(); toast(t('saved')); checkReminders();
    } else if (f.id === 'fDose') {
      var key = f.getAttribute('data-key'), v = e.submitter ? e.submitter.getAttribute('data-v') : 'done', date = String(fd.get('date') || '');
      if (v === 'done' && date && (!C.parseISO(date) || date > TODAY || date < c.dob)) return bad(t('invalidDate'));
      setRec(c, key, { status: v, date: v === 'done' ? date : '', note: String(fd.get('note') || '').slice(0, 200) });
      save(); sheet = null; render(); toast(t('saved'));
    } else if (f.id === 'fGrowth') {
      var g = { date: String(fd.get('date')), w: String(fd.get('w')).replace(',', '.').trim(), h: String(fd.get('h')).replace(',', '.').trim(), hc: String(fd.get('hc')).replace(',', '.').trim(), note: String(fd.get('note') || '').trim() };
      var r = C.validGrowth(g, c.dob, TODAY); if (!r.ok) return bad(r.errs.indexOf('date') >= 0 ? t('invalidDate') : t('invalid'));
      c.growth.push({ id: C.uid(), date: g.date, w: r.w, h: r.h, hc: r.hc, note: g.note.slice(0, 300) });
      save(); sheet = null; render(); toast(t('saved'));
    } else if (f.id === 'fCustom') {
      var nm = String(fd.get('name') || '').trim(), mo = Number(fd.get('months'));
      if (!nm || !(mo >= 0 && mo <= 240)) return bad(t('invalid'));
      c.custom.push({ id: C.uid(), ar: nm, en: nm, months: Math.round(mo), note: String(fd.get('note') || '').slice(0, 200) });
      save(); sheet = null; render(); toast(t('saved'));
    }
  });

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.id === 'kidSel') { S.active = el.value; save(); render(); }
    else if (el.id === 'lead') { S.lead = Number(el.value); save(); }
    else if (el.id === 'notify') {
      if (el.checked) {
        Notification.requestPermission().then(function (p) { S.notify = p === 'granted'; save(); render(); if (S.notify) { S.lastNotified = {}; checkReminders(); } });
      } else { S.notify = false; save(); }
    } else if (el.id === 'imp' && el.files[0]) {
      var rd = new FileReader();
      rd.onload = function () { try { var s = C.sanitize(JSON.parse(rd.result)); if (!s) throw 0; S = s; save(); view = 'home'; render(); toast(t('imported')); } catch (x) { toast(t('importFail')); } };
      rd.readAsText(el.files[0]);
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheet) { sheet = null; render(); } });

  S = load(); render(); checkReminders();
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0 && !qs.get('nosw')) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
