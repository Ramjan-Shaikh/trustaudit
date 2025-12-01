from sqlalchemy import create_engine, Column, String, Text, DateTime, Integer, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timezone
import os

# Database URL - using SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./trustaudit.db")

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


class User(Base):
    """User model for authentication"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ChatMessage(Base):
    """Chat message model for storing conversation history"""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    role = Column(String, index=True)  # "user" or "assistant"
    content = Column(Text)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    session_id = Column(String, index=True)  # For grouping conversations
    message_metadata = Column(Text)  # JSON string for additional data (audit info, etc.)


class GraphNode(Base):
    """Graph node model for storing memory graph nodes"""
    __tablename__ = "graph_nodes"

    id = Column(String, primary_key=True, index=True)  # UUID string
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    type = Column(String, index=True)  # "task", "result", etc.
    content = Column(Text)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    node_metadata = Column(Text)  # JSON string for additional data


class GraphEdge(Base):
    """Graph edge model for storing memory graph relationships"""
    __tablename__ = "graph_edges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    source_id = Column(String, ForeignKey("graph_nodes.id"), index=True, nullable=False)
    target_id = Column(String, ForeignKey("graph_nodes.id"), index=True, nullable=False)
    label = Column(String, index=True)  # "GeneratedBy", "CheckedBy", etc.


# Create tables
def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)


# Dependency for getting database session
def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

