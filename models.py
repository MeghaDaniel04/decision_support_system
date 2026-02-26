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


