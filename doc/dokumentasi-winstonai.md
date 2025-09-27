# Dokumentasi Winston AI Plagiarism API v2

Dokumentasi ini menyediakan panduan lengkap untuk menggunakan API Plagiarisme dari Winston AI.

---

## Endpoints

**PlagiarismAPI** plagiarisme Winston AI adalah alat canggih yang dirancang untuk memeriksa plagiarisme dalam teks dengan menjelajahi internet untuk konten serupa. API ini akan melakukan kueri ke beberapa situs web dan membandingkan teks masukan dengan konten yang ditemukan. Ini sangat berguna dalam lingkungan akademik, pembuatan konten, skenario hukum, atau situasi lain di mana keaslian konten diperlukan.

### POST `/v2/plagiarism`

Endpoint ini digunakan untuk mengirimkan teks, file, atau URL situs web untuk dipindai plagiarismenya.

---

## Otorisasi

| Tipe        | Kunci         | Diwajibkan | Deskripsi                                                                                                |
| ----------- | ------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| Bearer Auth | Authorization | true       | Header otentikasi Bearer dengan format `Bearer <token>`, di mana `<token>` adalah token otentikasi Anda. |

---

## Body Permintaan (`application/json`)

| Parameter        | Tipe     | Wajib  | Default | Deskripsi                                                                                                                                                                                                   |
| ---------------- | -------- | ------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| text             | string   | true\* | -       | Teks yang akan dipindai. Wajib diisi kecuali Anda menyediakan website atau file. Setiap permintaan harus berisi setidaknya 100 karakter dan tidak lebih dari 120.000 karakter.                              |
| file             | string   | false  | -       | File yang akan dipindai. Jika Anda menyediakan file, API akan memindai konten file tersebut. File harus dalam format .pdf, .doc, atau .docx. File memiliki prioritas di atas text.                          |
| website          | string   | false  | -       | URL situs web untuk dipindai. Jika Anda menyediakan situs web, API akan mengambil kontennya dan memindainya. Situs web harus dapat diakses secara publik. Website memiliki prioritas di atas text dan file. |
| excluded_sources | string[] | false  | -       | Array sumber yang akan dikecualikan dari pemindaian. Sumber dapat berupa nama domain (example.com) atau URL lengkap.                                                                                        |
| language         | string   | false  | en      | Kode bahasa 2 huruf. Semua bahasa diterima.                                                                                                                                                                 |
| country          | string   | false  | us      | Kode negara tempat teks ditulis. Semua kode negara diterima.                                                                                                                                                |

> \*Wajib jika file dan website tidak disediakan.

---

## Respons

**Kode Status:** `204`

Struktur respons jika pemindaian berhasil:

```json
{
  "status": "integer",
  "scanInformation": {
    "service": "string",
    "scanTime": "string",
    "inputType": "string"
  },
  "result": {
    "score": "number",
    "sourceCounts": "number",
    "textWordCounts": "number",
    "totalPlagiarismWords": "number",
    "identicalWordCounts": "number",
    "similarWordCounts": "number"
  },
  "sources": [
    {
      "score": "number",
      "canAccess": "boolean",
      "url": "string",
      "title": "string",
      "plagiarismWords": "number",
      "identicalWordCounts": "number",
      "similarWordCounts": "number",
      "totalNumberOfWords": "number",
      "author": "string | null",
      "description": "string | null",
      "publishedDate": "number | null",
      "source": "string | null",
      "citation": "boolean",
      "plagiarismFound": [
        {
          "startIndex": "number",
          "endIndex": "number",
          "sequence": "string"
        }
      ],
      "is_excluded": "boolean"
    }
  ],
  "attackDetected": {
    "zero_width_space": "boolean",
    "homoglyph_attack": "boolean"
  },
  "text": "string",
  "similarWords": [
    {
      "index": "number",
      "word": "string"
    }
  ],
  "citations": ["string"],
  "indexes": [
    {
      "startIndex": "number",
      "endIndex": "number",
      "sequence": "string | null"
    }
  ],
  "credits_used": "integer",
  "credits_remaining": "integer"
}
```

---

### Detail Field Respons

- **status** (`number`): Kode status HTTP.
- **scanInformation** (`object`): Informasi dasar tentang pemindaian.
  - **service** (`string`): Nama layanan yang digunakan.
  - **scanTime** (`string`): Waktu saat pemindaian dilakukan.
  - **inputType** (`string`): Jenis input yang dipindai (`text` | `file` | `website`).
- **result** (`object`): Hasil utama dari pemindaian plagiarisme.
  - **score** (`number`): Skor plagiarisme (persentase).
  - **sourceCounts** (`number`): Jumlah sumber teridentifikasi.
  - **textWordCounts** (`number`): Jumlah total kata dalam teks.
  - **totalPlagiarismWords** (`number`): Jumlah total kata yang terdeteksi plagiat.
  - **identicalWordCounts** (`number`): Jumlah kata plagiat yang identik.
  - **similarWordCounts** (`number`): Jumlah kata plagiat yang mirip.
- **sources** (`object[]`): Array objek, masing-masing mewakili situs web tempat konten yang cocok ditemukan. Setiap objek source memiliki detail seperti score, url, title, plagiarismWords, dll.
- **attackDetected** (`object`): Mendeteksi serangan spasi lebar nol atau homoglyph.
  - **zero_width_space** (`boolean`): Indikasi adanya spasi lebar nol.
  - **homoglyph_attack** (`boolean`): Indikasi adanya serangan homoglyph.
- **text** (`string`): Teks input yang dipindai.
- **similarWords** (`object[]`): Daftar kata-kata serupa yang ditemukan.
- **citations** (`string[]`): Array sitasi yang ditemukan dalam teks.
- **indexes** (`object[]`): Daftar urutan plagiarisme yang ditemukan dalam teks.
- **credits_used** (`integer`): Jumlah kredit yang digunakan untuk permintaan ini.
- **credits_remaining** (`integer`): Sisa kredit di akun Anda.

---

## Contoh Permintaan

### cURL

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

### JavaScript (Fetch)

```javascript
const url = 'https://api.gowinston.ai/v2/plagiarism';
const options = {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <token>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: '<string>',
    file: '<string>',
    website: '<string>',
    excluded_sources: ['<string>'],
    language: 'en',
    country: 'us',
  }),
};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
```

---

## Contoh Respons Error

```json
{
  "error": "<string>",
  "description": "<string>"
}
```
