"""
OS-7544 regression test — archetype name overrides must match between
TypeScript (src/lib/archie-engine.ts) and Python (app/archetype_engine.py).

The override lookup uses day_master_romanized (stem, e.g. 'xin') to build
the key, not day_element (e.g. 'metal'). If a Python override is added with
the wrong key format, it will silently never match.
"""

import pytest

from app.archetype_engine import (
    ARCHETYPE_NAME_OVERRIDES,
    generate_archetype,
)


# (date, expected_name) tuples — must match the Next.js test fixtures in
# src/lib/__tests__/archie.test.ts so a TS-side rename propagates here.
KNOWN_ARCHETYPES = [
    # OS-6899 remaining gaps
    ("1988-08-15", "The Current Crown"),     # leo_ren_weak_sg
    ("1985-03-22", "The Clear Charge"),      # aries_geng_balanced_sg
    ("2000-01-01", "The Clay Forge"),        # capricorn_wu_strong_sg
    ("2000-06-15", "The Branch Weave"),      # gemini_jia_weak_sg
    ("2010-06-15", "The Blaze Signal"),      # gemini_bing_strong_sg
    # OS-7451 regression
    ("1990-07-15", "The Crystal Moon"),      # cancer_xin_balanced_sg
    ("2000-11-08", "The Still Phoenix"),     # scorpio_geng_weak_sg
    ("1975-06-20", "The Blaze Signal"),      # gemini_ding_strong_sg
    ("1985-11-20", "The Current Depth"),     # scorpio_gui_strong_sg
    ("1992-03-01", "The Blaze Current"),     # pisces_bing_weak_sg
    ("2005-09-10", "The Precision Lab"),     # virgo_ding_balanced_sg
    ("1989-08-30", "The Crystal Lens"),      # virgo_ren_balanced_sg
]


@pytest.mark.parametrize("birth_date,expected_name", KNOWN_ARCHETYPES)
def test_known_dates_produce_correct_archetype_name(birth_date, expected_name):
    """Mirrors the Next.js OS-6899/OS-7451 fixture tests."""
    result = generate_archetype(birth_date=birth_date, personality_code="sg")
    assert result.archetype_name == expected_name, (
        f"{birth_date}: got {result.archetype_name!r}, want {expected_name!r} "
        f"(archetype_id={result.archetype_id})"
    )


def test_archetype_name_never_contains_undefined():
    """OS-7120 regression: archetype name must never interpolate undefined."""
    from datetime import date, timedelta

    start = date(1960, 1, 1)
    for offset in range(0, 365 * 60, 23):  # 60 years, every 23 days
        d = start + timedelta(days=offset)
        bd = d.strftime("%Y-%m-%d")
        result = generate_archetype(birth_date=bd, personality_code="sg")
        assert "undefined" not in result.archetype_name.lower(), (
            f"{bd} → {result.archetype_name}"
        )
        assert "Unknown" not in result.archetype_name, (
            f"{bd} → {result.archetype_name}"
        )


def test_override_keys_use_romanized_stem_not_element():
    """OS-7544 regression: override keys must be stem-based (xin, geng, etc.).

    If a maintainer accidentally keys an override by day_element (metal,
    wood, etc.), no date will ever match. This test catches that mistake
    statically by checking every override key contains a known stem.
    """
    # Known stems from the BaZi heavenly stems table
    known_stems = {
        "jia", "yi", "bing", "ding", "wu",
        "ji", "geng", "xin", "ren", "gui",
    }
    # day_elements that would indicate the bug
    day_elements = {"wood", "fire", "earth", "metal", "water"}

    for key in ARCHETYPE_NAME_OVERRIDES:
        parts = key.split("_")
        # Key format: sun_sign_daymaster_strength_personality[_hN]
        assert len(parts) >= 4, f"Malformed override key: {key}"
        daymaster = parts[1]
        assert daymaster in known_stems, (
            f"Override key {key!r} uses daymaster={daymaster!r} which is not a "
            f"known stem. Override keys must use the romanized stem (xin, "
            f"geng, etc.), NOT the day element (metal, wood, etc.)."
        )
        assert daymaster not in day_elements, (
            f"Override key {key!r} uses daymaster={daymaster!r} which looks "
            f"like a day element, not a stem. Override keys must use the "
            f"romanized stem."
        )
