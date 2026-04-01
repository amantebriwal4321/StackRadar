from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, Date, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base_class import Base


class Domain(Base):
    """High-level technology domain (AI/ML, Web Dev, DevOps, etc.)."""
    __tablename__ = "domains"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)          # "AI / ML"
    slug = Column(String, unique=True, index=True)           # "ai-ml"
    icon = Column(String, default="⚡")
    score = Column(Float, default=0.0)
    stage = Column(String, default="Emerging")
    summary = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tools = relationship("Tool", back_populates="domain_rel", cascade="all, delete-orphan")


class Tool(Base):
    """Individual technology/framework being tracked."""
    __tablename__ = "tools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)           # "React"
    slug = Column(String, unique=True, index=True)           # "react"
    description = Column(Text, nullable=True)
    icon = Column(String, default="⚡")
    category = Column(String, index=True)                    # "Web Development"
    github_repo = Column(String, nullable=True)              # "facebook/react"

    # Live metrics (updated each scrape cycle)
    stars = Column(Integer, default=0)
    forks = Column(Integer, default=0)
    open_issues = Column(Integer, default=0)
    watchers = Column(Integer, default=0)

    # Mention counts from sources
    hn_count = Column(Integer, default=0)
    devto_count = Column(Integer, default=0)
    reddit_count = Column(Integer, default=0)
    news_count = Column(Integer, default=0)

    # Computed
    score = Column(Float, default=0.0)
    growth_pct = Column(Float, default=0.0)
    stage = Column(String, default="Emerging")

    # Decision Intelligence fields
    trend_stage = Column(String, default="stable")           # rising, growing, stable, declining
    recommendation = Column(Text, nullable=True)
    learning_priority = Column(String, default="MEDIUM")     # HIGH, MEDIUM, LOW, AVOID

    # Learning Hierarchy fields
    level = Column(String, default="intermediate")           # beginner, intermediate, advanced
    parent_tool_id = Column(Integer, ForeignKey("tools.id"), nullable=True)
    is_entry_point = Column(Boolean, default=False)
    learning_sequence_score = Column(Integer, default=50)    # 0-100, lower = learn first

    # Foreign key
    domain_id = Column(Integer, ForeignKey("domains.id"), nullable=True)
    domain_rel = relationship("Domain", back_populates="tools")

    # Self-referencing relationship for learning hierarchy
    parent_tool = relationship("Tool", remote_side="Tool.id", backref="children", foreign_keys=[parent_tool_id])

    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    snapshots = relationship("ToolSnapshot", back_populates="tool", cascade="all, delete-orphan")
    roadmap = relationship("ToolRoadmap", back_populates="tool", uselist=False, cascade="all, delete-orphan")


class ToolSnapshot(Base):
    """Daily time-series data point for a tool."""
    __tablename__ = "tool_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    tool_id = Column(Integer, ForeignKey("tools.id"), nullable=False)
    date = Column(Date, nullable=False)
    score = Column(Float, default=0.0)
    stars = Column(Integer, default=0)
    forks = Column(Integer, default=0)
    mentions = Column(Integer, default=0)
    hn_count = Column(Integer, default=0)
    devto_count = Column(Integer, default=0)
    reddit_count = Column(Integer, default=0)

    tool = relationship("Tool", back_populates="snapshots")

    __table_args__ = (
        UniqueConstraint("tool_id", "date", name="uq_tool_date"),
    )


class ToolRoadmap(Base):
    """Learning roadmap for a tool or domain."""
    __tablename__ = "tool_roadmaps"

    id = Column(Integer, primary_key=True, index=True)
    tool_id = Column(Integer, ForeignKey("tools.id"), nullable=True)
    slug = Column(String, unique=True, index=True)          # "ai-ml" or "react"
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String, default="📘")
    estimated_weeks = Column(Integer, default=8)
    steps_json = Column(Text, nullable=False)               # JSON string of steps array

    tool = relationship("Tool", back_populates="roadmap")
