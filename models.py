from pydantic import BaseModel
from typing import List, Optional


class CombinedRequest(BaseModel):
    criteria: List[str]
    alternatives: List[str]
    preference_matrix: List[List[float]]
    score_matrix: List[List[float]]
    benefit: List[bool]
    ahp_weight: float = 0.5


class SuggestCriteriaRequest(BaseModel):
    decision_text: str
    alternatives: Optional[List[str]] = []
    existing_criteria: Optional[List[str]] = []
    num_suggestions: int = 8

class VerdictRequest(BaseModel):
    decision_name: str
    winner: str
    runner_up: str
    winner_score: float
    runner_up_score: float
    criteria: List[str]
    alternatives: List[str]
    combined_weights: List[float]
    score_matrix: List[List[float]]
    consistency_cr: float
