"""
Time Slot Templates API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional

from ..database import get_db
from ..models.time_slot_template import TimeSlotTemplate
from ..models.time_slot import TimeSlot

router = APIRouter()


@router.get("/")
async def list_templates(
    school_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all time slot templates"""
    query = select(TimeSlotTemplate).where(TimeSlotTemplate.is_active == True)

    if school_id:
        query = query.where(TimeSlotTemplate.school_id == school_id)

    result = await db.execute(query)
    templates = result.scalars().all()

    return {
        "total": len(templates),
        "templates": [
            {
                "id": str(t.id),
                "school_id": str(t.school_id),
                "name": t.name,
                "description": t.description,
                "created_at": str(t.created_at),
                "updated_at": str(t.updated_at),
            }
            for t in templates
        ]
    }


@router.get("/{template_id}")
async def get_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific template with its time slots"""
    result = await db.execute(
        select(TimeSlotTemplate).where(TimeSlotTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Get time slots for this template
    slots_result = await db.execute(
        select(TimeSlot).where(
            TimeSlot.template_id == template_id,
            TimeSlot.is_active == True
        ).order_by(TimeSlot.day, TimeSlot.period_number)
    )
    time_slots = slots_result.scalars().all()

    return {
        "id": str(template.id),
        "school_id": str(template.school_id),
        "name": template.name,
        "description": template.description,
        "created_at": str(template.created_at),
        "updated_at": str(template.updated_at),
        "time_slots": [
            {
                "id": str(ts.id),
                "day": ts.day.value,
                "period_number": ts.period_number,
                "start_time": str(ts.start_time),
                "end_time": str(ts.end_time),
                "label": ts.label,
                "is_break": ts.is_break,
            }
            for ts in time_slots
        ]
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_template(
    school_id: UUID,
    name: str,
    description: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Create a new time slot template"""
    template = TimeSlotTemplate(
        school_id=school_id,
        name=name,
        description=description
    )

    db.add(template)
    await db.commit()
    await db.refresh(template)

    return {
        "id": str(template.id),
        "name": template.name,
        "message": "Template created successfully"
    }


@router.put("/{template_id}")
async def update_template(
    template_id: UUID,
    name: Optional[str] = None,
    description: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Update a time slot template"""
    result = await db.execute(
        select(TimeSlotTemplate).where(TimeSlotTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if name is not None:
        template.name = name
    if description is not None:
        template.description = description

    await db.commit()
    await db.refresh(template)

    return {
        "id": str(template.id),
        "name": template.name,
        "message": "Template updated successfully"
    }


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete a time slot template (soft delete)"""
    result = await db.execute(
        select(TimeSlotTemplate).where(TimeSlotTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template.is_active = False
    await db.commit()

    return None


@router.delete("/{template_id}/day/{day}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template_day(
    template_id: UUID,
    day: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete all time slots for a specific day in a template"""
    # Get all time slots for this template and day
    result = await db.execute(
        select(TimeSlot).where(
            TimeSlot.template_id == template_id,
            TimeSlot.day == day,
            TimeSlot.is_active == True
        )
    )
    time_slots = result.scalars().all()

    # Soft delete all slots
    for slot in time_slots:
        slot.is_active = False

    await db.commit()

    return None
