"""
Seed data script for smoke testing
Creates sample schools, teachers, classes, subjects, rooms, time slots, and lessons
"""
import asyncio
import sys
from pathlib import Path
from datetime import time

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from app.database import AsyncSessionLocal, init_db
from app.models.school import School
from app.models.teacher import Teacher, DayOfWeek
from app.models.class_model import Class
from app.models.subject import Subject, RoomType
from app.models.room import Room
from app.models.time_slot import TimeSlot
from app.models.lesson import Lesson


def parse_time(time_str):
    """Convert time string 'HH:MM' to time object"""
    h, m = map(int, time_str.split(':'))
    return time(h, m)


async def seed_data():
    """Seed database with sample data"""
    # Initialize database tables first
    await init_db()

    async with AsyncSessionLocal() as db:
        try:
            print("Starting data seeding...")

            # 1. Create School
            print("\nCreating school...")
            school = School(
                name="Atatürk Anadolu Lisesi",
                short_name="AAL",
                address="Atatürk Caddesi No:123, Ankara",
                phone="+90 312 123 4567",
                email="info@aal.edu.tr",
                website="https://aal.edu.tr",
                is_active=True
            )
            db.add(school)
            await db.flush()  # Get the ID
            print(f"School created: {school.name}")

            # 2. Create Subjects (10 dersler)
            print("\nCreating subjects...")
            subjects_data = [
                ("Türk Dili ve Edebiyatı", "TDE", 7),
                ("Matematik", "MAT", 9),
                ("Fizik", "FIZ", 8),
                ("Kimya", "KIM", 8),
                ("Biyoloji", "BIO", 7),
                ("Tarih", "TAR", 6),
                ("Coğrafya", "COG", 6),
                ("İngilizce", "ING", 7),
                ("Beden Eğitimi", "BED", 4),
                ("Görsel Sanatlar", "GOR", 5),
            ]

            subjects = []
            for name, code, difficulty in subjects_data:
                subject = Subject(
                    school_id=school.id,
                    name=name,
                    short_code=code,
                    difficulty_level=difficulty,
                    color_code=f"#{hash(code) % 0xFFFFFF:06x}",
                    is_active=True
                )
                db.add(subject)
                subjects.append(subject)

            await db.flush()
            print(f"Created {len(subjects)} subjects")

            # 3. Create Teachers (25 öğretmen)
            print("\nCreating teachers...")
            teachers_data = [
                # Türk Dili öğretmenleri
                ("Ayşe", "Yılmaz", "A.Yılmaz"),
                ("Mehmet", "Demir", "M.Demir"),
                ("Fatma", "Şahin", "F.Şahin"),
                # Matematik öğretmenleri
                ("Ali", "Kaya", "A.Kaya"),
                ("Zeynep", "Öztürk", "Z.Öztürk"),
                ("Ahmet", "Aydın", "A.Aydın"),
                # Fizik öğretmenleri
                ("Elif", "Arslan", "E.Arslan"),
                ("Mustafa", "Doğan", "M.Doğan"),
                # Kimya öğretmenleri
                ("Selin", "Kurt", "S.Kurt"),
                ("Can", "Özkan", "C.Özkan"),
                # Biyoloji öğretmenleri
                ("Deniz", "Çelik", "D.Çelik"),
                ("Emre", "Yıldız", "E.Yıldız"),
                # Tarih öğretmenleri
                ("Gül", "Acar", "G.Acar"),
                ("Burak", "Koç", "B.Koç"),
                # Coğrafya öğretmenleri
                ("Merve", "Şen", "M.Şen"),
                ("Cem", "Aksoy", "C.Aksoy"),
                # İngilizce öğretmenleri
                ("Ebru", "Polat", "E.Polat"),
                ("Serkan", "Erdoğan", "S.Erdoğan"),
                ("Aylin", "Yavuz", "A.Yavuz"),
                # Beden Eğitimi öğretmenleri
                ("Oğuz", "Güneş", "O.Güneş"),
                ("Derya", "Aslan", "D.Aslan"),
                # Görsel Sanatlar öğretmenleri
                ("Nil", "Bulut", "N.Bulut"),
                ("Kaan", "Yurt", "K.Yurt"),
                # Ek öğretmenler
                ("Seda", "Kılıç", "S.Kılıç"),
                ("Berk", "Ay", "B.Ay"),
            ]

            teachers = []
            for first, last, short in teachers_data:
                teacher = Teacher(
                    school_id=school.id,
                    first_name=first,
                    last_name=last,
                    short_name=short,
                    email=f"{short.lower().replace('.', '')}@aal.edu.tr",
                    max_hours_per_day=6,
                    max_hours_per_week=30,
                    min_hours_per_week=18,
                    max_consecutive_hours=4,
                    color_code=f"#{hash(short) % 0xFFFFFF:06x}",
                    is_active=True
                )
                db.add(teacher)
                teachers.append(teacher)

            await db.flush()
            print(f"Created {len(teachers)} teachers")

            # 4. Create Classes (10 sınıf)
            print("\nCreating classes...")
            classes_data = [
                ("9-A", "9A", 9, 30),
                ("9-B", "9B", 9, 28),
                ("10-A", "10A", 10, 32),
                ("10-B", "10B", 10, 30),
                ("11-A", "11A", 11, 28),
                ("11-B", "11B", 11, 26),
                ("12-A", "12A", 12, 25),
                ("12-B", "12B", 12, 27),
                ("12-C", "12C", 12, 24),
                ("12-D", "12D", 12, 26),
            ]

            classes = []
            for name, short, grade, count in classes_data:
                class_obj = Class(
                    school_id=school.id,
                    name=name,
                    short_name=short,
                    grade_level=grade,
                    student_count=count,
                    max_hours_per_day=8,
                    homeroom_teacher_id=teachers[len(classes) % len(teachers)].id,
                    color_code=f"#{hash(name) % 0xFFFFFF:06x}",
                    is_active=True
                )
                db.add(class_obj)
                classes.append(class_obj)

            await db.flush()
            print(f"Created {len(classes)} classes")

            # 5. Create Rooms (10 derslik)
            print("\nCreating rooms...")
            rooms = []
            for i in range(1, 11):
                room = Room(
                    school_id=school.id,
                    name=f"Derslik {i}",
                    short_name=f"D{i}",
                    room_type=RoomType.CLASSROOM,
                    capacity=35,
                    floor=(i - 1) // 5 + 1,  # 5 rooms per floor
                    building="Ana Bina",
                    is_available=True
                )
                db.add(room)
                rooms.append(room)

            await db.flush()
            print(f"Created {len(rooms)} rooms")

            # 6. Create Time Slots (Pazartesi-Cuma: 8:30-16:00, 8 ders + öğle arası)
            print("\nCreating time slots...")
            days = ["monday", "tuesday", "wednesday", "thursday", "friday"]

            # Normal günler için zaman dilimleri
            time_slots_weekday = [
                (1, "08:30", "09:10", False),
                (2, "09:20", "10:00", False),
                (3, "10:10", "10:50", False),
                (4, "11:00", "11:40", False),
                (5, "11:40", "12:30", True),  # Öğle arası
                (6, "12:30", "13:10", False),
                (7, "13:20", "14:00", False),
                (8, "14:10", "14:50", False),
                (9, "15:00", "15:40", False),
            ]

            time_slots_count = 0
            for day in days:
                for period, start, end, is_break in time_slots_weekday:
                    slot = TimeSlot(
                        school_id=school.id,
                        day=day,
                        period_number=period,
                        start_time=parse_time(start),
                        end_time=parse_time(end),
                        is_break=is_break
                    )
                    db.add(slot)
                    time_slots_count += 1

            # Cumartesi-Pazar kurs programı
            weekend_days = ["saturday", "sunday"]
            time_slots_weekend = [
                (1, "09:00", "09:40", False),
                (2, "09:50", "10:30", False),
                (3, "10:40", "11:20", False),
                (4, "11:30", "12:10", False),
                (5, "12:10", "13:00", True),  # Öğle arası
                (6, "13:00", "13:40", False),
                (7, "13:50", "14:30", False),
            ]

            for day in weekend_days:
                for period, start, end, is_break in time_slots_weekend:
                    slot = TimeSlot(
                        school_id=school.id,
                        day=day,
                        period_number=period,
                        start_time=parse_time(start),
                        end_time=parse_time(end),
                        is_break=is_break
                    )
                    db.add(slot)
                    time_slots_count += 1

            await db.flush()
            print(f"Created {time_slots_count} time slots")

            # 7. Create Lessons (Her sınıf için 10 ders)
            print("\nCreating lessons...")
            lessons_count = 0

            # Her sınıf için tüm dersleri ata
            for class_obj in classes:
                for i, subject in enumerate(subjects):
                    # Öğretmen ataması (her dersin farklı öğretmeni olabilir)
                    teacher = teachers[i % len(teachers)]

                    # Haftalık ders saati (9. sınıf için daha az, 12. sınıf için daha fazla)
                    hours_per_week = 3 if class_obj.grade_level == 9 else 4
                    if subject.short_code in ["MAT", "FIZ", "KIM"]:
                        hours_per_week += 1  # STEM derslerine ekstra saat

                    lesson = Lesson(
                        school_id=school.id,
                        class_id=class_obj.id,
                        subject_id=subject.id,
                        teacher_id=teacher.id,
                        hours_per_week=hours_per_week,
                        can_split=False,
                        num_groups=1,
                        requires_double_period=(subject.short_code in ["FIZ", "KIM", "BIO"]),
                        is_active=True
                    )
                    db.add(lesson)
                    lessons_count += 1

            await db.flush()
            print(f"Created {lessons_count} lessons")

            # Commit all changes
            await db.commit()

            print("\n" + "="*60)
            print("Data seeding completed successfully!")
            print("="*60)
            print(f"\nSummary:")
            print(f"  • Schools: 1")
            print(f"  • Teachers: {len(teachers)}")
            print(f"  • Classes: {len(classes)}")
            print(f"  • Subjects: {len(subjects)}")
            print(f"  • Rooms: {len(rooms)}")
            print(f"  • Time Slots: {time_slots_count}")
            print(f"  • Lessons: {lessons_count}")
            print()

        except Exception as e:
            await db.rollback()
            print(f"\nError seeding data: {e}")
            import traceback
            traceback.print_exc()
            raise
        finally:
            await db.close()


if __name__ == "__main__":
    print("Starting seed data script...")
    asyncio.run(seed_data())
