"""
Timetables API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload, joinedload
from uuid import UUID
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional, Dict, Set
from collections import defaultdict
import traceback

from ..database import get_db
from ..models.timetable import Timetable, TimetableStatus, AlgorithmType, TimetableEntry
from ..models.lesson import Lesson, LessonGroup
from ..models.time_slot import TimeSlot
from ..models.room import Room
from ..models.class_model import Class
from ..models.teacher import Teacher
from ..scheduling import schedule_lessons_improved, schedule_with_cpsat

router = APIRouter()


async def _save_distribution_patterns(timetable_id: UUID, db: AsyncSession):
    """
    Analyze existing timetable entries and save distribution patterns to lessons.
    This preserves user's manual distribution choices when regenerating.

    For example, if user manually arranged a 4-hour Math lesson as 1+3,
    we save this as "1+3" in lesson.extra_metadata['user_distribution_pattern']
    """
    # Get all entries for this timetable with time slot info
    entries_query = select(TimetableEntry).where(
        TimetableEntry.timetable_id == timetable_id
    ).options(selectinload(TimetableEntry.time_slot))

    entries_result = await db.execute(entries_query)
    entries = list(entries_result.scalars().all())

    if not entries:
        return  # No entries to analyze

    # Group entries by lesson_id
    entries_by_lesson: Dict[UUID, list] = defaultdict(list)
    for entry in entries:
        if entry.lesson_id:  # Regular lessons (not lesson groups)
            entries_by_lesson[entry.lesson_id].append(entry)

    # Analyze pattern for each lesson
    for lesson_id, lesson_entries in entries_by_lesson.items():
        # Group by day
        entries_by_day: Dict[str, list] = defaultdict(list)
        for entry in lesson_entries:
            if entry.time_slot:
                day = entry.time_slot.day
                period = entry.time_slot.period_number
                entries_by_day[day].append(period)

        # Find block sizes per day
        # Simply count how many entries per day - this represents the pattern
        # For example: Monday=2, Wednesday=2 -> pattern "2+2"
        #              Monday=1, Tuesday=3 -> pattern "3+1"
        block_sizes = []
        for day, periods in entries_by_day.items():
            # Number of entries on this day = block size
            block_sizes.append(len(periods))

        # Create pattern string (e.g., "2+2" or "1+3")
        if block_sizes:
            pattern = "+".join(str(size) for size in sorted(block_sizes, reverse=True))

            # Update lesson's extra_metadata
            lesson_query = select(Lesson).where(Lesson.id == lesson_id)
            lesson_result = await db.execute(lesson_query)
            lesson = lesson_result.scalar_one_or_none()

            if lesson:
                if not lesson.extra_metadata:
                    lesson.extra_metadata = {}
                lesson.extra_metadata['user_distribution_pattern'] = pattern
                await db.commit()


class TimetableCreate(BaseModel):
    """Timetable creation request model"""
    school_id: str
    name: str
    algorithm: str = "cpsat"
    academic_year: Optional[str] = None
    semester: Optional[str] = None
    algorithm_parameters: Optional[Dict] = None


@router.get("/")
async def list_timetables(
    school_id: UUID = None,
    skip: int = 0,
    limit: int = 5000,
    show_inactive: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """List all timetables, optionally filtered by school"""
    query = select(Timetable)

    # Only filter by is_active if show_inactive is False
    if not show_inactive:
        query = query.where(Timetable.is_active == True)

    if school_id:
        query = query.where(Timetable.school_id == school_id)

    query = query.offset(skip).limit(limit).order_by(Timetable.created_at.desc())
    result = await db.execute(query)
    timetables = result.scalars().all()

    return {
        "total": len(timetables),
        "timetables": [
            {
                "id": str(timetable.id),
                "school_id": str(timetable.school_id),
                "name": timetable.name,
                "academic_year": timetable.academic_year,
                "semester": timetable.semester,
                "algorithm": timetable.algorithm,
                "status": timetable.status,
                "generation_started_at": timetable.generation_started_at.isoformat() if timetable.generation_started_at else None,
                "generation_completed_at": timetable.generation_completed_at.isoformat() if timetable.generation_completed_at else None,
                "generation_duration_seconds": timetable.generation_duration_seconds,
                "hard_constraint_violations": timetable.hard_constraint_violations,
                "soft_constraint_score": timetable.soft_constraint_score,
                "is_active": timetable.is_active,
                "created_at": timetable.created_at.isoformat() if timetable.created_at else None,
            }
            for timetable in timetables
        ]
    }


@router.get("/{timetable_id}/statistics")
async def get_timetable_statistics(
    timetable_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get statistics for a timetable including:
    - Total lessons and hours
    - Assigned vs unassigned lessons
    - List of unassigned lessons with details
    """
    # Verify timetable exists
    timetable_query = select(Timetable).where(Timetable.id == timetable_id)
    timetable_result = await db.execute(timetable_query)
    timetable = timetable_result.scalar_one_or_none()

    if not timetable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Timetable with id {timetable_id} not found"
        )

    # Get all lessons for this school
    lessons_query = select(Lesson).where(
        Lesson.school_id == timetable.school_id,
        Lesson.is_active == True
    ).options(
        selectinload(Lesson.class_),
        selectinload(Lesson.subject),
        selectinload(Lesson.teacher),
        selectinload(Lesson.lesson_groups).selectinload(LessonGroup.teacher)
    )
    lessons_result = await db.execute(lessons_query)
    all_lessons = list(lessons_result.scalars().all())

    # Get all timetable entries
    entries_query = select(TimetableEntry).where(
        TimetableEntry.timetable_id == timetable_id
    )
    entries_result = await db.execute(entries_query)
    entries = list(entries_result.scalars().all())

    # Count assigned hours per lesson (including lesson groups)
    # For grouped lessons, multiple groups at the same time slot = 1 hour (not multiple hours)
    lesson_assigned_hours: Dict[UUID, int] = defaultdict(int)
    lesson_slot_counted: Dict[tuple, bool] = {}  # Track (lesson_id, time_slot_id) to avoid double counting

    for entry in entries:
        key = (str(entry.lesson_id), str(entry.time_slot_id))  # Convert UUIDs to strings for consistent comparison
        if key not in lesson_slot_counted:
            lesson_assigned_hours[entry.lesson_id] += 1
            lesson_slot_counted[key] = True

    # Calculate statistics
    total_lessons = len(all_lessons)
    total_required_hours = sum(lesson.hours_per_week for lesson in all_lessons)
    total_assigned_hours = sum(lesson_assigned_hours.values())

    fully_assigned_lessons = []
    partially_assigned_lessons = []
    unassigned_lessons = []

    # Track hours for each category
    fully_assigned_hours = 0
    partially_assigned_hours = 0
    unassigned_hours = 0

    for lesson in all_lessons:
        assigned_hours = lesson_assigned_hours.get(lesson.id, 0)
        required_hours = lesson.hours_per_week

        # Get teacher info - prioritize lesson.teacher, fall back to group teachers
        teacher_id = lesson.teacher_id
        teacher_name = None

        # Check teacher_id instead of lesson.teacher to avoid SQLAlchemy lazy loading issues
        if lesson.teacher_id and lesson.teacher:
            teacher_name = f"{lesson.teacher.first_name} {lesson.teacher.last_name}"
        elif lesson.num_groups > 1:
            # For grouped lessons without main teacher, query group teachers from DB
            try:
                group_teachers_query = select(LessonGroup).where(
                    LessonGroup.lesson_id == lesson.id
                ).options(selectinload(LessonGroup.teacher))
                group_teachers_result = await db.execute(group_teachers_query)
                lesson_groups_list = list(group_teachers_result.scalars().all())

                if len(lesson_groups_list) > 0:
                    group_teachers = []
                    for group in lesson_groups_list:
                        if group.teacher:
                            group_teachers.append(f"{group.teacher.first_name} {group.teacher.last_name}")
                            if not teacher_id:
                                teacher_id = group.teacher_id
                    if group_teachers:
                        teacher_name = ", ".join(sorted(set(group_teachers)))  # Unique teachers
            except Exception as e:
                # If query fails, at least indicate it's a grouped lesson
                teacher_name = f"[Grouped lesson - {lesson.num_groups} groups]"

        lesson_data = {
            "id": str(lesson.id),
            "class_id": str(lesson.class_id),
            "class_name": lesson.class_.name if lesson.class_ else None,
            "subject_id": str(lesson.subject_id),
            "subject_name": lesson.subject.name if lesson.subject else None,
            "teacher_id": str(teacher_id) if teacher_id else None,
            "teacher_name": teacher_name,
            "required_hours": required_hours,
            "assigned_hours": assigned_hours,
            "unassigned_hours": required_hours - assigned_hours,
            "num_groups": lesson.num_groups,
            "has_groups": lesson.num_groups > 1 and len(lesson.lesson_groups) > 0
        }

        if assigned_hours == 0:
            unassigned_lessons.append(lesson_data)
            unassigned_hours += required_hours
        elif assigned_hours < required_hours:
            partially_assigned_lessons.append(lesson_data)
            partially_assigned_hours += assigned_hours
        else:
            fully_assigned_lessons.append(lesson_data)
            fully_assigned_hours += assigned_hours

    return {
        "timetable_id": str(timetable_id),
        "timetable_name": timetable.name,
        "timetable_status": timetable.status,
        "summary": {
            "total_lessons": total_lessons,
            "total_required_hours": total_required_hours,
            "total_assigned_hours": total_assigned_hours,
            "total_unassigned_hours": total_required_hours - total_assigned_hours,
            "fully_assigned_count": len(fully_assigned_lessons),
            "partially_assigned_count": len(partially_assigned_lessons),
            "unassigned_count": len(unassigned_lessons),
            "fully_assigned_hours": fully_assigned_hours,
            "partially_assigned_hours": partially_assigned_hours,
            "unassigned_hours": unassigned_hours,
            "completion_percentage": round((total_assigned_hours / total_required_hours * 100) if total_required_hours > 0 else 0, 2)
        },
        "fully_assigned_lessons": fully_assigned_lessons,
        "partially_assigned_lessons": partially_assigned_lessons,
        "unassigned_lessons": unassigned_lessons
    }


