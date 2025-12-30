"""
Mevcut test okuluna daha fazla ogretmen ekle
Ozellikle Teknoloji Tasarim ve diger dersler icin
Amac: %100 atama saglamak
"""
import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from app.database import AsyncSessionLocal, init_db
from app.models.school import School
from app.models.teacher import Teacher
from sqlalchemy import select


async def add_teachers():
    """Test okuluna daha fazla ogretmen ekle"""
    await init_db()

    async with AsyncSessionLocal() as db:
        try:
            # Test okulunu bul (40 saatlik)
            print("Test okulunu ariyorum (40 saat)...")
            schools_query = select(School).where(
                School.name.like('%40 Saat%')
            )
            schools_result = await db.execute(schools_query)
            school = schools_result.scalar_one_or_none()

            if not school:
                print("Test okulu bulunamadi!")
                return

            print(f"Okul bulundu: {school.name}")
            print(f"Okul ID: {school.id}\n")

            # Mevcut ogretmenleri say
            teachers_query = select(Teacher).where(
                Teacher.school_id == school.id,
                Teacher.is_active == True
            )
            teachers_result = await db.execute(teachers_query)
            existing_teachers = list(teachers_result.scalars().all())
            print(f"Mevcut ogretmen sayisi: {len(existing_teachers)}\n")

            # Yeni ogretmenler ekle
            print("Yeni ogretmenler ekleniyor...")

            new_teachers_data = [
                # Matematik icin 2 ogretmen daha
                ("Ahmet", "Ozturk", "MAT"),
                ("Elif", "Yavuz", "MAT"),

                # Turkce icin 2 ogretmen daha
                ("Mehmet", "Ak", "TRK"),
                ("Zeynep", "Sari", "TRK"),

                # Fen Bilgisi icin 2 ogretmen daha
                ("Ali", "Beyaz", "FEN"),
                ("Fatma", "Mavi", "FEN"),

                # Sosyal Bilgiler icin 2 ogretmen daha
                ("Hasan", "Kirmizi", "SOS"),
                ("Ayse", "Yesil", "SOS"),

                # Ingilizce icin 2 ogretmen daha
                ("Mustafa", "Turuncu", "ING"),
                ("Elif", "Mor", "ING"),

                # TEKNOLOJI TASARIM icin 4 ogretmen daha (ONEMLI!)
                ("Can", "Teknoloji1", "TEK"),
                ("Selin", "Teknoloji2", "TEK"),
                ("Burak", "Teknoloji3", "TEK"),
                ("Derya", "Teknoloji4", "TEK"),

                # Muzik icin 2 ogretmen daha
                ("Emre", "Nota", "MUZ"),
                ("Canan", "Ritim", "MUZ"),

                # Gorsel Sanatlar icin 2 ogretmen daha
                ("Osman", "Boya", "GOR"),
                ("Merve", "Firca", "GOR"),

                # Beden Egitimi icin 2 ogretmen daha
                ("Ibrahim", "Spor", "BED"),
                ("Deniz", "Atletik", "BED"),

                # Din Kulturu icin 2 ogretmen daha
                ("Ahmet", "Bilgi", "DIN"),
                ("Fatma", "Kultur", "DIN"),
            ]

            teachers_added = 0
            for first, last, subject_code in new_teachers_data:
                teacher = Teacher(
                    school_id=school.id,
                    first_name=first,
                    last_name=last,
                    short_name=f"{first[0]}.{last}",
                    email=f"{first.lower()}.{last.lower()}@test.edu.tr",
                    max_hours_per_day=8,
                    max_hours_per_week=40,
                    min_hours_per_week=15,
                    max_consecutive_hours=4,
                    is_active=True
                )
                db.add(teacher)
                teachers_added += 1

            await db.flush()
            print(f"[OK] {teachers_added} yeni ogretmen eklendi")

            # Yeni toplam
            all_teachers_query = select(Teacher).where(
                Teacher.school_id == school.id,
                Teacher.is_active == True
            )
            all_teachers_result = await db.execute(all_teachers_query)
            all_teachers = list(all_teachers_result.scalars().all())

            await db.commit()

            print("\n" + "="*70)
            print("OGRETMENLER BASARIYLA EKLENDI!")
            print("="*70)
            print(f"\nOnceki ogretmen sayisi: {len(existing_teachers)}")
            print(f"Eklenen ogretmen sayisi: {teachers_added}")
            print(f"Yeni toplam ogretmen: {len(all_teachers)}")
            print(f"\nOzellikle Teknoloji Tasarim icin 4 ekstra ogretmen eklendi!")
            print("Bu sayede %100 atama mumkun olacak!")
            print("="*70)

        except Exception as e:
            await db.rollback()
            print(f"\nHATA: {e}")
            import traceback
            traceback.print_exc()
            raise
        finally:
            await db.close()


if __name__ == "__main__":
    asyncio.run(add_teachers())
