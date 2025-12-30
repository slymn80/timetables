# Toplu Veri Ekleme Kılavuzu

Bu döküman toplu veri ekleme işlemlerini açıklar.

## Gereksinimler

Öncelikle pandas kütüphanesini yükleyin:

```bash
pip install pandas openpyxl
```

## Kullanım

### 1. Template Dosyaları

`templates/` klasöründe örnek CSV dosyaları bulunur:
- `teachers_template.csv` - Öğretmenler
- `subjects_template.csv` - Dersler
- `classes_template.csv` - Sınıflar
- `rooms_template.csv` - Odalar

### 2. Veri Hazırlama

Template dosyalarını kopyalayıp kendi verilerinizle doldurun. Excel veya CSV formatında kaydedebilirsiniz.

### 3. Veri Ekleme

Backend klasöründeyken şu komutu çalıştırın:

```bash
# Öğretmenler ekle
py -3.11 bulk_import.py teachers ogretmenler.csv

# Dersler ekle
py -3.11 bulk_import.py subjects dersler.xlsx

# Sınıflar ekle
py -3.11 bulk_import.py classes siniflar.csv

# Odalar ekle
py -3.11 bulk_import.py rooms odalar.csv
```

Script otomatik olarak mevcut okulları listeler ve hangi okula eklemek istediğinizi sorar.

## Alan Açıklamaları

### Öğretmenler (Teachers)

| Alan | Zorunlu | Açıklama | Örnek |
|------|---------|----------|-------|
| first_name | ✓ | Ad | Ahmet |
| last_name | ✓ | Soyad | Yılmaz |
| short_name | | Kısa ad | AY |
| email | | E-posta | ahmet.yilmaz@okul.edu.tr |
| phone | | Telefon | 05551234567 |
| gender | | Cinsiyet (male/female) | male |

### Dersler (Subjects)

| Alan | Zorunlu | Açıklama | Örnek |
|------|---------|----------|-------|
| name | ✓ | Ders adı | Matematik |
| short_code | ✓ | Kısa kod | MAT |
| default_weekly_hours | | Haftalık saat (varsayılan: 2) | 4 |
| grade_level | | Sınıf seviyesi | 9 |

### Sınıflar (Classes)

| Alan | Zorunlu | Açıklama | Örnek |
|------|---------|----------|-------|
| name | ✓ | Sınıf adı | 9-A |
| short_name | | Kısa ad | 9A |
| grade_level | | Sınıf seviyesi | 9 |
| student_count | | Öğrenci sayısı | 30 |
| max_hours_per_day | | Günlük max ders (varsayılan: 8) | 8 |

### Odalar (Rooms)

| Alan | Zorunlu | Açıklama | Örnek |
|------|---------|----------|-------|
| name | ✓ | Oda adı | Sınıf 101 |
| short_name | | Kısa ad | 101 |
| room_type | | Oda tipi (classroom/lab/gym) | classroom |
| capacity | | Kapasite | 35 |

## Örnekler

### 1. Öğretmenler Ekle

```bash
cd backend
py -3.11 bulk_import.py teachers ogretmenler.csv
```

### 2. Excel Dosyasından Dersler Ekle

```bash
py -3.11 bulk_import.py subjects dersler.xlsx
```

### 3. Belirli Bir Okula Ekle (School ID ile)

```bash
py -3.11 bulk_import.py classes siniflar.csv 133ebcbc-bf3c-46a5-a570-bbbf15aaf4b9
```

## Notlar

- CSV dosyalarında UTF-8 encoding kullanın (Türkçe karakterler için)
- Excel kullanıyorsanız `.xlsx` formatında kaydedin
- Hata mesajları hangi satırda problem olduğunu gösterir
- Script her kaydı API'ye gönderir ve sonucu gösterir
- Başarılı ve hatalı kayıt sayıları sonunda raporlanır
