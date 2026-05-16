import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.all_models import Tool, ToolSnapshot, Domain
from app.services.scoring import calculate_all_tool_scores, classify_trend, generate_recommendation, classify_learning_priority, classify_growth_stage

db = SessionLocal()

all_tools = db.query(Tool).all()
tool_signals = []
for t in all_tools:
    tool_signals.append({
        "stars": t.stars or 0,
        "forks": t.forks or 0,
        "hn_count": t.hn_count or 0,
        "devto_count": t.devto_count or 0,
        "reddit_count": t.reddit_count or 0,
        "news_count": t.news_count or 0,
        "mention_count": t.mention_count or 0
    })

all_scores = calculate_all_tool_scores(tool_signals)

for i, tool in enumerate(all_tools):
    new_score = all_scores[i]
    tool.score = new_score
    tool.growth_pct = 0.0
    trend_stage = classify_trend(0.0)
    tool.trend_stage = trend_stage
    tool.learning_priority = classify_learning_priority(trend_stage)
    tool.stage = classify_growth_stage(new_score)
    tool.recommendation = generate_recommendation(tool.name, trend_stage, new_score)
    print(f"{tool.name}: {new_score} | Stage: {tool.stage}")

db.commit()

domains = db.query(Domain).all()
for domain in domains:
    domain_tools = [t for t in all_tools if t.domain_id == domain.id]
    if domain_tools:
        domain.score = round(sum(t.score for t in domain_tools) / len(domain_tools), 1)
db.commit()
print("Done!")
db.close()
