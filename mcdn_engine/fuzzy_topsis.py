import numpy as np
import math
from typing import List , Union, Tuple
from mcdn_engine.tfn import tfn_mul


def fuzzy_topsis(
    matrix: List[List[float]],
    weights: List[Union[float, Tuple[float, float, float]]],
    benefit: List[bool]
):
    arr = np.array(matrix, dtype=float)
    m, n = arr.shape

    #  Step 1: Vector normalization 
    norm = np.zeros_like(arr)
    for j in range(n):
        col = arr[:, j]
        den = np.sqrt(np.sum(col**2))
        norm[:, j] = col / den if den != 0 else col

    def compute_spread(col):
        std = np.std(col)
        mean = np.mean(col)
        return min(0.3, std / (abs(mean) + 1e-10))
 
    sp_list = [compute_spread(norm[:, j]) for j in range(n)]
    #  Construct fuzzy matrix
    fmat = [
    [
        (norm[i,j]*(1-sp_list[j]), norm[i,j], norm[i,j]*(1+sp_list[j]))
        for j in range(n)
    ]
    for i in range(m)
]

    w_tfn = []
    for w in weights:
        if isinstance(w, (list, tuple)) and len(w) == 3:
            w_tfn.append(tuple(w))
        else:
            # treat scalar as crisp weight
            w_tfn.append((w, w, w))

    #  Weighted fuzzy matrix
    vmat = [
        [tfn_mul(fmat[i][j], w_tfn[j]) for j in range(n)]
        for i in range(m)
    ]
    fpis, fnis = [], []
    for j in range(n):
        cl = [vmat[i][j][0] for i in range(m)]
        cm = [vmat[i][j][1] for i in range(m)]
        cu = [vmat[i][j][2] for i in range(m)]

        if benefit[j]:
            fpis.append((max(cl), max(cm), max(cu)))
            fnis.append((min(cl), min(cm), min(cu)))
        else:
            fpis.append((min(cl), min(cm), min(cu)))
            fnis.append((max(cl), max(cm), max(cu)))

    #  Distance function
    def dist(a, b):
        return math.sqrt(
            ((a[0] - b[0]) ** 2 +
             (a[1] - b[1]) ** 2 +
             (a[2] - b[2]) ** 2) / 3
        )

    d_pos = [
        sum(dist(vmat[i][j], fpis[j]) for j in range(n))
        for i in range(m)
    ]

    d_neg = [
        sum(dist(vmat[i][j], fnis[j]) for j in range(n))
        for i in range(m)
    ]

    # Closeness coefficient
    cc = [
        d_neg[i] / (d_pos[i] + d_neg[i]) if (d_pos[i] + d_neg[i]) > 1e-10 else 0
        for i in range(m)
    ]

    return cc, d_pos, d_neg