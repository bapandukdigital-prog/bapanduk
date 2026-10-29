# Bapanduk · Prototipe Aplikasi Pasar Terapung Muara Kuin

Prototipe interaktif aplikasi **Bapanduk**, digitalisasi tradisi tukar-menukar (bapanduk) di Pasar Terapung Muara Kuin, Banjarmasin.

Halaman ini sepenuhnya statis: tidak perlu server, database, atau instalasi. Cukup unggah isi folder ini ke GitHub Pages.

## Cara publish ke GitHub Pages

1. Buat repository baru di GitHub, misalnya `bapanduk`. Atur visibilitasnya **Public**.
2. Unggah **seluruh isi folder ini** ke repository: `index.html`, `404.html`, `.nojekyll`, folder `assets/`, `layar/`, dan `sumber/`.
   Lewat web GitHub: klik **Add file → Upload files**, lalu seret semua file dan folder ke sana.
   > File `.nojekyll` tersembunyi di beberapa sistem. Pastikan file ini ikut terunggah.
3. Buka **Settings → Pages**.
4. Di bagian **Build and deployment**, pilih **Source: Deploy from a branch**, lalu **Branch: `main`**, folder **`/ (root)`**, lalu klik **Save**.
5. Tunggu 1–2 menit. Alamat situs muncul di halaman yang sama, biasanya `https://<username>.github.io/bapanduk/`.

## Isi paket

| File / folder | Isi |
|---|---|
| `index.html` | Halaman utama: bingkai ponsel di laptop, layar penuh di HP |
| `assets/app.js` | Mesin render prototipe (React sudah dibundel di dalamnya, tidak memakai CDN) |
| `assets/screens.js` | Semua layar aplikasi, dibundel dari folder `layar/` |
| `layar/*.dc.html` | File sumber setiap layar, sama dengan di kanvas Claude |
| `assets/*.png` | Logo, QR jukung Acil Khadijah, dan kartu QR presentasi |
| `sumber/main.js` | Kode sumber mesin render, untuk referensi |

## Membuka langsung ke layar tertentu

Tambahkan nama layar setelah `#/` di alamat situs:

- `#/Awal` (halaman awal, bawaan)
- `#/Masuk`, `#/Main` (beranda), `#/Pindai`, `#/Peta`, `#/Koin`, `#/Profil`, `#/Bapanduk`
- `#/Pedagang` (mode pedagang)

Contoh: `https://<username>.github.io/bapanduk/#/Pedagang`

## Catatan

- **Kamera (pindai QR) dan mikrofon (e-akad)** hanya berjalan di alamat `https://`, dan GitHub Pages sudah memakainya. Pembacaan QR otomatis memakai fitur bawaan browser, yang didukung Chrome di Android. Di browser lain, pakai tombol **"Simulasikan pindai (demo)"**.
- **Saldo koin** sinkron di semua layar wisatawan selama halaman terbuka. Kalau halaman dimuat ulang, saldo kembali ke 128 koin.
- **Font** dimuat dari Google Fonts, jadi perlu koneksi internet. Tanpa internet, halaman tetap berjalan dengan font cadangan.
- Untuk membuat QR situs GitHub Pages, gunakan alamat situs dari langkah 5.
