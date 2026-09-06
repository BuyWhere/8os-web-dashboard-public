import json
import logging
import logging.config
import time
from contextlib import asynccontextmanager

import httpx
import jwt as pyjwt
import sentry_sdk
from fastapi import Depends, FastAPI, Form, HTTPException, Request, status
from fastapi.responses import JSONResponse, RedirectResponse
from redis.asyncio import Redis
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import Base, engine, get_db_session
from app.dependencies import get_current_user, require_admin
from app.logging_config import LOG_CONFIG
from app.models import User, WaitlistEntry
from app.schemas import (
    AppleExchangeRequest,
    AppleExchangeResponse,
    HealthResponse,
    ReferralCodeResponse,
    ReferralValidateRequest,
    ReferralValidateResponse,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    VerifyRequest,
    WaitlistEntryResponse,
    WaitlistJoinRequest,
    WaitlistJoinResponse,
    WaitlistStatsResponse,
)
from app.services import (
    add_waitlist_entry,
    authenticate_user,
    consume_apple_otc,
    create_apple_otc,
    create_user,
    get_or_create_apple_user,
    get_or_create_referral_code,
    get_user_by_email,
    get_user_by_id,
    get_waitlist_count,
    get_waitlist_entries,
    get_waitlist_without_early_access,
    issue_session,
    mark_early_access_sent,
    record_referral_use,
    validate_referral_code,
)
from app.email import send_early_access_email


settings = get_settings()

# ---------------------------------------------------------------------------
# Rate limiter — Redis-backed, keyed by client IP
# ---------------------------------------------------------------------------
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.redis_url,
    default_limits=["200/minute"],
)


# ---------------------------------------------------------------------------
# Structured JSON logging — stdout → Railway logs
# ---------------------------------------------------------------------------
logging.config.dictConfig(LOG_CONFIG)
logger = logging.getLogger("8os.api")


# ---------------------------------------------------------------------------
# Sentry initialisation
# ---------------------------------------------------------------------------
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
        ],
        send_default_pii=False,
    )
    logger.info(json.dumps({"event": "sentry_initialized", "environment": settings.environment}))


# ---------------------------------------------------------------------------
# Telegram alert helper
# ---------------------------------------------------------------------------
async def _send_telegram_alert(message: str) -> None:
    """Fire-and-forget Telegram message. Silently drops on error."""
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        return
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                url,
                json={"chat_id": settings.telegram_chat_id, "text": message, "parse_mode": "HTML"},
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning(json.dumps({"event": "telegram_alert_failed", "error": str(exc)}))


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    app.state.redis = redis

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # OS-1096: additive migration — add archetype column to waitlist_entries
        # if it doesn't already exist (idempotent). Backfills NULL for existing rows.
        await conn.execute(text(
            "ALTER TABLE waitlist_entries "
            "ADD COLUMN IF NOT EXISTS archetype VARCHAR(64) NULL"
        ))
        # OS-1173: additive migration — add affiliate_opt_in column for the
        # prelaunch /coming-soon landing page (CEO priority, unblocks OS-1086).
        # DEFAULT FALSE keeps historical rows "no affiliate interest"; the
        # coming-soon form flips it on via the Next.js /api/waitlist proxy.
        await conn.execute(text(
            "ALTER TABLE waitlist_entries "
            "ADD COLUMN IF NOT EXISTS affiliate_opt_in BOOLEAN NOT NULL "
            "DEFAULT FALSE"
        ))

    logger.info(json.dumps({
        "event": "startup",
        "environment": settings.environment,
        "jwt_algorithm": settings.jwt_algorithm,
        "jwt_expiration_minutes": settings.jwt_expiration_minutes,
        "sentry_enabled": bool(settings.sentry_dsn),
        "telegram_alerts_enabled": bool(settings.telegram_bot_token and settings.telegram_chat_id),
    }))

    try:
        yield
    finally:
        logger.info(json.dumps({"event": "shutdown"}))
        await redis.aclose()
        await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    description="8os Archetype API — personalized operating system engine",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


