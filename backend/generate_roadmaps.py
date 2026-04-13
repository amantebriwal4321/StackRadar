"""
Generate tool-specific learning roadmaps using Groq LLM (llama-3.1-8b-instant).

For each tool in the database that doesn't already have a tool-specific roadmap,
this script generates a structured 5-6 step learning path and saves it to the DB.

Usage:
  cd backend
  .\.venv\Scripts\activate
  python generate_roadmaps.py
"""

import json
import logging
import time
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(__file__))

from groq import Groq
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models.all_models import Tool, ToolRoadmap

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("generate_roadmaps")


PROMPT_TEMPLATE = """You are a senior developer creating a structured learning roadmap for the tool "{tool_name}".

Context: {tool_description}
Category: {tool_category}

Create a learning roadmap with exactly 5 steps. Each step should progress from beginner to advanced.

Reply ONLY with valid JSON (no markdown, no explanation):
{{
  "title": "Learning {tool_name}",
  "description": "A short 1-sentence description of this roadmap",
  "estimated_weeks": <number between 4 and 16>,
  "steps": [
    {{
      "step": 1,
      "title": "<Step title>",
      "level": "Beginner",
      "description": "<2-3 sentence description of what you'll learn>",
      "resources": [
        {{"label": "<Resource name>", "url": "<real working URL>"}},
        {{"label": "<Resource name>", "url": "<real working URL>"}}
      ]
    }},
    {{
      "step": 2,
      "title": "<Step title>",
      "level": "Beginner",
      "description": "<2-3 sentences>",
      "resources": [{{"label": "...", "url": "..."}}, {{"label": "...", "url": "..."}}]
    }},
    {{
      "step": 3,
      "title": "<Step title>",
      "level": "Intermediate",
      "description": "<2-3 sentences>",
      "resources": [{{"label": "...", "url": "..."}}, {{"label": "...", "url": "..."}}]
    }},
    {{
      "step": 4,
      "title": "<Step title>",
      "level": "Intermediate",
      "description": "<2-3 sentences>",
      "resources": [{{"label": "...", "url": "..."}}, {{"label": "...", "url": "..."}}]
    }},
    {{
      "step": 5,
      "title": "<Step title>",
      "level": "Advanced",
      "description": "<2-3 sentences>",
      "resources": [{{"label": "...", "url": "..."}}, {{"label": "...", "url": "..."}}]
    }}
  ]
}}

Rules:
- Use ONLY real, working URLs (official docs, GitHub repos, tutorials)
- Make steps specific to {tool_name}, not generic programming
- Step 1 should assume the learner knows basic programming but is new to {tool_name}
- Step 5 should cover advanced/production topics
- Keep descriptions concise but actionable"""


def generate_roadmap_for_tool(client: Groq, tool: Tool) -> dict | None:
    """Generate a single tool roadmap via Groq LLM."""

    prompt = PROMPT_TEMPLATE.format(
        tool_name=tool.name,
        tool_description=tool.description or "A popular developer tool.",
        tool_category=tool.category or "Technology",
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2048,
        )

        raw = response.choices[0].message.content.strip()

        # Extract JSON from possible markdown code blocks
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        data = json.loads(raw)
        return data

    except json.JSONDecodeError as e:
        logger.error(f"  JSON parse error for {tool.name}: {e}")
        logger.error(f"  Raw response: {raw[:200]}...")
        return None
    except Exception as e:
        logger.error(f"  API error for {tool.name}: {e}")
        return None


def main():
    """Main entry point."""

    if not settings.GROQ_API_KEY:
        logger.error("GROQ_API_KEY not set in .env — cannot generate roadmaps.")
        sys.exit(1)

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    client = Groq(api_key=settings.GROQ_API_KEY)
    db = SessionLocal()

    try:
        tools = db.query(Tool).order_by(Tool.name).all()
        logger.info(f"Found {len(tools)} tools in database.")

        generated = 0
        skipped = 0

        for tool in tools:
            # Check if a tool-specific roadmap already exists (slug = tool.slug)
            existing = db.query(ToolRoadmap).filter(
                ToolRoadmap.slug == tool.slug
            ).first()

            if existing:
                logger.info(f"  ✓ {tool.name} — already has roadmap, skipping")
                skipped += 1
                continue

            logger.info(f"  🔄 Generating roadmap for {tool.name}...")

            data = generate_roadmap_for_tool(client, tool)

            if not data:
                logger.warning(f"  ✗ Failed to generate roadmap for {tool.name}")
                continue

            # Create the roadmap record
            roadmap = ToolRoadmap(
                tool_id=tool.id,
                slug=tool.slug,  # Tool-specific slug (e.g., "react", "docker")
                title=data.get("title", f"Learning {tool.name}"),
                description=data.get("description", f"A structured learning path for {tool.name}."),
                icon=tool.icon or "📘",
                estimated_weeks=data.get("estimated_weeks", 8),
                steps_json=json.dumps(data.get("steps", [])),
            )
            db.add(roadmap)
            db.flush()

            generated += 1
            logger.info(f"  ✅ {tool.name} — roadmap created ({len(data.get('steps', []))} steps, {data.get('estimated_weeks', '?')} weeks)")

            # Respect rate limits — wait between calls
            time.sleep(3)

        db.commit()
        logger.info(f"\n{'='*50}")
        logger.info(f"DONE: Generated {generated} new roadmaps, skipped {skipped}")
        logger.info(f"{'='*50}")

    except Exception as e:
        db.rollback()
        logger.error(f"Fatal error: {e}", exc_info=True)
    finally:
        db.close()


if __name__ == "__main__":
    main()
