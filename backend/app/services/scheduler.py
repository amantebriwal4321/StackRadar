import asyncio
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.all_models import Technology, Repository, Article, RoadmapStep, TechnologyDomain, TechnologyDifficulty, TechnologyPrerequisite, TechnologyRole
from app.services.scraper import fetch_github_repos, fetch_hackernews, fetch_devto
from app.services.scoring import calculate_trend_score, extract_technologies, get_category_for_tech
from app.core.config import settings

logger = logging.getLogger(__name__)

scrape_status = {
    "last_scraped_time": None,
    "next_scraped_time": None
}

async def run_scraper_loop():
    while True:
        logger.info("Starting background scraper loop...")
        try:
            await perform_scraping()
            scrape_status["last_scraped_time"] = datetime.now(timezone.utc).isoformat()
            scrape_status["next_scraped_time"] = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
            logger.info("Scraping completed. Sleeping for 30 minutes.")
        except Exception as e:
            logger.error(f"Error in scraper loop: {e}")
        
        await asyncio.sleep(1800) # 30 minutes

async def perform_scraping():
    db: Session = SessionLocal()
    try:
        # Fetch raw data
        hn_stories_data = await fetch_hackernews()
        devto_articles_data = await fetch_devto()
        
        # Define target technologies to scrape explicitly
        from app.services.scoring import get_emerging_tech_dict
        emerging_techs = list(get_emerging_tech_dict().values())
        
        tech_mentions = {t: {"github": [], "hn": [], "devto": []} for t in emerging_techs}
        
        # 1. Fetch GitHub explicitly for each targeted emerging tech
        for tech_name in emerging_techs:
            try:
                repos = await fetch_github_repos(settings.GITHUB_TOKEN, tech_name.lower())
                tech_mentions[tech_name]["github"] = repos
            except Exception as e:
                logger.error(f"Error fetching github repos for {tech_name}: {e}")
            await asyncio.sleep(1) # prevent API rate limits
                
        # Process HN
        for s in hn_stories_data:
            title = s.get("title", "")
            techs = extract_technologies(title)
            for t in techs:
                if t in tech_mentions:
                    tech_mentions[t]["hn"].append(s)
                
        # Process Dev.to
        for a in devto_articles_data:
            title = a.get("title", "")
            techs = extract_technologies(title)
            for t in techs:
                if t in tech_mentions:
                    tech_mentions[t]["devto"].append(a)
                
        # Now update database
        for tech_name, data in tech_mentions.items():
            gh_count = len(data["github"])
            hn_count = len(data["hn"])
            dev_count = len(data["devto"])
            
            momentum_score = calculate_trend_score(gh_count, hn_count, dev_count)
            category = get_category_for_tech(tech_name)
            
            # Upsert Technology
            tech = db.query(Technology).filter(Technology.name == tech_name).first()
            if not tech:
                # Try to get a real description from the highest starred repo
                sorted_repos_desc = sorted(data["github"], key=lambda x: x.get("stargazers_count", 0), reverse=True)
                github_desc = sorted_repos_desc[0].get("description", "") if sorted_repos_desc else ""
                if not github_desc:
                    github_desc = f"A trending {category} tool observed across GitHub, HackerNews, and Dev.to."
                    
                tech = Technology(
                    name=tech_name, 
                    description=github_desc[:300] if github_desc else ""
                )
                db.add(tech)
                db.flush()
                
            tech.trend_score = momentum_score
            tech.category = category
            tech.github_count = gh_count
            tech.hn_count = hn_count
            tech.devto_count = dev_count
            tech.updated_at = datetime.now(timezone.utc)
            
            
            # Upsert Repositories (limit to top 5 per tech to save space)
            # Sort raw dict by stars
            sorted_repos = sorted(data["github"], key=lambda x: x.get("stargazers_count", 0), reverse=True)
            for r_data in sorted_repos[:5]:
                repo_url = r_data.get("html_url")
                repo = db.query(Repository).filter(Repository.url == repo_url).first()
                if not repo:
                    repo = Repository(
                        technology_id=tech.id,
                        name=r_data.get("full_name"),
                        stars=r_data.get("stargazers_count", 0),
                        forks=r_data.get("forks_count", 0),
                        url=repo_url
                    )
                    db.add(repo)
                else:
                    repo.stars = r_data.get("stargazers_count", 0)
                    repo.forks = r_data.get("forks_count", 0)
            
            # Upsert HN Articles (Top 5)
            for s_data in data["hn"][:5]:
                url = s_data.get("url") or f"https://news.ycombinator.com/item?id={s_data.get('id')}"
                article = db.query(Article).filter(Article.url == url).first()
                if not article:
                    article = Article(
                        technology_id=tech.id,
                        title=s_data.get("title"),
                        source="hackernews",
                        url=url
                    )
                    db.add(article)
                    
            # Upsert Dev.to Articles (Top 5)
            for a_data in data["devto"][:5]:
                url = a_data.get("url")
                article = db.query(Article).filter(Article.url == url).first()
                if not article:
                    article = Article(
                        technology_id=tech.id,
                        title=a_data.get("title"),
                        source="devto",
                        url=url
                    )
                    db.add(article)

            # Generate default Roadmap Steps using official documentation
            existing_roadmap = db.query(RoadmapStep).filter(RoadmapStep.technology_id == tech.id).first()
            if not existing_roadmap:
                generate_official_roadmap(db, tech)

            # Generate Career Signals (Domains, Difficulty, Prerequisites)
            generate_career_signals(db, tech)

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"DB Upsert Error in perform_scraping: {e}")
    finally:
        db.close()

