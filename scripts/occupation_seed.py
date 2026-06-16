"""Curated occupation seed + derivation logic.

This module is the single source of truth shared by
``generate_sample_data.py`` (stdlib-only JSON export) and
``build_dataset.py`` (pandas/parquet export). It contains:

  * A curated table of ~55 real detailed SOC occupations with
    publicly-known, approximate BLS OEWS / Employment-Projections figures
    (employment, median wage, typical education, 10-yr growth).
  * Per-occupation *task-composition weights* that drive a transparent,
    methodology-based AI-exposure model rather than hand-picked scores.
  * Deterministic derivation of wage percentiles, skills, knowledge areas,
    AI exposure/augmentation/automation, and a narrative summary.

The numbers are representative and intended for visualisation/portfolio
use. Run the live ETL (``fetch_bls.py`` + ``build_dataset.py``) with API
credentials to replace them with the latest official releases.
"""
from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass, field
from typing import Sequence

from config import EDUCATION_LEVELS, exposure_band, major_group_title

# Task-composition weights, each 0–1, describing how much of the job is:
#   info  – information processing, analysis, reading/writing, coding
#   routine – predictable, rule-based, repetitive steps
#   manual – physical / hands-on / on-site work
#   social – interpersonal, care, negotiation, management of people
# These mirror the spirit of O*NET work-activity importance ratings and are
# the only per-occupation "judgement" inputs to the exposure model.


@dataclass(frozen=True)
class Seed:
    soc: str
    title: str
    employment: int          # total US employment (persons)
    median_wage: int         # annual median wage (USD)
    education: str           # one of config.EDUCATION_LEVELS
    growth_pct: float        # projected 2024–2034 percent change
    info: float
    routine: float
    manual: float
    social: float
    description: str = ""
    skills: tuple[str, ...] = field(default_factory=tuple)
    knowledge: tuple[str, ...] = field(default_factory=tuple)


B = "Bachelor's degree"
HS = "High school diploma or equivalent"
NF = "No formal educational credential"
AS = "Associate's degree"
MS = "Master's degree"
DOC = "Doctoral or professional degree"
PND = "Postsecondary nondegree award"
SC = "Some college, no degree"

