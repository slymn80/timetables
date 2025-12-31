"""
Lessons API routes
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from uuid import UUID
import logging

from ..database import get_db
from ..models.lesson import Lesson, LessonGroup

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/")
async def list_lessons(
    school_id: UUID = None,
    class_id: UUID = None,
    teacher_id: UUID = None,
    skip: int = 0,
    limit: int = 5000,
    db: AsyncSession = Depends(get_db)
):
    """List all lessons, optionally filtered by school, class, or teacher"""
    from sqlalchemy.orm import selectinload
    query = (
        select(Lesson)
        .options(
            joinedload(Lesson.class_),
            joinedload(Lesson.subject),
            joinedload(Lesson.teacher),
            selectinload(Lesson.lesson_groups).joinedload(LessonGroup.teacher)
        )
        .where(Lesson.is_active == True)
    )

    if school_id:
        query = query.where(Lesson.school_id == school_id)

    if class_id:
        query = query.where(Lesson.class_id == class_id)

    if teacher_id:
        query = query.where(Lesson.teacher_id == teacher_id)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    lessons = result.unique().scalars().all()

    # Debug: Check lesson_groups
    if lessons:
        logger.info(f"=== DEBUG: First lesson has {len(lessons[0].lesson_groups or [])} groups ===")
        if lessons[0].lesson_groups:
            lg = lessons[0].lesson_groups[0]
            logger.info(f"First group: id={lg.id}, has teacher attr={hasattr(lg, 'teacher')}, teacher={lg.teacher}")

    return {
        "total": len(lessons),
        "lessons": [
            {
                "id": str(lesson.id),
                "school_id": str(lesson.school_id),
                "class_id": str(lesson.class_id),
                "class_name": lesson.class_.name if lesson.class_ else None,
                "subject_id": str(lesson.subject_id),
                "subject_name": lesson.subject.name if lesson.subject else None,
                "teacher_id": str(lesson.teacher_id) if lesson.teacher_id else None,
                "teacher_name": lesson.teacher.full_name if lesson.teacher else None,
                "hours_per_week": lesson.hours_per_week,
                "can_split": lesson.can_split,
                "num_groups": lesson.num_groups,
                "lesson_groups": [
                    {
                        "id": str(lg.id),
                        "lesson_id": str(lg.lesson_id),
                        "group_name": lg.group_name,
                        "teacher_id": str(lg.teacher_id) if lg.teacher_id else None,
                        "teacher_name": lg.teacher.full_name if hasattr(lg, 'teacher') and lg.teacher else None,
                        "_debug_has_teacher": hasattr(lg, 'teacher'),
                        "_debug_teacher_is_none": lg.teacher is None if hasattr(lg, 'teacher') else 'no_attr',
                    }
                    for lg in (lesson.lesson_groups or [])
                ],
                "requires_double_period": lesson.requires_double_period,
                "max_hours_per_day": lesson.max_hours_per_day,
                "allow_consecutive": lesson.allow_consecutive,
                "distribution_pattern": lesson.extra_metadata.get('user_distribution_pattern') if lesson.extra_metadata else None,
                "is_active": lesson.is_active,
            }
            for lesson in lessons
        ]
    }


from pydantic import BaseModel
from typing import Optional


class LessonCreate(BaseModel):
    class_id: UUID
    subject_id: UUID
    teacher_id: Optional[UUID] = None
    hours_per_week: int
    can_split: bool = False
    num_groups: int = 1
    requires_double_period: bool = False
    max_hours_per_day: Optional[int] = None  # Maximum hours this lesson can be scheduled on the same day
    allow_consecutive: bool = True  # Allow lessons to be scheduled consecutively (back-to-back)
    distribution_pattern: Optional[str] = None  # e.g., "1+3", "2+2", etc.


class LessonUpdate(BaseModel):
    class_id: Optional[UUID] = None
    subject_id: Optional[UUID] = None
    teacher_id: Optional[UUID] = None
    hours_per_week: Optional[int] = None
    can_split: Optional[bool] = None
    num_groups: Optional[int] = None
    requires_double_period: Optional[bool] = None
    max_hours_per_day: Optional[int] = None  # Maximum hours this lesson can be scheduled on the same day
    allow_consecutive: Optional[bool] = None  # Allow lessons to be scheduled consecutively (back-to-back)
    distribution_pattern: Optional[str] = None  # e.g., "1+3", "2+2", etc.


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_lesson(
    lesson_data: LessonCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new lesson"""
    # Get the class to determine school_id
    from ..models.class_model import Class
    from ..models.lesson import LessonGroup

    class_result = await db.execute(select(Class).where(Class.id == lesson_data.class_id))
    class_obj = class_result.scalar_one_or_none()

    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    # Prepare extra_metadata with distribution pattern if provided
    extra_metadata = {}
    if lesson_data.distribution_pattern:
        extra_metadata['user_distribution_pattern'] = lesson_data.distribution_pattern

    lesson = Lesson(
        school_id=class_obj.school_id,
        class_id=lesson_data.class_id,
        subject_id=lesson_data.subject_id,
        teacher_id=lesson_data.teacher_id,
        hours_per_week=lesson_data.hours_per_week,
        can_split=lesson_data.can_split,
        num_groups=lesson_data.num_groups,
        requires_double_period=lesson_data.requires_double_period,
        max_hours_per_day=lesson_data.max_hours_per_day,
        allow_consecutive=lesson_data.allow_consecutive,
        extra_metadata=extra_metadata if extra_metadata else None
    )

    db.add(lesson)
    await db.flush()  # Get the lesson ID before creating groups

    # Auto-create lesson groups if num_groups > 1
    if lesson_data.num_groups > 1:
        for i in range(lesson_data.num_groups):
            group = LessonGroup(
                lesson_id=lesson.id,
                group_name=f"Grup {i + 1}",
                teacher_id=None  # Groups start without teacher assignment
            )
            db.add(group)

    await db.commit()
    await db.refresh(lesson)

    # Load relationships for response
    await db.refresh(lesson, ['class_', 'subject', 'teacher'])

    return {
        "id": str(lesson.id),
        "class_name": lesson.class_.name if lesson.class_ else None,
        "subject_name": lesson.subject.name if lesson.subject else None,
        "teacher_name": lesson.teacher.full_name if lesson.teacher else None,
        "hours_per_week": lesson.hours_per_week,
        "can_split": lesson.can_split,
        "num_groups": lesson.num_groups,
        "requires_double_period": lesson.requires_double_period,
        "message": "Lesson created successfully"
    }


