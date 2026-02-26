
def generate_recommendation(alternatives, scores, weights, criteria):
    best_idx = max(range(len(scores)), key=lambda i: scores[i])
    best_alt = alternatives[best_idx]

    sorted_crit = sorted(zip(criteria, weights), key=lambda x: x[1], reverse=True)
    top = sorted_crit[0][0]
    second = sorted_crit[1][0]

    return {
        "best": best_alt,
        "message": f"{best_alt} is the best choice mainly due to its strong performance in {top} and {second}.",
        "insight": f"{top} had the highest influence on your decision.",
    }