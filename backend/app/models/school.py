"""
School model
"""
from sqlalchemy import Column, String, Boolean, Text, Enum as SQLEnum
from sqlalchemy import JSON
from sqlalchemy.orm import relationship
from .base import BaseModel
import enum


class SchoolType(str, enum.Enum):
    """School type enumeration"""
    okul = "okul"
    ilkokul = "ilkokul"
    ortaokul = "ortaokul"
    lise = "lise"
    kolej = "kolej"
    universite = "universite"
    kurs_merkezi = "kurs_merkezi"


class EducationType(str, enum.Enum):
    """Education type enumeration"""
    normal = "normal"
    ikili = "ikili"


class School(BaseModel):
    """School/Institution model"""

    __tablename__ = "schools"

    name = Column(String(255), nullable=False)
    short_name = Column(String(100))
    code = Column(String(50), unique=True)
    principal_name = Column(String(255))  # Okul müdürü adı
    deputy_principal_name = Column(String(255))  # Sorumlu müdür yardımcısı adı
    school_type = Column(String(20))  # Okul türü
    education_type = Column(String(20), default="normal")  # Eğitim tipi
    logo = Column(String(500))  # Logo path
    address = Column(Text)
    phone = Column(String(50))
    email = Column(String(255))
    website = Column(String(255))
    timezone = Column(String(50), default="UTC")
    academic_year = Column(String(20))
    settings = Column(JSON, default={})
    is_active = Column(Boolean, default=True)

    # Relationships
    users = relationship("User", back_populates="school", cascade="all, delete-orphan")
    teachers = relationship("Teacher", back_populates="school", cascade="all, delete-orphan")
    classes = relationship("Class", back_populates="school", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="school", cascade="all, delete-orphan")
    rooms = relationship("Room", back_populates="school", cascade="all, delete-orphan")
    time_slots = relationship("TimeSlot", back_populates="school", cascade="all, delete-orphan")
    time_slot_templates = relationship("TimeSlotTemplate", back_populates="school", cascade="all, delete-orphan")
    lessons = relationship("Lesson", back_populates="school", cascade="all, delete-orphan")
    timetables = relationship("Timetable", back_populates="school", cascade="all, delete-orphan")
    academic_years = relationship("AcademicYear", back_populates="school", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<School(name='{self.name}', code='{self.code}')>"