def generate_official_roadmap(db: Session, tech: Technology):
    """Seed the database with direct, official documentation roadmaps."""
    
    # Define exact official URLs
    docs = {
        "LangGraph": "https://langchain-ai.github.io/langgraph/",
        "CrewAI": "https://docs.crewai.com/",
        "Ollama": "https://github.com/ollama/ollama/tree/main/docs",
        "AutoGPT": "https://docs.agpt.co/",
        "LlamaIndex": "https://docs.llamaindex.ai/",
        "Supabase": "https://supabase.com/docs",
        "Qdrant": "https://qdrant.tech/documentation/",
        "Weaviate": "https://weaviate.io/developers/weaviate",
        "Chroma": "https://docs.trychroma.com/",
        "Bun": "https://bun.sh/docs",
        "Astro": "https://docs.astro.build/",
        "SvelteKit": "https://kit.svelte.dev/docs/introduction",
        "HTMX": "https://htmx.org/docs/",
        "TRPC": "https://trpc.io/docs",
        "Vite": "https://vitejs.dev/guide/",
        "Turborepo": "https://turbo.build/repo/docs"
    }
    
    official_url = docs.get(tech.name, f"https://roadmap.sh/{tech.name.lower()}")
    
    steps = [
        RoadmapStep(technology_id=tech.id, step_number=1, title=f"Install and Configure {tech.name}", resource_url=f"{official_url}"),
        RoadmapStep(technology_id=tech.id, step_number=2, title=f"Read the Core Concepts", resource_url=f"{official_url}"),
        RoadmapStep(technology_id=tech.id, step_number=3, title=f"Follow the 'Getting Started' Tutorial", resource_url=f"{official_url}"),
        RoadmapStep(technology_id=tech.id, step_number=4, title=f"Explore the API Reference", resource_url=f"{official_url}"),
        RoadmapStep(technology_id=tech.id, step_number=5, title=f"Build your first {tech.category} app", resource_url=f"{official_url}"),
    ]
    db.add_all(steps)

def generate_career_signals(db: Session, tech: Technology):
    """Seed the database with Domains, Difficulty, and Prerequisites for the Career Signal Engine."""
    
    # 1. Domain Mapping
    domain = db.query(TechnologyDomain).filter(TechnologyDomain.technology_id == tech.id, TechnologyDomain.domain == tech.category).first()
    if not domain and tech.category:
        db.add(TechnologyDomain(technology_id=tech.id, domain=tech.category))
        
    # 2. Difficulty Mapping
    difficulty = db.query(TechnologyDifficulty).filter(TechnologyDifficulty.technology_id == tech.id).first()
    if not difficulty:
        # Simple heuristic based on category
        diff = "intermediate"
        if tech.category == "AI / LLM" or tech.category == "Cloud / Infrastructure":
            diff = "advanced"
        elif tech.category == "Web Development":
            diff = "beginner"
            
        db.add(TechnologyDifficulty(technology_id=tech.id, difficulty=diff))
        
    # 3. Prerequisites Mapping
    prereq = db.query(TechnologyPrerequisite).filter(TechnologyPrerequisite.technology_id == tech.id).first()
    if not prereq:
        if tech.category == "AI / LLM":
            db.add(TechnologyPrerequisite(technology_id=tech.id, prerequisite="Python"))
            db.add(TechnologyPrerequisite(technology_id=tech.id, prerequisite="LLM Fundamentals"))
        elif tech.category == "Web Development":
            db.add(TechnologyPrerequisite(technology_id=tech.id, prerequisite="JavaScript / TypeScript"))
            db.add(TechnologyPrerequisite(technology_id=tech.id, prerequisite="React Basics"))
        elif tech.category == "Databases":
            db.add(TechnologyPrerequisite(technology_id=tech.id, prerequisite="SQL / NoSQL Knowledge"))
        elif tech.category == "Cloud / Infrastructure":
            db.add(TechnologyPrerequisite(technology_id=tech.id, prerequisite="Docker OS Fundamentals"))
        else:
            db.add(TechnologyPrerequisite(technology_id=tech.id, prerequisite="Software Engineering Basics"))

    # 4. Roles Mapping
    roles = db.query(TechnologyRole).filter(TechnologyRole.technology_id == tech.id).all()
    if not roles:
        if tech.category == "AI / LLM":
            db.add(TechnologyRole(technology_id=tech.id, role="AI Engineer"))
            db.add(TechnologyRole(technology_id=tech.id, role="Data Scientist"))
        elif tech.category == "Web Development":
            db.add(TechnologyRole(technology_id=tech.id, role="Web Developer"))
            db.add(TechnologyRole(technology_id=tech.id, role="Frontend Engineer"))
        elif tech.category == "Backend Systems" or tech.category == "Databases":
            db.add(TechnologyRole(technology_id=tech.id, role="Backend Developer"))
            db.add(TechnologyRole(technology_id=tech.id, role="Data Engineer"))
        elif tech.category == "Cloud / Infrastructure" or tech.category == "DevOps":
            db.add(TechnologyRole(technology_id=tech.id, role="DevOps Engineer"))
        else:
            db.add(TechnologyRole(technology_id=tech.id, role="Software Engineer"))
            
    # 5. Stage Mapping
    if tech.name in ["CrewAI", "AutoGPT", "Chroma"]:
        tech.stage = "Experimental"
    else:
        tech.stage = "Trending"
