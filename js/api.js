/* Lapisan API + sesi login. Semua panggilan POST text/plain (menghindari CORS preflight GAS). */
(function () {
  var URL_ = (window.APP_CONFIG || {}).GAS_URL || '';
  var SIAP = URL_ && !/GANTI|XXXX/.test(URL_);
  var KEY = 'cbt_sesi';
  var Sesi = {
    ambil: function () { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } },
    simpan: function (o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} },
    keluar: function () { try { localStorage.removeItem(KEY); localStorage.removeItem('cbt_ujian'); localStorage.removeItem('cbt_exam'); } catch (e) {} }
  };
  var Api = {
    siap: SIAP,
    call: function (action, data) {
      if (!SIAP) return Promise.resolve({ success: false, message: 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js.' });
      return fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: action, token: Sesi.ambil().token || '', data: data || {} }) })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (j && j.code === 'AUTH') { Sesi.keluar(); location.reload(); } return j; })
        .catch(function () { return { success: false, offline: true, message: 'Tidak dapat terhubung ke server.' }; });
    }
  };
  window.Api = Api; window.Sesi = Sesi;
})();
