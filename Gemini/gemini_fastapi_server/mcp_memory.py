import httpx
from mcp.server.fastmcp import FastMCP

server = FastMCP("vipsextoy-memory")

API = "http://127.0.0.1:8000/v1/memory"


@server.tool()
async def save_memory(
    content: str,
    project: str = "vipsextoy",
    memory_type: str = "note",
    importance: int = 5,
    tags: list[str] | None = None,
) -> str:
    """Save information to persistent LMDB memory."""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API}/save",
            json={
                "content": content,
                "project": project,
                "memory_type": memory_type,
                "importance": importance,
                "tags": tags or [],
            },
            timeout=30,
        )

    response.raise_for_status()
    return response.text


@server.tool()
async def search_memory(
    query: str,
    project: str = "vipsextoy",
    limit: int = 10,
) -> str:
    """Search persistent LMDB memory."""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API}/search",
            json={
                "query": query,
                "project": project,
                "limit": limit,
            },
            timeout=30,
        )

    response.raise_for_status()
    return response.text


if __name__ == "__main__":
    server.run(transport="stdio")