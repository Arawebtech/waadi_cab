# Wadi Cab — Customer App

Standalone customer ride-hailing application extracted from the driver monolith (`frontend/`).

## Stack

- **Next.js 15** (App Router, static export)
- **Capacitor 7** (Android / iOS)
- **React Query** for API state
- **Socket.IO** for live ride updates & chat

## Features

- Email OTP auth (`/api/v1/cab/auth/*`)
- Home map, pickup/drop, fare estimate, vehicle selection
- Ride booking, driver matching, live trip tracking
- In-app chat with driver
- Ride history, intercity packages
- Profile, saved places, wallet

## Setup

```bash
cd wadi-cab-app
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000/ride](http://localhost:3000/ride)

## Mobile build

```bash
npm run build:mobile
npm run open:android
```

## Environment

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend base URL (`http://localhost:4001/api/v1`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps embed / places |
| `CAPACITOR_SERVER_URL` | Dev live-reload URL (optional) |

## Project structure

```
wadi-cab-app/
├── app/ride/              # Customer routes (auth, home, booking, trip, history, profile)
├── features/customer-ride/ # API, socket, hooks, components, context
├── components/            # Shared UI & Capacitor providers
├── config/                # App config (API, maps)
└── lib/                   # Utilities
```

## Related apps

| App | Purpose |
|-----|---------|
| `wadi-cab-app/` | **Customer** — book & track rides |
| `frontend/` | **Driver** — cab booking, border tax, dashboard |
