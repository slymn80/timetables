"""
Academic Years API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from datetime import date

from ..database import get_db
from ..models.academic_year import AcademicYear

router = APIRouter()


class AcademicYearCreate(BaseModel):
    school_id: UUID
    name: str
    start_date: date
    end_date: date
    description: Optional[str] = None
    calendar_file: Optional[str] = None
    is_active: bool = True


class AcademicYearUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None
    calendar_file: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_academic_years(
    school_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 5000,
    db: AsyncSession = Depends(get_db)
):
    """List all academic years, optionally filtered by school"""
    query = select(AcademicYear).where(AcademicYear.is_active == True)

    if school_id:
        query = query.where(AcademicYear.school_id == school_id)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    academic_years = result.scalars().all()

    return {
        "academic_years": [
            {
                "id": str(ay.id),
                "school_id": str(ay.school_id),
                "name": ay.name,
                "start_date": ay.start_date.isoformat() if ay.start_date else None,
                "end_date": ay.end_date.isoformat() if ay.end_date else None,
                "description": ay.description,
                "calendar_file": ay.calendar_file,
                "is_active": ay.is_active,
                "created_at": ay.created_at.isoformat() if ay.created_at else None,
                "updated_at": ay.updated_at.isoformat() if ay.updated_at else None,
            }
            for ay in academic_years
        ]
    }


@router.get("/{academic_year_id}")
async def get_academic_year(
    academic_year_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get academic year by ID"""
    query = select(AcademicYear).where(AcademicYear.id == academic_year_id)
    result = await db.execute(query)
    academic_year = result.scalar_one_or_none()

    if not academic_year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Academic year with id {academic_year_id} not found"
        )

    return {
        "id": str(academic_year.id),
        "school_id": str(academic_year.school_id),
        "name": academic_year.name,
        "start_date": academic_year.start_date.isoformat() if academic_year.start_date else None,
        "end_date": academic_year.end_date.isoformat() if academic_year.end_date else None,
        "description": academic_year.description,
        "calendar_file": academic_year.calendar_file,
        "is_active": academic_year.is_active,
        "created_at": academic_year.created_at.isoformat() if academic_year.created_at else None,
        "updated_at": academic_year.updated_at.isoformat() if academic_year.updated_at else None,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_academic_year(
    academic_year_data: AcademicYearCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new academic year"""
    # Validate dates
    if academic_year_data.end_date <= academic_year_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )

    academic_year = AcademicYear(**academic_year_data.model_dump())
    db.add(academic_year)
    await db.commit()
    await db.refresh(academic_year)

    return {
        "id": str(academic_year.id),
        "school_id": str(academic_year.school_id),
        "name": academic_year.name,
        "start_date": academic_year.start_date.isoformat(),
        "end_date": academic_year.end_date.isoformat(),
        "description": academic_year.description,
        "is_active": academic_year.is_active,
        "created_at": academic_year.created_at.isoformat() if academic_year.created_at else None,
    }


@router.put("/{academic_year_id}")
async def update_academic_year(
    academic_year_id: UUID,
    academic_year_data: AcademicYearUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update academic year"""
    query = select(AcademicYear).where(AcademicYear.id == academic_year_id)
    result = await db.execute(query)
    academic_year = result.scalar_one_or_none()

    if not academic_year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Academic year with id {academic_year_id} not found"
        )

    # Update fields
    update_data = academic_year_data.model_dump(exclude_unset=True)

    # Validate dates if both are provided
    start_date = update_data.get("start_date", academic_year.start_date)
    end_date = update_data.get("end_date", academic_year.end_date)
    if end_date and start_date and end_date <= start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )

    for field, value in update_data.items():
        setattr(academic_year, field, value)

    await db.commit()
    await db.refresh(academic_year)

    return {
        "id": str(academic_year.id),
        "school_id": str(academic_year.school_id),
        "name": academic_year.name,
        "start_date": academic_year.start_date.isoformat(),
        "end_date": academic_year.end_date.isoformat(),
        "description": academic_year.description,
        "is_active": academic_year.is_active,
        "updated_at": academic_year.updated_at.isoformat() if academic_year.updated_at else None,
    }


@router.delete("/{academic_year_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_academic_year(
    academic_year_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete (soft delete by setting is_active=False) an academic year"""
    query = select(AcademicYear).where(AcademicYear.id == academic_year_id)
    result = await db.execute(query)
    academic_year = result.scalar_one_or_none()

    if not academic_year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Academic year with id {academic_year_id} not found"
        )

    academic_year.is_active = False
    await db.commit()
    return None