# fmt: off
SEEDS: list[Seed] = [
    Seed("15-1252", "Software Developers", 1656880, 132270, B, 17.9, .95, .35, .05, .45,
         "Design, build, and maintain computer applications and systems.",
         ("Programming", "Complex Problem Solving", "Systems Analysis", "Critical Thinking"),
         ("Computers and Electronics", "Engineering and Technology", "Mathematics")),
    Seed("15-1211", "Computer Systems Analysts", 526600, 103800, B, 10.0, .9, .4, .05, .55,
         "Analyse data-processing problems to improve computer systems.",
         ("Systems Analysis", "Critical Thinking", "Active Listening"),
         ("Computers and Electronics", "Mathematics", "Administration and Management")),
    Seed("15-1244", "Network and Computer Systems Administrators", 333200, 95360, B, 2.3, .8, .55, .2, .45,
         "Install, configure, and support an organisation's networks.",
         ("Troubleshooting", "Systems Administration", "Critical Thinking"),
         ("Computers and Electronics", "Telecommunications", "Engineering and Technology")),
    Seed("15-1232", "Computer User Support Specialists", 706300, 60810, SC, 6.0, .7, .55, .15, .6,
         "Provide technical help to computer users.",
         ("Active Listening", "Troubleshooting", "Service Orientation"),
         ("Computers and Electronics", "Customer and Personal Service")),
    Seed("15-2051", "Data Scientists", 202900, 108020, B, 35.2, .98, .3, .03, .4,
         "Develop models and extract insight from large datasets.",
         ("Programming", "Mathematics", "Complex Problem Solving", "Systems Analysis"),
         ("Mathematics", "Computers and Electronics", "Engineering and Technology")),
    Seed("13-2011", "Accountants and Auditors", 1538400, 79880, B, 5.6, .85, .65, .05, .4,
         "Prepare and examine financial records for accuracy and compliance.",
         ("Mathematics", "Critical Thinking", "Active Listening"),
         ("Economics and Accounting", "Mathematics", "Law and Government")),
    Seed("13-2051", "Financial and Investment Analysts", 327100, 99890, B, 9.0, .92, .45, .03, .5,
         "Evaluate investment opportunities and financial performance.",
         ("Critical Thinking", "Mathematics", "Judgment and Decision Making"),
         ("Economics and Accounting", "Mathematics", "Administration and Management")),
    Seed("13-1111", "Management Analysts", 1003000, 99410, B, 11.0, .9, .35, .05, .6,
         "Recommend ways to improve organisational efficiency.",
         ("Critical Thinking", "Complex Problem Solving", "Active Listening"),
         ("Administration and Management", "Economics and Accounting")),
    Seed("11-1021", "General and Operations Managers", 3507810, 101280, B, 4.2, .7, .35, .1, .85,
         "Plan and direct the operations of organisations.",
         ("Management of Personnel Resources", "Coordination", "Judgment and Decision Making"),
         ("Administration and Management", "Customer and Personal Service")),
    Seed("11-3021", "Computer and Information Systems Managers", 592600, 169510, B, 17.4, .85, .3, .05, .8,
         "Plan and direct computer-related activities in an organisation.",
         ("Management of Personnel Resources", "Systems Analysis", "Coordination"),
         ("Computers and Electronics", "Administration and Management")),
    Seed("11-2021", "Marketing Managers", 396300, 157620, B, 7.0, .8, .3, .05, .8,
         "Plan programmes to generate interest in products or services.",
         ("Persuasion", "Coordination", "Complex Problem Solving"),
         ("Sales and Marketing", "Communications and Media", "English Language")),
    Seed("29-1141", "Registered Nurses", 3300280, 86070, B, 6.0, .55, .35, .65, .85,
         "Coordinate and provide patient care in clinical settings.",
         ("Active Listening", "Service Orientation", "Critical Thinking"),
         ("Medicine and Dentistry", "Psychology", "Customer and Personal Service")),
    Seed("29-1215", "Family Medicine Physicians", 121300, 224640, DOC, 3.6, .8, .3, .55, .8,
         "Diagnose and treat a broad range of patient conditions.",
         ("Critical Thinking", "Active Listening", "Judgment and Decision Making"),
         ("Medicine and Dentistry", "Biology", "Psychology")),
    Seed("29-2061", "Licensed Practical and Vocational Nurses", 630250, 59730, PND, 3.3, .5, .45, .6, .75,
         "Provide basic nursing care under supervision.",
         ("Service Orientation", "Active Listening", "Monitoring"),
         ("Medicine and Dentistry", "Customer and Personal Service")),
    Seed("31-1131", "Nursing Assistants", 1361700, 38130, PND, 4.0, .25, .5, .75, .7,
         "Provide basic patient care under nursing staff direction.",
         ("Service Orientation", "Active Listening", "Social Perceptiveness"),
         ("Customer and Personal Service", "Medicine and Dentistry")),
    Seed("29-1123", "Physical Therapists", 235800, 99710, DOC, 14.0, .6, .3, .7, .85,
         "Help injured or ill people improve movement and manage pain.",
         ("Active Listening", "Service Orientation", "Critical Thinking"),
         ("Therapy and Counseling", "Medicine and Dentistry", "Psychology")),
    Seed("25-2021", "Elementary School Teachers", 1437400, 63680, B, 0.7, .55, .35, .25, .9,
         "Teach academic and social skills to elementary students.",
         ("Instructing", "Learning Strategies", "Active Listening"),
         ("Education and Training", "English Language", "Psychology")),
    Seed("25-1099", "Postsecondary Teachers", 1351600, 84380, DOC, 8.0, .8, .25, .15, .8,
         "Instruct students in academic or technical subjects beyond high school.",
         ("Instructing", "Speaking", "Critical Thinking"),
         ("Education and Training", "English Language")),
    Seed("23-1011", "Lawyers", 731340, 145760, DOC, 5.2, .92, .35, .05, .7,
         "Advise and represent clients on legal matters.",
         ("Critical Thinking", "Persuasion", "Active Listening", "Complex Problem Solving"),
         ("Law and Government", "English Language", "Administration and Management")),
    Seed("23-2011", "Paralegals and Legal Assistants", 367400, 60970, AS, 1.2, .85, .6, .05, .45,
         "Support lawyers by researching and preparing documents.",
         ("Reading Comprehension", "Writing", "Active Listening"),
         ("Law and Government", "English Language", "Clerical")),
    Seed("43-6014", "Secretaries and Administrative Assistants", 3220000, 44280, HS, -8.0, .65, .8, .1, .55,
         "Perform routine clerical and administrative duties.",
         ("Active Listening", "Time Management", "Coordination"),
         ("Clerical", "Customer and Personal Service", "English Language")),
    Seed("43-3031", "Bookkeeping and Accounting Clerks", 1551700, 47440, SC, -5.0, .75, .85, .05, .35,
         "Produce financial records and verify accuracy of figures.",
         ("Mathematics", "Active Listening", "Monitoring"),
         ("Economics and Accounting", "Clerical", "Mathematics")),
    Seed("43-4051", "Customer Service Representatives", 2858710, 39680, HS, -5.0, .55, .75, .05, .75,
         "Interact with customers to handle inquiries and complaints.",
         ("Active Listening", "Service Orientation", "Speaking"),
         ("Customer and Personal Service", "English Language", "Clerical")),
    Seed("43-9061", "Office Clerks, General", 2723200, 40480, HS, -4.0, .55, .85, .1, .5,
         "Perform a range of clerical tasks supporting office operations.",
         ("Active Listening", "Coordination", "Time Management"),
         ("Clerical", "Customer and Personal Service")),
    Seed("41-2031", "Retail Salespersons", 3680000, 33900, NF, -2.0, .35, .55, .35, .8,
         "Sell merchandise to customers in retail settings.",
         ("Persuasion", "Service Orientation", "Active Listening"),
         ("Sales and Marketing", "Customer and Personal Service")),
    Seed("41-3091", "Sales Representatives (Services)", 1066400, 65480, HS, 4.0, .6, .4, .15, .85,
         "Sell services to businesses or individuals.",
         ("Persuasion", "Negotiation", "Active Listening"),
         ("Sales and Marketing", "Customer and Personal Service")),
    Seed("41-4012", "Sales Reps, Wholesale & Manufacturing", 1503400, 67750, HS, 1.4, .55, .45, .2, .8,
         "Sell goods for wholesalers or manufacturers to businesses.",
         ("Persuasion", "Negotiation", "Service Orientation"),
         ("Sales and Marketing", "Production and Processing")),
    Seed("35-3023", "Fast Food and Counter Workers", 3676800, 29540, NF, 3.0, .15, .7, .8, .65,
         "Prepare and serve food and drinks to customers.",
         ("Service Orientation", "Active Listening", "Coordination"),
         ("Customer and Personal Service", "Food Production")),
    Seed("35-2014", "Cooks, Restaurant", 1546800, 35780, NF, 6.0, .15, .6, .9, .45,
         "Prepare food in restaurants following recipes.",
         ("Coordination", "Monitoring", "Time Management"),
         ("Food Production", "Customer and Personal Service")),
    Seed("35-3031", "Waiters and Waitresses", 2245500, 31940, NF, 0.0, .2, .55, .75, .8,
         "Take orders and serve food and beverages to patrons.",
         ("Service Orientation", "Active Listening", "Coordination"),
         ("Customer and Personal Service", "Food Production")),
    Seed("53-3032", "Heavy and Tractor-Trailer Truck Drivers", 2071900, 54320, PND, 4.0, .25, .55, .9, .3,
         "Transport goods over long distances by truck.",
         ("Operation and Control", "Monitoring", "Time Management"),
         ("Transportation", "Public Safety and Security", "Mechanical")),
    Seed("53-7062", "Laborers and Freight/Material Movers", 3231000, 37660, NF, 3.0, .1, .55, .95, .3,
         "Manually move freight, stock, or other materials.",
         ("Coordination", "Monitoring", "Operation Monitoring"),
         ("Transportation", "Production and Processing")),
    Seed("53-3033", "Light Truck Drivers", 1100000, 42470, HS, 7.0, .2, .5, .9, .35,
         "Deliver goods over short distances, including last-mile delivery.",
         ("Operation and Control", "Time Management", "Service Orientation"),
         ("Transportation", "Customer and Personal Service")),
    Seed("47-2061", "Construction Laborers", 1015800, 45300, NF, 4.0, .1, .45, .95, .35,
         "Perform physical labour at construction sites.",
         ("Coordination", "Operation and Control", "Monitoring"),
         ("Building and Construction", "Mechanical", "Public Safety and Security")),
    Seed("47-2111", "Electricians", 762600, 61590, HS, 11.0, .35, .35, .9, .4,
         "Install and maintain electrical systems.",
         ("Troubleshooting", "Repairing", "Critical Thinking"),
         ("Building and Construction", "Mechanical", "Engineering and Technology")),
    Seed("47-2152", "Plumbers, Pipefitters, and Steamfitters", 482700, 61550, HS, 6.0, .3, .35, .92, .4,
         "Install and repair piping systems.",
         ("Troubleshooting", "Repairing", "Installation"),
         ("Building and Construction", "Mechanical")),
    Seed("49-3023", "Automotive Service Technicians", 743100, 47770, PND, 3.0, .3, .45, .9, .4,
         "Inspect, maintain, and repair cars and light trucks.",
         ("Repairing", "Troubleshooting", "Operation Monitoring"),
         ("Mechanical", "Engineering and Technology", "Customer and Personal Service")),
    Seed("51-2090", "Assemblers and Fabricators", 1542600, 40160, HS, -8.0, .15, .8, .85, .25,
         "Assemble finished products and the parts that go into them.",
         ("Operation Monitoring", "Coordination", "Quality Control Analysis"),
         ("Production and Processing", "Mechanical", "Engineering and Technology")),
    Seed("51-1011", "First-Line Supervisors of Production Workers", 654400, 67250, HS, -3.0, .5, .5, .55, .8,
         "Supervise and coordinate production and operating workers.",
         ("Management of Personnel Resources", "Coordination", "Monitoring"),
         ("Production and Processing", "Administration and Management")),
    Seed("17-2051", "Civil Engineers", 343700, 95890, B, 6.0, .8, .35, .35, .55,
         "Design and oversee construction of infrastructure projects.",
         ("Complex Problem Solving", "Mathematics", "Critical Thinking"),
         ("Engineering and Technology", "Design", "Mathematics")),
    Seed("17-2141", "Mechanical Engineers", 277500, 99510, B, 11.0, .82, .35, .25, .5,
         "Design mechanical and thermal devices and systems.",
         ("Complex Problem Solving", "Mathematics", "Systems Analysis"),
         ("Engineering and Technology", "Design", "Mathematics")),
    Seed("17-2071", "Electrical Engineers", 199400, 109010, B, 9.0, .85, .35, .2, .5,
         "Design and develop electrical equipment and systems.",
         ("Complex Problem Solving", "Mathematics", "Systems Analysis"),
         ("Engineering and Technology", "Mathematics", "Physics")),
    Seed("19-1042", "Medical Scientists", 141200, 100590, DOC, 11.0, .92, .35, .1, .45,
         "Conduct research to improve human health.",
         ("Science", "Critical Thinking", "Complex Problem Solving"),
         ("Biology", "Mathematics", "Chemistry")),
    Seed("19-2041", "Environmental Scientists", 80700, 78980, B, 7.0, .85, .35, .2, .5,
         "Study environmental conditions and hazards.",
         ("Science", "Critical Thinking", "Reading Comprehension"),
         ("Biology", "Geography", "Chemistry")),
    Seed("27-1024", "Graphic Designers", 217200, 58910, B, 2.0, .7, .35, .2, .45,
         "Create visual concepts to communicate ideas.",
         ("Originality", "Design", "Active Listening"),
         ("Design", "Communications and Media", "Fine Arts")),
    Seed("27-3042", "Writers and Authors", 156100, 73690, B, 4.0, .9, .3, .05, .4,
         "Develop written content for a variety of media.",
         ("Writing", "Reading Comprehension", "Originality"),
         ("English Language", "Communications and Media", "Fine Arts")),
    Seed("27-3031", "Public Relations Specialists", 295200, 66750, B, 6.0, .8, .35, .1, .75,
         "Create and maintain a favourable public image for clients.",
         ("Writing", "Persuasion", "Active Listening"),
         ("Communications and Media", "English Language", "Sales and Marketing")),
    Seed("13-1071", "Human Resources Specialists", 838500, 67650, B, 6.0, .75, .45, .1, .8,
         "Recruit, screen, and place workers; handle HR matters.",
         ("Active Listening", "Social Perceptiveness", "Judgment and Decision Making"),
         ("Personnel and Human Resources", "Administration and Management", "Law and Government")),
    Seed("33-3051", "Police and Sheriff's Patrol Officers", 665380, 72280, HS, 4.0, .35, .35, .8, .7,
         "Maintain order and enforce laws.",
         ("Active Listening", "Critical Thinking", "Social Perceptiveness"),
         ("Public Safety and Security", "Law and Government", "Psychology")),
    Seed("31-9092", "Medical Assistants", 783900, 42000, PND, 14.0, .4, .6, .65, .65,
         "Complete clinical and administrative tasks in medical offices.",
         ("Active Listening", "Service Orientation", "Coordination"),
         ("Medicine and Dentistry", "Customer and Personal Service", "Clerical")),
    Seed("39-9011", "Childcare Workers", 920800, 30370, HS, 2.0, .2, .35, .7, .85,
         "Attend to the needs of children in care settings.",
         ("Social Perceptiveness", "Service Orientation", "Monitoring"),
         ("Customer and Personal Service", "Psychology", "Education and Training")),
    Seed("37-2011", "Janitors and Cleaners", 2240000, 35020, NF, 1.0, .1, .6, .95, .35,
         "Keep buildings clean and orderly.",
         ("Coordination", "Monitoring", "Time Management"),
         ("Building and Construction", "Customer and Personal Service")),
    Seed("11-9111", "Medical and Health Services Managers", 562700, 110680, B, 28.0, .8, .35, .15, .85,
         "Plan and coordinate medical and health services.",
         ("Management of Personnel Resources", "Coordination", "Judgment and Decision Making"),
         ("Administration and Management", "Medicine and Dentistry")),
    Seed("13-1161", "Market Research Analysts", 868100, 74680, B, 8.0, .88, .45, .05, .5,
         "Study market conditions to assess product/service potential.",
         ("Critical Thinking", "Mathematics", "Active Listening"),
         ("Sales and Marketing", "Mathematics", "Communications and Media")),
    Seed("15-1212", "Information Security Analysts", 180700, 120360, B, 32.7, .9, .4, .05, .5,
         "Protect an organisation's computer networks and systems.",
         ("Critical Thinking", "Systems Analysis", "Complex Problem Solving"),
         ("Computers and Electronics", "Engineering and Technology", "Public Safety and Security")),
    Seed("25-2031", "Secondary School Teachers", 1037300, 65220, B, 1.0, .6, .35, .2, .85,
         "Teach academic lessons in public and private secondary schools.",
         ("Instructing", "Speaking", "Learning Strategies"),
         ("Education and Training", "English Language", "Mathematics")),
    Seed("21-1093", "Social and Human Service Assistants", 449500, 41410, HS, 8.0, .4, .4, .4, .9,
         "Assist clients in obtaining community services.",
         ("Social Perceptiveness", "Service Orientation", "Active Listening"),
         ("Therapy and Counseling", "Psychology", "Customer and Personal Service")),
]
# fmt: on


