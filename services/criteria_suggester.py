import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

GROQ_API_KEY = os.getenv("GROQ_API_KEY")


async def generate_criteria_suggestions(
    req,
    _groq_chat,
    _parse_json_from_text,
    CRITERIA_SYSTEM
):
    """Core logic moved from route (unchanged)"""

    user_msg = f"""Decision: "{req.decision_text}"
Alternatives being compared: {", ".join(req.alternatives) if req.alternatives else "not specified yet"}
Already chosen criteria (do NOT repeat): {", ".join(req.existing_criteria) if req.existing_criteria else "none"}

Suggest {req.num_suggestions} diverse, specific evaluation criteria for this decision.

Return ONLY a JSON array like:
[
  {{"name": "GPU Performance", "benefit": true, "rationale": "Determines how well the laptop handles graphics-intensive tasks like gaming or 3D rendering.", "unit": "score", "example_range": "1000–20000 (PassMark)"}},
  {{"name": "Price", "benefit": false, "rationale": "Lower purchase price improves value for money.", "unit": "USD", "example_range": "500–3000"}}
]

Rules:
- benefit: true if higher value is better, false if lower is better
- unit: the natural measurement unit (e.g. USD, kg, %, score, hours, km/h, W, GB, etc.)
- example_range: realistic numeric range for this criterion given the alternatives
- Be specific to the decision context — not generic boilerplate
- Cost/price/time/distance/risk → benefit: false
- Quality/speed/safety/reliability → benefit: true
- name max 4 words, rationale max 25 words
"""

    try:
        if not GROQ_API_KEY:
            raise RuntimeError(
                "GROQ_API_KEY environment variable not set. Set it with: $env:GROQ_API_KEY='sk_live_...'"
            )

        raw = await _groq_chat(
            CRITERIA_SYSTEM,
            user_msg,
            max_tokens=1400,
            temperature=0.65
        )

        parsed = _parse_json_from_text(raw)

        if not isinstance(parsed, list):
            raise ValueError("Expected list")

        validated = []
        for item in parsed:
            if not isinstance(item, dict) or not all(k in item for k in ("name", "benefit", "rationale")):
                continue

            validated.append({
                "name": str(item["name"]).strip(),
                "benefit": bool(item["benefit"]),
                "rationale": str(item.get("rationale", "")).strip(),
                "unit": str(item.get("unit", "")).strip(),
                "example_range": str(item.get("example_range", "")).strip(),
            })

        return {
            "suggestions": validated[:req.num_suggestions],
            "source": "groq",
            "error": None
        }

    except Exception as e:
        error_msg = str(e)
        print(f"⚠️  Groq API error: {error_msg}")

        return {
            "suggestions": [],
            "source": "fallback",
            "error": error_msg
        }