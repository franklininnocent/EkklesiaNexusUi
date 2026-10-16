# Dashboard 3.0 — previous spacing snapshot

**Status:** Exact copy of Dashboard 3.0 **before** compact density was accepted as live.  
**Captured:** before the tenant Layout 1 / Layout 2 comparison.  
**Files use `.bak` extensions** so Angular does not compile them.

Live dashboard is **3.0 compact density** (`data-dashboard-version="3.0"`). This folder is the previous (less compact) spacing restore.

## Contents

| File | Purpose |
|------|---------|
| `dashboard.component.ts.bak` | Component logic |
| `dashboard.component.html.bak` | Template |
| `dashboard.component.scss.bak` | Styles |

## Restore Layout 1 (this snapshot) as the live files

From the repo root:

```bash
cp EkklesiaNexusUi/src/app/features/dashboard/v3.0/dashboard.component.ts.bak \
   EkklesiaNexusUi/src/app/features/dashboard/dashboard.component.ts
cp EkklesiaNexusUi/src/app/features/dashboard/v3.0/dashboard.component.html.bak \
   EkklesiaNexusUi/src/app/features/dashboard/dashboard.component.html
cp EkklesiaNexusUi/src/app/features/dashboard/v3.0/dashboard.component.scss.bak \
   EkklesiaNexusUi/src/app/features/dashboard/dashboard.component.scss
```

Then rebuild / refresh the Angular app.

Earlier product snapshots remain under `../v1.0/` and `../v2.0/`.

## Checksums (at backup)

```
b020a183012ce2c3a1d20b41f5c54197ecb8001fe12eb5999c3a43181fc07607  dashboard.component.ts
8883667b7639b80ee41dfa2cb9b012005046d3ec18b393b2f619254201b26dae  dashboard.component.html
04e7052b666751d76d0f7daa4390af0e53f13b30f5aca398fe4f94c709eeb226  dashboard.component.scss
```
