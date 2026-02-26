import numpy as np
import math
from typing import List



def entropy_weights(matrix, benefit):
    arr = np.array(matrix, dtype=float)
    m, n = arr.shape

    norm = np.zeros_like(arr)

    for j in range(n):
        col = arr[:, j]
        lo, hi = col.min(), col.max()
        rng = hi - lo

        if rng == 0:
            norm[:, j] = 1.0 / m  
        else:
            if benefit[j]:
                norm[:, j] = (col - lo) / rng
            else:
                norm[:, j] = (hi - col) / rng

    col_sums = norm.sum(axis=0)
    col_sums[col_sums == 0] = 1e-10

    p = norm / col_sums

    k = 1 / math.log(m) if m > 1 else 1
    e = -k * np.sum(p * np.log(p + 1e-15), axis=0)

    d = 1 - e
    d_sum = d.sum()
    w = d / d_sum if d_sum != 0 else np.ones(n) / n

    return w.tolist(), e.tolist()