# Expo Router Migration

This project has been migrated from React Navigation to Expo Router for better web routing support.

## Changes Made

### 1. Installed expo-router
```bash
npm install expo-router
```

### 2. Updated Configuration
- **package.json**: Changed `main` from `index.ts` to `expo-router/entry`
- **app.json**: Added `expo-router` plugin and `scheme: "super-dojo"`
- **App.tsx**: Replaced with `import 'expo-router/entry'`

### 3. File-based Routing Structure
```
app/
├── _layout.tsx              # Root layout with providers
├── index.tsx                # Entry point with auth redirect logic
├── (auth)/                  # Authentication group
│   ├── _layout.tsx          # Auth layout with redirects
│   ├── index.tsx            # Auth screen (login/signup)
│   └── profile-setup.tsx    # Profile setup screen
└── (tabs)/                  # Main app tabs group
    ├── _layout.tsx          # Tab navigator layout
    ├── index.tsx            # Home screen
    ├── attendance.tsx       # QR attendance screen
    ├── marketplace.tsx      # Marketplace screen
    ├── profile.tsx          # Profile screen
    ├── clubs/               # Clubs stack
    │   ├── _layout.tsx      # Clubs stack layout
    │   ├── index.tsx        # Clubs list
    │   └── [id].tsx         # Club details (dynamic route)
    └── events/
        └── index.tsx        # Events screen
```

### 4. Navigation Updates
- **ClubsScreen**: Updated to use `Link` from `expo-router` instead of navigation.navigate
- **ClubDetailsScreen**: Updated to use `useLocalSearchParams` for route parameters
- **AuthContext**: Remains unchanged, provides auth state for redirects

### 5. Loading States
- Created `src/components/LoadingScreen.tsx` for consistent loading UI
- Updated all layout files to show proper loading states

## Benefits

1. **File-based Routing**: Easier to understand and maintain route structure
2. **Web Support**: Automatic URL generation for web platform
3. **Type Safety**: Better TypeScript support for route parameters
4. **Performance**: Automatic code splitting for web builds
5. **Deep Linking**: Built-in support for universal links

## Breaking Changes

- Removed `src/navigation/AppNavigator.tsx` (no longer needed)
- Navigation props no longer passed to screens
- Route parameters accessed via `useLocalSearchParams()` instead of `route.params`
- Navigation between screens uses `<Link>` component or `router.push()`

## Testing

The migration maintains all existing functionality while adding web routing capabilities. All screens should work identically to before.