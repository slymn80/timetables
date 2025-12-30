import sqlite3

conn = sqlite3.connect('timetable.db')
cursor = conn.cursor()

print("=== ASSIGNING TEACHERS TO LESSON GROUPS ===\n")

# Get all teachers
cursor.execute("SELECT id, first_name, last_name FROM teachers WHERE is_active = 1")
teachers = cursor.fetchall()
teacher_dict = {f"{first} {last}": tid for tid, first, last in teachers}

print(f"Available teachers: {len(teachers)}")
for tid, first, last in teachers:
    print(f"  - {first} {last} ({tid[:8]})")

print("\n=== LESSON GROUP ASSIGNMENTS ===\n")

# Assign teachers to groups based on the pattern we saw earlier
assignments = [
    # 10-A Beden Eğitimi - 3 groups
    {
        "class": "10-A",
        "subject": "Beden Eğitimi",
        "groups": [
            {"name": "Grup 1", "teacher": "Ali Yılmaz"},
            {"name": "Grup 2", "teacher": "Ayşe Kaya"},
            {"name": "Grup 3", "teacher": "Süleyman Tongut"},
        ]
    },
    # 9-A Beden Eğitimi - 2 groups
    {
        "class": "9-A",
        "subject": "Beden Eğitimi",
        "groups": [
            {"name": "Grup 1", "teacher": "Ali Yılmaz"},
            {"name": "Grup 2", "teacher": "Ayşe Kaya"},
        ]
    },
    # 10-A Robotik - 2 groups
    {
        "class": "10-A",
        "subject": "Robotik",
        "groups": [
            {"name": "Grup 1", "teacher": "Süleyman Tongut"},
            {"name": "Grup 2", "teacher": "Ali Yılmaz"},
        ]
    },
    # 9-A Robotik - 2 groups
    {
        "class": "9-A",
        "subject": "Robotik",
        "groups": [
            {"name": "Grup 1", "teacher": "Ali Yılmaz"},
            {"name": "Grup 2", "teacher": "Ayşe Kaya"},
        ]
    },
]

updated_count = 0

for assignment in assignments:
    class_name = assignment["class"]
    subject_name = assignment["subject"]

    # Get lesson ID
    cursor.execute("""
    SELECT l.id
    FROM lessons l
    JOIN classes c ON l.class_id = c.id
    JOIN subjects s ON l.subject_id = s.id
    WHERE c.name = ? AND s.name = ? AND l.is_active = 1
    LIMIT 1
    """, (class_name, subject_name))

    lesson_row = cursor.fetchone()
    if not lesson_row:
        print(f"WARNING: Lesson not found: {class_name} - {subject_name}")
        continue

    lesson_id = lesson_row[0]
    print(f"{class_name} - {subject_name} (Lesson: {lesson_id[:8]})")

    # Get all groups for this lesson
    cursor.execute("""
    SELECT id, group_name
    FROM lesson_groups
    WHERE lesson_id = ?
    ORDER BY group_name
    """, (lesson_id,))

    groups = cursor.fetchall()

    for i, (group_id, group_name) in enumerate(groups):
        if i < len(assignment["groups"]):
            teacher_name = assignment["groups"][i]["teacher"]
            teacher_id = teacher_dict.get(teacher_name)

            if teacher_id:
                cursor.execute("""
                UPDATE lesson_groups
                SET teacher_id = ?
                WHERE id = ?
                """, (teacher_id, group_id))

                print(f"  OK {group_name} -> {teacher_name}")
                updated_count += 1
            else:
                print(f"  WARNING: Teacher not found: {teacher_name}")
        else:
            print(f"  WARNING: No teacher assigned for {group_name}")

conn.commit()

print(f"\n=== VERIFICATION ===\n")
print(f"Total assignments: {updated_count}\n")

# Verify assignments
cursor.execute("""
SELECT
    c.name as class_name,
    s.name as subject_name,
    lg.group_name,
    t.first_name || ' ' || t.last_name as teacher_name
FROM lesson_groups lg
JOIN lessons l ON lg.lesson_id = l.id
JOIN classes c ON l.class_id = c.id
JOIN subjects s ON l.subject_id = s.id
LEFT JOIN teachers t ON lg.teacher_id = t.id
WHERE l.is_active = 1
ORDER BY c.name, s.name, lg.group_name
""")

results = cursor.fetchall()
for class_name, subject_name, group_name, teacher_name in results:
    teacher_display = teacher_name if teacher_name else "NO TEACHER"
    print(f"{class_name} - {subject_name} - {group_name}: {teacher_display}")

conn.close()
print("\nDone!")
