# API Documentation

## Introduction

### Billing and API Tokens

Untuk membuat token otorisasi, Anda memerlukan akun di dasbor pengembang Winston AI kami. Jika Anda belum memilikinya, silakan buat akun dan dapatkan 2000 kredit gratis untuk memulai. Setelah terdaftar, Anda akan dapat membuat token dan membeli lebih banyak kredit jika diperlukan.

- **Winston AI Developer dashboard**  
   Daftarkan akun dan dapatkan 2000 kredit gratis untuk mencoba API. Tidak perlu kartu kredit.

#### Credit Value

Biaya kredit per kata tergantung pada endpoint:

- **AI content detection**: 1 kredit per kata
- **Plagiarism detection**: 2 kredit per kata
- **AI image detection**: 300 kredit per gambar
- **Text compare**: 1/2 kredit per total kata yang ditemukan di kedua teks

### Results Interpretation

Untuk informasi lebih lanjut tentang deteksi AI dan hasil plagiarisme, silakan baca halaman ini.

## Authentication

Semua endpoint API diautentikasi menggunakan token Bearer. Anda dapat membuat token Anda di dasbor pengembang Winston AI.

```json
"security": [
    {
        "bearerAuth": []
    }
]
```

## Endpoints

### Plagiarism

API plagiarisme Winston AI adalah alat canggih yang dirancang untuk memeriksa plagiarisme dalam teks dengan menjelajahi internet untuk konten serupa. API ini akan melakukan query ke beberapa situs web dan membandingkan teks masukan dengan konten yang ditemukan di situs-situs tersebut. Ini sangat berguna dalam lingkungan akademis, pembuatan konten, skenario hukum, atau situasi lain di mana keaslian konten diperlukan.

#### POST `/v2/plagiarism`

##### Authorizations

| Type          | In     | Name          | Description                                                                                              |
| ------------- | ------ | ------------- | -------------------------------------------------------------------------------------------------------- |
| Authorization | header | Authorization | Header otentikasi Bearer dengan format `Bearer <token>`, di mana `<token>` adalah token otentikasi Anda. |

##### Body (application/json)

| Parameter        | Type     | Required | Description                                                                                                                                                                                                       |
| ---------------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| text             | string   | Yes      | Teks yang akan dipindai. Ini wajib kecuali Anda menyediakan situs web atau file. Setiap permintaan harus berisi setidaknya 100 karakter dan tidak lebih dari 120.000 karakter.                                    |
| file             | string   | No       | File yang akan dipindai. Jika Anda menyediakan file, API akan memindai konten file tersebut. File harus dalam format .pdf, .doc, atau .docx biasa. File memiliki prioritas di atas teks.                          |
| website          | string   | No       | URL situs web yang akan dipindai. Jika Anda menyediakan situs web, API akan mengambil konten situs web dan memindainya. Situs web harus dapat diakses publik. Situs web memiliki prioritas di atas teks dan file. |
| excluded_sources | string[] | No       | Sebuah array sumber yang akan dikecualikan dari pemindaian. Sumber dapat berupa nama domain seperti example.com atau URL seperti https://example.com. Sumber bersifat case-sensitive.                             |
| language         | string   | No       | Kode bahasa 2 huruf. Default: en. Mendukung 44 bahasa (en, fr, de, es, pt, dll).                                                                                                                                  |
| country          | string   | No       | Kode negara tempat teks ditulis. Kami menerima semua kode negara. Default: us.                                                                                                                                    |

##### Responses

<details>
<summary><strong>200 OK - Plagiarism Response</strong></summary>

