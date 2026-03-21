# api.py  v5.1 — PathForge backend
# v5.1: debug logging added to all endpoints.
# Run: python -m uvicorn api:app --reload --port 8000

import json
import os
import traceback
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq

import file_parser
import resume_parser
import skill_extractor as se
from gap_engine import extract_skills_from_jd, compute_gaps
from roadmap_engine import build_roadmap, roadmap_to_dict

load_dotenv()


# ── Logging ───────────────────────────────────────────────────────────────────

def _log(level: str, fn: str, msg: str) -> None:
    print(f"[api:{fn}] {level:<5}  {msg}")

def _info(fn, msg):  _log("INFO",  fn, msg)
def _warn(fn, msg):  _log("WARN",  fn, msg)
def _debug(fn, msg): _log("DEBUG", fn, msg)


# ── Startup ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    _info("lifespan", "Server starting — loading O*NET index…")
    se.load_onet_index()
    _info("lifespan", f"Startup complete. O*NET index size: {len(se._onet_index)}")
    yield
    _info("lifespan", "Server shutting down")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="PathForge Engine v5", version="5.1", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Gap helper ────────────────────────────────────────────────────────────────

def _prioritised_gaps(resume_skills: list[dict], jd_skills: list[str]) -> list[dict]:
    fn           = "_prioritised_gaps"
    resume_lower = {s["name"].lower() for s in resume_skills}
    _debug(fn, f"Resume skill set ({len(resume_lower)}): {sorted(resume_lower)}")
    _debug(fn, f"JD skills to check ({len(jd_skills)}): {sorted(jd_skills)}")

    covered   = []
    true_gaps = []
    for skill in jd_skills:
        sl = skill.lower()
        if sl in resume_lower:
            covered.append(skill)
            continue
        if any(rs in sl or sl in rs for rs in resume_lower):
            covered.append(f"{skill} (substring)")
            continue
        true_gaps.append(skill)

    _info(fn, f"Covered by resume ({len(covered)}): {covered}")
    _info(fn, f"True gaps ({len(true_gaps)}): {true_gaps}")

    if not true_gaps:
        _info(fn, "No gaps — resume covers all JD skills")
        return []

    raw = compute_gaps([s["name"] for s in resume_skills], true_gaps)
    if not raw:
        _warn(fn, "compute_gaps returned empty — no scored gaps")
        return []

    scores = sorted(g["score"] for g in raw)
    n      = len(scores)
    t_high = scores[max(0, n // 3)]
    t_med  = scores[max(0, 2 * n // 3)]
    _debug(fn, f"Priority thresholds — high: <={t_high}, medium: <={t_med}, low: >{t_med}")

    def pri(score): return "high" if score <= t_high else "medium" if score <= t_med else "low"
    def lv(score):  return "intermediate" if score >= 0.40 else "beginner"

    result = [{
        "name":     g["skill"],
        "score":    g["score"],
        "priority": pri(g["score"]),
        "level":    lv(g["score"]),
        "category": se.SKILL_TAXONOMY.get(g["skill"], ("Technical", []))[0],
    } for g in raw]

    _info(fn, f"Prioritised gaps ({len(result)}): {[(g['name'], g['priority'], g['score']) for g in result]}")
    return result


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    model_ready = Path("models/skill_extractor/config.json").exists()
    _info("health", f"model_ready={model_ready}, index_size={len(se._onet_index)}")
    return {
        "status":      "ok",
        "model_ready": model_ready,
        "index_size":  len(se._onet_index),
    }


@app.post("/analyze")
async def analyze(
    resume_b64:  str = Form(...),
    resume_name: str = Form(...),
    jd_text:     str = Form(...),
):
    fn = "analyze"
    _info(fn, f"━━━ /analyze called — file='{resume_name}', jd_len={len(jd_text)}")
    try:
        _info(fn, "Step 1: extracting text from file")
        text = file_parser.extract_text(resume_b64, resume_name)
        if not text.strip():
            _warn(fn, "Text extraction returned empty — aborting")
            return {"error": "Could not read resume. Please upload a text-based PDF or DOCX."}
        _info(fn, f"Text extracted: {len(text)} chars, first 200: {repr(text[:200])}")

        _info(fn, "Step 2: extracting skills from JD")
        jd_skills = extract_skills_from_jd(jd_text)
        _info(fn, f"JD skills ({len(jd_skills)}): {sorted(jd_skills)}")

        _info(fn, "Step 3: extracting skills from resume")
        resume_skills = se.extract_skills(text, jd_skills=jd_skills)
        _info(fn, f"Resume skills ({len(resume_skills)}): {[s['name'] for s in resume_skills]}")

        _info(fn, "Step 4: computing gaps")
        full_gaps = _prioritised_gaps(resume_skills, jd_skills)
        gap_names = {g["name"] for g in full_gaps}
        matched   = [s for s in resume_skills if s["name"] not in gap_names]

        total = len(matched) + len(full_gaps)
        score = round(len(matched) / total * 100) if total else 0
        _info(fn, f"Result — matched={len(matched)}, gaps={len(full_gaps)}, score={score}%")

        name = resume_parser.candidate_name(text)
        role = resume_parser.target_role(jd_text)
        _info(fn, f"Metadata — candidate='{name}', role='{role}'")
        _info(fn, f"━━━ /analyze complete")

        return {
            "candidateName": name,
            "targetRole":    role,
            "matchScore":    score,
            "matchedSkills": [
                {"name": s["name"], "level": s["level"], "category": s["category"]}
                for s in matched
            ],
            "gapSkills": [
                {"name": g["name"], "level": g["level"],
                 "category": g["category"], "priority": g["priority"]}
                for g in full_gaps
            ],
        }

    except Exception as e:
        _warn(fn, f"Unhandled exception: {e}")
        traceback.print_exc()
        return {"error": str(e)}


class RoadmapRequest(BaseModel):
    gapSkills:     list[dict]
    matchedSkills: list[dict]    = []
    candidateName: str           = "Candidate"
    targetRole:    str           = "Target Role"
    matchScore:    int           = 0
    coursesJson:   Optional[str] = "data/courses.json"


@app.post("/roadmap")
def roadmap(body: RoadmapRequest):
    fn = "roadmap"
    _info(fn, f"━━━ /roadmap called — {len(body.gapSkills)} gaps, candidate='{body.candidateName}'")
    _debug(fn, f"Gap skills: {[g['name'] for g in body.gapSkills]}")
    _debug(fn, f"Matched skills: {[s['name'] for s in body.matchedSkills]}")
    try:
        _pri_score = {"high": 0.25, "medium": 0.37, "low": 0.48}
        gap_report = {
            "gaps": [{
                "skill":  g["name"],
                "score":  g.get("score", _pri_score.get(g.get("priority", "medium"), 0.37)),
                "source": "JD",
            } for g in body.gapSkills],
            "recommendations": [],
            "training_hints":  {"class_weights": {"O": 1.0}},
        }

        timeline = build_roadmap(
            gap_report     = gap_report,
            matched_skills = [s["name"] for s in body.matchedSkills],
            candidate_name = body.candidateName,
            target_role    = body.targetRole,
            match_score    = body.matchScore,
            courses_json   = body.coursesJson or "data/courses.json",
        )

        _info(fn, f"Roadmap built: {len(timeline.nodes)} nodes, {timeline.total_weeks} weeks")
        _info(fn, f"━━━ /roadmap complete")
        return roadmap_to_dict(timeline)

    except Exception as e:
        _warn(fn, f"Unhandled exception: {e}")
        traceback.print_exc()
        return {"error": str(e), "nodes": [], "total_weeks": 0}


@app.post("/roadmap/from_report")
def roadmap_from_report(
    gap_report_path: str = "data/gap_report.json",
    matched:         str = "",
    candidate_name:  str = "Candidate",
    target_role:     str = "Target Role",
    match_score:     int = 0,
    courses_json:    str = "data/courses.json",
):
    fn = "roadmap_from_report"
    _info(fn, f"Loading gap report from '{gap_report_path}'")
    try:
        gap_report     = json.loads(Path(gap_report_path).read_text())
        matched_skills = [s.strip() for s in matched.split(",") if s.strip()]
        _info(fn, f"Matched skills: {matched_skills}")
        timeline = build_roadmap(
            gap_report     = gap_report,
            matched_skills = matched_skills,
            candidate_name = candidate_name,
            target_role    = target_role,
            match_score    = match_score,
            courses_json   = courses_json,
        )
        _info(fn, f"Roadmap built: {len(timeline.nodes)} nodes")
        return roadmap_to_dict(timeline)
    except Exception as e:
        _warn(fn, f"Unhandled exception: {e}")
        traceback.print_exc()
        return {"error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# KIRA CHAT ENDPOINT
# ══════════════════════════════════════════════════════════════════════════════

class ChatRequest(BaseModel):
    message:      str
    user_context: dict = {}
    chat_history: list = []


def build_kira_system_prompt(ctx: dict) -> str:
    target_role    = ctx.get("targetRole", "your target role")
    match_score    = ctx.get("matchScore", 0)
    matched_skills = ctx.get("matchedSkills", [])
    gap_skills     = ctx.get("gapSkills", [])
    first_name     = ctx.get("firstName", "there")

    matched_names = ", ".join(
        s.get("name", s) if isinstance(s, dict) else s
        for s in matched_skills[:10]
    )
    gap_names = ", ".join(
        s.get("name", s) if isinstance(s, dict) else s
        for s in gap_skills[:10]
    )

    high_priority = [
        s.get("name", s) if isinstance(s, dict) else s
        for s in gap_skills
        if isinstance(s, dict) and s.get("priority") == "high"
    ]
    high_str = ", ".join(high_priority) if high_priority else "check the skill gap page"

    try:
        courses = json.loads(Path("data/courses.json").read_text())
        course_list = "\n".join(
            f"- {c['title']}: covers {', '.join(c['skills_covered'][:4])}"
            for c in courses[:8]
        )
    except Exception:
        course_list = "courses not available"

    return f"""You are Kira — an enthusiastic, sharp, and deeply caring AI learning guide for PathForge. You are represented as a fox mascot. Your personality: encouraging, specific, never generic, always grounded in the user's actual data.

ABOUT THE USER:
- Name: {first_name}
- Target role: {target_role}
- Current match score: {match_score}%
- Skills they already have: {matched_names}
- Skill gaps to close: {gap_names}
- High priority gaps: {high_str}

AVAILABLE COURSES IN OUR CATALOG:
{course_list}

YOUR CAPABILITIES:
1. RESOURCE ENGINE — when asked for resources, recommend specific courses from the catalog above matched to their gap skills
2. STUDY PLANNER — when asked for a plan, create a week-by-week schedule based on their roadmap
3. QUIZ MODE — when asked to quiz them, generate 3-5 questions appropriate for their level
4. EXPLAINER — explain any concept clearly, always relating it back to their specific role
5. MOTIVATOR — celebrate progress, keep them on track

RULES:
- Always address them by name ({first_name})
- Always reference their ACTUAL skills and gaps — never be generic
- Keep responses concise and actionable — max 4-5 sentences unless making a plan
- Use emojis sparingly but warmly
- When recommending courses, cite the exact course title from the catalog
- Format plans with clear days/weeks
- Never say "I don't know" — always give your best guidance based on their profile

You are their personal career guide. Make every response feel like it was written specifically for them."""


@app.post("/chat")
async def chat(body: ChatRequest):
    fn = "chat"
    _info(fn, f"━━━ /chat called — message='{body.message[:60]}...'")
    try:
        client        = Groq(api_key=os.getenv("GROQ_API_KEY"))
        system_prompt = build_kira_system_prompt(body.user_context)
        messages      = [{"role": "system", "content": system_prompt}]

        for msg in body.chat_history[-10:]:
            role    = "user" if msg.get("role") == "user" else "assistant"
            content = msg.get("text", "")
            if content:
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": body.message})
        _info(fn, f"Sending {len(messages)} messages to Groq")

        def generate():
            stream = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                stream=True,
                max_tokens=600,
                temperature=0.7,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta

        _info(fn, "━━━ /chat streaming started")
        return StreamingResponse(generate(), media_type="text/plain")

    except Exception as e:
        _warn(fn, f"Unhandled exception: {e}")
        traceback.print_exc()
        return {"error": str(e)}


# ── Local pipeline run ────────────────────────────────────────────────────────

if __name__ == "__main__":
    import base64
    import sys

    here       = Path(__file__).parent
    resume_pdf = here / "Resume.pdf"
    jd_file    = here / "JD.txt"

    if not resume_pdf.exists():
        print(f"[pipeline] ERROR  Resume.pdf not found at {resume_pdf}")
        sys.exit(1)
    if not jd_file.exists():
        print(f"[pipeline] ERROR  JD.txt not found at {jd_file}")
        sys.exit(1)

    print("\n" + "═" * 60)
    print("  PathForge — local pipeline run")
    print("═" * 60)

    print("\n[pipeline] Step 1 — loading O*NET index")
    se.load_onet_index()

    print("\n[pipeline] Step 2 — extracting text from Resume.pdf")
    raw_bytes   = resume_pdf.read_bytes()
    b64_resume  = base64.b64encode(raw_bytes).decode("utf-8")
    resume_text = file_parser.extract_text(b64_resume, "Resume.pdf")

    if not resume_text.strip():
        print("[pipeline] ERROR  Could not extract text from Resume.pdf")
        sys.exit(1)
    print(f"[pipeline] Extracted {len(resume_text)} chars")

    print("\n[pipeline] Step 3 — reading JD.txt")
    jd_text = jd_file.read_text(encoding="utf-8", errors="ignore")
    print(f"[pipeline] JD length: {len(jd_text)} chars")

    print("\n[pipeline] Step 4 — extracting skills from JD")
    jd_skills = extract_skills_from_jd(jd_text)
    print(f"[pipeline] JD skills ({len(jd_skills)}): {sorted(jd_skills)}")

    print("\n[pipeline] Step 5 — extracting skills from resume")
    resume_skills = se.extract_skills(resume_text, jd_skills=jd_skills)
    print(f"[pipeline] Resume skills ({len(resume_skills)}): {[s['name'] for s in resume_skills]}")

    print("\n[pipeline] Step 6 — computing gaps")
    full_gaps = _prioritised_gaps(resume_skills, jd_skills)
    gap_names = {g["name"] for g in full_gaps}
    matched   = [s for s in resume_skills if s["name"] not in gap_names]

    total = len(matched) + len(full_gaps)
    score = round(len(matched) / total * 100) if total else 0

    print("\n[pipeline] Step 7 — extracting metadata")
    name = resume_parser.candidate_name(resume_text)
    role = resume_parser.target_role(jd_text)

    print("\n[pipeline] Step 8 — building roadmap")
    _pri_score = {"high": 0.25, "medium": 0.37, "low": 0.48}
    gap_report = {
        "gaps": [{
            "skill":  g["name"],
            "score":  g.get("score", _pri_score.get(g.get("priority", "medium"), 0.37)),
            "source": "JD",
        } for g in full_gaps],
        "recommendations": [],
        "training_hints":  {"class_weights": {"O": 1.0}},
    }
    timeline = build_roadmap(
        gap_report     = gap_report,
        matched_skills = [s["name"] for s in matched],
        candidate_name = name,
        target_role    = role,
        match_score    = score,
        courses_json   = str(here / "data" / "courses.json"),
    )

    print("\n" + "═" * 60)
    print("  RESULTS")
    print("═" * 60)
    print(f"  Candidate   : {name}")
    print(f"  Target role : {role}")
    print(f"  Match score : {score}%  ({len(matched)} matched / {total} total)")

    print(f"\n  Matched skills ({len(matched)}):")
    for s in matched:
        print(f"    ✓  {s['name']:<35} {s['level']}")

    print(f"\n  Skill gaps ({len(full_gaps)}):")
    for g in sorted(full_gaps, key=lambda x: x["priority"]):
        print(f"    ✗  {g['name']:<35} priority={g['priority']}  score={g['score']}")

    print(f"\n  Roadmap: {len(timeline.nodes)} nodes, {timeline.total_weeks} weeks")
    for node in timeline.nodes:
        marker = "★" if node.priority == "high" else "·"
        print(f"    {marker}  Week {node.week_start:>2}–{node.week_end:<2}  {node.skill:<30} [{node.priority}]")

    out_path = here / "pipeline_output.json"
    out_path.write_text(json.dumps({
        "candidateName": name,
        "targetRole":    role,
        "matchScore":    score,
        "matchedSkills": matched,
        "gapSkills":     full_gaps,
        "roadmap":       roadmap_to_dict(timeline),
    }, indent=2))
    print(f"\n[pipeline] Full output written → {out_path}")
    print("═" * 60 + "\n")