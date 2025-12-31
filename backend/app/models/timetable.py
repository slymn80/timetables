"""
Timetable models
"""
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Text, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from .base import BaseModel, GUID
import enum


class TimetableStatus(str, enum.Enum):
    """Timetable generation status"""
    DRAFT = "draft"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"
    ARCHIVED = "archived"


class AlgorithmType(str, enum.Enum):
    """Scheduling algorithm type"""
    GREEDY = "greedy"
    BACKTRACKING = "backtracking"
    GENETIC = "genetic"
    SIMULATED_ANNEALING = "simulated_annealing"
    HYBRID = "hybrid"
    CPSAT = "cpsat"
    MANUAL = "manual"


class ConstraintSeverity(str, enum.Enum):
    """Constraint severity level"""
    HARD = "hard"
    SOFT = "soft"


class Timetable(BaseModel):
    """Generated timetable model"""

    __tablename__ = "timetables"

    school_id = Column(GUID(), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    academic_year = Column(String(20))
    semester = Column(String(20))
    algorithm = Column(String(50), nullable=False)
    status = Column(SQLEnum(TimetableStatus), default=TimetableStatus.DRAFT)
    generation_started_at = Column(DateTime(timezone=True))
    generation_completed_at = Column(DateTime(timezone=True))
    generation_duration_seconds = Column(Integer)
    hard_constraint_violations = Column(Integer, default=0)
    soft_constraint_score = Column(Integer, default=0)
    generation_logs = Column(JSON, default=[])
    algorithm_parameters = Column(JSON, default={})
    created_by = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"))
    is_active = Column(Boolean, default=True)

    # Relationships
    school = relationship("School", back_populates="timetables")
    creator = relationship("User")
    entries = relationship("TimetableEntry", back_populates="timetable", cascade="all, delete-orphan")
    violations = relationship("ConstraintViolation", back_populates="timetable", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Timetable(name='{self.name}', status='{self.status}')>"


class TimetableEntry(BaseModel):
    """Scheduled lesson entry in timetable"""

    __tablename__ = "timetable_entries"

    timetable_id = Column(GUID(), ForeignKey("timetables.id", ondelete="CASCADE"), nullable=False)
    time_slot_id = Column(GUID(), ForeignKey("time_slots.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(GUID(), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    lesson_group_id = Column(GUID(), ForeignKey("lesson_groups.id", ondelete="SET NULL"))
    room_id = Column(GUID(), ForeignKey("rooms.id", ondelete="SET NULL"))
    is_locked = Column(Boolean, default=False)
    notes = Column(Text)
    extra_metadata = Column(JSON, default={})

    # Relationships
    timetable = relationship("Timetable", back_populates="entries")
    time_slot = relationship("TimeSlot", back_populates="timetable_entries")
    lesson = relationship("Lesson", back_populates="timetable_entries")
    lesson_group = relationship("LessonGroup", back_populates="timetable_entries")
    room = relationship("Room", back_populates="timetable_entries")

    def __repr__(self):
        return f"<TimetableEntry(timetable='{self.timetable_id}')>"


class ConstraintViolation(BaseModel):
    """Constraint violation record"""

    __tablename__ = "constraint_violations"

    timetable_id = Column(GUID(), ForeignKey("timetables.id", ondelete="CASCADE"), nullable=False)
    constraint_type = Column(String(100), nullable=False)
    severity = Column(SQLEnum(ConstraintSeverity), nullable=False)
    description = Column(Text)
    affected_entities = Column(JSON, default={})
    time_slot_id = Column(GUID(), ForeignKey("time_slots.id", ondelete="SET NULL"))
    detected_at = Column(DateTime(timezone=True), server_default="now()")

    # Relationships
    timetable = relationship("Timetable", back_populates="violations")
    time_slot = relationship("TimeSlot")

    def __repr__(self):
        return f"<ConstraintViolation(type='{self.constraint_type}', severity='{self.severity}')>"


