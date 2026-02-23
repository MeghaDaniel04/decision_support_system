def tfn_mul(a,b): return (a[0]*b[0], a[1]*b[1], a[2]*b[2])
def tfn_add(ts): return (sum(x[0] for x in ts), sum(x[1] for x in ts), sum(x[2] for x in ts))
def tfn_recip(a): return (1/a[2], 1/a[1], 1/a[0])
def defuzz(t): return (t[0]+t[1]+t[2])/3

# Continuous slider value (1–9) → TFN

def val_to_tfn(v: float):
    """Map preference value 1..9 (float) to triangular fuzzy number."""
    v = max(1.0, min(9.0, v))
    l = max(1.0, v - 1.0)
    u = min(9.0, v + 1.0)
    return (l, v, u)

def recip_tfn(t):
    return (1/t[2], 1/t[1], 1/t[0])