# ── Derivation ───────────────────────────────────────────────────────────

def _seeded_rand(key: str) -> float:
    """Deterministic pseudo-random in [0,1) from a string key."""
    h = hashlib.md5(key.encode()).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF


# Per-major-group task-axis priors (info, routine, manual, social), used to
# score occupations that come from official BLS/O*NET data and therefore have
# no hand-set axes. Blended with O*NET signals in build_dataset.
MAJOR_GROUP_AXES: dict[str, tuple[float, float, float, float]] = {
    "11": (0.78, 0.35, 0.10, 0.80), "13": (0.85, 0.55, 0.05, 0.50),
    "15": (0.93, 0.38, 0.05, 0.45), "17": (0.82, 0.38, 0.35, 0.45),
    "19": (0.88, 0.35, 0.25, 0.45), "21": (0.45, 0.40, 0.25, 0.88),
    "23": (0.90, 0.45, 0.05, 0.60), "25": (0.60, 0.35, 0.25, 0.85),
    "27": (0.78, 0.35, 0.20, 0.50), "29": (0.62, 0.38, 0.55, 0.80),
    "31": (0.35, 0.50, 0.70, 0.72), "33": (0.40, 0.40, 0.70, 0.65),
    "35": (0.18, 0.62, 0.85, 0.60), "37": (0.12, 0.60, 0.92, 0.40),
    "39": (0.30, 0.45, 0.65, 0.80), "41": (0.50, 0.50, 0.35, 0.80),
    "43": (0.62, 0.80, 0.15, 0.55), "45": (0.20, 0.55, 0.90, 0.30),
    "47": (0.18, 0.45, 0.92, 0.35), "49": (0.35, 0.45, 0.88, 0.40),
    "51": (0.20, 0.78, 0.85, 0.30), "53": (0.20, 0.55, 0.90, 0.35),
}


