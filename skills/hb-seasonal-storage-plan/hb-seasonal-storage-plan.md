---
name: hb-seasonal-storage-plan
description: Use this skill when the user mentions seasonal changes, weather, or clothing transitions — for example "winter to spring plan", "summer to autumn plan", "it's getting hot", "need my shorts", "time to swap winter clothes", or any prompt about changing seasons, packing away seasonal items, or retrieving stored clothing and bedding. This skill connects to the Housekeeper Bee MCP server, fetches all storage boxes, classifies them by season, and generates a full HTML action dashboard with scannable EAN-13 barcodes. It also handles quick item searches when the user just wants to find a specific seasonal item without running the full plan.
---
 
# Housekeeper Bee — MCP Seasonal Analysis Specification
*Version 3.0 · Updated March 2026*
 
---
 
## How to Use This File
 
Upload this file once to **Claude → Customize → Skills** so it is available in every new chat
without uploading again. Then, with the **Housekeeper Bee MCP server** connected, just type a
natural prompt — Claude will detect your intent and either act immediately or ask a quick
clarifying question before proceeding.
 
Example prompts that trigger this skill:
 
```
"winter to spring plan"           ← explicit: runs full dashboard immediately
"it's getting hot, need shorts"   ← casual: Claude asks before acting
"where are my summer clothes?"    ← search: Claude searches, no dashboard
"summer to autumn plan"           ← explicit: runs full dashboard immediately
```
 
---
 
## Intent Detection
 
**Claude must read the prompt carefully and classify the intent BEFORE doing any work.**
Do not jump straight to generating the dashboard unless the intent is clearly explicit.
 
### Intent Types and Actions
 
| Intent Type | Signal Examples | Claude's Action |
|---|---|---|
| **Explicit plan** | "winter to spring plan", "autumn to winter plan", "spring to summer plan" | Run full analysis and generate HTML dashboard immediately — no need to ask |
| **Seasonal hint** | "it's hot", "getting cold", "need shorts", "weather is warm", "summer coming", "冬天到了", "好熱", "好凍" | Ask the clarifying question below before acting |
| **Item search** | "where are my shorts?", "find my winter coat", "which box has swimwear?", "我的短褲在哪?" | Use `findStorageBoxes` to search — reply with matching boxes only, no dashboard |
| **Unrelated** | General chat, questions not about storage | Do not trigger this skill |
 
### Clarifying Question (for Seasonal Hint intent)
 
When the prompt is a seasonal hint, respond conversationally and ask:
 
> *"Sounds like the season is changing! Would you like me to:*
> *(a) Search for a specific item — tell me what you're looking for, or*
> *(b) Run the full [current season] → [next season] plan — I'll fetch all your boxes, classify them, and build a complete action dashboard?"*
 
Wait for the user's answer before proceeding. Do not fetch any data yet.
 
### Season Direction Detection (for Seasonal Hints)
 
If the user confirms they want a full plan but hasn't specified the direction, infer from context:
 
| Hint context | Infer transition |
|---|---|
| "hot", "warm", "need shorts", "夏天", "好熱" | Winter → Spring or Spring → Summer |
| "cold", "getting chilly", "need coat", "冬天", "好凍" | Autumn → Winter or Summer → Autumn |
 
If still ambiguous, ask: *"Are we heading into summer or winter?"*
 
---
 
## About This System
 
**Family:** My Dream House
**Members:** Thomas, Ada, Peter
**System:** Housekeeper Bee — a household storage management system
**MCP Tool:** `findStorageBoxes` with keyword `*` fetches all storage boxes
 
### Key DB Fields per Box
 
| Field | Description | Example |
|---|---|---|
| `storageName` | Box name | `"Peter Summer Shirts (1)"` |
| `storageDesc` | Contents description | `"short-sleeve shirts, shorts"` |
| `storageStatus` | Occupancy | `"Check-In, full"` |
| `locationName` | Physical location | `"Master bedroom under-bed"` |
| `familyName` | Family group | `"My Dream House"` |
| `tags` | Array of labels | `["peter","clothing","summer"]` |
| `barcode` | Barcode string (may be empty) | `"0000001000030"` |
 
> ⚠️ **Not all boxes have barcodes.** Roughly half do. Always check if `barcode` is a
> non-empty string before rendering. Show a "No barcode" placeholder for boxes without one.
 
### Known Locations in the Home
- Peter bedroom (top of wardrobe)
- Peter bedroom - bed wardrobe
- Peter bedroom - window ledge
- Master bedroom under-bed ← most crowded, 10+ boxes
- Master bedroom top cabinet
- Living room bookcase lower shelf
- Living room white cabinet
- Living room white low cabinet
- Living room TV cabinet
- Living room white long storage rack
- Top of bookcase (orange bag)
 