# ---------------------------------------------------------------------------
# Performance + alert middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def performance_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000

    logger.info(json.dumps({
        "event": "request",
        "method": request.method,
        "path": request.url.path,
        "status_code": response.status_code,
        "duration_ms": round(elapsed_ms, 2),
    }))

    # 5xx → Telegram alert
    if response.status_code >= 500:
        await _send_telegram_alert(
            f"🚨 <b>5xx Error</b>\n"
            f"<code>{request.method} {request.url.path}</code>\n"
            f"Status: {response.status_code}\n"
            f"Duration: {elapsed_ms:.0f}ms\n"
            f"Env: {settings.environment}"
        )

    # Slow responses → Telegram alert (skip health-check endpoint)
    elif elapsed_ms > settings.slow_response_threshold_ms and request.url.path != "/health":
        await _send_telegram_alert(
            f"⚠️ <b>Slow Response</b>\n"
            f"<code>{request.method} {request.url.path}</code>\n"
            f"Duration: {elapsed_ms:.0f}ms (threshold: {settings.slow_response_threshold_ms}ms)\n"
            f"Status: {response.status_code}\n"
            f"Env: {settings.environment}"
        )

    return response


# ---------------------------------------------------------------------------
# Exception handler
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(json.dumps({
        "event": "unhandled_error",
        "path": str(request.url.path),
        "method": request.method,
        "error": type(exc).__name__,
        "detail": str(exc),
    }))
    if settings.sentry_dsn:
        sentry_sdk.capture_exception(exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
def _tool_call_route_registered(app: FastAPI) -> bool:
    """
    OS-6138: in-process router introspection for POST /api/alignment/tool-call.

    Probes the *route registration*, not the manifest string. The manifest
    is a static literal that has advertised toolCall through every window
    where the route was 404, so probing it is tautological.

    Also avoids the Railway 60s health-check timeout: this is a cheap in-memory
    check with no outbound HTTP.
    """
    for route in app.routes:
        path = getattr(route, "path", None)
        if path != "/api/alignment/tool-call":
            continue
        methods = getattr(route, "methods", None) or set()
        if "POST" in methods:
            return True
    return False


async def _alignment_probe() -> tuple[bool, str]:
    """Return (registered, detail). detail is human-readable for log/response."""
    try:
        if _tool_call_route_registered(app):
            return True, "registered"
        return False, "POST /api/alignment/tool-call not registered in app.routes"
    except Exception as exc:  # noqa: BLE001
        return False, f"probe_error={type(exc).__name__}: {exc}"


async def _ping_database() -> bool:
    """Returns True if the database is reachable, False otherwise."""
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


async def _ping_redis() -> bool:
    """Returns True if Redis is reachable, False otherwise."""
    try:
        await app.state.redis.ping()
        return True
    except Exception:
        return False


async def _build_health_response() -> tuple[HealthResponse, int]:
    """Probe DB, Redis, and the alignment route. Return (response, status_code).

    Status is 200 only if all three probes succeed; otherwise 503 so the
    Railway deploy gate fails the new deploy (OS-6138 acceptance test).
    """
    db_ok = await _ping_database()
    redis_ok = await _ping_redis()
    tool_call_ok, tool_call_detail = await _alignment_probe()

    database = "ok" if db_ok else "error"
    redis_status = "ok" if redis_ok else "error"
    alignment_probe = "ok" if tool_call_ok else "not_registered"

    overall_ok = db_ok and redis_ok and tool_call_ok
    status_text = "ok" if overall_ok else "degraded"

    response = HealthResponse(
        status=status_text,
        database=database,
        redis=redis_status,
        alignment_probe=alignment_probe,
        alignment_probe_detail=None if tool_call_ok else tool_call_detail,
    )
    return response, 200 if overall_ok else 503


@app.get("/health", response_model=HealthResponse)
async def health() -> JSONResponse:
    body, status_code = await _build_health_response()
    # Drop response_model so we can return 503 without it complaining.
    return JSONResponse(content=body.model_dump(), status_code=status_code)


@app.get("/api/health", response_model=HealthResponse)
async def api_health() -> JSONResponse:
    # OS-6138: expose the same probe under the /api/ prefix that Railway's
    # deploy gate hits (api.8os.ai/api/health).
    body, status_code = await _build_health_response()
    return JSONResponse(content=body.model_dump(), status_code=status_code)


@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute;20/hour")
async def register(
    request: Request,
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db_session),
) -> UserResponse:
    try:
        user = await create_user(db, payload.email, payload.password)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already exists",
        ) from exc

    if payload.referral_code:
        await record_referral_use(db, payload.referral_code, user)

    return UserResponse(id=str(user.id), email=user.email)


