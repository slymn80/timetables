import sqlite3

conn = sqlite3.connect('timetable.db')
cursor = conn.cursor()

print("=== CLEARING TIMETABLE ENTRIES ===\n")

# Count current entries
cursor.execute("SELECT COUNT(*) FROM timetable_entries")
count = cursor.fetchone()[0]
print(f"Current timetable entries: {count}")

# Delete all timetable entries
cursor.execute("DELETE FROM timetable_entries")

conn.commit()

# Verify
cursor.execute("SELECT COUNT(*) FROM timetable_entries")
remaining = cursor.fetchone()[0]
print(f"Remaining entries: {remaining}")

print(f"\nDeleted {count} timetable entries")

conn.close()
print("Done!")
