from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# bcrypt silently truncates passwords at 72 bytes; cap at 128 chars to prevent
# both the truncation-equality bug and CPU exhaustion from very long inputs.
Password = Annotated[str, Field(min_length=8, max_length=128)]


class RegisterRequest(BaseModel):
    email: EmailStr
    password: Password
    referral_code: str | None = None


class VerifyRequest(BaseModel):
    email: EmailStr
    password: Password


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class HealthResponse(BaseModel):
    status: str
    database: str
    redis: str
    # OS-6138: in-process probe of POST /api/alignment/tool-call route
    # registration. "ok" when registered, "not_registered" when missing.
    # Drives Railway deploy gate via the response status code (200/503).
    alignment_probe: str = "ok"
    alignment_probe_detail: str | None = None


class AppleExchangeRequest(BaseModel):
    code: str = Field(min_length=16, max_length=128)


class AppleExchangeResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# Waitlist schemas
# ---------------------------------------------------------------------------

class WaitlistJoinRequest(BaseModel):
    email: EmailStr
    source: str = "dashboard"
    archetype: str | None = None
    # OS-1173: opt-in for the affiliate-program recruitment list. The
    # coming-soon landing page forwards this; legacy /waitlist/join callers
    # (Next.js proxy, telegram bot) leave it as False.
    affiliate_opt_in: bool = False


class WaitlistJoinResponse(BaseModel):
    success: bool
    message: str
    position: int
    total: int


class WaitlistEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    source: str
    archetype: str | None = None
    affiliate_opt_in: bool
    early_access_sent: bool
    created_at: datetime


class WaitlistStatsResponse(BaseModel):
    count: int
    entries: list[WaitlistEntryResponse]


# ---------------------------------------------------------------------------
# Referral schemas
# ---------------------------------------------------------------------------

class ReferralCodeResponse(BaseModel):
    code: str
    uses: int


class ReferralValidateRequest(BaseModel):
    code: str


class ReferralValidateResponse(BaseModel):
    valid: bool
    referrer_email: str | None = None
