import sqlite3
import uuid
from collections import defaultdict
import random

conn = sqlite3.connect('timetable.db')
cursor = conn.cursor()

print("=== SIMPLE TIMETABLE GENERATION WITH GROUPS ===\n")

# Get the timetable
cursor.execute("SELECT id FROM timetables WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1")
timetable_row = cursor.fetchone()
if not timetable_row:
    print("ERROR: No active timetable found!")
    conn.close()
    exit(1)

timetable_id = timetable_row[0]
print(f"Timetable ID: {timetable_id[:8]}")

# Get all time slots (they are shared across all timetables per school)
cursor.execute("""
SELECT ts.id, ts.day, ts.period_number
FROM time_slots ts
JOIN timetables t ON ts.school_id = t.school_id
WHERE t.id = ? AND ts.is_active = 1
ORDER BY ts.day, ts.period_number
""", (timetable_id,))

time_slots = cursor.fetchall()
print(f"Available time slots: {len(time_slots)}")

# Group slots by day-period for parallel group assignment
slots_by_day_period = defaultdict(list)
for slot_id, day, period in time_slots:
    slots_by_day_period[(day, period)].append(slot_id)

print(f"Unique day-period combinations: {len(slots_by_day_period)}")

# Get all lessons
cursor.execute("""
SELECT l.id, l.class_id, l.subject_id, l.teacher_id, l.hours_per_week, l.num_groups,
       c.name as class_name, s.name as subject_name
FROM lessons l
JOIN classes c ON l.class_id = c.id
JOIN subjects s ON l.subject_id = s.id
WHERE l.is_active = 1
ORDER BY l.num_groups DESC, l.hours_per_week DESC
""")

lessons = cursor.fetchall()
print(f"Total lessons: {len(lessons)}\n")

# Track slot usage
slot_usage = {
    slot_id: {"teacher_id": None, "class_id": None}
    for slot_id, _, _ in time_slots
}

entries_created = 0
available_slots = list(slots_by_day_period.keys())

for lesson_id, class_id, subject_id, teacher_id, hours_per_week, num_groups, class_name, subject_name in lessons:
    print(f"{class_name} - {subject_name}: {hours_per_week} hours/week, {num_groups} group(s)")

    if num_groups > 1:
        # Get lesson groups
        cursor.execute("""
        SELECT id, group_name, teacher_id
        FROM lesson_groups
        WHERE lesson_id = ?
        ORDER BY group_name
        """, (lesson_id,))

        groups = cursor.fetchall()
        print(f"  Found {len(groups)} groups in database")

        if len(groups) != num_groups:
            print(f"  WARNING: Expected {num_groups} groups but found {len(groups)}")
            continue

        # For grouped lessons, assign all groups to the same time slots
        # but with different lesson_group_id
        assigned_count = 0
        attempt = 0
        max_attempts = 100

        while assigned_count < hours_per_week and attempt < max_attempts:
            attempt += 1

            if not available_slots:
                print(f"  ERROR: No more time slots available!")
                break

            # Pick a random day-period
            day_period = random.choice(available_slots)
            day, period = day_period

            # Get all slots for this day-period (one per room/group)
            slots = slots_by_day_period[day_period]

            # Check if we have enough free slots for all groups
            if len(slots) < num_groups:
                print(f"  WARNING: Not enough parallel slots for {num_groups} groups at {day}-{period}")
                available_slots.remove(day_period)
                continue

            # Check if class and all group teachers are free
            class_busy = False
            teachers_busy = []

            for slot_id in slots[:num_groups]:
                if slot_usage[slot_id]["class_id"] == class_id:
                    class_busy = True
                    break

            if class_busy:
                available_slots.remove(day_period)
                continue

            # Check teachers
            group_teachers = [g[2] for g in groups if g[2] is not None]
            for slot_id in slots[:num_groups]:
                if slot_usage[slot_id]["teacher_id"] in group_teachers:
                    teachers_busy.append(slot_usage[slot_id]["teacher_id"])

            if teachers_busy:
                continue

            # All checks passed! Assign this slot to all groups
            for i, (group_id, group_name, group_teacher_id) in enumerate(groups):
                if i >= len(slots):
                    print(f"  WARNING: Not enough slots for group {group_name}")
                    break

                slot_id = slots[i]

                # Create timetable entry
                entry_id = str(uuid.uuid4())
                cursor.execute("""
                INSERT INTO timetable_entries
                (id, timetable_id, time_slot_id, lesson_id, lesson_group_id, room_id, is_locked, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, NULL, 0, datetime('now'), datetime('now'))
                """, (entry_id, timetable_id, slot_id, lesson_id, group_id))

                # Mark slot as used
                slot_usage[slot_id] = {
                    "teacher_id": group_teacher_id,
                    "class_id": class_id
                }

                entries_created += 1

            assigned_count += 1
            print(f"  Assigned: {assigned_count}/{hours_per_week} - {day}-{period} (all {num_groups} groups)")

    else:
        # Regular lesson (no groups)
        assigned_count = 0
        attempt = 0
        max_attempts = 100

        while assigned_count < hours_per_week and attempt < max_attempts:
            attempt += 1

            if not available_slots:
                print(f"  ERROR: No more time slots available!")
                break

            day_period = random.choice(available_slots)
            day, period = day_period
            slots = slots_by_day_period[day_period]

            # Find a free slot
            slot_found = False
            for slot_id in slots:
                # Check if class and teacher are free
                if slot_usage[slot_id]["class_id"] == class_id:
                    continue
                if teacher_id and slot_usage[slot_id]["teacher_id"] == teacher_id:
                    continue

                # Create timetable entry
                entry_id = str(uuid.uuid4())
                cursor.execute("""
                INSERT INTO timetable_entries
                (id, timetable_id, time_slot_id, lesson_id, lesson_group_id, room_id, is_locked, created_at, updated_at)
                VALUES (?, ?, ?, ?, NULL, NULL, 0, datetime('now'), datetime('now'))
                """, (entry_id, timetable_id, slot_id, lesson_id))

                # Mark slot as used
                slot_usage[slot_id] = {
                    "teacher_id": teacher_id,
                    "class_id": class_id
                }

                assigned_count += 1
                entries_created += 1
                slot_found = True
                print(f"  Assigned: {assigned_count}/{hours_per_week} - {day}-{period}")
                break

            if not slot_found:
                available_slots.remove(day_period)

conn.commit()

print(f"\n=== SUMMARY ===")
print(f"Total entries created: {entries_created}")

# Verify
cursor.execute("""
SELECT COUNT(*), COUNT(DISTINCT lesson_group_id)
FROM timetable_entries
WHERE timetable_id = ?
""", (timetable_id,))

total, groups_used = cursor.fetchone()
print(f"Entries in database: {total}")
print(f"Unique lesson groups used: {groups_used}")

conn.close()
print("\nDone!")
