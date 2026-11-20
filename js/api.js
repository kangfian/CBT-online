/* Lapisan API + sesi login. Semua panggilan POST text/plain (menghindari CORS preflight GAS). */
(function () {
  var URL_ = (window.APP_CONFIG || {}).GAS_URL || '';
  var SIAP = URL_ && !/GANTI|XXXX/.test(URL_);
  var KEY = 'cbt_sesi_' + (window.APP_MODE === 'staf' ? 'staf' : 'siswa'); // sesi siswa & staf terpisah
  var Sesi = {
    ambil: function () { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } },
    simpan: function (o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} },
    putus: function (pesan) { try { localStorage.removeItem(KEY); sessionStorage.setItem('cbt_flash', pesan || 'Sesi login berakhir. Silakan masuk kembali.'); } catch (e) {} }, // dikeluarkan server: jawaban lokal ujian tetap disimpan
    keluar: function () { try { localStorage.removeItem(KEY); localStorage.removeItem('cbt_ujian'); localStorage.removeItem('cbt_exam'); } catch (e) {} }
  };
  var Api = {
    siap: SIAP,
    beacon: function (action, data) { // pengiriman andal saat halaman masuk latar belakang (hasil tidak dibaca)
      try { if (!SIAP || typeof navigator === 'undefined' || !navigator.sendBeacon) return false; return navigator.sendBeacon(URL_, new Blob([JSON.stringify({ action: action, token: Sesi.ambil().token || '', data: data || {} })], { type: 'text/plain;charset=UTF-8' })); } catch (e) { return false; }
    },
    call: function (action, data) {
      if (!SIAP) return Promise.resolve({ success: false, message: 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js.' });
      return fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: action, token: Sesi.ambil().token || '', data: data || {} }) })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (j && j.message === 'Aksi tidak dikenal.') j.message = 'Backend belum diperbarui: tempel Kode.gs terbaru, lalu Deploy → Kelola deployment → Versi baru.';
        if (j && j.code === 'AUTH') { Sesi.putus(j.message); location.reload(); } return j; })
        .catch(function () { return { success: false, offline: true, message: 'Tidak dapat terhubung ke server.' }; });
    }
  };
  window.Api = Api; window.Sesi = Sesi;
})();
