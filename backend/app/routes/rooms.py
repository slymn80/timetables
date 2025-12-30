"""
Rooms API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from ..database import get_db
from ..models.room import Room
from ..models.subject import RoomType

router = APIRouter()


class RoomCreate(BaseModel):
    school_id: UUID
    name: str
    room_type: str = "classroom"
    short_name: Optional[str] = None
    capacity: Optional[int] = 30
    floor: Optional[int] = None
    area_sqm: Optional[int] = None
    desk_count: Optional[int] = None
    has_smartboard: bool = False
    building: Optional[str] = None
    equipment: List[str] = []
    is_available: bool = True


class RoomUpdate(BaseModel):
    school_id: Optional[UUID] = None
    name: Optional[str] = None
    room_type: Optional[str] = None
    short_name: Optional[str] = None
    capacity: Optional[int] = None
    floor: Optional[int] = None
    area_sqm: Optional[int] = None
    desk_count: Optional[int] = None
    has_smartboard: Optional[bool] = None
    building: Optional[str] = None
    equipment: Optional[List[str]] = None
    is_available: Optional[bool] = None


@router.get("/")
async def list_rooms(
    school_id: UUID = None,
    skip: int = 0,
    limit: int = 5000,
    db: AsyncSession = Depends(get_db)
):
    """List all rooms, optionally filtered by school"""
    query = select(Room).where(Room.is_available == True)

    if school_id:
        query = query.where(Room.school_id == school_id)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    rooms = result.scalars().all()

    return {
        "total": len(rooms),
        "rooms": [
            {
                "id": str(room.id),
                "school_id": str(room.school_id),
                "name": room.name,
                "short_name": room.short_name,
                "room_type": room.room_type.value if room.room_type else "classroom",
                "capacity": room.capacity,
                "floor": room.floor,
                "area_sqm": room.area_sqm,
                "desk_count": room.desk_count,
                "has_smartboard": room.has_smartboard,
                "building": room.building,
                "equipment": room.equipment or [],
                "is_available": room.is_available,
                "created_at": room.created_at.isoformat() if room.created_at else None,
                "updated_at": room.updated_at.isoformat() if room.updated_at else None,
            }
            for room in rooms
        ]
    }


@router.get("/{room_id}")
async def get_room(
    room_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get room by ID"""
    query = select(Room).where(Room.id == room_id)
    result = await db.execute(query)
    room = result.scalar_one_or_none()

    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with id {room_id} not found"
        )

    return {
        "id": str(room.id),
        "school_id": str(room.school_id),
        "name": room.name,
        "short_name": room.short_name,
        "room_type": room.room_type.value if room.room_type else "classroom",
        "capacity": room.capacity,
        "floor": room.floor,
        "area_sqm": room.area_sqm,
        "desk_count": room.desk_count,
        "has_smartboard": room.has_smartboard,
        "building": room.building,
        "equipment": room.equipment or [],
        "is_available": room.is_available,
        "created_at": room.created_at.isoformat() if room.created_at else None,
        "updated_at": room.updated_at.isoformat() if room.updated_at else None,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_room(
    room_data: RoomCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new room"""
    # Convert string room_type to RoomType enum
    try:
        room_type_enum = RoomType(room_data.room_type)
    except ValueError:
        room_type_enum = RoomType.CLASSROOM

    room = Room(
        school_id=room_data.school_id,
        name=room_data.name,
        short_name=room_data.short_name or room_data.name,
        room_type=room_type_enum,
        capacity=room_data.capacity,
        floor=room_data.floor,
        area_sqm=room_data.area_sqm,
        desk_count=room_data.desk_count,
        has_smartboard=room_data.has_smartboard,
        building=room_data.building,
        equipment=room_data.equipment,
        is_available=room_data.is_available
    )

    db.add(room)
    await db.commit()
    await db.refresh(room)

    return {
        "id": str(room.id),
        "school_id": str(room.school_id),
        "name": room.name,
        "short_name": room.short_name,
        "room_type": room.room_type.value if room.room_type else "classroom",
        "capacity": room.capacity,
        "floor": room.floor,
        "area_sqm": room.area_sqm,
        "desk_count": room.desk_count,
        "has_smartboard": room.has_smartboard,
        "building": room.building,
        "equipment": room.equipment or [],
        "is_available": room.is_available,
        "created_at": room.created_at.isoformat() if room.created_at else None,
        "updated_at": room.updated_at.isoformat() if room.updated_at else None,
    }


@router.put("/{room_id}")
async def update_room(
    room_id: UUID,
    room_data: RoomUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a room"""
    query = select(Room).where(Room.id == room_id)
    result = await db.execute(query)
    room = result.scalar_one_or_none()

    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with id {room_id} not found"
        )

    # Update only provided fields
    update_data = room_data.model_dump(exclude_unset=True)

    # Convert room_type string to enum if provided
    if "room_type" in update_data and update_data["room_type"]:
        try:
            update_data["room_type"] = RoomType(update_data["room_type"])
        except ValueError:
            pass  # Keep existing value if invalid

    for field, value in update_data.items():
        setattr(room, field, value)

    await db.commit()
    await db.refresh(room)

    return {
        "id": str(room.id),
        "school_id": str(room.school_id),
        "name": room.name,
        "short_name": room.short_name,
        "room_type": room.room_type.value if room.room_type else "classroom",
        "capacity": room.capacity,
        "floor": room.floor,
        "area_sqm": room.area_sqm,
        "desk_count": room.desk_count,
        "has_smartboard": room.has_smartboard,
        "building": room.building,
        "equipment": room.equipment or [],
        "is_available": room.is_available,
        "created_at": room.created_at.isoformat() if room.created_at else None,
        "updated_at": room.updated_at.isoformat() if room.updated_at else None,
    }


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete a room (soft delete)"""
    query = select(Room).where(Room.id == room_id)
    result = await db.execute(query)
    room = result.scalar_one_or_none()

    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with id {room_id} not found"
        )

    # Soft delete
    room.is_available = False
    await db.commit()
    return None
