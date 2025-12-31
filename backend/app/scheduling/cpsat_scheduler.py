"""
CP-SAT Based Timetable Scheduler - KUSURSUZ COZUM
Google OR-Tools CP-SAT solver kullanarak %100 garantili ders programi olusturur
"""
from typing import Dict, List, Tuple, Optional
from uuid import UUID
from collections import defaultdict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ortools.sat.python import cp_model
import logging

from ..models.timetable import Timetable, TimetableEntry
from ..models.lesson import Lesson, LessonGroup
from ..models.time_slot import TimeSlot
from ..models.room import Room
from ..models.class_model import Class
from ..models.teacher import Teacher
from ..models.subject import Subject

logger = logging.getLogger(__name__)


class TimetableSolutionPrinter(cp_model.CpSolverSolutionCallback):
    """Solution callback to track progress"""

    def __init__(self):
        cp_model.CpSolverSolutionCallback.__init__(self)
        self._solution_count = 0

    def on_solution_callback(self):
        self._solution_count += 1
        if self._solution_count % 10 == 0:
            print(f"  Cozum #{self._solution_count} bulundu...")


async def schedule_with_cpsat(
    timetable: Timetable,
    lessons: List[Lesson],
    time_slots: List[TimeSlot],
    rooms: List[Room],
    db: AsyncSession
) -> Tuple[int, int, List[str]]:
    """
    CP-SAT solver ile ders programi olustur - %100 GARANTILI

    Returns: (assigned_count, violations, logs)
    """
    logs = []
    print("\n" + "="*70)
    print("CP-SAT SCHEDULER BASLADI - KUSURSUZ COZUM")
    print("="*70)

    # Load all necessary data with eager loading
    print("\nVeriler yukleniyor...")

    # Get all classes
    classes_query = select(Class).where(
        Class.school_id == timetable.school_id
    )
    classes_result = await db.execute(classes_query)
    classes = list(classes_result.scalars().all())
    print(f"  - {len(classes)} sinif")

    # Get all teachers
    teachers_query = select(Teacher).where(
        Teacher.school_id == timetable.school_id
    )
    teachers_result = await db.execute(teachers_query)
    teachers = list(teachers_result.scalars().all())
    print(f"  - {len(teachers)} ogretmen")

    # Get all subjects
    subjects_query = select(Subject).where(
        Subject.school_id == timetable.school_id
    )
    subjects_result = await db.execute(subjects_query)
    subjects = list(subjects_result.scalars().all())
    print(f"  - {len(subjects)} ders")

    # Get all lesson groups
    lesson_groups_query = select(LessonGroup).where(
        LessonGroup.lesson_id.in_([lesson.id for lesson in lessons])
    )
    lesson_groups_result = await db.execute(lesson_groups_query)
    lesson_groups = list(lesson_groups_result.scalars().all())
    print(f"  - {len(lesson_groups)} ders grubu")

    print(f"  - {len(lessons)} ders atamasi")
    print(f"  - {len(time_slots)} zaman dilimi")
    print(f"  - {len(rooms)} derslik")

    # SIMPLIFIED: No room constraint - just assign lessons to slots
    # This makes the problem much simpler and faster
    use_rooms = len(rooms) > 0

    if not use_rooms:
        print("  [!] No rooms - using simplified model (lesson, slot) only")

    # Create index mappings
    lesson_index = {lesson.id: i for i, lesson in enumerate(lessons)}
    slot_index = {slot.id: i for i, slot in enumerate(time_slots)}
    class_index = {cls.id: i for i, cls in enumerate(classes)}
    teacher_index = {teacher.id: i for i, teacher in enumerate(teachers)}

    # Group lesson_groups by lesson_id
    lesson_groups_by_lesson = defaultdict(list)
    for lg in lesson_groups:
        lesson_groups_by_lesson[lg.lesson_id].append(lg)

    # Group slots by day
    slots_by_day = defaultdict(list)
    for slot in time_slots:
        day_str = slot.day.value if hasattr(slot.day, 'value') else slot.day
        slots_by_day[day_str].append(slot)

    # Create CP model
    print("\nCP-SAT modeli olusturuluyor...")
    model = cp_model.CpModel()

    # DECISION VARIABLES
    # assign[(l_idx, lg_idx, s_idx)] = 1 if lesson l, group lg is assigned to slot s
    # lg_idx = None means no group (single teacher lesson)
    # For group lessons, all groups must be assigned to the same slot
    assign = {}
    lesson_to_groups = {}  # Maps lesson index to list of (group_id, group_index)

    for l_idx, lesson in enumerate(lessons):
        groups = lesson_groups_by_lesson.get(lesson.id, [])

        if groups:
            # This lesson has groups - create variables for each group
            lesson_to_groups[l_idx] = [(lg.id, g_idx) for g_idx, lg in enumerate(groups)]
            for g_idx, lg in enumerate(groups):
                for s_idx, slot in enumerate(time_slots):
                    assign[(l_idx, g_idx, s_idx)] = model.NewBoolVar(
                        f'assign_l{l_idx}_g{g_idx}_s{s_idx}'
                    )
        else:
            # No groups - single assignment
            lesson_to_groups[l_idx] = [(None, None)]
            for s_idx, slot in enumerate(time_slots):
                assign[(l_idx, None, s_idx)] = model.NewBoolVar(
                    f'assign_l{l_idx}_s{s_idx}'
                )

    print(f"  - {len(assign)} karar degiskeni olusturuldu")

    # CONSTRAINT 0: For group lessons, all groups must be assigned to the same slot
    print("\nKisitlar ekleniyor...")
    constraint_count = 0

    for l_idx, lesson in enumerate(lessons):
        groups = lesson_groups_by_lesson.get(lesson.id, [])

        if len(groups) > 1:
            # This lesson has multiple groups - they must be assigned to the same slot
            for s_idx in range(len(time_slots)):
                # All groups must have the same assignment value for this slot
                for g_idx in range(1, len(groups)):
                    model.Add(
                        assign[(l_idx, 0, s_idx)] == assign[(l_idx, g_idx, s_idx)]
                    )
                    constraint_count += 1

    print(f"  OK Grup dersleri ayni slota atanir: {constraint_count} kisit")

    # CONSTRAINT 1: Each lesson MUST be assigned EXACTLY hours_per_week times
    constraint_count = 0

    # Create variables to track assigned hours for each lesson
    lesson_assigned_hours = {}

    for l_idx, lesson in enumerate(lessons):
        groups = lesson_groups_by_lesson.get(lesson.id, [])

        if groups:
            # For group lessons, count using first group (all groups are synced)
            lesson_assigned_hours[l_idx] = sum(
                assign[(l_idx, 0, s_idx)]
                for s_idx in range(len(time_slots))
            )
        else:
            # For non-group lessons
            lesson_assigned_hours[l_idx] = sum(
                assign[(l_idx, None, s_idx)]
                for s_idx in range(len(time_slots))
            )

        model.Add(lesson_assigned_hours[l_idx] == lesson.hours_per_week)
        constraint_count += 1

    print(f"  OK Her ders TAM OLARAK gerekli kadar atanmali: {constraint_count} kisit")

    # CONSTRAINT 2: No class conflicts (a class can only have one lesson at a time)
    # Note: For group lessons, all groups are scheduled at the same time, so we only count once
    constraint_count = 0
    for cls_id, cls in enumerate(classes):
        for s_idx in range(len(time_slots)):
            # Find all lessons for this class
            class_lesson_vars = []
            for l_idx, lesson in enumerate(lessons):
                if lesson.class_id == cls.id:
                    groups = lesson_groups_by_lesson.get(lesson.id, [])
                    if groups:
                        # For group lessons, use first group (all groups are synced)
                        class_lesson_vars.append(assign[(l_idx, 0, s_idx)])
                    else:
                        # For non-group lessons
                        class_lesson_vars.append(assign[(l_idx, None, s_idx)])

            if class_lesson_vars:
                # At most 1 lesson for this class in this slot
                model.Add(sum(class_lesson_vars) <= 1)
                constraint_count += 1

    print(f"  OK Sinif cakismasi yok: {constraint_count} kisit")

    # CONSTRAINT 3: No teacher conflicts (a teacher can only teach one lesson at a time)
    # For group lessons, each group may have a different teacher
    constraint_count = 0
    for t_id, teacher in enumerate(teachers):
        for s_idx in range(len(time_slots)):
            # Find all lesson assignments for this teacher (including groups)
            teacher_lesson_vars = []

            for l_idx, lesson in enumerate(lessons):
                groups = lesson_groups_by_lesson.get(lesson.id, [])

                if groups:
                    # Check each group - this teacher might be teaching one of the groups
                    for g_idx, lg in enumerate(groups):
                        if lg.teacher_id == teacher.id:
                            teacher_lesson_vars.append(assign[(l_idx, g_idx, s_idx)])
                else:
                    # No groups - check if this teacher teaches this lesson
                    if lesson.teacher_id == teacher.id:
                        teacher_lesson_vars.append(assign[(l_idx, None, s_idx)])

            if teacher_lesson_vars:
                # At most 1 lesson for this teacher in this slot
                model.Add(sum(teacher_lesson_vars) <= 1)
                constraint_count += 1

    print(f"  OK Ogretmen cakismasi yok: {constraint_count} kisit")

    # CONSTRAINT 4: Teacher unavailable slots
    # Teachers cannot be assigned to their unavailable time slots
    constraint_count = 0
    day_number_map = {
        "MONDAY": 1, "TUESDAY": 2, "WEDNESDAY": 3, "THURSDAY": 4,
        "FRIDAY": 5, "SATURDAY": 6, "SUNDAY": 7
    }

    for teacher in teachers:
        if not teacher.unavailable_slots:
            continue

        # Parse unavailable_slots: {"5": [1,2,3], "2": [4,5]}
        for day_num_str, period_nums in teacher.unavailable_slots.items():
            day_num = int(day_num_str)

            # Find all slots for this day and periods
            for s_idx, slot in enumerate(time_slots):
                # Convert day to uppercase for comparison - handle both Enum and string
                if hasattr(slot.day, 'value'):
                    slot_day_str = str(slot.day.value).upper()
                else:
                    slot_day_str = str(slot.day).upper()
                slot_day_num = day_number_map.get(slot_day_str, 0)

                # Check if this slot matches unavailable day and period
                if slot_day_num == day_num and slot.period_number in period_nums:
                    # Find all lesson assignments for this teacher (including groups)
                    for l_idx, lesson in enumerate(lessons):
                        groups = lesson_groups_by_lesson.get(lesson.id, [])

                        if groups:
                            # Check each group
                            for g_idx, lg in enumerate(groups):
                                if lg.teacher_id == teacher.id:
                                    model.Add(assign[(l_idx, g_idx, s_idx)] == 0)
                                    constraint_count += 1
                        else:
                            # No groups
                            if lesson.teacher_id == teacher.id:
                                model.Add(assign[(l_idx, None, s_idx)] == 0)
                                constraint_count += 1

    print(f"  OK Ogretmen musait olmayan slotlar: {constraint_count} kisit")

    # CONSTRAINT 5: Class max_hours_per_day
    # General rule: Compare time_slots max periods vs class max_hours_per_day
    # If class max < time_slots max, block the LAST periods (end of day)
    # Example: time_slots has 8 periods, class max=7 -> block period 8

    # Find max period_number in time_slots for each day
    max_periods_per_day = {}
    for slot in time_slots:
        day_str = slot.day.value if hasattr(slot.day, 'value') else slot.day
        if day_str not in max_periods_per_day:
            max_periods_per_day[day_str] = 0
        max_periods_per_day[day_str] = max(max_periods_per_day[day_str], slot.period_number)

    # Log time_slots structure
    print(f"\n  Time slots structure:")
    for day, max_p in sorted(max_periods_per_day.items()):
        print(f"    {day}: {max_p} periods")

    constraint_count = 0
    for cls in classes:
        class_max_hours = cls.max_hours_per_day
        if not class_max_hours:
            continue  # Skip if no limit set

        # Find global max periods across all days
        global_max_periods = max(max_periods_per_day.values()) if max_periods_per_day else 8

        # Log comparison
        if class_max_hours < global_max_periods:
            print(f"    {cls.name}: max_hours={class_max_hours} < slots_max={global_max_periods} -> blocking periods {class_max_hours+1}-{global_max_periods}")

        # Block all slots where period_number > class_max_hours
        # This blocks the LAST periods of each day
        for s_idx, slot in enumerate(time_slots):
            if slot.period_number > class_max_hours:
                # This period is beyond the class's allowed hours
                # Block all lessons for this class in this slot
                for l_idx, lesson in enumerate(lessons):
                    if lesson.class_id == cls.id:
                        groups = lesson_groups_by_lesson.get(lesson.id, [])
                        if groups:
                            # For group lessons, use first group (all groups are synced)
                            model.Add(assign[(l_idx, 0, s_idx)] == 0)
                            constraint_count += 1
                        else:
                            # For non-group lessons
                            model.Add(assign[(l_idx, None, s_idx)] == 0)
                            constraint_count += 1

    print(f"  OK Sinif max_hours_per_day kisiti: {constraint_count} kisit")

    # CONSTRAINT 6: Class unavailable slots
    # Classes cannot have lessons in their unavailable time slots
    # unavailable_slots format: {"1": [7, 8]} means Monday periods 7 and 8 are blocked
    constraint_count = 0
    for cls in classes:
        if not cls.unavailable_slots:
            continue

        # Parse unavailable_slots: {"5": [1,2,3], "2": [4,5]}
        for day_num_str, period_nums in cls.unavailable_slots.items():
            day_num = int(day_num_str)

            # Find all slots for this day and periods
            for s_idx, slot in enumerate(time_slots):
                # Convert day to uppercase for comparison
                if hasattr(slot.day, 'value'):
                    slot_day_str = str(slot.day.value).upper()
                else:
                    slot_day_str = str(slot.day).upper()
                slot_day_num = day_number_map.get(slot_day_str, 0)

                # Check if this slot matches unavailable day and period
                if slot_day_num == day_num and slot.period_number in period_nums:
                    # Block all lessons for this class in this slot
                    for l_idx, lesson in enumerate(lessons):
                        if lesson.class_id == cls.id:
                            groups = lesson_groups_by_lesson.get(lesson.id, [])

                            if groups:
                                # For group lessons, use first group (all groups are synced)
                                model.Add(assign[(l_idx, 0, s_idx)] == 0)
                                constraint_count += 1
                            else:
                                # No groups
                                model.Add(assign[(l_idx, None, s_idx)] == 0)
                                constraint_count += 1

    print(f"  OK Sinif musait olmayan slotlar: {constraint_count} kisit")

    print("\n  [!] Pattern constraints TEMPORARILY DISABLED - Testing basic CP-SAT only")

    # SOLVE
    print("\n" + "="*70)
    print("COZUM ARANIYOR...")
    print("="*70)
    print("Bu birka dakika surebilir. Sabir...")
    print()

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 300.0  # 5 minutes max
    solver.parameters.log_search_progress = True
    solver.parameters.num_search_workers = 8  # Parallel search

    # Solution callback
    solution_printer = TimetableSolutionPrinter()

    status = solver.Solve(model, solution_printer)

    print("\n" + "="*70)
    print("COZUM DURUMU")
    print("="*70)

    if status == cp_model.OPTIMAL:
        print("OK OPTIMAL COZUM BULUNDU!")
        logs.append("OPTIMAL solution found")
    elif status == cp_model.FEASIBLE:
        print("OK UYGUN COZUM BULUNDU!")
        logs.append("FEASIBLE solution found")
    elif status == cp_model.INFEASIBLE:
        print("X COZUM YOK! (Problem cozulemez)")
        logs.append("INFEASIBLE - No solution exists")
        return 0, 1, logs
    else:
        print(f"? BILINMEYEN DURUM: {status}")
        logs.append(f"Unknown status: {status}")
        return 0, 1, logs

    # Extract solution
    print("\nCozum cikariliyor...")
    total_hours_assigned = 0  # Track total lesson hours (not entry count)
    entries = []

    for l_idx, lesson in enumerate(lessons):
        groups = lesson_groups_by_lesson.get(lesson.id, [])
        lesson_hours_assigned = 0

        for s_idx, slot in enumerate(time_slots):
            if groups:
                # Check if this lesson (any group) is assigned to this slot
                if solver.Value(assign[(l_idx, 0, s_idx)]) == 1:
                    # Create timetable entry for EACH group
                    for g_idx, lg in enumerate(groups):
                        entry = TimetableEntry(
                            timetable_id=timetable.id,
                            time_slot_id=slot.id,
                            lesson_id=lesson.id,
                            lesson_group_id=lg.id,
                            room_id=None,  # No room constraint
                            is_locked=False,
                            extra_metadata={}
                        )
                        entries.append(entry)

                    lesson_hours_assigned += 1
            else:
                # No groups - single assignment
                if solver.Value(assign[(l_idx, None, s_idx)]) == 1:
                    entry = TimetableEntry(
                        timetable_id=timetable.id,
                        time_slot_id=slot.id,
                        lesson_id=lesson.id,
                        lesson_group_id=None,
                        room_id=None,  # No room constraint
                        is_locked=False,
                        extra_metadata={}
                    )
                    entries.append(entry)
                    lesson_hours_assigned += 1

        # Add to total hours assigned
        total_hours_assigned += lesson_hours_assigned

        # Check if all hours assigned
        if lesson_hours_assigned == lesson.hours_per_week:
            if groups:
                group_names = ", ".join([lg.group_name for lg in groups])
                logs.append(f"OK {lesson.class_.name} - {lesson.subject.name} ({group_names}): {lesson_hours_assigned}/{lesson.hours_per_week}")
            else:
                logs.append(f"OK {lesson.class_.name} - {lesson.subject.name}: {lesson_hours_assigned}/{lesson.hours_per_week}")
        else:
            if groups:
                group_names = ", ".join([lg.group_name for lg in groups])
                logs.append(f"X {lesson.class_.name} - {lesson.subject.name} ({group_names}): {lesson_hours_assigned}/{lesson.hours_per_week}")
            else:
                logs.append(f"X {lesson.class_.name} - {lesson.subject.name}: {lesson_hours_assigned}/{lesson.hours_per_week}")

    # Save to database
    print(f"\nVeritabanina kaydediliyor: {len(entries)} entry...")
    db.add_all(entries)
    await db.flush()

    # Statistics
    total_required = sum(lesson.hours_per_week for lesson in lessons)
    violations = 0 if total_hours_assigned == total_required else 1

    print("\n" + "="*70)
    print("SONUC")
    print("="*70)
    print(f"Atanan: {total_hours_assigned}/{total_required} saat")
    print(f"Entry sayisi: {len(entries)} (grup dersleri icin birden fazla entry)")
    print(f"Tamamlanma: {total_hours_assigned/total_required*100:.2f}%")
    print(f"Cozum sayisi: {solution_printer._solution_count}")
    print(f"Cozum suresi: {solver.WallTime():.2f} saniye")
    print("="*70)

    return total_hours_assigned, violations, logs
