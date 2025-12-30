"""
Subjects API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID
from pydantic import BaseModel

from ..database import get_db
from ..models.subject import Subject

router = APIRouter()


class SubjectCreate(BaseModel):
    school_id: UUID
    name: str
    short_code: str
    description: Optional[str] = None

    # Course configuration
    grade_level: Optional[str] = None
    default_weekly_hours: Optional[int] = 0
    default_distribution_format: Optional[str] = None
    is_mandatory: bool = True
    delivery_mode: Optional[str] = "in_person"
    can_split_groups: bool = False
    default_num_groups: Optional[int] = 1

    # Display and requirements
    color_code: Optional[str] = "#3B82F6"
    requires_room_type: Optional[str] = None
    requires_consecutive_periods: bool = False
    default_allow_consecutive: bool = True
    preferred_time_of_day: Optional[str] = None
    difficulty_level: Optional[int] = 5
    is_active: bool = True


class SubjectUpdate(BaseModel):
    school_id: Optional[UUID] = None
    name: Optional[str] = None
    short_code: Optional[str] = None
    description: Optional[str] = None

    # Course configuration
    grade_level: Optional[str] = None
    default_weekly_hours: Optional[int] = None
    default_distribution_format: Optional[str] = None
    is_mandatory: Optional[bool] = None
    delivery_mode: Optional[str] = None
    can_split_groups: Optional[bool] = None
    default_num_groups: Optional[int] = None

    # Display and requirements
    color_code: Optional[str] = None
    requires_room_type: Optional[str] = None
    requires_consecutive_periods: Optional[bool] = None
    default_allow_consecutive: Optional[bool] = None
    preferred_time_of_day: Optional[str] = None
    difficulty_level: Optional[int] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_subjects(
    school_id: UUID = None,
    skip: int = 0,
    limit: int = 5000,
    db: AsyncSession = Depends(get_db)
):
    """List all subjects, optionally filtered by school"""
    query = select(Subject).where(Subject.is_active == True)

    if school_id:
        query = query.where(Subject.school_id == school_id)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    subjects = result.scalars().all()

    return {
        "total": len(subjects),
        "subjects": [
            {
                "id": str(subj.id),
                "school_id": str(subj.school_id),
                "name": subj.name,
                "short_code": subj.short_code,
                "description": subj.description,
                "grade_level": subj.grade_level,
                "default_weekly_hours": subj.default_weekly_hours,
                "default_distribution_format": subj.default_distribution_format,
                "is_mandatory": subj.is_mandatory,
                "delivery_mode": subj.delivery_mode,
                "can_split_groups": subj.can_split_groups,
                "default_num_groups": subj.default_num_groups,
                "color_code": subj.color_code,
                "requires_room_type": subj.requires_room_type if isinstance(subj.requires_room_type, str) else (subj.requires_room_type.value if subj.requires_room_type else None),
                "requires_consecutive_periods": subj.requires_consecutive_periods,
                "default_allow_consecutive": subj.default_allow_consecutive,
                "preferred_time_of_day": subj.preferred_time_of_day,
                "difficulty_level": subj.difficulty_level,
                "is_active": subj.is_active,
                "created_at": subj.created_at.isoformat() if subj.created_at else None,
                "updated_at": subj.updated_at.isoformat() if subj.updated_at else None,
            }
            for subj in subjects
        ]
    }


@router.get("/{subject_id}")
async def get_subject(
    subject_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get subject by ID"""
    query = select(Subject).where(Subject.id == subject_id)
    result = await db.execute(query)
    subject = result.scalar_one_or_none()

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with id {subject_id} not found"
        )

    return {
        "id": str(subject.id),
        "school_id": str(subject.school_id),
        "name": subject.name,
        "short_code": subject.short_code,
        "description": subject.description,
        "grade_level": subject.grade_level,
        "default_weekly_hours": subject.default_weekly_hours,
        "default_distribution_format": subject.default_distribution_format,
        "is_mandatory": subject.is_mandatory,
        "delivery_mode": subject.delivery_mode,
        "can_split_groups": subject.can_split_groups,
        "default_num_groups": subject.default_num_groups,
        "color_code": subject.color_code,
        "requires_room_type": subject.requires_room_type if isinstance(subject.requires_room_type, str) else (subject.requires_room_type.value if subject.requires_room_type else None),
        "requires_consecutive_periods": subject.requires_consecutive_periods,
        "default_allow_consecutive": subject.default_allow_consecutive,
        "preferred_time_of_day": subject.preferred_time_of_day,
        "difficulty_level": subject.difficulty_level,
        "is_active": subject.is_active,
        "created_at": subject.created_at.isoformat() if subject.created_at else None,
        "updated_at": subject.updated_at.isoformat() if subject.updated_at else None,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_subject(
    subject_data: SubjectCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new subject"""
    # Convert room_type string to enum if provided
    room_type_enum = None
    if subject_data.requires_room_type and subject_data.requires_room_type.strip():
        try:
            from ..models.subject import RoomType
            room_type_enum = RoomType(subject_data.requires_room_type)
        except ValueError:
            pass  # Keep as None if invalid

    subject = Subject(
        school_id=subject_data.school_id,
        name=subject_data.name,
        short_code=subject_data.short_code,
        description=subject_data.description,
        grade_level=subject_data.grade_level,
        default_weekly_hours=subject_data.default_weekly_hours,
        default_distribution_format=subject_data.default_distribution_format,
        is_mandatory=subject_data.is_mandatory,
        delivery_mode=subject_data.delivery_mode,
        can_split_groups=subject_data.can_split_groups,
        default_num_groups=subject_data.default_num_groups,
        color_code=subject_data.color_code,
        requires_room_type=room_type_enum,
        requires_consecutive_periods=subject_data.requires_consecutive_periods,
        default_allow_consecutive=subject_data.default_allow_consecutive,
        preferred_time_of_day=subject_data.preferred_time_of_day,
        difficulty_level=subject_data.difficulty_level,
        is_active=subject_data.is_active
    )

    db.add(subject)
    await db.commit()
    await db.refresh(subject)

    return {
        "id": str(subject.id),
        "school_id": str(subject.school_id),
        "name": subject.name,
        "short_code": subject.short_code,
        "description": subject.description,
        "grade_level": subject.grade_level,
        "default_weekly_hours": subject.default_weekly_hours,
        "default_distribution_format": subject.default_distribution_format,
        "is_mandatory": subject.is_mandatory,
        "delivery_mode": subject.delivery_mode,
        "can_split_groups": subject.can_split_groups,
        "default_num_groups": subject.default_num_groups,
        "color_code": subject.color_code,
        "requires_room_type": subject.requires_room_type if isinstance(subject.requires_room_type, str) else (subject.requires_room_type.value if subject.requires_room_type else None),
        "requires_consecutive_periods": subject.requires_consecutive_periods,
        "default_allow_consecutive": subject.default_allow_consecutive,
        "preferred_time_of_day": subject.preferred_time_of_day,
        "difficulty_level": subject.difficulty_level,
        "is_active": subject.is_active,
        "created_at": subject.created_at.isoformat() if subject.created_at else None,
        "updated_at": subject.updated_at.isoformat() if subject.updated_at else None,
    }


@router.put("/{subject_id}")
async def update_subject(
    subject_id: UUID,
    subject_data: SubjectUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a subject"""
    query = select(Subject).where(Subject.id == subject_id)
    result = await db.execute(query)
    subject = result.scalar_one_or_none()

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with id {subject_id} not found"
        )

    # Update only provided fields
    update_data = subject_data.model_dump(exclude_unset=True)

    # Convert room_type string to enum if provided
    if "requires_room_type" in update_data:
        room_type_value = update_data["requires_room_type"]
        if room_type_value and room_type_value.strip():
            try:
                from ..models.subject import RoomType
                update_data["requires_room_type"] = RoomType(room_type_value)
            except ValueError:
                update_data["requires_room_type"] = None
        else:
            update_data["requires_room_type"] = None

    for field, value in update_data.items():
        setattr(subject, field, value)

    await db.commit()
    await db.refresh(subject)

    return {
        "id": str(subject.id),
        "school_id": str(subject.school_id),
        "name": subject.name,
        "short_code": subject.short_code,
        "description": subject.description,
        "grade_level": subject.grade_level,
        "default_weekly_hours": subject.default_weekly_hours,
        "default_distribution_format": subject.default_distribution_format,
        "is_mandatory": subject.is_mandatory,
        "delivery_mode": subject.delivery_mode,
        "can_split_groups": subject.can_split_groups,
        "default_num_groups": subject.default_num_groups,
        "color_code": subject.color_code,
        "requires_room_type": subject.requires_room_type if isinstance(subject.requires_room_type, str) else (subject.requires_room_type.value if subject.requires_room_type else None),
        "requires_consecutive_periods": subject.requires_consecutive_periods,
        "default_allow_consecutive": subject.default_allow_consecutive,
        "preferred_time_of_day": subject.preferred_time_of_day,
        "difficulty_level": subject.difficulty_level,
        "is_active": subject.is_active,
        "created_at": subject.created_at.isoformat() if subject.created_at else None,
        "updated_at": subject.updated_at.isoformat() if subject.updated_at else None,
    }


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete a subject (soft delete)"""
    query = select(Subject).where(Subject.id == subject_id)
    result = await db.execute(query)
    subject = result.scalar_one_or_none()

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with id {subject_id} not found"
        )

    # Soft delete
    subject.is_active = False
    await db.commit()
    return None
