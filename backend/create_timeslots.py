import requests
import json

BASE_URL = "http://localhost:8001"
SCHOOL_ID = "133ebcbc-bf3c-46a5-a570-bbbf15aaf4b9"

# Günler (Cumartesi ve Pazar hariç)
days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

# Program şablonu
schedule = [
    # 1. Ders
    {"period": 1, "start": "08:00", "end": "08:45", "is_break": False, "label": "1. Ders"},
    {"period": 2, "start": "08:45", "end": "08:55", "is_break": True, "label": "Teneffüs"},

    # 2. Ders
    {"period": 3, "start": "08:55", "end": "09:40", "is_break": False, "label": "2. Ders"},
    {"period": 4, "start": "09:40", "end": "10:00", "is_break": True, "label": "Uzun Teneffüs"},

    # 3. Ders
    {"period": 5, "start": "10:00", "end": "10:45", "is_break": False, "label": "3. Ders"},
    {"period": 6, "start": "10:45", "end": "10:55", "is_break": True, "label": "Teneffüs"},

    # 4. Ders
    {"period": 7, "start": "10:55", "end": "11:40", "is_break": False, "label": "4. Ders"},
    {"period": 8, "start": "11:40", "end": "11:50", "is_break": True, "label": "Teneffüs"},

    # 5. Ders
    {"period": 9, "start": "11:50", "end": "12:35", "is_break": False, "label": "5. Ders"},
    {"period": 10, "start": "12:35", "end": "13:35", "is_break": True, "label": "Öğle Yemeği"},

    # 6. Ders
    {"period": 11, "start": "13:35", "end": "14:20", "is_break": False, "label": "6. Ders"},
    {"period": 12, "start": "14:20", "end": "14:30", "is_break": True, "label": "Teneffüs"},

    # 7. Ders
    {"period": 13, "start": "14:30", "end": "15:15", "is_break": False, "label": "7. Ders"},
    {"period": 14, "start": "15:15", "end": "15:25", "is_break": True, "label": "Teneffüs"},

    # 8. Ders
    {"period": 15, "start": "15:25", "end": "16:10", "is_break": False, "label": "8. Ders"},
]

def create_time_slots():
    """Her gun icin time slot'lari olustur"""
    created_count = 0

    for day in days:
        print(f"\n{day.capitalize()} icin time slot'lar olusturuluyor...")

        for slot in schedule:
            data = {
                "school_id": SCHOOL_ID,
                "day": day,
                "period_number": slot["period"],
                "start_time": slot["start"],
                "end_time": slot["end"],
                "is_break": slot["is_break"],
                "label": slot["label"],
                "is_active": True
            }

            try:
                response = requests.post(
                    f"{BASE_URL}/api/v1/time-slots/",
                    json=data,
                    headers={"Content-Type": "application/json"}
                )

                if response.status_code == 201:
                    created_count += 1
                    print(f"  [OK] {slot['label']} ({slot['start']}-{slot['end']})")
                else:
                    print(f"  [ERROR] Hata: {slot['label']} - {response.status_code}")
                    print(f"    {response.text}")
            except Exception as e:
                print(f"  [ERROR] Istek hatasi: {e}")

    print(f"\n{'='*50}")
    print(f"Toplam {created_count} time slot olusturuldu!")
    print(f"{'='*50}")

if __name__ == "__main__":
    print("Time Slot'lar oluşturuluyor...")
    print(f"Okul ID: {SCHOOL_ID}")
    create_time_slots()
