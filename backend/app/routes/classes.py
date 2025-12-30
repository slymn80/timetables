"""
Classes API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID
from pydantic import BaseModel

from ..database import get_db
from ..models.class_model import Class

router = APIRouter()


class ClassCreate(BaseModel):
    school_id: UUID
    name: str
    grade_level: int
    short_name: Optional[str] = None
    language: Optional[str] = None
    student_count: Optional[int] = 30
    max_hours_per_day: Optional[int] = None
    homeroom_teacher_id: Optional[UUID] = None
    default_room_id: Optional[UUID] = None
    color_code: Optional[str] = None
    unavailable_slots: Optional[dict] = {}
    is_active: bool = True


class ClassUpdate(BaseModel):
    school_id: Optional[UUID] = None
    name: Optional[str] = None
    grade_level: Optional[int] = None
    short_name: Optional[str] = None
    language: Optional[str] = None
    student_count: Optional[int] = None
    max_hours_per_day: Optional[int] = None
    homeroom_teacher_id: Optional[UUID] = None
    default_room_id: Optional[UUID] = None
    color_code: Optional[str] = None
    unavailable_slots: Optional[dict] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_classes(
    school_id: UUID = None,
    skip: int = 0,
    limit: int = 5000,
    db: AsyncSession = Depends(get_db)
):
    """List all classes, optionally filtered by school"""
    query = select(Class).where(Class.is_active == True)

    if school_id:
        query = query.where(Class.school_id == school_id)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    classes = result.scalars().all()

    return {
        "total": len(classes),
        "classes": [
            {
                "id": str(c.id),
                "school_id": str(c.school_id),
                "name": c.name,
                "short_name": c.short_name,
                "grade_level": c.grade_level,
                "language": c.language,
                "student_count": c.student_count,
                "max_hours_per_day": c.max_hours_per_day,
                "homeroom_teacher_id": str(c.homeroom_teacher_id) if c.homeroom_teacher_id else None,
                "default_room_id": str(c.default_room_id) if c.default_room_id else None,
                "color_code": c.color_code,
                "unavailable_slots": c.unavailable_slots or {},
                "is_active": c.is_active,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            }
            for c in classes
        ]
    }


@router.get("/{class_id}")
async def get_class(
    class_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get class by ID"""
    query = select(Class).where(Class.id == class_id)
    result = await db.execute(query)
    class_obj = result.scalar_one_or_none()

    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with id {class_id} not found"
        )

    return {
        "id": str(class_obj.id),
        "school_id": str(class_obj.school_id),
        "name": class_obj.name,
        "short_name": class_obj.short_name,
        "grade_level": class_obj.grade_level,
        "language": class_obj.language,
        "student_count": class_obj.student_count,
        "max_hours_per_day": class_obj.max_hours_per_day,
        "homeroom_teacher_id": str(class_obj.homeroom_teacher_id) if class_obj.homeroom_teacher_id else None,
        "default_room_id": str(class_obj.default_room_id) if class_obj.default_room_id else None,
        "color_code": class_obj.color_code,
        "unavailable_slots": class_obj.unavailable_slots or {},
        "is_active": class_obj.is_active,
        "created_at": class_obj.created_at.isoformat() if class_obj.created_at else None,
        "updated_at": class_obj.updated_at.isoformat() if class_obj.updated_at else None,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_class(
    class_data: ClassCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new class"""
    new_class = Class(
        school_id=class_data.school_id,
        name=class_data.name,
        short_name=class_data.short_name or class_data.name,
        grade_level=class_data.grade_level,
        language=class_data.language,
        student_count=class_data.student_count,
        max_hours_per_day=class_data.max_hours_per_day,
        homeroom_teacher_id=class_data.homeroom_teacher_id,
        default_room_id=class_data.default_room_id,
        color_code=class_data.color_code,
        unavailable_slots=class_data.unavailable_slots or {},
        is_active=class_data.is_active
    )

    db.add(new_class)
    await db.commit()
    await db.refresh(new_class)

    return {
        "id": str(new_class.id),
        "school_id": str(new_class.school_id),
        "name": new_class.name,
        "short_name": new_class.short_name,
        "grade_level": new_class.grade_level,
        "language": new_class.language,
        "student_count": new_class.student_count,
        "max_hours_per_day": new_class.max_hours_per_day,
        "homeroom_teacher_id": str(new_class.homeroom_teacher_id) if new_class.homeroom_teacher_id else None,
        "default_room_id": str(new_class.default_room_id) if new_class.default_room_id else None,
        "color_code": new_class.color_code,
        "unavailable_slots": new_class.unavailable_slots or {},
        "is_active": new_class.is_active,
        "created_at": new_class.created_at.isoformat() if new_class.created_at else None,
        "updated_at": new_class.updated_at.isoformat() if new_class.updated_at else None,
    }


@router.put("/{class_id}")
async def update_class(
    class_id: UUID,
    class_data: ClassUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a class"""
    query = select(Class).where(Class.id == class_id)
    result = await db.execute(query)
    class_obj = result.scalar_one_or_none()

    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with id {class_id} not found"
        )

    # Update only provided fields
    update_data = class_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(class_obj, field, value)

    await db.commit()
    await db.refresh(class_obj)

    return {
        "id": str(class_obj.id),
        "school_id": str(class_obj.school_id),
        "name": class_obj.name,
        "short_name": class_obj.short_name,
        "grade_level": class_obj.grade_level,
        "language": class_obj.language,
        "student_count": class_obj.student_count,
        "max_hours_per_day": class_obj.max_hours_per_day,
        "homeroom_teacher_id": str(class_obj.homeroom_teacher_id) if class_obj.homeroom_teacher_id else None,
        "default_room_id": str(class_obj.default_room_id) if class_obj.default_room_id else None,
        "color_code": class_obj.color_code,
        "unavailable_slots": class_obj.unavailable_slots or {},
        "is_active": class_obj.is_active,
        "created_at": class_obj.created_at.isoformat() if class_obj.created_at else None,
        "updated_at": class_obj.updated_at.isoformat() if class_obj.updated_at else None,
    }


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class(
    class_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete a class (soft delete) and all its lessons"""
    from ..models.lesson import Lesson

    query = select(Class).where(Class.id == class_id)
    result = await db.execute(query)
    class_obj = result.scalar_one_or_none()

    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with id {class_id} not found"
        )

    # Soft delete the class
    class_obj.is_active = False

    # Also soft delete all lessons for this class
    lessons_query = select(Lesson).where(Lesson.class_id == class_id)
    lessons_result = await db.execute(lessons_query)
    lessons = lessons_result.scalars().all()

    for lesson in lessons:
        lesson.is_active = False

    await db.commit()
    return None
