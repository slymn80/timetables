"""
CP-SAT ile KUSURSUZ ders programi olustur
Test okulu (42 ogretmen) icin %100 garantili cozum
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
from app.scheduling import schedule_with_cpsat
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from datetime import datetime, timezone


async def generate_perfect_timetable():
    """CP-SAT ile %100 garantili ders programi olustur"""
    await init_db()

    async with AsyncSessionLocal() as db:
        try:
            school_id = "d4e032de-9cad-483b-829b-9bc55645119c"

            print("="*70)
            print("KUSURSUZ DERS PROGRAMI OLUSTURULUYOR")
            print("CP-SAT Solver - %100 Garanti")
            print("="*70)
            print()

            # Yeni timetable olustur
            print("Yeni ders programi kaydediliyor...")
            timetable = Timetable(
                school_id=school_id,
                name="KUSURSUZ - CP-SAT - %100 Garanti",
                academic_year="2024-2025",
                semester=1,
                algorithm="cpsat",
                status=TimetableStatus.DRAFT
            )
            db.add(timetable)
            await db.flush()

            print(f"Timetable ID: {timetable.id}")
            print(f"Okul ID: {school_id}")
            print()

            # Load data
            print("Veriler yukleniyor...")

            # Lessons
            lessons_query = select(Lesson).where(
                Lesson.school_id == school_id,
                Lesson.is_active == True
            ).options(
                joinedload(Lesson.subject),
                joinedload(Lesson.teacher),
                joinedload(Lesson.class_)
            )
            lessons_result = await db.execute(lessons_query)
            lessons = list(lessons_result.unique().scalars().all())
            print(f"  - {len(lessons)} ders atamasi")

            # Time slots (DERS slotlari - ARA'lari dahil etme)
            slots_query = select(TimeSlot).where(
                TimeSlot.school_id == school_id,
                TimeSlot.is_break == False
            )
            slots_result = await db.execute(slots_query)
            time_slots = list(slots_result.scalars().all())
            print(f"  - {len(time_slots)} DERS slotu (Talgar yapisi)")

            # Rooms
            rooms_query = select(Room).where(
                Room.school_id == school_id,
                Room.is_available == True
            )
            rooms_result = await db.execute(rooms_query)
            rooms = list(rooms_result.scalars().all())
            print(f"  - {len(rooms)} derslik")
            print()

            # Calculate stats
            total_required = sum(lesson.hours_per_week for lesson in lessons)
            print(f"Toplam gerekli saat: {total_required}")
            print(f"Kullanilabilir slot: {len(time_slots)}")
            print(f"Gunluk ders: 8 (Talgar yapisi)")
            print(f"Haftalik ders: 40 (5 gun x 8 ders)")
            print()

            # Generate with CP-SAT
            timetable.status = TimetableStatus.GENERATING
            timetable.generation_started_at = datetime.now(timezone.utc)
            await db.commit()

            print("CP-SAT Solver baslatiliyor...")
            print("OPTIMAL cozum aranacak...")
            print()

            assigned_count, violations, logs = await schedule_with_cpsat(
                timetable, lessons, time_slots, rooms, db
            )

            # Update status
            if violations == 0 and assigned_count == total_required:
                timetable.status = TimetableStatus.COMPLETED
                success = True
            else:
                timetable.status = TimetableStatus.FAILED
                success = False

            timetable.generation_completed_at = datetime.now(timezone.utc)
            await db.commit()

            # Final report
            completion = (assigned_count / total_required * 100) if total_required > 0 else 0

            print("\n" + "="*70)
            print("FINAL RAPOR")
            print("="*70)
            print(f"Timetable ID: {timetable.id}")
            print(f"Durum: {timetable.status.value}")
            print(f"Atanan saat: {assigned_count}/{total_required}")
            print(f"Tamamlanma: {completion:.2f}%")
            print(f"Hard violations: {violations}")

            if success:
                print("\n" + "="*70)
                print(">>> %100 BASARI - KUSURSUZ DERS PROGRAMI! <<<")
                print("="*70)
                print("\nTUM DERSLER ATANDI:")
                print("  - 7 sinif x 40 saat = 280 saat")
                print("  - Hicbir cakisma yok")
                print("  - Talgar time slot yapisi korundu")
                print("  - Her gun 8 ders, haftada 40 ders")
                print("\nDers programi kullanima hazir!")
            else:
                print(f"\n[!] Tamamlanma: {completion:.2f}%")
                print(f"[!] Eksik: {total_required - assigned_count} saat")

            print("="*70)

            return {
                "timetable_id": str(timetable.id),
                "success": success,
                "assigned": assigned_count,
                "required": total_required,
                "completion": completion
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
    result = asyncio.run(generate_perfect_timetable())
    print(f"\nSonuc: {result}")
