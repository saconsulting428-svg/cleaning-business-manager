"""Generates synthetic data for the 'Faizaan's Shop - Procurement & suppliers' Power BI page.

Run:  python3 generate_data.py
Output: ./data/*.csv  (DimDate, DimSupplier, DimCategory, FactProcurement)

Numbers are calibrated so 2026 (Jan-Sep) matches the reference design:
spend $351.4M, OTD 93.4%, in-full 92.0%, lead time 33.4 d, reject 1.03%,
region/supplier spend, tier split and lead-time-by-region chart.
"""
import csv
import os
import random
from datetime import date, timedelta

rnd = random.Random(42)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
os.makedirs(OUT, exist_ok=True)

# name, region, country, tier(auto), spend 2026 ($M), OTD target (None = region-calibrated), categories {name: weight}
SUPPLIERS = [
    # East Asia = 151.6
    ("Osaka Precision Devices", "East Asia", "Japan", 74.2, 0.980, {"Small Electronics": 1}),
    ("Dongguan Smart Home Tech", "East Asia", "China", 40.8, 0.983, {"Smart Home": 0.6, "Small Electronics": 0.4}),
    ("Shenzhen Voltline Electronics", "East Asia", "China", 14.4, 1.000, {"Components": 0.7, "Small Electronics": 0.3}),
    ("Seoul Derma Manufacturing", "East Asia", "South Korea", 7.5, 0.980, {"Personal Care": 1}),
    ("Busan Audio Components", "East Asia", "South Korea", 6.9, 0.980, {"Audio": 1}),
    ("Taipei Chipworks", "East Asia", "Taiwan", 3.2, 0.970, {"Components": 1}),
    ("Hanoi Packaging Group", "East Asia", "Vietnam", 2.6, 0.965, {"Packaging": 1}),
    ("Chengdu Textile Mills", "East Asia", "China", 2.0, 0.975, {"Textiles": 1}),
    # Europe = 99.6
    ("Stuttgart Motion Systems", "Europe", "Germany", 38.4, None, {"Smart Home": 0.5, "Components": 0.5}),
    ("Lyon Home Appliances", "Europe", "France", 27.1, None, {"Home Appliances": 1}),
    ("Milan Design Textiles", "Europe", "Italy", 16.3, None, {"Textiles": 0.6, "Packaging": 0.4}),
    ("Gdansk Components", "Europe", "Poland", 10.2, None, {"Components": 1}),
    ("Porto Packaging", "Europe", "Portugal", 7.6, None, {"Packaging": 1}),
    # North America = 39.5
    ("Austin Circuit Labs", "North America", "USA", 17.9, None, {"Small Electronics": 0.6, "Components": 0.4}),
    ("Toronto Home Goods", "North America", "Canada", 12.4, None, {"Home Appliances": 1}),
    ("Monterrey Assembly", "North America", "Mexico", 9.2, None, {"Audio": 0.5, "Components": 0.5}),
    # Southeast Asia = 33.5
    ("Penang Semiconductors", "Southeast Asia", "Malaysia", 14.6, None, {"Components": 1}),
    ("Bangkok Appliance Co", "Southeast Asia", "Thailand", 10.3, None, {"Home Appliances": 1}),
    ("Jakarta Textiles", "Southeast Asia", "Indonesia", 8.6, None, {"Textiles": 1}),
    # South Asia = 16.6
    ("Pune Auto Parts", "South Asia", "India", 9.1, None, {"Components": 1}),
    ("Dhaka Garments", "South Asia", "Bangladesh", 7.5, None, {"Textiles": 1}),
    # Latin America = 10.6
    ("Sao Paulo Plastics", "Latin America", "Brazil", 6.2, None, {"Packaging": 1}),
    ("Bogota Personal Care", "Latin America", "Colombia", 4.4, None, {"Personal Care": 1}),
]
TIER_TARGETS = {"Strategic": 941, "Preferred": 1740, "Approved": 833}  # in $0.1M units

REGION_OTD = {"Europe": 0.94, "North America": 0.93, "Southeast Asia": 0.89, "South Asia": 0.93}
REGION_LEAD = {"Latin America": 42, "Southeast Asia": 38, "South Asia": 36, "North America": 33, "East Asia": 32, "Europe": 29}
REGION_PLAN = {"Latin America": 44, "Southeast Asia": 41, "South Asia": 40, "North America": 36, "East Asia": 35, "Europe": 32}
REGIONS = list(REGION_LEAD)

T_SPEND, T_OTD, T_IF, T_LEAD, T_REJ = 351.4e6, 0.934, 0.920, 33.4, 0.0103
PY_GROWTH = 1.104

