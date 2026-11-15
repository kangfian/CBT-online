/* CBT Online — SPA vanilla. Navigasi & interaksi 100% di browser (0 ms); server hanya untuk data. */
(function () {
'use strict';
var CFG = window.APP_CONFIG || {}, app = document.querySelector('#app');
var S = { me: null, ujian: [], skew: 0, filter: 'semua', q: '', cur: null };
var X = null; // state ujian yang sedang berjalan
var VER = 'v2.9', MODE = window.APP_MODE === 'staf' ? 'staf' : 'siswa', V = { n: 0, j: 'pindah_tab' };
var P = { tab: 'dash', soal: null, sel: {}, data: [] };
var XLS = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

function $(s, r) { return (r || document).querySelector(s); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function now() { return Date.now() + S.skew; }
function render(h) { app.innerHTML = h; window.scrollTo(0, 0); }
function busy(on) { $('#bar').className = on ? 'on' : ''; }
function toast(m, t) { var e = $('#toast'); e.textContent = m; e.className = 'on ' + (t || ''); clearTimeout(toast.t); toast.t = setTimeout(function () { e.className = ''; }, 3200); }
function fmt(ms) { return new Date(ms).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB'; }
function fmtTgl(ms) { return new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }); }
function rentang(m, s) { var x = fmtTgl(m), y = fmtTgl(s); return x === y ? x : x + ' – ' + y; }
function tglMs(v, akhir) { return Date.parse(v + (akhir ? 'T23:59:59+07:00' : 'T00:00:00+07:00')); } // tanggal saja: buka 00.00, tutup 23.59 WIB
function mmss(ms) { var s = Math.max(0, Math.round(ms / 1000)); return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2); }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function topbar() {
  var m = S.me;
  return '<header class="top"><div><div class="brand">CBT Online</div><div class="sub">' + esc(CFG.NAMA_SEKOLAH) + '</div></div><div class="sp"></div>' +
    '<div class="who">Halo, ' + esc(m.nama) + '<br><small>' + (m.role === 'siswa' ? esc(m.kelas) : esc(m.role)) + '</small></div><button onclick="App.tema()">🎨 Tema</button><button onclick="App.keluar()">Keluar</button></header>';
}

/* ---------- LOGIN ---------- */
function viewLogin(msg) {
  var st = MODE === 'staf', tgl = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  var logo = CFG.LOGO ? '<img src="' + esc(CFG.LOGO) + '" alt="" style="width:44px;height:44px;border-radius:12px;object-fit:cover">' : '<span class="lg2-logo">🎓</span>';
  var F = st ? [['📚', 'Bank soal terkelola', 'Import, edit, dan kelompokkan soal per mata pelajaran'], ['📡', 'Pantau langsung', 'Lihat progres dan pelanggaran siswa saat ujian'], ['📊', 'Laporan otomatis', 'Rekap nilai dan analisis soal siap unduh']] :
    [['⏱', 'Timer akurat', 'Waktu dihitung dari server, adil untuk semua'], ['⚡', 'Nilai langsung', 'Hasil muncul begitu ujian dikumpulkan'], ['🛡', 'Aman & terawasi', 'Jawaban tersimpan otomatis dan ujian terpantau']];
  render('<div class="lg2"><button class="tbtn" onclick="App.tema()">🎨 Tema</button><section class="lg2-hero"><i class="sh s1"></i><i class="sh s2"></i><i class="sh s3"></i>' +
    '<div class="lg2-brand">' + logo + '<span>CBT Online</span></div><h1>' + (st ? 'Kelola ujian sekolah dalam satu tempat' : 'Ujian digital yang adil, cepat, dan terpercaya') + '</h1><p>' + esc(CFG.NAMA_SEKOLAH) + '</p>' +
    '<ul class="lg2-feat">' + F.map(function (f) { return '<li><i>' + f[0] + '</i><div><b>' + f[1] + '</b><span>' + f[2] + '</span></div></li>'; }).join('') + '</ul><div class="lg2-foot">' + esc(tgl) + '</div></section>' +
    '<section class="lg2-form"><form class="lg2-card" id="f"><div class="lg2-ava">' + (st ? '🛠️' : '🎓') + '</div><h2>' + (st ? 'Portal Admin &amp; Guru' : 'Selamat datang') + '</h2><p class="muted" style="margin:4px 0 20px">' + (st ? 'Masuk dengan username dan password akun Anda' : 'Masuk dengan NIS dan password pada kartu ujianmu') + '</p>' +
    '<label class="field"><span>' + (st ? 'Username' : 'NIS') + '</span><div class="inp"><b>👤</b><input id="id" autocomplete="username" required placeholder="' + (st ? 'username' : 'Nomor Induk Siswa') + '"></div></label>' +
    '<label class="field"><span>Password</span><div class="inp"><b>🔒</b><input id="pw" type="password" autocomplete="current-password" required placeholder="Password"><button type="button" class="eye" onclick="App.lihat()" aria-label="Tampilkan password">👁</button></div></label>' +
    '<div class="err" id="e">' + esc(msg || (Api.siap ? '' : 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js.')) + '</div><button class="btn p w lgb">Masuk →</button>' +
    '<p class="sm" style="text-align:center;margin:18px 0 0">' + (st ? '<a href="index.html">← Halaman login siswa</a>' : '<a href="admin.html">Admin / Guru? Masuk di sini</a><br><span class="muted">Lupa password? Tanyakan ke pengawas ujian.</span>') + '</p></form></section></div>');
  $('#f').onsubmit = function (ev) {
    ev.preventDefault(); var b = $('button.lgb', this); b.disabled = true; b.textContent = 'Memeriksa...'; busy(true);
    Api.call('login', { id: $('#id').value, password: $('#pw').value, tipe: MODE }).then(function (r) {
      busy(false);
      if (r.success) { Sesi.simpan({ token: r.data.token, me: r.data.me }); S.me = r.data.me; masuk(); }
      else { b.disabled = false; b.textContent = 'Masuk →'; $('#e').textContent = r.message; }
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
      '<h2>' + esc(u.judul) + '</h2><div class="meta">Tanggal: <b>' + rentang(u.mulai, u.selesai) + '</b><br>Durasi: <b>' + u.durasi + ' menit</b> · <b>' + u.jumlah + ' soal</b></div><div class="push">' + btn + '</div></div>';
  }).join('') : '<div class="card" style="grid-column:1/-1;text-align:center;padding:40px"><h2>Belum ada ujian</h2><p class="muted">Ujian untuk kelas Anda akan muncul di sini.</p></div>';
  var CC = { semua: 'var(--primary)', tersedia: '#16A34A', mendatang: '#F59E0B', selesai: '#3B82F6' };
  var tab = function (k, t) { return '<button class="chip' + (S.filter === k ? ' on' : '') + '" style="--cc:' + CC[k] + '" onclick="App.filter(\'' + k + '\')">' + t + '</button>'; };
  render(topbar() + '<main class="wrap"><div class="hero"><span class="pill xs">' + (n.tersedia + n.berlangsung ? n.tersedia + n.berlangsung + ' ujian aktif hari ini' : 'Tidak ada ujian aktif') + '</span><h1>Halo, ' + esc(S.me.nama) + '</h1><p>NIS: ' + esc(S.me.id) + ' • Kelas ' + esc(S.me.kelas) + '</p></div>' +
    '<div class="grid g4"><div class="card stat" style="border-left:4px solid #6366F1"><span class="xs muted">Total ujian</span><b>' + L.length + ' Ujian</b></div><div class="card stat" style="border-left:4px solid #16A34A"><span class="xs muted">Perlu dikerjakan</span><b>' + (n.tersedia + n.berlangsung) + '</b></div>' +
    '<div class="card stat" style="border-left:4px solid #F59E0B"><span class="xs muted">Mendatang</span><b>' + n.belum + ' Terjadwal</b></div><div class="card stat" style="border-left:4px solid #3B82F6"><span class="xs muted">Rata-rata nilai</span><b>' + (cnt ? (Math.round(tot / cnt * 10) / 10) + ' / 100' : '—') + '</b></div></div>' +
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
  fsMasuk(); // harus di dalam klik pengguna
  if (b) { b.disabled = true; b.textContent = 'Memeriksa token...'; } busy(true);
  Api.call('ujian.mulai', { idUjian: S.cur.id, token: tk }).then(function (r) {
    busy(false);
    if (r.success) { S.skew = r.data.now - Date.now(); startExam(r.data); return; }
    fsKeluar();
    if (b) { b.disabled = false; b.textContent = 'Verifikasi Token & Mulai Ujian'; $('#e').textContent = r.message; } else toast(r.message, 'error');
    if (r.code === 'HABIS') dash();
  });
}

/* ---------- SUARA PERINGATAN, LAYAR PENUH, TEMA ---------- */
var MSG = { pindah_tab: ['Peringatan pertama. Anda terdeteksi berpindah tab. Mohon tetap berada di halaman ujian.', 'Peringatan kedua. Jika Anda berpindah tab sekali lagi, ujian akan dikumpulkan otomatis.', 'Peringatan ketiga. Ujian Anda telah dikumpulkan otomatis.'],
  keluar_fullscreen: ['Peringatan pertama. Anda keluar dari layar penuh. Segera kembali ke layar penuh.', 'Peringatan kedua. Jika Anda keluar dari layar penuh sekali lagi, ujian akan dikumpulkan otomatis.', 'Peringatan ketiga. Ujian Anda telah dikumpulkan otomatis.'] };
function tts(n, j) { // suara pengucap (bahasa Indonesia) bawaan perangkat
  if (!window.speechSynthesis) return;
  var u = new SpeechSynthesisUtterance(MSG[j || 'pindah_tab'][n - 1]), v = speechSynthesis.getVoices().filter(function (x) { return /^id/i.test(x.lang); })[0];
  u.lang = 'id-ID'; u.rate = 0.95; u.volume = 1; if (v) u.voice = v; speechSynthesis.cancel(); speechSynthesis.speak(u);
}
function suara(n, j) { // utamakan rekaman suara orang (audio/peringatan-N.mp3 atau audio/layarpenuh-N.mp3) bila ada
  var done = false, fb = function () { if (!done) { done = true; tts(n, j); } };
  try { var a = new Audio((j === 'keluar_fullscreen' ? 'audio/layarpenuh-' : 'audio/peringatan-') + n + '.mp3'); a.onerror = fb; var p = a.play(); if (p && p.catch) p.catch(fb); } catch (e) { fb(); }
}
function popPel(n, j) { // pop-up peringatan pelanggaran untuk siswa
  var o = $('#pp'); if (o) o.remove();
  var fs = j === 'keluar_fullscreen', fin = n >= 3, m = document.createElement('div'); m.className = 'modal'; m.id = 'pp';
  var dots = [1, 2, 3].map(function (i) { return '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;margin:0 4px;background:' + (i <= n ? 'var(--bad)' : 'var(--line)') + '"></span>'; }).join('');
  m.innerHTML = '<div class="card" style="text-align:center;border-top:6px solid var(--bad)"><div style="font-size:46px;line-height:56px">' + (fs ? '🖥️' : '⚠️') + '</div><h2 style="color:var(--bad);margin:4px 0 10px">' + (fin ? 'Ujian Dikumpulkan Otomatis' : fs ? 'Anda Keluar dari Layar Penuh' : 'Peringatan Pelanggaran ' + n + ' dari 3') + '</h2>' +
    '<p>' + esc(MSG[fs ? 'keluar_fullscreen' : 'pindah_tab'][n - 1]) + '</p><div style="margin:14px 0">' + dots + '</div><p class="sm muted">' + (fs ? 'Ujian harus dikerjakan dalam layar penuh. Keluar dari layar penuh tercatat sebagai pelanggaran (' + Math.min(n, 3) + ' dari 3).' : 'Berpindah tab atau jendela selama ujian tercatat dan dilaporkan ke guru.') + '</p>' +
    '<div class="row" style="justify-content:center"><button class="btn p" id="okp">' + (fin ? 'Lihat Hasil' : fs ? 'Kembali ke Layar Penuh' : 'Saya Mengerti, Lanjutkan Ujian') + '</button></div></div>';
  document.body.appendChild(m); $('#okp').focus();
  $('#okp').onclick = function () { m.remove(); if (window.speechSynthesis) speechSynthesis.cancel(); if (!fin && X && X.aktif) fsMasuk(); };
}
document.addEventListener('visibilitychange', function () { if (!document.hidden && V.n) { var n = V.n, j = V.j; V.n = 0; popPel(n, j); setTimeout(function () { suara(n, j); }, 250); } });
if (window.speechSynthesis) speechSynthesis.getVoices();

function fsOk() { var e = document.documentElement; return !!(e && (e.requestFullscreen || e.webkitRequestFullscreen)); }
function fsAktif() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function fsMasuk() { // harus dipanggil dari klik/ketukan pengguna
  var e = document.documentElement, f = e && (e.requestFullscreen || e.webkitRequestFullscreen); if (!f) return Promise.resolve(false);
  try { var p = f.call(e); return p && p.then ? p.then(function () { return true; }, function () { return false; }) : Promise.resolve(true); } catch (x) { return Promise.resolve(false); }
}
function fsKeluar() { try { var f = document.exitFullscreen || document.webkitExitFullscreen; if (fsAktif() && f) { var p = f.call(document); if (p && p.catch) p.catch(function () {}); } } catch (x) {} }
function fsGate() { // dipakai bila ujian dimuat ulang/lanjut dan layar penuh belum aktif
  if ($('#fg')) return; var m = document.createElement('div'); m.className = 'modal'; m.id = 'fg';
  m.innerHTML = '<div class="card" style="text-align:center"><div style="font-size:46px">🖥️</div><h2>Mode Layar Penuh Diperlukan</h2><p class="muted">Ujian dikerjakan dalam layar penuh. Keluar dari layar penuh selama ujian tercatat sebagai pelanggaran.</p><div class="row" style="justify-content:center"><button class="btn a" id="fgo">Masuk Layar Penuh</button></div></div>';
  document.body.appendChild(m);
  $('#fgo').onclick = function () { fsMasuk().then(function (ok) { if (X) X.fsTry = (X.fsTry || 0) + 1; if (ok || (X && X.fsTry >= 2)) { m.remove(); if (X) X.fsOn = fsAktif(); if (!ok) toast('Layar penuh tidak tersedia di perangkat ini. Ujian dilanjutkan.', 'warn'); } else toast('Browser menolak layar penuh. Coba sekali lagi.', 'error'); }); };
}

var TEMA = [['terang', 'Terang', '#1E3A5F', '#FFFFFF'], ['gelap', 'Gelap', '#0f1830', '#171f36'], ['hijau', 'Hijau', '#166534', '#f6fbf7'], ['ungu', 'Ungu', '#5B21B6', '#faf7ff']];
function temaGet() { try { return localStorage.getItem('cbt_tema') || 'terang'; } catch (e) { return 'terang'; } }
function temaSet(t) { try { localStorage.setItem('cbt_tema', t); } catch (e) {} var R = document.documentElement; if (R && R.setAttribute) R.setAttribute('data-theme', t); }
function menuTutup() { var m = $('#um'); if (m) m.className = 'umenu hide'; }
document.addEventListener('click', function (e) { if (!(e.target && e.target.closest && e.target.closest('.mewrap'))) menuTutup(); });
function gantiPw() {
  menuTutup(); var m = document.createElement('div'); m.className = 'modal'; m.id = 'md';
  m.innerHTML = '<form class="card"><h2>Ganti Password</h2><p class="muted sm">Akun ' + esc(S.me.nama) + ' (' + (S.me.role === 'admin' ? 'Administrator' : 'Guru') + ')</p>' +
    '<label class="field" style="margin-top:12px"><span>Password lama</span><input id="pl" type="password" autocomplete="current-password" required></label>' +
    '<label class="field"><span>Password baru <small class="muted">(min. 8 karakter, huruf + angka)</small></span><input id="pb" type="password" autocomplete="new-password" required></label>' +
    '<label class="field"><span>Ulangi password baru</span><input id="pu" type="password" autocomplete="new-password" required></label>' +
    '<label class="sm" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="pt" style="width:auto;min-height:0"> Tampilkan password</label><div class="err" id="e"></div>' +
    '<div class="row"><button type="button" class="btn" onclick="document.getElementById(\'md\').remove()">Batal</button><button class="btn p" id="sv">Simpan Password</button></div></form>';
  document.body.appendChild(m); $('#pl').focus();
  $('#pt').onchange = function () { var t = this.checked ? 'text' : 'password'; $('#pl').type = t; $('#pb').type = t; $('#pu').type = t; };
  m.querySelector('form').onsubmit = function (ev) {
    ev.preventDefault(); var e = $('#e'), b = $('#sv');
    if ($('#pb').value !== $('#pu').value) { e.textContent = 'Ulangi password baru dengan benar.'; return; }
    b.disabled = true; Api.call('akun.password', { lama: $('#pl').value, baru: $('#pb').value }).then(function (r) {
      b.disabled = false; if (!r.success) { e.textContent = r.message; return; }
      m.remove(); toast('Password berhasil diubah');
    });
  };
}
function tema() {
  menuTutup();
  var o = $('#tm'); if (o) o.remove(); var m = document.createElement('div'); m.className = 'modal'; m.id = 'tm'; var cur = temaGet();
  m.innerHTML = '<div class="card"><h2>Pilih tema tampilan</h2><div class="grid g2" style="margin-top:14px;gap:12px">' + TEMA.map(function (t) {
    return '<button class="tema' + (cur === t[0] ? ' on' : '') + '" onclick="App.setTema(\'' + t[0] + '\')"><span class="sw" style="background:linear-gradient(135deg,' + t[2] + ' 50%,' + t[3] + ' 50%)"></span>' + t[1] + '</button>';
  }).join('') + '</div><div class="row"><button class="btn p" onclick="document.getElementById(\'tm\').remove()">Selesai</button></div></div>';
  document.body.appendChild(m);
}

/* ---------- RUANG UJIAN ---------- */
function rng(str) { var h = 1779033703 ^ str.length; for (var i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  var a = h >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function kocok(arr, r) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

function startExam(d) {
  X = { id: d.idSesi, judul: d.judul, batas: d.batas, idx: 0, jawab: d.jawaban || {}, ragu: {}, unsent: {}, pel: d.pelanggaran || 0, aktif: true, n: 0, ks: d.kumpul || 0, mulaiSesi: d.mulaiSesi };
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
  document.addEventListener('visibilitychange', onVis); document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);
  X.fsOn = fsAktif(); if (fsOk() && !X.fsOn) fsGate();
  window.onbeforeunload = function () { return X && X.aktif ? 'Ujian sedang berlangsung.' : undefined; };
}
function localSave() { save('cbt_exam', { id: X.id, jawab: X.jawab, ragu: X.ragu, idx: X.idx }); }
function cur() { return X.soal[X.idx]; }
function kbBuka() { return X.ks < 0 ? X.batas : X.ks > 0 ? Number(X.mulaiSesi) + X.ks * 60000 : 0; }
function kbHtml() { // tombol Kumpulkan hanya di soal terakhir; admin dapat mengunci sampai waktu tertentu
  if (X.idx < X.soal.length - 1) return '';
  if (X.ks < 0) return '<span class="sm muted" style="flex-basis:100%;text-align:right">🔒 Ujian dikumpulkan otomatis saat waktu habis.</span>';
  var sisa = kbBuka() - now();
  return sisa > 0 ? '<button class="btn" id="kb" disabled>🔒 Kumpulkan (dibuka ' + mmss(sisa) + ')</button>' : '<button class="btn a" id="kb" onclick="App.konfirmasi()">Kumpulkan Ujian</button>';
}
function drawQ() {
  var s = cur(), j = X.jawab[s.id];
  $('#pos').textContent = 'Soal ' + (X.idx + 1) + ' dari ' + X.soal.length;
  $('#q').innerHTML = '<div class="qhead"><span class="qno">Nomor ' + (X.idx + 1) + '</span><span class="xs muted">Pilihan ganda tunggal</span></div><div class="qtext">' + esc(s.t) + '</div>' +
    s.ord.map(function (k, i) { return '<button class="opt' + (j === k ? ' on' : '') + '" onclick="App.pilih(\'' + k + '\')"><i>' + 'ABCDE'[i] + '</i><span>' + esc(s.o[k]) + '</span></button>'; }).join('') +
    '<div class="qfoot"><button class="btn" onclick="App.nav(-1)"' + (X.idx ? '' : ' disabled') + '>← Sebelumnya</button><button class="btn' + (X.ragu[s.id] ? ' a' : '') + '" onclick="App.ragu()">' + (X.ragu[s.id] ? '★ Ragu-ragu' : '☆ Ragu-ragu') + '</button><span class="sp"></span>' +
    (X.idx < X.soal.length - 1 ? '<button class="btn p" onclick="App.nav(1)">Selanjutnya →</button>' : '') + kbHtml() + '</div>';
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
    '<div class="sm muted" style="display:flex;justify-content:space-between;margin-top:12px"><span>Kelengkapan</span><b>' + p + '%</b></div><div class="bar2"><i style="width:' + p + '%"></i></div><div class="nav">' + g + '</div><p class="sm muted" style="margin-top:12px">' + (X.ks < 0 ? 'Ujian dikumpulkan otomatis saat waktu habis.' : 'Tombol <b>Kumpulkan</b> ada di soal terakhir.') + '</p>';
}
function pilih(k) { var s = cur(); X.jawab[s.id] = k; X.unsent[s.id] = k; localSave(); drawQ(); if (Object.keys(X.unsent).length >= 5) flush(); }
function setSync(t, c) { var e = $('#sy'); if (e) { e.textContent = t; e.className = 'badge ' + (c === 'bad' ? 'b-bad' : c === 'wait' ? 'b-warn' : 'b-ok'); } }
function flush() {
  var ks = Object.keys(X.unsent); if (!ks.length || X.fl) return Promise.resolve(true);
  var snap = {}; ks.forEach(function (i) { snap[i] = X.unsent[i]; }); X.fl = true; setSync('Menyimpan...', 'wait');
  return Api.call('jawaban.simpan', { idSesi: X.id, jawaban: snap }).then(function (r) {
    X.fl = false;
    if (r.success) { ks.forEach(function (i) { if (X.unsent[i] === snap[i]) delete X.unsent[i]; }); setSync('Tersimpan', 'ok'); if (r.data && r.data.nilai !== undefined) { tamat(r.data); return true; } if (X && r.data && r.data.kumpul !== undefined && r.data.kumpul !== X.ks) { X.ks = r.data.kumpul; drawQ(); } return true; }
    if (r.code === 'SELESAI') { kumpul(true); return true; }
    setSync(r.offline ? 'Offline — aman di perangkat' : 'Gagal menyimpan', 'bad'); return false;
  });
}
function tick() {
  if (!X || !X.aktif) return;
  var sisa = X.batas - now(), e = $('#tm'); if (!e) return;
  if (sisa <= 0) { e.textContent = '00:00'; kumpul(true); return; }
  var kb = $('#kb'); if (kb && X.ks > 0 && kb.disabled) { var s2 = kbBuka() - now(); if (s2 <= 0) drawQ(); else kb.textContent = '🔒 Kumpulkan (dibuka ' + mmss(s2) + ')'; }
  e.textContent = mmss(sisa); e.className = 'timer' + (sisa < 120000 ? ' bad' : sisa < 600000 ? ' warn' : '');
  if (++X.n % 15 === 0) flush();
}
function catat(jenis) { // satu pintu pencatatan pelanggaran (pindah tab / keluar layar penuh)
  if (!X || !X.aktif) return; var t = Date.now(); if (t - (X.lp || 0) < 1500) return; X.lp = t;
  X.pel++; V.n = Math.min(X.pel, 3); V.j = jenis; banner();
  if (jenis === 'keluar_fullscreen' && !document.hidden) { var n = V.n; V.n = 0; popPel(n, jenis); setTimeout(function () { suara(n, jenis); }, 250); }
  Api.call('pelanggaran.catat', { idSesi: X.id, jenis: jenis }).then(function (r) {
    if (r.success && r.data && r.data.hasil) tamat(r.data.hasil);
    else if (r.success && r.data && r.data.selesai) kumpul(true);
    else if (!r.success && X && X.pel >= 3) kumpul(true);
  });
}
function onVis() { if (X && X.aktif && document.hidden) catat('pindah_tab'); }
function onFs() {
  if (!X || !X.aktif) return;
  if (fsAktif()) { X.fsOn = true; var g = $('#fg'); if (g) g.remove(); return; }
  if (X.fsOn) { X.fsOn = false; catat('keluar_fullscreen'); }
}
function banner() {
  var b = $('#ban'); if (!b) return;
  b.innerHTML = X.pel ? '<div class="banner"><div style="font-size:22px">⚠</div><div style="flex:1"><b>PERINGATAN INTEGRITAS ' + Math.min(X.pel, 3) + ' DARI 3</b><br>Terdeteksi perpindahan tab atau jendela kehilangan fokus. Jawaban tetap tersimpan, namun ujian dikumpulkan otomatis pada pelanggaran ke-3.</div><button class="btn sm" onclick="this.parentNode.remove()">Tutup</button></div>' : '';
}
function konfirmasi() {
  if (X.ks < 0 || (X.ks > 0 && kbBuka() > now())) { toast('Tombol kumpulkan belum dibuka.', 'warn'); return; }
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
    if (r.code === 'TERKUNCI') { if (r.data) X.ks = r.data.ks; var md0 = $('#md'); if (md0) md0.remove(); drawQ(); toast(r.message, 'error'); if (auto) setTimeout(function () { kumpul(true); }, 2000); return; }
    toast(r.offline ? 'Belum tersambung. Jawaban aman di perangkat; mencoba lagi...' : r.message, 'error');
    if (auto || r.offline) setTimeout(function () { kumpul(true); }, 4000);
  });
}
function tamat(res) {
  if (!X || !X.aktif) return; X.aktif = false; clearInterval(X.t);
  document.removeEventListener('visibilitychange', onVis); document.removeEventListener('fullscreenchange', onFs); document.removeEventListener('webkitfullscreenchange', onFs); window.onbeforeunload = null; fsKeluar();
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
var TC = { dash: ['#6366F1', '#3B82F6'], buat: ['#10B981', '#14B8A6'], pantau: ['#F97316', '#EF4444'], soal: ['#A855F7', '#EC4899'], laporan: ['#06B6D4', '#3B82F6'], siswa: ['#EC4899', '#F43F5E'], guru: ['#14B8A6', '#22C55E'] };
function panel() {
  var adm = S.me.role === 'admin';
  var G = [['', [['dash', 'Dashboard', '🏠']]], ['Ujian', [['buat', 'Buat Ujian', '📝'], ['pantau', 'Pantau Ujian', '📡'], ['soal', 'Bank Soal', '📚'], ['laporan', 'Laporan', '📊']]]].concat(adm ? [['Data', [['siswa', 'Kelola Siswa', '🎓'], ['guru', 'Kelola Guru', '🍎']]]] : []);
  render('<div class="shell"><nav class="side"><div class="sbrand"><span class="lg">🎓</span><div><b>CBT Online</b><span>' + (adm ? 'Administrator' : 'Guru') + '</span></div></div>' +
    G.map(function (g) { return (g[0] ? '<div class="sgrp">' + g[0] + '</div>' : '') + g[1].map(function (t) { return '<button class="mi' + (P.tab === t[0] ? ' on' : '') + '" data-t="' + t[0] + '" style="--c1:' + TC[t[0]][0] + ';--c2:' + TC[t[0]][1] + '" onclick="App.tab(\'' + t[0] + '\')"><span class="ic">' + t[2] + '</span>' + t[1] + '</button>'; }).join(''); }).join('') +
    '<span class="sp"></span><div class="xs" style="color:#adc8f5;padding:0 12px 6px">Versi ' + VER + '</div><button class="mi keluar" style="--c1:#EF4444;--c2:#F97316" onclick="App.keluar()"><span class="ic">⎋</span>Keluar</button></nav><main class="main"><div class="mtop"><span class="muted">' + new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }) + '</span><span class="sp"></span><div class="mewrap"><button class="me" onclick="App.menu(event)" aria-haspopup="true"><i>' + esc(S.me.nama.charAt(0).toUpperCase()) + '</i><div><b>' + esc(S.me.nama) + '</b><br><span class="muted">' + (adm ? 'Administrator' : 'Guru') + '</span></div><span class="muted">▾</span></button><div class="umenu hide" id="um"><button onclick="App.tema()"><span class="ic" style="--c1:#8B5CF6;--c2:#EC4899">🎨</span>Tema tampilan</button><button onclick="App.ganti()"><span class="ic" style="--c1:#F59E0B;--c2:#F97316">🔑</span>Ganti Password</button><button onclick="App.keluar()"><span class="ic" style="--c1:#EF4444;--c2:#F43F5E">⎋</span>Keluar</button></div></div></div><div id="pc"></div></main></div>');
  tab(P.tab);
}
function tab(t) {
  clearInterval(P.iv); P.tab = t; Array.prototype.forEach.call(document.querySelectorAll('.side button[data-t]'), function (b) { b.className = 'mi' + (b.dataset.t === t ? ' on' : ''); });
  var mn = $('.main'); if (mn && mn.style && mn.style.setProperty && TC[t]) { mn.style.setProperty('--pg1', TC[t][0]); mn.style.setProperty('--pg2', TC[t][1]); }
  ({ dash: tDash, pantau: tPantau, buat: tBuat, soal: tSoal, laporan: tLaporan, siswa: tSiswa, guru: tGuru })[t]();
}
function pc(h) { $('#pc').innerHTML = h; }
function baris(rows) { return rows.length ? '' : '<p class="muted">Belum ada data.</p>'; }

function dlg(t, body, ok, fn, danger) { // dialog konfirmasi generik
  var m = document.createElement('div'); m.className = 'modal'; m.id = 'md2';
  m.innerHTML = '<div class="card"><h2>' + t + '</h2><div style="margin-top:8px">' + body + '</div><div class="row"><button class="btn" id="dn">Batal</button><button class="btn ' + (danger ? 'd' : 'p') + '" id="dy">' + ok + '</button></div></div>';
  document.body.appendChild(m); $('#dn').onclick = function () { m.remove(); };
  $('#dy').onclick = function () { this.disabled = true; fn(function () { m.remove(); }, this); };
}
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
    return '<div class="card"><div style="display:flex;gap:8px;justify-content:space-between"><span class="badge ' + (B ? 'b-ok' : 'b-info') + '">' + (B ? '● Berlangsung' : 'Terjadwal') + '</span><span class="sm muted">' + esc(u.kelas) + '</span></div><h3 style="margin:8px 0 2px">' + esc(u.judul) + '</h3><div class="sm muted">' + rentang(u.mulai, u.selesai) + '</div>' +
      '<div class="prog"><i style="width:' + (u.dikumpulkan / p * 100) + '%;background:var(--ok)"></i><i style="width:' + (u.mengerjakan / p * 100) + '%;background:#3B82F6"></i></div>' +
      '<div class="sm" style="display:flex;justify-content:space-between"><span>' + u.dikumpulkan + ' selesai · ' + u.mengerjakan + ' mengerjakan · ' + Math.max(0, u.peserta - u.dikumpulkan - u.mengerjakan) + ' belum</span><span>' + u.pel + ' ⚠</span></div>' +
      '<button class="btn sm" style="margin-top:10px" onclick="App.pantauId(\'' + u.id + '\')">Pantau →</button></div>';
  }).join('') : '<div class="card muted" style="grid-column:1/-1;text-align:center;padding:26px">Tidak ada ujian yang sedang berlangsung atau terjadwal.</div>';
  var mx = Math.max.apply(null, d.hist.concat([1])), lab = ['< 60', '60–69', '70–79', '80–89', '90–100'], col = ['#EF4444', '#F59E0B', '#EAB308', '#3B82F6', '#16A34A'];
  var chart = '<svg viewBox="0 0 400 200" style="width:100%;height:auto" role="img" aria-label="Distribusi nilai">' + d.hist.map(function (v, i) {
    var hh = Math.round(v / mx * 130), x = 20 + i * 76;
    return '<rect x="' + x + '" y="' + (150 - hh) + '" width="56" height="' + hh + '" rx="6" fill="' + col[i] + '"/><text x="' + (x + 28) + '" y="' + (144 - hh) + '" text-anchor="middle" font-size="13" font-weight="700" style="fill:var(--text)">' + v + '</text><text x="' + (x + 28) + '" y="174" text-anchor="middle" font-size="12" style="fill:var(--muted)">' + lab[i] + '</text>';
  }).join('') + '<line x1="10" y1="150" x2="390" y2="150" style="stroke:var(--line)"/></svg>';
  var lg = d.log.length ? d.log.map(function (l) { return '<div class="lg"><span class="dot"></span><div><b>' + esc(l.nama) + '</b> pindah tab<br><span class="muted">' + esc(l.ujian) + ' · ' + fmt(l.waktu) + '</span></div></div>'; }).join('') : '<p class="muted sm">Belum ada pelanggaran tercatat.</p>';
  var SB = { berlangsung: 'b-ok', terjadwal: 'b-info', selesai: 'b-mut' };
  var tb = d.ujian.length ? '<table><thead><tr><th>Ujian</th><th>Kelas</th><th>Jadwal</th><th>Status</th><th>Peserta</th><th>Selesai</th><th>Rata-rata</th><th>Pelanggaran</th><th></th></tr></thead><tbody>' + d.ujian.map(function (u) {
    return '<tr><td><b>' + esc(u.judul) + '</b></td><td>' + esc(u.kelas) + '</td><td class="sm">' + fmtTgl(u.mulai) + '</td><td><span class="badge ' + SB[u.status] + '">' + u.status + '</span></td><td>' + u.peserta + '</td><td>' + u.dikumpulkan + '</td><td>' + (u.rata == null ? '—' : u.rata) + '</td><td>' + (u.pel ? '<span class="badge b-bad">' + u.pel + 'x</span>' : '0') + '</td><td><button class="btn sm" onclick="App.pantauId(\'' + u.id + '\')">Pantau</button></td></tr>';
  }).join('') + '</tbody></table>' : '<p class="muted">Belum ada ujian. Mulai dengan menambah soal lalu buat ujian.</p>';
  pc('<div id="dk"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div><h1>Dashboard</h1><div class="muted sm">Pembaruan otomatis tiap 30 detik · terakhir ' + new Date(d.now).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }) + '</div></div><span class="sp" style="flex:1"></span>' +
    '<button class="btn cg" style="--c1:#A855F7;--c2:#EC4899" onclick="App.tab(\'soal\')">+ Import Soal</button>' + (adm ? '<button class="btn cg" style="--c1:#F97316;--c2:#EF4444" onclick="App.tab(\'siswa\')">+ Import Siswa</button>' : '') + '<button class="btn cg" style="--c1:#10B981;--c2:#14B8A6" onclick="App.tab(\'buat\')">+ Buat Ujian</button></div>' +
    '<div class="grid g6" style="margin-top:18px">' + K + '</div>' +
    '<div class="sec"><h2>Ujian berlangsung &amp; terjadwal</h2></div><div class="grid g3">' + lc + '</div>' +
    '<div class="grid g23" style="margin-top:22px"><div class="card"><h2>Distribusi nilai</h2><p class="muted sm" style="margin:2px 0 8px">Seluruh ujian yang sudah dikumpulkan</p>' + chart + '</div><div class="card"><h2>Pelanggaran terbaru</h2><div style="margin-top:8px">' + lg + '</div></div></div>' +
    '<div class="sec"><h2>Ujian terbaru</h2></div><div class="card"><div class="tw">' + tb + '</div></div></div>');
}
function pStat(x) { return x.status === 'belum' ? 'belum' : x.status === 'berlangsung' ? 'mengerjakan' : 'selesai'; }
function tPantau() {
  clearInterval(P.iv); P.kcFor = ''; pc('<h1>Pantau Ujian</h1><div class="sk" style="margin-top:16px;min-height:160px"></div>');
  Api.call('ujian.guru').then(function (r) {
    if (P.tab !== 'pantau') return;
    if (!r.success) return pc('<h1>Pantau Ujian</h1><p class="err">' + esc(r.message) + '</p>');
    P.uj = r.data;
    if (!r.data.length) return pc('<h1>Pantau Ujian</h1><div class="card" style="margin-top:16px;text-align:center;padding:40px"><h2>Belum ada ujian</h2><p class="muted">Buat ujian terlebih dahulu.</p><button class="btn p" onclick="App.tab(\'buat\')">+ Buat Ujian</button></div>');
    var n = Date.now(), live = r.data.filter(function (u) { return n >= u.mulai && n <= u.selesai; })[0], ada = r.data.filter(function (u) { return u.id === P.pid; })[0];
    P.cur = (ada || live || r.data[0]).id; P.pid = ''; P.pf = 'semua'; P.ps = ''; P.pd = null; if (P.auto === undefined) P.auto = true;
    pc('<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><div style="flex:1;min-width:200px"><h1>Pantau Ujian</h1></div><select id="su" style="max-width:400px">' +
      r.data.map(function (u) { var b = n >= u.mulai && n <= u.selesai ? '● ' : n < u.mulai ? '◷ ' : '✓ '; return '<option value="' + u.id + '"' + (u.id === P.cur ? ' selected' : '') + '>' + b + esc(u.judul) + ' (' + esc(u.kelas) + ')</option>'; }).join('') + '</select></div>' +
      '<div id="pk" style="margin-top:16px"><div class="sk"></div></div><div class="card" style="margin-top:16px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><div id="pch" style="display:flex;gap:8px;flex-wrap:wrap"></div><span style="flex:1"></span>' +
      '<input id="ps" placeholder="Cari nama / NIS..." style="max-width:210px"><label class="sm" style="display:flex;gap:6px;align-items:center;white-space:nowrap"><input type="checkbox" id="pa" style="width:auto;min-height:0"' + (P.auto ? ' checked' : '') + '> Otomatis 15 dtk</label>' +
      '<button class="btn sm" onclick="App.muat()">⟳ Segarkan</button><button class="btn sm" onclick="App.unduhPantau()">Unduh CSV</button></div><div class="tw" id="ptb" style="margin-top:12px"></div></div>');
    $('#su').onchange = function () { P.cur = this.value; P.pd = null; P.pf = 'semua'; $('#pk').innerHTML = '<div class="sk"></div>'; muatPantau(); };
    $('#ps').oninput = function () { P.ps = this.value; drawTabel(); };
    $('#pa').onchange = function () { P.auto = this.checked; };
    muatPantau(); P.iv = setInterval(function () { if (P.tab !== 'pantau') clearInterval(P.iv); else if (P.auto) muatPantau(true); }, 15000);
  });
}
function muatPantau(silent) {
  if (!P.cur) return; if (silent !== true) busy(true);
  Api.call('ujian.pantau', { idUjian: P.cur }).then(function (r) {
    busy(false); if (P.tab !== 'pantau' || !$('#pk')) return;
    if (!r.success) { if (silent !== true) $('#pk').innerHTML = '<p class="err">' + esc(r.message) + '</p>'; return; }
    P.pd = r.data; P.pt = Date.now(); drawPantau();
  });
}
function drawPantau() {
  var d = P.pd, n = Date.now(), c = { belum: 0, mengerjakan: 0, selesai: 0, pel: 0 }, tot = d.rows.length;
  d.rows.forEach(function (x) { c[pStat(x)]++; if (x.pelanggaran) c.pel++; }); P.pc = c;
  var st = n < d.mulai ? ['b-info', 'Terjadwal'] : n > d.selesai ? ['b-mut', 'Waktu ujian berakhir'] : ['b-ok', '● Sedang berlangsung'], pct = function (v) { return tot ? v / tot * 100 : 0; };
  var kp = function (t, v, col, s) { return '<div class="card stat" style="border-left:4px solid ' + col + '"><span class="xs muted">' + t + '</span><b>' + v + '</b><span class="sm muted">' + s + '</span></div>'; };
  $('#pk').innerHTML = '<div class="card" style="display:flex;gap:18px;flex-wrap:wrap;align-items:center"><div style="flex:1;min-width:240px"><span class="badge ' + st[0] + '">' + st[1] + '</span><h2 style="margin:6px 0 2px">' + esc(d.judul) + '</h2>' +
    '<div class="sm muted">Kelas ' + esc(d.kelas) + ' · ' + d.jumlah + ' soal<br>' + rentang(d.mulai, d.selesai) + '</div></div>' +
    '<div style="text-align:center"><div class="xs muted">Token ujian</div><div class="mono" style="font-size:28px;font-weight:700;letter-spacing:.25em">' + esc(d.token) + '</div><button class="btn sm" onclick="App.salinToken()">Salin token</button></div>' +
    '<button class="btn d" onclick="App.hapusUjian()">🗑 Hapus ujian</button></div><div id="pkc"></div>' +
    '<div class="grid g4" style="margin-top:12px">' + kp('Total peserta', tot, '#1E3A5F', c.belum + ' belum mulai') + kp('Sedang mengerjakan', c.mengerjakan, '#3B82F6', 'saat ini') + kp('Sudah selesai', c.selesai, '#16A34A', Math.round(pct(c.selesai)) + '% peserta') + kp('Ada pelanggaran', c.pel, '#DC2626', 'siswa pindah tab') + '</div>' +
    '<div class="prog" style="margin-top:12px;height:10px"><i style="width:' + pct(c.selesai) + '%;background:var(--ok)"></i><i style="width:' + pct(c.mengerjakan) + '%;background:#3B82F6"></i></div>' +
    '<div class="sm muted" style="display:flex;justify-content:space-between"><span>🟩 selesai · 🟦 mengerjakan · ⬜ belum mulai</span><span>Diperbarui ' + new Date(P.pt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }) + '</span></div>';
  $('#pch').innerHTML = [['semua', 'Semua', tot], ['belum', 'Belum mulai', c.belum], ['mengerjakan', 'Mengerjakan', c.mengerjakan], ['selesai', 'Selesai', c.selesai], ['pel', 'Pelanggaran', c.pel]].map(function (t) { return '<button class="chip' + (P.pf === t[0] ? ' on' : '') + '" onclick="App.pf(\'' + t[0] + '\')">' + t[1] + ' (' + t[2] + ')</button>'; }).join('');
  if (P.kcFor !== P.cur) {
    P.kcFor = P.cur; var kc = d.kumpul, km = kc < 0 ? '-1' : kc > 0 ? 'n' : '0';
    $('#pkc').innerHTML = '<div class="card" style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;align-items:center"><b>🔒 Tombol Kumpulkan siswa:</b><select id="pks" onchange="App.pks()" style="max-width:360px"><option value="0"' + (km === '0' ? ' selected' : '') + '>Boleh dikumpulkan kapan saja</option><option value="n"' + (km === 'n' ? ' selected' : '') + '>Terkunci N menit pertama</option><option value="-1"' + (km === '-1' ? ' selected' : '') + '>Tidak ada tombol — otomatis saat waktu habis</option></select>' +
      '<input id="pkn" type="number" min="1" max="' + d.durasi + '" value="' + (kc > 0 ? kc : '') + '" placeholder="menit" style="width:100px" class="' + (km === 'n' ? '' : 'hide') + '"><button class="btn p sm" onclick="App.kumpulAtur()">Simpan</button><span class="sm muted">Durasi ujian ' + d.durasi + ' menit. Berlaku juga untuk siswa yang sedang mengerjakan.</span></div>';
  } else if (!$('#pkc').innerHTML) P.kcFor = '';
  drawTabel();
}
function drawTabel() {
  var d = P.pd; if (!d) return; var q = (P.ps || '').toLowerCase(), f = P.pf || 'semua';
  var B = { belum: ['b-mut', 'Belum mulai'], berlangsung: ['b-info', 'Mengerjakan'], dikumpulkan: ['b-ok', 'Selesai'], 'dikumpulkan-otomatis': ['b-warn', 'Dikumpulkan otomatis'] };
  var L = d.rows.filter(function (x) { return (f === 'semua' || (f === 'pel' ? x.pelanggaran > 0 : pStat(x) === f)) && (!q || (x.nis + ' ' + x.nama).toLowerCase().indexOf(q) >= 0); });
  $('#ptb').innerHTML = L.length ? '<table><thead><tr><th>Siswa</th><th>Kelas</th><th>Status</th><th style="min-width:130px">Progres jawaban</th><th>Pelanggaran</th><th>Nilai</th></tr></thead><tbody>' + L.map(function (x) {
    var p = d.jumlah ? Math.round(x.jawab / d.jumlah * 100) : 0, b = B[x.status] || B.belum;
    return '<tr style="' + (x.pelanggaran >= 3 ? 'background:var(--bad-bg)' : x.pelanggaran ? 'background:var(--warn-bg)' : '') + '"><td><div style="display:flex;gap:10px;align-items:center"><span class="me" style="padding:0;border:0;background:none"><i>' + esc(x.nama.charAt(0).toUpperCase()) + '</i></span><div><b>' + esc(x.nama) + '</b><br><span class="mono muted sm">' + esc(x.nis) + '</span></div></div></td><td>' + esc(x.kelas) + '</td>' +
      '<td><span class="badge ' + b[0] + '">' + b[1] + '</span></td><td><div class="sm">' + x.jawab + ' / ' + d.jumlah + '</div><div class="prog" style="margin:4px 0 0"><i style="width:' + p + '%;background:var(--primary)"></i></div></td>' +
      '<td>' + (x.pelanggaran >= 3 ? '<span class="badge b-bad">' + x.pelanggaran + 'x terkunci</span>' : x.pelanggaran ? '<span class="badge b-warn">' + x.pelanggaran + 'x</span>' : '<span class="muted">0x</span>') + '</td><td><b>' + (x.nilai == null ? '—' : esc(x.nilai)) + '</b></td></tr>';
  }).join('') + '</tbody></table>' : '<p class="muted" style="padding:18px;text-align:center">Tidak ada siswa pada filter ini.</p>';
}
function hapusUjian() {
  var d = P.pd, c = P.pc || { selesai: 0, mengerjakan: 0 }; if (!d) return;
  dlg('Hapus ujian ini?', '<p><b>' + esc(d.judul) + '</b></p><p class="muted">Ujian beserta <b>' + (c.selesai + c.mengerjakan) + ' sesi pengerjaan</b>, nilai, dan log pelanggarannya akan dihapus <b>permanen</b>. Bank soal tidak terpengaruh.</p>' +
    (c.mengerjakan ? '<div class="note b">Ada ' + c.mengerjakan + ' siswa yang sedang mengerjakan. Ujian tidak dapat dihapus sampai mereka selesai.</div>' : ''), 'Ya, Hapus Ujian', function (close, btn) {
    Api.call('ujian.hapus', { idUjian: P.cur }).then(function (r) { if (!r.success) { btn.disabled = false; toast(r.message, 'error'); return; } close(); toast('Ujian dihapus'); P.cur = ''; tPantau(); });
  }, true);
}
function tBuat() {
  pc('<h1>Buat Ujian</h1><div class="sk" style="margin-top:16px"></div>');
  Promise.all([Api.call('soal.list'), Api.call('meta.opsi')]).then(function (rs) {
    var a = rs[0], b = rs[1]; if (!a.success || !b.success) return pc('<p class="err">' + esc((a.success ? b : a).message) + '</p>');
    P.soal = a.data; P.sel = {}; P.kls = {}; var M = b.data.mapel, KL = b.data.kelas;
    var d0 = new Date(Date.now() + 36e5), p2 = function (n) { return ('0' + n).slice(-2); }, loc = function (d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes()); };
    var hari0 = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10); // tanggal hari ini (WIB)
    pc('<h1>Buat Ujian</h1><form class="card" id="fb" style="margin-top:16px"><div class="grid g2"><label class="field"><span>Judul ujian *</span><input name="judul" required placeholder="mis. PAS Ganjil 2026"></label>' +
      '<label class="field"><span>Mata pelajaran *</span><select name="mapel" id="fm" required><option value="">— pilih mata pelajaran —</option>' + M.map(function (m) { return '<option>' + esc(m) + '</option>'; }).join('') + '</select>' + (M.length ? '' : '<span class="err">Bank soal masih kosong. Import soal dulu.</span>') + '</label></div>' +
      '<div class="field"><span>Kelas peserta * <small class="muted">(klik untuk memilih, dari data siswa)</small></span><div style="display:flex;flex-wrap:wrap;gap:8px">' + (KL.length ? KL.map(function (k) { return '<button type="button" class="chip" data-k="' + esc(k) + '" onclick="App.kls(this)">' + esc(k) + '</button>'; }).join('') : '<span class="err">Belum ada data siswa. Import siswa dulu.</span>') + '</div></div>' +
      '<div class="grid g3"><label class="field"><span>Durasi (menit) *</span><input name="durasi" type="number" min="1" value="45" required></label><label class="field"><span>Ujian dapat dimulai * <small class="muted">(buka 00.00)</small></span><input name="mulai" type="date" value="' + hari0 + '" required></label><label class="field"><span>Ditutup pada * <small class="muted">(tutup 23.59 WIB)</small></span><input name="selesai" type="date" value="' + hari0 + '" required></label></div>' +
      '<div class="field"><span>Pengumpulan jawaban oleh siswa</span><div class="grid g2" style="gap:10px"><select id="km"><option value="0">Boleh dikumpulkan kapan saja (tombol ada di soal terakhir)</option><option value="n">Kunci tombol kumpulkan selama N menit pertama</option><option value="-1">Tidak ada tombol — otomatis saat waktu habis</option></select><input id="kn" type="number" min="1" placeholder="N menit" class="hide"></div></div>' +
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:6px 0 10px"><h3>Pilih soal <span class="badge b-info" id="cs">0 dipilih</span></h3><span style="flex:1"></span><button type="button" class="btn sm" onclick="App.pilSemua()">Pilih semua yang tampil</button><button type="button" class="btn sm" onclick="App.pilKosong()">Kosongkan</button></div>' +
      '<input id="fs" placeholder="Cari isi soal..." style="margin-bottom:10px"><div id="ls" style="max-height:320px;overflow:auto;border:1px solid var(--line);border-radius:8px"></div>' +
      '<div class="err" id="e"></div><button class="btn p" style="margin-top:14px">Buat &amp; Aktifkan Ujian</button></form><div id="hs"></div>');
    drawSoalPilih(); $('#fs').oninput = drawSoalPilih; $('#fm').onchange = function () { P.sel = {}; drawSoalPilih(); }; $('#km').onchange = function () { $('#kn').className = this.value === 'n' ? '' : 'hide'; };
    $('#fb').onsubmit = function (ev) {
      ev.preventDefault(); var f = ev.target, ids = Object.keys(P.sel), kl = Object.keys(P.kls), bt = $('button.p', f), e = $('#e');
      if (!kl.length) { e.textContent = 'Pilih minimal satu kelas.'; return; } if (!ids.length) { e.textContent = 'Pilih minimal satu soal.'; return; } if (tglMs(f.selesai.value, true) < tglMs(f.mulai.value, false)) { e.textContent = 'Tanggal ditutup tidak boleh sebelum tanggal mulai.'; return; }
      var km = $('#km').value, kv = km === 'n' ? Number($('#kn').value) : Number(km); if (km === 'n' && !(kv > 0)) { e.textContent = 'Isi jumlah menit penguncian tombol kumpulkan.'; return; }
      bt.disabled = true;
      Api.call('ujian.buat', { kumpul: kv, judul: f.judul.value, mapel: f.mapel.value, kelas: kl.join(', '), durasi: f.durasi.value, mulai: tglMs(f.mulai.value, false), selesai: tglMs(f.selesai.value, true), soal: ids }).then(function (r) {
        bt.disabled = false; if (!r.success) { e.textContent = r.message; return; }
        e.textContent = ''; toast('Ujian dibuat'); $('#hs').innerHTML = '<div class="note" style="text-align:center"><div class="xs muted">Token ujian — bagikan ke siswa saat ujian</div><div class="token mono" style="font-size:36px;font-weight:700;letter-spacing:.3em">' + esc(r.data.token) + '</div><button type="button" class="btn p" onclick="App.tab(\'pantau\')">Buka Pantau Ujian</button></div>';
      });
    };
  });
}
function drawSoalPilih() {
  var m = $('#fm').value, q = ($('#fs').value || '').toLowerCase();
  P.vis = m ? P.soal.filter(function (s) { return (s.mapel || 'Umum') === m && (!q || s.t.toLowerCase().indexOf(q) >= 0); }) : [];
  $('#ls').innerHTML = !m ? '<p class="muted" style="padding:14px">Pilih mata pelajaran terlebih dahulu.</p>' : P.vis.length ? '<table><tbody>' + P.vis.map(function (s) { return '<tr><td style="width:36px"><input type="checkbox" style="min-height:0;width:auto" ' + (P.sel[s.id] ? 'checked' : '') + ' onchange="App.pil(\'' + s.id + '\',this.checked)"></td><td>' + esc(s.t) + '</td><td class="sm muted">Kunci ' + esc(s.kunci) + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted" style="padding:14px">Tidak ada soal untuk mata pelajaran ini.</p>';
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
  pc('<h1>Bank Soal</h1><div class="sk" style="margin-top:16px;min-height:220px"></div>'); P.bs = { all: [], sel: {}, page: 1, mapel: '', q: '', vis: [] }; muatSoal(true);
}
function muatSoal(awal) {
  Api.call('soal.semua').then(function (r) {
    if (P.tab !== 'soal') return; if (!r.success) return pc('<h1>Bank Soal</h1><p class="err">' + esc(r.message) + '</p>');
    P.bs.all = r.data; P.bs.sel = {};
    if (awal || !$('#btb')) {
      pc('<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><div style="flex:1;min-width:200px"><h1>Bank Soal</h1><div class="muted sm">Kelola soal per mata pelajaran</div></div><button class="btn" onclick="App.bimp()">⬆ Import Excel/CSV</button><button class="btn" onclick="App.bcsv()">⬇ Unduh CSV</button><button class="btn p" onclick="App.sf(\'\')">+ Tambah soal</button></div>' +
        '<div id="bch" class="tabs" style="margin-bottom:12px"></div><div class="card"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><input id="bq" placeholder="Cari isi soal..." style="max-width:300px"><span id="bba" style="flex:1"></span><span class="sm muted" id="bin"></span></div>' +
        '<div class="tw" id="btb" style="margin-top:12px"></div><div id="bpg" style="display:flex;gap:8px;align-items:center;justify-content:center;margin-top:12px"></div></div>');
      $('#bq').oninput = function () { P.bs.q = this.value; P.bs.page = 1; drawBank(); };
    }
    drawBank();
  });
}
function drawBank() {
  var B = P.bs, q = B.q.toLowerCase(), cnt = {}, tot = B.all.length;
  B.all.forEach(function (s) { cnt[s.mapel] = (cnt[s.mapel] || 0) + 1; });
  var L = B.all.filter(function (s) { return (!B.mapel || s.mapel === B.mapel) && (!q || s.t.toLowerCase().indexOf(q) >= 0); });
  var per = 15, hal = Math.max(1, Math.ceil(L.length / per)); if (B.page > hal) B.page = hal;
  var V0 = L.slice((B.page - 1) * per, B.page * per), ns = Object.keys(B.sel).length; B.vis = V0.map(function (s) { return s.id; });
  $('#bch').innerHTML = '<button class="chip' + (!B.mapel ? ' on' : '') + '" onclick="App.bm(\'\')">Semua (' + tot + ')</button>' + Object.keys(cnt).sort().map(function (m) { return '<button class="chip' + (B.mapel === m ? ' on' : '') + '" data-m="' + esc(m) + '" onclick="App.bm(this.getAttribute(\'data-m\'))">' + esc(m) + ' (' + cnt[m] + ')</button>'; }).join('');
  $('#bba').innerHTML = ns ? '<b>' + ns + ' dipilih</b> <button class="btn sm d" onclick="App.bdelSel()">🗑 Hapus terpilih</button> <button class="btn sm" onclick="App.bclr()">Batal pilih</button>' : '';
  $('#bin').textContent = L.length + ' soal';
  var allSel = V0.length && V0.every(function (s) { return B.sel[s.id]; });
  $('#btb').innerHTML = !tot ? '<div style="text-align:center;padding:36px"><h2>Bank soal masih kosong</h2><p class="muted">Tambah soal satu per satu atau import dari Excel/CSV.</p><button class="btn p" onclick="App.sf(\'\')">+ Tambah soal</button> <button class="btn" onclick="App.bimp()">⬆ Import</button></div>' :
    L.length ? '<table><thead><tr><th style="width:34px"><input type="checkbox" style="width:auto;min-height:0" onchange="App.bselAll(this.checked)"' + (allSel ? ' checked' : '') + '></th><th>No</th><th>Mapel</th><th>Pertanyaan</th><th>Kunci</th><th>Dipakai</th><th></th></tr></thead><tbody>' + V0.map(function (s, i) {
      return '<tr><td><input type="checkbox" style="width:auto;min-height:0" onchange="App.bsel(\'' + s.id + '\',this.checked)"' + (B.sel[s.id] ? ' checked' : '') + '></td><td>' + ((B.page - 1) * per + i + 1) + '</td><td><span class="badge b-info">' + esc(s.mapel) + '</span></td><td><div class="clamp">' + esc(s.t) + '</div></td><td><b>' + esc(s.kunci) + '</b></td>' +
        '<td>' + (s.dipakai ? '<span class="badge ' + (s.terkunci ? 'b-warn' : 'b-ok') + '">' + s.dipakai + ' ujian' + (s.terkunci ? ' 🔒' : '') + '</span>' : '<span class="muted">—</span>') + '</td><td class="right" style="white-space:nowrap"><button class="btn sm" onclick="App.sf(\'' + s.id + '\')">Lihat / Edit</button> <button class="btn sm" style="color:var(--bad)" onclick="App.sdel(\'' + s.id + '\')">Hapus</button></td></tr>';
    }).join('') + '</tbody></table>' : '<p class="muted" style="padding:18px;text-align:center">Tidak ada soal yang cocok.</p>';
  $('#bpg').innerHTML = hal > 1 ? '<button class="btn sm" onclick="App.bpg(-1)"' + (B.page <= 1 ? ' disabled' : '') + '>← Sebelumnya</button><span class="sm">Halaman ' + B.page + ' dari ' + hal + '</span><button class="btn sm" onclick="App.bpg(1)"' + (B.page >= hal ? ' disabled' : '') + '>Berikutnya →</button>' : '';
}
function soalForm(id, dup) {
  var s = id ? P.bs.all.filter(function (x) { return x.id === id; })[0] : null; if (id && !s) return;
  var lock = !!(s && s.terkunci && !dup), M = {}, o = s ? s.o : { A: '', B: '', C: '', D: '', E: '' }; P.bs.all.forEach(function (x) { M[x.mapel] = 1; });
  var m = document.createElement('div'); m.className = 'modal'; m.id = 'md';
  m.innerHTML = '<form class="card" style="max-width:640px;max-height:92vh;overflow:auto"><h2>' + (dup ? 'Duplikat soal' : s ? 'Lihat / Edit soal' : 'Tambah soal') + '</h2>' +
    (lock ? '<div class="note w">Soal ini sudah dipakai ujian yang sudah dikerjakan sehingga tidak dapat diubah. Gunakan <b>Duplikat</b> untuk membuat versi baru.</div>' : '') +
    '<label class="field" style="margin-top:12px"><span>Mata pelajaran *</span><input id="sm" list="dlm" value="' + esc(s ? s.mapel : (P.bs.mapel || '')) + '" required placeholder="mis. Matematika"><datalist id="dlm">' + Object.keys(M).map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist></label>' +
    '<label class="field"><span>Pertanyaan *</span><textarea id="st" rows="4" required>' + esc(s ? s.t : '') + '</textarea></label><div class="field"><span>Pilihan jawaban * <small class="muted">(pilih bulatan untuk menandai kunci)</small></span>' +
    ['A', 'B', 'C', 'D', 'E'].map(function (l) { return '<div class="oprow"><label class="kr"><input type="radio" name="kk" value="' + l + '"' + (s && s.kunci === l ? ' checked' : '') + '><b>' + l + '</b></label><input id="o' + l + '" value="' + esc(o[l]) + '" placeholder="' + (l === 'E' ? 'Opsi E (opsional)' : 'Opsi ' + l) + '"></div>'; }).join('') + '</div>' +
    '<div class="err" id="e"></div><div class="row" style="flex-wrap:wrap">' + (s && !dup ? '<button type="button" class="btn" onclick="document.getElementById(\'md\').remove();App.sf(\'' + s.id + '\',1)">Duplikat</button>' : '') + '<span style="flex:1"></span><button type="button" class="btn" onclick="document.getElementById(\'md\').remove()">Tutup</button>' +
    (!s || dup ? '<button type="button" class="btn" id="sv2">Simpan &amp; tambah lagi</button>' : '') + (lock ? '' : '<button class="btn p" id="sv">Simpan</button>') + '</div></form>';
  document.body.appendChild(m);
  if (lock) Array.prototype.forEach.call(m.querySelectorAll('input,textarea'), function (e) { e.disabled = true; });
  var kirim = function (lagi) {
    var k = m.querySelector('input[name=kk]:checked'), body = { id: s && !dup ? s.id : '', mapel: $('#sm').value, t: $('#st').value, kunci: k ? k.value : '', o: {} };
    ['A', 'B', 'C', 'D', 'E'].forEach(function (l) { body.o[l] = $('#o' + l).value; });
    Api.call('soal.simpan', body).then(function (r) {
      if (!r.success) { $('#e').textContent = r.message; return; }
      toast('Soal disimpan'); muatSoal();
      if (lagi) { ['st', 'oA', 'oB', 'oC', 'oD', 'oE'].forEach(function (i) { $('#' + i).value = ''; }); var kk = m.querySelector('input[name=kk]:checked'); if (kk) kk.checked = false; $('#e').textContent = ''; $('#st').focus(); } else m.remove();
    });
  };
  m.querySelector('form').onsubmit = function (ev) { ev.preventDefault(); kirim(false); };
  if ($('#sv2')) $('#sv2').onclick = function () { kirim(true); };
}
function soalHapus(ids, ket) {
  dlg('Hapus soal?', '<p>' + ket + '</p><p class="muted">Soal dihapus permanen dari bank soal. Soal yang sedang dipakai ujian tidak dapat dihapus.</p>', 'Ya, Hapus', function (close, btn) {
    Api.call('soal.hapus', { ids: ids }).then(function (r) {
      if (!r.success) { btn.disabled = false; toast(r.message, 'error'); return; }
      close(); var d = r.data; toast(d.dihapus + ' soal dihapus' + (d.ditolak.length ? ', ' + d.ditolak.length + ' ditolak (' + d.ditolak[0].alasan + ')' : ''), d.ditolak.length ? 'warn' : ''); muatSoal();
    });
  }, true);
}
function impSoal() {
  var m = document.createElement('div'); m.className = 'modal'; m.id = 'md';
  m.innerHTML = '<div class="card" style="max-width:600px;max-height:92vh;overflow:auto"><h2>Import soal dari Excel / CSV</h2><p class="muted sm">Kolom: Mapel, Pertanyaan, A, B, C, D, E (opsional), Kunci (huruf A–E). Mapel kosong dianggap "Umum".</p>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><input type="file" id="fi" accept=".csv,.xlsx,.xls" style="flex:1;min-width:200px"><button class="btn" onclick="App.tmplSoal()">Unduh template</button></div><div id="pv" class="muted sm" style="margin:10px 0"></div>' +
    '<div style="display:flex;gap:8px"><button class="btn" id="b1" disabled>Pindai (dry-run)</button><button class="btn p" id="b2" disabled>Jalankan Import</button></div><div id="rs"></div><div class="row"><button class="btn" onclick="document.getElementById(\'md\').remove()">Tutup</button></div></div>';
  document.body.appendChild(m); var rows = [];
  $('#fi').onchange = function () { var f = this.files[0]; if (!f) return; bacaFile(f).then(function (r) { rows = r; $('#pv').textContent = rows.length + ' baris terbaca dari ' + f.name; $('#b1').disabled = $('#b2').disabled = !rows.length; }, function (e) { toast(e.message, 'error'); }); };
  var run = function (dry) { return function () { kirimBatch('soal.import', rows, { dryRun: dry }, 200).then(function (r) { $('#rs').innerHTML = hasilImp(r, dry); if (!dry) { toast('Soal berhasil diimpor'); muatSoal(); } }, function (e) { toast(e.message, 'error'); }); }; };
  $('#b1').onclick = run(true); $('#b2').onclick = function () { if (confirm('Import ' + rows.length + ' baris ke bank soal?')) run(false)(); };
}
function tSiswa() {
  pc('<h1>Kelola Siswa</h1><div class="card" style="margin-top:16px"><h3>Import data siswa dari Excel / CSV</h3><p class="muted sm">Kolom: NIS, Nama, Kelas. Di Excel, format kolom NIS sebagai <b>Teks</b> agar angka 0 di depan tidak hilang. Aman diulang: NIS yang sama hanya diperbarui, tidak digandakan.</p>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><input type="file" id="fi" accept=".csv,.xlsx,.xls" style="flex:1;min-width:220px"><button class="btn" onclick="App.tmplSiswa()">Unduh template</button></div><div id="pv" class="muted sm" style="margin:10px 0"></div>' +
    '<div style="display:flex;gap:8px"><button class="btn" id="b1" disabled>Pindai (dry-run)</button><button class="btn p" id="b2" disabled>Jalankan Import</button></div><div id="rs"></div></div><div class="card" style="margin-top:16px" id="sl"><div class="sk"></div></div>');
  var rows = [];
  $('#fi').onchange = function () { var f = this.files[0]; if (!f) return; bacaFile(f).then(function (r) { rows = r; $('#pv').textContent = rows.length + ' baris terbaca dari ' + f.name; $('#b1').disabled = $('#b2').disabled = !rows.length; }, function (e) { toast(e.message, 'error'); }); };
  var run = function (dry) { return function () { kirimBatch('siswa.import', rows, { dryRun: dry }, 60).then(function (r) {
    $('#rs').innerHTML = hasilImp(r, dry) + (r.akunBaru.length ? '<div class="note w"><b>Simpan sekarang!</b> Password awal siswa baru hanya tampil sekali dan tidak dapat dilihat lagi.<br><button class="btn a" style="margin-top:8px" id="dl">Unduh daftar akun (CSV)</button></div>' : '');
    if (!dry) listSiswa();
    var d = $('#dl'); if (d) d.onclick = function () { unduh('akun-siswa-baru.csv', [['NIS', 'Nama', 'Kelas', 'Password']].concat(r.akunBaru.map(function (a) { return [a.NIS, a.Nama, a.Kelas, a.Password]; }))); };
  }, function (e) { toast(e.message, 'error'); }); }; };
  $('#b1').onclick = run(true); $('#b2').onclick = function () { if (confirm('Import ' + rows.length + ' siswa?')) run(false)(); };
  listSiswa();
}
function listSiswa() {
  Api.call('siswa.list').then(function (r) {
    var el = $('#sl'); if (!el) return;
    if (!r.success) { el.innerHTML = '<p class="err">' + esc(r.message) + '</p>'; return; }
    P.sw = r.data; drawSiswa();
  });
}
function drawSiswa() {
  var el = $('#sl'); if (!el) return; var q = (P.sq || '').toLowerCase(), k = P.sk || '', kl = {};
  P.sw.forEach(function (s) { kl[s.kelas] = 1; });
  var L = P.sw.filter(function (s) { return (!k || s.kelas === k) && (!q || (s.nis + ' ' + s.nama).toLowerCase().indexOf(q) >= 0); });
  el.innerHTML = '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><h3>Daftar siswa <span class="badge b-info">' + P.sw.length + '</span></h3><span style="flex:1"></span><button class="btn p sm" onclick="App.sForm(\'\')">+ Tambah siswa</button><button class="btn sm" onclick="App.kartu()">🖨 Cetak kartu ujian</button><input id="sq" placeholder="Cari NIS / nama..." value="' + esc(P.sq || '') + '" style="max-width:230px">' +
    '<select id="sk" style="max-width:180px"><option value="">Semua kelas</option>' + Object.keys(kl).sort().map(function (x) { return '<option' + (k === x ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></div>' +
    '<p class="muted sm">Password tersimpan sebagai hash sehingga <b>tidak dapat dilihat</b>. Admin dapat menetapkan password baru secara manual (atau acak) lewat tombol Password.</p>' +
    '<div class="tw"><table><thead><tr><th>NIS</th><th>Nama</th><th>Kelas</th><th>Status</th><th></th></tr></thead><tbody>' +
    L.slice(0, 200).map(function (s) { return '<tr><td class="mono">' + esc(s.nis) + '</td><td>' + esc(s.nama) + '</td><td>' + esc(s.kelas) + '</td><td><span class="badge ' + (s.status === 'aktif' ? 'b-ok' : 'b-mut') + '">' + esc(s.status) + '</span></td><td class="right" style="white-space:nowrap"><button class="btn sm" onclick="App.sForm(\'' + esc(s.nis) + '\')">Edit</button> <button class="btn sm" onclick="App.pwSiswa(\'' + esc(s.nis) + '\')">Password</button> <button class="btn sm" style="color:var(--bad)" onclick="App.sHapus(\'' + esc(s.nis) + '\')">Hapus</button></td></tr>'; }).join('') +
    '</tbody></table></div>' + (L.length > 200 ? '<p class="muted sm">Menampilkan 200 dari ' + L.length + ' — gunakan pencarian.</p>' : L.length ? '' : '<p class="muted">Tidak ada siswa.</p>');
  $('#sq').oninput = function () { P.sq = this.value; var p = this.selectionStart; drawSiswa(); var e = $('#sq'); e.focus(); e.setSelectionRange(p, p); };
  $('#sk').onchange = function () { P.sk = this.value; drawSiswa(); };
}
function kartu() { // reset password massal sesuai filter + cetak kartu peserta
  var q = (P.sq || '').toLowerCase(), k = P.sk || '';
  var L = P.sw.filter(function (s) { return s.status === 'aktif' && (!k || s.kelas === k) && (!q || (s.nis + ' ' + s.nama).toLowerCase().indexOf(q) >= 0); });
  if (!L.length) { toast('Tidak ada siswa aktif pada filter saat ini', 'warn'); return; }
  dlg('Cetak kartu ujian', '<p>Kartu dibuat untuk <b>' + L.length + ' siswa</b> ' + (k ? 'kelas <b>' + esc(k) + '</b>' : 'dari <b>semua kelas</b>') + (q ? ' (sesuai pencarian)' : '') + '.</p>' +
    '<div class="note w"><b>Perhatian:</b> password siswa tidak dapat dilihat, jadi setiap kartu memuat <b>password baru</b>. Password lama siswa-siswa ini langsung <b>tidak berlaku</b>. Pastikan kartu dicetak dan dibagikan.</div>', 'Buat & Cetak Kartu', function (close, btn) {
    var nis = L.map(function (s) { return s.nis; }), out = [], i = 0; btn.textContent = 'Membuat kartu...'; busy(true);
    (function next() {
      if (i >= nis.length) { busy(false); close(); tampilKartu(out); return; }
      Api.call('siswa.kartu', { nis: nis.slice(i, i + 40) }).then(function (r) {
        if (!r.success) { busy(false); close(); toast(r.message + (out.length ? ' Kartu yang sudah dibuat tetap ditampilkan.' : ''), 'error'); if (out.length) tampilKartu(out); return; }
        out = out.concat(r.data); i += 40; next();
      });
    })();
  });
}
function tampilKartu(L) {
  L.sort(function (a, b) { return (a.kelas + a.nama).localeCompare(b.kelas + b.nama); });
  var base = location.href.replace(/[?#].*$/, '').replace(/[^\/]*$/, ''), pages = '';
  for (var i = 0; i < L.length; i += 10) pages += '<div class="halaman">' + L.slice(i, i + 10).map(function (s) {
    return '<div class="kartu"><div class="kh"><b>KARTU PESERTA UJIAN</b><span>' + esc(CFG.NAMA_SEKOLAH) + '</span></div><table><tr><td>Nama</td><td><b>' + esc(s.nama) + '</b></td></tr><tr><td>NIS</td><td><b>' + esc(s.nis) + '</b></td></tr><tr><td>Kelas</td><td>' + esc(s.kelas) + '</td></tr><tr><td>Password</td><td class="pw">' + esc(s.password) + '</td></tr></table>' +
      '<div class="kf">Login: ' + esc(base) + '<br>Jaga kerahasiaan password. Token ujian diberikan oleh pengawas.</div></div>';
  }).join('') + '</div>';
  var o = document.createElement('div'); o.id = 'kartu';
  o.innerHTML = '<div class="ktool"><b>' + L.length + ' kartu siap cetak</b><span class="muted sm">A4 · 10 kartu per halaman · potong di garis putus-putus</span><span style="flex:1"></span><button class="btn p" onclick="window.print()">🖨 Cetak</button><button class="btn" onclick="document.getElementById(\'kartu\').remove()">Tutup</button></div>' + pages;
  document.body.appendChild(o);
}
function sForm(nis) {
  var s = nis ? P.sw.filter(function (x) { return x.nis === nis; })[0] : null, kl = {}; P.sw.forEach(function (x) { kl[x.kelas] = 1; });
  var m = document.createElement('div'); m.className = 'modal'; m.id = 'md';
  m.innerHTML = '<form class="card"><h2>' + (s ? 'Edit siswa' : 'Tambah siswa') + '</h2><div style="margin-top:12px"><label class="field"><span>NIS *</span><input id="fn" value="' + esc(s ? s.nis : '') + '"' + (s ? ' disabled' : '') + ' required></label>' +
    '<label class="field"><span>Nama lengkap *</span><input id="fa" value="' + esc(s ? s.nama : '') + '" required></label><label class="field"><span>Kelas *</span><input id="fk" list="dlk" value="' + esc(s ? s.kelas : '') + '" required><datalist id="dlk">' + Object.keys(kl).map(function (k) { return '<option value="' + esc(k) + '">'; }).join('') + '</datalist></label>' +
    (s ? '<label class="field"><span>Status</span><select id="fst"><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif (tidak bisa login)</option></select></label>' : '') +
    '<label class="field"><span>Password ' + (s ? '(kosongkan jika tidak diubah)' : '(kosongkan = dibuat acak)') + '</span><input id="fp" autocomplete="off" placeholder="min. 6 karakter"></label></div><div class="err" id="e"></div><div id="hs"></div>' +
    '<div class="row"><button type="button" class="btn" onclick="document.getElementById(\'md\').remove()">Tutup</button><button class="btn p" id="sv">Simpan</button></div></form>';
  document.body.appendChild(m); if (s) $('#fst').value = s.status; $(s ? '#fa' : '#fn').focus();
  m.querySelector('form').onsubmit = function (ev) {
    ev.preventDefault(); var b = $('#sv'); b.disabled = true;
    Api.call('siswa.simpan', { baru: !s, nis: $('#fn').value, nama: $('#fa').value, kelas: $('#fk').value, status: s ? $('#fst').value : 'aktif', password: $('#fp').value }).then(function (r) {
      if (!r.success) { b.disabled = false; $('#e').textContent = r.message; return; }
      $('#e').textContent = ''; listSiswa(); toast('Data siswa disimpan');
      if (r.data && r.data.password) { $('#hs').innerHTML = '<div class="note w"><b>Password (catat sekarang, hanya tampil sekali):</b><br><span class="mono" style="font-size:20px;letter-spacing:.08em">' + esc(r.data.password) + '</span></div>'; if (!s) b.disabled = true; else b.disabled = false; }
      else m.remove();
    });
  };
}
function sHapus(nis) {
  var s = P.sw.filter(function (x) { return x.nis === nis; })[0]; if (!s) return;
  dlg('Hapus siswa?', '<p><b>' + esc(s.nama) + '</b> · NIS ' + esc(s.nis) + ' · ' + esc(s.kelas) + '</p><p class="muted">Akun dihapus permanen dan tidak muncul lagi di pantau maupun laporan. Untuk menonaktifkan sementara, gunakan <b>Edit → Status</b>.</p>', 'Ya, Hapus', function (close, btn) {
    Api.call('siswa.hapus', { nis: nis }).then(function (r) { if (!r.success) { btn.disabled = false; toast(r.message, 'error'); return; } close(); toast('Siswa dihapus'); listSiswa(); });
  }, true);
}
function pwSiswa(nis) {
  var s = P.sw.filter(function (x) { return x.nis === nis; })[0]; if (!s) return;
  var m = document.createElement('div'); m.className = 'modal'; m.id = 'md';
  m.innerHTML = '<form class="card"><h2>Ubah password siswa</h2><p class="muted">' + esc(s.nama) + ' · NIS ' + esc(s.nis) + ' · ' + esc(s.kelas) + '</p><label class="field"><span>Password baru</span><input id="np" placeholder="Kosongkan untuk dibuat acak" autocomplete="off"></label><div class="err" id="e"></div><div id="hs"></div>' +
    '<div class="row"><button type="button" class="btn" onclick="document.getElementById(\'md\').remove()">Tutup</button><button class="btn p" id="sv">Simpan</button></div></form>';
  document.body.appendChild(m); $('#np').focus();
  m.querySelector('form').onsubmit = function (ev) {
    ev.preventDefault(); var b = $('#sv'); b.disabled = true;
    Api.call('siswa.password', { nis: nis, password: $('#np').value.trim() }).then(function (r) {
      b.disabled = false; if (!r.success) { $('#e').textContent = r.message; return; }
      $('#e').textContent = ''; $('#np').value = ''; toast('Password diubah');
      $('#hs').innerHTML = '<div class="note w"><b>Password baru (catat sekarang, hanya tampil sekali):</b><br><span class="mono" style="font-size:20px;letter-spacing:.08em">' + esc(r.data.password) + '</span></div>';
    });
  };
}
function tGuru() {
  pc('<h1>Kelola Guru</h1><div class="sk" style="margin-top:16px;min-height:200px"></div>'); P.gq = ''; muatGuru(true);
}
function muatGuru(awal) {
  Api.call('guru.list').then(function (r) {
    if (P.tab !== 'guru') return; if (!r.success) return pc('<h1>Kelola Guru</h1><p class="err">' + esc(r.message) + '</p>');
    P.gr = r.data;
    if (awal || !$('#gtb')) {
      pc('<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><div style="flex:1;min-width:200px"><h1>Kelola Guru</h1><div class="muted sm">Akun guru, status aktif, dan password</div></div><button class="btn p" onclick="App.gf(\'\')">+ Tambah guru</button></div>' +
        '<div class="grid g4" id="gk" style="margin-top:16px"></div><div class="card" style="margin-top:16px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><input id="gq" placeholder="Cari nama / username..." style="max-width:280px"><span class="sm muted" id="gin" style="flex:1;text-align:right"></span></div><div class="tw" id="gtb" style="margin-top:12px"></div></div>');
      $('#gq').oninput = function () { P.gq = this.value; drawGuru(); };
    }
    drawGuru();
  });
}
function drawGuru() {
  var L = P.gr, q = (P.gq || '').toLowerCase(), ak = L.filter(function (x) { return x.status === 'aktif'; }).length, tu = L.reduce(function (s, x) { return s + x.ujian; }, 0);
  var kp = function (t, v, s, c) { return '<div class="card stat" style="border-left:4px solid ' + c + '"><span class="xs muted">' + t + '</span><b>' + v + '</b><span class="sm muted">' + s + '</span></div>'; };
  $('#gk').innerHTML = kp('Total guru', L.length, 'akun terdaftar', '#1E3A5F') + kp('Aktif', ak, 'dapat login', '#16A34A') + kp('Nonaktif', L.length - ak, 'akses ditutup', '#6B7280') + kp('Ujian dibuat', tu, 'oleh seluruh guru', '#3B82F6');
  var F = L.filter(function (x) { return !q || (x.nama + ' ' + x.username).toLowerCase().indexOf(q) >= 0; });
  $('#gin').textContent = F.length + ' guru';
  $('#gtb').innerHTML = !L.length ? '<div style="text-align:center;padding:30px"><h2>Belum ada guru</h2><p class="muted">Tambahkan akun guru agar bisa membuat soal dan ujian.</p><button class="btn p" onclick="App.gf(\'\')">+ Tambah guru</button></div>' :
    F.length ? '<table><thead><tr><th>Guru</th><th>Username</th><th>Status</th><th>Soal</th><th>Ujian</th><th></th></tr></thead><tbody>' + F.map(function (x) {
      return '<tr><td><div style="display:flex;gap:10px;align-items:center"><span class="me" style="padding:0;border:0;background:none"><i>' + esc(x.nama.charAt(0).toUpperCase()) + '</i></span><b>' + esc(x.nama) + '</b></div></td><td class="mono">' + esc(x.username) + '</td><td><span class="badge ' + (x.status === 'aktif' ? 'b-ok' : 'b-mut') + '">' + esc(x.status) + '</span></td><td>' + x.soal + '</td><td>' + x.ujian + '</td>' +
        '<td class="right" style="white-space:nowrap"><button class="btn sm" onclick="App.gf(\'' + x.id + '\')">Edit</button> <button class="btn sm" onclick="App.gpw(\'' + x.id + '\')">Password</button> <button class="btn sm" style="color:var(--bad)" onclick="App.ghapus(\'' + x.id + '\')">Hapus</button></td></tr>';
    }).join('') + '</tbody></table>' : '<p class="muted" style="padding:16px;text-align:center">Tidak ada guru yang cocok.</p>';
}
function guruForm(id) {
  var g = id ? P.gr.filter(function (x) { return x.id === id; })[0] : null; if (id && !g) return;
  var m = document.createElement('div'); m.className = 'modal'; m.id = 'md';
  m.innerHTML = '<form class="card"><h2>' + (g ? 'Edit guru' : 'Tambah guru') + '</h2><div style="margin-top:12px"><label class="field"><span>Nama lengkap *</span><input id="gn" value="' + esc(g ? g.nama : '') + '" required></label>' +
    '<label class="field"><span>Username *' + (g ? '' : ' <small class="muted">(huruf kecil/angka, 3–30)</small>') + '</span><input id="gu" value="' + esc(g ? g.username : '') + '"' + (g ? ' disabled' : '') + ' required></label>' +
    (g ? '<label class="field"><span>Status</span><select id="gs"><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif (langsung tidak bisa masuk)</option></select></label>' : '<label class="field"><span>Password <small class="muted">(kosongkan = dibuat acak; min. 8, huruf + angka)</small></span><input id="gp" autocomplete="off"></label>') +
    '</div><div class="err" id="e"></div><div id="hs"></div><div class="row"><button type="button" class="btn" onclick="document.getElementById(\'md\').remove()">Tutup</button><button class="btn p" id="sv">Simpan</button></div></form>';
  document.body.appendChild(m); if (g) $('#gs').value = g.status; $('#gn').focus();
  m.querySelector('form').onsubmit = function (ev) {
    ev.preventDefault(); var b = $('#sv'); b.disabled = true;
    var req = g ? Api.call('guru.simpan', { id: g.id, nama: $('#gn').value, status: $('#gs').value }) : Api.call('guru.tambah', { nama: $('#gn').value, username: $('#gu').value, password: $('#gp').value });
    req.then(function (r) {
      if (!r.success) { b.disabled = false; $('#e').textContent = r.message; return; }
      toast('Data guru disimpan'); muatGuru();
      if (g) m.remove(); else $('#hs').innerHTML = '<div class="note w"><b>Catat sekarang — password hanya tampil sekali:</b><br>Username: <b class="mono">' + esc(r.data.username) + '</b><br>Password: <b class="mono" style="font-size:18px">' + esc(r.data.password) + '</b></div>';
    });
  };
}
function guruPw(id) {
  var g = P.gr.filter(function (x) { return x.id === id; })[0]; if (!g) return;
  var m = document.createElement('div'); m.className = 'modal'; m.id = 'md';
  m.innerHTML = '<form class="card"><h2>Ubah password guru</h2><p class="muted">' + esc(g.nama) + ' · ' + esc(g.username) + '</p><label class="field" style="margin-top:12px"><span>Password baru <small class="muted">(kosongkan = acak; min. 8, huruf + angka)</small></span><input id="np" autocomplete="off"></label><div class="err" id="e"></div><div id="hs"></div>' +
    '<div class="row"><button type="button" class="btn" onclick="document.getElementById(\'md\').remove()">Tutup</button><button class="btn p" id="sv">Simpan</button></div></form>';
  document.body.appendChild(m); $('#np').focus();
  m.querySelector('form').onsubmit = function (ev) {
    ev.preventDefault(); var b = $('#sv'); b.disabled = true;
    Api.call('guru.password', { id: g.id, password: $('#np').value.trim() }).then(function (r) {
      b.disabled = false; if (!r.success) { $('#e').textContent = r.message; return; }
      $('#e').textContent = ''; $('#np').value = ''; toast('Password diubah');
      $('#hs').innerHTML = '<div class="note w"><b>Password baru (catat sekarang, hanya tampil sekali):</b><br><span class="mono" style="font-size:20px;letter-spacing:.06em">' + esc(r.data.password) + '</span></div>';
    });
  };
}
function guruHapus(id) {
  var g = P.gr.filter(function (x) { return x.id === id; })[0]; if (!g) return;
  dlg('Hapus guru?', '<p><b>' + esc(g.nama) + '</b> · ' + esc(g.username) + '</p><p class="muted">Akun dihapus permanen. Guru yang masih memiliki soal atau ujian tidak dapat dihapus; gunakan <b>Edit → Nonaktif</b> untuk menutup aksesnya.</p>', 'Ya, Hapus', function (close, btn) {
    Api.call('guru.hapus', { id: id }).then(function (r) { if (!r.success) { btn.disabled = false; toast(r.message, 'error'); return; } close(); toast('Guru dihapus'); muatGuru(); });
  }, true);
}
function histSvg(h) {
  var mx = Math.max.apply(null, h.concat([1])), lab = ['< 60', '60–69', '70–79', '80–89', '90–100'], col = ['#EF4444', '#F59E0B', '#EAB308', '#3B82F6', '#16A34A'];
  return '<svg viewBox="0 0 400 200" style="width:100%;height:auto" role="img" aria-label="Distribusi nilai">' + h.map(function (v, i) {
    var hh = Math.round(v / mx * 130), x = 20 + i * 76;
    return '<rect x="' + x + '" y="' + (150 - hh) + '" width="56" height="' + hh + '" rx="6" fill="' + col[i] + '"/><text x="' + (x + 28) + '" y="' + (144 - hh) + '" text-anchor="middle" font-size="13" font-weight="700" style="fill:var(--text)">' + v + '</text><text x="' + (x + 28) + '" y="174" text-anchor="middle" font-size="12" style="fill:var(--muted)">' + lab[i] + '</text>';
  }).join('') + '<line x1="10" y1="150" x2="390" y2="150" style="stroke:var(--line)"/></svg>';
}
function lm(h) { var e = $('#lm'); if (e) e.innerHTML = h; }
function tLaporan() {
  P.lmode = P.lmode || 'ujian';
  pc('<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><div style="flex:1;min-width:200px"><h1>Laporan</h1><div class="muted sm">Laporan hasil ujian dan rekap nilai</div></div>' +
    '<button class="chip' + (P.lmode === 'ujian' ? ' on' : '') + '" onclick="App.lmode(\'ujian\')">📄 Laporan Ujian</button><button class="chip' + (P.lmode === 'rekap' ? ' on' : '') + '" onclick="App.lmode(\'rekap\')">📊 Rekap Nilai</button></div><div id="lm" style="margin-top:16px"></div>');
  if (P.lmode === 'rekap') tRekap(); else lapUjian();
}
function lapUjian() {
  lm('<div class="sk" style="min-height:160px"></div>');
  Api.call('ujian.guru').then(function (r) {
    if (P.tab !== 'laporan' || P.lmode !== 'ujian') return; if (!r.success) return lm('<p class="err">' + esc(r.message) + '</p>');
    if (!r.data.length) return lm('<div class="card" style="margin-top:16px;text-align:center;padding:40px"><h2>Belum ada ujian</h2><p class="muted">Laporan muncul setelah ujian dibuat dan dikerjakan.</p></div>');
    var n = Date.now(), kkm = Number(load('cbt_kkm')) || 75; P.kkm = kkm; P.lk = ''; P.lq = ''; P.lap = null; P.lsub = P.lsub || 'rekap';
    lm('<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:flex-end">' +
      '<label class="sm" style="display:flex;gap:8px;align-items:center">KKM <input id="kkm" type="number" min="0" max="100" value="' + kkm + '" style="width:80px"></label>' +
      '<select id="lu" style="max-width:400px"><option value="">— pilih ujian —</option>' + r.data.map(function (u) { var b = n >= u.mulai && n <= u.selesai ? '● ' : n < u.mulai ? '◷ ' : '✓ '; return '<option value="' + u.id + '">' + b + esc(u.judul) + ' (' + esc(u.kelas) + ')</option>'; }).join('') + '</select></div>' +
      '<div id="lp" style="margin-top:16px"><div class="card muted" style="text-align:center;padding:36px">Pilih ujian untuk melihat laporan.</div></div>');
    $('#lu').onchange = function () {
      var id = this.value; if (!id) return; $('#lp').innerHTML = '<div class="sk" style="min-height:200px"></div>'; busy(true);
      Api.call('laporan.ujian', { idUjian: id }).then(function (r) { busy(false); if (P.tab !== 'laporan') return; if (!r.success) { $('#lp').innerHTML = '<p class="err">' + esc(r.message) + '</p>'; return; } P.lap = r.data; P.lk = ''; P.lq = ''; drawLap(); });
    };
    $('#kkm').oninput = function () { P.kkm = Math.max(0, Math.min(100, Number(this.value) || 0)); save('cbt_kkm', P.kkm); if (P.lap) drawLap(); };
    $('#lu').value = r.data[0].id; $('#lu').onchange.call($('#lu'));
  });
}
/* ---------- REKAP NILAI GABUNGAN + CETAK ---------- */
function tRekap() {
  lm('<div class="sk" style="min-height:200px"></div>'); P.rk = P.rk || { kelas: '', mapel: '', q: '' }; P.kkm = P.kkm || Number(load('cbt_kkm')) || 75; muatRekap(true);
}
function muatRekap(awal) {
  busy(true);
  Api.call('laporan.rekap', { kelas: P.rk.kelas, mapel: P.rk.mapel }).then(function (r) {
    busy(false); if (P.tab !== 'laporan' || P.lmode !== 'rekap') return;
    if (!r.success) { lm('<p class="err">' + esc(r.message) + '</p>'); return; }
    P.rd = r.data;
    if (awal || !$('#rkp')) {
      lm('<div class="card" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><select id="rm" onchange="App.rkf(\'mapel\',this.value)" style="max-width:240px"></select><select id="rkl" onchange="App.rkf(\'kelas\',this.value)" style="max-width:180px"></select>' +
        '<label class="sm" style="display:flex;gap:8px;align-items:center">KKM <input id="rkkm" type="number" min="0" max="100" value="' + P.kkm + '" style="width:80px"></label><input id="rq" placeholder="Cari nama / NIS..." value="' + esc(P.rk.q) + '" style="max-width:220px"><span style="flex:1"></span>' +
        '<button class="btn" onclick="App.unduhRekap()">⬇ Unduh CSV (Excel)</button><button class="btn p" onclick="App.cetakRekap()">🖨 Cetak Rekap</button></div><div id="rkp" style="margin-top:12px"></div>');
      $('#rkkm').oninput = function () { P.kkm = Math.max(0, Math.min(100, Number(this.value) || 0)); save('cbt_kkm', P.kkm); drawRekap(); };
      $('#rq').oninput = function () { P.rk.q = this.value; drawRekap(); };
    }
    drawRekap();
  });
}
function rf1(x) { return x == null ? '—' : String(Math.round(x * 10) / 10); }
function rekapHitung() {
  var d = P.rd, q = (P.rk.q || '').toLowerCase(), sum = function (v) { return v.reduce(function (a, b) { return a + b; }, 0); };
  var rows = d.siswa.map(function (s) { var v = []; d.ujian.forEach(function (u) { if (s.n[u.id] != null) v.push(s.n[u.id]); }); return { s: s, n: v.length, avg: v.length ? sum(v) / v.length : null }; }), rk = {};
  rows.filter(function (r) { return r.avg != null; }).sort(function (a, b) { return b.avg - a.avg; }).forEach(function (r, i, arr) { rk[r.s.nis] = i && r.avg === arr[i - 1].avg ? rk[arr[i - 1].s.nis] : i + 1; });
  var col = d.ujian.map(function (u) { var v = []; rows.forEach(function (r) { if (r.s.n[u.id] != null) v.push(r.s.n[u.id]); }); return v.length ? sum(v) / v.length : null; });
  return { rows: rows, F: rows.filter(function (r) { return !q || (r.s.nis + ' ' + r.s.nama).toLowerCase().indexOf(q) >= 0; }), rk: rk, col: col };
}
function rekapTabel(h, cetak) {
  var d = P.rd, kkm = P.kkm, tg = function (ms) { return new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' }); };
  if (!h.F.length) return '<p class="muted" style="padding:16px;text-align:center">Tidak ada data. Pastikan ada ujian dan siswa pada filter ini.</p>';
  var cell = function (x) { if (x === undefined) return '<td class="muted" style="text-align:center">·</td>'; if (x === null) return '<td style="text-align:center">—</td>'; return '<td style="text-align:center">' + (cetak ? (x < kkm ? '<b class="bawah">' + rf1(x) + '</b>' : rf1(x)) : '<span class="badge ' + (x >= kkm ? 'b-ok' : 'b-bad') + '">' + rf1(x) + '</span>') + '</td>'; };
  return '<table class="tb"><thead><tr><th>No</th><th>NIS</th><th>Nama</th><th>Kelas</th>' + d.ujian.map(function (u) { return '<th style="text-align:center;min-width:84px">' + esc(u.judul) + '<br><small>' + esc(u.mapel || '') + ' · ' + tg(u.mulai) + '</small></th>'; }).join('') + '<th>Rata-rata</th><th>Ket.</th><th>#</th></tr></thead><tbody>' +
    h.F.map(function (r, i) {
      return '<tr><td>' + (i + 1) + '</td><td class="mono">' + esc(r.s.nis) + '</td><td>' + esc(r.s.nama) + '</td><td>' + esc(r.s.kelas) + '</td>' + d.ujian.map(function (u) { return cell(r.s.n[u.id]); }).join('') +
        '<td style="text-align:center"><b>' + rf1(r.avg) + '</b></td><td>' + (r.avg == null ? '—' : r.avg >= kkm ? 'Tuntas' : 'Remedial') + '</td><td style="text-align:center">' + (h.rk[r.s.nis] || '—') + '</td></tr>';
    }).join('') + '<tr><td colspan="4" style="text-align:right"><b>Rata-rata per ujian</b></td>' + h.col.map(function (x) { return '<td style="text-align:center"><b>' + rf1(x) + '</b></td>'; }).join('') + '<td colspan="3"></td></tr></tbody></table>';
}
function drawRekap() {
  var d = P.rd, h = rekapHitung(), avs = h.rows.filter(function (r) { return r.avg != null; }), kkm = P.kkm; P.rh = h;
  $('#rm').innerHTML = '<option value="">Semua mata pelajaran</option>' + d.mapel.map(function (m) { return '<option' + (P.rk.mapel === m ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('');
  $('#rkl').innerHTML = '<option value="">Semua kelas</option>' + d.kelas.map(function (k) { return '<option' + (P.rk.kelas === k ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('');
  var kp = function (t, v, s, c) { return '<div class="card stat" style="border-left:4px solid ' + c + '"><span class="xs muted">' + t + '</span><b>' + v + '</b><span class="sm muted">' + s + '</span></div>'; };
  $('#rkp').innerHTML = '<div class="grid g4">' + kp('Ujian', d.ujian.length, 'pada filter ini', '#1E3A5F') + kp('Siswa', h.rows.length, 'terdaftar sebagai peserta', '#3B82F6') +
    kp('Rata-rata keseluruhan', avs.length ? rf1(avs.reduce(function (a, r) { return a + r.avg; }, 0) / avs.length) : '—', 'rata-rata dari rata-rata siswa', '#16A34A') + kp('Perlu remedial', avs.filter(function (r) { return r.avg < kkm; }).length, 'rata-rata di bawah KKM ' + kkm, '#DC2626') + '</div>' +
    '<div class="card" style="margin-top:12px"><div class="sm muted" style="margin-bottom:8px">Keterangan: <b>—</b> belum mengerjakan · <b>·</b> bukan peserta ujian tersebut · nilai merah di bawah KKM.</div><div class="tw">' + rekapTabel(h, false) + '</div></div>';
}
function csvRekap() {
  var d = P.rd, h = P.rh, kkm = P.kkm, H = ['No', 'NIS', 'Nama', 'Kelas'].concat(d.ujian.map(function (u) { return u.judul + (u.mapel ? ' (' + u.mapel + ')' : ''); }), ['Rata-rata', 'Keterangan', 'Peringkat']);
  return [H].concat(h.F.map(function (r, i) { return [i + 1, r.s.nis, r.s.nama, r.s.kelas].concat(d.ujian.map(function (u) { var x = r.s.n[u.id]; return x === undefined ? '' : x === null ? '-' : x; }), [r.avg == null ? '' : Math.round(r.avg * 10) / 10, r.avg == null ? '' : r.avg >= kkm ? 'Tuntas' : 'Remedial', h.rk[r.s.nis] || '']); }));
}
function tampilCetak(html, land) {
  var o = $('#cetak'); if (o) o.remove(); o = document.createElement('div'); o.id = 'cetak';
  o.innerHTML = '<div class="ktool"><b>Pratinjau cetak</b><span class="muted sm">' + (land ? 'A4 lanskap' : 'A4 potret') + ' · pilih "Simpan sebagai PDF" pada dialog cetak untuk membuat berkas</span><span style="flex:1"></span><button class="btn p" onclick="window.print()">🖨 Cetak / Simpan PDF</button><button class="btn" onclick="document.getElementById(\'cetak\').remove()">Tutup</button></div><div class="lembar' + (land ? ' land' : '') + '">' + html + '</div>';
  document.body.appendChild(o);
}
function kopHtml(judul) { return '<div class="kopx"><b>' + esc(CFG.NAMA_SEKOLAH) + '</b>' + (CFG.ALAMAT_SEKOLAH ? '<div>' + esc(CFG.ALAMAT_SEKOLAH) + '</div>' : '') + '</div><h2 class="jdl">' + judul + '</h2>'; }
function ttdHtml(guru, peran) {
  var tgl = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  return '<div class="ttd"><div>Mengetahui,<br>Kepala Sekolah<br><br><br><br><u>' + esc(CFG.KEPALA_SEKOLAH || '(................................)') + '</u></div><div>' + (CFG.KOTA ? esc(CFG.KOTA) + ', ' : '') + tgl + '<br>' + peran + '<br><br><br><br><u>' + esc(guru || '(................................)') + '</u></div></div>';
}
function cetakRekap() {
  var d = P.rd, h = P.rh, kkm = P.kkm; if (!d || !h) return;
  var idn = function (k, v) { return '<tr><td>' + k + '</td><td>: ' + v + '</td></tr>'; }, adm = S.me.role === 'admin';
  tampilCetak(kopHtml('Rekap Nilai Siswa') + '<table class="idn">' + idn('Mata pelajaran', esc(P.rk.mapel || 'Semua')) + idn('Kelas', esc(P.rk.kelas || 'Semua')) + idn('Jumlah ujian', d.ujian.length) + idn('KKM', kkm) + idn('Dicetak', fmt(Date.now())) + '</table><div style="margin-top:10px">' + rekapTabel(h, true) + '</div>' +
    '<p style="font-size:10px;margin:6px 0 0">Keterangan: — belum mengerjakan; · bukan peserta; <b class="bawah">nilai tebal bergaris</b> di bawah KKM.</p>' + ttdHtml(adm ? '' : S.me.nama, adm ? 'Administrator' : 'Guru Mata Pelajaran'), true);
}
function cetakLap() {
  var d = P.lap, kkm = P.kkm; if (!d) return;
  var done = d.rekap.filter(function (x) { return x.nilai != null; }), v = done.map(function (x) { return x.nilai; }), lulus = v.filter(function (x) { return x >= kkm; }).length, avg = v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null;
  var idn = function (k, x) { return '<tr><td>' + k + '</td><td>: ' + x + '</td></tr>'; };
  var L = d.rekap.slice().sort(function (a, b) { return (a.kelas + a.nama).localeCompare(b.kelas + b.nama); });
  var lv = { sulit: 0, sedang: 0, mudah: 0 }; d.analisis.forEach(function (x) { lv[x.benar < 30 ? 'sulit' : x.benar <= 70 ? 'sedang' : 'mudah']++; });
  tampilCetak(kopHtml('Laporan Hasil Ujian') + '<table class="idn">' + idn('Nama ujian', esc(d.judul)) + idn('Mata pelajaran', esc(d.mapel || '-')) + idn('Kelas', esc(d.kelas)) + idn('Pelaksanaan', rentang(d.mulai, d.selesai)) + idn('Durasi / jumlah soal', d.durasi + ' menit / ' + d.jumlah + ' soal') + idn('KKM', kkm) + '</table>' +
    '<h3 class="sb">A. Ringkasan Hasil</h3><table class="idn">' + idn('Jumlah peserta', d.rekap.length) + idn('Sudah mengumpulkan', done.length) + idn('Belum mengerjakan', d.rekap.length - done.length) + idn('Rata-rata nilai', rf1(avg)) + idn('Nilai tertinggi / terendah', rf1(v.length ? Math.max.apply(null, v) : null) + ' / ' + rf1(v.length ? Math.min.apply(null, v) : null)) +
    idn('Tuntas / belum tuntas', lulus + ' / ' + (done.length - lulus) + (done.length ? ' (' + Math.round(lulus / done.length * 100) + '% tuntas)' : '')) + idn('Pelanggaran tercatat', d.log.length + ' kejadian') + idn('Butir soal mudah / sedang / sulit', lv.mudah + ' / ' + lv.sedang + ' / ' + lv.sulit) + '</table>' +
    '<h3 class="sb">B. Daftar Nilai Peserta</h3><table class="tb"><thead><tr><th>No</th><th>NIS</th><th>Nama</th><th>Kelas</th><th>Status</th><th>Nilai</th><th>Keterangan</th></tr></thead><tbody>' + L.map(function (x, i) {
      return '<tr><td>' + (i + 1) + '</td><td class="mono">' + esc(x.nis) + '</td><td>' + esc(x.nama) + '</td><td>' + esc(x.kelas) + '</td><td>' + esc(STL[x.status] || x.status) + '</td><td style="text-align:center">' + (x.nilai == null ? '—' : (x.nilai < kkm ? '<b class="bawah">' + esc(x.nilai) + '</b>' : esc(x.nilai))) + '</td><td>' + (x.nilai == null ? '—' : x.nilai >= kkm ? 'Tuntas' : 'Belum tuntas') + '</td></tr>';
    }).join('') + '</tbody></table>' + ttdHtml(d.guru, 'Guru Mata Pelajaran'), false);
}

var STL = { belum: 'Belum mulai', berlangsung: 'Mengerjakan', dikumpulkan: 'Selesai', 'dikumpulkan-otomatis': 'Otomatis' };
function lapRekap() {
  var d = P.lap, kkm = P.kkm, done = d.rekap.filter(function (x) { return x.nilai != null; }), rk = {};
  done.slice().sort(function (a, b) { return b.nilai - a.nilai; }).forEach(function (x, i, arr) { rk[x.nis] = i && x.nilai === arr[i - 1].nilai ? rk[arr[i - 1].nis] : i + 1; });
  var q = (P.lq || '').toLowerCase(), L = d.rekap.filter(function (x) { return (!P.lk || x.kelas === P.lk) && (!q || (x.nis + ' ' + x.nama).toLowerCase().indexOf(q) >= 0); });
  L = L.slice().sort(function (a, b) { return (b.nilai == null ? -1 : b.nilai) - (a.nilai == null ? -1 : a.nilai) || a.nama.localeCompare(b.nama); });
  P.lcsv = [['Peringkat', 'Kelas', 'NIS', 'Nama', 'Status', 'Nilai', 'Keterangan', 'Pelanggaran', 'Durasi']].concat(L.map(function (x) { return [rk[x.nis] || '', x.kelas, x.nis, x.nama, STL[x.status] || x.status, x.nilai == null ? '' : x.nilai, x.nilai == null ? '' : (x.nilai >= kkm ? 'Tuntas' : 'Belum tuntas'), x.pel, x.durasi == null ? '' : mmss(x.durasi)]; }));
  return L.length ? '<table><thead><tr><th>#</th><th>Siswa</th><th>Kelas</th><th>Status</th><th>Nilai</th><th>Keterangan</th><th>Pelanggaran</th><th>Durasi</th></tr></thead><tbody>' + L.map(function (x) {
    return '<tr><td><b>' + (rk[x.nis] || '—') + '</b></td><td><b>' + esc(x.nama) + '</b><br><span class="mono muted sm">' + esc(x.nis) + '</span></td><td>' + esc(x.kelas) + '</td><td><span class="badge ' + (x.status === 'belum' ? 'b-mut' : x.status === 'berlangsung' ? 'b-info' : x.status === 'dikumpulkan' ? 'b-ok' : 'b-warn') + '">' + esc(STL[x.status] || x.status) + '</span></td>' +
      '<td>' + (x.nilai == null ? '—' : '<span class="badge ' + (x.nilai >= kkm ? 'b-ok' : 'b-bad') + '" style="font-size:14px">' + esc(x.nilai) + '</span>') + '</td><td>' + (x.nilai == null ? '—' : x.nilai >= kkm ? 'Tuntas' : 'Belum tuntas') + '</td><td>' + (x.pel ? '<span class="badge ' + (x.pel >= 3 ? 'b-bad' : 'b-warn') + '">' + x.pel + 'x</span>' : '0') + '</td><td>' + (x.durasi == null ? '—' : mmss(x.durasi)) + '</td></tr>';
  }).join('') + '</tbody></table>' : '<p class="muted" style="padding:16px;text-align:center">Tidak ada data pada filter ini.</p>';
}
function drawLapTabel() { var e = $('#lt'); if (e) e.innerHTML = lapRekap(); }
function drawLap() {
  var d = P.lap, s = P.lsub || 'rekap', kkm = P.kkm, done = d.rekap.filter(function (x) { return x.nilai != null; }), v = done.map(function (x) { return x.nilai; });
  var avg = v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null, f1 = function (x) { return x == null ? '—' : String(Math.round(x * 10) / 10); }, lulus = v.filter(function (x) { return x >= kkm; }).length;
  var kp = function (t, val, sub, c) { return '<div class="card stat" style="border-left:4px solid ' + c + '"><span class="xs muted">' + t + '</span><b>' + val + '</b><span class="sm muted">' + sub + '</span></div>'; };
  var KP = '<div class="grid g4">' + kp('Peserta', d.rekap.length, done.length + ' sudah mengumpulkan', '#1E3A5F') + kp('Rata-rata nilai', f1(avg), 'tertinggi ' + f1(v.length ? Math.max.apply(null, v) : null) + ' · terendah ' + f1(v.length ? Math.min.apply(null, v) : null), '#3B82F6') +
    kp('Tuntas (KKM ' + kkm + ')', lulus + ' / ' + done.length, done.length ? Math.round(lulus / done.length * 100) + '% tuntas' : 'belum ada nilai', '#16A34A') + kp('Pelanggaran', d.log.length, 'kejadian tercatat', '#DC2626') + '</div>';
  var tabs = [['rekap', 'Rekap Nilai'], ['analisis', 'Analisis Soal'], ['log', 'Log Pelanggaran']].map(function (t) { return '<button class="chip' + (s === t[0] ? ' on' : '') + '" onclick="App.lsub(\'' + t[0] + '\')">' + t[1] + '</button>'; }).join('');
  var body = '';
  if (s === 'rekap') {
    var h = [0, 0, 0, 0, 0], kl = {}, per = {}; v.forEach(function (x) { h[x < 60 ? 0 : x < 70 ? 1 : x < 80 ? 2 : x < 90 ? 3 : 4]++; }); d.rekap.forEach(function (x) { kl[x.kelas] = 1; }); done.forEach(function (x) { (per[x.kelas] = per[x.kelas] || []).push(x.nilai); });
    var pk = Object.keys(per).sort().map(function (k) { var a = per[k].reduce(function (p, c) { return p + c; }, 0) / per[k].length; return '<div style="margin:10px 0"><div style="display:flex;justify-content:space-between" class="sm"><b>' + esc(k) + '</b><span>' + f1(a) + ' <span class="muted">(' + per[k].length + ' siswa)</span></span></div><div class="prog"><i style="width:' + a + '%;background:' + (a >= kkm ? 'var(--ok)' : '#EF4444') + '"></i></div></div>'; }).join('') || '<p class="muted sm">Belum ada nilai.</p>';
    body = '<div class="grid g23" style="margin-top:16px"><div class="card"><h3>Distribusi nilai</h3>' + (v.length ? histSvg(h) : '<p class="muted sm">Belum ada siswa yang mengumpulkan.</p>') + '</div><div class="card"><h3>Rata-rata per kelas</h3>' + pk + '</div></div>' +
      '<div class="card" style="margin-top:16px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><select onchange="App.lkelas(this.value)" style="max-width:200px"><option value="">Semua kelas</option>' + Object.keys(kl).sort().map(function (k) { return '<option' + (P.lk === k ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select>' +
      '<input id="lq" placeholder="Cari nama / NIS..." value="' + esc(P.lq || '') + '" style="max-width:220px"><span style="flex:1"></span><span class="sm muted">Nilai di bawah KKM ' + kkm + ' ditandai merah</span></div><div class="tw" id="lt" style="margin-top:12px"></div></div>';
  } else if (s === 'analisis') {
    var A = d.analisis, lv = { sulit: 0, sedang: 0, mudah: 0 }, lvl = function (a) { return a.benar < 30 ? 'sulit' : a.benar <= 70 ? 'sedang' : 'mudah'; }; A.forEach(function (a) { lv[lvl(a)]++; });
    var BC = { sulit: ['b-bad', '#EF4444', 'Sulit'], sedang: ['b-warn', '#EAB308', 'Sedang'], mudah: ['b-ok', '#16A34A', 'Mudah'] };
    P.lcsv = [['No', 'Soal', 'Kunci', 'Tingkat', '% Benar', 'Sebaran']].concat(A.map(function (a, i) { return [i + 1, a.t, a.kunci, BC[lvl(a)][2], a.benar + '%', Object.keys(a.dist).sort().map(function (l) { return l + ':' + a.dist[l]; }).join(' ')]; }));
    body = '<div class="grid g3" style="margin-top:16px">' + kp('Soal mudah', lv.mudah, 'dijawab benar > 70%', '#16A34A') + kp('Soal sedang', lv.sedang, '30% – 70% benar', '#EAB308') + kp('Soal sulit', lv.sulit, 'dijawab benar < 30%', '#EF4444') + '</div>' +
      '<div class="card" style="margin-top:16px"><div class="muted sm" style="margin-bottom:8px">Dihitung dari ' + done.length + ' siswa yang sudah mengumpulkan. Soal yang tidak dijawab dihitung salah.</div><div class="tw">' + (A.length ? '<table><thead><tr><th>No</th><th>Soal</th><th>Kunci</th><th>Tingkat</th><th style="min-width:160px">% Benar</th><th>Sebaran jawaban</th></tr></thead><tbody>' + A.map(function (a, i) {
        var b = BC[lvl(a)]; return '<tr><td>' + (i + 1) + '</td><td><div class="clamp" style="max-width:380px">' + esc(a.t) + '</div></td><td><b>' + esc(a.kunci) + '</b></td><td><span class="badge ' + b[0] + '">' + b[2] + '</span></td><td><b>' + a.benar + '%</b><div class="prog"><i style="width:' + a.benar + '%;background:' + b[1] + '"></i></div></td>' +
          '<td>' + (Object.keys(a.dist).sort().map(function (l) { return '<span class="badge ' + (l === a.kunci ? 'b-ok' : 'b-mut') + '" style="margin:1px">' + l + ' · ' + a.dist[l] + '</span>'; }).join(' ') || '<span class="muted">—</span>') + '</td></tr>';
      }).join('') + '</tbody></table>' : '<p class="muted">Belum ada soal.</p>') + '</div></div>';
  } else {
    var gs = {}; d.log.forEach(function (l) { var g = gs[l.nis] = gs[l.nis] || { nama: l.nama, nis: l.nis, tab: 0, fs: 0, last: 0 }; if (l.jenis === 'keluar_fullscreen') g.fs++; else g.tab++; g.last = Math.max(g.last, l.waktu); });
    var GL = Object.keys(gs).map(function (k) { return gs[k]; }).sort(function (a, b) { return (b.tab + b.fs) - (a.tab + a.fs); });
    P.lcsv = [['Waktu', 'NIS', 'Nama', 'Jenis']].concat(d.log.slice().sort(function (a, b) { return b.waktu - a.waktu; }).map(function (l) { return [fmt(l.waktu), l.nis, l.nama, l.jenis === 'keluar_fullscreen' ? 'Keluar layar penuh' : 'Pindah tab']; }));
    body = '<div class="grid g2" style="margin-top:16px"><div class="card"><h3>Ringkasan per siswa</h3><div class="tw">' + (GL.length ? '<table><thead><tr><th>Siswa</th><th>Pindah tab</th><th>Keluar layar penuh</th><th>Total</th></tr></thead><tbody>' + GL.map(function (g) {
        var t = g.tab + g.fs; return '<tr><td><b>' + esc(g.nama) + '</b><br><span class="mono muted sm">' + esc(g.nis) + '</span></td><td>' + g.tab + '</td><td>' + g.fs + '</td><td><span class="badge ' + (t >= 3 ? 'b-bad' : 'b-warn') + '">' + t + '</span></td></tr>';
      }).join('') + '</tbody></table>' : '<p class="muted">Tidak ada pelanggaran tercatat.</p>') + '</div></div>' +
      '<div class="card"><h3>Rincian kejadian</h3><div class="tw" style="max-height:420px;overflow:auto">' + (d.log.length ? '<table><thead><tr><th>Waktu</th><th>Siswa</th><th>Jenis</th></tr></thead><tbody>' + d.log.slice().sort(function (a, b) { return b.waktu - a.waktu; }).map(function (l) {
        return '<tr><td class="sm">' + fmt(l.waktu) + '</td><td>' + esc(l.nama) + '</td><td><span class="badge ' + (l.jenis === 'keluar_fullscreen' ? 'b-info' : 'b-warn') + '">' + (l.jenis === 'keluar_fullscreen' ? 'Keluar layar penuh' : 'Pindah tab') + '</span></td></tr>';
      }).join('') + '</tbody></table>' : '<p class="muted">Tidak ada kejadian.</p>') + '</div></div></div>';
  }
  $('#lp').innerHTML = '<div class="card" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><div style="flex:1;min-width:200px"><b>' + esc(d.judul) + '</b><div class="sm muted">Kelas ' + esc(d.kelas) + ' · ' + d.jumlah + ' soal · ' + d.durasi + ' menit</div></div><button class="btn" onclick="App.unduhLap()">⬇ Unduh CSV (Excel)</button><button class="btn p" onclick="App.cetakLap()">🖨 Cetak Laporan</button></div><div style="margin-top:12px">' + KP + '</div><div class="tabs" style="margin-bottom:0">' + tabs + '</div>' + body;
  if (s === 'rekap') { drawLapTabel(); $('#lq').oninput = function () { P.lq = this.value; drawLapTabel(); }; }
}

/* ---------- API PUBLIK untuk onclick ---------- */
window.App = {
  keluar: function () { if (X && X.aktif && !confirm('Ujian sedang berlangsung. Keluar sekarang?')) return; Sesi.keluar(); location.reload(); },
  home: function () { dash(); }, filter: function (k) { S.filter = k; drawDash(); }, buka: buka, mulai: function () { mulai(false); },
  pilih: pilih, nav: function (d) { X.idx = Math.max(0, Math.min(X.soal.length - 1, X.idx + d)); localSave(); drawQ(); }, ke: function (i) { X.idx = i; localSave(); drawQ(); },
  ragu: function () { var s = cur(); if (X.ragu[s.id]) delete X.ragu[s.id]; else X.ragu[s.id] = 1; localSave(); drawQ(); },
  konfirmasi: konfirmasi, kumpul: function () { kumpul(false); }, tab: tab, muat: function () { muatPantau(); },
  pil: function (id, on) { if (on) P.sel[id] = 1; else delete P.sel[id]; $('#cs').textContent = Object.keys(P.sel).length + ' dipilih'; },
  lsub: function (k) { P.lsub = k; drawLap(); }, lkelas: function (k) { P.lk = k; drawLap(); }, unduhLap: function () { unduh('laporan-' + (P.lsub || 'rekap') + '-' + String(P.lap.judul).replace(/\W+/g, '-') + '.csv', P.lcsv); },
  lmode: function (m) { P.lmode = m; tLaporan(); }, rkf: function (k, v) { P.rk[k] = v; muatRekap(); }, cetakLap: cetakLap, cetakRekap: cetakRekap,
  unduhRekap: function () { if (P.rd) unduh('rekap-nilai.csv', csvRekap()); },
  menu: function (ev) { ev.stopPropagation(); var m = $('#um'); m.className = m.className.indexOf('hide') >= 0 ? 'umenu' : 'umenu hide'; }, ganti: gantiPw,
  gf: guruForm, gpw: guruPw, ghapus: guruHapus,
  pks: function () { $('#pkn').className = $('#pks').value === 'n' ? '' : 'hide'; },
  kumpulAtur: function () { var m = $('#pks').value, kv = m === 'n' ? Number($('#pkn').value) : Number(m); if (m === 'n' && !(kv > 0)) { toast('Isi jumlah menit penguncian.', 'warn'); return; } Api.call('ujian.kumpulatur', { idUjian: P.cur, kumpul: kv }).then(function (r) { if (!r.success) { toast(r.message, 'error'); return; } toast(r.message); if (P.pd) P.pd.kumpul = r.data.kumpul; }); },
  tema: tema, setTema: function (t) { temaSet(t); tema(); }, lihat: function () { var i = $('#pw'); i.type = i.type === 'password' ? 'text' : 'password'; },
  bimp: impSoal, sf: soalForm, bm: function (m) { P.bs.mapel = m; P.bs.page = 1; drawBank(); }, bpg: function (d) { P.bs.page += d; drawBank(); },
  bsel: function (id, on) { if (on) P.bs.sel[id] = 1; else delete P.bs.sel[id]; drawBank(); }, bclr: function () { P.bs.sel = {}; drawBank(); },
  bselAll: function (on) { P.bs.vis.forEach(function (id) { if (on) P.bs.sel[id] = 1; else delete P.bs.sel[id]; }); drawBank(); },
  sdel: function (id) { var s = P.bs.all.filter(function (x) { return x.id === id; })[0]; if (s) soalHapus([id], '<b>' + esc(s.mapel) + '</b> — ' + esc(s.t.slice(0, 90))); },
  bdelSel: function () { var ids = Object.keys(P.bs.sel); if (ids.length) soalHapus(ids, '<b>' + ids.length + ' soal terpilih</b>'); },
  bcsv: function () { unduh('bank-soal.csv', [['Mapel', 'Pertanyaan', 'A', 'B', 'C', 'D', 'E', 'Kunci']].concat(P.bs.all.map(function (s) { return [s.mapel, s.t, s.o.A, s.o.B, s.o.C, s.o.D, s.o.E, s.kunci]; }))); },
  kartu: kartu, pwSiswa: pwSiswa, sForm: sForm, sHapus: sHapus, hapusUjian: hapusUjian,
  pf: function (k) { P.pf = k; if (P.pd) drawPantau(); },
  salinToken: function () { if (P.pd && navigator.clipboard) navigator.clipboard.writeText(P.pd.token).then(function () { toast('Token disalin'); }); },
  unduhPantau: function () { var d = P.pd; if (!d) return; unduh('pantau-' + d.judul.replace(/\W+/g, '-') + '.csv', [['NIS', 'Nama', 'Kelas', 'Status', 'Terjawab', 'Pindah tab', 'Nilai']].concat(d.rows.map(function (x) { return [x.nis, x.nama, x.kelas, x.status, x.jawab + '/' + d.jumlah, x.pelanggaran, x.nilai == null ? '' : x.nilai]; }))); },
  kls: function (b) { var k = b.getAttribute('data-k'); if (P.kls[k]) { delete P.kls[k]; b.className = 'chip'; } else { P.kls[k] = 1; b.className = 'chip on'; } },
  pilSemua: function () { (P.vis || []).forEach(function (s) { P.sel[s.id] = 1; }); drawSoalPilih(); },
  pilKosong: function () { P.sel = {}; drawSoalPilih(); },
  pantauId: function (id) { P.pid = id; tab('pantau'); },
  tmplSoal: function () { unduh('template-soal.csv', [['Mapel', 'Pertanyaan', 'A', 'B', 'C', 'D', 'E', 'Kunci'], ['Matematika', 'Hasil dari 2 + 3 adalah ...', '4', '5', '6', '7', '', 'B']]); },
  tmplSiswa: function () { unduh('template-siswa.csv', [['NIS', 'Nama', 'Kelas'], ['202610101', 'Contoh Siswa', 'X MIPA 1']]); }
};

/* ---------- START ---------- */
var s0 = Sesi.ambil();
if (s0.token && s0.me && (s0.me.role === 'siswa') === (MODE === 'siswa')) { S.me = s0.me; masuk(); } else { if (s0.token) Sesi.keluar(); viewLogin(); }
})();
