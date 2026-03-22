import os
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from app.services.ai_service import TechnologyInsight

# Ensure PINECONE_API_KEY is in environment variables
# Ensure OPENAI_API_KEY is in environment variables

index_name = "stackradar-insights"
embeddings = OpenAIEmbeddings()

def get_vector_store():
    # Attempt to initialize Pinecone vector store if key is present
    pinecone_key = os.environ.get("PINECONE_API_KEY")
    if not pinecone_key:
        print("Warning: PINECONE_API_KEY not found. Vector search will be disabled.")
        return None
    
    try:
        vectorstore = PineconeVectorStore(
            index_name=index_name,
            embedding=embeddings,
            pinecone_api_key=pinecone_key
        )
        return vectorstore
    except Exception as e:
        print(f"Error initializing Pinecone: {e}")
        return None

async def store_insight_to_vector_db(insight: TechnologyInsight, source_url: str):
    """
    Stores a technology insight into Pinecone vector index for semantic search.
    """
    vectorstore = get_vector_store()
    if not vectorstore:
        return
        
    text_content = f"{insight.technology_name}. Category: {insight.category}. Use case: {insight.use_case}. Architecture: {insight.architecture}. Language: {insight.language}."
    
    metadata = insight.model_dump()
    metadata["source_url"] = source_url
    
    # Store in Pinecone
    vectorstore.add_texts([text_content], metadatas=[metadata])

async def search_semantic_insights(query: str, top_k: int = 5):
    """
    Searches Pinecone for related technology insights using semantic embeddings.
    """
    vectorstore = get_vector_store()
    if not vectorstore:
        return []
        
    results = vectorstore.similarity_search(query, k=top_k)
    return results
