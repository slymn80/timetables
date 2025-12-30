"""
Time slot label'larını güncelle
Period numarasına göre otomatik label atar
"""
import requests

BASE_URL = "http://localhost:8001/api/v1"

def update_labels():
    # Get all time slots
    response = requests.get(f"{BASE_URL}/time-slots/")
    if response.status_code != 200:
        print("Error fetching time slots")
        return

    time_slots = response.json().get('time_slots', [])

    # Label mapping based on period number
    # Period numbers: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
    label_map = {
        1: "1. Ders",
        2: "1. Ara",
        3: "2. Ders",
        4: "2. Ara",
        5: "3. Ders",
        6: "3. Ara",
        7: "4. Ders",
        8: "4. Ara",
        9: "5. Ders",
        10: "Öğle Arası",
        11: "6. Ders",
        12: "6. Ara",
        13: "7. Ders",
        14: "7. Ara",
        15: "8. Ders",
    }

    updated_count = 0
    error_count = 0

    print(f"\n=== Toplam {len(time_slots)} time slot bulundu ===\n")

    for slot in time_slots:
        slot_id = slot['id']
        period_num = slot['period_number']
        current_label = slot.get('label', '')
        new_label = label_map.get(period_num, f"Period {period_num}")

        # Skip if label is already correct
        if current_label == new_label:
            continue

        # Update the label
        try:
            update_response = requests.put(
                f"{BASE_URL}/time-slots/{slot_id}",
                json={"label": new_label}
            )

            if update_response.status_code == 200:
                updated_count += 1
                print(f"✓ {slot['day']} - Period {period_num}: '{current_label}' → '{new_label}'")
            else:
                error_count += 1
                print(f"✗ Error updating {slot_id}: {update_response.status_code}")
        except Exception as e:
            error_count += 1
            print(f"✗ Exception updating {slot_id}: {str(e)}")

    print(f"\n=== Özet ===")
    print(f"Güncellenen: {updated_count}")
    print(f"Hata: {error_count}")
    print(f"Değişmeyen: {len(time_slots) - updated_count - error_count}")

if __name__ == "__main__":
    update_labels()
