// Satu-satunya nilai konfigurasi di frontend: URL Web App (/exec) hasil Deploy Apps Script.
// URL ini bukan rahasia. Jangan menaruh token/password apa pun di sini.
window.APP_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbwQ_g8abfqKUud2Fbt1fUmAOEWXCRSrKIFc14RXFFLNPDiHxhh8_5RHT_r3na0Jn3_g/exec',
  NAMA_SEKOLAH: 'SMK  SPP Putra Jaya Stabat',
  ALAMAT_SEKOLAH: '', // opsional, tampil di kop laporan cetak
  KOTA: '',           // opsional, mis. 'Medan' (untuk tanggal & tanda tangan)
  KEPALA_SEKOLAH: '', // opsional, nama pada kolom tanda tangan
  LOGO: '' // opsional: alamat gambar logo, mis. 'img/logo.png' (taruh berkasnya di folder img/)
};