- `status` (number): Kode status HTTP.
- `scanInformation` (object): Informasi dasar tentang permintaan pemindaian.
- `result` (object): Objek utama yang berisi hasil pemindaian plagiarisme.
- `sources` (object[]): Array objek, masing-masing sesuai dengan situs web di mana konten yang cocok telah ditemukan.
  - `score` (number): Skor persentase plagiarisme untuk sumber ini.
  - `canAccess` (boolean): Menunjukkan apakah kami dapat mengakses konten sumber.
  - `url` (string): URL sumber tempat plagiarisme ditemukan.
  - `title` (string): Judul dokumen sumber.
  - `plagiarismWords` (number): Jumlah kata dalam teks masukan yang diidentifikasi sebagai plagiarisme dari sumber ini.
  - `identicalWordCounts` (number): Jumlah kata yang diidentifikasi sebagai plagiat yang identik dengan konten sumber.
  - `similarWordCounts` (number): Jumlah kata yang diidentifikasi sebagai plagiat yang mirip dengan konten sumber.
  - `totalNumberOfWords` (number): Jumlah total kata dalam teks masukan.
  - `author` (string | null): Penulis dokumen sumber.
  - `description` (string | null): Deskripsi atau ringkasan konten sumber.
  - `publishedDate` (number | null): Timestamp kapan sumber diterbitkan.
  - `source` (string | null): Nama sumber atau publikasi.
  - `citation` (boolean): Menunjukkan apakah sumber dikutip dalam teks masukan.
  - `plagiarismFound` (object[]): Daftar urutan plagiarisme yang ditemukan dalam teks masukan dari sumber ini.
  - `is_excluded` (boolean): Menunjukkan apakah sumber ini harus dikecualikan dari hasil akhir.
- `attackDetected` (object): Sebuah objek dengan dua properti boolean yang menunjukkan apakah teks mengandung spasi lebar-nol atau serangan homoglyph.
- `text` (string): Teks masukan yang digunakan untuk pemindaian plagiarisme.
- `similarWords` (object[]): Daftar kata serupa yang ditemukan dalam teks masukan.
- `citations` (string[]): Array yang berisi situs web yang dikutip dalam teks yang disediakan.
- `indexes` (object[]): Daftar urutan plagiarisme yang ditemukan dalam teks masukan.
- `credits_used` (integer): Jumlah kredit yang digunakan untuk memproses permintaan Anda.
- `credits_remaining` (integer): Jumlah kredit yang tersisa di akun Anda setelah permintaan Anda diproses.

</details>

<details>
<summary><strong>400 Bad Request</strong></summary>

- `error` (string): Pesan kesalahan.
- `description` (string): Deskripsi kesalahan.

</details>

##### Example Request (cURL)

```bash
curl --request POST \
    --url https://api.gowinston.ai/v2/plagiarism \
    --header 'Authorization: Bearer <token>' \
    --header 'Content-Type: application/json' \
    --data '{
        "text": "<string>",
        "file": "<string>",
        "website": "<string>",
        "excluded_sources": [
            "<string>"
        ],
        "language": "en",
        "country": "us"
    }'
```

##### Example Response (200 OK)

```json
{
  "status": 200,
  "scanInformation": {
    "service": "<string>",
    "scanTime": "<string>",
    "inputType": "<string>"
  },
  "result": {
    "score": 85,
    "sourceCounts": 1,
    "textWordCounts": 150,
    "totalPlagiarismWords": 127,
    "identicalWordCounts": 100,
    "similarWordCounts": 27
  },
  "sources": [
    {
      "score": 85,
      "canAccess": true,
      "url": "<string>",
      "title": "<string>",
      "plagiarismWords": 127,
      "identicalWordCounts": 100,
      "similarWordCounts": 27,
      "totalNumberOfWords": 150,
      "author": "<string>",
      "description": "<string>",
      "publishedDate": 1672531200,
      "source": "<string>",
      "citation": true,
      "plagiarismFound": [
        {
          "startIndex": 50,
          "endIndex": 177,
          "sequence": "<string>"
        }
      ],
      "is_excluded": false
    }
  ],
  "attackDetected": {
    "zero_width_space": false,
    "homoglyph_attack": false
  },
  "text": "<string>",
  "similarWords": [
    {
      "index": 123,
      "word": "<string>"
    }
  ],
  "citations": ["<string>"],
  "indexes": [
    {
      "startIndex": 50,
      "endIndex": 177,
      "sequence": "<string>"
    }
  ],
  "credits_used": 300,
  "credits_remaining": 1700
}
```

##### Example Response (400 Bad Request)

```json
{
  "error": "Bad Request",
  "description": "Invalid input provided. Please check the request body."
}
```
