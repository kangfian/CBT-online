/* CBT Online — SPA vanilla. Navigasi & interaksi 100% di browser (0 ms); server hanya untuk data. */
(function () {
'use strict';
var CFG = window.APP_CONFIG || {}, app = document.querySelector('#app');
var S = { me: null, ujian: [], skew: 0, filter: 'semua', q: '', cur: null };
var X = null; // state ujian yang sedang berjalan
var MODE = window.APP_MODE === 'staf' ? 'staf' : 'siswa', V = { n: 0 };
var P = { tab: 'dash', soal: null, sel: {}, data: [] };
var XLS = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

function $(s, r) { return (r || document).querySelector(s); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function now() { return Date.now() + S.skew; }
function render(h) { app.innerHTML = h; window.scrollTo(0, 0); }
function busy(on) { $('#bar').className = on ? 'on' : ''; }
function toast(m, t) { var e = $('#toast'); e.textContent = m; e.className = 'on ' + (t || ''); clearTimeout(toast.t); toast.t = setTimeout(function () { e.className = ''; }, 3200); }
function fmt(ms) { return new Date(ms).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB'; }
function mmss(ms) { var s = Math.max(0, Math.round(ms / 1000)); return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2); }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function topbar() {
  var m = S.me;
  return '<header class="top"><div><div class="brand">CBT Online</div><div class="sub">' + esc(CFG.NAMA_SEKOLAH) + '</div></div><div class="sp"></div>' +
    '<div class="who">Halo, ' + esc(m.nama) + '<br><small>' + (m.role === 'siswa' ? esc(m.kelas) : esc(m.role)) + '</small></div><button onclick="App.keluar()">Keluar</button></header>';
}

/* ---------- LOGIN ---------- */
function viewLogin(msg) {
  var st = MODE === 'staf';
  render('<div class="auth' + (st ? ' staf' : '') + '"><form class="card" id="f"><div style="text-align:center;margin-bottom:18px"><h1>' + (st ? 'Portal Admin &amp; Guru' : 'CBT Online') + '</h1><div class="muted">' + esc(CFG.NAMA_SEKOLAH) + '</div></div>' +
    '<label class="field"><span>' + (st ? 'Username' : 'NIS') + '</span><input id="id" autocomplete="username" required></label>' +
    '<label class="field"><span>Password</span><input id="pw" type="password" autocomplete="current-password" required></label>' +
    '<div class="err" id="e">' + esc(msg || (Api.siap ? '' : 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js.')) + '</div>' +
    '<button class="btn p w" style="margin-top:12px">Masuk</button><p class="sm" style="text-align:center;margin:16px 0 0">' + (st ? '<a href="index.html">← Halaman login siswa</a>' : '<a href="admin.html">Admin / Guru? Masuk di sini</a>') + '</p></form></div>');
  $('#f').onsubmit = function (ev) {
    ev.preventDefault(); var b = $('button', this); b.disabled = true; b.textContent = 'Memeriksa...'; busy(true);
    Api.call('login', { id: $('#id').value, password: $('#pw').value, tipe: MODE }).then(function (r) {
      busy(false);
      if (r.success) { Sesi.simpan({ token: r.data.token, me: r.data.me }); S.me = r.data.me; masuk(); }
      else { b.disabled = false; b.textContent = 'Masuk'; $('#e').textContent = r.message; }
    });
  };
}
function masuk() { if (S.me.role === 'siswa') dash(); else panel(); }

/* ---------- DASHBOARD SISWA ---------- */
var LBL = { tersedia: ['b-ok', 'Tersedia'], berlangsung: ['b-warn', 'Sedang dikerjakan'], belum: ['b-mut', 'Belum dibuka'], tutup: ['b-bad', 'Ditutup'], selesai: ['b-info', 'Selesai'] };
function stat(u) {
  if (u.sesi && u.sesi.status !== 'berlangsung') return 'selesai';
  if (u.sesi) return 'berlangsung';
  var n = now(); return n < u.mulai ? 'belum' : n > u.selesai ? 'tutup' : 'tersedia';
}
function dash() {
  var c = load('cbt_ujian'); if (c) { S.ujian = c.ujian; S.skew = c.skew; }
  drawDash(!c);
  Api.call('ujian.list').then(function (r) {
    if (r.success) { S.ujian = r.data.ujian; S.skew = r.data.now - Date.now(); save('cbt_ujian', { ujian: S.ujian, skew: S.skew }); }
    else if (!r.offline) toast(r.message, 'error'); else toast('Offline — menampilkan data terakhir', 'warn');
    drawDash();
  });
}
function drawDash(skel) {
  var L = S.ujian.map(function (u) { return { u: u, s: stat(u) }; }), n = { tersedia: 0, berlangsung: 0, belum: 0, selesai: 0 }, tot = 0, cnt = 0;
  L.forEach(function (x) { n[x.s] = (n[x.s] || 0) + 1; if (x.u.sesi && x.u.sesi.nilai != null) { tot += Number(x.u.sesi.nilai); cnt++; } });
  var vis = L.filter(function (x) {
    return (S.filter === 'semua' || (S.filter === 'tersedia' ? (x.s === 'tersedia' || x.s === 'berlangsung') : S.filter === 'mendatang' ? x.s === 'belum' : x.s === 'selesai')) &&
      (!S.q || (x.u.judul + ' ' + x.u.mapel).toLowerCase().indexOf(S.q.toLowerCase()) >= 0);
  });
  var cards = skel ? '<div class="sk"></div><div class="sk"></div><div class="sk"></div>' : vis.length ? vis.map(function (x) {
    var u = x.u, l = LBL[x.s], btn = x.s === 'tersedia' ? '<button class="btn a w" onclick="App.buka(\'' + u.id + '\')">Mulai Kerjakan Ujian</button>' :
      x.s === 'berlangsung' ? '<button class="btn a w" onclick="App.buka(\'' + u.id + '\')">Lanjutkan Ujian</button>' :
      x.s === 'selesai' ? '<button class="btn w" disabled>Nilai: ' + esc(u.sesi.nilai) + ' / 100</button>' : '<button class="btn w" disabled>' + (x.s === 'belum' ? 'Ujian Belum Dibuka' : 'Ujian Ditutup') + '</button>';
    return '<div class="card ex ' + x.s + '"><div style="display:flex;justify-content:space-between;gap:8px"><span class="badge b-info">' + esc(u.mapel || 'Umum') + '</span><span class="badge ' + l[0] + '">' + l[1] + '</span></div>' +
      '<h2>' + esc(u.judul) + '</h2><div class="meta">Jadwal: <b>' + fmt(u.mulai) + '</b><br>Batas: ' + fmt(u.selesai) + '<br>Durasi: <b>' + u.durasi + ' menit</b> · <b>' + u.jumlah + ' soal</b></div><div class="push">' + btn + '</div></div>';
  }).join('') : '<div class="card" style="grid-column:1/-1;text-align:center;padding:40px"><h2>Belum ada ujian</h2><p class="muted">Ujian untuk kelas Anda akan muncul di sini.</p></div>';
  var tab = function (k, t) { return '<button class="chip' + (S.filter === k ? ' on' : '') + '" onclick="App.filter(\'' + k + '\')">' + t + '</button>'; };
  render(topbar() + '<main class="wrap"><div class="hero"><span class="pill xs">' + (n.tersedia + n.berlangsung ? n.tersedia + n.berlangsung + ' ujian aktif hari ini' : 'Tidak ada ujian aktif') + '</span><h1>Halo, ' + esc(S.me.nama) + '</h1><p>NIS: ' + esc(S.me.id) + ' • Kelas ' + esc(S.me.kelas) + '</p></div>' +
    '<div class="grid g4"><div class="card stat"><span class="xs muted">Total ujian</span><b>' + L.length + ' Ujian</b></div><div class="card stat"><span class="xs muted">Perlu dikerjakan</span><b>' + (n.tersedia + n.berlangsung) + '</b></div>' +
    '<div class="card stat"><span class="xs muted">Mendatang</span><b>' + n.belum + ' Terjadwal</b></div><div class="card stat"><span class="xs muted">Rata-rata nilai</span><b>' + (cnt ? (Math.round(tot / cnt * 10) / 10) + ' / 100' : '—') + '</b></div></div>' +
    '<div class="tabs">' + tab('semua', 'Semua (' + L.length + ')') + tab('tersedia', 'Tersedia (' + (n.tersedia + n.berlangsung) + ')') + tab('mendatang', 'Mendatang (' + n.belum + ')') + tab('selesai', 'Selesai (' + n.selesai + ')') +
    '<span class="sp"></span><input id="q" placeholder="Cari nama ujian..." value="' + esc(S.q) + '" style="max-width:240px"></div><div class="grid g3">' + cards + '</div>' +
    '<div class="note" style="margin-top:20px"><b>Tata tertib:</b> berpindah tab saat ujian akan tercatat. Pelanggaran ke-3 otomatis mengumpulkan ujian Anda.</div></main>');
  $('#q').oninput = function () { S.q = this.value; var p = this.selectionStart; drawDash(); var q = $('#q'); q.focus(); q.setSelectionRange(p, p); };
}

/* ---------- VERIFIKASI ---------- */
function viewVerif() {
  var u = S.cur, m = S.me;
  var f = function (k, v) { return '<div><div class="xs muted">' + k + '</div><b>' + esc(v) + '</b></div>'; };
  render(topbar() + '<main class="wrap narrow"><div class="card"><div class="xs muted">Langkah 1 dari 2 • Konfirmasi data &amp; validasi token</div>' +
    '<h1 style="margin-top:10px">Verifikasi Peserta Ujian</h1><p class="muted">Pastikan data Anda dan paket ujian sudah sesuai sebelum mulai.</p>' +
    '<div class="note grid g2" style="gap:14px">' + f('Nama peserta', m.nama) + f('NIS', m.id) + f('Kelas', m.kelas) + f('Mata pelajaran', u.mapel || u.judul) + f('Durasi', u.durasi + ' menit') + f('Jumlah soal', u.jumlah + ' pilihan ganda') + '</div>' +
    '<div class="note w"><b>Tata tertib integritas</b><br>• Timer berjalan sejak tombol Mulai ditekan dan tidak dapat dijeda.<br>• Berpindah tab/jendela tercatat; pelanggaran ke-3 mengumpulkan ujian otomatis.<br>• Jawaban tersimpan otomatis di perangkat dan dikirim ke server secara berkala.</div>' +
    '<label class="field"><span>Masukkan token ujian (dari guru)</span><input id="tk" class="token" maxlength="12" autocomplete="off"></label><div class="err" id="e"></div>' +
    '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap"><button class="btn" onclick="App.home()">Kembali</button><button class="btn a" id="go" style="flex:1" onclick="App.mulai()">Verifikasi Token &amp; Mulai Ujian</button></div></div></main>');
  $('#tk').focus(); $('#tk').onkeydown = function (e) { if (e.key === 'Enter') mulai(); };
}
function buka(id) {
  S.cur = S.ujian.filter(function (u) { return u.id === id; })[0]; if (!S.cur) return;
  if (stat(S.cur) === 'berlangsung') mulai(true); else viewVerif();
}
function mulai(resume) {
  var tk = resume ? '' : ($('#tk').value || '').trim(), b = $('#go');
  if (!resume && !tk) { $('#e').textContent = 'Token wajib diisi.'; return; }
  if (b) { b.disabled = true; b.textContent = 'Memeriksa token...'; } busy(true);
  Api.call('ujian.mulai', { idUjian: S.cur.id, token: tk }).then(function (r) {
    busy(false);
    if (r.success) { S.skew = r.data.now - Date.now(); startExam(r.data); return; }
    if (b) { b.disabled = false; b.textContent = 'Verifikasi Token & Mulai Ujian'; $('#e').textContent = r.message; } else toast(r.message, 'error');
    if (r.code === 'HABIS') dash();
  });
}

/* ---------- SUARA PERINGATAN ---------- */
var MSG = ['Peringatan pertama. Anda terdeteksi berpindah tab. Mohon tetap berada di halaman ujian.', 'Peringatan kedua. Jika Anda berpindah tab sekali lagi, ujian akan dikumpulkan otomatis.', 'Peringatan ketiga. Ujian Anda telah dikumpulkan otomatis.'];
function tts(n) { // suara pengucap (bahasa Indonesia) bawaan perangkat
  if (!window.speechSynthesis) return;
  var u = new SpeechSynthesisUtterance(MSG[n - 1]), v = speechSynthesis.getVoices().filter(function (x) { return /^id/i.test(x.lang); })[0];
  u.lang = 'id-ID'; u.rate = 0.95; u.volume = 1; if (v) u.voice = v; speechSynthesis.cancel(); speechSynthesis.speak(u);
}
function suara(n) { // utamakan rekaman suara orang (audio/peringatan-N.mp3) bila ada, jika tidak pakai tts
  var done = false, fb = function () { if (!done) { done = true; tts(n); } };
  try { var a = new Audio('audio/peringatan-' + n + '.mp3'); a.onerror = fb; var p = a.play(); if (p && p.catch) p.catch(fb); } catch (e) { fb(); }
}
document.addEventListener('visibilitychange', function () { if (!document.hidden && V.n) { var n = V.n; V.n = 0; setTimeout(function () { suara(n); }, 300); } });
if (window.speechSynthesis) speechSynthesis.getVoices();

/* ---------- RUANG UJIAN ---------- */
function rng(str) { var h = 1779033703 ^ str.length; for (var i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  var a = h >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function kocok(arr, r) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

function startExam(d) {
  X = { id: d.idSesi, judul: d.judul, batas: d.batas, idx: 0, jawab: d.jawaban || {}, ragu: {}, unsent: {}, pel: d.pelanggaran || 0, aktif: true, n: 0 };
  X.soal = kocok(d.soal, rng(d.idSesi)).map(function (s) { s.ord = kocok(Object.keys(s.o), rng(d.idSesi + s.id)); return s; });
  var l = load('cbt_exam');
  if (l && l.id === X.id) { // pulihkan dari perangkat bila lebih baru
    Object.keys(l.jawab || {}).forEach(function (k) { if (X.jawab[k] !== l.jawab[k]) { X.jawab[k] = l.jawab[k]; X.unsent[k] = l.jawab[k]; } });
    X.ragu = l.ragu || {}; X.idx = Math.min(l.idx || 0, X.soal.length - 1);
  }
  localSave();
  render(topbar() + '<main class="wrap"><div id="ban"></div><div class="xtop"><div><h3>' + esc(X.judul) + '</h3><div class="sm muted" id="pos"></div></div><div class="sp"></div>' +
    '<span class="badge b-ok" id="sy">Tersimpan</span><span class="timer" id="tm">--:--</span></div>' +
    '<div class="xgrid"><div class="card" id="q"></div><div class="card navcard" id="nv"></div></div></main>');
  drawQ(); banner();
  X.t = setInterval(tick, 1000); tick();
  document.addEventListener('visibilitychange', onVis);
  window.onbeforeunload = function () { return X && X.aktif ? 'Ujian sedang berlangsung.' : undefined; };
}
function localSave() { save('cbt_exam', { id: X.id, jawab: X.jawab, ragu: X.ragu, idx: X.idx }); }
function cur() { return X.soal[X.idx]; }
function drawQ() {
  var s = cur(), j = X.jawab[s.id];
  $('#pos').textContent = 'Soal ' + (X.idx + 1) + ' dari ' + X.soal.length;
  $('#q').innerHTML = '<div class="qhead"><span class="qno">Nomor ' + (X.idx + 1) + '</span><span class="xs muted">Pilihan ganda tunggal</span></div><div class="qtext">' + esc(s.t) + '</div>' +
    s.ord.map(function (k, i) { return '<button class="opt' + (j === k ? ' on' : '') + '" onclick="App.pilih(\'' + k + '\')"><i>' + 'ABCDE'[i] + '</i><span>' + esc(s.o[k]) + '</span></button>'; }).join('') +
    '<div class="qfoot"><button class="btn" onclick="App.nav(-1)"' + (X.idx ? '' : ' disabled') + '>← Sebelumnya</button><button class="btn' + (X.ragu[s.id] ? ' a' : '') + '" onclick="App.ragu()">' + (X.ragu[s.id] ? '★ Ragu-ragu' : '☆ Ragu-ragu') + '</button><span class="sp"></span>' +
    (X.idx < X.soal.length - 1 ? '<button class="btn p" onclick="App.nav(1)">Selanjutnya →</button>' : '') + '<button class="btn a" onclick="App.konfirmasi()">Kumpulkan Ujian</button></div>';
  drawNav();
}
function drawNav() {
  var n = 0, r = 0, g = '';
  X.soal.forEach(function (s, i) {
    var d = X.jawab[s.id], f = X.ragu[s.id]; if (d) n++; if (f) r++;
    g += '<button class="' + (f ? 'flag' : d ? 'done' : '') + (i === X.idx ? ' cur' : '') + '" onclick="App.ke(' + i + ')">' + (i + 1) + '</button>';
  });
  var p = Math.round(n / X.soal.length * 100);
  $('#nv').innerHTML = '<h3>Navigasi Soal</h3><div class="grid g3" style="margin-top:12px;text-align:center;gap:8px"><div class="note" style="margin:0;padding:8px"><b>' + n + '</b><div class="xs muted">Dijawab</div></div><div class="note" style="margin:0;padding:8px"><b>' + r + '</b><div class="xs muted">Ragu</div></div><div class="note" style="margin:0;padding:8px"><b>' + (X.soal.length - n) + '</b><div class="xs muted">Belum</div></div></div>' +
    '<div class="sm muted" style="display:flex;justify-content:space-between;margin-top:12px"><span>Kelengkapan</span><b>' + p + '%</b></div><div class="bar2"><i style="width:' + p + '%"></i></div><div class="nav">' + g + '</div>';
}
function pilih(k) { var s = cur(); X.jawab[s.id] = k; X.unsent[s.id] = k; localSave(); drawQ(); if (Object.keys(X.unsent).length >= 5) flush(); }
function setSync(t, c) { var e = $('#sy'); if (e) { e.textContent = t; e.className = 'badge ' + (c === 'bad' ? 'b-bad' : c === 'wait' ? 'b-warn' : 'b-ok'); } }
function flush() {
  var ks = Object.keys(X.unsent); if (!ks.length || X.fl) return Promise.resolve(true);
  var snap = {}; ks.forEach(function (i) { snap[i] = X.unsent[i]; }); X.fl = true; setSync('Menyimpan...', 'wait');
  return Api.call('jawaban.simpan', { idSesi: X.id, jawaban: snap }).then(function (r) {
    X.fl = false;
    if (r.success) { ks.forEach(function (i) { if (X.unsent[i] === snap[i]) delete X.unsent[i]; }); setSync('Tersimpan', 'ok'); if (r.data && r.data.nilai !== undefined) tamat(r.data); return true; }
    if (r.code === 'SELESAI') { kumpul(true); return true; }
    setSync(r.offline ? 'Offline — aman di perangkat' : 'Gagal menyimpan', 'bad'); return false;
  });
}
function tick() {
  if (!X || !X.aktif) return;
  var sisa = X.batas - now(), e = $('#tm'); if (!e) return;
  if (sisa <= 0) { e.textContent = '00:00'; kumpul(true); return; }
  e.textContent = mmss(sisa); e.className = 'timer' + (sisa < 120000 ? ' bad' : sisa < 600000 ? ' warn' : '');
  if (++X.n % 15 === 0) flush();
}
function onVis() {
  if (!X || !X.aktif || !document.hidden) return;
  X.pel++; V.n = Math.min(X.pel, 3); banner();
  Api.call('pelanggaran.catat', { idSesi: X.id }).then(function (r) {
    if (r.success && r.data && r.data.hasil) tamat(r.data.hasil);
    else if (r.success && r.data && r.data.selesai) kumpul(true);
    else if (!r.success && X && X.pel >= 3) kumpul(true);
  });
}
function banner() {
  var b = $('#ban'); if (!b) return;
  b.innerHTML = X.pel ? '<div class="banner"><div style="font-size:22px">⚠</div><div style="flex:1"><b>PERINGATAN INTEGRITAS ' + Math.min(X.pel, 3) + ' DARI 3</b><br>Terdeteksi perpindahan tab atau jendela kehilangan fokus. Jawaban tetap tersimpan, namun ujian dikumpulkan otomatis pada pelanggaran ke-3.</div><button class="btn sm" onclick="this.parentNode.remove()">Tutup</button></div>' : '';
}
function konfirmasi() {
  var n = Object.keys(X.jawab).length, m = document.createElement('div'); m.className = 'modal'; m.id = 'md';
  m.innerHTML = '<div class="card"><h2>Kumpulkan ujian?</h2><p class="muted">Anda menjawab <b>' + n + '</b> dari <b>' + X.soal.length + '</b> soal' + (n < X.soal.length ? ' — masih ada <b>' + (X.soal.length - n) + '</b> yang belum dijawab' : '') + '. Setelah dikumpulkan, jawaban tidak dapat diubah.</p>' +
    '<div class="row"><button class="btn" onclick="document.getElementById(\'md\').remove()">Periksa Lagi</button><button class="btn a" id="ky" onclick="App.kumpul()">Ya, Kumpulkan</button></div></div>';
  document.body.appendChild(m);
}
function kumpul(auto) {
  if (!X || !X.aktif || X.kirim) return; X.kirim = true;
  var b = $('#ky'); if (b) { b.disabled = true; b.textContent = 'Mengirim...'; }
  Api.call('ujian.kumpul', { idSesi: X.id, jawaban: X.jawab }).then(function (r) {
    if (r.success) { tamat(r.data); return; }
    X.kirim = false; if (b) { b.disabled = false; b.textContent = 'Ya, Kumpulkan'; }
    toast(r.offline ? 'Belum tersambung. Jawaban aman di perangkat; mencoba lagi...' : r.message, 'error');
    if (auto || r.offline) setTimeout(function () { kumpul(true); }, 4000);
  });
}
function tamat(res) {
  if (!X || !X.aktif) return; X.aktif = false; clearInterval(X.t);
  document.removeEventListener('visibilitychange', onVis); window.onbeforeunload = null;
  try { localStorage.removeItem('cbt_exam'); } catch (e) {}
  var m = $('#md'); if (m) m.remove();
  var u = S.cur; if (u) { u.sesi = { status: res.status, nilai: res.nilai }; save('cbt_ujian', { ujian: S.ujian, skew: S.skew }); }
  var judul = X.judul; X = null; viewHasil(res, judul);
}
function viewHasil(r, judul) {
  var t = function (k, v, s) { return '<div class="note" style="margin:0"><div class="xs muted">' + k + '</div><b style="font-size:18px">' + v + '</b><div class="sm muted">' + s + '</div></div>'; };
  render(topbar() + '<main class="wrap narrow"><div class="card" style="text-align:center"><div class="note" style="text-align:left;margin-top:0"><b>' + (r.status === 'dikumpulkan' ? 'Ujian berhasil dikumpulkan &amp; tersimpan' : 'Ujian dikumpulkan otomatis') + '</b><div class="sm muted">' +
    (r.status === 'dikumpulkan' ? 'Seluruh jawaban Anda sudah diterima server.' : 'Ujian dikumpulkan otomatis karena waktu habis atau pelanggaran ke-3.') + '</div></div>' +
    '<span class="badge b-warn">Hasil penilaian</span><h1 style="margin-top:8px">' + esc(judul) + '</h1><div class="score"><div class="xs muted">Nilai akhir</div><b>' + esc(r.nilai) + '</b><div class="sm muted">Skala 0 – 100</div></div>' +
    '<div class="grid g3" style="text-align:left">' + t('Durasi', mmss(r.durasiMs), 'waktu pengerjaan') + t('Terjawab', r.terjawab + ' soal', 'dari ' + r.total + ' soal') + t('Pelanggaran', r.pelanggaran + 'x', r.pelanggaran ? 'tercatat' : 'aman &amp; valid') + '</div>' +
    '<p class="sm muted" style="margin:18px 0">Rincian soal dan kunci jawaban tidak ditampilkan demi kerahasiaan bank soal.</p><button class="btn p" onclick="App.home()">Kembali ke Dashboard</button></div></main>');
}

/* ---------- PANEL GURU / ADMIN ---------- */
function panel() {
  var adm = S.me.role === 'admin', T = [['dash', 'Dashboard'], ['pantau', 'Pantau Ujian'], ['buat', 'Buat Ujian'], ['soal', 'Bank Soal'], ['laporan', 'Laporan']].concat(adm ? [['siswa', 'Kelola Siswa'], ['guru', 'Kelola Guru']] : []);
  render('<div class="shell"><nav class="side"><div class="brand">CBT Online<div class="xs" style="color:#adc8f5">' + (adm ? 'Admin' : 'Guru') + '</div></div>' +
    T.map(function (t) { return '<button data-t="' + t[0] + '" class="' + (P.tab === t[0] ? 'on' : '') + '" onclick="App.tab(\'' + t[0] + '\')">' + t[1] + '</button>'; }).join('') +
    '<span class="sp"></span><button onclick="App.keluar()">Keluar</button></nav><main class="main"><div class="mtop"><span class="muted">' + new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }) + '</span><span class="sp"></span><div class="me"><i>' + esc(S.me.nama.charAt(0).toUpperCase()) + '</i><div><b>' + esc(S.me.nama) + '</b><br><span class="muted">' + (adm ? 'Administrator' : 'Guru') + '</span></div></div></div><div id="pc"></div></main></div>');
  tab(P.tab);
}
function tab(t) {
  clearInterval(P.iv); P.tab = t; Array.prototype.forEach.call(document.querySelectorAll('.side button[data-t]'), function (b) { b.className = b.dataset.t === t ? 'on' : ''; });
  ({ dash: tDash, pantau: tPantau, buat: tBuat, soal: tSoal, laporan: tLaporan, siswa: tSiswa, guru: tGuru })[t]();
}
function pc(h) { $('#pc').innerHTML = h; }
function baris(rows) { return rows.length ? '' : '<p class="muted">Belum ada data.</p>'; }

function tDash() {
  pc('<h1>Dashboard</h1><div class="sk" style="margin-top:16px;min-height:200px"></div>');
  var muat = function () { Api.call('dashboard.stats').then(function (r) { if (P.tab !== 'dash') return; if (r.success) { P.dash = r.data; drawAdmDash(); } else if (!$('#dk')) pc('<p class="err">' + esc(r.message) + '</p>'); }); };
  muat(); P.iv = setInterval(function () { if (P.tab === 'dash') muat(); else clearInterval(P.iv); }, 30000);
}
function drawAdmDash() {
  var d = P.dash, h = d.hitung, adm = S.me.role === 'admin';
  var kpi = function (t, v, ic, bg, s) { return '<div class="card kpi"><div class="ico" style="background:' + bg + '">' + ic + '</div><div><span class="xs muted">' + t + '</span><b>' + v + '</b><span class="sm muted">' + s + '</span></div></div>'; };
  var K = kpi('Siswa aktif', h.siswa, '👥', '#DBEAFE', 'terdaftar') + (adm ? kpi('Guru', h.guru, '🎓', '#FEF3C7', 'akun aktif') : '') + kpi('Bank soal', h.soal, '📚', '#E0E7FF', 'butir soal') +
    kpi('Ujian aktif', h.aktif, '📝', '#DCFCE7', 'dari ' + h.ujian + ' ujian') + kpi('Sedang mengerjakan', h.mengerjakan, '⏱', '#FEF9C3', 'siswa saat ini') + kpi('Sudah mengumpulkan', h.selesai, '✅', '#DCFCE7', 'sesi selesai') + kpi('Pelanggaran', h.pelanggaran, '⚠', '#FEE2E2', 'pindah tab tercatat');
  var live = d.ujian.filter(function (u) { return u.status !== 'selesai'; });
  var lc = live.length ? live.map(function (u) {
    var p = u.peserta || 1, B = u.status === 'berlangsung';
    return '<div class="card"><div style="display:flex;gap:8px;justify-content:space-between"><span class="badge ' + (B ? 'b-ok' : 'b-info') + '">' + (B ? '● Berlangsung' : 'Terjadwal') + '</span><span class="sm muted">' + esc(u.kelas) + '</span></div><h3 style="margin:8px 0 2px">' + esc(u.judul) + '</h3><div class="sm muted">' + fmt(u.mulai) + ' – ' + fmt(u.selesai) + '</div>' +
      '<div class="prog"><i style="width:' + (u.dikumpulkan / p * 100) + '%;background:var(--ok)"></i><i style="width:' + (u.mengerjakan / p * 100) + '%;background:#3B82F6"></i></div>' +
      '<div class="sm" style="display:flex;justify-content:space-between"><span>' + u.dikumpulkan + ' selesai · ' + u.mengerjakan + ' mengerjakan · ' + Math.max(0, u.peserta - u.dikumpulkan - u.mengerjakan) + ' belum</span><span>' + u.pel + ' ⚠</span></div>' +
      '<button class="btn sm" style="margin-top:10px" onclick="App.pantauId(\'' + u.id + '\')">Pantau →</button></div>';
  }).join('') : '<div class="card muted" style="grid-column:1/-1;text-align:center;padding:26px">Tidak ada ujian yang sedang berlangsung atau terjadwal.</div>';
  var mx = Math.max.apply(null, d.hist.concat([1])), lab = ['< 60', '60–69', '70–79', '80–89', '90–100'], col = ['#EF4444', '#F59E0B', '#EAB308', '#3B82F6', '#16A34A'];
  var chart = '<svg viewBox="0 0 400 200" style="width:100%;height:auto" role="img" aria-label="Distribusi nilai">' + d.hist.map(function (v, i) {
    var hh = Math.round(v / mx * 130), x = 20 + i * 76;
    return '<rect x="' + x + '" y="' + (150 - hh) + '" width="56" height="' + hh + '" rx="6" fill="' + col[i] + '"/><text x="' + (x + 28) + '" y="' + (144 - hh) + '" text-anchor="middle" font-size="13" font-weight="700" fill="#1A1A2E">' + v + '</text><text x="' + (x + 28) + '" y="174" text-anchor="middle" font-size="12" fill="#43474e">' + lab[i] + '</text>';
  }).join('') + '<line x1="10" y1="150" x2="390" y2="150" stroke="#E2E8F0"/></svg>';
  var lg = d.log.length ? d.log.map(function (l) { return '<div class="lg"><span class="dot"></span><div><b>' + esc(l.nama) + '</b> pindah tab<br><span class="muted">' + esc(l.ujian) + ' · ' + fmt(l.waktu) + '</span></div></div>'; }).join('') : '<p class="muted sm">Belum ada pelanggaran tercatat.</p>';
  var SB = { berlangsung: 'b-ok', terjadwal: 'b-info', selesai: 'b-mut' };
  var tb = d.ujian.length ? '<table><thead><tr><th>Ujian</th><th>Kelas</th><th>Jadwal</th><th>Status</th><th>Peserta</th><th>Selesai</th><th>Rata-rata</th><th>Pelanggaran</th><th></th></tr></thead><tbody>' + d.ujian.map(function (u) {
    return '<tr><td><b>' + esc(u.judul) + '</b></td><td>' + esc(u.kelas) + '</td><td class="sm">' + fmt(u.mulai) + '</td><td><span class="badge ' + SB[u.status] + '">' + u.status + '</span></td><td>' + u.peserta + '</td><td>' + u.dikumpulkan + '</td><td>' + (u.rata == null ? '—' : u.rata) + '</td><td>' + (u.pel ? '<span class="badge b-bad">' + u.pel + 'x</span>' : '0') + '</td><td><button class="btn sm" onclick="App.pantauId(\'' + u.id + '\')">Pantau</button></td></tr>';
  }).join('') + '</tbody></table>' : '<p class="muted">Belum ada ujian. Mulai dengan menambah soal lalu buat ujian.</p>';
  pc('<div id="dk"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div><h1>Dashboard</h1><div class="muted sm">Pembaruan otomatis tiap 30 detik · terakhir ' + new Date(d.now).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }) + '</div></div><span class="sp" style="flex:1"></span>' +
    '<button class="btn" onclick="App.tab(\'soal\')">+ Import Soal</button>' + (adm ? '<button class="btn" onclick="App.tab(\'siswa\')">+ Import Siswa</button>' : '') + '<button class="btn p" onclick="App.tab(\'buat\')">+ Buat Ujian</button></div>' +
    '<div class="grid g6" style="margin-top:18px">' + K + '</div>' +
    '<div class="sec"><h2>Ujian berlangsung &amp; terjadwal</h2></div><div class="grid g3">' + lc + '</div>' +
    '<div class="grid g23" style="margin-top:22px"><div class="card"><h2>Distribusi nilai</h2><p class="muted sm" style="margin:2px 0 8px">Seluruh ujian yang sudah dikumpulkan</p>' + chart + '</div><div class="card"><h2>Pelanggaran terbaru</h2><div style="margin-top:8px">' + lg + '</div></div></div>' +
    '<div class="sec"><h2>Ujian terbaru</h2></div><div class="card"><div class="tw">' + tb + '</div></div></div>');
}
function tPantau() {
  pc('<h1>Pantau Ujian</h1><div class="sk" style="margin-top:16px"></div>');
  Api.call('ujian.guru').then(function (r) {
    if (!r.success) return pc('<h1>Pantau Ujian</h1><p class="err">' + esc(r.message) + '</p>');
    P.uj = r.data;
    pc('<h1>Pantau Ujian</h1><div class="card" style="margin-top:16px"><div style="display:flex;gap:10px;flex-wrap:wrap"><select id="su" style="flex:1;min-width:220px"><option value="">— pilih ujian —</option>' +
      r.data.map(function (u) { return '<option value="' + u.id + '">' + esc(u.judul) + ' (' + esc(u.kelas) + ')</option>'; }).join('') + '</select><button class="btn" onclick="App.muat()">Segarkan</button></div></div><div id="pt" style="margin-top:16px"></div>');
    $('#su').onchange = muatPantau;
    if (P.pid) { $('#su').value = P.pid; P.pid = ''; muatPantau(); }
  });
}
function muatPantau() {
  var id = $('#su').value; if (!id) return; $('#pt').innerHTML = '<div class="sk"></div>'; busy(true);
  Api.call('ujian.pantau', { idUjian: id }).then(function (r) {
    busy(false); if (!r.success) { $('#pt').innerHTML = '<p class="err">' + esc(r.message) + '</p>'; return; }
    var d = r.data, c = { berlangsung: 0, dikumpulkan: 0, belum: 0, pel: 0 };
    d.rows.forEach(function (x) { if (x.status === 'belum') c.belum++; else if (x.status === 'berlangsung') c.berlangsung++; else c.dikumpulkan++; if (x.pelanggaran) c.pel++; });
    var B = { belum: 'b-mut', berlangsung: 'b-info', dikumpulkan: 'b-ok', 'dikumpulkan-otomatis': 'b-warn' };
    $('#pt').innerHTML = '<div class="grid g4"><div class="card stat"><span class="xs muted">Total peserta</span><b>' + d.rows.length + '</b></div><div class="card stat"><span class="xs muted">Mengerjakan</span><b>' + c.berlangsung + '</b></div><div class="card stat"><span class="xs muted">Dikumpulkan</span><b>' + c.dikumpulkan + '</b></div><div class="card stat"><span class="xs" style="color:var(--bad)">Ada pelanggaran</span><b>' + c.pel + '</b></div></div>' +
      '<div class="card" style="margin-top:16px"><p>Token ujian: <b class="mono" style="font-size:18px;letter-spacing:.2em">' + esc(d.token) + '</b></p><div class="tw"><table><thead><tr><th>NIS</th><th>Nama</th><th>Kelas</th><th>Status</th><th>Terjawab</th><th>Pindah tab</th><th>Nilai</th></tr></thead><tbody>' +
      d.rows.map(function (x) { return '<tr style="' + (x.pelanggaran >= 3 ? 'background:#fff5f5' : '') + '"><td class="mono">' + esc(x.nis) + '</td><td>' + esc(x.nama) + '</td><td>' + esc(x.kelas) + '</td><td><span class="badge ' + (B[x.status] || 'b-mut') + '">' + esc(x.status) + '</span></td><td>' + x.jawab + '/' + d.jumlah + '</td><td>' + (x.pelanggaran ? '<span class="badge b-bad">' + x.pelanggaran + 'x</span>' : '0x') + '</td><td>' + (x.nilai == null ? '—' : esc(x.nilai)) + '</td></tr>'; }).join('') + '</tbody></table></div>' + baris(d.rows) + '</div>';
  });
}

function tBuat() {
  pc('<h1>Buat Ujian</h1><div class="sk" style="margin-top:16px"></div>');
  Api.call('soal.list').then(function (r) {
    if (!r.success) return pc('<p class="err">' + esc(r.message) + '</p>');
    P.soal = r.data; P.sel = {};
    var d0 = new Date(Date.now() + 36e5), p2 = function (n) { return ('0' + n).slice(-2); }, loc = function (d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes()); };
    pc('<h1>Buat Ujian</h1><form class="card" id="fb" style="margin-top:16px"><div class="grid g2"><label class="field"><span>Judul ujian *</span><input name="judul" required></label><label class="field"><span>Mata pelajaran</span><input name="mapel"></label>' +
      '<label class="field"><span>Kelas peserta * (pisahkan koma)</span><input name="kelas" placeholder="X MIPA 1, X MIPA 2" required></label><label class="field"><span>Durasi (menit) *</span><input name="durasi" type="number" min="1" value="90" required></label>' +
      '<label class="field"><span>Ujian dapat dimulai *</span><input name="mulai" type="datetime-local" value="' + loc(d0) + '" required></label><label class="field"><span>Ditutup pada *</span><input name="selesai" type="datetime-local" value="' + loc(new Date(d0.getTime() + 864e5)) + '" required></label></div>' +
      '<h3 style="margin:8px 0 10px">Pilih soal <span class="badge b-info" id="cs">0 dipilih</span></h3><input id="fs" placeholder="Cari mapel / isi soal..." style="margin-bottom:10px"><div id="ls" style="max-height:320px;overflow:auto;border:1px solid var(--line);border-radius:8px"></div>' +
      '<div class="err" id="e"></div><button class="btn p" style="margin-top:14px">Buat &amp; Aktifkan Ujian</button></form><div id="hs"></div>');
    drawSoalPilih(); $('#fs').oninput = drawSoalPilih;
    $('#fb').onsubmit = function (ev) {
      ev.preventDefault(); var f = ev.target, ids = Object.keys(P.sel), b = $('button', f); b.disabled = true;
      Api.call('ujian.buat', { judul: f.judul.value, mapel: f.mapel.value, kelas: f.kelas.value, durasi: f.durasi.value, mulai: new Date(f.mulai.value).getTime(), selesai: new Date(f.selesai.value).getTime(), soal: ids }).then(function (r) {
        b.disabled = false; if (!r.success) { $('#e').textContent = r.message; return; }
        $('#e').textContent = ''; toast('Ujian dibuat'); $('#hs').innerHTML = '<div class="note" style="text-align:center"><div class="xs muted">Token ujian — bagikan ke siswa saat ujian</div><div class="token mono" style="font-size:36px;font-weight:700;letter-spacing:.3em">' + esc(r.data.token) + '</div></div>'; f.reset();
      });
    };
  });
}
function drawSoalPilih() {
  var q = ($('#fs').value || '').toLowerCase(), L = P.soal.filter(function (s) { return !q || (s.mapel + ' ' + s.t).toLowerCase().indexOf(q) >= 0; });
  $('#ls').innerHTML = L.length ? '<table><tbody>' + L.map(function (s) { return '<tr><td style="width:36px"><input type="checkbox" style="min-height:0;width:auto" ' + (P.sel[s.id] ? 'checked' : '') + ' onchange="App.pil(\'' + s.id + '\',this.checked)"></td><td><span class="badge b-info">' + esc(s.mapel || '-') + '</span> ' + esc(s.t) + '</td><td>Kunci ' + esc(s.kunci) + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted" style="padding:14px">Bank soal kosong. Impor soal dulu di menu Bank Soal.</p>';
  $('#cs').textContent = Object.keys(P.sel).length + ' dipilih';
}

/* file Excel/CSV -> array objek */
function csvParse(t) {
  t = t.replace(/^\uFEFF/, ''); var l1 = t.split('\n')[0], d = l1.split(';').length > l1.split(',').length ? ';' : ',', rows = [], r = [], f = '', q = false;
  for (var i = 0; i < t.length; i++) { var c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === d) { r.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; r.push(f); f = ''; rows.push(r); r = []; } else f += c; }
  if (f !== '' || r.length) { r.push(f); rows.push(r); }
  rows = rows.filter(function (x) { return x.join('').trim() !== ''; }); if (!rows.length) return [];
  var h = rows.shift().map(function (x) { return x.trim(); });
  return rows.map(function (x) { var o = {}; h.forEach(function (k, i) { o[k] = (x[i] || '').trim(); }); return o; });
}
function muatScript(u) { return new Promise(function (ok, no) { if (window.XLSX) return ok(); var s = document.createElement('script'); s.src = u; s.onload = ok; s.onerror = function () { no(new Error('Gagal memuat pustaka Excel. Simpan file sebagai CSV.')); }; document.head.appendChild(s); }); }
function bacaFile(file) {
  return new Promise(function (ok, no) {
    var fr = new FileReader(), x = /\.xlsx?$/i.test(file.name);
    fr.onerror = function () { no(new Error('File tidak bisa dibaca.')); };
    fr.onload = function () { try { ok(x ? XLSX.utils.sheet_to_json(XLSX.read(fr.result, { type: 'array' }).Sheets[XLSX.read(fr.result, { type: 'array' }).SheetNames[0]], { defval: '', raw: false }) : csvParse(fr.result)); } catch (e) { no(e); } };
    if (x) muatScript(XLS).then(function () { fr.readAsArrayBuffer(file); }, no); else fr.readAsText(file);
  });
}
function unduh(nama, baris) {
  var teks = '\uFEFF' + baris.map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([teks], { type: 'text/csv;charset=utf-8' })); a.download = nama; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
}
function kirimBatch(aksi, rows, extra, ukuran) { // kirim bertahap, gabungkan hasil
  var i = 0, agg = { ditambah: 0, diperbarui: 0, dilewati: 0, gagal: [], akunBaru: [] };
  function lanjut() {
    if (i >= rows.length) return Promise.resolve(agg);
    var off = i; i += ukuran;
    return Api.call(aksi, Object.assign({ rows: rows.slice(off, off + ukuran) }, extra)).then(function (r) {
      if (!r.success) throw new Error(r.message); var d = r.data;
      agg.ditambah += d.ditambah || 0; agg.diperbarui += d.diperbarui || 0; agg.dilewati += d.dilewati || 0;
      (d.gagal || []).forEach(function (g) { agg.gagal.push({ baris: g.baris + off, alasan: g.alasan }); }); (d.akunBaru || []).forEach(function (a) { agg.akunBaru.push(a); });
      busy(true); return lanjut();
    });
  }
  busy(true); return lanjut().then(function (x) { busy(false); return x; }, function (e) { busy(false); throw e; });
}
function hasilImp(r, dry) {
  return '<div class="note"><b>' + (dry ? 'Hasil pindai (belum menulis apa pun)' : 'Import selesai') + '</b><br>Ditambah: <b>' + r.ditambah + '</b> · Diperbarui: <b>' + r.diperbarui + '</b> · Dilewati: <b>' + r.dilewati + '</b> · Gagal: <b>' + r.gagal.length + '</b></div>' +
    (r.gagal.length ? '<div class="note b" style="max-height:160px;overflow:auto">' + r.gagal.slice(0, 50).map(function (g) { return 'Baris ' + g.baris + ': ' + esc(g.alasan); }).join('<br>') + '</div>' : '');
}

function tSoal() {
  pc('<h1>Bank Soal</h1><div class="card" style="margin-top:16px"><h3>Import soal dari Excel / CSV</h3><p class="muted sm">Kolom: Mapel, Pertanyaan, A, B, C, D, E (opsional), Kunci (huruf A–E).</p>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><input type="file" id="fi" accept=".csv,.xlsx,.xls" style="flex:1;min-width:220px"><button class="btn" onclick="App.tmplSoal()">Unduh template</button></div>' +
    '<div id="pv" class="muted sm" style="margin:10px 0"></div><div style="display:flex;gap:8px"><button class="btn" id="b1" disabled>Pindai (dry-run)</button><button class="btn p" id="b2" disabled>Jalankan Import</button></div><div id="rs"></div></div><div class="card" style="margin-top:16px" id="bl"><div class="sk"></div></div>');
  var rows = [];
  $('#fi').onchange = function () { var f = this.files[0]; if (!f) return; bacaFile(f).then(function (r) { rows = r; $('#pv').textContent = rows.length + ' baris terbaca dari ' + f.name; $('#b1').disabled = $('#b2').disabled = !rows.length; }, function (e) { toast(e.message, 'error'); }); };
  var run = function (dry) { return function () { kirimBatch('soal.import', rows, { dryRun: dry }, 200).then(function (r) { $('#rs').innerHTML = hasilImp(r, dry); if (!dry) { toast('Soal berhasil diimpor'); listSoal(); } }, function (e) { toast(e.message, 'error'); }); }; };
  $('#b1').onclick = run(true); $('#b2').onclick = function () { if (confirm('Import ' + rows.length + ' baris ke bank soal?')) run(false)(); };
  listSoal();
}
function listSoal() {
  Api.call('soal.list').then(function (r) {
    if (!r.success) return; var el = $('#bl'); if (!el) return;
    el.innerHTML = '<h3>Daftar soal <span class="badge b-info">' + r.data.length + '</span></h3><div class="tw"><table><thead><tr><th>Mapel</th><th>Pertanyaan</th><th>Kunci</th></tr></thead><tbody>' +
      r.data.slice(-100).reverse().map(function (s) { return '<tr><td>' + esc(s.mapel || '-') + '</td><td>' + esc(s.t) + '</td><td>' + esc(s.kunci) + '</td></tr>'; }).join('') + '</tbody></table></div>' + baris(r.data);
  });
}
function tSiswa() {
  pc('<h1>Kelola Siswa</h1><div class="card" style="margin-top:16px"><h3>Import data siswa dari Excel / CSV</h3><p class="muted sm">Kolom: NIS, Nama, Kelas. Di Excel, format kolom NIS sebagai <b>Teks</b> agar angka 0 di depan tidak hilang. Aman diulang: NIS yang sama hanya diperbarui, tidak digandakan.</p>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><input type="file" id="fi" accept=".csv,.xlsx,.xls" style="flex:1;min-width:220px"><button class="btn" onclick="App.tmplSiswa()">Unduh template</button></div><div id="pv" class="muted sm" style="margin:10px 0"></div>' +
    '<div style="display:flex;gap:8px"><button class="btn" id="b1" disabled>Pindai (dry-run)</button><button class="btn p" id="b2" disabled>Jalankan Import</button></div><div id="rs"></div></div>');
  var rows = [];
  $('#fi').onchange = function () { var f = this.files[0]; if (!f) return; bacaFile(f).then(function (r) { rows = r; $('#pv').textContent = rows.length + ' baris terbaca dari ' + f.name; $('#b1').disabled = $('#b2').disabled = !rows.length; }, function (e) { toast(e.message, 'error'); }); };
  var run = function (dry) { return function () { kirimBatch('siswa.import', rows, { dryRun: dry }, 60).then(function (r) {
    $('#rs').innerHTML = hasilImp(r, dry) + (r.akunBaru.length ? '<div class="note w"><b>Simpan sekarang!</b> Password awal siswa baru hanya tampil sekali dan tidak dapat dilihat lagi.<br><button class="btn a" style="margin-top:8px" id="dl">Unduh daftar akun (CSV)</button></div>' : '');
    var d = $('#dl'); if (d) d.onclick = function () { unduh('akun-siswa-baru.csv', [['NIS', 'Nama', 'Kelas', 'Password']].concat(r.akunBaru.map(function (a) { return [a.NIS, a.Nama, a.Kelas, a.Password]; }))); };
  }, function (e) { toast(e.message, 'error'); }); }; };
  $('#b1').onclick = run(true); $('#b2').onclick = function () { if (confirm('Import ' + rows.length + ' siswa?')) run(false)(); };
}
function tGuru() {
  pc('<h1>Kelola Guru</h1><form class="card" id="fg" style="margin-top:16px;max-width:520px"><h3>Tambah akun guru</h3><label class="field"><span>Nama lengkap</span><input name="nama" required></label><label class="field"><span>Username (huruf kecil/angka)</span><input name="username" required></label><div class="err" id="e"></div><button class="btn p">Buat akun</button><div id="rs"></div></form>');
  $('#fg').onsubmit = function (ev) { ev.preventDefault(); var f = ev.target;
    Api.call('guru.tambah', { nama: f.nama.value, username: f.username.value }).then(function (r) { if (!r.success) { $('#e').textContent = r.message; return; } $('#e').textContent = ''; f.reset();
      $('#rs').innerHTML = '<div class="note w"><b>Catat sekarang — password hanya tampil sekali:</b><br>Username: <b class="mono">' + esc(r.data.username) + '</b><br>Password: <b class="mono">' + esc(r.data.password) + '</b></div>'; }); };
}

function tLaporan() {
  pc('<h1>Laporan</h1><div class="sk" style="margin-top:16px"></div>');
  Api.call('ujian.guru').then(function (r) {
    if (!r.success) return pc('<p class="err">' + esc(r.message) + '</p>');
    pc('<h1>Laporan</h1><div class="card" style="margin-top:16px"><select id="lu"><option value="">— pilih ujian —</option>' + r.data.map(function (u) { return '<option value="' + u.id + '">' + esc(u.judul) + ' (' + esc(u.kelas) + ')</option>'; }).join('') + '</select></div><div id="lp" style="margin-top:16px"></div>');
    $('#lu').onchange = function () {
      var id = this.value; if (!id) return; $('#lp').innerHTML = '<div class="sk"></div>'; busy(true); P.lk = '';
      Api.call('laporan.ujian', { idUjian: id }).then(function (r) { busy(false); if (!r.success) { $('#lp').innerHTML = '<p class="err">' + esc(r.message) + '</p>'; return; } P.lap = r.data; drawLap(); });
    };
  });
}
function drawLap() {
  var d = P.lap, s = P.lsub || 'rekap', H, R, top = '';
  if (s === 'rekap') {
    var kl = {}; d.rekap.forEach(function (x) { kl[x.kelas] = 1; });
    var rows = d.rekap.filter(function (x) { return !P.lk || x.kelas === P.lk; }), n = rows.filter(function (x) { return x.nilai != null; }).map(function (x) { return x.nilai; });
    H = ['Kelas', 'NIS', 'Nama', 'Status', 'Nilai', 'Pindah tab', 'Durasi'];
    R = rows.map(function (x) { return [x.kelas, x.nis, x.nama, x.status, x.nilai == null ? '' : x.nilai, x.pel, x.durasi == null ? '' : mmss(x.durasi)]; });
    top = '<div class="grid g4" style="margin-bottom:12px"><div class="card stat"><span class="xs muted">Rata-rata</span><b>' + (n.length ? Math.round(n.reduce(function (a, b) { return a + b; }, 0) / n.length * 10) / 10 : '—') + '</b></div><div class="card stat"><span class="xs muted">Tertinggi</span><b>' + (n.length ? Math.max.apply(null, n) : '—') + '</b></div><div class="card stat"><span class="xs muted">Terendah</span><b>' + (n.length ? Math.min.apply(null, n) : '—') + '</b></div><div class="card stat"><span class="xs muted">Sudah mengumpulkan</span><b>' + n.length + ' / ' + rows.length + '</b></div></div>' +
      '<select onchange="App.lkelas(this.value)" style="max-width:220px;margin-bottom:12px"><option value="">Semua kelas</option>' + Object.keys(kl).map(function (k) { return '<option' + (P.lk === k ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select>';
  } else if (s === 'analisis') {
    H = ['No', 'Soal', 'Kunci', '% benar', 'Sebaran jawaban'];
    R = d.analisis.map(function (a, i) { return [i + 1, a.t, a.kunci, a.benar + '%', Object.keys(a.dist).sort().map(function (l) { return l + ':' + a.dist[l]; }).join('  ') || '-']; });
  } else {
    H = ['Waktu', 'NIS', 'Nama', 'Jenis']; R = d.log.map(function (l) { return [fmt(l.waktu), l.nis, l.nama, l.jenis]; });
  }
  P.lcsv = [H].concat(R);
  var sub = [['rekap', 'Rekap Nilai'], ['analisis', 'Analisis Soal'], ['log', 'Log Pelanggaran']].map(function (t) { return '<button class="chip' + (s === t[0] ? ' on' : '') + '" onclick="App.lsub(\'' + t[0] + '\')">' + t[1] + '</button>'; }).join('');
  $('#lp').innerHTML = '<div class="tabs" style="margin-top:0">' + sub + '<span class="sp"></span><button class="btn" onclick="App.unduhLap()">Unduh CSV (Excel)</button></div>' + top +
    '<div class="card"><div class="tw"><table><thead><tr>' + H.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
    R.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (s === 'analisis' && i === 3 ? ' style="font-weight:600"' : '') + '>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' + (R.length ? '' : '<p class="muted">Belum ada data.</p>') + '</div>';
}

/* ---------- API PUBLIK untuk onclick ---------- */
window.App = {
  keluar: function () { if (X && X.aktif && !confirm('Ujian sedang berlangsung. Keluar sekarang?')) return; Sesi.keluar(); location.reload(); },
  home: function () { dash(); }, filter: function (k) { S.filter = k; drawDash(); }, buka: buka, mulai: function () { mulai(false); },
  pilih: pilih, nav: function (d) { X.idx = Math.max(0, Math.min(X.soal.length - 1, X.idx + d)); localSave(); drawQ(); }, ke: function (i) { X.idx = i; localSave(); drawQ(); },
  ragu: function () { var s = cur(); if (X.ragu[s.id]) delete X.ragu[s.id]; else X.ragu[s.id] = 1; localSave(); drawQ(); },
  konfirmasi: konfirmasi, kumpul: function () { kumpul(false); }, tab: tab, muat: muatPantau,
  pil: function (id, on) { if (on) P.sel[id] = 1; else delete P.sel[id]; $('#cs').textContent = Object.keys(P.sel).length + ' dipilih'; },
  lsub: function (k) { P.lsub = k; drawLap(); }, lkelas: function (k) { P.lk = k; drawLap(); }, unduhLap: function () { unduh('laporan-' + (P.lsub || 'rekap') + '.csv', P.lcsv); },
  pantauId: function (id) { P.pid = id; tab('pantau'); },
  tmplSoal: function () { unduh('template-soal.csv', [['Mapel', 'Pertanyaan', 'A', 'B', 'C', 'D', 'E', 'Kunci'], ['Matematika', 'Hasil dari 2 + 3 adalah ...', '4', '5', '6', '7', '', 'B']]); },
  tmplSiswa: function () { unduh('template-siswa.csv', [['NIS', 'Nama', 'Kelas'], ['202610101', 'Contoh Siswa', 'X MIPA 1']]); }
};

/* ---------- START ---------- */
var s0 = Sesi.ambil();
if (s0.token && s0.me && (s0.me.role === 'siswa') === (MODE === 'siswa')) { S.me = s0.me; masuk(); } else { if (s0.token) Sesi.keluar(); viewLogin(); }
})();
