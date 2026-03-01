from typing import List, Dict, Optional, Any


def normalise_real_values(
    criteria: List[str],
    alternatives: List[str],
    benefit: List[bool],
    real_values: Dict[str, float]
) -> Dict[str, Any]:
    """
    Takes raw real values and normalises them to 1-9 scores.

    Returns:
        {
            "normalised_scores": {"Dell XPS__Price": 6.0, ...},
            "per_criterion": {
                "Price": {
                    "lo": 999,
                    "hi": 1799,
                    "range": 800,
                    "all_present": True,
                    "alternatives": {
                        "Dell XPS": {"raw": 1299, "score": 6.0},
                        ...
                    }
                }
            }
        }
    """
    normalised_scores = {}
    per_criterion = {}

    for j, crit in enumerate(criteria):

        col_raw = {
            alt: real_values.get(f"{alt}__{crit}")
            for alt in alternatives
        }

        all_present = all(v is not None for v in col_raw.values())

        if not all_present:
            per_criterion[crit] = {
                "all_present": False,
                "alternatives": {
                    alt: {"raw": col_raw[alt], "score": None}
                    for alt in alternatives
                }
            }
            continue

        values = [float(col_raw[alt]) for alt in alternatives]
        lo = min(values)
        hi = max(values)
        rng = hi - lo

        crit_result = {
            "all_present": True,
            "lo": lo,
            "hi": hi,
            "range": rng,
            "benefit": benefit[j],
            "alternatives": {}
        }

        for i, alt in enumerate(alternatives):
            raw = values[i]

            if rng == 0:
                score = 5.0  
            else:
                ratio = (raw - lo) / rng
                if not benefit[j]:
                    ratio = 1 - ratio
                score = round(1 + ratio * 8, 4)  

            key = f"{alt}__{crit}"
            normalised_scores[key] = score
            crit_result["alternatives"][alt] = {
                "raw": raw,
                "score": score
            }

        per_criterion[crit] = crit_result

    return {
        "normalised_scores": normalised_scores,
        "per_criterion": per_criterion
    }


def merge_into_matrix(
    score_matrix: List[List[float]],
    normalised_scores: Dict[str, float],
    criteria: List[str],
    alternatives: List[str]
) -> List[List[float]]:
    """
    Replaces columns in score_matrix with normalised real values
    where available. Columns with no real values stay as sliders.
    """
    matrix = [row[:] for row in score_matrix]  

    for j, crit in enumerate(criteria):
        for i, alt in enumerate(alternatives):
            key = f"{alt}__{crit}"
            if key in normalised_scores:
                matrix[i][j] = normalised_scores[key]

    return matrix