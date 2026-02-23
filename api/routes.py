
from fastapi import APIRouter
from fastapi import HTTPException
from mcdn_engine.entropy_weights import entropy_weights
from mcdn_engine.fuzzy_ahp import fuzzy_ahp
from mcdn_engine.fuzzy_topsis import fuzzy_topsis
import numpy as np
from models import 	CombinedRequest
# from algorithms.saw import calculate_saw , rank_options

router = APIRouter()

# @router.post("/saw")
# def run_saw(data: DecisionRequest):
# 	try:
# 		result = calculate_saw(
# 			options=data.options,
#             criteria_weights=data.criteria_weights,
#             criteria_types=data.criteria_types,
#             query=data.query
# 		)
# 		ranked = rank_options(result)
# 		return {"results": result, "ranking": ranked}
# 	except Exception as e:
# 		raise HTTPException(status_code=400, detail=str(e))


@router.post("/analyze")
def analyze(req: CombinedRequest):
    n_c = len(req.criteria); n_a = len(req.alternatives)
    if n_c < 2: raise HTTPException(400,"Need at least 2 criteria")
    if n_a < 2: raise HTTPException(400,"Need at least 2 alternatives")

    ahp_w, lam, ci, cr = fuzzy_ahp(n_c, req.preference_matrix)
    ent_w, entropy = entropy_weights(req.score_matrix, req.benefit)

    alpha = req.ahp_weight
    cw = np.array(ahp_w)*alpha + np.array(ent_w)*(1-alpha)
    cw = (cw/cw.sum()).tolist()

    cc, d_pos, d_neg = fuzzy_topsis(req.score_matrix, cw, req.benefit)

    ranked = sorted(range(n_a), key=lambda x: cc[x], reverse=True)
    table = [{"rank":r+1,"alternative":req.alternatives[idx],"closeness":round(cc[idx],4),"d_pos":round(d_pos[idx],4),"d_neg":round(d_neg[idx],4),"idx":idx} for r,idx in enumerate(ranked)]

    return {
        "ranking_table": table,
        "winner": req.alternatives[ranked[0]],
        "ahp_weights": ahp_w,
        "entropy_weights": ent_w,
        "combined_weights": cw,
        "entropy_values": entropy,
        "consistency": {"lambda_max":lam,"CI":ci,"CR":cr,"ok":cr<0.1},
        "criteria": req.criteria,
        "alternatives": req.alternatives,
        "benefit": req.benefit,
    }