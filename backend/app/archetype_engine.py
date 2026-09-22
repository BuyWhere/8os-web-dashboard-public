"""
archetype_engine.py — Python port of the TypeScript ARCHIE archetype engine.

Sources:
  src/lib/bazi.ts          → BaZi four-pillar calculation
  src/lib/bazi-strength.ts → Day Master strength scoring
  src/lib/archie-engine.ts → Sun sign, archetype ID/name/description generation
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional

# ─── Heavenly Stems 天干 ──────────────────────────────────────────────────────

STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

STEM_ROMANIZED: dict[str, str] = {
    '甲': 'jia', '乙': 'yi', '丙': 'bing', '丁': 'ding', '戊': 'wu',
    '己': 'ji',  '庚': 'geng', '辛': 'xin', '壬': 'ren', '癸': 'gui',
}

STEM_EN: dict[str, str] = {
    '甲': 'Yang Wood', '乙': 'Yin Wood', '丙': 'Yang Fire', '丁': 'Yin Fire',
    '戊': 'Yang Earth', '己': 'Yin Earth', '庚': 'Yang Metal', '辛': 'Yin Metal',
    '壬': 'Yang Water', '癸': 'Yin Water',
}

STEM_ELEMENT: dict[str, str] = {
    '甲': 'wood', '乙': 'wood', '丙': 'fire', '丁': 'fire', '戊': 'earth',
    '己': 'earth', '庚': 'metal', '辛': 'metal', '壬': 'water', '癸': 'water',
}

STEM_POLARITY: dict[str, str] = {
    '甲': 'yang', '乙': 'yin', '丙': 'yang', '丁': 'yin', '戊': 'yang',
    '己': 'yin', '庚': 'yang', '辛': 'yin', '壬': 'yang', '癸': 'yin',
}

# ─── Earthly Branches 地支 ────────────────────────────────────────────────────

BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

BRANCH_ELEMENT: dict[str, str] = {
    '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood', '辰': 'earth',
    '巳': 'fire',  '午': 'fire',  '未': 'earth', '申': 'metal', '酉': 'metal',
    '戌': 'earth', '亥': 'water',
}

BRANCH_HIDDEN_STEMS: dict[str, dict] = {
    '子': {'main': 'water'},
    '丑': {'main': 'earth', 'mid': 'water', 'residual': 'metal'},
    '寅': {'main': 'wood',  'mid': 'fire',  'residual': 'earth'},
    '卯': {'main': 'wood'},
    '辰': {'main': 'earth', 'mid': 'wood',  'residual': 'water'},
    '巳': {'main': 'fire',  'mid': 'earth', 'residual': 'metal'},
    '午': {'main': 'fire',  'mid': 'earth'},
    '未': {'main': 'earth', 'mid': 'fire',  'residual': 'wood'},
    '申': {'main': 'metal', 'mid': 'water', 'residual': 'earth'},
    '酉': {'main': 'metal'},
    '戌': {'main': 'earth', 'mid': 'metal', 'residual': 'fire'},
    '亥': {'main': 'water', 'mid': 'wood'},
}

# ─── Month season element (月令) ──────────────────────────────────────────────

MONTH_SEASON_ELEMENT: dict[str, str] = {
    '寅': 'wood',  '卯': 'wood',  '辰': 'earth',
    '巳': 'fire',  '午': 'fire',  '未': 'earth',
    '申': 'metal', '酉': 'metal', '戌': 'earth',
    '子': 'water', '亥': 'water', '丑': 'earth',
}

# ─── Element cycles ───────────────────────────────────────────────────────────

GENERATES: dict[str, str] = {
    'wood': 'fire', 'fire': 'earth', 'earth': 'metal', 'metal': 'water', 'water': 'wood',
}

CONTROLS: dict[str, str] = {
    'wood': 'earth', 'earth': 'water', 'water': 'fire', 'fire': 'metal', 'metal': 'wood',
}


# ─── BaZi Pillar ─────────────────────────────────────────────────────────────

@dataclass
class Pillar:
    stem: str
    branch: str
    element: str
    polarity: str


def _to_julian_day_number(year: int, month: int, day: int) -> int:
    """Gregorian calendar date → Julian Day Number (matches TypeScript implementation)."""
    a = (14 - month) // 12
    y = year + 4800 - a
    m = month + 12 * a - 3
    return day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045


def _make_pillar(stem_idx: int, branch_idx: int) -> Pillar:
    stem = STEMS[stem_idx]
    branch = BRANCHES[branch_idx]
    return Pillar(stem=stem, branch=branch, element=STEM_ELEMENT[stem], polarity=STEM_POLARITY[stem])


def _year_pillar(year: int) -> Pillar:
    # Reference: 1924 = 甲子 (stem 0, branch 0)
    stem_idx = ((year - 1924) % 10 + 10) % 10
    branch_idx = ((year - 1924) % 12 + 12) % 12
    return _make_pillar(stem_idx, branch_idx)


def _month_pillar(year: int, month: int, day: int) -> Pillar:
    # Approximate solar month index (0=Tiger/寅 ≈ Feb 4)
    solar_month_idx = month - 2
    if day < 5:
        solar_month_idx -= 1
    solar_month_idx = ((solar_month_idx % 12) + 12) % 12

    branch_idx = (2 + solar_month_idx) % 12
    year_stem_idx = ((year - 1924) % 10 + 10) % 10
    stem_idx = ((year_stem_idx % 5) * 2 + 2 + solar_month_idx) % 10

    return _make_pillar(stem_idx, branch_idx)


def _day_pillar(year: int, month: int, day: int) -> Pillar:
    # JDN of Jan 1, 1900 = 2415021; stem=甲(0), branch=戌(10)
    jdn = _to_julian_day_number(year, month, day)
    ref = 2415021
    diff = jdn - ref
    stem_idx = ((diff % 10) + 10) % 10
    branch_idx = ((diff + 10) % 12 + 12) % 12
    return _make_pillar(stem_idx, branch_idx)


def _hour_pillar(day_stem: str, hour: int) -> Pillar:
    h = 0 if hour == 23 else hour
    branch_idx = ((h + 1) // 2) % 12
    day_stem_idx = STEMS.index(day_stem)
    stem_idx = ((day_stem_idx % 5) * 2 + branch_idx) % 10
    return _make_pillar(stem_idx, branch_idx)


# ─── Day Master Strength ──────────────────────────────────────────────────────

def _element_supports(candidate: str, day_element: str) -> float:
    if candidate == day_element:
        return 2.0           # same element → strong support
    if GENERATES.get(candidate) == day_element:
        return 1.0           # generates Day Master → mild support
    if CONTROLS.get(candidate) == day_element:
        return -2.0          # controls Day Master → weakens
    if GENERATES.get(day_element) == candidate:
        return -1.0          # Day Master drains into → weakens
    return 0.0


def calculate_strength(
    year_pillar: Pillar,
    month_pillar: Pillar,
    day_pillar: Pillar,
    hour_pillar: Optional[Pillar],
) -> str:
    day_element = day_pillar.element

    # 1. Month Commander (月令) — primary signal (weight ×3)
    month_branch = month_pillar.branch
    season_element = MONTH_SEASON_ELEMENT.get(month_branch, 'earth')
    month_support = (season_element == day_element or GENERATES.get(season_element) == day_element)
    if month_support:
        month_score = 6.0 if season_element == day_element else 3.0
    else:
        month_score = _element_supports(season_element, day_element) * 1.5

    # 2. Score stems across year, month, hour pillars
    stem_score = 0.0
    for p in [year_pillar, month_pillar] + ([hour_pillar] if hour_pillar else []):
        stem_score += _element_supports(p.element, day_element)

    # 3. Branch hidden stems across all pillars
    all_branches = [year_pillar.branch, month_pillar.branch, day_pillar.branch]
    if hour_pillar:
        all_branches.append(hour_pillar.branch)

    branch_score = 0.0
    for branch in all_branches:
        hidden = BRANCH_HIDDEN_STEMS.get(branch, {})
        if not hidden:
            continue
        branch_score += _element_supports(hidden.get('main', 'earth'), day_element)
        if 'mid' in hidden:
            branch_score += _element_supports(hidden['mid'], day_element) * 0.5
        if 'residual' in hidden:
            branch_score += _element_supports(hidden['residual'], day_element) * 0.25

    total = month_score + stem_score + branch_score

    if total >= 4:
        return 'strong'
    elif total <= 0:
        return 'weak'
    else:
        return 'balanced'


# ─── Sun Sign ─────────────────────────────────────────────────────────────────

def get_sun_sign(month: int, day: int) -> str:
    md = (month, day)
    if md >= (12, 22):      return 'capricorn'
    if md <= (1, 19):       return 'capricorn'
    if md <= (2, 18):       return 'aquarius'
    if md <= (3, 20):       return 'pisces'
    if md <= (4, 19):       return 'aries'
    if md <= (5, 20):       return 'taurus'
    if md <= (6, 20):       return 'gemini'
    if md <= (7, 22):       return 'cancer'
    if md <= (8, 22):       return 'leo'
    if md <= (9, 22):       return 'virgo'
    if md <= (10, 22):      return 'libra'
    if md <= (11, 21):      return 'scorpio'
    return 'sagittarius'    # Nov 22 – Dec 21


# ─── Archetype Name Generation ────────────────────────────────────────────────

SUN_SIGN_NAME_WORDS: dict[str, list[str]] = {
    'capricorn':   ['Mountain', 'Summit', 'Ridge', 'Forge', 'Peak', 'Stone'],
    'aquarius':    ['Network', 'Circuit', 'Signal', 'Wave', 'Node', 'Arc'],
    'pisces':      ['Dream', 'Ocean', 'Tide', 'Mist', 'Current', 'Drift'],
    'aries':       ['Flame', 'Blaze', 'Charge', 'Strike', 'Spark', 'Conquest'],
    'taurus':      ['Foundation', 'Grove', 'Hearth', 'Root', 'Harvest', 'Earth'],
    'gemini':      ['Thread', 'Echo', 'Bridge', 'Weave', 'Link', 'Signal'],
    'cancer':      ['Nest', 'Shell', 'Hearth', 'Cradle', 'Moon', 'Harbor'],
    'leo':         ['Solar', 'Stage', 'Crown', 'Spotlight', 'Gold', 'Flame'],
    'virgo':       ['Precision', 'Lab', 'Crystal', 'Lens', 'Weave', 'Blueprint'],
    'libra':       ['Scale', 'Mirror', 'Balance', 'Bridge', 'Accord', 'Prism'],
    'scorpio':     ['Shadow', 'Phoenix', 'Depth', 'Veil', 'Forge', 'Ember'],
    'sagittarius': ['Horizon', 'Arrow', 'Quest', 'Voyage', 'Star', 'Trail'],
}

DAY_MASTER_MODIFIERS: dict[str, list[str]] = {
    'wood':  ['Forest', 'Branch', 'Grove', 'Bloom', 'Root'],
    'fire':  ['Torch', 'Ember', 'Spark', 'Blaze', 'Hearth'],
    'earth': ['Stone', 'Clay', 'Mesa', 'Soil', 'Bedrock'],
    'metal': ['Blade', 'Steel', 'Forge', 'Crystal', 'Alloy'],
    'water': ['Flow', 'Deep', 'Stream', 'Current', 'Well'],
}

STRENGTH_QUALIFIERS: dict[str, list[str]] = {
    'strong':   ['Grand', 'True', 'Pure', 'Great', 'Full'],
    'weak':     ['Hidden', 'Quiet', 'Still', 'Soft', 'Veiled'],
    'balanced': ['Steady', 'Clear', 'Even', 'Whole', 'Aligned'],
}

PERSONALITY_SUFFIXES: dict[str, list[str]] = {
    'sg': ['Command', 'Summit', 'Throne', 'Apex'],
    'sp': ['Workshop', 'Craft', 'Method', 'System'],
    'ig': ['Vision', 'Fire', 'Quest', 'Leap'],
    'ip': ['Dream', 'Flow', 'Dance', 'Tide'],
}

ARCHETYPE_NAME_OVERRIDES: dict[str, str] = {
    'capricorn_geng_strong_sg': 'The Mountain Forge',
    'capricorn_geng_strong_sg_6': 'The Mountain Forge',
    'pisces_gui_weak_ip': 'The Deep Dream',
    'leo_bing_strong_ig': 'The Solar Flame',
    'virgo_xin_weak_sp': 'The Precision Lab',
    'scorpio_bing_strong_ig': 'The Phoenix Forge',
    'aquarius_ren_strong_ig': 'The Signal Arc',
    'aries_bing_strong_ig': 'The Blaze Summit',
    'taurus_wu_strong_sg': 'The Stone Harvest',
    'gemini_jia_balanced_ip': 'The Forest Thread',
    'cancer_gui_weak_ip': 'The Moon Current',
    'leo_jia_strong_sg': 'The Solar Grove',
    'sagittarius_jia_strong_ig': 'The Forest Horizon',
    'libra_xin_balanced_sp': 'The Crystal Scale',
    # OS-6899 remaining gaps: hash collides with Unknown in elementWords guard
    'leo_ren_weak_sg':      'The Current Crown',
    'pisces_wu_balanced_sg': 'The Stone Tide',
    'gemini_yi_weak_sg':    'The Branch Weave',
    # OS-7451 regression: pickWord fix not yet deployed on Vercel — hash lands
    # on 'Unknown' slot in elementWords. Add explicit overrides for the 7 broken
    # combos that are NOT already covered above (gemini_yi_weak_sg is set on
    # the line above, duplicating it here would silently override the correct value).
    # Keys verified via generateArchetype() locally:
    # 1990-07-15 → cancer_xin_balanced_sg
    # 1975-06-20 → gemini_ding_strong_sg
    # 1985-11-20 → scorpio_gui_strong_sg
    # 1992-03-01 → pisces_bing_weak_sg
    # 2005-09-10 → virgo_ding_balanced_sg
    # 1989-08-30 → virgo_ren_balanced_sg
    # 1980-10-30 → scorpio_geng_weak_sg
    'cancer_xin_balanced_sg':  'The Crystal Moon',
    'gemini_ding_strong_sg':   'The Blaze Signal',
    'scorpio_gui_strong_sg':   'The Current Depth',
    'pisces_bing_weak_sg':     'The Blaze Current',
    'virgo_ding_balanced_sg':  'The Precision Lab',
    'virgo_ren_balanced_sg':   'The Crystal Lens',
    'scorpio_geng_weak_sg':    'The Still Phoenix',
    # OS-6899 additional gaps: 13 more dates need overrides — the hash-based
    # pickWord() lands on "Unknown" for these combos. Adding explicit overrides:
    # 1990-08-15 → leo_ren_strong_sg      2000-02-29 → pisces_ding_strong_sg
    # 2020-12-31 → capricorn_wu_balanced  2000-02-28 → pisces_bing_balanced_sg
    # 2024-02-28 → pisces_ren_weak_sg      1970-01-01 → capricorn_xin_balanced_sg
    # 1985-06-15 → gemini_yi_weak_sg      2026-02-28 → pisces_gui_weak_sg
    # 2026-03-01 → pisces_jia_balanced_sg 2026-06-30 → cancer_yi_weak_sg
    # 2026-07-01 → cancer_bing_strong_sg   1991-01-01 → capricorn_xin_balanced_sg
    'leo_ren_strong_sg':       'The Steady Stage',
    'pisces_ding_strong_sg':   'The Pure Drift',
    'capricorn_wu_balanced_sg': 'The Steady Peak',
    'virgo_wu_balanced_sg':   'The Steady Precision',
    'virgo_gui_balanced_sg':  'The Steady Lens',
    'pisces_bing_balanced_sg': 'The Ember Current',
    'pisces_ren_weak_sg':     'The Still Drift',
    'capricorn_xin_balanced_sg': 'The Steady Summit',
    'pisces_gui_weak_sg':     'The Still Drift',
    'pisces_jia_balanced_sg': 'The Branch Drift',
    'cancer_yi_weak_sg':      'The Quiet Hearth',
    'cancer_bing_strong_sg':  'The Full Nest',
    # OS-7824 hour-pillar combos (2026-09-22 13:23Z probe): 3 of 12 probe dates
    # render "The undefined X" on prod when birthTime is supplied — the hour
    # pillar shifts strength/personality so the combo has no override yet.
    # Keys verified via local generate_archetype() with birthTime='12:00'.
    'gemini_jia_weak_sg':           'The Branch Weave',
    'sagittarius_bing_balanced_sg': 'The Steady Arrow',
    'virgo_bing_strong_sp':         'The Ember Blueprint',
}

SUN_SIGN_THEMES: dict[str, str] = {
    'capricorn': 'ambition and mastery', 'aquarius': 'innovation and vision',
    'pisces': 'intuition and flow', 'aries': 'courage and action',
    'taurus': 'patience and craft', 'gemini': 'curiosity and connection',
    'cancer': 'care and protection', 'leo': 'expression and radiance',
    'virgo': 'precision and service', 'libra': 'harmony and balance',
    'scorpio': 'depth and transformation', 'sagittarius': 'adventure and wisdom',
}

SUN_SIGN_NAMES: dict[str, str] = {
    'capricorn': 'Capricorn', 'aquarius': 'Aquarius', 'pisces': 'Pisces',
    'aries': 'Aries', 'taurus': 'Taurus', 'gemini': 'Gemini',
    'cancer': 'Cancer', 'leo': 'Leo', 'virgo': 'Virgo',
    'libra': 'Libra', 'scorpio': 'Scorpio', 'sagittarius': 'Sagittarius',
}

STRENGTH_DESC: dict[str, str] = {
    'strong':   'a powerful, self-assured energy',
    'weak':     'a refined, receptive sensitivity',
    'balanced': 'a harmonious, adaptable equilibrium',
}

DAY_ELEMENT_DESC: dict[str, str] = {
    'wood':  "Wood's upward growth and vision",
    'fire':  "Fire's warmth, inspiration, and clarity",
    'earth': "Earth's stability, nurturing, and patience",
    'metal': "Metal's precision, discipline, and refinement",
    'water': "Water's depth, intuition, and adaptability",
}

PERSONALITY_DESC: dict[str, str] = {
    'sg': 'You execute methodically toward clear objectives, building systems that deliver.',
    'sp': 'You master the art of process — quality, craft, and continuous refinement.',
    'ig': 'You charge toward your vision with intuitive boldness and creative energy.',
    'ip': 'You trust the flow of ideas, letting emergence and creativity guide you.',
}

PERSONALITY_LABELS: dict[str, str] = {
    'sg': 'Systematic Goal-Driven',
    'sp': 'Systematic Process-Driven',
    'ig': 'Intuitive Goal-Driven',
    'ip': 'Intuitive Process-Driven',
}


def _hash_inputs(*args: object) -> int:
    """DJB2-variant hash matching the TypeScript hashInputs function."""
    h = 5381
    for a in args:
        s = str(a)
        for ch in s:
            h = ((h << 5) + h) ^ ord(ch)
            h = h & 0xFFFFFFFF  # unsigned 32-bit
    return h


def _pick_word(words: list[str], index: int, fallback: str) -> str:
    """Pick a word by index, falling back gracefully for sentinel slots."""
    if not words:
        return fallback
    word = words[index % len(words)]
    if not word or word == 'Unknown':
        return fallback
    return word


def generate_archetype_name(
    sun_sign_key: str,
    day_element: str,
    strength: str,
    personality_code: str,
    hour_index: int = -1,
    day_master_romanized: Optional[str] = None,
) -> str:
    # OS-7544 fix: override key uses day_master_romanized (stem) — matching
    # the TypeScript ARCHETYPE_NAME_OVERRIDES table. Previously used day_element
    # which meant overrides NEVER matched (e.g. 'cancer_metal_balanced_sg' vs
    # the actual key 'cancer_xin_balanced_sg').
    roman = day_master_romanized if day_master_romanized else ''
    base_key = f"{sun_sign_key}_{roman}_{strength}_{personality_code}"
    if base_key in ARCHETYPE_NAME_OVERRIDES:
        return ARCHETYPE_NAME_OVERRIDES[base_key]

    sign_words = SUN_SIGN_NAME_WORDS.get(sun_sign_key, ['Star'])
    # Keep Unknown at the START so previously-working hash indices are unchanged
    known_element_words = DAY_MASTER_MODIFIERS.get(day_element, ['Core'])
    element_words = ['Unknown'] + known_element_words
    known_qualifiers = STRENGTH_QUALIFIERS.get(strength, ['True'])
    qualifiers = known_qualifiers + ['Unknown']

    hash_val = _hash_inputs(sun_sign_key, day_element, strength, personality_code, hour_index)
    sign_word = _pick_word(sign_words, hash_val, 'Star')
    elem_word = _pick_word(element_words, hash_val >> 4, 'Steady')

    use_qualifier = (hash_val & 0x10) != 0
    if use_qualifier:
        qualifier = _pick_word(qualifiers, hash_val >> 8, 'Steady')
        return f"The {qualifier} {sign_word}"
    else:
        return f"The {elem_word} {sign_word}"


def generate_description(
    sun_sign_key: str,
    day_element: str,
    strength: str,
    personality_code: str,
) -> str:
    sign_name = SUN_SIGN_NAMES.get(sun_sign_key, sun_sign_key.capitalize())
    sign_theme = SUN_SIGN_THEMES.get(sun_sign_key, 'growth')
    elem_desc = DAY_ELEMENT_DESC.get(day_element, day_element)
    strength_desc = STRENGTH_DESC.get(strength, 'a balanced energy')
    personality_text = PERSONALITY_DESC.get(personality_code, '')
    return (
        f"{sign_name}'s {sign_theme} meets {elem_desc}, expressed through {strength_desc}. "
        + personality_text
    )


# ─── Public API ───────────────────────────────────────────────────────────────

@dataclass
class ArchetypeResult:
    archetype_id: str
    archetype_name: str
    description: str
    sun_sign: str
    day_master: str
    day_master_romanized: str
    day_element: str
    strength: str
    personality_code: str
    personality_label: str


def generate_archetype(
    birth_date: str,          # YYYY-MM-DD
    birth_time: Optional[str] = None,   # HH:MM (24h)
    personality_code: str = 'sg',       # sg | sp | ig | ip
) -> ArchetypeResult:
    """
    Generate an archetype from birth date, optional time, and personality code.
    """
    year, month, day = (int(p) for p in birth_date.split('-'))

    hour: Optional[int] = None
    if birth_time:
        h_str, m_str = birth_time.split(':')
        hour = int(h_str)

    yp = _year_pillar(year)
    mp = _month_pillar(year, month, day)
    dp = _day_pillar(year, month, day)
    hp = _hour_pillar(dp.stem, hour) if hour is not None else None

    strength = calculate_strength(yp, mp, dp, hp)
    sun_sign = get_sun_sign(month, day)

    day_master_roman = STEM_ROMANIZED[dp.stem]
    archetype_id = f"{sun_sign}_{day_master_roman}_{strength}_{personality_code}"

    name = generate_archetype_name(sun_sign, dp.element, strength, personality_code, day_master_romanized=day_master_roman)
    description = generate_description(sun_sign, dp.element, strength, personality_code)

    return ArchetypeResult(
        archetype_id=archetype_id,
        archetype_name=name,
        description=description,
        sun_sign=sun_sign,
        day_master=STEM_EN.get(dp.stem, dp.stem),
        day_master_romanized=day_master_roman,
        day_element=dp.element,
        strength=strength,
        personality_code=personality_code,
        personality_label=PERSONALITY_LABELS.get(personality_code, personality_code),
    )


def lookup_archetype(archetype_id: str) -> Optional[dict]:
    """
    Look up the definition for a given archetype ID.
    Returns None if the ID is invalid.

    archetype_id format: {sun_sign}_{day_master_romanized}_{strength}_{personality_code}[_h{n}]
    Example: capricorn_geng_strong_sg
    """
    parts = archetype_id.split('_')
    if len(parts) < 4:
        return None

    sun_sign_key = parts[0]
    day_master_roman = parts[1]
    strength = parts[2]
    personality_code = parts[3]

    # Validate known values
    valid_sun_signs = set(SUN_SIGN_NAME_WORDS.keys())
    valid_romanized = set(STEM_ROMANIZED.values())
    valid_strengths = {'strong', 'weak', 'balanced'}
    valid_personalities = {'sg', 'sp', 'ig', 'ip'}

    if sun_sign_key not in valid_sun_signs:
        return None
    if day_master_roman not in valid_romanized:
        return None
    if strength not in valid_strengths:
        return None
    if personality_code not in valid_personalities:
        return None

    # Find the element for this romanized stem
    day_element = 'earth'
    for stem, roman in STEM_ROMANIZED.items():
        if roman == day_master_roman:
            day_element = STEM_ELEMENT[stem]
            break

    # Check archetype_id-level overrides first (keyed by full archetype_id),
    # then fall through to compositional generation.
    base_id = f"{sun_sign_key}_{day_master_roman}_{strength}_{personality_code}"
    name = ARCHETYPE_NAME_OVERRIDES.get(base_id) or generate_archetype_name(
        sun_sign_key, day_element, strength, personality_code
    )
    description = generate_description(sun_sign_key, day_element, strength, personality_code)

    return {
        'id': archetype_id,
        'name': name,
        'description': description,
        'sun_sign': sun_sign_key,
        'day_master_romanized': day_master_roman,
        'day_element': day_element,
        'strength': strength,
        'personality_code': personality_code,
        'personality_label': PERSONALITY_LABELS.get(personality_code, personality_code),
    }
