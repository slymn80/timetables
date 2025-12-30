"""
Base model with common fields
"""
from sqlalchemy import Column, DateTime, String, func
from sqlalchemy.types import TypeDecorator, CHAR
import uuid

from ..database import Base


class GUID(TypeDecorator):
    """Platform-independent GUID type. Uses PostgreSQL's UUID type,
    otherwise uses CHAR(36), storing as stringified hex values."""
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            from sqlalchemy.dialects.postgresql import UUID
            return dialect.type_descriptor(UUID())
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            # For SQLite, normalize UUIDs - remove hyphens if present, keep consistent
            if isinstance(value, uuid.UUID):
                # For queries, convert to string with hyphens OR without based on what's in DB
                # We'll check the first character to determine format
                return str(value)
            else:
                # Value is a string - could be with or without hyphens
                val_str = str(value)
                # Always normalize to UUID object then back to string
                return str(uuid.UUID(val_str))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if isinstance(value, uuid.UUID):
                return value
            else:
                # Handle UUIDs stored without hyphens in older databases
                if isinstance(value, str) and len(value) == 32:
                    # Add hyphens to match UUID format
                    value = f"{value[:8]}-{value[8:12]}-{value[12:16]}-{value[16:20]}-{value[20:]}"
                return uuid.UUID(value)


class BaseModel(Base):
    """Abstract base model with common fields"""

    __abstract__ = True

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