def _exposure_core(info: float, routine: float, manual: float,
                   social: float, soc: str) -> dict[str, float]:
    """Core AI-exposure model shared by curated and official records.

    Exposure rises with information/cognitive content and routineness, and
    falls with physical/manual and (to a lesser degree) interpersonal-care
    content. It is then split into *augmentation* vs. *automation* propensity
    following the Anthropic Economic Index framing: non-routine, judgement-
    and people-heavy work leans toward augmentation; highly routine work
    carries more automation potential.

    Exposure is NOT a prediction of job loss. See the methodology page.
    """
    exposure = 0.62 * info + 0.28 * routine - 0.30 * manual - 0.05 * social
    exposure += (_seeded_rand(soc) - 0.5) * 0.04  # break ties deterministically
    exposure = max(0.02, min(0.98, exposure + 0.18))  # recentre into [0,1]

    automation_share = max(0.1, min(0.85, 0.30 + 0.55 * routine - 0.35 * social))
    automation = round(exposure * automation_share, 3)
    augmentation = round(exposure * (1 - automation_share), 3)
    return {
        "ai_exposure_score": round(exposure, 3),
        "ai_automation_score": automation,
        "ai_augmentation_score": augmentation,
        "exposure_band": exposure_band(exposure),
    }


def ai_exposure(seed: Seed) -> dict[str, float]:
    """Exposure for a curated seed row (uses its hand-set task axes)."""
    return _exposure_core(seed.info, seed.routine, seed.manual, seed.social, seed.soc)


