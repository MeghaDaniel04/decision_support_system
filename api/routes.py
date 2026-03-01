try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

from fastapi import APIRouter, HTTPException
# from fastapi.responses import JSONResponse
from mcdn_engine.entropy_weights import entropy_weights
from mcdn_engine.fuzzy_ahp import fuzzy_ahp
from mcdn_engine.fuzzy_topsis import fuzzy_topsis
import numpy as np
from mcdn_engine.tfn import defuzz
from services.criteria_suggester import GROQ_API_KEY , generate_criteria_suggestions
from models import  SuggestCriteriaRequest, CombinedRequest
import json, re, os, httpx
from services.recommendations import generate_recommendation
from services.sensitivity_analysis import sensitivity_analysis
from services.normalise_real import normalise_real_values, merge_into_matrix
from models import CombinedRequest, NormaliseRequest , NormaliseResult

router = APIRouter()

@router.post("/normalise")
def normalise(req: NormaliseRequest):
    if not req.real_values:
        raise HTTPException(400, "No real values provided")

    result = normalise_real_values(
        req.criteria,
        req.alternatives,
        req.benefit,
        req.real_values,
    )

    return {
        "normalised_scores": result["normalised_scores"],
        "per_criterion":     result["per_criterion"],
    }

@router.post("/analyze")
def analyze(req: CombinedRequest):
    n_c = len(req.criteria)
    n_a = len(req.alternatives)

    if n_c < 2:
        raise HTTPException(400, "Need at least 2 criteria")
    if n_a < 2:
        raise HTTPException(400, "Need at least 2 alternatives")
    

    # merge real values into score matrix 
    score_matrix = req.score_matrix
    normalise_meta = None

    if req.real_values:
        norm_result = normalise_real_values(
            req.criteria,
            req.alternatives,
            req.benefit,
            req.real_values
        )
        score_matrix = merge_into_matrix(
            req.score_matrix,
            norm_result["normalised_scores"],
            req.criteria,
            req.alternatives
        )
        normalise_meta = norm_result["per_criterion"]

    #  Get weights
    ahp_w, lam, ci, cr = fuzzy_ahp(n_c, req.preference_matrix)  # TFN


    ent_w, entropy = entropy_weights(score_matrix, req.benefit)  # crisp
    print("\n=== ENTROPY VALUES ===")
    for i, e in enumerate(entropy):
        print(f"  {req.criteria[i]}: entropy={e:.4f}  weight={ent_w[i]:.4f}")

    #  Adaptive alpha (use defuzzed AHP)
    def adaptive_alpha(ahp_w, ent_w):
        ahp_crisp = np.array([defuzz(w) for w in ahp_w])
        ahp_var = np.var(ahp_crisp)
        ent_var = np.var(ent_w)

        total = ahp_var + ent_var
        return ahp_var / total if total != 0 else 0.5

    alpha = adaptive_alpha(ahp_w, ent_w)

    # Convert entropy → TFN
    ent_w_tfn = [(w, w, w) for w in ent_w]

    # Combine weights (fuzzy)
    cw_fuzzy = [
        (
            ahp_w[i][0] * alpha + ent_w_tfn[i][0] * (1 - alpha),
            ahp_w[i][1] * alpha + ent_w_tfn[i][1] * (1 - alpha),
            ahp_w[i][2] * alpha + ent_w_tfn[i][2] * (1 - alpha),
        )
        for i in range(n_c)
    ]

    #  Normalize fuzzy weights
    sum_l = sum(w[0] for w in cw_fuzzy)
    sum_m = sum(w[1] for w in cw_fuzzy)
    sum_u = sum(w[2] for w in cw_fuzzy)

    cw_fuzzy = [
        (
            w[0] / sum_l if sum_l else 0,
            w[1] / sum_m if sum_m else 0,
            w[2] / sum_u if sum_u else 0,
        )
        for w in cw_fuzzy
    ]

    #  Fuzzy TOPSIS
    cc, d_pos, d_neg = fuzzy_topsis(
        score_matrix,
        cw_fuzzy,
        req.benefit,
    )

    #  Defuzz weights for UI modules
    cw_display = [defuzz(w) for w in cw_fuzzy]

    #  Sensitivity & recommendation (use crisp weights)
    sens = sensitivity_analysis(
        req.alternatives,
        score_matrix,
        cw_display,
        req.benefit,
        req.criteria,
    )

    recommendation = generate_recommendation(
    req.alternatives,
    score_matrix,       # correct: raw score matrix for contribution analysis
    cc,                 # correct: closeness coefficients to identify winner
    cw_display,
    req.criteria,
    req.benefit,        # now passed: needed for strength/weakness classification
    sensitivity_result=sens  # now passed: enables confidence message
)

    #  Ranking
    ranked = sorted(range(n_a), key=lambda x: cc[x], reverse=True)

    table = [
        {
            "rank": r + 1,
            "alternative": req.alternatives[idx],
            "closeness": round(cc[idx], 4),
            "d_pos": round(d_pos[idx], 4),
            "d_neg": round(d_neg[idx], 4),
            "idx": idx,
        }
        for r, idx in enumerate(ranked)
    ]

    return {
        "ranking_table": table,
        "winner": req.alternatives[ranked[0]],
        "ahp_weights": ahp_w,               
        "entropy_weights": ent_w,            
        "combined_weights": cw_display,       
        "entropy_values": entropy,
        "consistency": {
            "lambda_max": lam,
            "CI": ci,
            "CR": cr,
            "ok": cr < 0.1,
        },
        "criteria": req.criteria,
        "alternatives": req.alternatives,
        "benefit": req.benefit,
        "recommendation": recommendation,
        "sensitivity": sens,
        "normalisation_meta": normalise_meta
    }


#===================== GROQ helper ==============================================
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


async def _groq_chat(system: str, user: str, max_tokens: int = 1200, temperature: float = 0.6) -> str:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not set")
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": GROQ_MODEL,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    async with httpx.AsyncClient(timeout=25) as client:
        r = await client.post(GROQ_URL, headers=headers, json=payload)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


def _parse_json_from_text(text: str):
    text = text.strip()
    m = re.search(r"```(?:json)?\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*```", text)
    if m:
        return json.loads(m.group(1))
    m = re.search(r"(\[[\s\S]*?\]|\{[\s\S]*?\})", text)
    if m:
        return json.loads(m.group(1))
    raise ValueError("No JSON found in model response")



CRITERIA_SYSTEM = (
    "You are an expert in multi-criteria decision analysis (MCDM). "
    "You respond ONLY with a valid JSON array — no prose, no markdown, no extra text."
    " Do NOT assume any details (e.g., product type or domain) that are not present in the user's decision text; base suggestions only on the provided decision description and alternatives."
)
#---------------------------------------------------------------------------------------------------------------------------------#

@router.post("/suggest-criteria")
async def suggest_criteria(req: SuggestCriteriaRequest):
    """Return AI-generated criteria suggestions for the user's decision."""

    return await generate_criteria_suggestions(
        req,
        _groq_chat,
        _parse_json_from_text,
        CRITERIA_SYSTEM
    )





