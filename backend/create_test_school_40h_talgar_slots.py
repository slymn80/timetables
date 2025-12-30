"""
Test okulu - 40 saat/hafta - TALGAR TIME SLOT YAPISI
- Grup dersleri YOK
- Her subeden bir sinif (5-A, 6-A, 7-A, 8-A, 9-A, 10-A, 11-A)
- Her sinifin haftada 40 saat dersi var
- TALGAR TIME SLOT YAPISI KULLANILIYOR (5 gun x 8 ders = 40 slot)
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


async def create_test_school_40h_talgar():
    """Test okulu olustur - 40 saat/hafta - TALGAR TIME SLOT"""
    await init_db()

    async with AsyncSessionLocal() as db:
        try:
            print("Test okulu olusturuluyor (40 saat/hafta - TALGAR TIME SLOT)...")

            # 1. Okul
            print("\n1. Okul olusturuluyor...")
            school = School(
                name="Test Okulu - 40 Saat - Talgar Time Slot (Grup Dersleri Yok)",
                short_name="TEST40",
                address="Test Adresi",
                phone="+90 312 000 0000",
                email="test40@test.edu.tr",
                is_active=True
            )
            db.add(school)
            await db.flush()
            print(f"   [OK] Okul: {school.name}")

            # 2. Dersler
            print("\n2. Dersler olusturuluyor...")
            subjects_data = [
                ("Matematik", "MAT"),
                ("Turkce", "TRK"),
                ("Fen Bilgisi", "FEN"),
                ("Sosyal Bilgiler", "SOS"),
                ("Ingilizce", "ING"),
                ("Gorsel Sanatlar", "GOR"),
                ("Muzik", "MUZ"),
                ("Beden Egitimi", "BED"),
                ("Din Kulturu", "DIN"),
                ("Teknoloji Tasarim", "TEK"),
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

            # 3. Ogretmenler
            print("\n3. Ogretmenler olusturuluyor...")
            teachers = []
            teacher_names = [
                ("Ahmet", "Yilmaz"), ("Ayse", "Kaya"), ("Mehmet", "Demir"),
                ("Fatma", "Sahin"), ("Ali", "Oz"), ("Zeynep", "Kurt"),
                ("Mustafa", "Aydin"), ("Elif", "Arslan"), ("Hasan", "Dogan"),
                ("Merve", "Celik"), ("Ibrahim", "Yildiz"), ("Selin", "Koc"),
                ("Osman", "Polat"), ("Canan", "Erdogan"), ("Emre", "Gunes"),
                ("Derya", "Acar"), ("Burak", "Aksoy"), ("Gul", "Aslan"),
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

            # 4. Siniflar
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

            # 6. TALGAR TIME SLOT YAPISI
            print("\n6. Zaman dilimleri olusturuluyor (TALGAR TIME SLOT YAPISI)...")
            days = ["monday", "tuesday", "wednesday", "thursday", "friday"]

            # TALGAR YAPISINA GORE: Her gun 8 DERS + 7 ARA
            talgar_schedule = [
                (1, "08:30", "09:10", False, "1. Ders"),
                (1, "09:10", "09:20", True, "1. Ara"),
                (4, "09:20", "10:00", False, "2. Ders"),
                (5, "10:00", "10:10", True, "2. Ara"),
                (6, "10:10", "10:50", False, "3. Ders"),
                (7, "10:50", "11:00", True, "3. Ara"),
                (8, "11:00", "11:40", False, "4. Ders"),
                (9, "11:40", "11:50", True, "4. Ara"),
                (10, "11:50", "12:30", False, "5. Ders"),
                (11, "12:30", "12:40", True, "5. Ara"),
                (12, "12:40", "13:20", False, "6. Ders"),
                (13, "13:20", "13:30", True, "6. Ara"),
                (14, "13:30", "14:10", False, "7. Ders"),
                (15, "14:10", "14:20", True, "7. Ara"),
                (15, "14:20", "15:00", False, "8. Ders"),
            ]

            time_slots_count = 0
            ders_count = 0
            ara_count = 0

            for day in days:
                for period, start, end, is_break, label in talgar_schedule:
                    slot = TimeSlot(
                        school_id=school.id,
                        day=day,
                        period_number=period,
                        start_time=parse_time(start),
                        end_time=parse_time(end),
                        is_break=is_break,
                        label=label
                    )
                    db.add(slot)
                    time_slots_count += 1

                    if is_break:
                        ara_count += 1
                    else:
                        ders_count += 1

            await db.flush()
            print(f"   [OK] {time_slots_count} zaman dilimi olusturuldu")
            print(f"   [OK] {ders_count} DERS slotu (5 gun x 8 ders = 40)")
            print(f"   [OK] {ara_count} ARA slotu")

            # 7. Dersler (Her sinifin haftada 40 saat dersi olacak)
            print("\n7. Her sinif icin dersler ataniyor (toplam 40 saat/hafta)...")

            # Her sinif icin ders dagilimi (toplami 40 saat - TALGAR SLOT ile ESIT!)
            lesson_distribution = {
                "MAT": 6,  # Matematik
                "TRK": 5,  # Turkce
                "FEN": 5,  # Fen Bilgisi
                "SOS": 4,  # Sosyal Bilgiler
                "ING": 4,  # Ingilizce
                "GOR": 3,  # Gorsel Sanatlar
                "MUZ": 3,  # Muzik
                "BED": 4,  # Beden Egitimi
                "DIN": 3,  # Din Kulturu
                "TEK": 3,  # Teknoloji Tasarim
            }

            # Dogrulama
            total_check = sum(lesson_distribution.values())
            print(f"   [DOGRULAMA] Toplam saat: {total_check} (40 olmali)")
            print(f"   [DOGRULAMA] Kullanilabilir slot: {ders_count // 5} (8 ders/gun)")

            if total_check != 40:
                raise ValueError(f"HATA: Toplam ders saati {total_check}, 40 olmali!")

            total_lessons = 0
            for class_obj in classes:
                class_total_hours = 0
                for subject_code, hours_per_week in lesson_distribution.items():
                    subject = subjects[subject_code]
                    # Ogretmen secimi (round-robin)
                    teacher = teachers[total_lessons % len(teachers)]

                    lesson = Lesson(
                        school_id=school.id,
                        class_id=class_obj.id,
                        subject_id=subject.id,
                        teacher_id=teacher.id,
                        hours_per_week=hours_per_week,
                        can_split=True,
                        num_groups=1,  # GRUP DERSi YOK!
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
            print("TEST OKULU BASARIYLA OLUSTURULDU (40 SAAT - TALGAR TIME SLOT)!")
            print("="*70)
            print(f"\nOzet:")
            print(f"  - Okul: {school.name}")
            print(f"  - Siniflar: {len(classes)} (Her subeden bir tane)")
            print(f"  - Dersler (Konu): {len(subjects)}")
            print(f"  - Ogretmenler: {len(teachers)}")
            print(f"  - Derslikler: {len(rooms)}")
            print(f"  - Zaman Dilimleri: {time_slots_count} (TALGAR yapisi)")
            print(f"  - DERS Slotlari: {ders_count} (5 gun x 8 ders = 40)")
            print(f"  - ARA Slotlari: {ara_count}")
            print(f"  - Toplam Ders Atama: {total_lessons}")
            print(f"  - Her sinif: 40 saat/hafta")
            print(f"  - Grup dersleri: YOK (num_groups=1)")
            print(f"\nMATEMATIKSEL DENGE:")
            print(f"  - Haftalik slot: 40 DERS slotu")
            print(f"  - Her sinifin dersi: 40 saat")
            print(f"  - DENGE: TAMAM! (40 = 40)")
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
    asyncio.run(create_test_school_40h_talgar())