def exposure_from_major_group(soc: str) -> dict[str, float]:
    """Exposure for an official record with no hand-set axes, using the
    occupation's SOC major-group task-axis priors."""
    axes = MAJOR_GROUP_AXES.get(soc.split("-")[0], (0.5, 0.5, 0.4, 0.5))
    return _exposure_core(*axes, soc)


def wage_percentiles(median: int, seed: Seed) -> dict[str, int]:
    """Synthesise a plausible wage distribution around the median.

    Spread widens with information content (more wage dispersion in
    knowledge work) and narrows for routine roles.
    """
    spread = 0.30 + 0.22 * seed.info
    p10 = int(median * (1 - spread * 0.9))
    p25 = int(median * (1 - spread * 0.45))
    p75 = int(median * (1 + spread * 0.55))
    p90 = int(median * (1 + spread * 1.25))
    return {"wage_p10": p10, "wage_p25": p25, "wage_p75": p75, "wage_p90": p90}


def projections(seed: Seed) -> dict[str, float | int]:
    base = seed.employment
    projected = int(round(base * (1 + seed.growth_pct / 100.0)))
    # Annual openings ≈ growth + replacement (turnover scales with size and
    # is higher in lower-wage, higher-turnover roles).
    turnover = 0.08 + 0.06 * (1 - min(seed.median_wage / 150000, 1))
    annual_openings = int(round(max(0, (projected - base)) / 10 + base * turnover))
    return {
        "projected_employment": projected,
        "annual_openings": annual_openings,
    }