@router.get("/{timetable_id}")
async def get_timetable(
    timetable_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get timetable by ID"""
    from sqlalchemy.orm import joinedload
    query = (
        select(Timetable)
        .options(joinedload(Timetable.violations))
        .where(Timetable.id == timetable_id)
    )
    result = await db.execute(query)
    timetable = result.unique().scalar_one_or_none()

    if not timetable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Timetable with id {timetable_id} not found"
        )

    return {
        "id": str(timetable.id),
        "school_id": str(timetable.school_id),
        "name": timetable.name,
        "academic_year": timetable.academic_year,
        "semester": timetable.semester,
        "algorithm": timetable.algorithm,
        "status": timetable.status,
        "generation_started_at": timetable.generation_started_at.isoformat() if timetable.generation_started_at else None,
        "generation_completed_at": timetable.generation_completed_at.isoformat() if timetable.generation_completed_at else None,
        "generation_duration_seconds": timetable.generation_duration_seconds,
        "hard_constraint_violations": timetable.hard_constraint_violations,
        "soft_constraint_score": timetable.soft_constraint_score,
        "algorithm_parameters": timetable.algorithm_parameters,
        "generation_logs": timetable.generation_logs,
        "violations": [
            {
                "id": str(v.id),
                "constraint_type": v.constraint_type,
                "severity": v.severity,
                "description": v.description,
                "affected_entities": v.affected_entities,
                "created_at": v.created_at.isoformat() if v.created_at else None
            }
            for v in (timetable.violations or [])
        ],
        "is_active": timetable.is_active,
        "created_at": timetable.created_at.isoformat() if timetable.created_at else None,
        "updated_at": timetable.updated_at.isoformat() if timetable.updated_at else None,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_timetable(
    data: TimetableCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new timetable"""
    # Convert school_id to UUID
    try:
        school_uuid = UUID(data.school_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid school_id format. Must be a valid UUID."
        )

    # Validate algorithm
    try:
        algorithm_enum = AlgorithmType(data.algorithm)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid algorithm. Must be one of: {[a.value for a in AlgorithmType]}"
        )

    timetable = Timetable(
        school_id=school_uuid,
        name=data.name,
        algorithm=algorithm_enum,
        academic_year=data.academic_year,
        semester=data.semester,
        algorithm_parameters=data.algorithm_parameters or {},
        status=TimetableStatus.DRAFT
    )

    db.add(timetable)
    await db.commit()
    await db.refresh(timetable)

    return {
        "id": str(timetable.id),
        "school_id": str(timetable.school_id),
        "name": timetable.name,
        "algorithm": timetable.algorithm,
        "status": timetable.status,
        "message": "Timetable created successfully"
    }


