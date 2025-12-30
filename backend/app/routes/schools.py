"""
Schools API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from ..database import get_db
from ..models.school import School

router = APIRouter()


class SchoolCreate(BaseModel):
    name: str
    short_name: Optional[str] = None
    principal_name: Optional[str] = None
    deputy_principal_name: Optional[str] = None
    school_type: Optional[str] = None
    education_type: Optional[str] = "normal"
    logo: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    is_active: bool = True


class SchoolUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    principal_name: Optional[str] = None
    deputy_principal_name: Optional[str] = None
    school_type: Optional[str] = None
    education_type: Optional[str] = None
    logo: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_schools(
    skip: int = 0,
    limit: int = 5000,
    db: AsyncSession = Depends(get_db)
):
    """List all schools"""
    query = select(School).offset(skip).limit(limit)
    result = await db.execute(query)
    schools = result.scalars().all()

    return [
        {
            "id": str(school.id),
            "name": school.name,
            "short_name": school.short_name,
            "principal_name": school.principal_name,
            "deputy_principal_name": school.deputy_principal_name,
            "school_type": school.school_type,
            "education_type": school.education_type,
            "logo": school.logo,
            "address": school.address,
            "phone": school.phone,
            "email": school.email,
            "website": school.website,
            "is_active": school.is_active,
            "created_at": school.created_at.isoformat() if school.created_at else None,
            "updated_at": school.updated_at.isoformat() if school.updated_at else None,
        }
        for school in schools
    ]


@router.get("/{school_id}")
async def get_school(
    school_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get school by ID"""
    query = select(School).where(School.id == school_id)
    result = await db.execute(query)
    school = result.scalar_one_or_none()

    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"School with id {school_id} not found"
        )

    return {
        "id": str(school.id),
        "name": school.name,
        "code": school.code,
        "address": school.address,
        "timezone": school.timezone,
        "academic_year": school.academic_year,
        "settings": school.settings,
        "is_active": school.is_active,
        "created_at": school.created_at,
        "updated_at": school.updated_at,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_school(
    school_data: SchoolCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new school"""
    school = School(
        name=school_data.name,
        short_name=school_data.short_name,
        principal_name=school_data.principal_name,
        deputy_principal_name=school_data.deputy_principal_name,
        school_type=school_data.school_type,
        education_type=school_data.education_type,
        logo=school_data.logo,
        address=school_data.address,
        phone=school_data.phone,
        email=school_data.email,
        website=school_data.website,
        is_active=school_data.is_active
    )

    db.add(school)
    await db.commit()
    await db.refresh(school)

    return {
        "id": str(school.id),
        "name": school.name,
        "short_name": school.short_name,
        "principal_name": school.principal_name,
        "deputy_principal_name": school.deputy_principal_name,
        "school_type": school.school_type,
        "education_type": school.education_type,
        "logo": school.logo,
        "address": school.address,
        "phone": school.phone,
        "email": school.email,
        "website": school.website,
        "is_active": school.is_active,
        "created_at": school.created_at.isoformat() if school.created_at else None,
        "updated_at": school.updated_at.isoformat() if school.updated_at else None,
    }


@router.put("/{school_id}")
async def update_school(
    school_id: UUID,
    school_data: SchoolUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a school"""
    query = select(School).where(School.id == school_id)
    result = await db.execute(query)
    school = result.scalar_one_or_none()

    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"School with id {school_id} not found"
        )

    # Update only provided fields
    update_data = school_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(school, field, value)

    await db.commit()
    await db.refresh(school)

    return {
        "id": str(school.id),
        "name": school.name,
        "short_name": school.short_name,
        "principal_name": school.principal_name,
        "deputy_principal_name": school.deputy_principal_name,
        "school_type": school.school_type,
        "education_type": school.education_type,
        "logo": school.logo,
        "address": school.address,
        "phone": school.phone,
        "email": school.email,
        "website": school.website,
        "is_active": school.is_active,
        "created_at": school.created_at.isoformat() if school.created_at else None,
        "updated_at": school.updated_at.isoformat() if school.updated_at else None,
    }


@router.delete("/{school_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_school(
    school_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete a school"""
    query = select(School).where(School.id == school_id)
    result = await db.execute(query)
    school = result.scalar_one_or_none()

    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"School with id {school_id} not found"
        )

    await db.delete(school)
    await db.commit()
    return None
