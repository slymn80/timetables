"""
User model
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, JSON

from sqlalchemy.orm import relationship
from .base import BaseModel, GUID
import enum


class UserRole(str, enum.Enum):
    """User role enumeration"""
    ADMIN = "admin"
    SCHOOL_ADMIN = "school_admin"
    TEACHER = "teacher"
    VIEWER = "viewer"


class User(BaseModel):
    """User/Authentication model"""

    __tablename__ = "users"

    school_id = Column(GUID(), ForeignKey("schools.id", ondelete="CASCADE"))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.VIEWER)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True))
    preferences = Column(JSON, default={})

    # Relationships
    school = relationship("School", back_populates="users")

    def __repr__(self):
        return f"<User(email='{self.email}', role='{self.role}')>"
