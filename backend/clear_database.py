"""
Clear all data from database
"""
import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from app.database import AsyncSessionLocal
from sqlalchemy import text

async def clear_database():
    """Clear all data from all tables"""
    async with AsyncSessionLocal() as db:
        try:
            # Disable foreign key constraints temporarily
            await db.execute(text("PRAGMA foreign_keys = OFF"))

            # Get all tables
            tables = [
                'timetable_entries',
                'constraint_violations',
                'timetables',
                'lesson_groups',
                'lessons',
                'time_slots',
                'rooms',
                'subjects',
                'classes',
                'teachers',
                'holidays',
                'academic_years',
                'schools',
                'users',
            ]

            # Delete all data from each table
            for table in tables:
                result = await db.execute(text(f"DELETE FROM {table}"))
                print(f"Deleted {result.rowcount} rows from {table}")

            # Re-enable foreign key constraints
            await db.execute(text("PRAGMA foreign_keys = ON"))

            await db.commit()
            print("\n✅ Database cleared successfully!")

        except Exception as e:
            await db.rollback()
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(clear_database())
