"""
Assign main teachers to grouped lessons based on subject matching
"""
import sqlite3
import json
import re

def normalize_subject(subject_name):
    """Normalize subject name for comparison"""
    # Convert to uppercase and remove special chars
    normalized = subject_name.upper()
    # Common replacements for Turkish subjects
    replacements = {
        'MÜZİK': 'MÜZIK',
        'MUZIK': 'MÜZIK',
        'BEDEN EĞİTİMİ': 'BEDEN EĞİTİMİ',
        'BEDEN EGITIMI': 'BEDEN EĞİTİMİ',
    }

    for old, new in replacements.items():
        if old in normalized:
            normalized = normalized.replace(old, new)

    return normalized

def subject_matches(subject_name, teacher_subject_areas):
    """Check if teacher's subject areas match the lesson subject"""
    if not teacher_subject_areas:
        return False

    try:
        areas = json.loads(teacher_subject_areas) if isinstance(teacher_subject_areas, str) else teacher_subject_areas
    except:
        return False

    if not areas:
        return False

    normalized_subject = normalize_subject(subject_name)

    # Check for exact or partial match
    for area in areas:
        normalized_area = normalize_subject(area)

        # Exact match
        if normalized_area == normalized_subject:
            return True

        # Partial match (e.g., "MÜZİK" in "MÜZİK 10")
        if normalized_area in normalized_subject or normalized_subject in normalized_area:
            return True

    return False

def assign_main_teachers():
    """Assign main teachers to grouped lessons"""
    conn = sqlite3.connect('timetable.db')
    cursor = conn.cursor()

    # Get all grouped lessons without main teacher
    cursor.execute('''
        SELECT
            l.id,
            c.name as class_name,
            s.name as subject_name
        FROM lessons l
        JOIN classes c ON l.class_id = c.id
        JOIN subjects s ON l.subject_id = s.id
        WHERE l.num_groups > 1
        AND l.is_active = 1
        AND l.teacher_id IS NULL
    ''')

    grouped_lessons = cursor.fetchall()

    print(f'Processing {len(grouped_lessons)} grouped lessons...')
    print('='*100)

    updated_count = 0

    for lesson_id, class_name, subject_name in grouped_lessons:
        # Get lesson groups and their teachers
        cursor.execute('''
            SELECT
                lg.teacher_id,
                t.first_name,
                t.last_name,
                t.subject_areas
            FROM lesson_groups lg
            LEFT JOIN teachers t ON lg.teacher_id = t.id
            WHERE lg.lesson_id = ?
            AND t.id IS NOT NULL
            ORDER BY lg.group_name
        ''', (lesson_id,))

        group_teachers = cursor.fetchall()

        if not group_teachers:
            print(f'  WARNING: {class_name} - {subject_name}: No teachers in groups')
            continue

        # Find matching teacher
        main_teacher_id = None
        main_teacher_name = None

        for teacher_id, first_name, last_name, subject_areas in group_teachers:
            if subject_matches(subject_name, subject_areas):
                main_teacher_id = teacher_id
                main_teacher_name = f'{first_name} {last_name}'
                break

        # If no match found, use first teacher
        if not main_teacher_id and group_teachers:
            main_teacher_id = group_teachers[0][0]
            main_teacher_name = f'{group_teachers[0][1]} {group_teachers[0][2]}'

        if main_teacher_id:
            # Update lesson with main teacher
            cursor.execute('''
                UPDATE lessons
                SET teacher_id = ?
                WHERE id = ?
            ''', (main_teacher_id, lesson_id))

            updated_count += 1

            # Show all teachers for this lesson
            teachers_info = []
            for tid, fname, lname, sa in group_teachers:
                match_marker = '*' if tid == main_teacher_id else '-'
                teachers_info.append(f'{match_marker} {fname} {lname}')

            print(f'  OK {class_name} - {subject_name}:')
            print(f'      Ana ogretmen: {main_teacher_name}')
            print(f'      Tum ogretmenler: {", ".join(teachers_info)}')

    conn.commit()
    conn.close()

    print()
    print('='*100)
    print(f'SUCCESS! {updated_count}/{len(grouped_lessons)} derste ana ogretmen atandi!')

if __name__ == '__main__':
    assign_main_teachers()
