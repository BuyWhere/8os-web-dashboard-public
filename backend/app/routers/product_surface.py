from typing import Any

from fastapi import APIRouter

router = APIRouter()

_PRODUCT_SURFACE_STATUS: dict[str, Any] = {
    "status": "live",
    "surface": "8os-product",
    "version": "v1",
}

_AGENTS = [
    {
        "id": "coach",
        "name": "8os Coach",
        "description": "Daily operating-system coach for priorities, energy, and commitments.",
        "routes": {"summary": "/api/coach"},
    },
    {
        "id": "archie",
        "name": "Archie",
        "description": "OS generator agent for archetype and operating-system scaffolds.",
        "routes": {"generate": "/api/generate", "osConfig": "/os-config/generate"},
    },
]

_TASKS = [
    {
        "id": "daily-review",
        "title": "Daily review",
        "status": "available",
        "description": "Review goals, commitments, and next actions.",
    },
    {
        "id": "capture-inbox",
        "title": "Capture inbox",
        "status": "available",
        "description": "Turn raw notes into commitments and calendar blocks.",
    },
]

_METHODOLOGY = {
    "name": "8OS Methodology",
    "principles": [
        "Know the operator",
        "Choose one meaningful next action",
        "Close the loop with evidence",
    ],
    "loops": ["capture", "prioritize", "commit", "review"],
}


@router.get("/api/agents")
@router.get("/agents")
async def list_agents() -> dict[str, Any]:
    return {**_PRODUCT_SURFACE_STATUS, "agents": _AGENTS}


@router.get("/api/tasks")
@router.get("/tasks")
async def list_tasks() -> dict[str, Any]:
    return {**_PRODUCT_SURFACE_STATUS, "tasks": _TASKS}


@router.get("/api/coach")
@router.get("/coach")
async def get_coach() -> dict[str, Any]:
    return {
        **_PRODUCT_SURFACE_STATUS,
        "coach": {
            "id": "coach",
            "status": "available",
            "capabilities": ["daily_plan", "commitment_review", "energy_check"],
        },
    }


@router.get("/api/calendar")
@router.get("/calendar")
async def get_calendar() -> dict[str, Any]:
    return {
        **_PRODUCT_SURFACE_STATUS,
        "calendar": {
            "status": "available",
            "views": ["today", "week"],
            "items": [],
        },
    }


@router.get("/api/journal")
@router.get("/journal")
async def get_journal() -> dict[str, Any]:
    return {
        **_PRODUCT_SURFACE_STATUS,
        "journal": {
            "status": "available",
            "entries": [],
        },
    }


@router.get("/api/methodology")
@router.get("/methodology")
async def get_methodology() -> dict[str, Any]:
    return {**_PRODUCT_SURFACE_STATUS, "methodology": _METHODOLOGY}


@router.get("/api/onboarding")
@router.get("/onboarding")
async def get_onboarding() -> dict[str, Any]:
    return {
        **_PRODUCT_SURFACE_STATUS,
        "onboarding": {
            "status": "available",
            "steps": ["birth_data", "archetype", "goals", "first_commitment"],
        },
    }


@router.get("/api/generate")
@router.get("/generate")
async def generate_manifest() -> dict[str, Any]:
    return {
        **_PRODUCT_SURFACE_STATUS,
        "generate": {
            "status": "available",
            "method": "POST /os-config/generate",
            "description": "Use the canonical OS config generator for writes.",
        },
    }
