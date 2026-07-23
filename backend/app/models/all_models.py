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
    mention_count = Column(Integer, default=0) # New field

    # Sentiment tracking (from Groq analysis)
    sentiment_positive = Column(Integer, default=0)
    sentiment_negative = Column(Integer, default=0)
    sentiment_label = Column(String, default="neutral")  # positive / negative / mixed / neutral
    sentiment_score = Column(Float, default=0.0) # New field

    # Release tracking — powers the "this tutorial predates the current major
    # version" warning on learning resources. Filled from GitHub /releases/latest.
    homepage = Column(String, nullable=True)                 # official docs URL
    latest_version = Column(String, nullable=True)           # "v19.2.0"
    latest_release_at = Column(DateTime(timezone=True), nullable=True)

    # Computed
    score = Column(Float, default=0.0)
    growth_pct = Column(Float, default=0.0)
    stage = Column(String, default="Emerging")
    domain = Column(String, nullable=True) # New field
    github_stars = Column(Integer, default=0) # New field
    last_updated = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

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
    __tablename__ = "tool_snapshots"
    id              = Column(Integer, primary_key=True)
    tool_id         = Column(Integer, ForeignKey("tools.id"), nullable=False, index=True)
    recorded_at     = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    score           = Column(Float)
    # Absolute star count at capture time. `github_stars_delta` alone can't yield
    # velocity: it's the change since the previous scrape, and the scrape cadence
    # is irregular (hours to weeks), so a delta is uninterpretable without knowing
    # the interval. Storing the absolute lets velocity be derived between ANY two
    # snapshots — which is what real momentum (stars gained per week) requires.
    stars           = Column(Integer, nullable=True)
    github_stars_delta = Column(Integer, default=0)
    mention_count   = Column(Integer, default=0)
    sentiment_score = Column(Float, default=0.0)

    tool = relationship("Tool", back_populates="snapshots")


class UserProgress(Base):
    """One completed roadmap step for one user.

    Rows are only ever created for COMPLETED steps — a missing row means "not
    done". Storing this server-side (rather than in localStorage like the
    watchlist) is deliberate: progress is the product's retention loop, so it has
    to survive a device change and be queryable for streaks and reminders.

    `user_id` is the Clerk user id, supplied by the client.
    """
    __tablename__ = "user_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "roadmap_slug", "step", name="uq_user_roadmap_step"),
    )

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(String, index=True, nullable=False)
    roadmap_slug = Column(String, index=True, nullable=False)
    step         = Column(Integer, nullable=False)
    completed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ToolResource(Base):
    """A learning resource (video, playlist, course, docs) attached to a tool.

    Rows are only ever written from a source that returned a REAL, resolvable
    item: the YouTube Data API (with live statistics) or the curated platform
    list. Nothing here is model-generated — a hallucinated video id would look
    identical to a real one in the UI and send users to a dead page.

    Cached rather than fetched per request because the YouTube Data API bills
    100 quota units per search against a 10k/day default.
    """
    __tablename__ = "tool_resources"
    __table_args__ = (
        UniqueConstraint("tool_slug", "url", name="uq_tool_resource_url"),
    )

    id         = Column(Integer, primary_key=True, index=True)
    tool_slug  = Column(String, index=True, nullable=False)
    kind       = Column(String, default="video")      # video | playlist | platform
    source     = Column(String, default="youtube")    # youtube | curated

    title      = Column(String, nullable=False)
    url        = Column(String, nullable=False)
    channel    = Column(String, nullable=True)
    thumbnail  = Column(String, nullable=True)
    blurb      = Column(Text, nullable=True)

    # Live metrics — NULL for curated platform links, which have no such stats.
    views        = Column(Integer, nullable=True)
    likes        = Column(Integer, nullable=True)
    duration_s   = Column(Integer, nullable=True)
    item_count   = Column(Integer, nullable=True)     # videos in a playlist
    published_at = Column(DateTime(timezone=True), nullable=True)

    language   = Column(String, default="en")         # "en" | "hi" — Hindi tracks
    rank_score = Column(Float, default=0.0)           # our transparent ranking
    fetched_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class NotificationPref(Base):
    """A user's opt-in for the daily learning nudge.

    Email + opt-in only, keyed by Clerk user id. A row exists only for users who
    explicitly asked to be reminded; `unsubscribed_at` soft-disables without
    losing the record. No email is ever sent unless a provider is configured.
    """
    __tablename__ = "notification_prefs"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(String, unique=True, index=True, nullable=False)
    email          = Column(String, nullable=False)
    daily_opt_in   = Column(Boolean, default=True)
    unsubscribed_at = Column(DateTime(timezone=True), nullable=True)
    last_sent_at   = Column(DateTime(timezone=True), nullable=True)
    created_at     = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


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
