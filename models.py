from pydantic import BaseModel
from typing import Dict, List

class SAWRequest(BaseModel):
    options: List[str]
    criteria: Dict[str, float]  
    scores: Dict[str, Dict[str, float]] 
    criteria_type: Dict[str, str] 