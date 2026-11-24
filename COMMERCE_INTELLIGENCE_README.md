# Commerce Intelligence Module

A comprehensive AI-powered commerce intelligence system for the Homesolar e-commerce platform, built for the Rwandan market (RWF currency, MTN MoMo/Airtel payments, WhatsApp-first communication).

## Features Implemented

### 1. Event Tracking (`Event` model + `/api/events`)
- Tracks: `view`, `search`, `cart_add`, `cart_remove`, `wishlist`, `purchase`, `click`
- Anonymous ID cookie (`hs_anon_id`) merged to `userId` on login via `/api/events/merge`
- Rate-limited (100 req/min per user/IP)
- Indexes: `(userId, createdAt)`, `(productId, type, createdAt)`, `(anonId, createdAt)`

### 2. Smart Search (`/api/search` + `SearchSynonym` model)
- MongoDB Atlas Search with fuzzy matching (maxEdits: 2) + autocomplete
- Text index fallback
- Admin-editable synonym map (e.g., `telefone`/`phone`/`téléphone`, `ifiriti`/`fridge`)
- Ranking: `textRelevance*0.6 + popularity*0.25 + inStock*0.1 + recency*0.05`
- Out-of-stock items ranked last
- Zero-result query logging for admin review

### 3. Trending / Best Sellers (`/api/products/trending` + `PopularityScore` model)
- Formula: `purchases*5 + cartAdds*2 + wishlists*1.5 + views*0.5` (30-day window)
- Time decay: `exp(-ageDays/10)`
- Recomputed every 15 min via cron (`/api/cron/trending`)
- Per-category variants supported

### 4. Related Products (`RelatedProduct` model + `/api/products/[slug]/related`)
- Nightly co-purchase analysis from orders (confidence = pairCount/productAOrders, lift)
- Top 12 per product stored
- Fallback: same category + tag overlap (Jaccard) + price within ±30%
- Components: "Frequently bought together" (co-purchase) + "Similar items" (fallback)

### 5. Personalized Homepage Feed (`/api/feed` + `UserInterestProfile` model)
- Interest profile from last 60 days events (purchase=5, cart=3, view=1, search=2) with time decay
- Candidate pool = trending + related to recent views
- Ranking: `interestScore*0.6 + popularity*0.3 + novelty*0.1`
- Diversification: no category > 40% of feed
- Cold start: trending + top 5 categories

### 6. Cart Abandonment Recovery (`CartAbandonment` model + cron)
- Detection at 1h, 24h, 72h (configurable)
- WhatsApp/SMS/Email via abstracted `NotificationService` (dev mode logs only)
- Sequence: reminder → social proof → 5% incentive coupon (single-use, 48h expiry)
- Stops on purchase
- Recovery rate tracking in admin

### 7. Promotion & Coupon Engine (`PromotionRule` + `PromotionUsage` models)
- Rule types: `percent`, `fixed`, `bogo`, `free_shipping`
- Conditions: minCart, categories, segment, firstOrder, stockAbove/Below, date range
- Server-side evaluation at cart/checkout
- Usage limits: total, per-user, per-phone, per-device (30-day window)
- Stackable rules support
- Auto-suggestions for slow movers (low velocity + high stock)

### 8. Fraud & Risk Scoring (`FraudScore` model + cron)
- Scoring factors (0-100):
  - New account (<30 days): +15
  - Shipping/billing mismatch: +15
  - Order value >5x user average: +20
  - 3+ failed payments in 1h: +25
  - Multi-account on phone/device: +25 each
  - Rapid repeat orders: +10
  - High-risk category combos: +10
- Thresholds: 0-39 auto-approve, 40-69 manual review, 70+ hold
- Admin review queue with approve/reject

### 9. Inventory Forecasting (`InventoryForecast` model + cron)
- Daily sales velocity: WMA of 7/14/30 days (weights 0.5/0.3/0.2)
- `daysOfStockLeft = stock / velocity`
- Reorder point = `velocity * leadDays + safetyStock` (default leadTime=14, safety=7 days)
- Alerts when `daysOfStockLeft < leadDays`
- Admin "Restock" page with suggested quantities
- "Only X left" shown to customers only when stock ≤ 5