@app.post("/auth/verify", response_model=TokenResponse)
@limiter.limit("10/minute;50/hour")
async def verify(
    request: Request,
    payload: VerifyRequest,
    db: AsyncSession = Depends(get_db_session),
) -> TokenResponse:
    user = await authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = await issue_session(app.state.redis, user)
    return TokenResponse(access_token=token)


@app.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse(id=str(current_user.id), email=current_user.email)


@app.get("/referral/code", response_model=ReferralCodeResponse)
async def get_referral_code(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> ReferralCodeResponse:
    code = await get_or_create_referral_code(db, current_user)
    return ReferralCodeResponse(code=code, uses=0)


@app.post("/referral/validate", response_model=ReferralValidateResponse)
@limiter.limit("20/minute")
async def validate_referral(
    request: Request,
    payload: ReferralValidateRequest,
    db: AsyncSession = Depends(get_db_session),
) -> ReferralValidateResponse:
    valid, referrer_email = await validate_referral_code(db, payload.code)
    return ReferralValidateResponse(valid=valid, referrer_email=referrer_email)


@app.post("/referral/record", response_model=UserResponse)
async def record_referral(
    payload: ReferralValidateRequest,
    db: AsyncSession = Depends(get_db_session),
) -> UserResponse:
    user = await get_user_by_email(db, payload.code)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral code owner not found",
        )
    await record_referral_use(db, payload.code, user)
    return UserResponse(id=str(user.id), email=user.email)


@app.post("/waitlist/join", response_model=WaitlistJoinResponse)
@limiter.limit("3/minute;10/hour")
async def join_waitlist(
    request: Request,
    payload: WaitlistJoinRequest,
    db: AsyncSession = Depends(get_db_session),
) -> WaitlistJoinResponse:
    # OS-1120 + OS-1173: services.add_waitlist_entry has a hardcoded
    # _ALLOWED_SOURCES whitelist that silently coerces any unknown source to
    # "dashboard", which breaks channel attribution for marketing (OS-1083,
    # OS-1079, OS-1086). Insert WaitlistEntry directly so Reddit/Product Hunt/
    # podcast/coming-soon channels are recorded verbatim. We replicate the
    # small email/source/archetype normalization here intentionally and now
    # also forward the affiliate_opt_in flag the coming-soon landing page
    # captures for OS-1173 + OS-1086.
    source = (payload.source or "").strip().lower()[:64] or "dashboard"
    archetype = (
        payload.archetype.strip().lower()[:64] or None
        if payload.archetype is not None
        else None
    )
    entry = WaitlistEntry(
        email=payload.email.lower()[:254],
        source=source,
        archetype=archetype,
        affiliate_opt_in=bool(payload.affiliate_opt_in),
    )
    db.add(entry)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        # OS-1173: surface duplicate as 409 so the Next.js proxy can map it
        # to a clean "Email already on waitlist" error instead of 500.
        raise HTTPException(status_code=409, detail="Email already on waitlist")
    await db.refresh(entry)
    total = await get_waitlist_count(db)
    return WaitlistJoinResponse(
        success=True,
        message="Successfully joined waitlist",
        position=total,
        total=total,
    )


