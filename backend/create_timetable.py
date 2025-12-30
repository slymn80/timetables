import sqlite3
import uuid
from datetime import datetime

conn = sqlite3.connect('timetable.db')
cursor = conn.cursor()

print("=== CREATING TIMETABLE ===\n")

# Get school
cursor.execute("SELECT id, name FROM schools WHERE is_active = 1 LIMIT 1")
school = cursor.fetchone()
if not school:
    print("ERROR: No school found!")
    conn.close()
    exit(1)

school_id, school_name = school
print(f"School: {school_name}")

# Create timetable
timetable_id = str(uuid.uuid4())
cursor.execute("""
INSERT INTO timetables
(id, school_id, name, academic_year, semester, algorithm, status, is_active, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (
    timetable_id,
    school_id,
    "Program 2024-2025",
    "2024-2025",
    1,
    "random",
    "pending",
    1,
    datetime.now().isoformat(),
    datetime.now().isoformat()
))

print(f"Timetable created: {timetable_id[:8]}")

# Create time slots (5 days, 8 periods per day)
days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
periods_per_day = 8
total_slots = 0

for day_num, day in enumerate(days, 1):
    for period in range(1, periods_per_day + 1):
        slot_id = str(uuid.uuid4())

        # Calculate time (starting at 08:00, 45 min periods, 10 min breaks)
        hour = 8 + ((period - 1) * 55) // 60
        minute = ((period - 1) * 55) % 60
        start_time = f"{hour:02d}:{minute:02d}:00"

        hour_end = 8 + ((period - 1) * 55 + 45) // 60
        minute_end = ((period - 1) * 55 + 45) % 60
        end_time = f"{hour_end:02d}:{minute_end:02d}:00"

        cursor.execute("""
        INSERT INTO time_slots
        (id, school_id, day, period_number, start_time, end_time, is_break, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (slot_id, school_id, day, period, start_time, end_time, 0, 1, datetime.now().isoformat(), datetime.now().isoformat()))

        total_slots += 1

print(f"Time slots created: {total_slots}")

conn.commit()
conn.close()

print("\nDone!")
