import numpy as np


def generate_recommendation(
    alternatives,
    matrix,
    scores,
    weights,
    criteria,
    benefit,
    sensitivity_result=None
):

    if not alternatives or not scores:
        return {"error": "No alternatives or scores provided."}

    weights = list(weights)   
    matrix  = np.array(matrix, dtype=float)
    scores  = list(scores)

    n_alts, n_crit = matrix.shape

    # Best alternative 
    best_idx = max(range(len(scores)), key=lambda i: scores[i])
    best_alt = alternatives[best_idx]

    #  Vector normalisation (consistent with TOPSIS)
    norm = np.zeros_like(matrix)
    for j in range(n_crit):
        col = matrix[:, j]
        den = np.sqrt((col ** 2).sum())
        norm[:, j] = col / den if den != 0 else col

    #  Contribution = weight × normalised score
    contributions = []
    for j in range(n_crit):
        contrib = weights[j] * norm[best_idx][j]
        contributions.append({
            "criterion": criteria[j],
            "contribution": contrib,
            "norm_score": norm[best_idx][j],
            "is_benefit": benefit[j],
        })

    contributions.sort(key=lambda x: x["contribution"], reverse=True)

    strengths = [
        c["criterion"] for c in contributions
        if c["is_benefit"]
    ][:2]

    weaknesses = [
        c["criterion"] for c in reversed(contributions)
        if c["is_benefit"] and c["criterion"] not in strengths
    ][:2]

    most_important_idx = int(np.argmax(weights))
    most_important = criteria[most_important_idx]

    if len(strengths) >= 2:
        message = (
            f"{best_alt} is the best choice because it performs strongly in "
            f"{strengths[0]} and {strengths[1]}, which carry the highest "
            f"combined influence on the final ranking."
        )
    elif len(strengths) == 1:
        message = (
            f"{best_alt} is the best choice due to its strong performance "
            f"in {strengths[0]}."
        )
    else:
        message = (
            f"{best_alt} achieves the highest overall score across the "
            f"evaluated criteria."
        )

    if sensitivity_result:
        if sensitivity_result.get("stable", False):
            confidence_msg = (
                "This result remains stable even when preference weights are varied."
            )
        else:
            sensitive_criteria = [
                c["criterion_name"]
                for c in sensitivity_result.get("criteria_sensitivity", [])
                if c.get("ever_changes")
            ]
            if sensitive_criteria:
                listed = ", ".join(sensitive_criteria[:2])
                confidence_msg = (
                    f"This result is sensitive to changes in {listed}. "
                    f"Review these criteria before finalising the decision."
                )
            else:
                confidence_msg = (
                    "This result may vary under different preference configurations."
                )
    else:
        confidence_msg = "Sensitivity analysis was not performed for this session."

    return {
        "best":       best_alt,
        "message":    message,
        "strengths":  strengths,
        "weaknesses": weaknesses,
        "insight":    f"{most_important} carried the highest weight in this decision.",
        "confidence": confidence_msg,
    }