# Dashboard Version 2.0 — Restore Backup

**Status:** Snapshot before Dashboard 3.0 executive refactor. Live dashboard is **3.0** (`data-dashboard-version="3.0"`).  
**Captured:** before Tenant Executive Dashboard 3.0 implementation.

## Restore to Version 2.0

From the repo root:

```bash
cp EkklesiaNexusUi/src/app/features/dashboard/v2.0/dashboard.component.ts.bak \
   EkklesiaNexusUi/src/app/features/dashboard/dashboard.component.ts
cp EkklesiaNexusUi/src/app/features/dashboard/v2.0/dashboard.component.html.bak \
   EkklesiaNexusUi/src/app/features/dashboard/dashboard.component.html
cp EkklesiaNexusUi/src/app/features/dashboard/v2.0/dashboard.component.scss.bak \
   EkklesiaNexusUi/src/app/features/dashboard/dashboard.component.scss
```

Version 1.0 remains under `./v1.0/`.