@router.put("/{timetable_id}")
async def update_timetable(
    timetable_id: UUID,
    name: str = None,
    academic_year: str = None,
    semester: str = None,
    is_active: bool = None,
    db: AsyncSession = Depends(get_db)
):
    """Update a timetable"""
    query = select(Timetable).where(Timetable.id == timetable_id)
    result = await db.execute(query)
    timetable = result.scalar_one_or_none()

    if not timetable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Timetable with id {timetable_id} not found"
        )

    if name is not None:
        timetable.name = name
    if academic_year is not None:
        timetable.academic_year = academic_year
    if semester is not None:
        timetable.semester = semester
    if is_active is not None:
        timetable.is_active = is_active

    timetable.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(timetable)

    return {
        "id": str(timetable.id),
        "name": timetable.name,
        "message": "Timetable updated successfully"
    }


@router.get("/{timetable_id}/entries/")
async def get_timetable_entries_detailed(
    timetable_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get all timetable entries with related data"""
    # Verify timetable exists
    timetable_query = select(Timetable).where(Timetable.id == timetable_id)
    timetable_result = await db.execute(timetable_query)
    timetable = timetable_result.scalar_one_or_none()

    if not timetable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Timetable with id {timetable_id} not found"
        )

    # Get all entries with joined data
    from ..models.lesson import Lesson
    from ..models.class_model import Class
    from ..models.subject import Subject
    from ..models.teacher import Teacher

    entries_query = select(TimetableEntry).where(
        TimetableEntry.timetable_id == timetable_id
    ).order_by(TimetableEntry.time_slot_id)

    entries_result = await db.execute(entries_query)
    entries = entries_result.scalars().all()

    # Build response with all related data
    entries_data = []
    for entry in entries:
        # Get lesson with related data
        lesson_query = select(Lesson).where(Lesson.id == entry.lesson_id)
        lesson_result = await db.execute(lesson_query)
        lesson = lesson_result.scalar_one_or_none()

        if not lesson:
            continue

        # Get class
        class_query = select(Class).where(Class.id == lesson.class_id)
        class_result = await db.execute(class_query)
        class_obj = class_result.scalar_one_or_none()

        # Get subject
        subject_query = select(Subject).where(Subject.id == lesson.subject_id)
        subject_result = await db.execute(subject_query)
        subject = subject_result.scalar_one_or_none()

        # Get lesson group if exists
        from ..models.lesson import LessonGroup
        lesson_group = None
        lesson_group_name = None
        if entry.lesson_group_id:
            lg_query = select(LessonGroup).where(LessonGroup.id == entry.lesson_group_id)
            lg_result = await db.execute(lg_query)
            lesson_group = lg_result.scalar_one_or_none()
            if lesson_group:
                lesson_group_name = lesson_group.group_name

        # Get teacher - prioritize lesson_group teacher over lesson teacher
        teacher = None
        teacher_id = None
        if lesson_group and lesson_group.teacher_id:
            teacher_id = lesson_group.teacher_id
        elif lesson.teacher_id:
            teacher_id = lesson.teacher_id

        if teacher_id:
            teacher_query = select(Teacher).where(Teacher.id == teacher_id)
            teacher_result = await db.execute(teacher_query)
            teacher = teacher_result.scalar_one_or_none()

        # Get room
        room = None
        if entry.room_id:
            room_query = select(Room).where(Room.id == entry.room_id)
            room_result = await db.execute(room_query)
            room = room_result.scalar_one_or_none()

        # Get time slot
        time_slot_query = select(TimeSlot).where(TimeSlot.id == entry.time_slot_id)
        time_slot_result = await db.execute(time_slot_query)
        time_slot = time_slot_result.scalar_one_or_none()

        entries_data.append({
            "id": str(entry.id),
            "time_slot_id": str(entry.time_slot_id),
            "time_slot": {
                "id": str(time_slot.id),
                "day": time_slot.day,
                "period_number": time_slot.period_number,
                "start_time": time_slot.start_time,
                "end_time": time_slot.end_time,
                "is_break": time_slot.is_break
            } if time_slot else None,
            "lesson_id": str(entry.lesson_id),
            "lesson_group_id": str(entry.lesson_group_id) if entry.lesson_group_id else None,
            "lesson_group_name": lesson_group_name,
            "class_id": str(lesson.class_id) if lesson else None,
            "class_name": class_obj.name if class_obj else None,
            "class_color": class_obj.color_code if class_obj else None,
            "subject_id": str(lesson.subject_id) if lesson else None,
            "subject_name": subject.name if subject else None,
            "subject_short_code": subject.short_code if subject else None,
            "subject_color": subject.color_code if subject else None,
            "teacher_id": str(teacher_id) if teacher_id else None,
            "teacher_name": f"{teacher.first_name} {teacher.last_name}" if teacher else None,
            "teacher_short_name": teacher.short_name if teacher else None,
            "room_id": str(entry.room_id) if entry.room_id else None,
            "room_name": room.name if room else None,
            "room_short_name": room.short_name if room else None,
        })

    return {
        "timetable_id": str(timetable_id),
        "total": len(entries_data),
        "entries": entries_data
    }


class BulkEntriesCreate(BaseModel):
    """Bulk timetable entries creation request"""
    entries: list[dict]


@router.get("/{timetable_id}/entries")
async def get_timetable_entries(
    timetable_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get all entries for a timetable"""
    # Verify timetable exists
    timetable_query = select(Timetable).where(Timetable.id == timetable_id)
    timetable_result = await db.execute(timetable_query)
    timetable = timetable_result.scalar_one_or_none()

    if not timetable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Timetable with id {timetable_id} not found"
        )

    # Get all entries with relationships
    entries_query = (
        select(TimetableEntry)
        .where(TimetableEntry.timetable_id == timetable_id)
        .options(
            joinedload(TimetableEntry.time_slot),
            joinedload(TimetableEntry.lesson).joinedload(Lesson.class_),
            joinedload(TimetableEntry.lesson).joinedload(Lesson.subject),
            joinedload(TimetableEntry.lesson).joinedload(Lesson.teacher),
            joinedload(TimetableEntry.lesson_group).joinedload(LessonGroup.teacher),
            joinedload(TimetableEntry.room)
        )
    )
    entries_result = await db.execute(entries_query)
    entries = entries_result.scalars().all()

    return {"entries": [
        {
            "id": str(entry.id),
            "time_slot_id": str(entry.time_slot_id),
            "lesson_id": str(entry.lesson_id) if entry.lesson_id else None,
            "room_id": str(entry.room_id) if entry.room_id else None,
            "lesson_group_id": str(entry.lesson_group_id) if entry.lesson_group_id else None,
            # Add class_id and teacher_id - use lesson_group.teacher if available, otherwise lesson.teacher
            "class_id": str(entry.lesson.class_id) if entry.lesson and entry.lesson.class_id else None,
            "teacher_id": str(entry.lesson_group.teacher_id) if entry.lesson_group and entry.lesson_group.teacher_id else (str(entry.lesson.teacher_id) if entry.lesson and entry.lesson.teacher_id else None),
            "subject_id": str(entry.lesson.subject_id) if entry.lesson and entry.lesson.subject_id else None,
            # Add names for display
            "class_name": entry.lesson.class_.name if entry.lesson and entry.lesson.class_ else None,
            "subject_name": entry.lesson.subject.name if entry.lesson and entry.lesson.subject else None,
            "teacher_name": f"{entry.lesson_group.teacher.first_name} {entry.lesson_group.teacher.last_name}" if entry.lesson_group and entry.lesson_group.teacher else (f"{entry.lesson.teacher.first_name} {entry.lesson.teacher.last_name}" if entry.lesson and entry.lesson.teacher else None),
            "teacher_short_name": entry.lesson_group.teacher.short_name if entry.lesson_group and entry.lesson_group.teacher else (entry.lesson.teacher.short_name if entry.lesson and entry.lesson.teacher else None),
            "lesson_group_name": entry.lesson_group.group_name if entry.lesson_group else None,
            "subject_short_code": entry.lesson.subject.short_code if entry.lesson and entry.lesson.subject else None,
            "subject_color": entry.lesson.subject.color_code if entry.lesson and entry.lesson.subject else None,
            "class_color": entry.lesson.class_.color_code if entry.lesson and entry.lesson.class_ else None,
            "time_slot": {
                "id": str(entry.time_slot.id),
                "day": entry.time_slot.day,
                "period_number": entry.time_slot.period_number,
                "start_time": str(entry.time_slot.start_time),
                "end_time": str(entry.time_slot.end_time)
            } if entry.time_slot else None
        }
        for entry in entries
    ]}


