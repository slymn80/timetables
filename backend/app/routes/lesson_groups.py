"""
Lesson Groups API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from uuid import UUID
from pydantic import BaseModel
from typing import Optional
import logging

from ..database import get_db
from ..models.lesson import LessonGroup, Lesson

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/lesson/{lesson_id}")
async def get_lesson_groups(
    lesson_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get all groups for a specific lesson"""
    query = (
        select(LessonGroup)
        .options(joinedload(LessonGroup.teacher))
        .where(LessonGroup.lesson_id == lesson_id)
        .order_by(LessonGroup.group_name)
    )
    result = await db.execute(query)
    groups = result.scalars().all()

    # Generate colors for groups
    colors = ["#FEF3C7", "#DBEAFE", "#E0E7FF", "#FCE7F3", "#D1FAE5", "#FED7AA"]

    return {
        "total": len(groups),
        "groups": [
            {
                "id": str(group.id),
                "lesson_id": str(group.lesson_id),
                "group_name": group.group_name,
                "group_number": int(group.group_name.split()[-1]) if group.group_name.split()[-1].isdigit() else idx + 1,
                "teacher_id": str(group.teacher_id) if group.teacher_id else None,
                "teacher_name": group.teacher.full_name if group.teacher else None,
                "student_count": group.student_count,
                "color": colors[idx % len(colors)],
            }
            for idx, group in enumerate(groups)
        ]
    }


class LessonGroupUpdate(BaseModel):
    teacher_id: Optional[UUID] = None
    group_name: Optional[str] = None
    student_count: Optional[int] = None


@router.put("/{group_id}")
async def update_lesson_group(
    group_id: UUID,
    group_data: LessonGroupUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a lesson group (mainly for teacher assignment)"""
    query = select(LessonGroup).where(LessonGroup.id == group_id)
    result = await db.execute(query)
    group = result.scalar_one_or_none()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson group with id {group_id} not found"
        )

    # Update only provided fields
    update_data = group_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(group, field, value)

    await db.commit()
    await db.refresh(group, ['teacher'])

    # Generate color based on group number
    colors = ["#FEF3C7", "#DBEAFE", "#E0E7FF", "#FCE7F3", "#D1FAE5", "#FED7AA"]
    group_number = int(group.group_name.split()[-1]) if group.group_name.split()[-1].isdigit() else 1
    color = colors[(group_number - 1) % len(colors)]

    return {
        "id": str(group.id),
        "lesson_id": str(group.lesson_id),
        "group_name": group.group_name,
        "group_number": group_number,
        "teacher_id": str(group.teacher_id) if group.teacher_id else None,
        "teacher_name": group.teacher.full_name if group.teacher else None,
        "student_count": group.student_count,
        "color": color,
        "message": "Lesson group updated successfully"
    }


@router.post("/lesson/{lesson_id}/regenerate")
async def regenerate_lesson_groups(
    lesson_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Regenerate lesson groups based on lesson.num_groups"""
    # Get the lesson
    lesson_query = select(Lesson).where(Lesson.id == lesson_id)
    lesson_result = await db.execute(lesson_query)
    lesson = lesson_result.scalar_one_or_none()

    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson with id {lesson_id} not found"
        )

    # Minimum 2 groups required for group lessons
    if lesson.num_groups < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Grup dersi için en az 2 grup olmalıdır."
        )

    # Get existing groups
    groups_query = select(LessonGroup).where(LessonGroup.lesson_id == lesson_id)
    groups_result = await db.execute(groups_query)
    existing_groups = list(groups_result.scalars().all())

    current_count = len(existing_groups)
    target_count = lesson.num_groups

    if current_count < target_count:
        # Create additional groups
        for i in range(current_count, target_count):
            group = LessonGroup(
                lesson_id=lesson_id,
                group_name=f"Grup {i + 1}",
                teacher_id=None
            )
            db.add(group)
    elif current_count > target_count:
        # Remove excess groups (backend assumes frontend validation already done)
        groups_to_remove = existing_groups[target_count:]
        for group in groups_to_remove:
            await db.delete(group)

    await db.commit()

    return {
        "message": f"Lesson groups regenerated successfully",
        "total_groups": target_count
    }
