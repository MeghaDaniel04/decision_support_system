try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from mcdn_engine.entropy_weights import entropy_weights
from mcdn_engine.fuzzy_ahp import fuzzy_ahp
from mcdn_engine.fuzzy_topsis import fuzzy_topsis
import numpy as np
from mcdn_engine.tfn import defuzz
from services.criteria_suggester import GROQ_API_KEY , generate_criteria_suggestions
from models import  SuggestCriteriaRequest, FetchScoresRequest, CombinedRequest
import json, re, os, httpx, asyncio
from services.recommendations import generate_recommendation
from services.sensitivity_analysis import sensitivity_analysis

router = APIRouter()

@router.post("/analyze")
def analyze(req: CombinedRequest):
    n_c = len(req.criteria)
    n_a = len(req.alternatives)

    if n_c < 2:
        raise HTTPException(400, "Need at least 2 criteria")
    if n_a < 2:
        raise HTTPException(400, "Need at least 2 alternatives")

    #  Get weights
    ahp_w, lam, ci, cr = fuzzy_ahp(n_c, req.preference_matrix)  # TFN
    ent_w, entropy = entropy_weights(req.score_matrix, req.benefit)  # crisp

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
        req.score_matrix,
        cw_fuzzy,
        req.benefit,
    )

    #  Defuzz weights for UI modules
    cw_display = [defuzz(w) for w in cw_fuzzy]

    #  Sensitivity & recommendation (use crisp weights)
    sens = sensitivity_analysis(
        req.alternatives,
        req.score_matrix,
        cw_display,
        req.benefit,
        req.criteria,
    )

    recommendation = generate_recommendation(
        req.alternatives,
        cc,
        cw_display,
        req.criteria,
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
    }