### 10. Delivery Fee & ETA (`/api/delivery/calculate`)
- Per-district table (all 30 Rwanda districts)
- Base fee + per-kg fee, standard/express speeds
- ETA adjusted for cutoff time (14:00) and weekends
- Free shipping threshold progress bar in cart

### 11. Retention Engine (`CustomerSegment` model + cron)
- Nightly RFM scoring (R/F/M 1-5 each) → segments: Champions, Loyal, Potential, New, At-risk, Hibernating
- Loyalty: 1 point per 100 RWF, tiers Bronze/Silver/Gold, 12-month expiry
- Triggers: win-back (At-risk), early access (Champions), reorder reminders, price-drop/back-in-stock alerts, daily deals, login streak bonus
- Notification caps: 3/week/user, quiet hours 21:00-07:00

### 12. Admin Intelligence Dashboard (`/admin/intelligence`)
Cards and tables for:
- Top trending products
- Zero-result searches
- Abandoned cart recovery rate
- Revenue from recommendations
- Fraud review queue
- Restock suggestions
- Customer segments with counts
- Active promotions
- Loyalty program stats

## Configuration

All weights, thresholds, and tunable parameters in **`src/lib/commerce-config.ts`**:
- Search ranking weights
- Trending formula weights and decay
- Related products thresholds
- Personalized feed weights and diversification
- Cart abandonment windows and messages
- Promotion rule conditions and abuse prevention
- Fraud scoring factors and thresholds
- Inventory velocity windows and safety stock
- Delivery district fees and cutoff
- RFM bins and segment definitions
- Loyalty tiers and triggers
- Cache TTLs
- Cron schedules

## Models Added

| Model | Collection | Purpose |
|-------|------------|---------|
| `Event` | `events` | User behavior tracking |
| `SearchSynonym` | `searchsynonyms` | Admin-editable synonym map |
| `PopularityScore` | `popularityscores` | Precomputed trending scores |
| `RelatedProduct` | `relatedproducts` | Co-purchase + fallback relations |
| `UserInterestProfile` | `userinterestprofiles` | Per-user interest weights |
| `CartAbandonment` | `cartabandonments` | Abandonment detection & recovery |
| `PromotionRule` | `promotionrules` | Flexible promotion engine |
| `PromotionUsage` | `promotionusages` | Usage tracking & abuse prevention |
| `FraudScore` | `fraudscores` | Order risk scoring |
| `InventoryForecast` | `inventoryforecasts` | Stock forecasting & alerts |
| `CustomerSegment` | `customersegments` | RFM + loyalty |

## API Routes Added

### Public
- `POST /api/events` - Batch event ingestion
- `POST /api/events/merge` - Merge anonId → userId on login
- `GET /api/search?q=` - Smart search with synonyms
- `GET /api/products/trending?limit=&category=` - Trending products
- `GET /api/products/[slug]/related?type=all|frequently_bought|similar` - Related products
- `GET /api/feed?limit=` - Personalized feed (uses session)
- `POST /api/delivery/calculate` - Delivery fee & ETA

### Admin
- `GET /api/admin/intelligence/trending` - Trending for dashboard
- `GET /api/admin/intelligence/zero-results` - Zero-result searches
- `GET /api/admin/intelligence/abandonment` - Cart abandonment stats
- `GET /api/admin/fraud/queue` - Fraud review queue
- `POST /api/admin/fraud/queue` - Approve/reject fraud review
- `GET /api/admin/inventory/restock` - Restock suggestions
- `GET /api/admin/intelligence/segments` - Customer segment counts
- `GET /api/admin/intelligence/loyalty` - Loyalty program stats
- `GET /api/admin/intelligence/promotions` - Active promotions

### Cron (require `CRON_SECRET` header)
- `GET /api/cron/trending` - Recompute trending (every 15 min)
- `GET /api/cron/related-products` - Recompute related products (nightly 3 AM)
- `GET /api/cron/cart-abandonment` - Detect + send messages (every 30 min)
- `GET /api/cron/inventory-forecast` - Recompute forecasts (nightly 4 AM)
- `GET /api/cron/fraud-review` - Score new orders (every 6 hours)
- `GET /api/cron/retention?type=rfm|triggers|alerts` - RFM + triggers (RFM: 2 AM, triggers: 9 AM)

## Environment Variables Required

