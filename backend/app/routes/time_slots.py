"""
Time Slots API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import time

from ..database import get_db
from ..models.time_slot import TimeSlot
from ..models.teacher import DayOfWeek

router = APIRouter()


@router.get("/")
async def list_time_slots(
    school_id: UUID = None,
    day: DayOfWeek = None,
    db: AsyncSession = Depends(get_db)
):
    """List all time slots, optionally filtered by school and day"""
    query = select(TimeSlot).where(TimeSlot.is_active == True)

    if school_id:
        query = query.where(TimeSlot.school_id == school_id)

    if day:
        query = query.where(TimeSlot.day == day)

    result = await db.execute(query)
    time_slots = result.scalars().all()

    return {
        "total": len(time_slots),
        "time_slots": [
            {
                "id": str(ts.id),
                "school_id": str(ts.school_id),
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
async def create_time_slot(
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Create a new time slot"""
    # Parse time strings to time objects
    start_time_str = data.get('start_time')
    end_time_str = data.get('end_time')

    # Convert HH:MM or HH:MM:SS string to time object
    start_parts = start_time_str.split(':')
    start_hour, start_min = int(start_parts[0]), int(start_parts[1])
    end_parts = end_time_str.split(':')
    end_hour, end_min = int(end_parts[0]), int(end_parts[1])

    time_slot = TimeSlot(
        school_id=UUID(data['school_id']),
        template_id=UUID(data['template_id']) if data.get('template_id') else None,
        day=DayOfWeek(data['day']),
        period_number=int(data['period_number']),
        start_time=time(start_hour, start_min),
        end_time=time(end_hour, end_min),
        label=data.get('label') or f"Period {data['period_number']}",
        is_break=data.get('is_break', False)
    )

    db.add(time_slot)
    await db.commit()
    await db.refresh(time_slot)

    return {
        "id": str(time_slot.id),
        "day": time_slot.day.value,
        "period": time_slot.period_number,
        "message": "Time slot created successfully"
    }


@router.put("/{time_slot_id}")
async def update_time_slot(
    time_slot_id: UUID,
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Update a time slot"""
    result = await db.execute(
        select(TimeSlot).where(TimeSlot.id == time_slot_id)
    )
    time_slot = result.scalar_one_or_none()

    if not time_slot:
        raise HTTPException(status_code=404, detail="Time slot not found")

    # Update fields if provided
    if 'day' in data:
        time_slot.day = DayOfWeek(data['day'])
    if 'period_number' in data:
        time_slot.period_number = int(data['period_number'])
    if 'start_time' in data:
        start_parts = data['start_time'].split(':')
        start_hour, start_min = int(start_parts[0]), int(start_parts[1])
        time_slot.start_time = time(start_hour, start_min)
    if 'end_time' in data:
        end_parts = data['end_time'].split(':')
        end_hour, end_min = int(end_parts[0]), int(end_parts[1])
        time_slot.end_time = time(end_hour, end_min)
    if 'label' in data:
        time_slot.label = data['label']
    if 'is_break' in data:
        time_slot.is_break = data['is_break']

    await db.commit()
    await db.refresh(time_slot)

    return {
        "id": str(time_slot.id),
        "day": time_slot.day.value,
        "period": time_slot.period_number,
        "message": "Time slot updated successfully"
    }


@router.delete("/{time_slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_time_slot(
    time_slot_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete a time slot (soft delete)"""
    result = await db.execute(
        select(TimeSlot).where(TimeSlot.id == time_slot_id)
    )
    time_slot = result.scalar_one_or_none()

    if not time_slot:
        raise HTTPException(status_code=404, detail="Time slot not found")

    time_slot.is_active = False
    await db.commit()

    return None
