# Auto-Wish — Greeting Card Module Refactor

## Architecture (as found)

The Django backend was **already** the intended single source of truth. It shipped with a
`GreetingCardTemplate` model, a read-only `GreetingCardTemplateViewSet` (router: `card-templates/`),
a serializer, `MEDIA_ROOT`/`MEDIA_URL`, and dev media serving. The only reasons the UI showed just
**4 templates** were:

1. The DB had only the original 4 seed rows (`seed_all` created 4 legacy cards, not the premium set).
2. The frontend duplicated a large hardcoded dataset (`templates.ts`) that the live page never used.
3. The model was missing the spec's full field set (slug, colors, layout, featured, sort, tags, metadata),
   had no admin, and exposed no write API.

So this work's real scope was: **complete the backend schema + admin + write API + seed the premium
library (27 templates) + default image assets**, then **delete the duplicated frontend code** and point
the existing page at the backend.

---

## Phase 1 — Audit

### Which page is registered / rendered?
- Router `App.jsx` → `/greeting-cards/templates` renders `CardTemplatesPage` =
  `src/GreetingCards/pages/GreetingTemplates.tsx`. ✅ This is the live page.
- `src/pages/greeting-cards/CardTemplates.jsx` is **not imported anywhere** → orphan/dead file.

### Duplicates found
| Item | File | Decision | Why |
|------|------|----------|-----|
| Templates page (active) | `GreetingCards/pages/GreetingTemplates.tsx` | **RETAIN** | Registered in router; used by wizard step 2 |
| Templates page (dead) | `pages/greeting-cards/CardTemplates.jsx` | **DELETE** | Orphan, never imported |
| Premium dataset | `GreetingCards/data/templates.ts` | **DELETE** | Hardcoded; superseded by backend seed |
| Card grid (active) | `GreetingCards/components/TemplateGrid.tsx` + `TemplateCard.tsx` | **RETAIN** | Used by active page + wizard |
| Card grid (dead) | `GreetingCards/components/GreetingTemplateGallery.tsx` + `GreetingTemplateCard.tsx` | **DELETE** | Only referenced by dead import in wizard |
| API layer | `services/greetingCardsAPI.js` → `card-templates/` | **RETAIN** | Already matches backend router |
| Template preview | `GreetingCards/components/TemplatePreview.tsx` | **RETAIN** (refactored) | Reads design tokens from template object now |
| Decor helpers | `getTemplateDecor/Glass/Font/...` in `templates.ts` | **DELETE** | Folded into `TemplatePreview` + backend fields |
| Backend serializers | Duplicate block at bottom of `serializers.py` | **DELETE** | Deduplicated (exact copy of all serializers) |

### Routes / datasets / hooks / utilities
- Only **one** greeting-cards/templates route exists. ✅
- One template dataset remains (backend). Frontend dataset removed. ✅
- `TEMPLATE_CATEGORIES` was only used by the dead gallery → removed with it.

---

## Phase 2–7 — Backend (single source of truth)

**Model** — `core/models.py` `GreetingCardTemplate`: added `slug` (auto, unique), `description`,
`preview_image` / `thumbnail_image` / `background_image` (ImageFields), `primary/secondary/accent/
text_color`, `font_family`, `font_size`, `layout_type`, `is_premium`, `is_featured`, `sort_order`,
`tags` (JSON), `metadata` (JSON). Indexed on occasion/category/is_active/is_premium/is_featured/
sort_order/slug. `save()` auto-slugs. Legacy `premium`/`thumbnail` columns renamed.

**Migration** — `0007_greetingcardtemplate_fields.py` (safe: renames preserve data, adds new fields + indexes).

**Admin** — `core/admin.py` `GreetingCardTemplateAdmin`: list display + image `preview_thumb`,
search on title/slug/description/tags, filters (occasion/category/premium/featured/active),
editable `sort_order`/`is_active`/`is_featured`/`is_premium`, image previews, and bulk actions:
Publish / Unpublish / Feature / Unfeature / Mark Premium / Remove Premium.

**API** — `core/views.py` `GreetingCardTemplateViewSet` is now a **ModelViewSet** with:
`page`, `page_size`, `occasion`, `category`, `premium`, `featured`, `active`, `search`, `ordering`.
Read = any authenticated user; **write = admin only** (`IsAdminOrSuperAdmin`). Extra `categories` action.

