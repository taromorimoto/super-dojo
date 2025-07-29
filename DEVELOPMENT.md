# Development Setup Guide

This guide will help you set up the Super dojo app for local development.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Convex Backend

First, install the Convex CLI globally:

```bash
npm install -g convex
```

Initialize Convex for the project:

```bash
npx convex dev
```

This will:
- Prompt you to create a new Convex project or link to an existing one
- Generate a deployment URL
- Start the Convex development server
- Generate TypeScript types in `convex/_generated/`

**Important**: The temporary `convex/_generated/` files in this repository are placeholders. Replace them with the actual generated files from `npx convex dev`.

### 3. Environment Configuration

Update your `.env` file with the Convex deployment URL:

```bash
EXPO_PUBLIC_CONVEX_URL=https://your-deployment-url.convex.cloud
```

### 4. Seed Database

Once Convex is running, seed the database with sample data:

```bash
npm run seed
```

This will create:
- Sample clubs (Helsinki Kendo Club, Tampere Martial Arts Dojo, Espoo Budo Club)
- Sample users and profiles
- Club feed posts
- Sample events

### 5. Start Development Server

```bash
npm start
```

Then choose your platform:
- Press `w` for web
- Press `i` for iOS simulator (requires macOS)
- Press `a` for Android emulator

## Development Workflow

### File Structure

- `src/` - React Native source code
- `convex/` - Backend functions and schema
- `e2e/` - End-to-end tests
- `assets/` - Images and static assets

### Key Commands

```bash
# Start Expo development server
npm start

# Run tests
npm test
npm run test:watch

# Run e2e tests
npm run test:e2e

# Type checking
npx tsc --noEmit

# Convex development
npm run convex:dev

# Deploy Convex functions
npm run convex:deploy
```

### Making Changes

1. **Backend Changes**: Modify files in `convex/` and they'll hot-reload in the dev server
2. **Frontend Changes**: Modify files in `src/` and they'll hot-reload in Expo
3. **Schema Changes**: Update `convex/schema.ts` and restart the Convex dev server

## Testing

### Unit Tests

```bash
npm test              # Run once
npm run test:watch    # Watch mode
```

Tests are located in:
- `src/**/__tests__/`
- `src/**/*.test.tsx`

### E2E Tests

```bash
npm run test:e2e
```

E2E tests are in the `e2e/` directory and use Playwright.

## Debugging

### React Native Debugger

1. Install React Native Debugger
2. Start it before running `npm start`
3. Enable "Debug JS Remotely" in the Expo dev menu

### Convex Dashboard

Visit your Convex dashboard at https://dashboard.convex.dev to:
- View function logs
- Inspect database tables
- Run queries manually

## Common Issues

### TypeScript Errors

If you see TypeScript errors about missing Convex types:

1. Make sure `npx convex dev` is running
2. Check that `convex/_generated/` contains actual generated files
3. Restart your IDE/TypeScript server

### Convex Connection Issues

If the app can't connect to Convex:

1. Verify `EXPO_PUBLIC_CONVEX_URL` in your `.env` file
2. Make sure the Convex dev server is running
3. Check the Convex dashboard for deployment status

### Expo/React Native Issues

If Expo won't start:

1. Clear Expo cache: `npx expo start -c`
2. Clear npm cache: `npm cache clean --force`
3. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

## Building for Production

### Web Build

```bash
npm run build:web
```

Output will be in the `dist/` directory.

### Mobile Builds

Set up EAS (Expo Application Services):

```bash
npm install -g eas-cli
eas login
eas build:configure
```

Build for platforms:

```bash
npm run build:android
npm run build:ios
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add comments for functions and components
- Use meaningful variable names

