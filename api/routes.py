
from fastapi import APIRouter
from fastapi import HTTPException
from models import SAWRequest
from algorithms.saw import calculate_saw , rank_options

router = APIRouter()

@router.post("/saw")
def run_saw(data: SAWRequest):
	try:
		result = calculate_saw(
			options=data.options,
			criteria=data.criteria,
			scores=data.scores,
			criteria_type=data.criteria_type
		)
		ranked = rank_options(result)
		return {"results": result, "ranking": ranked}
	except Exception as e:
		raise HTTPException(status_code=400, detail=str(e))
