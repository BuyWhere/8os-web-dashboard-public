import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _uuid_str() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "app8os_users"  # renamed 2026-07-13: this DB is SHARED with cal.com whose `users` (integer ids) blocked our create_all (referral_codes FK DatatypeMismatch -> startup crash)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    apple_sub: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class WaitlistEntry(Base):
    __tablename__ = "waitlist_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    source: Mapped[str] = mapped_column(String(64), default="dashboard")
    archetype: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # OS-1173: prelaunch landing page opt-in. Defaults to False so existing
    # /waitlist/join callers (Next.js proxy, telegram bot, dashboard) keep
    # the historical "no affiliate interest" semantics; the coming-soon form
    # flips it on when the visitor checks the box.
    affiliate_opt_in: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    early_access_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ReferralCode(Base):
    __tablename__ = "referral_codes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("app8os_users.id", ondelete="CASCADE"))
    uses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
