# Super dojo

A comprehensive martial arts club management application built with Expo React Native and Convex backend. Designed for Kendo, Iaido, Jodo, and Naginata practice tracking, club management, and community engagement.

## Features

### 🏯 Club Management
- View clubs and their information
- Club practice schedules via events
- Member directories
- Club announcement feed maybe linked to WhatsApp group?

### 👥 User Profiles & Authentication
- Role-based access (Student, Sensei, Club Admin, Guardian)
- Profile management with Dan/Kyu grades
- Convex authentication (Passkey support planned)
- Multilingual support (English & Finnish)

### 📅 Event Management
- Event calendar with ICS url sync support (one time and recurring events)
- Event attendance tracking

### 🌍 Internationalization
- Finnish and English language support
- Automatic device language detection
- Complete UI translation

## Architecture

- **Frontend**: Expo React Native with TypeScript
- **Backend**: Convex
- **Authentication**: Convex authentication (Passkey support planned)
- **State Management**: React Context + Convex queries
- **Navigation**: Expo Router
- **Styling**: React Native StyleSheet
- **Testing**: Jest + React Native Testing Library + Playwright
- **CI/CD**: GitHub Actions

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm
- Expo CLI (`npm install -g @expo/cli`)
- Git
- Convex

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd kendo-dojo
```

2. Install dependencies:
```bash
npm install
```

3. Set up Convex:
```bash
npm run convex:dev
```
This will:
- Set up a new Convex project
- Generate the deployment URL
- Start the Convex development server

4. Update your `.env` file with the Convex URL:
```bash
EXPO_PUBLIC_CONVEX_URL=your-convex-deployment-url-here
```

5. Seed the database with sample data:
```bash
npm run seed
```

6. Start the development server:
```bash
npm start
```

### Running the App

- **Web**: Press `w` in the terminal or run `npm run web`
- **iOS**: Press `i` in the terminal or run `npm run ios`
- **Android**: Press `a` in the terminal or run `npm run android`

## Testing

### Unit Tests
```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
```

### E2E Tests
```bash
npm run test:e2e        # Run Playwright tests
```

## AI Integration (MCP)

This project includes Convex MCP (Model Context Protocol) support for AI assistants like Cursor and Claude. MCP allows AI to directly interact with your Convex backend for development and debugging.

**Quick Start:**
```bash
npm run mcp:dev         # Start MCP server for development
npm run mcp:prod        # Start MCP server for production
```

For complete setup instructions and usage examples, see [CONVEX-MCP.md](./CONVEX-MCP.md).

## Database Schema

### Core Tables

- **users**: Authentication and role information
- **profiles**: Public user information (name, grade, club, sport)
- **clubs**: Club information and details
- **events**: Training sessions, competitions, seminars
- **attendance**: Event attendance tracking
- **attendanceQrCodes**: QR codes for attendance scanning
- **clubFeed**: Club announcements and communications
- **marketplaceListings**: Second-hand equipment listings
- **marketplaceMessages**: Buyer-seller communications
- **calendarSyncs**: ICS calendar synchronization

## Deployment

### Web Deployment

1. Build for production:
```bash
npm run build:web
```

2. Deploy the `dist` folder to your preferred hosting service

### Mobile App Deployment

1. Set up EAS (Expo Application Services):
```bash
npm install -g eas-cli
eas login
eas build:configure
```

2. Build for stores:
```bash
npm run build:android    # Android APK/AAB
npm run build:ios        # iOS IPA
```

## Environment Variables

Create a `.env` file in the root directory:

```bash
# Convex Configuration
EXPO_PUBLIC_CONVEX_URL=your-convex-deployment-url

# Optional: Analytics and monitoring
EXPO_PUBLIC_ANALYTICS_ID=your-analytics-id
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── context/            # React Context providers
├── i18n/              # Internationalization
│   ├── locales/       # Translation files
│   └── index.ts       # i18n configuration
├── navigation/        # Navigation setup
├── screens/           # Screen components
├── test/             # Test utilities and setup
└── types/            # TypeScript type definitions

convex/
├── schema.ts         # Database schema
├── auth.ts          # Authentication functions
├── clubs.ts         # Club management functions
├── attendance.ts    # Attendance tracking functions
├── clubFeed.ts      # Club feed functions
└── seed.ts          # Database seeding

e2e/                 # End-to-end tests
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Use conventional commit messages
- Ensure all tests pass before submitting PR
- Add translations for new UI text

## Roadmap

### Phase 1 (Current)
- [x] Basic app structure and navigation
- [x] User authentication and profiles
- [x] Club management and display
- [x] Database schema and Convex setup
- [x] Internationalization (EN/FI)
- [x] Basic testing setup

### Phase 2 (Next)
- [ ] QR code attendance system
- [ ] Event calendar with ICS import
- [ ] Club feed and announcements
- [ ] Profile creation and editing
- [ ] Passkey authentication

### Phase 3 (Future)
- [ ] Marketplace functionality
- [ ] Advanced event management
- [ ] Push notifications
- [ ] Offline support
- [ ] Advanced analytics
- [ ] Multi-club support

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@kendodojo.app or create an issue in the GitHub repository.

## Acknowledgments

- Finnish Kendo Federation for inspiration
- Expo team for the excellent React Native framework
- Convex team for the real-time backend platform
- The martial arts community for feedback and testing