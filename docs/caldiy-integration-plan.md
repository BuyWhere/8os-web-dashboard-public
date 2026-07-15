# Cal.diy API Scout + Integration Plan
**Issue:** OS-78
**Created:** 2026-05-06
**Status:** Planning

## 1. Cal.diy Overview

Cal.diy is the open-source community edition of Cal.com - a scheduling platform for booking meetings, appointments, and events. It's MIT-licensed and designed for self-hosting.

### Key Features Relevant to 8os
- **Event Types** - Create booking pages for different meeting types
- **Booking Management** - Handle scheduling, confirmations, cancellations
- **Calendar Integrations** - Google, Outlook, Apple, CalDAV
- **Video Conferencing** - Zoom, Google Meet, Teams, Daily.co
- **API v2 (REST)** - Full REST API for headless integration
- **Embed Support** - Inline, popup, floating button embedding
- **Webhooks** - Event-driven integrations

## 2. API Scout

### API v2 Endpoints (from Cal.diy docs)

Cal.diy exposes a REST API v2 located at `/api/v2`. Key endpoint categories:

#### Core API Routes
```
/api/v2/event-types        - CRUD for event types
/api/v2/bookings           - Booking management
/api/v2/users              - User management
/api/v2/teams              - Team management (NOTE: Teams feature removed in Cal.diy)
/api/v2/calendars          - Calendar integrations
/api/v2/integrations       - App store integrations
/api/v2/schedules          - Availability schedules
/api/v2/availability      - Availability windows
```

#### Embed API
```
/api/v2/embed              - Embed functionality
```

#### Authentication
- API Keys via `Authorization: Bearer <key>` header
- OAuth 2.0 for platform clients
- NextAuth.js for user sessions

### Environment Requirements
```env
NEXT_PUBLIC_API_URL=https://your-caldiy-instance.com
API_KEY=your-caldiy-api-key
```

## 3. Integration Architecture for 8os Dashboard

### Option A: Embedded Cal.diy (Recommended for MVP)
- Embed Cal.diy booking pages directly into 8os using iframe or Cal.com's embed SDK
- Minimal development effort
- Uses Cal.diy's existing UI
- Pros: Fast implementation, feature-complete UI
- Cons: User experience is Cal.diy-branded, limited customization

### Option B: Headless API Integration
- Build custom UI in 8os dashboard
- Connect to Cal.diy API for data
- Full control over UX, branded experience
- Pros: Complete UX control, consistent branding
- Cons: Significant development effort

### Option C: Hybrid Approach
- Use embed for booking flow (easiest)
- Use API for displaying upcoming bookings, managing event types
- Balance between effort and user experience

## 4. Recommended Integration Path

### Phase 1: Quick Embed Integration
1. Add Cal.diy URL to environment config
2. Embed booking pages in 8os dashboard
3. Display quick booking widget

### Phase 2: API Integration
1. Add API client library for Cal.diy
2. Fetch user's bookings and display in dashboard
3. Sync with 8os calendar view
4. Custom event type management

### Phase 3: Deep Integration
1. Custom booking flow matching 8os design
2. Push/pull calendar events
3. Unified availability across platforms

## 5. Implementation Checklist

### Environment Setup
- [ ] Configure `NEXT_PUBLIC_CALDIY_URL` env var
- [ ] Configure `CALDIY_API_KEY` for server-side API calls

### Embed Integration
- [ ] Install `@calcom/embed-react` or similar
- [ ] Create BookingEmbed component
- [ ] Add booking widget to dashboard

### API Integration (if headless)
- [ ] Create API client utility
- [ ] Add types for Cal.diy API responses
- [ ] Implement booking list fetch
- [ ] Implement event type management

### Calendar Sync (future)
- [ ] Integrate with Google Calendar API
- [ ] Sync availability across platforms

## 6. Environment Variables