@router.post("/{timetable_id}/entries")
async def create_bulk_entries(
    timetable_id: UUID,
    data: BulkEntriesCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create multiple timetable entries at once (for manual editing)"""
    # Verify timetable exists
    timetable_query = select(Timetable).where(Timetable.id == timetable_id)
    timetable_result = await db.execute(timetable_query)
    timetable = timetable_result.scalar_one_or_none()

    if not timetable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Timetable with id {timetable_id} not found"
        )

    # Delete all existing entries for this timetable
    delete_entries_query = delete(TimetableEntry).where(
        TimetableEntry.timetable_id == timetable_id
    )
    await db.execute(delete_entries_query)

    # Create new entries
    created_entries = []
    for entry_data in data.entries:
        entry = TimetableEntry(
            timetable_id=timetable_id,
            time_slot_id=UUID(entry_data['time_slot_id']),
            lesson_id=UUID(entry_data['lesson_id']) if entry_data.get('lesson_id') else None,
            lesson_group_id=UUID(entry_data['lesson_group_id']) if entry_data.get('lesson_group_id') else None,
            room_id=UUID(entry_data['room_id']) if entry_data.get('room_id') else None,
        )
        db.add(entry)
        created_entries.append(entry)

    # Update timetable status
    timetable.status = TimetableStatus.DRAFT

    await db.commit()

    return {
        "message": f"Successfully created {len(created_entries)} timetable entries",
        "total_entries": len(created_entries),
        "timetable_id": str(timetable_id)
    }


@router.delete("/bulk/all")
async def delete_all_timetables(
    school_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete all timetables for a school (hard delete - removes from database)"""
    # Get all timetable IDs for this school
    timetables_query = select(Timetable.id).where(Timetable.school_id == school_id)
    result = await db.execute(timetables_query)
    timetable_ids = [row[0] for row in result.all()]

    if not timetable_ids:
        return {"message": "No timetables found to delete", "deleted_count": 0}

    # Delete all timetable entries for these timetables
    delete_entries_query = delete(TimetableEntry).where(
        TimetableEntry.timetable_id.in_(timetable_ids)
    )
    await db.execute(delete_entries_query)

    # Delete all timetables for this school
    delete_timetables_query = delete(Timetable).where(
        Timetable.school_id == school_id
    )
    result = await db.execute(delete_timetables_query)

    await db.commit()

    return {
        "message": f"Successfully deleted {result.rowcount} timetable(s)",
        "deleted_count": result.rowcount
    }


@router.delete("/{timetable_id}")
async def delete_timetable(
    timetable_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete a timetable (hard delete - removes from database)"""
    # First, delete all timetable entries
    delete_entries_query = delete(TimetableEntry).where(
        TimetableEntry.timetable_id == timetable_id
    )
    await db.execute(delete_entries_query)

    # Then delete the timetable itself
    delete_timetable_query = delete(Timetable).where(
        Timetable.id == timetable_id
    )
    result = await db.execute(delete_timetable_query)

    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Timetable with id {timetable_id} not found"
        )

    await db.commit()

    return {"message": "Timetable permanently deleted successfully"}


async def schedule_lessons_greedy(
    timetable: Timetable,
    lessons: list,
    time_slots: list,
    rooms: list,
    db: AsyncSession,
    room_assignment_strategy: str = 'classes_fixed'
) -> tuple[int, int, list]:
    """
    Simple greedy algorithm to schedule lessons
    Room assignment strategies:
    - 'classes_fixed': Each class has a fixed room (teachers move)
    - 'teachers_fixed': Each teacher has a fixed room (students move)
    - 'hybrid': Special subjects (lab/sports) use teacher rooms, regular subjects use class rooms
    - 'none': No room assignment

    Returns: (assigned_count, hard_violations, logs)
    """
    logs = []
    assigned_count = 0
    hard_violations = 0

    # Track occupied slots: (time_slot_id, class_id) -> bool
    class_occupied: Dict[tuple, bool] = {}
    # Track occupied slots: (time_slot_id, teacher_id) -> bool
    teacher_occupied: Dict[tuple, bool] = {}
    # Track occupied slots: (time_slot_id, room_id) -> bool
    room_occupied: Dict[tuple, bool] = {}

    # Track hours assigned per lesson
    lesson_hours: Dict[UUID, int] = defaultdict(int)

    # Create virtual rooms if needed and strategy is not 'none'
    virtual_rooms_created = False
    if room_assignment_strategy != 'none' and not rooms:
        logs.append("No physical rooms found - creating virtual rooms based on strategy")

        # Get all classes and teachers
        classes_query = select(Class).where(
            Class.school_id == timetable.school_id,
            Class.is_active == True
        )
        classes_result = await db.execute(classes_query)
        all_classes = list(classes_result.scalars().all())

        teachers_query = select(Teacher).where(
            Teacher.school_id == timetable.school_id,
            Teacher.is_active == True
        )
        teachers_result = await db.execute(teachers_query)
        all_teachers = list(teachers_result.scalars().all())

        # Create virtual rooms based on strategy
        if room_assignment_strategy in ['classes_fixed', 'hybrid']:
            for cls in all_classes:
                if not cls.default_room_id:
                    virtual_room = Room(
                        school_id=timetable.school_id,
                        name=f"{cls.name} Sınıfı",
                        short_name=cls.short_name or cls.name,
                        room_type="classroom",
                        is_available=True,
                        capacity=cls.student_count or 30
                    )
                    db.add(virtual_room)
                    await db.flush()
                    cls.default_room_id = virtual_room.id
                    rooms.append(virtual_room)
                    virtual_rooms_created = True

        if room_assignment_strategy in ['teachers_fixed', 'hybrid']:
            for teacher in all_teachers:
                if not teacher.default_room_id:
                    virtual_room = Room(
                        school_id=timetable.school_id,
                        name=f"{teacher.full_name} Odası",
                        short_name=teacher.short_name or f"{teacher.first_name[0]}.{teacher.last_name}",
                        room_type="office",
                        is_available=True,
                        capacity=30
                    )
                    db.add(virtual_room)
                    await db.flush()
                    teacher.default_room_id = virtual_room.id
                    rooms.append(virtual_room)
                    virtual_rooms_created = True

        if virtual_rooms_created:
            await db.commit()
            logs.append(f"Created {len(rooms)} virtual rooms")

    # Pre-extract time slot data to avoid relationship access issues
    time_slot_list = []
    for slot in time_slots:
        if not slot.is_break:
            time_slot_list.append({
                'id': slot.id,
                'day': slot.day,
                'period_number': slot.period_number
            })

    # Group time slots by day
    slots_by_day: Dict[str, list] = defaultdict(list)
    for slot_data in time_slot_list:
        slots_by_day[slot_data['day']].append(slot_data)

    # Sort lessons by hours_per_week (descending) - schedule harder lessons first
    sorted_lessons = sorted(lessons, key=lambda l: l.hours_per_week, reverse=True)

    logs.append(f"Starting to schedule {len(sorted_lessons)} lessons")
    logs.append(f"Available time slots: {len(time_slots)} (breaks excluded)")
    logs.append(f"Available rooms: {len(rooms)}")
    logs.append(f"Room assignment strategy: {room_assignment_strategy}")

    # Pre-extract all lesson data to avoid relationship access during scheduling
    # Separate lessons into regular and grouped lessons
    regular_lessons = []
    grouped_lessons = []

    for lesson in sorted_lessons:
        # Access relationship attributes here while in async context
        class_obj = lesson.class_
        subject_obj = lesson.subject
        teacher_obj = lesson.teacher

        # Check if lesson has groups
        has_groups = lesson.num_groups and lesson.num_groups > 1 and len(lesson.lesson_groups) > 0

        lesson_data = {
            'lesson_id': lesson.id,
            'class_id': lesson.class_id,
            'hours_per_week': lesson.hours_per_week,
            'class_default_room_id': class_obj.default_room_id if class_obj else None,
            'subject_requires_special_room': (
                subject_obj.requires_room_type in ['laboratory', 'sports', 'music', 'art']
                if subject_obj and subject_obj.requires_room_type else False
            ),
        }

        if has_groups:
            # Extract group information
            groups_info = []
            for group in lesson.lesson_groups:
                group_teacher = group.teacher if group.teacher else lesson.teacher
                groups_info.append({
                    'group_id': group.id,
                    'group_name': group.group_name,
                    'teacher_id': group.teacher_id if group.teacher_id else lesson.teacher_id,
                    'teacher_default_room_id': group_teacher.default_room_id if group_teacher else None,
                })
            lesson_data['groups'] = groups_info
            grouped_lessons.append(lesson_data)
        else:
            # Regular lesson
            lesson_data['teacher_id'] = lesson.teacher_id
            lesson_data['teacher_default_room_id'] = teacher_obj.default_room_id if teacher_obj else None
            regular_lessons.append(lesson_data)

    # Schedule regular lessons (no groups)
    for lesson_data in regular_lessons:
        lesson_id = lesson_data['lesson_id']
        hours_needed = lesson_data['hours_per_week']
        hours_assigned = 0

        logs.append(f"Scheduling regular lesson {lesson_id} ({hours_needed} hours)...")

        # Try to assign all required hours
        for day in slots_by_day:
            if hours_assigned >= hours_needed:
                break

            day_slots = sorted(slots_by_day[day], key=lambda s: s['period_number'])

            for slot in day_slots:
                if hours_assigned >= hours_needed:
                    break

                # Check if class is available
                class_key = (slot['id'], lesson_data['class_id'])
                if class_key in class_occupied:
                    continue

                # Check if teacher is available
                if lesson_data['teacher_id']:
                    teacher_key = (slot['id'], lesson_data['teacher_id'])
                    if teacher_key in teacher_occupied:
                        continue

                # Determine room
                assigned_room_id = None
                if room_assignment_strategy == 'classes_fixed':
                    assigned_room_id = lesson_data['class_default_room_id']
                elif room_assignment_strategy == 'teachers_fixed':
                    assigned_room_id = lesson_data['teacher_default_room_id']
                elif room_assignment_strategy == 'hybrid':
                    if lesson_data['subject_requires_special_room']:
                        assigned_room_id = lesson_data['teacher_default_room_id']
                    else:
                        assigned_room_id = lesson_data['class_default_room_id']

                # Check if room is available
                if assigned_room_id:
                    room_key = (slot['id'], assigned_room_id)
                    if room_key in room_occupied:
                        continue

                # Create timetable entry
                entry = TimetableEntry(
                    timetable_id=timetable.id,
                    time_slot_id=slot['id'],
                    lesson_id=lesson_id,
                    lesson_group_id=None,
                    room_id=assigned_room_id
                )
                db.add(entry)

                # Mark as occupied
                class_occupied[class_key] = True
                if lesson_data['teacher_id']:
                    teacher_occupied[(slot['id'], lesson_data['teacher_id'])] = True
                if assigned_room_id:
                    room_occupied[(slot['id'], assigned_room_id)] = True

                hours_assigned += 1
                assigned_count += 1

        lesson_hours[lesson_id] = hours_assigned

        if hours_assigned < hours_needed:
            shortage = hours_needed - hours_assigned
            logs.append(f"Lesson {lesson_id}: assigned {hours_assigned}/{hours_needed} hours (shortage: {shortage})")
            hard_violations += shortage
        else:
            logs.append(f"Lesson {lesson_id}: successfully assigned {hours_assigned}/{hours_needed} hours")

    # Schedule grouped lessons (multiple groups per lesson)
    for lesson_data in grouped_lessons:
        lesson_id = lesson_data['lesson_id']
        hours_needed = lesson_data['hours_per_week']
        groups = lesson_data['groups']
        hours_assigned = 0

        logs.append(f"Scheduling grouped lesson {lesson_id} ({hours_needed} hours, {len(groups)} groups)...")

        # Try to assign all required hours (all groups schedule together in parallel)
        for day in slots_by_day:
            if hours_assigned >= hours_needed:
                break

            day_slots = sorted(slots_by_day[day], key=lambda s: s['period_number'])

            for slot in day_slots:
                if hours_assigned >= hours_needed:
                    break

                # Check if class is available (entire class is occupied even if split into groups)
                class_key = (slot['id'], lesson_data['class_id'])
                if class_key in class_occupied:
                    continue

                # Check if ALL group teachers are available
                all_teachers_available = True
                for group in groups:
                    if group['teacher_id']:
                        teacher_key = (slot['id'], group['teacher_id'])
                        if teacher_key in teacher_occupied:
                            all_teachers_available = False
                            break

                if not all_teachers_available:
                    continue

                # Check rooms for all groups
                group_rooms = []
                rooms_available = True
                for group in groups:
                    assigned_room_id = None
                    if room_assignment_strategy == 'teachers_fixed':
                        assigned_room_id = group['teacher_default_room_id']
                    elif room_assignment_strategy == 'hybrid' and lesson_data['subject_requires_special_room']:
                        assigned_room_id = group['teacher_default_room_id']
                    elif room_assignment_strategy == 'classes_fixed':
                        # All groups use same class room
                        assigned_room_id = lesson_data['class_default_room_id']

                    if assigned_room_id:
                        room_key = (slot['id'], assigned_room_id)
                        if room_key in room_occupied:
                            rooms_available = False
                            break
                    group_rooms.append(assigned_room_id)

                if not rooms_available:
                    continue

                # All constraints satisfied - create entries for all groups
                for idx, group in enumerate(groups):
                    entry = TimetableEntry(
                        timetable_id=timetable.id,
                        time_slot_id=slot['id'],
                        lesson_id=lesson_id,
                        lesson_group_id=group['group_id'],
                        room_id=group_rooms[idx]
                    )
                    db.add(entry)
                    assigned_count += 1

                    # Mark teacher as occupied
                    if group['teacher_id']:
                        teacher_occupied[(slot['id'], group['teacher_id'])] = True

                    # Mark room as occupied
                    if group_rooms[idx]:
                        room_occupied[(slot['id'], group_rooms[idx])] = True

                # Mark class as occupied
                class_occupied[class_key] = True

                hours_assigned += 1

        lesson_hours[lesson_id] = hours_assigned

        if hours_assigned < hours_needed:
            shortage = hours_needed - hours_assigned
            logs.append(f"Lesson {lesson_id} ({len(groups)} groups): assigned {hours_assigned}/{hours_needed} hours (shortage: {shortage})")
            hard_violations += shortage
        else:
            logs.append(f"Lesson {lesson_id} ({len(groups)} groups): successfully assigned {hours_assigned}/{hours_needed} hours")

    logs.append(f"Total assigned entries: {assigned_count}")
    logs.append(f"Total hard constraint violations: {hard_violations}")

    return assigned_count, hard_violations, logs


@router.post("/{timetable_id}/generate/")
async def generate_timetable(
    timetable_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Generate a timetable using the configured algorithm"""
    query = select(Timetable).where(Timetable.id == timetable_id)
    result = await db.execute(query)
    timetable = result.scalar_one_or_none()

    if not timetable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Timetable with id {timetable_id} not found"
        )

    # Check if timetable is in draft or failed status (allow regeneration of failed timetables)
    if timetable.status not in [TimetableStatus.DRAFT, TimetableStatus.FAILED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Timetable must be in draft or failed status to generate. Current status: {timetable.status}"
        )

    # Update status to generating
    timetable.status = TimetableStatus.GENERATING
    timetable.generation_started_at = datetime.now(timezone.utc)
    await db.commit()

    try:
        # IMPORTANT: Before deleting entries, save user's manual distribution preferences
        # This allows us to preserve user's choices when regenerating the timetable
        await _save_distribution_patterns(timetable_id, db)

        # Delete any existing entries for this timetable
        await db.execute(delete(TimetableEntry).where(TimetableEntry.timetable_id == timetable_id))
        await db.commit()

        # Load required data
        # Get lessons for this school with eagerly loaded relationships
        lessons_query = select(Lesson).where(
            Lesson.school_id == timetable.school_id,
            Lesson.is_active == True
        ).options(
            selectinload(Lesson.class_),
            selectinload(Lesson.teacher),
            selectinload(Lesson.subject),
            selectinload(Lesson.lesson_groups).selectinload(LessonGroup.teacher)
        )
        lessons_result = await db.execute(lessons_query)
        lessons = list(lessons_result.scalars().all())

        # Force-load all relationships to prevent lazy loading issues in async context
        for lesson in lessons:
            # Access each relationship to ensure it's loaded
            _ = lesson.class_
            _ = lesson.teacher
            _ = lesson.subject
            _ = lesson.lesson_groups
            # Access nested attributes to ensure they're loaded too
            if lesson.class_:
                _ = lesson.class_.default_room_id
            if lesson.teacher:
                _ = lesson.teacher.default_room_id
            if lesson.subject:
                _ = lesson.subject.requires_room_type
            # Load lesson_groups' teachers
            for group in lesson.lesson_groups:
                _ = group.teacher

        # Get time slots for this school
        time_slots_query = select(TimeSlot).where(
            TimeSlot.school_id == timetable.school_id,
            TimeSlot.is_active == True
        ).order_by(TimeSlot.day, TimeSlot.period_number)
        time_slots_result = await db.execute(time_slots_query)
        time_slots = list(time_slots_result.scalars().all())

        # Get rooms for this school
        rooms_query = select(Room).where(
            Room.school_id == timetable.school_id,
            Room.is_available == True
        )
        rooms_result = await db.execute(rooms_query)
        rooms = list(rooms_result.scalars().all())

        # Get room assignment strategy
        room_assignment_strategy = timetable.algorithm_parameters.get('room_assignment_strategy', 'classes_fixed') if timetable.algorithm_parameters else 'classes_fixed'

        if not lessons:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No lessons found for this school. Please add lessons before generating timetable."
            )

        if not time_slots:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No time slots found for this school. Please add time slots before generating timetable."
            )

        # Note: Rooms are no longer required - they will be created automatically if needed based on strategy

        # Run scheduling algorithm based on timetable.algorithm setting
        if timetable.algorithm == "cpsat":
            # CP-SAT: Filter out break slots (only use lesson slots)
            lesson_slots = [slot for slot in time_slots if not slot.is_break]
            assigned_count, hard_violations, logs = await schedule_with_cpsat(
                timetable, lessons, lesson_slots, rooms, db
            )
        else:
            # Use improved greedy algorithm for other algorithms
            assigned_count, hard_violations, logs = await schedule_lessons_improved(
                timetable, lessons, time_slots, rooms, db
            )

        # Update timetable status
        timetable.status = TimetableStatus.COMPLETED if hard_violations == 0 else TimetableStatus.FAILED
        timetable.generation_completed_at = datetime.now(timezone.utc)
        timetable.generation_duration_seconds = (
            timetable.generation_completed_at - timetable.generation_started_at
        ).total_seconds()
        timetable.hard_constraint_violations = hard_violations
        timetable.soft_constraint_score = 100 - (hard_violations * 10)  # Simple scoring
        timetable.generation_logs = "\n".join(logs)

        await db.commit()
        await db.refresh(timetable)

        return {
            "id": str(timetable.id),
            "status": timetable.status,
            "assigned_entries": assigned_count,
            "hard_violations": hard_violations,
            "generation_started_at": timetable.generation_started_at.isoformat() if timetable.generation_started_at else None,
            "generation_completed_at": timetable.generation_completed_at.isoformat() if timetable.generation_completed_at else None,
            "generation_duration_seconds": timetable.generation_duration_seconds,
            "logs": logs[:10],  # Return first 10 log lines
            "message": "Timetable generated successfully" if hard_violations == 0 else f"Timetable generated with {hard_violations} violations"
        }

    except Exception as e:
        # Rollback and mark as failed
        error_trace = traceback.format_exc()
        print("=" * 80)
        print("TIMETABLE GENERATION ERROR:")
        print(error_trace)
        print("=" * 80)
        await db.rollback()
        timetable.status = TimetableStatus.FAILED
        timetable.generation_completed_at = datetime.now(timezone.utc)
        timetable.generation_logs = f"Error during generation: {str(e)}\n\nTraceback:\n{error_trace}"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate timetable: {str(e)}"
        )


