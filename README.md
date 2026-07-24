# All Care Mint — Developer Setup & Testing Guide (MOD-000)

Welcome to the **All Care Mint** platform. This monorepo workspace integrates the backend services, the web client, and the responsive customer and provider mobile apps under a single repository structure.

---

## 🛠️ Prerequisites

Ensure you have the following installed on your developer machine:
1. **Node.js**: Version `18.x` or `20.x`.
2. **PNPM**: Fast package manager installed globally:
   ```bash
   npm install -g pnpm
   ```
3. **PostgreSQL**: A running instance of Postgres database.
4. **Android SDK & Command Line Tools** (for native emulator testing):
   * Android Studio installed with a configured AVD (Android Virtual Device), e.g. `Medium_Phone`.
   * `adb` added to your system path.

---

## 📦 Getting Started

### 1. Installation
Clone the codebase and run the monorepo package install from the root:
```bash
pnpm install
```
This downloads and registers node modules and links packages (such as `@all-care-mint/common`) across workspaces.

### 2. Environment Variables Configuration
Set up your environment variables by copying default configs:

* **Backend API (`apps/api/.env`)**:
  ```env
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/all_care_mint?schema=public"
  JWT_SECRET="super-secret-jwt-key"
  JWT_REFRESH_SECRET="super-secret-refresh-jwt-key"
  PORT=3000
  ```

### 3. Database Schema Migration
Initialize your Postgres database schema using Prisma:
```bash
pnpm --filter api exec prisma db push
```

---

## 🚀 Running the Applications

You can start each application individually or altogether:

### Run Backend API (NestJS)
```bash
pnpm --filter api run start:dev
```
Starts backend API server at `http://localhost:3000`.

### Run Customer Mobile (Expo Web Mode)
```bash
pnpm --filter customer-mobile run web
```
Starts the Expo development server on port `8081`.

### Run Provider Mobile (Expo Web Mode)
```bash
pnpm --filter provider-mobile run web
```
Starts the Expo development server on port `8082` (or matches next free port).

### Run Web Frontend (Vite)
```bash
pnpm --filter frontend run dev
```

---

## 🧪 Testing and Verification Flows

### Testing Customer Mobile E2E (via Browser Viewport)
1. **Start Services**: Run the NestJS API server and Expo Web server.
2. **Access Web App**: Open a web browser to the Expo portal (`http://localhost:8081`).
3. **Viewport Resizing**: Set your browser viewport size to **`390x844`** (responsive mobile size).
4. **Log In**:
   * Enter the phone number: `9876543210`.
   * Click **Send Verification Code**.
   * Enter verification OTP: `123456`.
5. **Update Profile**:
   * On the dashboard, click **Go to Profile**.
   * Edit display name to `Ravi Kumar`.
   * Click **Save Changes** (verifies backend integration through CORS PATCH).
6. **Sign Out**: Click **Sign Out** and verify you are redirected back to the login screen.

### Testing on Native Android Emulator
1. **Boot Virtual Device**: Start your AVD in the background. Ensure it has completed booting:
   ```bash
   adb shell getprop sys.boot_completed  # Should return 1
   ```
2. **Launch Application**: Deploy the build:
   ```bash
   pnpm --filter customer-mobile run android
   ```
3. **Network Configurations**:
   * The Android emulator loopback interface is routed through **`http://10.0.2.2:3000`** to reach the NestJS API.
   * If running browser subagent checks from separate containers, verify calls are routed to the host machine's network IP (e.g. `192.168.1.7:3000`) and CORS is explicitly configured in `apps/api/src/main.ts`.
