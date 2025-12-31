"""
Teachers API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
import logging

from ..database import get_db
from ..models.teacher import Teacher

logger = logging.getLogger(__name__)

router = APIRouter()


class TeacherCreate(BaseModel):
    school_id: UUID
    first_name: str
    last_name: str
    email: str
    short_name: Optional[str] = None
    phone: Optional[str] = None
    id_number: Optional[str] = None
    gender: Optional[str] = None
    photo: Optional[str] = None
    is_available_for_duty: bool = True
    teaching_languages: List[str] = []
    subject_areas: List[str] = []

    # Health information
    is_pregnant: bool = False
    has_diabetes: bool = False
    has_gluten_intolerance: bool = False
    other_health_conditions: Optional[str] = None

    # Working hours constraints
    max_hours_per_day: Optional[int] = 8
    max_hours_per_week: Optional[int] = 40
    min_hours_per_week: Optional[int] = 0
    max_consecutive_hours: Optional[int] = 6
    preferred_free_day: Optional[str] = None
    default_room_id: Optional[UUID] = None
    color_code: Optional[str] = None
    unavailable_slots: Optional[dict] = {}
    is_active: bool = True


class TeacherUpdate(BaseModel):
    school_id: Optional[UUID] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    short_name: Optional[str] = None
    phone: Optional[str] = None
    id_number: Optional[str] = None
    gender: Optional[str] = None
    photo: Optional[str] = None
    is_available_for_duty: Optional[bool] = None
    teaching_languages: Optional[List[str]] = None
    subject_areas: Optional[List[str]] = None

    # Health information
    is_pregnant: Optional[bool] = None
    has_diabetes: Optional[bool] = None
    has_gluten_intolerance: Optional[bool] = None
    other_health_conditions: Optional[str] = None

    # Working hours constraints
    max_hours_per_day: Optional[int] = None
    max_hours_per_week: Optional[int] = None
    min_hours_per_week: Optional[int] = None
    max_consecutive_hours: Optional[int] = None
    preferred_free_day: Optional[str] = None
    default_room_id: Optional[UUID] = None
    color_code: Optional[str] = None
    unavailable_slots: Optional[dict] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_teachers(
    school_id: UUID = None,
    skip: int = 0,
    limit: int = 5000,
    db: AsyncSession = Depends(get_db)
):
    """List all teachers, optionally filtered by school"""
    from sqlalchemy.orm import selectinload

    query = select(Teacher).where(Teacher.is_active == True).options(
        selectinload(Teacher.homeroom_classes)
    )

    if school_id:
        query = query.where(Teacher.school_id == school_id)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    teachers = result.scalars().all()

    return {
        "total": len(teachers),
        "teachers": [
            {
                "id": str(teacher.id),
                "school_id": str(teacher.school_id),
                "first_name": teacher.first_name,
                "last_name": teacher.last_name,
                "full_name": teacher.full_name,
                "short_name": teacher.short_name,
                "email": teacher.email,
                "phone": teacher.phone,
                "id_number": teacher.id_number,
                "gender": teacher.gender,
                "photo": teacher.photo,
                "is_available_for_duty": teacher.is_available_for_duty,
                "teaching_languages": teacher.teaching_languages or [],
                "subject_areas": teacher.subject_areas or [],
                "is_pregnant": teacher.is_pregnant,
                "has_diabetes": teacher.has_diabetes,
                "has_gluten_intolerance": teacher.has_gluten_intolerance,
                "other_health_conditions": teacher.other_health_conditions,
                "max_hours_per_day": teacher.max_hours_per_day,
                "max_hours_per_week": teacher.max_hours_per_week,
                "min_hours_per_week": teacher.min_hours_per_week,
                "max_consecutive_hours": teacher.max_consecutive_hours,
                "preferred_free_day": teacher.preferred_free_day.value if teacher.preferred_free_day else None,
                "default_room_id": str(teacher.default_room_id) if teacher.default_room_id else None,
                "color_code": teacher.color_code,
                "unavailable_slots": teacher.unavailable_slots or {},
                "homeroom_classes": [
                    {
                        "id": str(c.id),
                        "name": c.name,
                        "short_name": c.short_name,
                    }
                    for c in teacher.homeroom_classes
                ] if teacher.homeroom_classes else [],
                "is_active": teacher.is_active,
                "created_at": teacher.created_at.isoformat() if teacher.created_at else None,
                "updated_at": teacher.updated_at.isoformat() if teacher.updated_at else None,
            }
            for teacher in teachers
        ]
    }


@router.get("/{teacher_id}")
async def get_teacher(
    teacher_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get teacher by ID"""
    query = select(Teacher).where(Teacher.id == teacher_id)
    result = await db.execute(query)
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with id {teacher_id} not found"
        )

    return {
        "id": str(teacher.id),
        "school_id": str(teacher.school_id),
        "first_name": teacher.first_name,
        "last_name": teacher.last_name,
        "full_name": teacher.full_name,
        "short_name": teacher.short_name,
        "email": teacher.email,
        "phone": teacher.phone,
        "id_number": teacher.id_number,
        "gender": teacher.gender,
        "photo": teacher.photo,
        "is_available_for_duty": teacher.is_available_for_duty,
        "teaching_languages": teacher.teaching_languages or [],
        "subject_areas": teacher.subject_areas or [],
        "is_pregnant": teacher.is_pregnant,
        "has_diabetes": teacher.has_diabetes,
        "has_gluten_intolerance": teacher.has_gluten_intolerance,
        "other_health_conditions": teacher.other_health_conditions,
        "max_hours_per_day": teacher.max_hours_per_day,
        "max_hours_per_week": teacher.max_hours_per_week,
        "min_hours_per_week": teacher.min_hours_per_week,
        "max_consecutive_hours": teacher.max_consecutive_hours,
        "preferred_free_day": teacher.preferred_free_day.value if teacher.preferred_free_day else None,
        "default_room_id": str(teacher.default_room_id) if teacher.default_room_id else None,
        "color_code": teacher.color_code,
        "unavailable_slots": teacher.unavailable_slots or {},
        "is_active": teacher.is_active,
        "created_at": teacher.created_at.isoformat() if teacher.created_at else None,
        "updated_at": teacher.updated_at.isoformat() if teacher.updated_at else None,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_teacher(
    teacher_data: TeacherCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new teacher"""
    logger.info(f"Creating teacher with subject_areas: {teacher_data.subject_areas}")
    teacher = Teacher(
        school_id=teacher_data.school_id,
        first_name=teacher_data.first_name,
        last_name=teacher_data.last_name,
        short_name=teacher_data.short_name or f"{teacher_data.first_name[0]}.{teacher_data.last_name}",
        email=teacher_data.email,
        phone=teacher_data.phone,
        id_number=teacher_data.id_number,
        gender=teacher_data.gender,
        photo=teacher_data.photo,
        is_available_for_duty=teacher_data.is_available_for_duty,
        teaching_languages=teacher_data.teaching_languages,
        subject_areas=teacher_data.subject_areas,
        is_pregnant=teacher_data.is_pregnant,
        has_diabetes=teacher_data.has_diabetes,
        has_gluten_intolerance=teacher_data.has_gluten_intolerance,
        other_health_conditions=teacher_data.other_health_conditions,
        max_hours_per_day=teacher_data.max_hours_per_day,
        max_hours_per_week=teacher_data.max_hours_per_week,
        min_hours_per_week=teacher_data.min_hours_per_week,
        max_consecutive_hours=teacher_data.max_consecutive_hours,
        preferred_free_day=teacher_data.preferred_free_day,
        default_room_id=teacher_data.default_room_id,
        color_code=teacher_data.color_code,
        unavailable_slots=teacher_data.unavailable_slots or {},
        is_active=teacher_data.is_active
    )

    db.add(teacher)
    await db.commit()
    await db.refresh(teacher)

    return {
        "id": str(teacher.id),
        "school_id": str(teacher.school_id),
        "first_name": teacher.first_name,
        "last_name": teacher.last_name,
        "full_name": teacher.full_name,
        "short_name": teacher.short_name,
        "email": teacher.email,
        "phone": teacher.phone,
        "id_number": teacher.id_number,
        "gender": teacher.gender,
        "photo": teacher.photo,
        "is_available_for_duty": teacher.is_available_for_duty,
        "teaching_languages": teacher.teaching_languages or [],
        "subject_areas": teacher.subject_areas or [],
        "is_pregnant": teacher.is_pregnant,
        "has_diabetes": teacher.has_diabetes,
        "has_gluten_intolerance": teacher.has_gluten_intolerance,
        "other_health_conditions": teacher.other_health_conditions,
        "max_hours_per_day": teacher.max_hours_per_day,
        "max_hours_per_week": teacher.max_hours_per_week,
        "min_hours_per_week": teacher.min_hours_per_week,
        "max_consecutive_hours": teacher.max_consecutive_hours,
        "preferred_free_day": teacher.preferred_free_day.value if teacher.preferred_free_day else None,
        "default_room_id": str(teacher.default_room_id) if teacher.default_room_id else None,
        "color_code": teacher.color_code,
        "unavailable_slots": teacher.unavailable_slots or {},
        "is_active": teacher.is_active,
        "created_at": teacher.created_at.isoformat() if teacher.created_at else None,
        "updated_at": teacher.updated_at.isoformat() if teacher.updated_at else None,
    }


@router.put("/{teacher_id}")
async def update_teacher(
    teacher_id: UUID,
    teacher_data: TeacherUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a teacher"""
    logger.info(f"Updating teacher {teacher_id} with subject_areas: {teacher_data.subject_areas}")
    query = select(Teacher).where(Teacher.id == teacher_id)
    result = await db.execute(query)
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with id {teacher_id} not found"
        )

    # Update only provided fields
    update_data = teacher_data.model_dump(exclude_unset=True)
    logger.info(f"Update data: {update_data}")
    for field, value in update_data.items():
        setattr(teacher, field, value)

    await db.commit()
    await db.refresh(teacher)

    return {
        "id": str(teacher.id),
        "school_id": str(teacher.school_id),
        "first_name": teacher.first_name,
        "last_name": teacher.last_name,
        "full_name": teacher.full_name,
        "short_name": teacher.short_name,
        "email": teacher.email,
        "phone": teacher.phone,
        "id_number": teacher.id_number,
        "gender": teacher.gender,
        "photo": teacher.photo,
        "is_available_for_duty": teacher.is_available_for_duty,
        "teaching_languages": teacher.teaching_languages or [],
        "subject_areas": teacher.subject_areas or [],
        "is_pregnant": teacher.is_pregnant,
        "has_diabetes": teacher.has_diabetes,
        "has_gluten_intolerance": teacher.has_gluten_intolerance,
        "other_health_conditions": teacher.other_health_conditions,
        "max_hours_per_day": teacher.max_hours_per_day,
        "max_hours_per_week": teacher.max_hours_per_week,
        "min_hours_per_week": teacher.min_hours_per_week,
        "max_consecutive_hours": teacher.max_consecutive_hours,
        "preferred_free_day": teacher.preferred_free_day.value if teacher.preferred_free_day else None,
        "default_room_id": str(teacher.default_room_id) if teacher.default_room_id else None,
        "color_code": teacher.color_code,
        "unavailable_slots": teacher.unavailable_slots or {},
        "is_active": teacher.is_active,
        "created_at": teacher.created_at.isoformat() if teacher.created_at else None,
        "updated_at": teacher.updated_at.isoformat() if teacher.updated_at else None,
    }


@router.delete("/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_teacher(
    teacher_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete a teacher (soft delete)"""
    query = select(Teacher).where(Teacher.id == teacher_id)
    result = await db.execute(query)
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with id {teacher_id} not found"
        )

    # Soft delete
    teacher.is_active = False
    await db.commit()
    return None
