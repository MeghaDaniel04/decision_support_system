
from pydantic import BaseModel
from typing import Dict, List

class Option(BaseModel):
    name: str
    features: Dict[str, float]

class DecisionRequest(BaseModel):
    query: str
    options: List[Option]
    criteria_weights: Dict[str, float]
    criteria_types: Dict[str, str]
