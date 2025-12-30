"""
Talgar lisesinin time slot yapisini incele
"""
import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from app.database import AsyncSessionLocal, init_db
from app.models.school import School
from app.models.time_slot import TimeSlot
from sqlalchemy import select


async def get_talgar_timeslots():
    """Talgar lisesinin time slot yapisini al"""
    await init_db()

    async with AsyncSessionLocal() as db:
        try:
            # Talgar okulunu bul
            print("Talgar okulunu ariyorum...")
            schools_query = select(School).where(School.name.like('%algar%'))
            schools_result = await db.execute(schools_query)
            schools = list(schools_result.scalars().all())

            if not schools:
                print("Talgar okulu bulunamadi!")
                return

            for school in schools:
                print(f"\nOkul bulundu: {school.name} (ID: {school.id})")

                # Time slot'lari al
                slots_query = select(TimeSlot).where(
                    TimeSlot.school_id == school.id
                ).order_by(TimeSlot.day, TimeSlot.period_number)

                slots_result = await db.execute(slots_query)
                slots = list(slots_result.scalars().all())

                print(f"Toplam {len(slots)} time slot bulundu\n")

                # Gunlere gore grupla
                days_dict = {}
                for slot in slots:
                    day = slot.day
                    if day not in days_dict:
                        days_dict[day] = []
                    days_dict[day].append(slot)

                # Her gun icin yazdır
                for day in ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]:
                    if day in days_dict:
                        day_slots = days_dict[day]
                        print(f"\n{day}:")
                        print("="*80)

                        ders_count = 0
                        ara_count = 0

                        for slot in day_slots:
                            slot_type = "ARA" if slot.is_break else "DERS"
                            label = slot.label if slot.label else ""

                            if slot.is_break:
                                ara_count += 1
                            else:
                                ders_count += 1

                            print(f"  Period {slot.period_number:2d}: {slot.start_time.strftime('%H:%M')} - {slot.end_time.strftime('%H:%M')}  [{slot_type:4s}] {label}")

                        print(f"\n  Toplam DERS slot: {ders_count}")
                        print(f"  Toplam ARA slot: {ara_count}")

                # Ozet
                total_ders = sum(1 for slot in slots if not slot.is_break)
                total_ara = sum(1 for slot in slots if slot.is_break)

                print("\n" + "="*80)
                print("OZET:")
                print("="*80)
                print(f"Toplam slot sayisi: {len(slots)}")
                print(f"Toplam DERS slot: {total_ders}")
                print(f"Toplam ARA slot: {total_ara}")
                print(f"\nHaftalik kullanilabilir ders slotu: {total_ders}")
                print("="*80)

        except Exception as e:
            print(f"\nHATA: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await db.close()


if __name__ == "__main__":
    asyncio.run(get_talgar_timeslots())