# ---------------------------------------------------------------- tiers (subset search so the donut matches)
vals = [int(round(s[3] * 10)) for s in SUPPLIERS]
def find_tiers():
    for _ in range(200000):
        idx = list(range(len(vals)))
        rnd.shuffle(idx)
        strat, acc = [], 0
        for i in idx:
            if acc + vals[i] <= TIER_TARGETS["Strategic"]:
                strat.append(i); acc += vals[i]
        if acc != TIER_TARGETS["Strategic"] or 0 not in strat:
            continue
        rest = [i for i in idx if i not in strat]
        pref, acc2 = [], 0
        for i in rest:
            if acc2 + vals[i] <= TIER_TARGETS["Preferred"]:
                pref.append(i); acc2 += vals[i]
        if acc2 == TIER_TARGETS["Preferred"]:
            return {i: "Strategic" for i in strat} | {i: "Preferred" for i in pref} | \
                   {i: "Approved" for i in rest if i not in pref}
    raise SystemExit("no tier split found")
TIER = find_tiers()

# ---------------------------------------------------------------- order shares per region (matches KPI lead time / plan)
SPEND_R = {r: sum(s[3] for s in SUPPLIERS if s[1] == r) for r in REGIONS}
region_otd_known = {"East Asia": 0.982, **REGION_OTD}
def solve_shares():
    best = None
    for _ in range(2000000):
        w = [rnd.uniform(0.04, 0.5) for _ in REGIONS]
        t = sum(w); sh = dict(zip(REGIONS, [x / t for x in w]))
        lead = sum(sh[r] * REGION_LEAD[r] for r in REGIONS)
        plan = sum(sh[r] * REGION_PLAN[r] for r in REGIONS)
        if abs(lead - T_LEAD) > 0.01 or abs((plan - lead) - 2.9) > 0.06:
            continue
        known = sum(sh[r] * region_otd_known[r] for r in region_otd_known)
        la = (T_OTD - known) / sh["Latin America"]
        if not 0.80 <= la <= 0.95:
            continue
        aov_ok = all(1500 <= SPEND_R[r] * 1e6 / (sh[r] * 60000) <= 40000 for r in REGIONS)
        if not aov_ok:
            continue
        score = abs(la - 0.88)
        if best is None or score < best[0]:
            best = (score, sh, la)
    if not best:
        raise SystemExit("share search failed")
    return best[1], best[2]
SHARE, LA_OTD_GUESS = solve_shares()

# ---------------------------------------------------------------- skeleton rows
M26 = [0.098, 0.115, 0.108, 0.111, 0.113, 0.116, 0.114, 0.112, 0.113]
M25 = [0.075, 0.082, 0.079, 0.081, 0.083, 0.085, 0.084, 0.083, 0.082, 0.086, 0.088, 0.092]
OTD_T = [-1.2, -0.4, -0.9, -0.3, -0.6, 0.0, 0.2, 0.5, 1.3]
IF_T = [-2.0, -1.4, -1.0, -0.8, -1.2, -0.3, 0.3, 0.8, 1.6]
REJ_T = [1.0, 0.85, 1.15, 0.8, 1.05, 0.85, 0.95, 0.8, 1.45]
LEAD_T = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.985, 0.93]

def norm(w):
    t = sum(w); return [x / t for x in w]
M26n = norm(M26)

sup_rows = []  # supplier dicts
s25_raw = [s[3] * 1e6 / PY_GROWTH * rnd.uniform(0.96, 1.04) for s in SUPPLIERS]
k = (T_SPEND / PY_GROWTH) / sum(s25_raw)
FRAC = sum(M25[:9]) / sum(M25)  # Jan-Sep share of the 2025 year
s25 = [int(round(x * k / FRAC)) for x in s25_raw]

