import numpy as np
import math
from typing import List



def entropy_weights(matrix: List[List[float]], benefit: List[bool]):
    arr = np.array(matrix, dtype=float)
    m, n = arr.shape
    norm = np.zeros_like(arr)
    for j in range(n):
        col = arr[:,j]; lo,hi = col.min(),col.max(); rng = hi-lo if hi!=lo else 1
        norm[:,j] = (col-lo)/rng if benefit[j] else (hi-col)/rng
    norm = np.where(norm==0, 1e-10, norm)
    p = norm / norm.sum(axis=0)
    k = 1/math.log(m) if m>1 else 1
    e = -k * np.sum(p*np.log(p+1e-15), axis=0)
    d = 1-e; w = d/d.sum()
    return w.tolist(), e.tolist()