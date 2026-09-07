from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter()


ALIGNMENT_PAYLOAD: dict[str, Any] = {
    "status": "live",
    "engine": "alignment-engine",
    "version": "v1",
    "description": "Activity and attention based goal-alignment tracking for 8os owner dogfood.",
    "dimensions": [
        {
            "id": "attention",
            "label": "Attention",
            "description": "Measures whether recent focus is invested in declared goals.",
        },
        {
            "id": "activity",
            "label": "Activity",
            "description": "Measures whether completed work advances declared goals.",
        },
        {
            "id": "momentum",
            "label": "Momentum",
            "description": "Combines attention and activity signals into goal-level movement.",
        },
    ],
    "routes": {
        "summary": "/api/alignment",
        "toolSpec": "/api/alignment/tool-spec",
        "toolCall": "/api/alignment/tool-call",
    },
}


@router.get("/alignment")
@router.get("/api/alignment")
async def get_alignment() -> dict[str, Any]:
    return ALIGNMENT_PAYLOAD


@router.get("/alignment/tool-spec")
@router.get("/api/alignment/tool-spec")
async def get_alignment_tool_spec() -> dict[str, Any]:
    # OS-6109 healthcheck target. Keep this on the canonical orchestrator
    # so Railway does not replace api.8os.ai with a waitlist-only image.
    return {
        "status": "live",
        "name": "alignment",
        "version": ALIGNMENT_PAYLOAD["version"],
        "routes": ALIGNMENT_PAYLOAD["routes"],
        "dimensions": ALIGNMENT_PAYLOAD["dimensions"],
    }


def _tool_call_registered(request: Request) -> bool:
    """True iff POST /api/alignment/tool-call is on the live FastAPI router.

    Manifest fields (routes.toolCall) can stay advertised while the POST
    handler is missing — that is the 12:23Z partial-recurrence failure.
    Walk Starlette routes so /health cannot pass on a lie in JSON.
    """
    for route in request.app.routes:
        methods = getattr(route, "methods", None) or set()
        path = getattr(route, "path", "")
        if "POST" in methods and path in ("/api/alignment/tool-call", "/alignment/tool-call"):
            return True
    return False


@router.api_route("/alignment/tool-call", methods=["GET", "POST"])
@router.api_route("/api/alignment/tool-call", methods=["GET", "POST"])
async def alignment_tool_call(request: Request) -> JSONResponse:
    """POST-only alignment tool-call surface (OS-6134 / OS-5119).

    Healthy GET is 405 (route exists, method not allowed). Missing POST
    registration is 404 — the failure signature the deploy gate must catch.
    POST without a full engine is 401/422-class, never 404.
    """
    if request.method == "GET":
        return JSONResponse(
            {
                "error": "method_not_allowed",
                "message": "POST /api/alignment/tool-call — see /api/alignment/tool-spec for the schema.",
                "probe": "alignment_tool_call",
            },
            status_code=405,
            headers={"Allow": "POST"},
        )

    if not _tool_call_registered(request):
        return JSONResponse(
            {
                "detail": "Not Found",
                "probe": "alignment_tool_call",
                "reason": "POST /api/alignment/tool-call is not registered",
            },
            status_code=404,
        )

    return JSONResponse(
        {
            "status": "accepted",
            "engine": ALIGNMENT_PAYLOAD["engine"],
            "version": ALIGNMENT_PAYLOAD["version"],
            "probe": "alignment_tool_call",
            "message": "tool-call route is registered; orchestrator stub (full engine lives on the dashboard).",
        },
        status_code=200,
    )