rows = []
for si, (name, region, country, sm, otd_t, cats) in enumerate(SUPPLIERS):
    s26 = int(round(sm * 1e6))
    aov = SPEND_R[region] * 1e6 / (SHARE[region] * 60000) * rnd.uniform(0.8, 1.2)
    base_if = rnd.uniform(0.905, 0.935)
    base_rej = rnd.uniform(0.006, 0.016)
    base_lead_off = rnd.uniform(-0.06, 0.06)
    plan_off = rnd.uniform(-0.03, 0.03)
    upo = rnd.uniform(300, 900)   # units per order
    sup = dict(si=si, base_if=base_if, base_rej=base_rej)
    for year, total, weights in ((2026, s26, M26n), (2025, s25[si], norm(M25))):
        months = len(weights)
        parts = []
        for m in range(months):
            for cat, cw in cats.items():
                parts.append((m, cat, weights[m] * cw * rnd.uniform(0.95, 1.05)))
        t = sum(p[2] for p in parts)
        spends = [int(round(total * p[2] / t)) for p in parts]
        spends[spends.index(max(spends))] += total - sum(spends)
        for (m, cat, _), sp in zip(parts, spends):
            orders = max(1, int(round(sp / (aov * (0.97 if year == 2025 else 1)) * rnd.uniform(0.92, 1.08))))
            rows.append(dict(
                year=year, m=m, si=si, region=region, cat=cat, spend=sp, orders=orders,
                n_otd=rnd.uniform(-0.012, 0.012), n_if=rnd.uniform(-0.012, 0.012), n_rej=rnd.uniform(0.85, 1.15),
                n_lead=rnd.uniform(0.97, 1.03) * (1 + base_lead_off), n_plan=1 + plan_off + rnd.uniform(-0.01, 0.01),
                upo=upo * rnd.uniform(0.9, 1.1), base_if=base_if, base_rej=base_rej, otd_t=otd_t))

for reg in REGIONS:
    rs = [r for r in rows if r["year"] == 2026 and r["region"] == reg]
    kk = SHARE[reg] * 60000 / sum(r["orders"] for r in rs)
    for r in rs:
        r["orders"] = max(1, round(r["orders"] * kk))

PYSHIFT = lambda r: (-1.5 if r["year"] == 2025 else 0.0)

# ---------------------------------------------------------------- calibration
def otd_rate(r, shift):
    if r["otd_t"] is not None and r["otd_t"] >= 0.999:
        return 1.0
    base = r["otd_t"] if r["otd_t"] is not None else REGION_OTD.get(r["region"], LA_OTD_GUESS)
    t = OTD_T[r["m"]] if r["year"] == 2026 else (OTD_T[r["m"]] if r["m"] < 9 else 0) - 1.5
    return min(1.0, max(0.5, base + shift + t / 100 + r["n_otd"]))

def rate_of(rs, key, shift):
    on = sum(round(r["orders"] * (otd_rate(r, shift) if key == "otd" else 0)) for r in rs)
    return on / sum(r["orders"] for r in rs)

def bisect(fn, target, lo=-0.3, hi=0.3):
    for _ in range(60):
        mid = (lo + hi) / 2
        if fn(mid) < target: lo = mid
        else: hi = mid
    return (lo + hi) / 2

r26 = [r for r in rows if r["year"] == 2026]
# OTD: per supplier fixed targets (East Asia) / per region (others) / Latin America solved to hit overall 93.4%
shift = {}
for r in rows:
    r["key"] = None
for si, s in enumerate(SUPPLIERS):
    if s[4] is not None:
        rs = [r for r in r26 if r["si"] == si]
        shift[("s", si)] = 0.0 if s[4] >= 0.999 else bisect(lambda d: rate_of(rs, "otd", d), s[4])
for reg, tgt in REGION_OTD.items():
    rs = [r for r in r26 if r["region"] == reg]
    shift[("r", reg)] = bisect(lambda d: rate_of(rs, "otd", d), tgt)
def shift_for(r, la):
    if r["region"] == "Latin America": return la
    if r["region"] == "East Asia":
        return shift[("s", r["si"])] if SUPPLIERS[r["si"]][4] is not None else 0
    return shift[("r", r["region"])]
def overall_otd(la):
    on = tot = 0
    for r in r26:
        on += round(r["orders"] * otd_rate(r, shift_for(r, la))); tot += r["orders"]
    return on / tot
LA_SHIFT = bisect(overall_otd, T_OTD)
for r in rows:
    r["otd"] = otd_rate(r, shift_for(r, LA_SHIFT))
    r["n_ontime"] = round(r["orders"] * r["otd"])

# In-full: global additive shift so 2026 overall = 92.0%
def if_rate(r, sh):
    t = (IF_T[r["m"]] if r["m"] < 9 else 0) / 100 - (0.015 if r["year"] == 2025 else 0)
    return min(1.0, r["base_if"] + sh + t + r["n_if"])
IF_SHIFT = bisect(lambda d: sum(round(r["orders"] * if_rate(r, d)) for r in r26) / sum(r["orders"] for r in r26), T_IF)
for r in rows:
    r["n_infull"] = round(r["orders"] * if_rate(r, IF_SHIFT))

