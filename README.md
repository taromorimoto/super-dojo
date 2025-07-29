# Super dojo

A comprehensive martial arts club management application built with Expo React Native and Convex backend. Designed for Kendo, Iaido, Jodo, and Naginata practice tracking, club management, and community engagement.

## Features

### 🏯 Club Management
- View clubs and their information
- Club practice schedules and sports offered
- Member directories
- Club announcement feed

### 👥 User Profiles & Authentication
- Role-based access (Student, Sensei, Club Admin, Guardian)
- Profile management with Dan/Kyu grades
- Passkey authentication support (planned)
- Multilingual support (English & Finnish)

### 📅 Event Management
- Training session tracking
- Event calendar with ICS import support
- Competition and seminar scheduling
- Event attendance tracking

### 📱 QR Code Attendance
- Sensei can generate QR codes for events
- Students scan to mark attendance
- Automatic attendance logging
- Manual attendance override for sensei

### 🛒 Marketplace Lite
- Second-hand bogu and equipment listings
- Category-based browsing (Bogu, Shinai, Keikogi, etc.)
- Direct messaging between buyers and sellers
- Condition ratings and pricing

### 🌍 Internationalization
- Finnish and English language support
- Automatic device language detection
- Complete UI translation

## Architecture

- **Frontend**: Expo React Native with TypeScript
- **Backend**: Convex for real-time data and functions
- **Authentication**: Passkey-based authentication
- **State Management**: React Context + Convex queries
- **Navigation**: React Navigation v6
- **Styling**: React Native StyleSheet
- **Testing**: Jest + React Native Testing Library + Playwright
- **CI/CD**: GitHub Actions

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Git

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