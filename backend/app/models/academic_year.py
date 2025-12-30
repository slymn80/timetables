"""
Academic Year model
"""
from sqlalchemy import Column, String, Date, Boolean, ForeignKey, Text

from sqlalchemy.orm import relationship
from .base import BaseModel, GUID


class AcademicYear(BaseModel):
    """Academic Year model for managing school years"""

    __tablename__ = "academic_years"

    school_id = Column(GUID(), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)  # e.g., "2024-2025"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    description = Column(Text)
    calendar_file = Column(String)  # Base64 encoded academic calendar file
    is_active = Column(Boolean, default=True)

    # Relationships
    school = relationship("School", back_populates="academic_years")
    holidays = relationship("Holiday", back_populates="academic_year", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<AcademicYear(name='{self.name}', school_id='{self.school_id}')>"


class Holiday(BaseModel):
    """Holiday/Break period model"""

    __tablename__ = "holidays"

    academic_year_id = Column(GUID(), ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)  # e.g., "Yaz Tatili", "Yarıyıl Tatili"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)

    # Relationships
    academic_year = relationship("AcademicYear", back_populates="holidays")

    def __repr__(self):
        return f"<Holiday(name='{self.name}', {self.start_date} - {self.end_date})>"
