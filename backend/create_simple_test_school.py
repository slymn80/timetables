"""
Test okulu olusturma scripti
- Grup dersleri YOK
- Her subeden bir sinif (5-A, 6-A, 7-A, 8-A, 9-A, 10-A, 11-A)
- Her sinifin haftada 40 saat dersi var
"""
import asyncio
import sys
from pathlib import Path
from datetime import time

sys.path.append(str(Path(__file__).parent))

from app.database import AsyncSessionLocal, init_db
from app.models.school import School
from app.models.teacher import Teacher
from app.models.class_model import Class
from app.models.subject import Subject, RoomType
from app.models.room import Room
from app.models.time_slot import TimeSlot
from app.models.lesson import Lesson


def parse_time(time_str):
    """Convert time string 'HH:MM' to time object"""
    h, m = map(int, time_str.split(':'))
    return time(h, m)


async def create_simple_test_school():
    """Basit test okulu olustur"""
    await init_db()

    async with AsyncSessionLocal() as db:
        try:
            print("Basit test okulu olusturuluyor...")

            # 1. Okul
            print("\n1. Okul olusturuluyor...")
            school = School(
                name="Test Okulu - Grup Dersleri Olmayan",
                short_name="TEST",
                address="Test Adresi",
                phone="+90 312 000 0000",
                email="test@test.edu.tr",
                is_active=True
            )
            db.add(school)
            await db.flush()
            print(f"   [OK] Okul: {school.name}")

            # 2. Dersler (Her sinifin 40 saat dersi olmasi icin cesitli dersler)
            print("\n2. Dersler olusturuluyor...")
            subjects_data = [
                ("Matematik", "MAT"),
                ("Türkçe", "TRK"),
                ("Fen Bilgisi", "FEN"),
                ("Sosyal Bilgiler", "SOS"),
                ("İngilizce", "ING"),
                ("Görsel Sanatlar", "GOR"),
                ("Müzik", "MUZ"),
                ("Beden Eğitimi", "BED"),
                ("Din Kültürü", "DIN"),
                ("Teknoloji Tasarım", "TEK"),
            ]

            subjects = {}
            for name, code in subjects_data:
                subject = Subject(
                    school_id=school.id,
                    name=name,
                    short_code=code,
                    difficulty_level=5,
                    color_code=f"#{hash(code) % 0xFFFFFF:06x}",
                    is_active=True
                )
                db.add(subject)
                subjects[code] = subject

            await db.flush()
            print(f"   [OK] {len(subjects)} ders olusturuldu")

            # 3. Ogretmenler (Her ders icin 2 ogretmen)
            print("\n3. Ogretmenler olusturuluyor...")
            teachers = []
            teacher_names = [
                ("Ahmet", "Yılmaz"), ("Ayşe", "Kaya"), ("Mehmet", "Demir"),
                ("Fatma", "Şahin"), ("Ali", "Öz"), ("Zeynep", "Kurt"),
                ("Mustafa", "Aydın"), ("Elif", "Arslan"), ("Hasan", "Doğan"),
                ("Merve", "Çelik"), ("İbrahim", "Yıldız"), ("Selin", "Koç"),
                ("Osman", "Polat"), ("Canan", "Erdoğan"), ("Emre", "Güneş"),
                ("Derya", "Acar"), ("Burak", "Aksoy"), ("Gül", "Aslan"),
                ("Cem", "Bulut"), ("Deniz", "Yurt")
            ]

            for i, (first, last) in enumerate(teacher_names):
                teacher = Teacher(
                    school_id=school.id,
                    first_name=first,
                    last_name=last,
                    short_name=f"{first[0]}.{last}",
                    email=f"{first.lower()}.{last.lower()}@test.edu.tr",
                    max_hours_per_day=8,
                    max_hours_per_week=40,
                    min_hours_per_week=20,
                    max_consecutive_hours=4,
                    is_active=True
                )
                db.add(teacher)
                teachers.append(teacher)

            await db.flush()
            print(f"   [OK] {len(teachers)} ogretmen olusturuldu")

            # 4. Siniflar (Her subeden bir tane: 5-A, 6-A, 7-A, 8-A, 9-A, 10-A, 11-A)
            print("\n4. Siniflar olusturuluyor...")
            classes = []
            grade_levels = [5, 6, 7, 8, 9, 10, 11]

            for grade in grade_levels:
                class_obj = Class(
                    school_id=school.id,
                    name=f"{grade}-A",
                    short_name=f"{grade}A",
                    grade_level=grade,
                    student_count=30,
                    max_hours_per_day=8,
                    homeroom_teacher_id=teachers[grade % len(teachers)].id,
                    is_active=True
                )
                db.add(class_obj)
                classes.append(class_obj)

            await db.flush()
            print(f"   [OK] {len(classes)} sinif olusturuldu")

            # 5. Derslikler
            print("\n5. Derslikler olusturuluyor...")
            rooms = []
            for i in range(1, 16):
                room = Room(
                    school_id=school.id,
                    name=f"Derslik {i}",
                    short_name=f"D{i}",
                    room_type=RoomType.CLASSROOM,
                    capacity=35,
                    floor=(i - 1) // 5 + 1,
                    is_available=True
                )
                db.add(room)
                rooms.append(room)

            await db.flush()
            print(f"   [OK] {len(rooms)} derslik olusturuldu")

            # 6. Zaman Dilimleri (Pazartesi-Cuma, 8 ders)
            print("\n6. Zaman dilimleri olusturuluyor...")
            days = ["monday", "tuesday", "wednesday", "thursday", "friday"]

            time_slots_data = [
                (1, "08:30", "09:20"),
                (2, "09:30", "10:20"),
                (3, "10:30", "11:20"),
                (4, "11:30", "12:20"),
                (5, "12:20", "13:00"),  # Öğle arası
                (6, "13:00", "13:50"),
                (7, "14:00", "14:50"),
                (8, "15:00", "15:50"),
            ]

            time_slots_count = 0
            for day in days:
                for period, start, end in time_slots_data:
                    is_break = (period == 5)
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
            print(f"   [OK] {time_slots_count} zaman dilimi olusturuldu")

            # 7. Dersler (Her sinifin haftada 40 saat dersi olacak)
            print("\n7. Her sinif icin dersler ataniyor (toplam 40 saat/hafta)...")

            # Her sinif icin ders dagilimi (toplami 40 saat olacak sekilde)
            lesson_distribution = {
                "MAT": 6,  # Matematik
                "TRK": 5,  # Türkçe
                "FEN": 5,  # Fen Bilgisi
                "SOS": 4,  # Sosyal Bilgiler
                "ING": 4,  # İngilizce
                "GOR": 3,  # Görsel Sanatlar
                "MUZ": 3,  # Müzik
                "BED": 4,  # Beden Eğitimi
                "DIN": 3,  # Din Kültürü
                "TEK": 3,  # Teknoloji Tasarım
            }

            total_lessons = 0
            for class_obj in classes:
                class_total_hours = 0
                for subject_code, hours_per_week in lesson_distribution.items():
                    subject = subjects[subject_code]
                    # Öğretmen seçimi (round-robin)
                    teacher = teachers[total_lessons % len(teachers)]

                    lesson = Lesson(
                        school_id=school.id,
                        class_id=class_obj.id,
                        subject_id=subject.id,
                        teacher_id=teacher.id,
                        hours_per_week=hours_per_week,
                        can_split=True,
                        num_groups=1,  # GRUP DERSİ YOK!
                        requires_double_period=False,
                        is_active=True
                    )
                    db.add(lesson)
                    total_lessons += 1
                    class_total_hours += hours_per_week

                print(f"   [OK] {class_obj.name}: {class_total_hours} saat/hafta")

            await db.flush()
            print(f"   [OK] Toplam {total_lessons} ders olusturuldu")

            # Commit
            await db.commit()

            print("\n" + "="*70)
            print("BASIT TEST OKULU BASARIYLA OLUSTURULDU!")
            print("="*70)
            print(f"\nOzet:")
            print(f"  - Okul: {school.name}")
            print(f"  - Siniflar: {len(classes)} (Her subeden bir tane)")
            print(f"  - Dersler (Konu): {len(subjects)}")
            print(f"  - Ogretmenler: {len(teachers)}")
            print(f"  - Derslikler: {len(rooms)}")
            print(f"  - Zaman Dilimleri: {time_slots_count}")
            print(f"  - Toplam Ders Atama: {total_lessons}")
            print(f"  - Her sinif: 40 saat/hafta")
            print(f"  - Grup dersleri: YOK (num_groups=1)")
            print(f"\nOkul ID: {school.id}")
            print()

        except Exception as e:
            await db.rollback()
            print(f"\nHATA: {e}")
            import traceback
            traceback.print_exc()
            raise
        finally:
            await db.close()


if __name__ == "__main__":
    asyncio.run(create_simple_test_school())
