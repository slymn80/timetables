"""
Talgar lisesinin time slot'larini kopyala
"""
import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from app.database import AsyncSessionLocal, init_db
from app.models.school import School
from app.models.time_slot import TimeSlot
from sqlalchemy import select
import json


async def copy_talgar_slots():
    """Talgar lisesinin time slot yapisini kopyala"""
    await init_db()

    async with AsyncSessionLocal() as db:
        try:
            # Talgar okulunu bul
            schools_query = select(School).where(School.name.like('%algar%'))
            schools_result = await db.execute(schools_query)
            school = schools_result.scalar_one_or_none()

            if not school:
                print("Talgar okulu bulunamadi!")
                return None

            print(f"Talgar okulu: {school.name}")
            print(f"Okul ID: {school.id}\n")

            # Time slot'lari al
            slots_query = select(TimeSlot).where(
                TimeSlot.school_id == school.id,
                TimeSlot.is_active == True
            ).order_by(TimeSlot.day, TimeSlot.period_number)

            slots_result = await db.execute(slots_query)
            slots = list(slots_result.scalars().all())

            print(f"Toplam {len(slots)} time slot bulundu\n")

            # Slot'lari detayli yazdır
            slot_data = []
            current_day = None

            for slot in slots:
                if slot.day != current_day:
                    current_day = slot.day
                    print(f"\n{slot.day}:")
                    print("-" * 70)

                slot_type = "ARA" if slot.is_break else "DERS"
                label = slot.label or ""

                print(f"  {slot.period_number:2d}. {slot.start_time.strftime('%H:%M')}-{slot.end_time.strftime('%H:%M')} [{slot_type:4s}] {label}")

                slot_data.append({
                    "day": slot.day,
                    "period_number": slot.period_number,
                    "start_time": slot.start_time.strftime('%H:%M'),
                    "end_time": slot.end_time.strftime('%H:%M'),
                    "is_break": slot.is_break,
                    "label": label
                })

            # JSON olarak kaydet
            with open('talgar_timeslots.json', 'w', encoding='utf-8') as f:
                json.dump(slot_data, f, ensure_ascii=False, indent=2)

            print(f"\n\nTime slot'lar 'talgar_timeslots.json' dosyasina kaydedildi.")

            # Ozet
            ders_count = sum(1 for s in slots if not s.is_break)
            ara_count = sum(1 for s in slots if s.is_break)

            print("\n" + "="*70)
            print("OZET:")
            print("="*70)
            print(f"Toplam DERS slot: {ders_count}")
            print(f"Toplam ARA slot: {ara_count}")
            print(f"Toplam slot: {len(slots)}")
            print("="*70)

            return slot_data

        except Exception as e:
            print(f"\nHATA: {e}")
            import traceback
            traceback.print_exc()
            return None
        finally:
            await db.close()


if __name__ == "__main__":
    asyncio.run(copy_talgar_slots())