```env
# Cal.diy Configuration
NEXT_PUBLIC_CALDIY_URL=https://your-caldiy-instance.com
CALDIY_API_KEY=your-api-key-from-caldiy-admin

# Optional: For self-hosted Cal.diy
# NEXT_PUBLIC_API_URL=http://localhost:3000 (if self-hosted)
```

## 7. References

- Cal.diy Docs: https://cal.diy
- Cal.diy GitHub: https://github.com/calcom/cal.diy
- Cal.diy API: https://cal.diy/installation (see API section)
- Cal.com API v2 Reference: https://docs.cal.com/api

## 8. Open Questions

1. **Deployment Model**: Will 8os self-host Cal.diy or use an existing instance?
2. **Authentication**: How should users log in to Cal.diy? SSO with 8os?
3. **Branding**: Should the booking experience be fully branded for 8os or use Cal.diy UI?
4. **Data Sync**: Real-time sync of bookings, or periodic refresh?

---

## Implementation Status (Updated: 2026-05-06)

### Completed
- [x] API Scout - Researched Cal.diy API v2 endpoints
- [x] Integration Plan document created
- [x] TypeScript types for Cal.diy API (`src/types/caldiy.ts`)
- [x] API client utility (`src/lib/caldiy/client.ts`)
- [x] Booking embed component (`src/components/caldiy/BookingEmbed.tsx`)
- [x] Environment variable template (`.env.caldiy.example`)
- [x] Dashboard integration - bookings section added to main page

### Next Steps
1. Configure `NEXT_PUBLIC_CALDIY_URL` and `CALDIY_API_KEY` in environment
2. Deploy Cal.diy instance or connect to existing instance
3. Test API connectivity
4. Add embed widget to production pages

### Files Created
```
docs/caldiy-integration-plan.md    # This document
src/types/caldiy.ts                # TypeScript types
src/lib/caldiy/client.ts           # API client
src/components/caldiy/             # React components
.env.caldiy.example               # Environment template
```

---

*Document updated as part of OS-78: Cal.diy API scout + integration plan*

---

## Implementation Status (Updated: 2026-06-25 — OS-1736)

### Code Complete
- [x] Cal.diy bookings proxy route: `src/app/api/cal-diy/bookings/route.ts`
- [x] Cal.diy event types route: `src/app/api/cal-diy/event-types/route.ts`
- [x] Assistant scheduling endpoint: `src/app/api/assistant/cal-diy/schedule/route.ts` (returns 501 — Cal.diy API v2 doesn't expose direct booking creation)
- [x] Calendar page merged Cal.diy bookings: `src/app/(dashboard)/calendar/page.tsx`
- [x] Cal.diy bookings appear with `#3b82f6` color and `caldiy-` id prefix
- [x] CalendarView/CalendarMini receive merged events — no component changes needed

### Blocked: Railway Deployment
- [ ] Deploy `cal-diy` service on Railway (image: `calcom/cal.com:latest`)
- [ ] Configure `NEXT_PUBLIC_CALDIY_URL` and `CALDIY_API_KEY` env vars
- [ ] Add env vars to frontend Railway service
- [ ] End-to-end verification

**Child issue:** OS-1742 — Railway deployment

### Architecture
The integration uses a **merge pattern**: the server component in `page.tsx` fetches both Prisma calendar events and Cal.diy bookings, maps Cal.diy bookings to the `CalendarEvent` shape, and passes the merged array to `CalendarView`. No component-level changes were needed — the components already accept a generic events array.

### Files
```
src/app/api/cal-diy/bookings/route.ts         (new — bookings proxy)
src/app/api/cal-diy/event-types/route.ts      (new — event types listing)
src/app/api/assistant/cal-diy/schedule/route.ts (new — assistant endpoint)
src/app/(dashboard)/calendar/page.tsx         (modified — Cal.diy merge)
src/lib/caldiy/client.ts                      (pre-existing — used as-is)
src/types/caldiy.ts                           (pre-existing — used as-is)
docs/caldiy-integration-plan.md               (this file)
.env.caldiy.example                           (pre-existing — deployment reference)
```
