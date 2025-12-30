import sqlite3
import uuid

conn = sqlite3.connect('timetable.db')
cursor = conn.cursor()

print("=== CREATING MISSING LESSON GROUPS ===\n")

# Find lessons with num_groups > 1 but no lesson_groups records
cursor.execute("""
SELECT l.id, l.num_groups, c.name as class_name, s.name as subject_name
FROM lessons l
JOIN classes c ON l.class_id = c.id
JOIN subjects s ON l.subject_id = s.id
WHERE l.num_groups > 1 AND l.is_active = 1
""")

lessons = cursor.fetchall()
print(f"Found {len(lessons)} lessons with groups\n")

groups_created = 0

for lesson_id, num_groups, class_name, subject_name in lessons:
    # Check if groups already exist
    cursor.execute("SELECT COUNT(*) FROM lesson_groups WHERE lesson_id = ?", (lesson_id,))
    existing_count = cursor.fetchone()[0]

    if existing_count == 0:
        print(f"{class_name} - {subject_name}: Creating {num_groups} groups")

        # Create groups
        for i in range(num_groups):
            group_id = str(uuid.uuid4())
            group_name = f"Grup {i + 1}"

            cursor.execute("""
            INSERT INTO lesson_groups (id, lesson_id, group_name, teacher_id, student_count, extra_metadata)
            VALUES (?, ?, ?, NULL, NULL, '{}')
            """, (group_id, lesson_id, group_name))

            groups_created += 1
            print(f"  Created: {group_name}")

    elif existing_count < num_groups:
        print(f"{class_name} - {subject_name}: Adding {num_groups - existing_count} more groups (has {existing_count})")

        # Create additional groups
        for i in range(existing_count, num_groups):
            group_id = str(uuid.uuid4())
            group_name = f"Grup {i + 1}"

            cursor.execute("""
            INSERT INTO lesson_groups (id, lesson_id, group_name, teacher_id, student_count, extra_metadata)
            VALUES (?, ?, ?, NULL, NULL, '{}')
            """, (group_id, lesson_id, group_name))

            groups_created += 1
            print(f"  Created: {group_name}")

conn.commit()
print(f"\nTotal groups created: {groups_created}")

# Verify
print("\n=== VERIFICATION ===\n")

cursor.execute("""
SELECT
    c.name as class_name,
    s.name as subject_name,
    l.num_groups,
    COUNT(lg.id) as actual_groups
FROM lessons l
JOIN classes c ON l.class_id = c.id
JOIN subjects s ON l.subject_id = s.id
LEFT JOIN lesson_groups lg ON lg.lesson_id = l.id
WHERE l.num_groups > 1 AND l.is_active = 1
GROUP BY l.id, c.name, s.name, l.num_groups
""")

results = cursor.fetchall()
for class_name, subject_name, expected, actual in results:
    status = "OK" if expected == actual else "MISMATCH"
    print(f"{class_name} - {subject_name}: Expected {expected}, Got {actual} [{status}]")

conn.close()
