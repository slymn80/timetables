"""
Time Slot Template model - Groups time slots together (e.g., Summer Schedule, Winter Schedule)
"""
from sqlalchemy import Column, String, Boolean, ForeignKey, Text, DateTime

from sqlalchemy.orm import relationship
from datetime import datetime
from .base import BaseModel, GUID


class TimeSlotTemplate(BaseModel):
    """Time Slot Template/Schedule model"""

    __tablename__ = "time_slot_templates"

    school_id = Column(GUID(), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)  # e.g., "Yaz Programı", "Kış Programı"
    description = Column(Text)
    is_active = Column(Boolean, default=True)

    # Override created_at and updated_at for SQLite compatibility
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    school = relationship("School", back_populates="time_slot_templates")
    time_slots = relationship("TimeSlot", back_populates="template", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<TimeSlotTemplate(name='{self.name}')>"
