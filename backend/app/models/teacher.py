"""
Teacher model
"""
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, Enum as SQLEnum, JSON

from sqlalchemy.orm import relationship
from .base import BaseModel, GUID
import enum


class DayOfWeek(str, enum.Enum):
    """Day of week enumeration"""
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


class Teacher(BaseModel):
    """Teacher model"""

    __tablename__ = "teachers"

    school_id = Column(GUID(), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"))
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    short_name = Column(String(20))
    email = Column(String(255))
    phone = Column(String(50))
    id_number = Column(String(50))  # National ID or identification number
    gender = Column(String(20))  # male, female, other
    photo = Column(String)  # Base64 encoded photo
    is_available_for_duty = Column(Boolean, default=True)  # Nöbetçi olabilir mi?
    teaching_languages = Column(JSON, default=[])  # Ders anlatabildiği diller
    subject_areas = Column(JSON, default=[])  # Öğretmenin branşları

    # Health information
    is_pregnant = Column(Boolean, default=False)
    has_diabetes = Column(Boolean, default=False)
    has_gluten_intolerance = Column(Boolean, default=False)
    other_health_conditions = Column(String)

    max_hours_per_day = Column(Integer, default=8)
    max_hours_per_week = Column(Integer, default=40)
    min_hours_per_week = Column(Integer, default=0)
    max_consecutive_hours = Column(Integer, default=6)
    preferred_free_day = Column(SQLEnum(DayOfWeek))
    default_room_id = Column(GUID(), ForeignKey("rooms.id", ondelete="SET NULL"))  # Sabit öğretmen odası
    color_code = Column(String(7))
    unavailable_slots = Column(JSON, default={})  # {"1": [1,2,3], "2": [4,5]} - day: [periods]
    extra_metadata = Column(JSON, default={})
    is_active = Column(Boolean, default=True)

    # Relationships
    school = relationship("School", back_populates="teachers")
    user = relationship("User")
    lessons = relationship("Lesson", back_populates="teacher")
    homeroom_classes = relationship("Class", back_populates="homeroom_teacher")

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __repr__(self):
        return f"<Teacher(name='{self.full_name}')>"
