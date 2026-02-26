from mcdn_engine.fuzzy_topsis import fuzzy_topsis

def sensitivity_analysis(alternatives, matrix, weights, benefit, criteria_names=None):
    base_cc, _, _ = fuzzy_topsis(matrix, weights, benefit)
    base_best_idx = max(range(len(base_cc)), key=lambda i: base_cc[i])
    base_best = alternatives[base_best_idx]
    base_score = base_cc[base_best_idx]

    perturbation_factors = [0.8, 0.9, 1.1, 1.2, 1.5]
    results = []

    for i in range(len(weights)):
        criterion_result = {
            "criterion_index": i,
            "criterion_name": criteria_names[i] if criteria_names else f"C{i+1}",
            "base_weight": round(weights[i], 4),
            "perturbations": [],
            "ever_changes": False,
        }

        for factor in perturbation_factors:
            new_w = weights[:]
            new_w[i] *= factor

            s = sum(new_w)
            new_w = [w / s for w in new_w] if s else [1.0 / len(new_w)] * len(new_w)

            cc, _, _ = fuzzy_topsis(matrix, new_w, benefit)
            new_best_idx = max(range(len(cc)), key=lambda x: cc[x])
            new_best = alternatives[new_best_idx]
            changed = new_best != base_best

            if changed:
                criterion_result["ever_changes"] = True

            criterion_result["perturbations"].append({
                "factor": factor,
                "new_weight": round(new_w[i], 4),
                "winner": new_best,
                "winner_score": round(cc[new_best_idx], 4),
                "changed": changed,
                "score_delta": round(cc[new_best_idx] - base_score, 4),
            })

        results.append(criterion_result)

    return {
        "base_winner": base_best,
        "base_score": round(base_score, 4),
        "stable": not any(r["ever_changes"] for r in results),
        "criteria_sensitivity": results,
    }