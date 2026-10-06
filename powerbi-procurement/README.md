# Faizaan's Shop – Procurement & suppliers (Power BI)

Is folder mein sab kuch hai jo screenshot wala page banane ke liye chahiye.

| File | Kaam |
|---|---|
| `data/DimDate.csv`, `DimSupplier.csv`, `DimCategory.csv`, `FactProcurement.csv` | Dummy data (Jan 2025 – Sep 2026). 2026 ke numbers design se match: Spend $351.4M, OTD 93.4%, In-full 92.0%, Lead time 33.4 d, Reject 1.03% |
| `theme/FaizaansShop.json` | Colors, fonts, slicer / chart styling |
| `theme/background.png` | Page background (gradient + white cards + nav pill, 1280×720) |
| `measures.dax` | Saray DAX measures (KPIs, badges, colors, tooltip) |
| `generate_data.py` | Data dobara generate karne ke liye (`python3 generate_data.py`) |

## Step 1 – Data load
1. Power BI Desktop > **Get data > Text/CSV**, chaaron CSV load karein.
2. **Model view** mein relationships (many-to-one, single direction):
   - `FactProcurement[Date]` → `DimDate[Date]`
   - `FactProcurement[SupplierKey]` → `DimSupplier[SupplierKey]`
   - `FactProcurement[CategoryKey]` → `DimCategory[CategoryKey]`
3. `DimDate` ko **Mark as date table** (Date column). `DimDate[Month]` ko `MonthNum` se **Sort by column** karein.
4. `FactProcurement[Date]` Date type, `SpendUSD` Whole number / Currency.

## Step 2 – Theme + page setup
1. **View > Themes > Browse for themes** > `FaizaansShop.json`.
2. Page size: **Format page > Canvas settings > Type: Custom, 1280 × 720**.
3. **Format page > Canvas background > Image** > `background.png`, Fit = *Fit*, Transparency 0%.
4. Wallpaper transparent / same colour `#EAF6EF`.

## Step 3 – Measures
`_Measures` naam ka empty table banayen (`_Measures = ROW("x",1)`), phir `measures.dax` ka har measure **New measure** se paste karein.

## Step 4 – Visuals (canvas 1280×720, positions pixel mein: X, Y, W, H)

### Header
| Visual | Position | Setting |
|---|---|---|
| Logo | 26, 26, 38, 38 | Image/Text "IF" white on the dark tile |
| Title textbox "Faizaan's Shop" + subtitle "Global supply chain control tower" | 72, 24, 300, 44 | Semibold 14 / 9 pt grey |
| Nav buttons (Home, Executive, Finance, Inventory, Procurement, Logistics, Demand) | x 400–965, y 29, h 29 | 7 **Buttons**, no fill, white text 10pt, **Action = Page navigation**. *Procurement* ko green fill `#10B981` + rounded 14 |
| Card "Data Through" | 1030, 22, 220, 20 | Right aligned, 9pt. Neeche textbox "● Synthetic demo data · USD" |
| Page title "Procurement & suppliers" + subtitle "Spend, supplier reliability and lead times" | 29, 82, 420, 50 | Semibold 20pt / 9pt grey |

### Slicers (dropdown, background white pill already in image)
| Slicer | Field | Position |
|---|---|---|
| Year | `DimDate[Year]` (default 2026) | 656, 80, 130, 32 |
| Month | `DimDate[Month]` | 796, 80, 130, 32 |
| Region | `DimSupplier[Region]` | 936, 80, 129, 32 |
| Category | `DimCategory[Category]` | 1075, 80, 129, 32 |
| Refresh | Button, icon *Reset*, action **Clear all slicers** (bookmark) | 1214, 80, 32, 32 |

Slicer header ko "Year/Month/…" label bana kar left side rakhein, values right pe (Format > Slicer settings > Style: Dropdown).

### 5 KPI cards (white cards image mein hain) – Y = 128, H = 100, W = 233
X = **24, 271, 518, 765, 1012**. Har card mein:
1. **Textbox label** (7pt caps grey, green dot ●): SPEND / SUPPLIER ON-TIME / SUPPLIER IN-FULL / SUPPLIER LEAD TIME / REJECT RATE – (x+14, y+14)
2. **Card (new)** value, 28pt semibold: `[Spend Label]`, `[OTD Label]`, `[In-Full Label]`, `[Lead Time Label]`, `[Reject Label]` – (x+10, y+32, 120×40)
3. **Card** badge: `[Spend Badge]`… 8pt, **Background colour & Font colour = Format by Field value** (`... Badge Color`, `... Badge Font`), rounded – (x+14, y+72, 105×20)
4. **Area chart** (sparkline) – Axis `DimDate[YearMonth]`, Values = relevant measure (`[Spend]`, `[OTD %]`, `[In-Full %]`, `[Lead Time Days]`, `[Reject Rate]`). Axes/legend/labels off, line green `#10B981`, area fill light green 80% transparent – (x+120, y+25, 105×60). Filter pane: Year = 2026 (Sync slicer ke saath chale).

### Spend hierarchy (panel 24, 242, 787×451)
* Textbox heading **"Spend hierarchy"** (28, 252) + right side grey text "sourcing region › supplier › category › on-time status".
* **Decomposition tree** (35, 285, 765×400): Analyze = `[Spend]`; Explain by = `DimSupplier[Region]`, `DimSupplier[Supplier]`, `DimCategory[Category]`, `FactProcurement[OTDStatus]`. Colors: bar green, text navy, background transparent.
* Tooltip page (optional): "Supplier, Spend, Share of Region, OTD" – `[Share of Region]` aur `[OTD %]` use karein.

> Note: screenshot ka tree tiles ke andar "OTD 98%" badge aur progress bar dikhata hai – ye **custom visual / Deneb** se banta hai. Power BI ka native Decomposition tree bilkul same dikhna mushkil hai; layout, data aur numbers wahi rahenge. Chahein to main Deneb (Vega-Lite) spec bhi bana dunga.

### Lead time: actual vs planned (panel 826, 242, 420×218)
* Heading "Lead time: actual vs planned" + sub "days · by sourcing region".
* **Clustered column chart** (836, 275, 400×180): X = `DimSupplier[Region]`, Y = `[Lead Time Days]` (navy `#0B1630`) and `[Planned Lead Days]` (green `#10B981`). Data labels on (0 decimals), Y axis off, legend top ("Avg Supplier Lead Time", "Avg Planned Lead Time" – measures ke naam rename karein). Region ko `[Lead Time Days]` descending sort karein (Latin America → Europe).

### Spend by supplier tier (panel 826, 474, 420×219)
* Heading "Spend by supplier tier" + "USD".
* **Donut chart** (836, 505, 400×185): Legend = `DimSupplier[Tier]`, Values = `[Spend]`. Colors: Strategic navy `#0B1630`, Preferred green `#10B981`, Approved periwinkle `#5B6EF5`. Inner radius ~ 65%, detail labels outside (Data value, $M format `$#,0.00,,"M"`), legend right with title "Tier".

## Expected values (Year = 2026, All)
Spend $351.4M (▲10.6% vs PY) · OTD 93.4% · In-full 92.0% · Lead time 33.4 d · Reject 1.03%
Region spend: East Asia 151.6M, Europe 99.6M, North America 39.5M, SE Asia 33.5M, South Asia 16.6M, Latin America 10.6M
Tier: Strategic 94.1M, Preferred 174.0M, Approved 83.3M
