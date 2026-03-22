import meilisearch
from app.core.config import settings

def get_meilisearch_client():
    return meilisearch.Client(settings.MEILISEARCH_HOST, settings.MEILISEARCH_KEY)

def index_repository(repo_data: dict):
    """
    Pushes a processed repository document into Meilisearch.
    Expected dict format:
    {
        "id": "unique-repo-identifier",
        "repository_name": "...",
        "description": "...",
        "language": "...",
        "topics": [...],
        "stars": 123,
        "trend_score": 0.85,
        "tags": [...],
        "source": "github"
    }
    """
    try:
        client = get_meilisearch_client()
        index = client.index('repositories')
        
        # We need a primary key (id) for Meilisearch
        if "id" not in repo_data:
            # Use URL or repository_name as a fallback ID (must be alphanumeric/dash/underscore)
            repo_id = str(repo_data.get("repository_name", "unknown")).replace("/", "_").replace(".", "_")
            repo_data["id"] = repo_id
            
        index.add_documents([repo_data])
        # print(f"Indexed {repo_data.get('repository_name')} in Meilisearch.")
    except Exception as e:
        print(f"Failed to index repository in Meilisearch: {e}")

def index_repositories_batch(repos_data: list[dict]):
    """
    Pushes a batch of repository documents to Meilisearch.
    """
    if not repos_data:
        return
        
    try:
        client = get_meilisearch_client()
        index = client.index('repositories')
        
        # Ensure all docs have an ID
        for doc in repos_data:
            if "id" not in doc:
                repo_id = str(doc.get("repository_name", doc.get("name", "unknown"))).replace("/", "_").replace(".", "_")
                doc["id"] = repo_id
                
        index.add_documents(repos_data)
        print(f"Indexed batch of {len(repos_data)} repositories in Meilisearch.")
    except Exception as e:
        print(f"Failed to index batch in Meilisearch: {e}")