def make_summary(rec: dict) -> str:
    """Compose a neutral, evidence-aware narrative summary.

    Mirrors the worked example in the brief and is intentionally careful to
    frame exposure as augmentation-vs-automation, never as job loss.
    """
    title = rec["title"]
    band = rec["exposure_band"]
    growth = rec["growth_rate"]
    wage = rec["median_wage"]
    aug = rec["ai_augmentation_score"]
    auto = rec["ai_automation_score"]

    exposure_phrase = {
        "high": "high AI exposure",
        "moderate": "moderate AI exposure",
        "low": "limited AI exposure",
    }[band]
    growth_phrase = (
        "fast projected growth" if growth >= 12
        else "steady growth" if growth >= 4
        else "modest growth" if growth >= 0
        else "projected decline"
    )
    wage_phrase = (
        "high wages" if wage >= 95000
        else "mid-range wages" if wage >= 55000
        else "lower wages"
    )
    lean = (
        "augmentation is more likely than full automation"
        if aug >= auto
        else "some tasks are exposed to automation, though human oversight remains central"
    )
    return (
        f"{title} show {exposure_phrase} alongside {growth_phrase} and {wage_phrase}. "
        f"Current evidence suggests {lean}. Exposure reflects how much of the role's "
        f"day-to-day tasks overlap with current AI capabilities - not a forecast of job loss."
    )