@app.get("/waitlist/stats", response_model=WaitlistStatsResponse, dependencies=[Depends(require_admin)])
async def get_waitlist_stats(
    db: AsyncSession = Depends(get_db_session),
) -> WaitlistStatsResponse:
    count = await get_waitlist_count(db)
    entries = await get_waitlist_entries(db)
    return WaitlistStatsResponse(
        count=count,
        entries=[
            WaitlistEntryResponse(
                id=str(e.id),
                email=e.email,
                source=e.source,
                archetype=e.archetype,
                affiliate_opt_in=e.affiliate_opt_in,
                early_access_sent=e.early_access_sent,
                created_at=e.created_at,
            )
            for e in entries
        ],
    )


@app.post("/waitlist/send-early-access", dependencies=[Depends(require_admin)])
async def send_early_access(
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    entries = await get_waitlist_without_early_access(db)
    sent_count = 0
    failed_count = 0

    for entry in entries:
        success = await send_early_access_email(entry.email, settings.early_access_url)
        if success:
            await mark_early_access_sent(db, entry.id)
            sent_count += 1
        else:
            failed_count += 1

    return {
        "sent": sent_count,
        "failed": failed_count,
        "remaining": len(entries) - sent_count,
    }


# ---------------------------------------------------------------------------
# Apple Sign-In
# ---------------------------------------------------------------------------
_APPLE_PUBLIC_KEYS_URL = "https://appleid.apple.com/auth/keys"
_APPLE_ISSUER = "https://appleid.apple.com"
# PyJWKClient handles key caching internally.
_apple_jwks_client = pyjwt.PyJWKClient(_APPLE_PUBLIC_KEYS_URL, cache_keys=True)  # type: ignore[attr-defined]


async def _verify_apple_id_token(id_token: str) -> dict:
    """Verify Apple's RS256 identity token and return the decoded claims."""
    if not settings.apple_client_id:
        raise HTTPException(status_code=500, detail="Apple Sign-In not configured")
    try:
        signing_key = _apple_jwks_client.get_signing_key_from_jwt(id_token)
        claims = pyjwt.decode(
            id_token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.apple_client_id,
            issuer=_APPLE_ISSUER,
        )
    except pyjwt.exceptions.PyJWTError as exc:
        logger.warning(json.dumps({"event": "apple_token_invalid", "error": str(exc)}))
        raise HTTPException(status_code=400, detail="Invalid Apple identity token") from exc
    return claims


@app.post("/auth/apple/callback")
@limiter.limit("10/minute")
async def apple_callback(
    request: Request,
    id_token: str = Form(...),
    code: str = Form(...),
    state: str | None = Form(default=None),
    user: str | None = Form(default=None),
    db: AsyncSession = Depends(get_db_session),
) -> RedirectResponse:
    """
    Apple Sign-In server-side callback.

    Apple POSTs here after the user authenticates.  We verify the id_token,
    get-or-create the user, issue a short-lived one-time code (OTC), and
    redirect the browser to the frontend with *only* that opaque code.

    The JWT session token is never placed in a URL — the frontend must call
    POST /auth/apple/exchange to obtain it.
    """
    claims = await _verify_apple_id_token(id_token)
    apple_sub: str = claims["sub"]
    # `email` is present on first sign-in; subsequent sign-ins may omit it.
    email: str | None = claims.get("email")
    if not email and user:
        try:
            user_info = json.loads(user)
            email = user_info.get("email")
        except (ValueError, TypeError):
            pass
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by Apple")

    db_user = await get_or_create_apple_user(db, apple_sub, email)
    otc = await create_apple_otc(app.state.redis, str(db_user.id))

    logger.info(json.dumps({"event": "apple_signin", "user_id": str(db_user.id)}))
    return RedirectResponse(
        f"{settings.frontend_url}/auth/apple/callback?code={otc}",
        status_code=302,
    )


@app.post("/auth/apple/exchange", response_model=AppleExchangeResponse)
@limiter.limit("10/minute")
async def apple_exchange(
    request: Request,
    payload: AppleExchangeRequest,
    db: AsyncSession = Depends(get_db_session),
) -> AppleExchangeResponse:
    """
    Exchange a short-lived Apple Sign-In one-time code for a session JWT.

    The code is single-use and expires in 60 seconds.  The JWT is returned
    in the response body (never in a URL).
    """
    user_id = await consume_apple_otc(app.state.redis, payload.code)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    db_user = await get_user_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    token = await issue_session(app.state.redis, db_user)
    return AppleExchangeResponse(access_token=token)


# ---------------------------------------------------------------------------
# Developer API — v1/archetype
# ---------------------------------------------------------------------------
from pydantic import BaseModel as _BaseModel
from typing import Optional as _Optional
from app.archetype_engine import generate_archetype as _generate_archetype, lookup_archetype as _lookup_archetype


class ArchetypeGenerateRequest(_BaseModel):
    birth_date: str
    """Birth date in YYYY-MM-DD format (required)."""
    birth_time: _Optional[str] = None
    """Birth time in HH:MM 24-hour format (optional — improves accuracy)."""
    birth_location: _Optional[str] = None
    """Birth location string (optional — reserved for future use)."""
    personality_code: str = "sg"
    """Personality code: sg (Systematic Goal) | sp (Systematic Process) | ig (Intuitive Goal) | ip (Intuitive Process). Defaults to 'sg'."""


@app.post(
    "/v1/archetype",
    tags=["Archetype API"],
    summary="Generate a personalized archetype from birth data",
    response_description="The generated archetype and its metadata",
)
@limiter.limit("30/minute;200/hour")
async def generate_archetype_endpoint(
    request: Request,
    payload: ArchetypeGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generate a BaZi-based personal archetype from birth date and optional details.

    Returns the archetype ID, name, description, element, and personality metadata.
    """
    import re

    # Validate birth_date format
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', payload.birth_date):
        raise HTTPException(status_code=422, detail="birth_date must be in YYYY-MM-DD format")

    # Validate birth_time format if provided
    if payload.birth_time and not re.match(r'^\d{2}:\d{2}$', payload.birth_time):
        raise HTTPException(status_code=422, detail="birth_time must be in HH:MM format")

    valid_codes = {"sg", "sp", "ig", "ip"}
    if payload.personality_code not in valid_codes:
        raise HTTPException(
            status_code=422,
            detail=f"personality_code must be one of: {', '.join(sorted(valid_codes))}",
        )

    try:
        result = _generate_archetype(
            birth_date=payload.birth_date,
            birth_time=payload.birth_time,
            personality_code=payload.personality_code,
        )
    except (ValueError, IndexError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return {
        "archetype_id":       result.archetype_id,
        "archetype_name":     result.archetype_name,
        "description":        result.description,
        "sun_sign":           result.sun_sign,
        "day_master":         result.day_master,
        "day_master_romanized": result.day_master_romanized,
        "day_element":        result.day_element,
        "strength":           result.strength,
        "personality_code":   result.personality_code,
        "personality_label":  result.personality_label,
    }


@app.get(
    "/v1/archetype/{archetype_id}",
    tags=["Archetype API"],
    summary="Look up a static archetype definition by ID",
    response_description="The archetype definition and metadata",
)
@limiter.limit("60/minute")
async def get_archetype_definition(
    request: Request,
    archetype_id: str,
):
    """
    Look up the static definition for a given archetype ID.

    No authentication required — archetype definitions are public.

    **archetype_id format:** `{sun_sign}_{day_master_romanized}_{strength}_{personality_code}`

    **Example:** `capricorn_geng_strong_sg`
    """
    definition = _lookup_archetype(archetype_id)
    if definition is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown archetype: '{archetype_id}'. Check sun_sign, day_master, strength, and personality_code values.",
        )
    return definition
