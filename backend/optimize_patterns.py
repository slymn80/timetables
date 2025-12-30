"""
Optimize lesson patterns for better scheduling
Change 1+1 patterns to 2 for single-hour lessons that are hard to schedule
"""
import sqlite3
import json

def optimize_patterns():
    conn = sqlite3.connect('timetable.db')
    cursor = conn.cursor()

    # Target problematic lessons (non-grouped, 1-2 hours)
    # These are the ones that typically fail to assign
    target_subjects = ['Rehberlik', 'Müzik 10', 'Yapay Zeka']

    print('Optimizing lesson patterns for better scheduling...')
    print('='*100)

    updated_count = 0

    for subject_pattern in target_subjects:
        # Find lessons matching this subject
        cursor.execute('''
            SELECT
                l.id,
                c.name as class_name,
                s.name as subject_name,
                l.hours_per_week,
                l.num_groups,
                l.extra_metadata
            FROM lessons l
            JOIN classes c ON l.class_id = c.id
            JOIN subjects s ON l.subject_id = s.id
            WHERE s.name LIKE ?
            AND l.is_active = 1
            AND l.num_groups <= 1
        ''', (f'%{subject_pattern}%',))

        lessons = cursor.fetchall()

        for lesson_id, class_name, subject_name, hours, num_groups, extra_meta in lessons:
            # Parse current metadata
            metadata = {}
            if extra_meta:
                try:
                    metadata = json.loads(extra_meta)
                    if not isinstance(metadata, dict):
                        metadata = {}
                except:
                    metadata = {}

            current_pattern = metadata.get('user_distribution_pattern', '')

            # Optimize pattern based on hours
            new_pattern = None

            if hours == 1:
                # Single hour - keep as is (1)
                new_pattern = '1'
            elif hours == 2:
                # 2 hours - prefer consecutive (2) over split (1+1)
                # This is easier to schedule
                if current_pattern == '1+1':
                    new_pattern = '2'
                    print(f'  {class_name} - {subject_name}: {current_pattern} -> {new_pattern}')
                    updated_count += 1

            if new_pattern and new_pattern != current_pattern:
                metadata['user_distribution_pattern'] = new_pattern

                cursor.execute('''
                    UPDATE lessons
                    SET extra_metadata = ?
                    WHERE id = ?
                ''', (json.dumps(metadata), lesson_id))

    conn.commit()
    conn.close()

    print()
    print('='*100)
    print(f'Optimized {updated_count} lesson patterns!')
    print('Changed 1+1 -> 2 for easier scheduling')

if __name__ == '__main__':
    optimize_patterns()
