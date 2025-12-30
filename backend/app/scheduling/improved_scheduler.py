"""
Improved Timetable Scheduling Algorithm
This module provides a more robust scheduling algorithm with better constraint handling
"""
from typing import Dict, List, Tuple, Set, Optional
from uuid import UUID
from collections import defaultdict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.timetable import Timetable, TimetableEntry
from ..models.lesson import Lesson
from ..models.time_slot import TimeSlot
from ..models.room import Room
from ..models.class_model import Class
from ..models.teacher import Teacher


# Day number to day name mapping (frontend uses numbers, backend uses names)
DAY_NUMBER_TO_NAME = {
    "1": "monday",
    "2": "tuesday",
    "3": "wednesday",
    "4": "thursday",
    "5": "friday",
    "6": "saturday",
    "7": "sunday",
}


def normalize_unavailable_slots(unavailable_slots: dict) -> dict:
    """
    Convert frontend format {"1": [1,2,3], "2": [4,5]} or {"monday": [1,2,3]}
    to backend format {"monday": [1,2,3], "tuesday": [4,5]}
    Handles both string numbers and day names
    """
    if not unavailable_slots:
        return {}

    print(f"[NORMALIZE] INPUT: {unavailable_slots}")

    normalized = {}
    for key, periods in unavailable_slots.items():
        key_str = str(key)  # Ensure string
        # If key is a number string, convert to day name
        if key_str in DAY_NUMBER_TO_NAME:
            day_name = DAY_NUMBER_TO_NAME[key_str]
            normalized[day_name] = periods
            print(f"  -> Converted: '{key_str}' => '{day_name}' with {len(periods)} periods")
        else:
            # Already in day name format
            normalized[key_str.lower()] = periods
            print(f"  -> Kept: '{key_str}' => '{key_str.lower()}' with {len(periods)} periods")

    print(f"[NORMALIZE] OUTPUT: {normalized}")
    return normalized


