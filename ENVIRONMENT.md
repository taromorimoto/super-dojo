# Environment Configuration Guide

This project supports multiple environments for development and production deployments.

## Environment Files

### `.env` (Default/Production)
- Default configuration that uses production Convex deployment
- Used when no specific environment is specified
- Safe to commit to version control

### `.env.development`
- Development-specific configuration
- Uses development Convex deployment (`flippant-starfish-48`)
- Safe to commit to version control

### `.env.production`
- Production-specific configuration
- Uses production Convex deployment (`earnest-mallard-450`)
- Safe to commit to version control

### `.env.local` (Personal Development)
- **Gitignored** - Personal development overrides
- Overrides settings in other env files
- Currently set to use development deployment
- Customize this for your personal development setup

## Usage

### Frontend (Expo App)

#### Development
```bash
# Start with development backend
npm run start:dev
npm run web:dev
npm run ios:dev
npm run android:dev

# Build with development backend (for testing)
npm run build:web:dev
```

#### Production
```bash
# Start with production backend
npm run start:prod      # or just: npm start (default)
npm run web:prod       # or just: npm run web (default)
npm run ios:prod       # or just: npm run ios (default)
npm run android:prod   # or just: npm run android (default)

# Build for production
npm run build:web      # Uses production backend
npm run build:android  # Uses production backend
npm run build:ios      # Uses production backend
```

### Backend (Convex)

#### Development Backend
```bash
# Start development Convex server
npm run convex:dev

# Seed development database
npm run seed:dev
```

#### Production Backend
```bash
# Start Convex server connected to production
npm run convex:dev:prod

# Deploy to production
npm run convex:deploy:prod

# Seed production database
npm run seed:prod
```

## Environment Variables

### Expo App Variables
- `EXPO_PUBLIC_CONVEX_URL` - Convex deployment URL
- `NODE_ENV` - Environment mode (development/production)

### Convex Variables
- `CONVEX_DEPLOYMENT` - Convex deployment identifier

## Current Deployments

### Development
- **Deployment ID**: `flippant-starfish-48`
- **URL**: `https://flippant-starfish-48.convex.cloud`
- **Use for**: Local development, testing new features

### Production
- **Deployment ID**: `earnest-mallard-450`
- **URL**: `https://earnest-mallard-450.convex.cloud`
- **Use for**: Production builds, live app data

## Switching Environments

### Quick Switch (Recommended)
Use npm scripts with `:dev` or `:prod` suffixes:
```bash
npm run start:dev    # Development backend
npm run start:prod   # Production backend
```

### Manual Switch
Edit `.env.local` to override the default environment:
```bash
# In .env.local
CONVEX_DEPLOYMENT=flippant-starfish-48  # Use dev
# OR
CONVEX_DEPLOYMENT=earnest-mallard-450   # Use production
```

## Best Practices

1. **Development**: Use `npm run start:dev` for daily development
2. **Testing Production**: Use `npm run start:prod` to test against production data
3. **Building**: Always use production scripts for final builds
4. **Database Changes**: Test schema changes in development first
5. **Personal Setup**: Customize `.env.local` for your preferences

## Troubleshooting

### Wrong Backend Data
- Check which environment you're running (`dev` vs `prod` scripts)
- Verify `.env.local` settings if using custom overrides

### Environment Not Loading
- Restart Expo server after changing environment files
- Clear Expo cache: `npx expo start -c`

### Convex Connection Issues
- Ensure the correct deployment is running
- Check Convex dashboard for deployment status
- Verify environment file has correct `CONVEX_DEPLOYMENT` value