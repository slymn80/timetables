"""
SQLAlchemy models
"""
from .school import School
from .user import User
from .teacher import Teacher
from .class_model import Class
from .subject import Subject
from .room import Room
from .time_slot import TimeSlot
from .time_slot_template import TimeSlotTemplate
from .lesson import Lesson, LessonGroup
from .timetable import Timetable, TimetableEntry, ConstraintViolation
from .academic_year import AcademicYear

__all__ = [
    "School",
    "User",
    "Teacher",
    "Class",
    "Subject",
    "Room",
    "TimeSlot",
    "TimeSlotTemplate",
    "Lesson",
    "LessonGroup",
    "Timetable",
    "TimetableEntry",
    "ConstraintViolation",
    "AcademicYear",
]