### Known Tags in the System
**Season:** `summer`, `winter`
**Chinese season hints:** `夏天` / `夏` = summer · `冬天` / `冬` = winter
**People:** `peter`, `thomas`, `ada`
**Category:** `clothing`, `bedding`, `toys`, `collectibles`, `sports`, `electronics`, `tools`, `archive`, `gaming`, `supplies`, `documents`, `bags`, `books`, `uniform`, `school`
 
---
 
## Seasonal Classification Logic
 
```
tags + storageName + storageDesc → combined text (lowercase)
 
has BOTH summer AND winter keywords → action: "sort"    (mixed box, needs separating first)
has ONLY summer keywords           → action: "retrieve" (bring out for the new season)
has ONLY winter keywords           → action: "store"    (pack away)
neither                            → action: "keep"     (no seasonal action needed)
```
 
**Summer keywords:** `summer`, `夏天`, `夏`
**Winter keywords:** `winter`, `冬天`, `冬`
 
---
 
## Season Transition Prompts
 
| User says | Retrieve (bring out) | Store away (pack away) |
|---|---|---|
| `"winter to spring"` | Summer-tagged boxes | Winter-tagged boxes |
| `"spring to summer"` | Summer-tagged boxes | Winter-tagged boxes |
| `"summer to autumn"` | Winter-tagged boxes | Summer-tagged boxes |
| `"summer to winter"` | Winter-tagged boxes | Summer-tagged boxes |
| `"autumn to winter"` | Winter-tagged boxes | Summer-tagged boxes |
 
---
 
## Required Analysis Steps
 
*(Only run these steps after intent is confirmed as a full plan)*
 
1. **Fetch all boxes** using MCP `findStorageBoxes` with keyword `*`
2. **Classify each box** using the seasonal logic above
3. **Count by action:** retrieve / store / sort / keep
4. **Group by person:** Peter, Thomas, Ada (from tags)
5. **Group by category:** from tags
6. **Identify most crowded location** (count boxes per locationName)
7. **Flag mixed boxes** that contain both seasons (need sorting first)
8. **Check barcode field** for each box — render barcode if non-empty, placeholder if empty
9. **Generate HTML output** with all sections below
 
---
 
## Item Search Steps
 
*(Only run these steps when intent is item search)*
 
1. Extract the item keyword(s) from the user's prompt
2. Use MCP `findStorageBoxes` with those keywords
3. Return a concise list of matching boxes: name · location · description · barcode (if any)
4. Do **not** generate the full HTML dashboard
5. Offer to run the full seasonal plan if relevant:
   > *"Found X matching boxes. Want me to run the full seasonal plan to organise everything at once?"*
 
---
 
## Barcode Rendering
 
### Purpose
Each box card shows a scannable barcode. The user scans it with the **HB iOS app**
to instantly open that box's detail page, view photos, and see full contents —
without any typing or searching.
 
### Implementation — JsBarcode via CDN
 
```html
<!-- Add to <head> -->
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/barcodes/JsBarcode.ean-upc.min.js"></script>
 
<!-- For each box WITH a barcode value, add this SVG -->
<svg class="barcode" data-barcode="0000001000030"></svg>
<p style="font-size:10px;text-align:center;color:#6b7280;">📱 Scan with HB iOS App</p>
 
<!-- At end of <body>, initialise all barcodes -->
<script>
  document.querySelectorAll('.barcode').forEach(el => {
    JsBarcode(el, el.dataset.barcode, {
      format: "EAN13",
      width: 2.25,
      height: 60,
      displayValue: true,
      fontSize: 14,
      margin: 6
    });
  });
</script>
```
 
> ⚠️ **EAN-13 requires exactly 13 digits.** All HB barcodes are 13-digit numeric strings
> (e.g. `0000001000030`). If a barcode value is not exactly 13 digits, skip rendering
> and show the "No barcode" placeholder instead to avoid JsBarcode errors.
 
### Barcode Display Rules
 
| Condition | What to render |
|---|---|
| `barcode` is a non-empty string | `<svg class="barcode" data-barcode="VALUE">` + scan label |
| `barcode` is empty or missing | Grey pill showing `"— No barcode —"` |
 
### Box Card Layout
 