def build_record(seed: Seed) -> dict:
    """Assemble a fully-derived occupation record from a seed row."""
    rec: dict = {
        "soc_code": seed.soc,
        "title": seed.title,
        "major_group": seed.soc.split("-")[0],
        "major_group_title": major_group_title(seed.soc),
        "description": seed.description,
        "employment": seed.employment,
        "median_wage": seed.median_wage,
        "mean_wage": int(round(seed.median_wage * (1.05 + 0.08 * seed.info))),
        "education": seed.education,
        "education_rank": EDUCATION_LEVELS.index(seed.education),
        "growth_rate": seed.growth_pct,
        "skills": list(seed.skills),
        "knowledge": list(seed.knowledge),
    }
    rec.update(wage_percentiles(seed.median_wage, seed))
    rec.update(projections(seed))
    rec.update(ai_exposure(seed))
    rec["ai_summary"] = make_summary(rec)
    return rec


def build_official_record(row: dict, onet: dict | None = None) -> dict:
    """Assemble a record from official BLS/O*NET fields.

    ``row`` carries OEWS + EP fields (employment, wages, percentiles, growth,
    openings, education). ``onet`` optionally carries::

        {"skills": [...], "knowledge": [...], "description": str,
         "education": str, "axes": {"info","routine","manual","social"}}

    AI exposure is computed from the occupation's **real O*NET work-activity
    task axes** when present (``onet['axes']``); only when O*NET work
    activities are unavailable for a SOC do we fall back to its major-group
    task-axis priors. No curated seed weights are used for official records.
    """
    soc = row["soc_code"]
    onet = onet or {}
    employment = int(row.get("employment") or 0)
    median = int(row["median_wage"])
    edu = row.get("education") or onet.get("education") or EDUCATION_LEVELS[1]
    growth = round(float(row.get("growth_rate") or 0.0), 1)
    rec: dict = {
        "soc_code": soc,
        "title": row["title"],
        "major_group": soc.split("-")[0],
        "major_group_title": major_group_title(soc),
        "description": row.get("description") or onet.get("description", ""),
        "employment": employment,
        "median_wage": median,
        "mean_wage": int(row.get("mean_wage") or median),
        "education": edu,
        "education_rank": EDUCATION_LEVELS.index(edu) if edu in EDUCATION_LEVELS else 1,
        "growth_rate": growth,
        "wage_p10": int(row.get("wage_p10") or median * 0.6),
        "wage_p25": int(row.get("wage_p25") or median * 0.8),
        "wage_p75": int(row.get("wage_p75") or median * 1.3),
        "wage_p90": int(row.get("wage_p90") or median * 1.7),
        "projected_employment": int(
            row.get("projected_employment")
            or round(employment * (1 + growth / 100))
        ),
        "annual_openings": int(row.get("annual_openings") or 0),
        "skills": list(onet.get("skills", [])),
        "knowledge": list(onet.get("knowledge", [])),
    }
    axes = onet.get("axes")
    if axes:
        rec.update(
            _exposure_core(
                axes["info"], axes["routine"], axes["manual"], axes["social"], soc
            )
        )
        rec["exposure_source"] = "onet-work-activities"
    else:
        rec.update(exposure_from_major_group(soc))
        rec["exposure_source"] = "major-group-prior"
    rec["ai_summary"] = make_summary(rec)
    return rec


def all_records() -> list[dict]:
    records = [build_record(s) for s in SEEDS]
    # Stable ordering by employment desc for nicer default lists.
    records.sort(key=lambda r: r["employment"], reverse=True)
    return records


