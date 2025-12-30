"""
Holidays API routes - Tatil Dönemleri
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from datetime import date

from ..database import get_db
from ..models.academic_year import Holiday

router = APIRouter()


class HolidayCreate(BaseModel):
    academic_year_id: UUID
    name: str
    start_date: date
    end_date: date
    description: Optional[str] = None
    is_active: bool = True


class HolidayUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_holidays(
    academic_year_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 5000,
    db: AsyncSession = Depends(get_db)
):
    """List all holidays, optionally filtered by academic year"""
    query = select(Holiday).where(Holiday.is_active == True)

    if academic_year_id:
        query = query.where(Holiday.academic_year_id == academic_year_id)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    holidays = result.scalars().all()

    return {
        "holidays": [
            {
                "id": str(h.id),
                "academic_year_id": str(h.academic_year_id),
                "name": h.name,
                "start_date": h.start_date.isoformat() if h.start_date else None,
                "end_date": h.end_date.isoformat() if h.end_date else None,
                "description": h.description,
                "is_active": h.is_active,
                "created_at": h.created_at.isoformat() if h.created_at else None,
                "updated_at": h.updated_at.isoformat() if h.updated_at else None,
            }
            for h in holidays
        ]
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_holiday(
    holiday_data: HolidayCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new holiday period"""
    # Validate dates
    if holiday_data.end_date <= holiday_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )

    holiday = Holiday(**holiday_data.model_dump())
    db.add(holiday)
    await db.commit()
    await db.refresh(holiday)

    return {
        "id": str(holiday.id),
        "academic_year_id": str(holiday.academic_year_id),
        "name": holiday.name,
        "start_date": holiday.start_date.isoformat(),
        "end_date": holiday.end_date.isoformat(),
        "description": holiday.description,
        "is_active": holiday.is_active,
        "created_at": holiday.created_at.isoformat() if holiday.created_at else None,
    }


@router.put("/{holiday_id}")
async def update_holiday(
    holiday_id: UUID,
    holiday_data: HolidayUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update holiday"""
    query = select(Holiday).where(Holiday.id == holiday_id)
    result = await db.execute(query)
    holiday = result.scalar_one_or_none()

    if not holiday:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Holiday with id {holiday_id} not found"
        )

    # Update fields
    update_data = holiday_data.model_dump(exclude_unset=True)

    # Validate dates if both are provided
    start_date = update_data.get("start_date", holiday.start_date)
    end_date = update_data.get("end_date", holiday.end_date)
    if end_date and start_date and end_date <= start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )

    for field, value in update_data.items():
        setattr(holiday, field, value)

    await db.commit()
    await db.refresh(holiday)

    return {
        "id": str(holiday.id),
        "academic_year_id": str(holiday.academic_year_id),
        "name": holiday.name,
        "start_date": holiday.start_date.isoformat(),
        "end_date": holiday.end_date.isoformat(),
        "description": holiday.description,
        "is_active": holiday.is_active,
        "updated_at": holiday.updated_at.isoformat() if holiday.updated_at else None,
    }


@router.delete("/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holiday(
    holiday_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete (soft delete) a holiday"""
    query = select(Holiday).where(Holiday.id == holiday_id)
    result = await db.execute(query)
    holiday = result.scalar_one_or_none()

    if not holiday:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Holiday with id {holiday_id} not found"
        )

    holiday.is_active = False
    await db.commit()
    return None
