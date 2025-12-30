"""
Subject model
"""
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, Text, Enum as SQLEnum, JSON

from sqlalchemy.orm import relationship
from .base import BaseModel, GUID
import enum


class RoomType(str, enum.Enum):
    """Room type enumeration"""
    CLASSROOM = "classroom"
    LABORATORY = "laboratory"
    GYM = "gym"
    FOOTBALL_FIELD = "football_field"
    ROBOTICS = "robotics"
    STEAM = "steam"
    MUSIC_ROOM = "music_room"
    ART_ROOM = "art_room"
    LIBRARY = "library"
    COMPUTER_LAB = "computer_lab"
    OTHER = "other"


class Subject(BaseModel):
    """Subject model"""

    __tablename__ = "subjects"

    school_id = Column(GUID(), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    short_code = Column(String(10), nullable=False)
    description = Column(Text)

    # Course configuration
    grade_level = Column(String(50))  # Grade level (e.g., "9", "10-11-12", "All")
    default_weekly_hours = Column(Integer, default=0)  # Default weekly hours (e.g., 5)
    default_distribution_format = Column(String(50))  # Default format (e.g., "2+2+1", "3+2", "1+1+1+1+1")
    is_mandatory = Column(Boolean, default=True)  # True=Mandatory, False=Elective
    delivery_mode = Column(String(20), default="in_person")  # "in_person", "online", "hybrid"
    can_split_groups = Column(Boolean, default=False)  # Can be split into groups
    default_num_groups = Column(Integer, default=1)  # Default number of groups if split

    # Display and requirements
    color_code = Column(String(7))
    requires_room_type = Column(SQLEnum(RoomType))
    requires_consecutive_periods = Column(Boolean, default=False)
    default_allow_consecutive = Column(Boolean, default=True)  # Default: allow lessons to be scheduled consecutively
    preferred_time_of_day = Column(String(20))  # 'morning', 'afternoon', 'any'
    difficulty_level = Column(Integer, default=5)  # 1-10
    extra_metadata = Column(JSON, default={})
    is_active = Column(Boolean, default=True)

    # Relationships
    school = relationship("School", back_populates="subjects")
    lessons = relationship("Lesson", back_populates="subject")

    def __repr__(self):
        return f"<Subject(name='{self.name}', code='{self.short_code}')>"
