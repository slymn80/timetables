"""
Room model
"""
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, Enum as SQLEnum, JSON

from sqlalchemy.orm import relationship
from .base import BaseModel, GUID
from .subject import RoomType


class Room(BaseModel):
    """Room/Location model"""

    __tablename__ = "rooms"

    school_id = Column(GUID(), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    short_name = Column(String(20))
    room_type = Column(SQLEnum(RoomType), nullable=False, default=RoomType.CLASSROOM)
    capacity = Column(Integer, default=30)
    floor = Column(Integer)
    area_sqm = Column(Integer)  # Area in square meters
    desk_count = Column(Integer)  # Number of desks/seats
    has_smartboard = Column(Boolean, default=False)  # Akıllı tahta var mı
    building = Column(String(50))
    color_code = Column(String(7))
    equipment = Column(JSON, default=[])
    is_available = Column(Boolean, default=True)
    extra_metadata = Column(JSON, default={})

    # Relationships
    school = relationship("School", back_populates="rooms")
    timetable_entries = relationship("TimetableEntry", back_populates="room")

    def __repr__(self):
        return f"<Room(name='{self.name}', type='{self.room_type}')>"
