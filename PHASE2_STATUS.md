# Phase 2 — Mobile App Implementation Status

**Started:** March 25, 2026  
**Status:** 🟢 **COMPLETE (READY FOR TESTING)**

---

## Architecture

**Stack:** React Native with Expo

| Component | Technology | Status |
|-----------|------------|--------|
| Framework | Expo SDK 50 | ✅ |
| Navigation | React Navigation 6 | ✅ |
| State Management | Zustand | ✅ |
| Data Fetching | TanStack Query v5 | ✅ |
| HTTP Client | Axios | ✅ |
| Maps | react-native-maps | ✅ |

---

## Screens Implemented

### 1. Onboarding Screen

**File:** `screens/OnboardingScreen.tsx`

**Features:**
- ✅ 4-step onboarding flow
- ✅ Data collection explanation
- ✅ Privacy-first messaging
- ✅ Opt-in consent toggle
- ✅ Location permission request
- ✅ Barometer availability check

**User Flow:**
1. Welcome → Data explanation → Privacy details → Rewards overview
2. Final step: Opt-in toggle + permission requests

---

### 2. Home Screen

**File:** `screens/HomeScreen.tsx`

**Features:**
- ✅ Current AtmosPoints balance
- ✅ Total earned/redeemed stats
- ✅ Daily streak indicator with emoji
- ✅ Daily bonus progress (5 contributions = 20 points)
- ✅ Weather display (placeholder for local data)
- ✅ Manual observation submission button
- ✅ Network connection status
- ✅ Pull-to-refresh balance

**Data Sources:**
- Points balance: `GET /v1/rewards/balance/{device_id_hash}`
- Manual submit: `POST /v1/observations/`

---

### 3. Map Screen

**File:** `screens/MapScreen.tsx`

**Features:**
- ✅ Network coverage heatmap
- ✅ Real-time observation stats (24h)
- ✅ Active device count
- ✅ Location-based view
- ✅ Coverage density legend

**Data Sources:**
- Stats: `GET /v1/observations/stats/network`
- Heatmap: Mock data (will use `GET /v2/grid?bbox=` from Phase 3)

---

### 4. Rewards Screen

**File:** `screens/RewardsScreen.tsx`

**Features:**
- ✅ Points balance display
- ✅ Redemption options (3 mock rewards)
- ✅ Transaction history
- ✅ Real-time balance updates
- ✅ Redemption flow

**Redemption Options:**
- Premium Map Features (500 pts)
- Export Your Data (200 pts)
- Beta Access (1000 pts)

**Data Sources:**
- Balance: `GET /v1/rewards/balance/{device_id_hash}`
- History: `GET /v1/rewards/{device_id_hash}/history`
- Redeem: `POST /v1/rewards/redeem`

---

### 5. Settings Screen

**File:** `screens/SettingsScreen.tsx`

**Features:**
- ✅ Data collection toggle
- ✅ Background collection status
- ✅ WiFi-only upload toggle
- ✅ Privacy policy link
- ✅ Data export request
- ✅ Account deletion
- ✅ App version info

---

## Background Data Collection

**File:** `store/sensorsStore.ts`

**Features:**
- ✅ WorkManager (Android) / BGProcessingTask (iOS) registration
- ✅ Sensor polling: 15 min stationary / 5 min moving
- ✅ Battery check: Stops below 20%
- ✅ WiFi-only upload by default
- ✅ GPS rounding to 500m grid before transmission
- ✅ Device ID hashing (SHA-256)

**Privacy Safeguards:**
```typescript
// Before transmission
const rounded = roundCoordinates(lat, lng); // 500m grid
const deviceIdHash = await getDeviceIdHash(); // SHA-256
```

---

## Utility Functions

### `utils/crypto.ts`
- ✅ `getDeviceId()` - Persistent secure device ID
- ✅ `getDeviceIdHash()` - SHA-256 hash for server
- ✅ `roundToGrid()` - GPS rounding to 500m
- ✅ `roundCoordinates()` - Batch coordinate rounding