@router.get("/{lesson_id}")
async def get_lesson(
    lesson_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get lesson by ID"""
    query = (
        select(Lesson)
        .options(
            joinedload(Lesson.class_),
            joinedload(Lesson.subject),
            joinedload(Lesson.teacher)
        )
        .where(Lesson.id == lesson_id)
    )
    result = await db.execute(query)
    lesson = result.scalar_one_or_none()

    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson with id {lesson_id} not found"
        )

    return {
        "id": str(lesson.id),
        "school_id": str(lesson.school_id),
        "class_id": str(lesson.class_id),
        "class_name": lesson.class_.name if lesson.class_ else None,
        "subject_id": str(lesson.subject_id),
        "subject_name": lesson.subject.name if lesson.subject else None,
        "teacher_id": str(lesson.teacher_id) if lesson.teacher_id else None,
        "teacher_name": lesson.teacher.full_name if lesson.teacher else None,
        "hours_per_week": lesson.hours_per_week,
        "can_split": lesson.can_split,
        "num_groups": lesson.num_groups,
        "requires_double_period": lesson.requires_double_period,
        "max_hours_per_day": lesson.max_hours_per_day,
        "allow_consecutive": lesson.allow_consecutive,
        "is_active": lesson.is_active,
    }


@router.put("/{lesson_id}")
async def update_lesson(
    lesson_id: UUID,
    lesson_data: LessonUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a lesson"""
    query = select(Lesson).where(Lesson.id == lesson_id)
    result = await db.execute(query)
    lesson = result.scalar_one_or_none()

    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson with id {lesson_id} not found"
        )

    # Update only provided fields
    update_data = lesson_data.model_dump(exclude_unset=True)

    # Handle distribution_pattern separately - store in extra_metadata
    if 'distribution_pattern' in update_data:
        distribution_pattern = update_data.pop('distribution_pattern')
        if distribution_pattern:
            # Initialize extra_metadata if None
            if lesson.extra_metadata is None:
                lesson.extra_metadata = {}
            lesson.extra_metadata['user_distribution_pattern'] = distribution_pattern
            # Mark as modified for SQLAlchemy to detect change
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(lesson, 'extra_metadata')

    # Update remaining fields
    for field, value in update_data.items():
        setattr(lesson, field, value)

    await db.commit()
    await db.refresh(lesson, ['class_', 'subject', 'teacher'])

    return {
        "id": str(lesson.id),
        "class_name": lesson.class_.name if lesson.class_ else None,
        "subject_name": lesson.subject.name if lesson.subject else None,
        "teacher_name": lesson.teacher.full_name if lesson.teacher else None,
        "hours_per_week": lesson.hours_per_week,
        "can_split": lesson.can_split,
        "num_groups": lesson.num_groups,
        "requires_double_period": lesson.requires_double_period,
        "message": "Lesson updated successfully"
    }


