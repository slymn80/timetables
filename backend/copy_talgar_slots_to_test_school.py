"""
Talgar'in time slotlarini test okuluna kopyala
"""
import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from app.database import AsyncSessionLocal, init_db
from app.models.time_slot import TimeSlot
from app.models.school import School
from sqlalchemy import select


async def copy_slots():
    await init_db()

    async with AsyncSessionLocal() as db:
        try:
            # Talgar okulunu bul
            print("Talgar okulu araniyor...")
            result = await db.execute(select(School).where(School.name.like('%algar%')))
            talgar = result.scalars().first()

            if not talgar:
                print("Talgar bulunamadi!")
                return

            print(f"Talgar: {talgar.name} (ID: {talgar.id})")

            # Test okulunu bul
            test_school_id = "d4e032de-9cad-483b-829b-9bc55645119c"
            result = await db.execute(select(School).where(School.id == test_school_id))
            test_school = result.scalar_one_or_none()

            if not test_school:
                print("Test okulu bulunamadi!")
                return

            print(f"Test okulu: {test_school.name} (ID: {test_school.id})")

            # Talgar'in slotlarini al
            print("\nTalgar'in time slotlari yukleniyor...")
            result = await db.execute(
                select(TimeSlot).where(
                    TimeSlot.school_id == talgar.id,
                    TimeSlot.is_active == True
                ).order_by(TimeSlot.day, TimeSlot.period_number)
            )
            talgar_slots = list(result.scalars().all())
            print(f"  - {len(talgar_slots)} slot bulundu")

            # Test okulunun mevcut slotlarini sil
            print("\nTest okulunun mevcut slotlari siliniyor...")
            result = await db.execute(select(TimeSlot).where(TimeSlot.school_id == test_school_id))
            existing_slots = list(result.scalars().all())
            for slot in existing_slots:
                await db.delete(slot)
            await db.flush()
            print(f"  - {len(existing_slots)} slot silindi")

            # Talgar'in slotlarini test okuluna kopyala
            print("\nSlotlar kopyalaniyor...")
            ders_count = 0
            ara_count = 0

            for slot in talgar_slots:
                new_slot = TimeSlot(
                    school_id=test_school_id,
                    template_id=slot.template_id,
                    day=slot.day,
                    period_number=slot.period_number,
                    start_time=slot.start_time,
                    end_time=slot.end_time,
                    is_break=slot.is_break,
                    label=slot.label,
                    is_active=True
                )
                db.add(new_slot)

                if slot.is_break:
                    ara_count += 1
                else:
                    ders_count += 1

            await db.commit()

            print("\n" + "="*70)
            print("SLOTLAR BASARIYLA KOPYALANDI!")
            print("="*70)
            print(f"Toplam slot: {len(talgar_slots)}")
            print(f"DERS slotlari: {ders_count}")
            print(f"ARA slotlari: {ara_count}")
            print(f"\nTalgar'dan -> Test okuluna kopyalandi")
            print("="*70)

        except Exception as e:
            await db.rollback()
            print(f"HATA: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await db.close()


if __name__ == "__main__":
    asyncio.run(copy_slots())
