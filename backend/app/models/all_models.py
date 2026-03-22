from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class Technology(Base):
    __tablename__ = "technologies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    trend_score = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    category = Column(String)
    stage = Column(String, default="Trending")  # Core, Trending, Experimental
    github_count = Column(Integer, default=0)
    hn_count = Column(Integer, default=0)
    devto_count = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    repositories = relationship("Repository", back_populates="technology", cascade="all, delete-orphan")
    articles = relationship("Article", back_populates="technology", cascade="all, delete-orphan")
    roadmap_steps = relationship("RoadmapStep", back_populates="technology", cascade="all, delete-orphan")

class RoadmapStep(Base):
    __tablename__ = "roadmap_steps"
    id = Column(Integer, primary_key=True, index=True)
    technology_id = Column(Integer, ForeignKey("technologies.id"))
    step_number = Column(Integer)
    title = Column(String)
    resource_url = Column(String)
    
    technology = relationship("Technology", back_populates="roadmap_steps")

class TechnologyDomain(Base):
    __tablename__ = "technology_domains"
    id = Column(Integer, primary_key=True, index=True)
    technology_id = Column(Integer, ForeignKey("technologies.id"))
    domain = Column(String, index=True)
    
class TechnologyPrerequisite(Base):
    __tablename__ = "technology_prerequisites"
    id = Column(Integer, primary_key=True, index=True)
    technology_id = Column(Integer, ForeignKey("technologies.id"))
    prerequisite = Column(String)

class TechnologyDifficulty(Base):
    __tablename__ = "technology_difficulty"
    id = Column(Integer, primary_key=True, index=True)
    technology_id = Column(Integer, ForeignKey("technologies.id"), unique=True)
    difficulty = Column(String) # beginner, intermediate, advanced

class TechnologyRole(Base):
    __tablename__ = "technology_roles"
    id = Column(Integer, primary_key=True, index=True)
    technology_id = Column(Integer, ForeignKey("technologies.id"))
    role = Column(String)

class Repository(Base):
    __tablename__ = "repositories"
    id = Column(Integer, primary_key=True, index=True)
    technology_id = Column(Integer, ForeignKey("technologies.id"))
    name = Column(String, index=True)
    stars = Column(Integer, default=0)
    forks = Column(Integer, default=0)
    url = Column(String, unique=True)
    
    technology = relationship("Technology", back_populates="repositories")

class Article(Base):
    __tablename__ = "articles"
    id = Column(Integer, primary_key=True, index=True)
    technology_id = Column(Integer, ForeignKey("technologies.id"))
    title = Column(String)
    source = Column(String, index=True) # "hackernews" or "devto"
    url = Column(String, unique=True, index=True)
    
    technology = relationship("Technology", back_populates="articles")