class SchedulingConstraints:
    """Track and validate scheduling constraints"""

    def __init__(self):
        # Hard constraints (MUST be satisfied)
        # (time_slot_id, class_id) -> True
        self.class_busy: Dict[Tuple[UUID, UUID], bool] = {}
        # (time_slot_id, teacher_id) -> True
        self.teacher_busy: Dict[Tuple[UUID, UUID], bool] = {}
        # (time_slot_id, room_id) -> True
        self.room_busy: Dict[Tuple[UUID, UUID], bool] = {}

        # Soft constraints tracking (for better distribution)
        # lesson_id -> {day: count}
        self.lesson_daily_count: Dict[UUID, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        # (lesson_id, day) -> [period_numbers]
        self.lesson_periods_by_day: Dict[Tuple[UUID, str], List[int]] = defaultdict(list)
        # class_id -> {day: count}
        self.class_daily_count: Dict[UUID, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        # teacher_id -> {day: count}
        self.teacher_daily_count: Dict[UUID, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        # (class_id, day) -> total difficulty score
        self.class_daily_difficulty: Dict[Tuple[UUID, str], float] = defaultdict(float)
        # (class_id, day, period) -> difficulty_level (to track consecutive difficult lessons)
        self.class_period_difficulty: Dict[Tuple[UUID, str, int], int] = {}

    def is_class_available(self, slot_id: UUID, class_id: UUID, class_unavailable_slots: dict = None, day: str = None, period: int = None) -> bool:
        # Check if class is busy at this slot
        if (slot_id, class_id) in self.class_busy:
            return False

        # Check class's unavailable slots
        if class_unavailable_slots and day and period is not None:
            # Convert enum to string (slot.day is a DayOfWeek enum)
            # Use .value to get the actual day name from the enum
            day_str = day.value.lower() if hasattr(day, 'value') else day.lower()

            # DEBUG: Print availability check details
            print(f"  [CLASS CHECK] Day: {day} => {day_str}, Period: {period}")
            print(f"     Unavailable: {class_unavailable_slots}")

            if day_str in class_unavailable_slots:
                # Check specific period availability
                # Don't close entire day even if many periods are unavailable
                periods_list = class_unavailable_slots[day_str]
                print(f"     [!] Day {day_str} has {len(periods_list)} unavailable periods: {periods_list}")

                # Check if this specific period is unavailable
                if period in periods_list:
                    print(f"     [X] Period {period} is unavailable")
                    return False
            else:
                print(f"     [OK] Day {day_str} NOT in unavailable list - AVAILABLE")

        return True

    def is_teacher_available(self, slot_id: UUID, teacher_id: UUID, teacher_unavailable_slots: dict = None, day: str = None, period: int = None) -> bool:
        if teacher_id is None:
            return True

        # Check if teacher is busy at this slot
        if (slot_id, teacher_id) in self.teacher_busy:
            return False

        # Check teacher's unavailable slots
        if teacher_unavailable_slots and day and period is not None:
            # Convert enum to string (slot.day is a DayOfWeek enum)
            # Use .value to get the actual day name from the enum
            day_str = day.value.lower() if hasattr(day, 'value') else day.lower()

            # DEBUG: Print availability check details
            print(f"  [TEACHER CHECK] Day: {day} => {day_str}, Period: {period}")
            print(f"     Unavailable: {teacher_unavailable_slots}")

            if day_str in teacher_unavailable_slots:
                # Check specific period availability
                # Don't close entire day even if many periods are unavailable
                periods_list = teacher_unavailable_slots[day_str]
                print(f"     [!] Day {day_str} has {len(periods_list)} unavailable periods: {periods_list}")

                # Check if this specific period is unavailable
                if period in periods_list:
                    print(f"     [X] Period {period} is unavailable")
                    return False
            else:
                print(f"     [OK] Day {day_str} NOT in unavailable list - AVAILABLE")

        return True

    def is_room_available(self, slot_id: UUID, room_id: UUID) -> bool:
        if room_id is None:
            return True
        return (slot_id, room_id) not in self.room_busy

    def mark_class_busy(self, slot_id: UUID, class_id: UUID):
        self.class_busy[(slot_id, class_id)] = True

    def mark_teacher_busy(self, slot_id: UUID, teacher_id: UUID):
        if teacher_id:
            self.teacher_busy[(slot_id, teacher_id)] = True

    def mark_room_busy(self, slot_id: UUID, room_id: UUID):
        if room_id:
            self.room_busy[(slot_id, room_id)] = True

    def add_lesson_assignment(self, lesson_id: UUID, day: str, period: int, class_id: UUID, teacher_id: Optional[UUID], difficulty_level: int = 5):
        """Track lesson assignment for soft constraint evaluation"""
        self.lesson_daily_count[lesson_id][day] += 1
        self.lesson_periods_by_day[(lesson_id, day)].append(period)
        self.class_daily_count[class_id][day] += 1
        if teacher_id:
            self.teacher_daily_count[teacher_id][day] += 1
        # Track difficulty
        self.class_daily_difficulty[(class_id, day)] += difficulty_level
        self.class_period_difficulty[(class_id, day, period)] = difficulty_level

    def would_be_consecutive(self, lesson_id: UUID, day: str, period: int) -> bool:
        """Check if this assignment would create consecutive periods for the same lesson on same day"""
        periods = self.lesson_periods_by_day.get((lesson_id, day), [])
        if not periods:
            return False
        # Check if any existing period is adjacent to this one
        return any(abs(p - period) == 1 for p in periods)

    def get_lesson_day_count(self, lesson_id: UUID, day: str) -> int:
        """Get number of times this lesson is already scheduled on this day"""
        return self.lesson_daily_count[lesson_id][day]

    def get_class_day_count(self, class_id: UUID, day: str) -> int:
        """Get number of lessons this class has on this day"""
        return self.class_daily_count[class_id][day]

    def get_teacher_day_count(self, teacher_id: UUID, day: str) -> int:
        """Get number of lessons this teacher has on this day"""
        return self.teacher_daily_count[teacher_id][day]

    def would_exceed_consecutive_limit(self, lesson_id: UUID, day: str, period: int, max_consecutive: int) -> bool:
        """
        Check if assigning this lesson to this period would exceed max consecutive limit

        Args:
            lesson_id: The lesson being assigned
            day: The day being checked
            period: The period number being checked
            max_consecutive: Maximum consecutive lessons allowed

        Returns:
            True if would exceed limit, False otherwise
        """
        # Get existing periods for this lesson on this day
        existing_periods = sorted(self.lesson_periods_by_day.get((lesson_id, day), []))

        # Simulate adding this period
        all_periods = sorted(existing_periods + [period])

        # Find longest consecutive sequence
        if not all_periods:
            return False

        max_consecutive_count = 1
        current_consecutive_count = 1

        for i in range(1, len(all_periods)):
            if all_periods[i] == all_periods[i-1] + 1:
                # Consecutive
                current_consecutive_count += 1
                max_consecutive_count = max(max_consecutive_count, current_consecutive_count)
            else:
                # Not consecutive, reset counter
                current_consecutive_count = 1

        # Check if max consecutive count exceeds limit
        return max_consecutive_count > max_consecutive

    def would_exceed_max_hours_per_day(self, lesson_id: UUID, day: str, max_hours_per_day: Optional[int]) -> bool:
        """
        Check if assigning this lesson to this day would exceed max hours per day limit

        Args:
            lesson_id: The lesson being assigned
            day: The day being checked
            max_hours_per_day: Maximum hours this lesson can be scheduled on the same day (None means no limit)

        Returns:
            True if would exceed limit, False otherwise
        """
        if max_hours_per_day is None:
            return False

        # Get current count for this lesson on this day
        current_count = self.lesson_daily_count[lesson_id][day]

        # Check if adding one more would exceed the limit
        return current_count >= max_hours_per_day

    def get_class_daily_difficulty(self, class_id: UUID, day: str) -> float:
        """Get total difficulty score for this class on this day"""
        return self.class_daily_difficulty[(class_id, day)]

    def get_consecutive_difficulty_penalty(self, class_id: UUID, day: str, period: int, new_difficulty: int) -> float:
        """
        Calculate penalty for placing a difficult lesson next to another difficult lesson
        Returns penalty score (0 = no penalty, higher = worse)
        """
        penalty = 0.0

        # Check previous period
        prev_difficulty = self.class_period_difficulty.get((class_id, day, period - 1), 0)
        if prev_difficulty >= 7 and new_difficulty >= 7:
            penalty += 50  # Heavy penalty for two hard lessons in a row
        elif prev_difficulty >= 5 and new_difficulty >= 7:
            penalty += 25  # Medium penalty

        # Check next period (if already scheduled)
        next_difficulty = self.class_period_difficulty.get((class_id, day, period + 1), 0)
        if next_difficulty >= 7 and new_difficulty >= 7:
            penalty += 50
        elif next_difficulty >= 5 and new_difficulty >= 7:
            penalty += 25

        return penalty


class LessonScheduleItem:
    """Represents a single lesson or lesson group to be scheduled"""

    def __init__(
        self,
        lesson_id: UUID,
        class_id: UUID,
        subject_name: str,
        teacher_id: Optional[UUID] = None,
        group_id: Optional[UUID] = None,
        group_name: Optional[str] = None,
        room_id: Optional[UUID] = None,
        difficulty_level: int = 5
    ):
        self.lesson_id = lesson_id
        self.class_id = class_id
        self.subject_name = subject_name
        self.teacher_id = teacher_id
        self.group_id = group_id
        self.group_name = group_name
        self.room_id = room_id
        self.difficulty_level = difficulty_level

    def __repr__(self):
        group_str = f" ({self.group_name})" if self.group_name else ""
        return f"<LessonScheduleItem {self.subject_name}{group_str}>"


def calculate_slot_score(
    slot: TimeSlot,
    lesson_id: UUID,
    class_id: UUID,
    teacher_ids: List[Optional[UUID]],
    constraints: SchedulingConstraints,
    block_size: int = 1,
    max_daily_lessons: int = 8,
    difficulty_level: int = 5
) -> float:
    """
    Calculate a score for assigning a lesson to this slot.
    Higher score = better fit

    NEW SIMPLIFIED SCORING (each lesson block goes to different days):
    - PENALTY for having same lesson on same day (spread across week)
    - BONUS for consecutive periods within a block (for blocks > 1)
    - Avoid overloading class or teacher on a single day
    - Prefer earlier periods in the day
    - DIFFICULTY-BASED SCORING:
      * Hard lessons (7-10): Strong bonus for morning slots
      * Medium lessons (4-6): Neutral, slight preference for mid-day
      * Easy lessons (1-3): Slight preference for afternoon
    """
    score = 100.0  # Base score

    day = slot.day
    period = slot.period_number

    # Get lesson count on this day
    lessons_on_day = constraints.get_lesson_day_count(lesson_id, day)

    # BALANCED STRATEGY: Prefer spreading across different days, but don't make it impossible
    # Moderate penalty for having the same lesson on the same day
    score -= lessons_on_day * 20  # Moderate penalty to discourage (but not prevent) same day

    # If this is part of a multi-period block (block_size > 1), give bonus for consecutive periods
    if block_size > 1 and constraints.would_be_consecutive(lesson_id, day, period):
        score += 50  # Bonus for consecutive periods within a block

    # Penalty for overloaded class day
    class_lessons_on_day = constraints.get_class_day_count(class_id, day)
    if class_lessons_on_day >= max_daily_lessons:
        score -= 1000  # Very strong penalty if at max
    else:
        score -= class_lessons_on_day * 5

    # Penalty for overloaded teacher days
    for teacher_id in teacher_ids:
        if teacher_id:
            teacher_lessons_on_day = constraints.get_teacher_day_count(teacher_id, day)
            if teacher_lessons_on_day >= max_daily_lessons:
                score -= 1000
            else:
                score -= teacher_lessons_on_day * 3

    # DIFFICULTY-BASED SCORING
    # 1. Time-of-day preferences based on difficulty
    if difficulty_level >= 7:
        # Hard lessons: Strong preference for early periods (1-3)
        if period <= 3:
            score += 40  # Strong bonus for morning
        elif period <= 5:
            score += 10  # Small bonus for mid-morning
        else:
            score -= 30  # Penalty for afternoon/evening
    elif difficulty_level >= 4:
        # Medium difficulty: Slight preference for mid-day
        if period <= 2:
            score += 15  # Bonus for early morning
        elif period <= 6:
            score += 10  # Small bonus for morning/mid-day
        else:
            score -= 10  # Small penalty for late
    else:
        # Easy lessons: Flexible, slight preference for afternoon
        if period >= 6:
            score += 15  # Bonus for afternoon (students are tired)
        elif period <= 2:
            score -= 5  # Small penalty (save morning for hard subjects)

    # 2. Avoid consecutive difficult lessons for the class
    difficulty_penalty = constraints.get_consecutive_difficulty_penalty(class_id, day, period, difficulty_level)
    score -= difficulty_penalty

    # 3. Balance daily difficulty load
    daily_difficulty = constraints.get_class_daily_difficulty(class_id, day)
    # Penalty if day already has high difficulty load
    if daily_difficulty >= 30:  # Approximately 4+ hard lessons
        score -= 40
    elif daily_difficulty >= 20:  # Approximately 3+ medium-hard lessons
        score -= 20

    # 4. Small bonus for earlier periods (general preference)
    score += (10 - period) * 2

    return score


def get_room_for_lesson(
    lesson: Lesson,
    group_teacher_id: Optional[UUID],
    rooms: List[Room],
    constraints: SchedulingConstraints,
    slot_id: UUID,
    db_context
) -> Optional[UUID]:
    """
    Determine the appropriate room for a lesson based on:
    1. Subject requirements (lab, sports, etc.)
    2. Teacher's default room
    3. Class's default room
    4. Any available room

    Returns room_id or None
    """
    class_obj = lesson.class_
    subject_obj = lesson.subject

    # Get teacher object if we have an ID
    teacher_obj = None
    if group_teacher_id and hasattr(lesson, 'teacher') and lesson.teacher and lesson.teacher.id == group_teacher_id:
        teacher_obj = lesson.teacher

    # Check if subject requires special room type
    requires_special = subject_obj and subject_obj.requires_room_type in ['laboratory', 'sports', 'music', 'art']

    # Strategy 1: If subject requires special room, try teacher's room first
    if requires_special and teacher_obj and teacher_obj.default_room_id:
        if constraints.is_room_available(slot_id, teacher_obj.default_room_id):
            return teacher_obj.default_room_id

    # Strategy 2: Try class's default room (students stay in classroom, teachers move)
    if class_obj and class_obj.default_room_id:
        if constraints.is_room_available(slot_id, class_obj.default_room_id):
            return class_obj.default_room_id

    # Strategy 3: Find any available room matching requirements
    for room in rooms:
        if constraints.is_room_available(slot_id, room.id):
            # Check if room type matches if special room is required
            if requires_special and subject_obj:
                if room.room_type == subject_obj.requires_room_type:
                    return room.id
            else:
                # Any available room works
                return room.id

    return None


async def schedule_lessons_improved(
    timetable: Timetable,
    lessons: List[Lesson],
    time_slots: List[TimeSlot],
    rooms: List[Room],
    db: AsyncSession
) -> Tuple[int, int, List[str]]:
    """
    Improved scheduling algorithm with:
    - Better lesson distribution across days
    - Grouped lessons guarantee (same time slot for all teachers in a group)
    - Room assignment logic
    - Soft constraints (daily limits, consecutive lesson avoidance)

    Returns: (assigned_count, hard_violations, logs)
    """
    logs = []
    assigned_count = 0
    hard_violations = 0
    soft_violations = 0

    # Initialize constraints tracker
    constraints = SchedulingConstraints()

    # Filter out breaks and organize slots by day
    active_slots = [slot for slot in time_slots if not slot.is_break]
    slots_by_day: Dict[str, List[TimeSlot]] = defaultdict(list)
    for slot in active_slots:
        slots_by_day[slot.day].append(slot)

    # Sort slots within each day by period
    for day in slots_by_day:
        slots_by_day[day].sort(key=lambda s: s.period_number)

    logs.append(f"=== STARTING IMPROVED SCHEDULER ===")
    logs.append(f"Total lessons: {len(lessons)}")
    logs.append(f"Active time slots: {len(active_slots)}")
    logs.append(f"Available rooms: {len(rooms)}")
    logs.append(f"Days: {list(slots_by_day.keys())}")

    # DEBUG: Print to console
    print("=" * 80)
    print("SCHEDULER BAŞLADI - IMPROVED SCHEDULER")
    print(f"Toplam ders sayısı: {len(lessons)}")
    print(f"Aktif zaman slotları: {len(active_slots)}")
    print("=" * 80)

    # Get timetable-level max_consecutive_same_subject setting
    max_consecutive_same_subject = timetable.algorithm_parameters.get('max_consecutive_same_subject', 2) if timetable.algorithm_parameters else 2
    logs.append(f"Timetable max_consecutive_same_subject: {max_consecutive_same_subject}")
    print(f"Max consecutive same subject: {max_consecutive_same_subject}")

    # Create virtual rooms if needed
    if not rooms:
        logs.append("⚠️  No physical rooms - will skip room assignment")

    # Sort lessons by scheduling difficulty - schedule hardest-to-place lessons first
    # Priority:
    # 1. Grouped lessons (highest - need multiple teachers at same time)
    # 2. Single-hour lessons (limited placement options)
    # 3. Subject difficulty (harder subjects get better morning slots)
    # 4. More hours per week
    def lesson_priority(lesson):
        difficulty = lesson.subject.difficulty_level if lesson.subject else 5
        hours = lesson.hours_per_week
        is_grouped = lesson.num_groups and lesson.num_groups > 1
        is_single_hour = hours == 1

        # Scoring:
        # - Grouped lessons: +100000 (top priority)
        # - Single-hour lessons: +10000
        # - Difficulty: +difficulty * 100
        # - Hours: +hours
        score = 0
        if is_grouped:
            score += 100000
        if is_single_hour:
            score += 10000
        score += (difficulty * 100) + hours

        return score

    sorted_lessons = sorted(lessons, key=lesson_priority, reverse=True)

    # Log sorting info
    logs.append(f"\n=== LESSON SORTING (by scheduling difficulty) ===")
    for lesson in sorted_lessons[:10]:  # Show top 10
        diff = lesson.subject.difficulty_level if lesson.subject else 5
        subj_name = lesson.subject.name if lesson.subject else "Unknown"
        class_name = lesson.class_.name if lesson.class_ else "Unknown"
        is_grouped = lesson.num_groups and lesson.num_groups > 1
        priority = lesson_priority(lesson)
        logs.append(f"  [{priority:6d}] {class_name:10} {subj_name:30} (difficulty={diff}, hours={lesson.hours_per_week}, grouped={is_grouped})")
    if len(sorted_lessons) > 10:
        logs.append(f"  ... and {len(sorted_lessons) - 10} more lessons")

    # Process each lesson
    for lesson in sorted_lessons:
        # Get lesson details
        class_obj = lesson.class_
        subject_obj = lesson.subject
        teacher_obj = lesson.teacher

        subject_name = subject_obj.name if subject_obj else "Unknown"
        class_name = class_obj.name if class_obj else "Unknown"
        teacher_name = f"{teacher_obj.first_name} {teacher_obj.last_name}" if teacher_obj else "Unassigned"
        difficulty_level = subject_obj.difficulty_level if subject_obj else 5

        # Get unavailable slots and normalize format
        class_unavailable = normalize_unavailable_slots(class_obj.unavailable_slots) if class_obj and class_obj.unavailable_slots else {}

        # DEBUG: Log unavailable slots
        if class_unavailable:
            logs.append(f"DEBUG: Class {class_name} - unavailable_slots (raw): {class_obj.unavailable_slots}")
            logs.append(f"DEBUG: Class {class_name} - unavailable_slots (normalized): {class_unavailable}")

        teacher_unavailable = normalize_unavailable_slots(teacher_obj.unavailable_slots) if teacher_obj and teacher_obj.unavailable_slots else {}

        # DEBUG: Log teacher unavailable slots
        if teacher_unavailable:
            logs.append(f"DEBUG: Teacher {teacher_name} - unavailable_slots (raw): {teacher_obj.unavailable_slots}")
            logs.append(f"DEBUG: Teacher {teacher_name} - unavailable_slots (normalized): {teacher_unavailable}")

        hours_needed = lesson.hours_per_week
        has_groups = lesson.num_groups and lesson.num_groups > 1 and len(lesson.lesson_groups) > 0
        max_hours_per_day = lesson.max_hours_per_day  # Get the max hours per day constraint

        # Check distribution pattern with priority order:
        # 1. Lesson-level pattern (lesson.extra_metadata.user_distribution_pattern)
        # 2. Subject-level pattern (subject.default_distribution_format)
        # 3. Automatic based on max_consecutive_same_subject

        user_pattern = None
        preferred_block_sizes = None

        # Priority 1: Check lesson-level pattern
        if lesson.extra_metadata and lesson.extra_metadata.get('user_distribution_pattern'):
            user_pattern = lesson.extra_metadata.get('user_distribution_pattern')
            pattern_source = "lesson"
        # Priority 2: Check subject-level pattern
        elif subject_obj.default_distribution_format:
            user_pattern = subject_obj.default_distribution_format
            pattern_source = "subject"

        if user_pattern:
            # Parse user's preferred pattern (e.g., "1+3" -> [3, 1])
            try:
                preferred_block_sizes = sorted([int(x) for x in user_pattern.split('+')], reverse=True)
                use_double_periods = any(size > 1 for size in preferred_block_sizes)
                logs.append(f"Using {pattern_source}-level distribution pattern: {user_pattern}")
            except:
                # If parsing fails, create automatic pattern
                user_pattern = None
                logs.append(f"Failed to parse pattern '{user_pattern}', will auto-generate pattern")

        # Priority 3: Auto-generate pattern if no pattern was specified or parsing failed
        if not user_pattern or not preferred_block_sizes:
            # Create automatic pattern based on hours_needed and max_consecutive_same_subject
            # This ensures each block goes to a different day
            preferred_block_sizes = []
            remaining_hours = hours_needed
            block_size = min(max_consecutive_same_subject, remaining_hours)

            while remaining_hours > 0:
                if remaining_hours >= block_size:
                    preferred_block_sizes.append(block_size)
                    remaining_hours -= block_size
                else:
                    preferred_block_sizes.append(remaining_hours)
                    remaining_hours = 0

            # Sort in descending order (larger blocks first)
            preferred_block_sizes = sorted(preferred_block_sizes, reverse=True)
            use_double_periods = any(size > 1 for size in preferred_block_sizes)
            auto_pattern = '+'.join(map(str, preferred_block_sizes))
            logs.append(f"Auto-generated distribution pattern: {auto_pattern} (each block on different day)")
            pattern_source = "auto"

        logs.append(f"\n--- Processing: {subject_name} for {class_name} ---")
        logs.append(f"Teacher: {teacher_name}, Hours: {hours_needed}, Groups: {has_groups}")
        logs.append(f"Uses block-based assignment: {use_double_periods}, Max consecutive: {max_consecutive_same_subject}")
        if preferred_block_sizes:
            logs.append(f"Preferred block sizes: {preferred_block_sizes}")

        if has_groups:
            # GROUPED LESSON: All groups must be scheduled at the same time
            groups = lesson.lesson_groups
            logs.append(f"Number of groups: {len(groups)}")

            # Collect all teacher IDs and their unavailable slots for this grouped lesson
            group_teacher_ids = []
            group_teacher_unavailable = []
            for group in groups:
                group_teacher_id = group.teacher_id if group.teacher_id else lesson.teacher_id
                group_teacher_ids.append(group_teacher_id)

                # Get teacher's unavailable slots and normalize format
                if group.teacher and group.teacher.unavailable_slots:
                    group_teacher_unavailable.append(normalize_unavailable_slots(group.teacher.unavailable_slots))
                elif teacher_obj and teacher_obj.unavailable_slots:
                    group_teacher_unavailable.append(normalize_unavailable_slots(teacher_obj.unavailable_slots))
                else:
                    group_teacher_unavailable.append({})

            logs.append(f"Group teachers: {len(group_teacher_ids)}")

            hours_assigned = 0

            # Pattern-based assignment for grouped lessons
            if preferred_block_sizes:
                logs.append(f"  Using pattern-based assignment for grouped lesson: {user_pattern}")
                used_days = set()

                for block_index, block_size in enumerate(preferred_block_sizes):
                    if hours_assigned >= hours_needed:
                        break

                    logs.append(f"  Looking for block #{block_index + 1} of size {block_size} for grouped lesson")

                    # Find best day for this block (all groups together)
                    best_slots = None
                    best_score = float('-inf')
                    best_day = None

                    for day in slots_by_day:
                        # STRICT: Each block MUST go to a different day (user requirement)
                        # If pattern is "1+1", both blocks must be on different days
                        # If pattern is "2+2+1", all three blocks must be on different days
                        if day in used_days:
                            continue

                        day_slots = slots_by_day[day]
                        for i in range(len(day_slots)):
                            if i + block_size > len(day_slots):
                                continue

                            block = day_slots[i:i+block_size]

                            # Check if all groups can be scheduled in this block
                            block_valid = True
                            for slot in block:
                                # Check class availability
                                if not constraints.is_class_available(slot.id, lesson.class_id, class_unavailable, slot.day, slot.period_number):
                                    block_valid = False
                                    break

                                # Check all group teachers
                                for idx, teacher_id in enumerate(group_teacher_ids):
                                    teacher_unavail = group_teacher_unavailable[idx]
                                    if not constraints.is_teacher_available(slot.id, teacher_id, teacher_unavail, slot.day, slot.period_number):
                                        block_valid = False
                                        break

                                if not block_valid:
                                    break

                            if not block_valid:
                                continue

                            # Calculate score
                            total_score = 0
                            for slot in block:
                                score = calculate_slot_score(
                                    slot, lesson.id, lesson.class_id,
                                    group_teacher_ids, constraints,
                                    block_size=block_size,
                                    difficulty_level=difficulty_level
                                )
                                total_score += score

                            avg_score = total_score / len(block)
                            if avg_score > best_score:
                                best_score = avg_score
                                best_slots = block
                                best_day = day

                    # Assign best block found
                    if best_slots:
                        for slot in best_slots:
                            if hours_assigned >= hours_needed:
                                break

                            # Check room availability for all groups
                            group_rooms = []
                            rooms_ok = True

                            for idx, group in enumerate(groups):
                                group_teacher_id = group_teacher_ids[idx]
                                room_id = get_room_for_lesson(lesson, group_teacher_id, rooms, constraints, slot.id, db)

                                if room_id and not constraints.is_room_available(slot.id, room_id):
                                    rooms_ok = False
                                    break

                                group_rooms.append(room_id)

                            if not rooms_ok:
                                continue

                            # Create entries for ALL groups
                            for idx, group in enumerate(groups):
                                group_teacher_id = group_teacher_ids[idx]
                                room_id = group_rooms[idx]

                                entry = TimetableEntry(
                                    timetable_id=timetable.id,
                                    time_slot_id=slot.id,
                                    lesson_id=lesson.id,
                                    lesson_group_id=group.id,
                                    room_id=room_id
                                )
                                db.add(entry)
                                assigned_count += 1

                                # Mark constraints as busy
                                constraints.mark_teacher_busy(slot.id, group_teacher_id)
                                if room_id:
                                    constraints.mark_room_busy(slot.id, room_id)

                            # Mark class as busy
                            constraints.mark_class_busy(slot.id, lesson.class_id)
                            constraints.add_lesson_assignment(lesson.id, slot.day, slot.period_number, lesson.class_id, group_teacher_ids[0], difficulty_level)
                            hours_assigned += 1

                            if best_score < 0:
                                soft_violations += 1

                        used_days.add(best_day)
                        logs.append(f"  ✓ Assigned grouped lesson block #{block_index + 1} ({len(best_slots)} hours) on {best_day}")
                    else:
                        logs.append(f"  ⚠️  Could not find suitable block of size {block_size} for grouped lesson")

            # If pattern-based didn't assign all hours, use regular strategy
            if hours_assigned < hours_needed:
                logs.append(f"  Pattern assigned {hours_assigned}/{hours_needed}, using regular strategy for remaining")

                # Build candidate slots with scores
                candidate_slots = []
                for day in slots_by_day:
                    # CRITICAL: If using pattern-based assignment (preferred_block_sizes exists),
                    # we MUST respect used_days to ensure each block goes to different days
                    if preferred_block_sizes and day in used_days:
                        continue

                    for slot in slots_by_day[day]:
                        # Check hard constraints
                        # 1. Class must be available (including unavailable slots)
                        if not constraints.is_class_available(slot.id, lesson.class_id, class_unavailable, slot.day, slot.period_number):
                            logs.append(f"  SKIP: {slot.day} P{slot.period_number} - Class {class_name} unavailable")
                            continue

                        # 2. ALL group teachers must be available (including unavailable slots)
                        all_teachers_available = True
                        for idx, teacher_id in enumerate(group_teacher_ids):
                            teacher_unavail = group_teacher_unavailable[idx]
                            if not constraints.is_teacher_available(slot.id, teacher_id, teacher_unavail, slot.day, slot.period_number):
                                all_teachers_available = False
                                break

                        if not all_teachers_available:
                            logs.append(f"  SKIP: {slot.day} P{slot.period_number} - Teacher unavailable")
                            continue

                        # 3. Check max consecutive same subject limit (HARD CONSTRAINT)
                        if constraints.would_exceed_consecutive_limit(lesson.id, slot.day, slot.period_number, max_consecutive_same_subject):
                            logs.append(f"  SKIP: {slot.day} P{slot.period_number} - Would exceed max consecutive limit ({max_consecutive_same_subject})")
                            continue

                        # 4. Check max hours per day limit (HARD CONSTRAINT)
                        if constraints.would_exceed_max_hours_per_day(lesson.id, slot.day, max_hours_per_day):
                            logs.append(f"  SKIP: {slot.day} P{slot.period_number} - Would exceed max hours per day ({max_hours_per_day})")
                            continue

                        # Calculate score for this slot
                        score = calculate_slot_score(
                            slot, lesson.id, lesson.class_id,
                            group_teacher_ids, constraints,
                            block_size=1,  # Individual slot assignment
                            difficulty_level=difficulty_level
                        )

                        candidate_slots.append((score, slot))

                # Sort by score (highest first)
                candidate_slots.sort(key=lambda x: x[0], reverse=True)

                # Assign to best available slots
                for score, slot in candidate_slots:
                    if hours_assigned >= hours_needed:
                        break

                    # Double-check constraints (might have changed)
                    if not constraints.is_class_available(slot.id, lesson.class_id, class_unavailable, slot.day, slot.period_number):
                        continue

                    all_teachers_available = True
                    for idx, teacher_id in enumerate(group_teacher_ids):
                        teacher_unavail = group_teacher_unavailable[idx]
                        if not constraints.is_teacher_available(slot.id, teacher_id, teacher_unavail, slot.day, slot.period_number):
                            all_teachers_available = False
                            break

                    if not all_teachers_available:
                        continue

                    # Check room availability for all groups
                    group_rooms = []
                    rooms_ok = True

                    for idx, group in enumerate(groups):
                        group_teacher_id = group_teacher_ids[idx]
                        room_id = get_room_for_lesson(lesson, group_teacher_id, rooms, constraints, slot.id, db)

                        if room_id and not constraints.is_room_available(slot.id, room_id):
                            rooms_ok = False
                            break

                        group_rooms.append(room_id)

                    if not rooms_ok:
                        continue

                    # All constraints satisfied - create entries for ALL groups
                    for idx, group in enumerate(groups):
                        group_teacher_id = group_teacher_ids[idx]
                        room_id = group_rooms[idx]

                        entry = TimetableEntry(
                            timetable_id=timetable.id,
                            time_slot_id=slot.id,
                        lesson_id=lesson.id,
                        lesson_group_id=group.id,
                        room_id=room_id
                    )
                    db.add(entry)
                    assigned_count += 1

                    # Mark constraints as busy
                    constraints.mark_teacher_busy(slot.id, group_teacher_id)
                    if room_id:
                        constraints.mark_room_busy(slot.id, room_id)

                    # Track soft constraints
                    constraints.add_lesson_assignment(lesson.id, slot.day, slot.period_number, lesson.class_id, group_teacher_id, difficulty_level)

                    logs.append(f"  ✓ {subject_name} - {group.group_name} → {slot.day} P{slot.period_number} (Score: {score:.1f})")

                # CRITICAL: If using pattern-based assignment, track which day was used
                # to prevent assigning remaining hours to the same day
                # (Mark AFTER all groups are assigned to avoid duplicate tracking)
                if preferred_block_sizes:
                    used_days.add(slot.day)

                # Mark class as busy
                constraints.mark_class_busy(slot.id, lesson.class_id)
                hours_assigned += 1

                # Track if we violated soft constraints
                if score < 0:
                    soft_violations += 1

            # Check if all hours were assigned
            if hours_assigned < hours_needed:
                shortage = hours_needed - hours_assigned
                hard_violations += shortage
                logs.append(f"  ⚠️  WARNING: Only {hours_assigned}/{hours_needed} hours assigned (shortage: {shortage})")
            else:
                logs.append(f"  ✅ Successfully assigned all {hours_assigned} hours")

        else:
            # REGULAR LESSON: Schedule normally
            teacher_id = lesson.teacher_id
            hours_assigned = 0

            if use_double_periods or preferred_block_sizes:
                # STRATEGY: Try to find consecutive blocks first
                # If we have preferred_block_sizes, use pattern-based assignment (each block on different day)
                # Otherwise, use regular block strategy

                if preferred_block_sizes:
                    logs.append(f"  Strategy: Pattern-based assignment - {user_pattern} (each block on different day)")
                else:
                    logs.append(f"  Strategy: Looking for consecutive blocks (max {max_consecutive_same_subject} periods)")

                # Track which days have been used for each block (for pattern-based assignment)
                used_days = set()

                # If using preferred pattern, process each block sequentially
                # Otherwise, find all possible blocks and sort by score
                if preferred_block_sizes:
                    # Pattern-based: Assign each block from the pattern to a different day
                    for block_index, block_size in enumerate(preferred_block_sizes):
                        if hours_assigned >= hours_needed:
                            break

                        logs.append(f"  Looking for block #{block_index + 1} of size {block_size}")

                        # Find best slot for this block size on unused days
                        best_block = None
                        best_score = float('-inf')
                        best_day = None

                        for day in slots_by_day:
                            # STRICT: Each block MUST go to a different day (user requirement)
                            # If pattern is "1+1", both blocks must be on different days
                            # If pattern is "2+2+1", all three blocks must be on different days
                            if day in used_days:
                                continue

                            day_slots = slots_by_day[day]

                            for i in range(len(day_slots)):
                                if i + block_size > len(day_slots):
                                    continue

                                block = day_slots[i:i+block_size]

                                # Check if all slots in block pass constraints
                                all_available = True
                                for slot in block:
                                    if not constraints.is_class_available(slot.id, lesson.class_id, class_unavailable, slot.day, slot.period_number):
                                        all_available = False
                                        break
                                    if not constraints.is_teacher_available(slot.id, teacher_id, teacher_unavailable, slot.day, slot.period_number):
                                        all_available = False
                                        break

                                if not all_available:
                                    continue

                                # Check max hours per day limit for this block
                                if block and constraints.would_exceed_max_hours_per_day(lesson.id, block[0].day, max_hours_per_day):
                                    current_count = constraints.get_lesson_day_count(lesson.id, block[0].day)
                                    if current_count + len(block) > (max_hours_per_day or float('inf')):
                                        all_available = False

                                if not all_available:
                                    continue

                                # Calculate score for this block
                                total_score = 0
                                for slot in block:
                                    teacher_ids = [teacher_id] if teacher_id else []
                                    score = calculate_slot_score(
                                        slot, lesson.id, lesson.class_id,
                                        teacher_ids, constraints,
                                        block_size=block_size,
                                        difficulty_level=difficulty_level
                                    )
                                    total_score += score

                                avg_score = total_score / len(block)

                                if avg_score > best_score:
                                    best_score = avg_score
                                    best_block = block
                                    best_day = day

                        # Assign the best block found for this size
                        if best_block:
                            block_assigned = 0
                            for slot in best_block:
                                if hours_assigned >= hours_needed:
                                    break

                                # Get room
                                room_id = get_room_for_lesson(lesson, teacher_id, rooms, constraints, slot.id, db)

                                if room_id and not constraints.is_room_available(slot.id, room_id):
                                    continue

                                # Create entry
                                entry = TimetableEntry(
                                    timetable_id=timetable.id,
                                    time_slot_id=slot.id,
                                    lesson_id=lesson.id,
                                    lesson_group_id=None,
                                    room_id=room_id
                                )
                                db.add(entry)
                                assigned_count += 1

                                # Mark constraints
                                constraints.mark_class_busy(slot.id, lesson.class_id)
                                constraints.mark_teacher_busy(slot.id, teacher_id)
                                if room_id:
                                    constraints.mark_room_busy(slot.id, room_id)

                                # Track soft constraints
                                constraints.add_lesson_assignment(lesson.id, slot.day, slot.period_number, lesson.class_id, teacher_id, difficulty_level)

                                hours_assigned += 1
                                block_assigned += 1

                                if best_score < 0:
                                    soft_violations += 1

                            if block_assigned > 0:
                                used_days.add(best_day)
                                logs.append(f"  ✓ Assigned block #{block_index + 1} ({block_assigned} hours) on {best_day}: P{best_block[0].period_number}-{best_block[block_assigned-1].period_number} (score: {best_score:.1f})")
                        else:
                            logs.append(f"  ⚠️  Could not find suitable block of size {block_size}")

                else:
                    # Regular block strategy (no pattern, just find best blocks)
                    # Find all possible consecutive blocks across all days
                    candidate_blocks = []

                    for day in slots_by_day:
                        day_slots = slots_by_day[day]
                        # Try to find consecutive blocks of size max_consecutive_same_subject
                        for i in range(len(day_slots)):
                            # Try different block sizes (from max down to 1)
                            # IMPORTANT: range(n, 0, -1) includes 1 but excludes 0
                            block_sizes_to_try = range(min(max_consecutive_same_subject, hours_needed - hours_assigned), 0, -1)

                            # DEBUG: Log block sizes being tried
                            logs.append(f"  [DEBUG] Hours assigned so far: {hours_assigned}/{hours_needed}, Block sizes to try: {list(block_sizes_to_try)}")

                            for block_size in block_sizes_to_try:
                                if i + block_size > len(day_slots):
                                    continue

                                block = day_slots[i:i+block_size]

                                # NOTE: day_slots is already filtered (is_break=False) and sorted by period_number
                                # So elements in day_slots are already consecutive LESSON periods
                                # We don't need to check period_number consecutiveness because breaks are excluded
                                # Example: day_slots might have periods [1,4,6,8] which are consecutive lessons
                                # even though period_numbers aren't consecutive numbers

                                # Check if all slots in block pass constraints
                                all_available = True
                                for slot in block:
                                    if not constraints.is_class_available(slot.id, lesson.class_id, class_unavailable, slot.day, slot.period_number):
                                        all_available = False
                                        break
                                    if not constraints.is_teacher_available(slot.id, teacher_id, teacher_unavailable, slot.day, slot.period_number):
                                        all_available = False
                                        break
                                    # NOTE: We don't check would_exceed_consecutive_limit here because:
                                    # 1. We're already limiting block_size to max_consecutive_same_subject
                                    # 2. We're intentionally creating consecutive blocks
                                    # 3. The function checks period_number consecutiveness, but period_numbers
                                    #    aren't consecutive due to breaks (e.g., 1, 3, 4, 5... not 1, 2, 3, 4...)
                                    #    so it would incorrectly reject all valid blocks

                                if not all_available:
                                    continue

                                # Check max hours per day limit for this block
                                # All slots in block are on same day, so check once
                                if block and constraints.would_exceed_max_hours_per_day(lesson.id, block[0].day, max_hours_per_day):
                                    # Check if assigning this entire block would exceed the limit
                                    current_count = constraints.get_lesson_day_count(lesson.id, block[0].day)
                                    if current_count + len(block) > (max_hours_per_day or float('inf')):
                                        all_available = False

                                if not all_available:
                                    continue

                                # Calculate average score for this block
                                total_score = 0
                                for slot in block:
                                    teacher_ids = [teacher_id] if teacher_id else []
                                    score = calculate_slot_score(
                                        slot, lesson.id, lesson.class_id,
                                        teacher_ids, constraints,
                                        block_size=len(block),
                                        difficulty_level=difficulty_level
                                    )
                                    total_score += score

                                avg_score = total_score / len(block)
                                candidate_blocks.append((avg_score, block))
                                logs.append(f"  Found {len(block)}-block on {day}: P{block[0].period_number}-{block[-1].period_number} (avg score: {avg_score:.1f})")

                    # Sort blocks by average score + block size bonus (prefer larger blocks when max_consecutive allows)
                    # Add bonus points per period in block to favor larger blocks (e.g., 3-block over 2-block)
                    # Using 20 points per period to strongly favor larger blocks
                    candidate_blocks.sort(key=lambda x: (x[0] + len(x[1]) * 20), reverse=True)
                    logs.append(f"  Total blocks found: {len(candidate_blocks)}")

                    # Assign blocks
                    for avg_score, block in candidate_blocks:
                        if hours_assigned >= hours_needed:
                            break

                        # Double-check all slots in block are still available
                        all_still_available = True
                        for slot in block:
                            if not constraints.is_class_available(slot.id, lesson.class_id, class_unavailable, slot.day, slot.period_number):
                                all_still_available = False
                                break
                            if not constraints.is_teacher_available(slot.id, teacher_id, teacher_unavailable, slot.day, slot.period_number):
                                all_still_available = False
                                break

                        if not all_still_available:
                            continue

                        # Assign all slots in this block
                        block_assigned = 0
                        for slot in block:
                            if hours_assigned >= hours_needed:
                                break

                            # Get room
                            room_id = get_room_for_lesson(lesson, teacher_id, rooms, constraints, slot.id, db)

                            if room_id and not constraints.is_room_available(slot.id, room_id):
                                continue

                            # Create entry
                            entry = TimetableEntry(
                                timetable_id=timetable.id,
                                time_slot_id=slot.id,
                                lesson_id=lesson.id,
                                lesson_group_id=None,
                                room_id=room_id
                            )
                            db.add(entry)
                            assigned_count += 1

                            # Mark constraints
                            constraints.mark_class_busy(slot.id, lesson.class_id)
                            constraints.mark_teacher_busy(slot.id, teacher_id)
                            if room_id:
                                constraints.mark_room_busy(slot.id, room_id)

                            # Track soft constraints
                            constraints.add_lesson_assignment(lesson.id, slot.day, slot.period_number, lesson.class_id, teacher_id, difficulty_level)

                            hours_assigned += 1
                            block_assigned += 1

                            if avg_score < 0:
                                soft_violations += 1

                        if block_assigned > 0:
                            logs.append(f"  ✓ Assigned {block_assigned}-block on {block[0].day}: P{block[0].period_number}-{block[block_assigned-1].period_number}")

                # If not all hours assigned, fall back to individual slot assignment
                if hours_assigned < hours_needed:
                    logs.append(f"  Blocks assigned {hours_assigned}/{hours_needed} hours, assigning remaining individually")

            # For remaining hours (or if use_double_periods=False), assign individually
            if hours_assigned < hours_needed:
                # RELAXED FALLBACK: If pattern-based assignment failed to place ANY hours,
                # ignore the "different days" requirement and accept any available slots
                relax_day_constraint = (preferred_block_sizes and hours_assigned == 0)
                if relax_day_constraint:
                    logs.append(f"  ⚠️  Pattern-based assignment failed completely, relaxing day constraints")

                # Build candidate slots with scores
                candidate_slots = []
                for day in slots_by_day:
                    # If using pattern-based assignment and we've already assigned some hours,
                    # respect used_days to ensure blocks go to different days.
                    # BUT if pattern completely failed (hours_assigned==0), accept any day.
                    if preferred_block_sizes and day in used_days and not relax_day_constraint:
                        continue

                    for slot in slots_by_day[day]:
                        # Check hard constraints (including unavailable slots)
                        if not constraints.is_class_available(slot.id, lesson.class_id, class_unavailable, slot.day, slot.period_number):
                            continue

                        if not constraints.is_teacher_available(slot.id, teacher_id, teacher_unavailable, slot.day, slot.period_number):
                            continue

                        # Check max consecutive same subject limit (HARD CONSTRAINT)
                        if constraints.would_exceed_consecutive_limit(lesson.id, slot.day, slot.period_number, max_consecutive_same_subject):
                            continue

                        # Check max hours per day limit (HARD CONSTRAINT)
                        if constraints.would_exceed_max_hours_per_day(lesson.id, slot.day, max_hours_per_day):
                            continue

                        # Calculate score
                        teacher_ids = [teacher_id] if teacher_id else []
                        score = calculate_slot_score(
                            slot, lesson.id, lesson.class_id,
                            teacher_ids, constraints,
                            block_size=1,  # Individual slot assignment
                            difficulty_level=difficulty_level
                        )

                        candidate_slots.append((score, slot))

                # Sort by score (highest first)
                candidate_slots.sort(key=lambda x: x[0], reverse=True)

                # Assign to best available slots
                for score, slot in candidate_slots:
                    if hours_assigned >= hours_needed:
                        break

                    # Double-check constraints
                    if not constraints.is_class_available(slot.id, lesson.class_id, class_unavailable, slot.day, slot.period_number):
                        continue

                    if not constraints.is_teacher_available(slot.id, teacher_id, teacher_unavailable, slot.day, slot.period_number):
                        continue

                    # Get room
                    room_id = get_room_for_lesson(lesson, teacher_id, rooms, constraints, slot.id, db)

                    if room_id and not constraints.is_room_available(slot.id, room_id):
                        # Try to find another slot if room not available
                        continue

                    # Create entry
                    entry = TimetableEntry(
                        timetable_id=timetable.id,
                        time_slot_id=slot.id,
                        lesson_id=lesson.id,
                        lesson_group_id=None,
                        room_id=room_id
                    )
                    db.add(entry)
                    assigned_count += 1

                    # Mark constraints
                    constraints.mark_class_busy(slot.id, lesson.class_id)
                    constraints.mark_teacher_busy(slot.id, teacher_id)
                    if room_id:
                        constraints.mark_room_busy(slot.id, room_id)

                    # Track soft constraints
                    constraints.add_lesson_assignment(lesson.id, slot.day, slot.period_number, lesson.class_id, teacher_id, difficulty_level)

                    # CRITICAL: If using pattern-based assignment, track which day was used
                    # to prevent assigning remaining hours to the same day
                    # UNLESS we're in relaxed mode (pattern failed completely)
                    if preferred_block_sizes and not relax_day_constraint:
                        used_days.add(slot.day)

                    hours_assigned += 1
                    logs.append(f"  ✓ {subject_name} ({teacher_name}) → {slot.day} P{slot.period_number} (Score: {score:.1f})")

                    if score < 0:
                        soft_violations += 1

            # Check if all hours were assigned
            if hours_assigned < hours_needed:
                shortage = hours_needed - hours_assigned
                hard_violations += shortage
                logs.append(f"  ⚠️  WARNING: Only {hours_assigned}/{hours_needed} hours assigned (shortage: {shortage})")
            else:
                logs.append(f"  ✅ Successfully assigned all {hours_assigned} hours")

    logs.append(f"\n=== SCHEDULING COMPLETE ===")
    logs.append(f"Total entries created: {assigned_count}")
    logs.append(f"Hard constraint violations: {hard_violations}")
    logs.append(f"Soft constraint violations: {soft_violations}")

    return assigned_count, hard_violations, logs