### `utils/sensors.ts`
- ✅ `isBarometerAvailable()` - Check pressure sensor
- ✅ `getPressure()` - Read barometric pressure
- ✅ `requestLocationPermissions()` - iOS/Android permissions
- ✅ `getCurrentLocation()` - GPS coordinates
- ✅ `getBatteryLevel()` - Battery percentage
- ✅ `isDeviceMoving()` - Motion detection
- ✅ `collectSensorData()` - Aggregate all sensors
- ✅ `shouldCollectData()` - Validation check
- ✅ `getCollectionInterval()` - Dynamic interval based on motion

---

## Data Store

### `store/authStore.ts`
- ✅ Onboarding completion tracking
- ✅ Opt-in consent management
- ✅ SecureStore persistence

### `store/sensorsStore.ts`
- ✅ Background task registration
- ✅ Collection state management
- ✅ Observation submission
- ✅ Error handling

---

## API Integration

### `services/api.ts`

**Endpoints Implemented:**
```typescript
submitObservation(observation: Observation)
getRecentObservations(deviceIdHash, limit)
getNetworkStats()
getPointsBalance(deviceIdHash)
getTransactionHistory(deviceIdHash, limit, offset)
redeemPoints(deviceIdHash, pointsAmount, rewardType, rewardDetails)
checkHealth()
```

---

## Project Structure

```
mobile/
├── App.tsx                    # Main entry with navigation
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── types/
│   └── index.ts              # TypeScript interfaces
├── screens/
│   ├── OnboardingScreen.tsx  # 4-step onboarding
│   ├── HomeScreen.tsx        # Points, streak, weather
│   ├── MapScreen.tsx         # Network coverage
│   ├── RewardsScreen.tsx     # Redemption & history
│   └── SettingsScreen.tsx   # Privacy & controls
├── components/
│   └── Icons.tsx             # Placeholder icons
├── services/
│   └── api.ts                # Backend API client
├── store/
│   ├── authStore.ts          # Onboarding & consent
│   └── sensorsStore.ts       # Background collection
└── utils/
    ├── crypto.ts             # Hashing & privacy
    └── sensors.ts            # Device sensors
```

---

## Running the Mobile App

```bash
cd mobile

# Install dependencies
npm install

# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

**Environment Variables:**
```
EXPO_PUBLIC_API_URL=http://localhost:8000  # Backend API
```

---

## Phase 2 Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Onboarding | ✅ | 4-step flow, permissions, opt-in |
| Home Screen | ✅ | Balance, streak, manual submit |
| Map Screen | ✅ | Coverage heatmap, network stats |
| Rewards Screen | ✅ | Redemption, transaction history |
| Settings | ✅ | Privacy controls, data export |
| Background Collection | ✅ | WorkManager/BGProcessingTask |
| Privacy (500m grid) | ✅ | GPS rounding before transmission |
| Device ID Hashing | ✅ | SHA-256 with salt |
| Battery Check | ✅ | Stops at 20% |
| WiFi-Only Upload | ✅ | NetInfo integration |

---

## Next: Phase 3 — B2B API

Once backend is running and mobile app is tested:

1. **Enterprise API endpoints** (v2)
   - `/v2/current?lat=&lon=` - Current conditions
   - `/v2/forecast?lat=&lon=&hours=` - Hourly forecast
   - `/v2/grid?bbox=` - Bulk data for area
   - `/v2/alerts?lat=&lon=&radius_km=` - Weather alerts

2. **API Gateway** (Kong)
   - Authentication (API keys)
   - Rate limiting
   - Usage tracking

3. **Pricing Tiers**
   - Free: 1,000 calls/day, 5km resolution
   - Standard ($299/mo): 100k calls/day, 1km resolution
   - Pro ($999/mo): 1M calls/day, 500m resolution

4. **Developer Portal**
   - API documentation
   - Code examples
   - Usage dashboard

---

## Testing Checklist

Before Phase 3, verify:

- [ ] Onboarding flow completes successfully
- [ ] Location permissions requested correctly
- [ ] Manual observation submission works
- [ ] Points balance updates after submission
- [ ] Map shows network coverage
- [ ] Rewards screen displays transaction history
- [ ] Background collection runs (check logs)
- [ ] GPS coordinates rounded to 500m
- [ ] Device ID hashed in network requests
- [ ] App stops collecting at 20% battery
- [ ] WiFi-only upload toggle works

---

**Phase 2 Complete. Ready for integration testing with Phase 1 backend.**
