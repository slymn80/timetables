"""
Toplu veri ekleme scripti
Excel veya CSV dosyasından okuyarak API'ye veri ekler
"""
import requests
import pandas as pd
import sys
from pathlib import Path

BASE_URL = "http://localhost:8001/api/v1"

def get_schools():
    """Mevcut okulları listele"""
    response = requests.get(f"{BASE_URL}/schools/")
    if response.status_code == 200:
        schools = response.json()
        print("\n=== Mevcut Okullar ===")
        for i, school in enumerate(schools, 1):
            print(f"{i}. {school['name']} (ID: {school['id']})")
        return schools
    return []

def import_teachers(file_path, school_id):
    """
    Öğretmenleri Excel/CSV'den ekle

    Gerekli kolonlar:
    - first_name: Ad
    - last_name: Soyad
    - short_name: Kısa ad (opsiyonel)
    - email: E-posta (opsiyonel)
    - phone: Telefon (opsiyonel)
    - gender: Cinsiyet (male/female) (opsiyonel)
    """
    df = pd.read_excel(file_path) if file_path.endswith('.xlsx') else pd.read_csv(file_path)

    success_count = 0
    error_count = 0

    print(f"\n=== Öğretmenler Ekleniyor ({len(df)} kayıt) ===")

    for idx, row in df.iterrows():
        teacher_data = {
            "school_id": school_id,
            "first_name": str(row['first_name']),
            "last_name": str(row['last_name']),
            "short_name": str(row.get('short_name', '')) if pd.notna(row.get('short_name')) else None,
            "email": str(row.get('email', '')) if pd.notna(row.get('email')) else None,
            "phone": str(row.get('phone', '')) if pd.notna(row.get('phone')) else None,
            "gender": str(row.get('gender', '')) if pd.notna(row.get('gender')) else None,
        }

        # Boş string'leri None'a çevir
        teacher_data = {k: v if v != '' else None for k, v in teacher_data.items()}

        try:
            response = requests.post(f"{BASE_URL}/teachers/", json=teacher_data)
            if response.status_code == 201:
                success_count += 1
                result = response.json()
                print(f"✓ {result['first_name']} {result['last_name']} eklendi")
            else:
                error_count += 1
                print(f"✗ Hata (satır {idx+2}): {response.text}")
        except Exception as e:
            error_count += 1
            print(f"✗ Hata (satır {idx+2}): {str(e)}")

    print(f"\nBaşarılı: {success_count}, Hata: {error_count}")

def import_subjects(file_path, school_id):
    """
    Dersleri Excel/CSV'den ekle

    Gerekli kolonlar:
    - name: Ders adı
    - short_code: Kısa kod
    - default_weekly_hours: Haftalık saat (opsiyonel, varsayılan 2)
    - grade_level: Sınıf seviyesi (opsiyonel)
    """
    df = pd.read_excel(file_path) if file_path.endswith('.xlsx') else pd.read_csv(file_path)

    success_count = 0
    error_count = 0

    print(f"\n=== Dersler Ekleniyor ({len(df)} kayıt) ===")

    for idx, row in df.iterrows():
        subject_data = {
            "school_id": school_id,
            "name": str(row['name']),
            "short_code": str(row['short_code']),
            "default_weekly_hours": int(row.get('default_weekly_hours', 2)) if pd.notna(row.get('default_weekly_hours')) else 2,
            "grade_level": str(row.get('grade_level', '')) if pd.notna(row.get('grade_level')) else None,
        }

        # Boş string'leri None'a çevir
        subject_data = {k: v if v != '' else None for k, v in subject_data.items()}

        try:
            response = requests.post(f"{BASE_URL}/subjects/", json=subject_data)
            if response.status_code == 201:
                success_count += 1
                result = response.json()
                print(f"✓ {result['name']} ({result['short_code']}) eklendi")
            else:
                error_count += 1
                print(f"✗ Hata (satır {idx+2}): {response.text}")
        except Exception as e:
            error_count += 1
            print(f"✗ Hata (satır {idx+2}): {str(e)}")

    print(f"\nBaşarılı: {success_count}, Hata: {error_count}")

