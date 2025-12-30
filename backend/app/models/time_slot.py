"""
Time Slot model
"""
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, Time, Enum as SQLEnum, CheckConstraint

from sqlalchemy.orm import relationship
from .base import BaseModel, GUID
from .teacher import DayOfWeek


class TimeSlot(BaseModel):
    """Time Slot/Period model"""

    __tablename__ = "time_slots"

    school_id = Column(GUID(), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    template_id = Column(GUID(), ForeignKey("time_slot_templates.id", ondelete="CASCADE"), nullable=True)
    day = Column(SQLEnum(DayOfWeek), nullable=False)
    period_number = Column(Integer, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_break = Column(Boolean, default=False)
    label = Column(String(50))
    is_active = Column(Boolean, default=True)

    # Relationships
    school = relationship("School", back_populates="time_slots")
    template = relationship("TimeSlotTemplate", back_populates="time_slots")
    timetable_entries = relationship("TimetableEntry", back_populates="time_slot")

    __table_args__ = (
        CheckConstraint("period_number > 0", name="check_period_positive"),
    )

    def __repr__(self):
        return f"<TimeSlot(day='{self.day}', period={self.period_number})>"
