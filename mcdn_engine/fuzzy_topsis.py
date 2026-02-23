import numpy as np
import math
from typing import List
from mcdn_engine.tfn import val_to_tfn, tfn_mul, tfn_add, tfn_recip, defuzz, recip_tfn


def fuzzy_topsis(matrix: List[List[float]], weights: List[float], benefit: List[bool]):
    arr = np.array(matrix, dtype=float)
    m, n = arr.shape
    norm = np.zeros_like(arr)
    for j in range(n):
        col = arr[:,j]; mx = col.max()
        norm[:,j] = col/mx if mx!=0 else col

    sp = 0.1
    fmat = [[(norm[i,j]*(1-sp), norm[i,j], norm[i,j]*(1+sp)) for j in range(n)] for i in range(m)]
    w_tfn = [(weights[j]*(1-sp), weights[j], weights[j]*(1+sp)) for j in range(n)]
    vmat = [[tfn_mul(fmat[i][j], w_tfn[j]) for j in range(n)] for i in range(m)]

    fpis=[]; fnis=[]
    for j in range(n):
        cl=[vmat[i][j][0] for i in range(m)]; cm=[vmat[i][j][1] for i in range(m)]; cu=[vmat[i][j][2] for i in range(m)]
        if benefit[j]: fpis.append((max(cl),max(cm),max(cu))); fnis.append((min(cl),min(cm),min(cu)))
        else:          fpis.append((min(cl),min(cm),min(cu))); fnis.append((max(cl),max(cm),max(cu)))

    def dist(a,b): return math.sqrt(((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2)/3)
    d_pos=[sum(dist(vmat[i][j],fpis[j]) for j in range(n)) for i in range(m)]
    d_neg=[sum(dist(vmat[i][j],fnis[j]) for j in range(n)) for i in range(m)]
    cc=[d_neg[i]/(d_pos[i]+d_neg[i]) if (d_pos[i]+d_neg[i])>0 else 0 for i in range(m)]
    return cc, d_pos, d_neg