```
┌─────────────────────────────────────────────────────┐
│  [🌸 RETRIEVE]  Peter Summer Shirts (1)                       │
│                 Summer waterproof raincoat             │
│                 📍 Peter bedroom · 👤 Peter            │
│                 🏷 peter, clothing, summer            │
│  ┌─────────────────────────┐                        │
│  │ ▐█▌▌█▐▌▌▐▌▐██▌▐█▌▐▌▐▌ │  ← barcode SVG         │
│  │     0 0 0 0 0 0 1 0 0  │  ← numeric value       │
│  └─────────────────────────┘                        │
│         📱 Scan with HB iOS App                     │
└─────────────────────────────────────────────────────┘
 
┌─────────────────────────────────────────────────────┐
│  [📦 STORE]     Ada冬天被鋪                       │
│                 Bed covers, blankets x3               │
│                 📍 Master bedroom under-bed · 👤 Ada  │
│                 🏷 ada, bedding, winter           │
│                 ── No barcode ──                    │
└─────────────────────────────────────────────────────┘
```
 
### Boxes WITH Barcodes (~23 of 53 boxes)
 
| Box Name | Barcode |
|---|---|
| Peter Summer Shirts (1) | 0000001000030 |
| Peter Summer Shirts (2) | 0000001000054 |
| 紫色被袋(Peter) | 0251119000102 |
| Thomas 冬天長袖褸 | 0251119000041 |
| Thomas Summer Shirts | 0250208000061 |
| Thomas Summer Duvet | 0251119000096 |
| 花花壓縮袋Thomas冬天衫 | 0250208000078 |
| JR紅色膠箱 (Peter) 1 | 0250513000022 |
| JR紅色膠箱 (Peter) 2 | 0000001000016 |
| JR藍色膠箱 (Peter) 1 | 0000001000009 |
| JR藍色膠箱 (Peter) 2 | 0250513000015 |
| Black Cable box | 0000001000061 |
| Beige Storage Box (2) | 0000001000047 |
| 防潮箱（Thomas and Ada）| 0000001000023 |
| Asus router box | 0251119000089 |
| Game Console & Accessories | 8000000100054 |
| White Plastic Box | 8000000100016 |
| 美心紙盒 | 8000000100047 |
| 美心盒二號 | 0250208000009 |
| Beige Storage Box (1) | 0250208000030 |
| ORICO Red Box | 0250208000023 |
| ORICO Blue Box | 0250208000016 |
| Blue box (cables) | 0250208000047 |
 
> 💡 Recommend users add barcodes to remaining boxes so all become scannable over time.
 
---
 
## Output Format
 
*(For full seasonal plan only)*
 
Produce a **self-contained HTML page** with these sections:
 
**1. Header** — title, family name, box count, date
 
**2. Summary Cards (4)** — Retrieve · Store Away · Sort · Keep counts
 
**3. Action Breakdown Chart** — SVG or CSS bars, no external chart libraries
 
**4. Actions by Person Chart** — Peter / Thomas / Ada breakdown
 
**5. Boxes by Category Chart** — horizontal bars per category tag
 
**6. Full Action Plan — Box Cards**
- Grouped by action: Retrieve first → Sort → Store → Keep
- Each card shows: action badge · name · description · location · person · tags · barcode (or placeholder)
- Colour coded: green=retrieve, orange=store, yellow=sort, grey=keep
 
**7. Key Recommendations**
- 🌸 What to retrieve and where to place it
- 📦 What to pack away (suggest vacuum/compression bags)
- 🔄 Which mixed boxes need sorting first
- 🏷️ Label stored boxes with season + year
- 🪴 Declutter suggestion for most crowded location
- 📲 Reminder: scan barcodes with HB iOS App to view photos and details
 
### HTML Rules
- Single self-contained file
- JsBarcode loaded from CDN using `JsBarcode.ean-upc.min.js` — renders EAN-13 barcodes
- All other styles in `<style>` block or inline — no other external dependencies
- Mobile-friendly flexbox layout
- Print-friendly (barcodes visible when printed)
- Colour palette: Retrieve `#22c55e`, Store `#f97316`, Sort `#eab308`, Keep `#94a3b8`
 
---
 
## Quick Reference — Seasonal Boxes
 
### Retrieve for Spring/Summer (have `summer`/`夏` tags)
| Box | Barcode |
|---|---|
| Peter Summer Shirts (1) | 0000001000030 |
| Peter Summer Shirts (2) | 0000001000054 |
| Peter Summer Swimwear | — |
| Thomas Summer Shirts | 0250208000061 |
| Thomas Summer Duvet | 0251119000096 |
 
### Retrieve for Autumn/Winter (have `winter`/`冬` tags)
| Box | Barcode |
|---|---|
| Ada冬天被鋪 | — |
| Thomas 冬天長袖褸 | 0251119000041 |
| 花花壓縮袋Thomas冬天衫 | 0250208000078 |
| 黃色旅行袋(Peter) | — |
 
### Sort First (mixed season)
| Box | Barcode | Why |
|---|---|---|
| 紫色被袋(Peter) | 0251119000102 | Contains both summer and winter items |
 
---
 
*Specification version: 3.0 · March 2026 · My Dream House · Housekeeper Bee*
 