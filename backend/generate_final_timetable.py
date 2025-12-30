"""
Ders programi olustur - 42 ogretmenli test okulu icin
Hedef: %100 atama
"""
import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from app.database import AsyncSessionLocal, init_db
from app.models.timetable import Timetable, TimetableStatus
from app.models.lesson import Lesson
from app.models.time_slot import TimeSlot
from app.models.room import Room
from app.scheduling import schedule_lessons_improved
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload
from datetime import datetime, timezone


async def generate_final_timetable():
    """42 ogretmenli test okulu icin ders programi olustur"""
    await init_db()

    async with AsyncSessionLocal() as db:
        try:
            # Timetable'i bul
            timetable_id = "d9f403ac-1ccf-430d-9ac5-484567d8fdea"
            print(f"Ders programi yukleniyor: {timetable_id}")

            query = select(Timetable).where(Timetable.id == timetable_id)
            result = await db.execute(query)
            timetable = result.scalar_one_or_none()

            if not timetable:
                print("Ders programi bulunamadi!")
                return

            print(f"Ders programi: {timetable.name}")
            print(f"Okul ID: {timetable.school_id}")
            print(f"Durum: {timetable.status}")
            print()

            # Update status to generating
            timetable.status = TimetableStatus.GENERATING
            timetable.generation_started_at = datetime.now(timezone.utc)
            await db.commit()

            # Load necessary data with eager loading
            print("Dersler yukleniyor...")
            lessons_query = select(Lesson).where(
                Lesson.school_id == timetable.school_id,
                Lesson.is_active == True
            ).options(
                joinedload(Lesson.subject),
                joinedload(Lesson.teacher),
                joinedload(Lesson.class_)
            )
            lessons_result = await db.execute(lessons_query)
            lessons = list(lessons_result.unique().scalars().all())
            print(f"  - {len(lessons)} ders yuklendi")

            print("Zaman dilimleri yukleniyor...")
            slots_query = select(TimeSlot).where(
                TimeSlot.school_id == timetable.school_id,
                TimeSlot.is_active == True,
                TimeSlot.is_break == False  # Only lesson slots
            )
            slots_result = await db.execute(slots_query)
            time_slots = list(slots_result.scalars().all())
            print(f"  - {len(time_slots)} zaman dilimi yuklendi")

            print("Derslikler yukleniyor...")
            rooms_query = select(Room).where(
                Room.school_id == timetable.school_id,
                Room.is_available == True
            )
            rooms_result = await db.execute(rooms_query)
            rooms = list(rooms_result.scalars().all())
            print(f"  - {len(rooms)} derslik yuklendi")
            print()

            # Run scheduling algorithm
            print("Scheduler baslatiliyor...")
            print("Ders programi olusturuluyor...")
            print("Bu islem birka dakika surebilir...")
            print()

            assigned_count, hard_violations, logs = await schedule_lessons_improved(
                timetable, lessons, time_slots, rooms, db
            )

            # Update timetable status
            if hard_violations == 0 and assigned_count > 0:
                timetable.status = TimetableStatus.GENERATED
            else:
                timetable.status = TimetableStatus.FAILED

            timetable.generation_completed_at = datetime.now(timezone.utc)
            await db.commit()

            # Calculate stats
            total_required = sum(lesson.hours_per_week for lesson in lessons)
            completion = (assigned_count / total_required * 100) if total_required > 0 else 0

            print("\n" + "="*70)
            print("DERS PROGRAMI OLUSTURULDU!")
            print("="*70)
            print(f"\nSonuc:")
            print(f"  - Durum: {timetable.status.value}")
            print(f"  - Atanan saat: {assigned_count}")
            print(f"  - Gereken saat: {total_required}")
            print(f"  - Tamamlanma: {completion:.2f}%")
            print(f"  - Hard violations: {hard_violations}")
            print()

            # Print some logs
            if logs:
                print("Son 10 log mesaji:")
                for log in logs[-10:]:
                    print(f"  {log}")

            return {
                "status": timetable.status.value,
                "total_assigned_hours": assigned_count,
                "total_required_hours": total_required,
                "completion_percentage": completion,
                "hard_violations": hard_violations
            }

        except Exception as e:
            if 'timetable' in locals():
                timetable.status = TimetableStatus.FAILED
                await db.commit()
            print(f"\nHATA: {e}")
            import traceback
            traceback.print_exc()
            raise
        finally:
            await db.close()


if __name__ == "__main__":
    asyncio.run(generate_final_timetable())