def import_classes(file_path, school_id):
    """
    Sınıfları Excel/CSV'den ekle

    Gerekli kolonlar:
    - name: Sınıf adı (örn: "9-A")
    - short_name: Kısa ad (opsiyonel)
    - grade_level: Sınıf seviyesi (örn: "9")
    - student_count: Öğrenci sayısı (opsiyonel)
    - max_hours_per_day: Günlük max ders saati (opsiyonel, varsayılan 8)
    """
    df = pd.read_excel(file_path) if file_path.endswith('.xlsx') else pd.read_csv(file_path)

    success_count = 0
    error_count = 0

    print(f"\n=== Sınıflar Ekleniyor ({len(df)} kayıt) ===")

    for idx, row in df.iterrows():
        class_data = {
            "school_id": school_id,
            "name": str(row['name']),
            "short_name": str(row.get('short_name', '')) if pd.notna(row.get('short_name')) else None,
            "grade_level": str(row.get('grade_level', '')) if pd.notna(row.get('grade_level')) else None,
            "student_count": int(row.get('student_count', 0)) if pd.notna(row.get('student_count')) else None,
            "max_hours_per_day": int(row.get('max_hours_per_day', 8)) if pd.notna(row.get('max_hours_per_day')) else 8,
        }

        # Boş string'leri None'a çevir
        class_data = {k: v if v != '' else None for k, v in class_data.items()}

        try:
            response = requests.post(f"{BASE_URL}/classes/", json=class_data)
            if response.status_code == 201:
                success_count += 1
                result = response.json()
                print(f"✓ {result['name']} eklendi")
            else:
                error_count += 1
                print(f"✗ Hata (satır {idx+2}): {response.text}")
        except Exception as e:
            error_count += 1
            print(f"✗ Hata (satır {idx+2}): {str(e)}")

    print(f"\nBaşarılı: {success_count}, Hata: {error_count}")

def import_rooms(file_path, school_id):
    """
    Odaları Excel/CSV'den ekle

    Gerekli kolonlar:
    - name: Oda adı
    - short_name: Kısa ad (opsiyonel)
    - room_type: Oda tipi (classroom/lab/gym/etc) (opsiyonel)
    - capacity: Kapasite (opsiyonel)
    """
    df = pd.read_excel(file_path) if file_path.endswith('.xlsx') else pd.read_csv(file_path)

    success_count = 0
    error_count = 0

    print(f"\n=== Odalar Ekleniyor ({len(df)} kayıt) ===")

    for idx, row in df.iterrows():
        room_data = {
            "school_id": school_id,
            "name": str(row['name']),
            "short_name": str(row.get('short_name', '')) if pd.notna(row.get('short_name')) else None,
            "room_type": str(row.get('room_type', 'classroom')) if pd.notna(row.get('room_type')) else 'classroom',
            "capacity": int(row.get('capacity', 30)) if pd.notna(row.get('capacity')) else 30,
        }

        # Boş string'leri None'a çevir
        room_data = {k: v if v != '' else None for k, v in room_data.items()}

        try:
            response = requests.post(f"{BASE_URL}/rooms/", json=room_data)
            if response.status_code == 201:
                success_count += 1
                result = response.json()
                print(f"✓ {result['name']} eklendi")
            else:
                error_count += 1
                print(f"✗ Hata (satır {idx+2}): {response.text}")
        except Exception as e:
            error_count += 1
            print(f"✗ Hata (satır {idx+2}): {str(e)}")

    print(f"\nBaşarılı: {success_count}, Hata: {error_count}")

def main():
    if len(sys.argv) < 3:
        print("Kullanım: py bulk_import.py <veri_tipi> <dosya_yolu> [school_id]")
        print("\nVeri Tipleri:")
        print("  teachers  - Öğretmenler")
        print("  subjects  - Dersler")
        print("  classes   - Sınıflar")
        print("  rooms     - Odalar")
        print("\nÖrnek:")
        print("  py bulk_import.py teachers ogretmenler.xlsx")
        print("  py bulk_import.py subjects dersler.csv")
        return

    data_type = sys.argv[1]
    file_path = sys.argv[2]

    if not Path(file_path).exists():
        print(f"Hata: Dosya bulunamadı: {file_path}")
        return

    # Okul listesini göster
    schools = get_schools()
    if not schools:
        print("Hata: Hiç okul bulunamadı!")
        return

    # School ID al
    if len(sys.argv) > 3:
        school_id = sys.argv[3]
    else:
        school_num = input("\nOkul numarasını seçin: ")
        try:
            school_id = schools[int(school_num) - 1]['id']
        except (ValueError, IndexError):
            print("Geçersiz okul numarası!")
            return

    # İlgili import fonksiyonunu çağır
    import_functions = {
        'teachers': import_teachers,
        'subjects': import_subjects,
        'classes': import_classes,
        'rooms': import_rooms,
    }

    if data_type not in import_functions:
        print(f"Hata: Geçersiz veri tipi: {data_type}")
        print(f"Geçerli tipler: {', '.join(import_functions.keys())}")
        return

    import_functions[data_type](file_path, school_id)

if __name__ == "__main__":
    main()
