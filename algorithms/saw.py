def normalize_weights(criteria):
    total = sum(criteria.values())
    return {k: v / total for k, v in criteria.items()}


def normalize_scores(options, criteria, scores, criteria_type):
    normalized = {opt: {} for opt in options}

    for crit in criteria:
        values = [scores[opt].get(crit, 0) for opt in options]
        max_val = max(values)
        min_val = min(values)

        for opt in options:
            val = scores[opt].get(crit, 0)

            if criteria_type[crit] == "benefit":
                normalized[opt][crit] = val / max_val if max_val != 0 else 0

            elif criteria_type[crit] == "cost":
                normalized[opt][crit] = min_val / val if val != 0 else 0

    return normalized


def calculate_saw(options, criteria, scores, criteria_type):
    weights = normalize_weights(criteria)
    norm_scores = normalize_scores(options, criteria, scores, criteria_type)

    results = {}

    for opt in options:
        total = 0
        for crit, weight in weights.items():
            total += weight * norm_scores[opt][crit]

        results[opt] = round(total, 3)

    return results


def rank_options(results):
    return sorted(results.items(), key=lambda x: x[1], reverse=True)