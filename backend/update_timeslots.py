import sqlite3

# Veritabani baglan
conn = sqlite3.connect('timetable.db')
cursor = conn.cursor()

# Mevcut time slot'lari sil
cursor.execute("DELETE FROM time_slots")
conn.commit()

print("Mevcut time slot'lar silindi.")

# School ID'yi al
cursor.execute("SELECT id FROM schools LIMIT 1")
school = cursor.fetchone()
if school:
    print(f"School ID: {school[0]}")
else:
    print("Okul bulunamadi!")

conn.close()
