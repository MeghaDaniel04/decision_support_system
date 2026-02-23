import numpy as np
import math
from typing import List

from mcdn_engine.tfn import val_to_tfn, tfn_mul, tfn_add, tfn_recip, defuzz, recip_tfn

def fuzzy_ahp(n: int, pref: List[List[float]]):
    #  fuzzy pairwise matrix 
    fmat = []
    for i in range(n):
        row = []
        for j in range(n):
            if i == j:
                row.append((1.0, 1.0, 1.0))
            elif i < j:
                row.append(val_to_tfn(pref[i][j]))
            else:
                row.append(recip_tfn(val_to_tfn(pref[j][i])))
        fmat.append(row)

    row_sums = [tfn_add(fmat[i]) for i in range(n)]
    total = tfn_add(row_sums)
    tr = tfn_recip(total)
    extents = [tfn_mul(row_sums[i], tr) for i in range(n)]
    w_raw = [defuzz(e) for e in extents]
    s = sum(w_raw)
    weights = [w/s for w in w_raw]

    # Consistency check
    crisp = np.array([[defuzz(fmat[i][j]) for j in range(n)] for i in range(n)])
    ws = crisp @ np.array(weights)
    lam = float(np.mean([ws[i]/weights[i] if weights[i]>0 else 1 for i in range(n)]))
    ci = (lam - n)/(n-1) if n>1 else 0
    # up to 15 criteria
    ri_table = {1:0,2:0,3:.58,4:.9,5:1.12,6:1.24,7:1.32,8:1.41,9:1.45,10:1.49,11:1.51,12:1.54,13:1.56,14:1.57,15:1.58}
    ri = ri_table.get(n, 1.58)
    cr = ci/ri if ri>0 else 0
    return weights, round(lam,4), round(ci,4), round(cr,4)
