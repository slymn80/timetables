"""
Class/Group model
"""
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, JSON

from sqlalchemy.orm import relationship
from .base import BaseModel, GUID


class Class(BaseModel):
    """Class/Student Group model"""

    __tablename__ = "classes"

    school_id = Column(GUID(), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    short_name = Column(String(20))
    grade_level = Column(Integer)
    language = Column(String(50))  # Sınıfın dili: Kazakça, Rusça, Türkçe, İngilizce, vb.
    student_count = Column(Integer, default=0)
    max_hours_per_day = Column(Integer, default=8)
    homeroom_teacher_id = Column(GUID(), ForeignKey("teachers.id", ondelete="SET NULL"))
    default_room_id = Column(GUID(), ForeignKey("rooms.id", ondelete="SET NULL"))  # Sabit sınıf odası
    color_code = Column(String(7))
    unavailable_slots = Column(JSON, default={})  # {"1": [1,2,3], "2": [4,5]} - day: [periods]
    extra_metadata = Column(JSON, default={})
    is_active = Column(Boolean, default=True)

    # Relationships
    school = relationship("School", back_populates="classes")
    homeroom_teacher = relationship("Teacher", back_populates="homeroom_classes")
    lessons = relationship("Lesson", back_populates="class_")

    def __repr__(self):
        return f"<Class(name='{self.name}')>"
