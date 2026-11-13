# Lab Management – Frontend

Aplikasi frontend untuk sistem **Lab Management**, dibangun menggunakan Next.js . Frontend ini berfungsi sebagai antarmuka pengguna untuk mengelola data dan aktivitas laboratorium, serta berkomunikasi dengan backend API.

## Teknologi

- [Next.js](https://nextjs.org/)
- React
- Node.js
- Docker

## Persyaratan

Untuk menjalankan aplikasi secara lokal:

- Node.js versi yang kompatibel dengan Next.js 15
- npm
- Git

Untuk menjalankan aplikasi menggunakan Docker:

- Docker Engine
- Docker Compose

## Menjalankan di Lingkungan Development

### 1. Clone repository

```bash
git clone <URL_REPOSITORY_FRONTEND>
cd lab-management
```

### 2. Install dependencies

```bash
npm install
```

### 3. Konfigurasi environment

Jika proyek menyediakan file `.env.example`, salin menjadi `.env.local`:

```bash
cp .env.example .env.local
```

Sesuaikan konfigurasi environment dengan kebutuhan aplikasi, terutama alamat backend API.

> Nama dan nilai environment variable harus mengikuti konfigurasi yang digunakan di dalam source code frontend dan deployment. Jangan memasukkan password atau secret production ke repository.

### 4. Jalankan development server

```bash
npm run dev
```

Buka aplikasi melalui:

```text
http://localhost:3000
```

## Menjalankan Build Production

Untuk membuat build production:

```bash
npm run build
```

Untuk menjalankan hasil build:

```bash
npm run start
```

Aplikasi secara default berjalan pada port `3000`, kecuali dikonfigurasi berbeda.

## Menjalankan dengan Docker

Frontend telah dilengkapi dengan `Dockerfile` untuk proses containerization.

Jika ingin menjalankan frontend secara mandiri, build image:

```bash
docker build -t lab-management-frontend .
```

Jalankan container:

```bash
docker run -d \
  --name lab-management-frontend \
  -p 3000:3000 \
  lab-management-frontend
```

Untuk deployment production, disarankan menjalankan frontend bersama backend, PostgreSQL, dan reverse proxy menggunakan Docker Compose yang tersedia pada repository deployment.

## Struktur Deployment

Struktur direktori yang digunakan pada deployment:

```text
deployments/
├── lab-equipment-api/
│   └── ...
│
├── lab-management/
│   ├── Dockerfile
│   ├── package.json
│   └── ...
│
└── lab-deploy/
    ├── docker-compose.yml
    ├── Caddyfile
    ├── .env.example
    └── ...
```

Docker Compose menggunakan folder `lab-management` sebagai build context untuk service frontend.

Jalankan deployment dari folder `lab-deploy`:

```bash
docker compose up -d --build
```

Lihat status container:

```bash
docker compose ps
```

Lihat log frontend:

```bash
docker compose logs -f web
```

## Integrasi dengan Backend

Frontend berkomunikasi dengan backend API untuk mengambil dan mengirim data aplikasi.

Pastikan:

- Backend API sudah berjalan.
- Konfigurasi alamat API frontend mengarah ke endpoint yang benar.
- Konfigurasi environment untuk frontend sudah sesuai dengan environment deployment.
- Jika menggunakan Docker Compose, komunikasi antarkontainer menggunakan jaringan internal Docker dan nama service yang sesuai.

Jangan menggunakan `localhost` sebagai alamat backend dari dalam container frontend jika backend berjalan di container terpisah. `localhost` di dalam container mengarah ke container itu sendiri.

## Deployment Production

Untuk deployment production, gunakan konfigurasi Docker Compose pada repository `lab-deploy`.

Alamat aplikasi publik diatur melalui konfigurasi deployment. Reverse proxy Caddy menangani akses HTTP/HTTPS ke frontend.

Setelah melakukan perubahan source code frontend, build ulang container:

```bash
docker compose up -d --build web
```

Periksa log jika terjadi kendala:

```bash
docker compose logs --tail=100 web
```

## Troubleshooting

### Frontend tidak dapat terhubung ke backend

Periksa:

1. Apakah container backend sedang berjalan?
2. Apakah alamat API sudah benar?
3. Apakah frontend menggunakan hostname service Docker yang benar ketika berjalan di jaringan internal?
4. Apakah konfigurasi environment sudah sesuai?

### Perubahan source code tidak terlihat

Jalankan ulang build frontend:

```bash
docker compose up -d --build web
```

Kemudian periksa log:

```bash
docker compose logs -f web
```

### Memeriksa container

```bash
docker compose ps
```

## Catatan Keamanan

- Jangan commit file `.env` atau `.env.local` yang berisi secret.
- Jangan menyimpan password database atau JWT secret di source code frontend.
- Jangan menaruh private API key atau secret server-side di environment variable yang menggunakan prefix `NEXT_PUBLIC_`.
- Gunakan HTTPS untuk deployment yang diakses melalui jaringan publik.

## Repository

**Frontend:** Lab Management  
**Framework:** Next.js 15  
**Deployment:** Docker  
**Reverse Proxy:** Caddy  
**Backend:** Lab Equipment API  
**Database:** PostgreSQL
