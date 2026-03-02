from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class CombinedRequest(BaseModel):
    criteria: List[str]
    alternatives: List[str]
    preference_matrix: List[List[float]]
    score_matrix: List[List[float]]
    benefit: List[bool]
    real_values: Optional[Dict[str, float]] = None


class NormaliseRequest(BaseModel):
    criteria: List[str]
    alternatives: List[str]
    benefit: List[bool]
    real_values: Dict[str, float]


class NormaliseResult(BaseModel):
    normalised_scores: Dict[str, float]
    per_criterion: Dict[str, Any]


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

class SensitivityRequest(BaseModel):
    criteria: List[str]
    alternatives: List[str]
    combined_weights: List[float]
    score_matrix: List[List[float]]
    benefit: List[bool]