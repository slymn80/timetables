"""
Lesson models
"""
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, CheckConstraint, JSON
from sqlalchemy.orm import relationship
from .base import BaseModel, GUID


class Lesson(BaseModel):
    """Lesson/Curriculum requirement model"""

    __tablename__ = "lessons"

    school_id = Column(GUID(), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(GUID(), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(GUID(), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(GUID(), ForeignKey("teachers.id", ondelete="SET NULL"))
    hours_per_week = Column(Integer, nullable=False)
    can_split = Column(Boolean, default=False)
    num_groups = Column(Integer, default=1)
    requires_double_period = Column(Boolean, default=False)
    max_hours_per_day = Column(Integer, nullable=True)  # Maximum hours this lesson can be scheduled on the same day
    allow_consecutive = Column(Boolean, default=True)  # Allow lessons to be scheduled consecutively (back-to-back)
    preferred_room_id = Column(GUID(), ForeignKey("rooms.id", ondelete="SET NULL"))
    extra_metadata = Column(JSON, default={})
    is_active = Column(Boolean, default=True)

    # Relationships
    school = relationship("School", back_populates="lessons")
    class_ = relationship("Class", back_populates="lessons")
    subject = relationship("Subject", back_populates="lessons")
    teacher = relationship("Teacher", back_populates="lessons")
    preferred_room = relationship("Room")
    lesson_groups = relationship("LessonGroup", back_populates="lesson", cascade="all, delete-orphan")
    timetable_entries = relationship("TimetableEntry", back_populates="lesson")

    __table_args__ = (
        CheckConstraint("hours_per_week > 0", name="check_hours_positive"),
        CheckConstraint("num_groups > 0", name="check_groups_positive"),
    )

    def __repr__(self):
        return f"<Lesson(class='{self.class_.name}', subject='{self.subject.name}')>"


class LessonGroup(BaseModel):
    """Lesson Group for split classes"""

    __tablename__ = "lesson_groups"

    lesson_id = Column(GUID(), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    group_name = Column(String(50), nullable=False)
    student_count = Column(Integer)
    teacher_id = Column(GUID(), ForeignKey("teachers.id", ondelete="SET NULL"))
    extra_metadata = Column(JSON, default={})

    # Relationships
    lesson = relationship("Lesson", back_populates="lesson_groups")
    teacher = relationship("Teacher")
    timetable_entries = relationship("TimetableEntry", back_populates="lesson_group")

    def __repr__(self):
        return f"<LessonGroup(name='{self.group_name}')>"
