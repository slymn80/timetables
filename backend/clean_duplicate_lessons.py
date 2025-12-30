import sqlite3

conn = sqlite3.connect('timetable.db')
cursor = conn.cursor()

print("=== CLEANING DUPLICATE LESSONS ===\n")

# Find duplicate lessons (same class + subject combination)
cursor.execute("""
SELECT class_id, subject_id, COUNT(*) as count
FROM lessons
WHERE is_active = 1
GROUP BY class_id, subject_id
HAVING COUNT(*) > 1
""")

duplicates = cursor.fetchall()
print(f"Found {len(duplicates)} duplicate lesson groups\n")

deleted_count = 0

for class_id, subject_id, count in duplicates:
    # Get all lessons for this combination
    cursor.execute("""
    SELECT l.id, c.name as class_name, s.name as subject_name, l.created_at
    FROM lessons l
    JOIN classes c ON l.class_id = c.id
    JOIN subjects s ON l.subject_id = s.id
    WHERE l.class_id = ? AND l.subject_id = ? AND l.is_active = 1
    ORDER BY l.created_at ASC
    """, (class_id, subject_id))

    lessons = cursor.fetchall()

    if lessons:
        # Keep the first one (oldest), delete the rest
        keep_id = lessons[0][0]
        class_name = lessons[0][1]
        subject_name = lessons[0][2]

        print(f"{class_name} - {subject_name}: {count} duplicates")
        print(f"  Keeping: {keep_id}")

        for i in range(1, len(lessons)):
            delete_id = lessons[i][0]
            print(f"  Deleting: {delete_id}")

            # Soft delete (set is_active = 0)
            cursor.execute("UPDATE lessons SET is_active = 0 WHERE id = ?", (delete_id,))
            deleted_count += 1

conn.commit()
print(f"\nTotal deleted: {deleted_count} lessons")

# Verify
cursor.execute("""
SELECT class_id, subject_id, COUNT(*) as count
FROM lessons
WHERE is_active = 1
GROUP BY class_id, subject_id
HAVING COUNT(*) > 1
""")

remaining_dups = cursor.fetchall()
print(f"Remaining duplicates: {len(remaining_dups)}")

conn.close()