# ===== MOVE/SWAP TIMETABLE ENTRIES =====

class MoveEntriesRequest(BaseModel):
    """Request model for moving/swapping timetable entries"""
    entry_ids: list[str]  # IDs of entries to move
    target_slot_ids: list[str]  # Target time slot IDs (same length as entry_ids)
    swap_with_entry_ids: Optional[list[str]] = None  # If swapping, IDs of entries to swap with


@router.post("/{timetable_id}/entries/move")
async def move_timetable_entries(
    timetable_id: UUID,
    request: MoveEntriesRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Move or swap timetable entries to new time slots.

    This endpoint supports:
    1. Moving entry/entries to empty slots
    2. Swapping entries between occupied slots
    3. Moving consecutive slots together
    """
    try:
        # Validate timetable exists
        timetable_query = select(Timetable).where(Timetable.id == timetable_id)
        timetable_result = await db.execute(timetable_query)
        timetable = timetable_result.scalar_one_or_none()

        if not timetable:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Timetable not found"
            )

        # Validate request
        if len(request.entry_ids) != len(request.target_slot_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Number of entries must match number of target slots"
            )

        if request.swap_with_entry_ids and len(request.swap_with_entry_ids) != len(request.entry_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Number of swap entries must match number of source entries"
            )

        # Fetch all involved entries
        entry_uuids = [UUID(eid) for eid in request.entry_ids]
        entries_query = select(TimetableEntry).where(
            TimetableEntry.id.in_(entry_uuids)
        )
        entries_result = await db.execute(entries_query)
        entries = {str(e.id): e for e in entries_result.scalars().all()}

        if len(entries) != len(request.entry_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more entries not found"
            )

        # Validate target slots exist
        target_slot_uuids = [UUID(sid) for sid in request.target_slot_ids]
        target_slots_query = select(TimeSlot).where(
            TimeSlot.id.in_(target_slot_uuids)
        )
        target_slots_result = await db.execute(target_slots_query)
        target_slots = {str(s.id): s for s in target_slots_result.scalars().all()}

        if len(target_slots) != len(request.target_slot_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more target slots not found"
            )

        # If swapping, fetch swap entries
        swap_entries = {}
        if request.swap_with_entry_ids:
            swap_entry_uuids = [UUID(eid) for eid in request.swap_with_entry_ids]
            swap_entries_query = select(TimetableEntry).where(
                TimetableEntry.id.in_(swap_entry_uuids)
            )
            swap_entries_result = await db.execute(swap_entries_query)
            swap_entries = {str(e.id): e for e in swap_entries_result.scalars().all()}

            if len(swap_entries) != len(request.swap_with_entry_ids):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="One or more swap entries not found"
                )

        # Perform the move/swap
        if swap_entries:
            # SWAP MODE: Exchange time slots
            source_slot_ids = [entries[eid].time_slot_id for eid in request.entry_ids]

            # Move source entries to target slots
            for i, entry_id in enumerate(request.entry_ids):
                entry = entries[entry_id]
                entry.time_slot_id = target_slot_uuids[i]

            # Move swap entries to source slots
            for i, swap_entry_id in enumerate(request.swap_with_entry_ids):
                swap_entry = swap_entries[swap_entry_id]
                swap_entry.time_slot_id = source_slot_ids[i]
        else:
            # MOVE MODE: Just update time slots
            for i, entry_id in enumerate(request.entry_ids):
                entry = entries[entry_id]
                entry.time_slot_id = target_slot_uuids[i]

        await db.commit()

        return {
            "success": True,
            "message": f"{'Swapped' if swap_entries else 'Moved'} {len(request.entry_ids)} entry/entries successfully",
            "moved_entries": request.entry_ids,
            "target_slots": request.target_slot_ids,
            "swapped_entries": request.swap_with_entry_ids if swap_entries else None
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error moving/swapping entries: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to move/swap entries: {str(e)}"
        )