```env
MONGODB_URI=your_mongodb_atlas_uri
NEXTAUTH_SECRET=your_nextauth_secret
CRON_SECRET=secure_random_string_for_cron_auth
WHATSAPP_CRON_SECRET=same_as_cron_secret
# Optional: for production notifications
WHATSAPP_API_KEY=
SMS_API_KEY=
EMAIL_SMTP_HOST=
EMAIL_SMTP_USER=
EMAIL_SMTP_PASS=
```

## Running Cron Jobs

### Vercel Cron (recommended)
Add to `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/trending", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/related-products", "schedule": "0 3 * * *" },
    { "path": "/api/cron/cart-abandonment", "schedule": "*/30 * * * *" },
    { "path": "/api/cron/inventory-forecast", "schedule": "0 4 * * *" },
    { "path": "/api/cron/fraud-review", "schedule": "0 */6 * * *" },
    { "path": "/api/cron/retention?type=rfm", "schedule": "0 2 * * *" },
    { "path": "/api/cron/retention?type=triggers", "schedule": "0 9 * * *" },
    { "path": "/api/cron/retention?type=alerts", "schedule": "0 10 * * *" }
  ]
}
```

### Self-hosted (node-cron)
Create `scripts/cron-runner.ts`:
```typescript
import cron from "node-cron";
import fetch from "node-fetch";

const CRON_SECRET = process.env.CRON_SECRET!;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL!;

function run(path: string) {
  fetch(`${BASE_URL}${path}`, { headers: { "x-cron-secret": CRON_SECRET } })
    .then(r => r.json())
    .then(console.log)
    .catch(console.error);
}

cron.schedule("*/15 * * * *", () => run("/api/cron/trending"));
cron.schedule("0 3 * * *", () => run("/api/cron/related-products"));
cron.schedule("*/30 * * * *", () => run("/api/cron/cart-abandonment"));
cron.schedule("0 4 * * *", () => run("/api/cron/inventory-forecast"));
cron.schedule("0 */6 * * *", () => run("/api/cron/fraud-review"));
cron.schedule("0 2 * * *", () => run("/api/cron/retention?type=rfm"));
cron.schedule("0 9 * * *", () => run("/api/cron/retention?type=triggers"));
cron.schedule("0 10 * * *", () => run("/api/cron/retention?type=alerts"));
```

Run with: `npx tsx scripts/cron-runner.ts`

## Testing

```bash
# Run unit tests
npm test -- tests/unit/commerce-intelligence.test.ts

# Run all tests
npm test

# Type check
npm run typecheck

# Build
npm run build
```

## Client-Side Event Tracking

Add to your layout or specific pages:

```tsx
"use client";
import { useEventTracker } from "@/lib/event-tracker";

export function ProductPage({ product }) {
  const { trackView, trackCartAdd, trackWishlist } = useEventTracker();

  return (
    <button onClick={() => trackView(product.id)}>View</button>
    <button onClick={() => trackCartAdd(product.id)}>Add to Cart</button>
    <button onClick={() => trackWishlist(product.id)}>Wishlist</button>
  );
}
```

On login, merge anonymous events:
```tsx
import { mergeAnonIdToUser } from "@/lib/event-tracker";

// After successful login
mergeAnonIdToUser(userId);
```

## Admin Synonym Management

Admins can manage search synonyms via the `SearchSynonym` model. Example documents:
```json
{ "term": "phone", "synonyms": ["telefone", "téléphone", "ifoni"], "active": true }
{ "term": "fridge", "synonyms": ["ifiriti", "refrigerator", "friz"], "active": true }
```

## Extending the Module

1. **Add new event types**: Update `EventType` in `Event.ts`, add weights in `commerce-config.ts`
2. **New promotion types**: Add to `PromotionRuleType` in `PromotionRule.ts`, implement in `promotions.ts`
3. **New fraud factors**: Add to `fraud.factors` in `commerce-config.ts`, implement in `fraud.ts`
4. **New retention triggers**: Add to `retention.triggers` in `commerce-config.ts`, implement in `retention.ts`

## Performance Notes

- All heavy computations run in cron jobs; API routes only read precomputed results
- Target API response < 200ms
- Hot endpoints cached 60s (trending, feed, search)
- MongoDB indexes on all query paths
- Pagination on all list endpoints

## License

Part of the Homesolar platform. Internal use only.