# ── US states ────────────────────────────────────────────────────────────
# (FIPS, abbr, name, employment index, wage index) - indices scale the
# national figures so each state has internally-consistent, plausible data.
STATES_RAW: list[tuple[str, str, str, float, float]] = [
    ("01", "AL", "Alabama", 0.013, 0.86), ("02", "AK", "Alaska", 0.002, 1.06),
    ("04", "AZ", "Arizona", 0.020, 0.95), ("05", "AR", "Arkansas", 0.008, 0.83),
    ("06", "CA", "California", 0.115, 1.18), ("08", "CO", "Colorado", 0.018, 1.06),
    ("09", "CT", "Connecticut", 0.011, 1.12), ("10", "DE", "Delaware", 0.003, 1.02),
    ("11", "DC", "District of Columbia", 0.005, 1.30), ("12", "FL", "Florida", 0.062, 0.93),
    ("13", "GA", "Georgia", 0.031, 0.95), ("15", "HI", "Hawaii", 0.004, 1.04),
    ("16", "ID", "Idaho", 0.005, 0.88), ("17", "IL", "Illinois", 0.040, 1.02),
    ("18", "IN", "Indiana", 0.021, 0.92), ("19", "IA", "Iowa", 0.010, 0.93),
    ("20", "KS", "Kansas", 0.009, 0.91), ("21", "KY", "Kentucky", 0.013, 0.88),
    ("22", "LA", "Louisiana", 0.013, 0.87), ("23", "ME", "Maine", 0.004, 0.95),
    ("24", "MD", "Maryland", 0.018, 1.12), ("25", "MA", "Massachusetts", 0.024, 1.18),
    ("26", "MI", "Michigan", 0.029, 0.96), ("27", "MN", "Minnesota", 0.020, 1.04),
    ("28", "MS", "Mississippi", 0.007, 0.81), ("29", "MO", "Missouri", 0.019, 0.93),
    ("30", "MT", "Montana", 0.003, 0.89), ("31", "NE", "Nebraska", 0.007, 0.93),
    ("32", "NV", "Nevada", 0.009, 0.93), ("33", "NH", "New Hampshire", 0.005, 1.04),
    ("34", "NJ", "New Jersey", 0.028, 1.12), ("35", "NM", "New Mexico", 0.005, 0.90),
    ("36", "NY", "New York", 0.063, 1.15), ("37", "NC", "North Carolina", 0.031, 0.94),
    ("38", "ND", "North Dakota", 0.003, 0.96), ("39", "OH", "Ohio", 0.037, 0.94),
    ("40", "OK", "Oklahoma", 0.011, 0.88), ("41", "OR", "Oregon", 0.013, 1.02),
    ("42", "PA", "Pennsylvania", 0.040, 0.98), ("44", "RI", "Rhode Island", 0.003, 1.04),
    ("45", "SC", "South Carolina", 0.014, 0.89), ("46", "SD", "South Dakota", 0.003, 0.89),
    ("47", "TN", "Tennessee", 0.021, 0.91), ("48", "TX", "Texas", 0.086, 0.98),
    ("49", "UT", "Utah", 0.011, 0.96), ("50", "VT", "Vermont", 0.002, 0.98),
    ("51", "VA", "Virginia", 0.026, 1.06), ("53", "WA", "Washington", 0.024, 1.14),
    ("54", "WV", "West Virginia", 0.005, 0.85), ("55", "WI", "Wisconsin", 0.019, 0.95),
    ("56", "WY", "Wyoming", 0.002, 0.92),
]


def build_states(records: list[dict]) -> list[dict]:
    """Derive per-state aggregates and a top-occupations list."""
    national_emp = sum(r["employment"] for r in records)
    states = []
    for fips, abbr, name, emp_idx, wage_idx in STATES_RAW:
        # Each state gets a deterministic occupation mix skew.
        skew = _seeded_rand(abbr)
        top = []
        ranked = sorted(
            records,
            key=lambda r: r["employment"] * (0.6 + skew * _seeded_rand(abbr + r["soc_code"])),
            reverse=True,
        )[:8]
        for r in ranked:
            top.append({
                "soc_code": r["soc_code"],
                "title": r["title"],
                "employment": int(r["employment"] * emp_idx),
                "median_wage": int(r["median_wage"] * wage_idx),
                "ai_exposure_score": r["ai_exposure_score"],
            })
        total_emp = int(national_emp * emp_idx)
        median_wage = int(
            sum(r["median_wage"] for r in records) / len(records) * wage_idx
        )
        avg_growth = round(sum(r["growth_rate"] for r in records) / len(records), 1)
        avg_exposure = round(
            sum(r["ai_exposure_score"] for r in records) / len(records), 3
        )
        states.append({
            "fips": fips,
            "abbr": abbr,
            "name": name,
            "total_employment": total_emp,
            "median_wage": median_wage,
            "avg_growth": avg_growth,
            "avg_ai_exposure": avg_exposure,
            "top_occupations": top,
        })
    return states