**Serializers** — `GreetingCardTemplateSerializer` returns the exact spec field set including
`preview_image_url` / `thumbnail_image_url` / `background_image_url` (absolute URLs), `premium`,
`featured` (read-only aliases), `tags`, `metadata`. Duplicate serializer block removed from `serializers.py`.

**Seed** — `management/commands/seed_greeting_templates.py` generates gradient placeholder PNGs into
`media/greeting_templates/defaults/{preview,thumbnail,background}/` and inserts all **27 premium
templates** (Birthday×3, Anniversary×3, Wedding×3, Festival×2, Christmas×2, NewYear, Diwali,
Eid, Mother's Day, Father's Day, Graduation, Congratulations, Baby Shower, Friendship, Valentine,
Thank You, Get Well Soon, Custom) with colors, typography, layout, flags, tags, metadata. `seed_all`
now delegates to it. Idempotent via `get_or_create`.

**Media** — `MEDIA_ROOT`/`MEDIA_URL` + dev `static`/`media` serving already present and verified (200 OK).

---

## Phase 8–10 — Frontend

- **Removed** `templates.ts` (hardcoded data) and all dead components.
- **`GreetingTemplates.tsx`** rewritten as the consolidated gallery: grouped by occasion, with server-side
  search, occasion/category/premium/featured filters, sort, pagination, skeleton/error/empty states,
  favorites, and a quick-preview modal using `LivePreview`.
- **`TemplateGrid.tsx`** simplified to a pure presentational grid (filtering moved server-side).
- **`TemplateCard.tsx`** now uses `preview_image_url || thumbnail_image_url`, shows **Premium** + **Featured** badges.
- **`TemplatePreview.tsx`** derives decor/font/accent/textColor from the template object + `metadata.decor`
  (no more `templates.ts` imports).
- **`GreetingWizard.tsx`** fetches templates from the backend (`card-templates/`) and uses `TemplateGrid`
  instead of the dead gallery; template selection now also carries font tokens.
- All features preserved: card creation, customization, contact integration, recipient image upload,
  cropping, preview, sending, scheduling (unchanged files not touched).

---

## Files

### Removed
- `frontend/src/pages/greeting-cards/CardTemplates.jsx`
- `frontend/src/GreetingCards/components/GreetingTemplateGallery.tsx`
- `frontend/src/GreetingCards/components/GreetingTemplateCard.tsx`
- `frontend/src/GreetingCards/data/templates.ts`
- `backend/core/serializers.py` (duplicate trailing serializer block)

### Created
- `backend/core/migrations/0007_greetingcardtemplate_fields.py`
- `backend/core/management/commands/seed_greeting_templates.py`
- `backend/media/greeting_templates/defaults/{preview,thumbnail,background}/*.png` (26 default assets)
- `audit_report.md`

### Modified
- `backend/core/models.py` — full `GreetingCardTemplate` schema
- `backend/core/admin.py` — professional template admin
- `backend/core/views.py` — ModelViewSet with filters/permissions
- `backend/core/serializers.py` — spec serializer (new fields, URL methods)
- `backend/core/management/commands/seed_all.py` — delegates to new seed
- `frontend/src/GreetingCards/pages/GreetingTemplates.tsx` — consolidated gallery
- `frontend/src/GreetingCards/pages/GreetingWizard.tsx` — backend-driven templates
- `frontend/src/GreetingCards/components/TemplateGrid.tsx` — pure presentational grid
- `frontend/src/GreetingCards/components/TemplateCard.tsx` — image URLs + featured badge
- `frontend/src/GreetingCards/components/TemplatePreview.tsx` — token-driven (no hardcoded data)
- `frontend/src/GreetingCards/types/index.ts` — `CardTemplate` matches API response

---

## Verification
- `python manage.py check` → no issues (0 silenced).
- Backend API: `GET /api/card-templates/?page_size=3` → `count: 29`, premium/featured booleans present.
- Media serving: `GET /media/.../balloon_party_birthday.png` → **200 OK**.
- Auth enforced: unauthenticated requests → **401**; admin token → data returned.
- Frontend `npm run build` → **EXIT 0**, 2883 modules transformed, no errors.
- Only one Greeting Templates page; router points to it; no duplicated components/routes/datasets remain.
