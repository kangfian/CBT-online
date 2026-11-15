// Satu-satunya nilai konfigurasi di frontend: URL Web App (/exec) hasil Deploy Apps Script.
// URL ini bukan rahasia. Jangan menaruh token/password apa pun di sini.
window.APP_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbx5cJL2zChC3NslOfQO3Q42pFuCbffXMLqU7T4dCZZeso2WDqOpiWbbbH4Y5JURDnw/exec',
  NAMA_SEKOLAH: 'SMK SPP Putra Jaya',
  ALAMAT_SEKOLAH: '', // opsional, tampil di kop laporan cetak
  KOTA: '',           // opsional, mis. 'Medan' (untuk tanggal & tanda tangan)
  KEPALA_SEKOLAH: '', // opsional, nama pada kolom tanda tangan
  LOGO: '' // opsional: alamat gambar logo, mis. 'img/logo.png' (taruh berkasnya di folder img/)
};