@router.post("/{lesson_id}/split-groups")
async def split_lesson_into_groups(
    lesson_id: UUID,
    num_groups: int = Query(..., description="Number of groups to split the lesson into"),
    db: AsyncSession = Depends(get_db)
):
    """Split a lesson into multiple group records for teacher assignment"""
    # Minimum 2 groups required for group lessons
    if num_groups < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Grup dersi için en az 2 grup olmalıdır."
        )

    # Get the original lesson
    query = select(Lesson).where(Lesson.id == lesson_id)
    result = await db.execute(query)
    original_lesson = result.scalar_one_or_none()

    if not original_lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson with id {lesson_id} not found"
        )

    # Check if already split (look for other lessons with same class+subject)
    existing_query = (
        select(Lesson)
        .where(
            Lesson.class_id == original_lesson.class_id,
            Lesson.subject_id == original_lesson.subject_id,
            Lesson.is_active == True
        )
    )
    existing_result = await db.execute(existing_query)
    existing_lessons = list(existing_result.scalars().all())

    current_count = len(existing_lessons)

    # If reducing groups, delete excess (frontend validation already done)
    if current_count > num_groups:
        logger.info(f"=== BACKEND: Reducing groups ===")
        logger.info(f"Current count: {current_count}")
        logger.info(f"Target num_groups: {num_groups}")

        # Calculate how many to delete
        to_delete = current_count - num_groups

        # Delete from the end (assumes frontend validation already checked)
        deleted_ids = []
        for i in range(to_delete):
            existing_lessons[-(i+1)].is_active = False
            deleted_ids.append(str(existing_lessons[-(i+1)].id)[:8])

        logger.info(f"Deleted (soft): {deleted_ids}")

        # Rebuild the active lessons list
        existing_lessons = [l for l in existing_lessons if l.is_active]

        logger.info(f"Remaining lessons: {[(str(l.id)[:8], str(l.teacher_id)[:8] if l.teacher_id else None, l.is_active) for l in existing_lessons]}")
        logger.info(f"=================================")

    # Create additional lesson records if needed
    elif current_count < num_groups:
        for i in range(num_groups - current_count):
            new_lesson = Lesson(
                school_id=original_lesson.school_id,
                class_id=original_lesson.class_id,
                subject_id=original_lesson.subject_id,
                teacher_id=None,  # New groups start unassigned
                hours_per_week=original_lesson.hours_per_week,
                can_split=original_lesson.can_split,
                num_groups=num_groups,  # Store total groups in each record
                requires_double_period=original_lesson.requires_double_period
            )
            db.add(new_lesson)
            existing_lessons.append(new_lesson)

    # Update all active lessons with the new num_groups value
    for lesson in existing_lessons:
        if lesson.is_active:
            lesson.num_groups = num_groups

    await db.commit()

    return {
        "message": f"Lesson split into {num_groups} groups successfully",
        "total_groups": num_groups
    }


@router.delete("/by-class-subject", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lessons_by_class_subject(
    class_id: UUID = Query(..., description="Class ID"),
    subject_id: UUID = Query(..., description="Subject ID"),
    db: AsyncSession = Depends(get_db)
):
    """Delete all lessons for a given class and subject combination"""
    query = select(Lesson).where(
        Lesson.class_id == class_id,
        Lesson.subject_id == subject_id,
        Lesson.is_active == True
    )
    result = await db.execute(query)
    lessons = result.scalars().all()

    if not lessons:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No lessons found for class {class_id} and subject {subject_id}"
        )

    # Soft delete all lessons
    for lesson in lessons:
        lesson.is_active = False

    await db.commit()
    return None


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(
    lesson_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete a lesson (soft delete)"""
    query = select(Lesson).where(Lesson.id == lesson_id)
    result = await db.execute(query)
    lesson = result.scalar_one_or_none()

    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson with id {lesson_id} not found"
        )

    # Soft delete
    lesson.is_active = False
    await db.commit()
    return None