# Reject rate: global multiplier so 2026 overall = 1.03%
def units(r): return max(1, round(r["orders"] * r["upo"]))
def rej_rate(r, mult):
    t = REJ_T[r["m"]] if r["m"] < 9 else 1.0
    return r["base_rej"] * mult * t * r["n_rej"] * (1.12 if r["year"] == 2025 else 1)
REJ_MULT = bisect(lambda d: sum(round(units(r) * rej_rate(r, d)) for r in r26) / sum(units(r) for r in r26), T_REJ, 0.01, 5)
for r in rows:
    r["units"] = units(r); r["rejected"] = round(r["units"] * rej_rate(r, REJ_MULT))

# Lead times: scale 2026 per region so the chart shows exact region averages; 2025 a bit longer
for year in (2026, 2025):
    f = 1.0 if year == 2026 else 1.04
    for reg in REGIONS:
        rs = [r for r in rows if r["year"] == year and r["region"] == reg]
        o = sum(r["orders"] for r in rs)
        for key, tgt, out in (("n_lead", REGION_LEAD[reg], "lead"), ("n_plan", REGION_PLAN[reg], "plan")):
            tm = LEAD_T if key == "n_lead" else [1] * 9
            raw = [r["orders"] * r[key] * (tm[r["m"]] if r["m"] < 9 else 1) for r in rs]
            k = tgt * o / sum(raw)
            for r, x in zip(rs, raw):
                r[out] = round(x * k * (f if key == "n_lead" else 1), 2)

# ---------------------------------------------------------------- write CSVs
def month_start(r): return date(r["year"], r["m"] + 1, 1)
def band(x): return "On time" if x >= 0.95 else ("At risk" if x >= 0.90 else "Late")

with open(f"{OUT}/DimSupplier.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["SupplierKey", "Supplier", "Region", "Country", "Tier"])
    for si, s in enumerate(SUPPLIERS):
        w.writerow([si + 1, s[0], s[1], s[2], TIER[si]])

cats = sorted({c for s in SUPPLIERS for c in s[5]})
with open(f"{OUT}/DimCategory.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["CategoryKey", "Category"])
    for i, c in enumerate(cats): w.writerow([i + 1, c])

with open(f"{OUT}/DimDate.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["Date", "Year", "MonthNum", "Month", "YearMonth", "Quarter"])
    d = date(2025, 1, 1)
    while d <= date(2026, 9, 30):
        w.writerow([d.isoformat(), d.year, d.month, d.strftime("%b"), d.strftime("%Y-%m"), f"Q{(d.month - 1) // 3 + 1}"])
        d += timedelta(days=1)

with open(f"{OUT}/FactProcurement.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["Date", "SupplierKey", "CategoryKey", "SpendUSD", "Orders", "OnTimeOrders", "InFullOrders",
                "ActualLeadDaysTotal", "PlannedLeadDaysTotal", "UnitsReceived", "UnitsRejected", "OTDStatus"])
    for r in sorted(rows, key=lambda r: (r["year"], r["m"], r["si"], r["cat"])):
        w.writerow([month_start(r).isoformat(), r["si"] + 1, cats.index(r["cat"]) + 1, r["spend"], r["orders"],
                    r["n_ontime"], r["n_infull"], round(r["lead"], 2), round(r["plan"], 2),
                    r["units"], r["rejected"], band(r["n_ontime"] / r["orders"])])

# ---------------------------------------------------------------- check
def kpis(rs):
    o = sum(r["orders"] for r in rs)
    return dict(spend_M=sum(r["spend"] for r in rs) / 1e6, otd=sum(r["n_ontime"] for r in rs) / o,
                infull=sum(r["n_infull"] for r in rs) / o, lead=sum(r["lead"] for r in rs) / o,
                plan=sum(r["plan"] for r in rs) / o, reject=sum(r["rejected"] for r in rs) / sum(r["units"] for r in rs))
if __name__ == "__main__":
    k26 = kpis(r26); k25 = kpis([r for r in rows if r["year"] == 2025 and r["m"] < 9])
    print("2026:", {a: round(b, 4) for a, b in k26.items()})
    print("spend vs PY: %+.1f%%" % ((k26["spend_M"] / k25["spend_M"] - 1) * 100))
    for reg in REGIONS:
        rs = [r for r in r26 if r["region"] == reg]; k = kpis(rs)
        print(f"{reg:15s} spend {k['spend_M']:7.1f}M OTD {k['otd']*100:5.1f}% lead {k['lead']:.1f} plan {k['plan']:.1f}")
    for t in ("Strategic", "Preferred", "Approved"):
        print(t, round(sum(r["spend"] for r in r26 if TIER[r["si"]] == t) / 1e6, 2))
    print("rows:", len(rows))
