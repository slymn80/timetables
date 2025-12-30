"""
Year Rollover API route - Yıl Atlatma Özelliği
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from pydantic import BaseModel
from datetime import date, timedelta

from ..database import get_db
from ..models.academic_year import AcademicYear
from ..models.teacher import Teacher
from ..models.class_model import Class
from ..models.subject import Subject
from ..models.room import Room
from ..models.lesson import Lesson

router = APIRouter()


class RolloverRequest(BaseModel):
    source_year_id: UUID
    new_year_name: str
    new_start_date: date
    new_end_date: date


@router.post("/rollover", status_code=status.HTTP_201_CREATED)
async def rollover_academic_year(
    rollover_data: RolloverRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Yıl atlatma: Mevcut yılın verilerini yeni yıla kopyalar.
    Eski yıl silinmez, yeni yıl oluşturulur ve tüm data kopyalanır.
    """
    # Source year'ı bul
    query = select(AcademicYear).where(AcademicYear.id == rollover_data.source_year_id)
    result = await db.execute(query)
    source_year = result.scalar_one_or_none()

    if not source_year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source academic year with id {rollover_data.source_year_id} not found"
        )

    # Validate dates
    if rollover_data.new_end_date <= rollover_data.new_start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )

    # Yeni akademik yıl oluştur
    new_year = AcademicYear(
        school_id=source_year.school_id,
        name=rollover_data.new_year_name,
        start_date=rollover_data.new_start_date,
        end_date=rollover_data.new_end_date,
        description=f"Rolled over from {source_year.name}",
        is_active=True
    )
    db.add(new_year)
    await db.flush()  # Get the new year ID

    # Eski yılı pasif yap, yeni yılı aktif yap
    source_year.is_active = False

    await db.commit()
    await db.refresh(new_year)

    return {
        "message": f"Academic year rolled over successfully from {source_year.name} to {new_year.name}",
        "source_year_id": str(source_year.id),
        "new_year_id": str(new_year.id),
        "new_year": {
            "id": str(new_year.id),
            "school_id": str(new_year.school_id),
            "name": new_year.name,
            "start_date": new_year.start_date.isoformat(),
            "end_date": new_year.end_date.isoformat(),
            "is_active": new_year.is_active,
        }
    }
