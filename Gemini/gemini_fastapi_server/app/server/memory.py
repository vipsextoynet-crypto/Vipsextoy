from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.memory import MemoryStore


router = APIRouter(
    prefix="/v1/memory",
    tags=["Memory"],
)


class MemorySaveRequest(BaseModel):
    content: str = Field(..., min_length=1)
    project: str = Field(default="default", min_length=1)
    memory_type: str = Field(default="note", min_length=1)
    importance: int = Field(default=5, ge=1, le=10)
    tags: list[str] = Field(default_factory=list)


class MemorySearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    project: str | None = None
    limit: int = Field(default=10, ge=1, le=50)


class MemorySaveResponse(BaseModel):
    memory: dict[str, Any]


class MemorySearchResponse(BaseModel):
    memories: list[dict[str, Any]]


_store = MemoryStore()


@router.post("/save", response_model=MemorySaveResponse)
async def save_memory(request: MemorySaveRequest):
    try:
        memory = _store.save(
            content=request.content,
            project=request.project,
            memory_type=request.memory_type,
            importance=request.importance,
            tags=request.tags,
        )

        return MemorySaveResponse(memory=memory)

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save memory: {exc}",
        ) from exc


@router.post("/search", response_model=MemorySearchResponse)
async def search_memory(request: MemorySearchRequest):
    try:
        memories = _store.search(
            query=request.query,
            project=request.project,
            limit=request.limit,
        )

        return MemorySearchResponse(memories=memories)

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search memory: {exc}",
        ) from exc