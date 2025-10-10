# Racing Systems Analysis (RSA)

A Progressive Web Application built with Vite, React, and TypeScript.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Router**: React Router DOM v6
- **Validation**: Zod
- **Testing**: Vitest with jsdom
- **Code Quality**: ESLint + Prettier
- **PWA**: Vite PWA Plugin with Workbox

## Project Structure

```
src/
├── app/              # Application root components
├── pages/            # Page components
├── shared/           # Shared utilities
│   ├── components/   # Reusable components
│   ├── hooks/        # Custom React hooks
│   └── ui/           # UI primitives
├── domain/           # Domain logic
│   ├── schemas/      # Zod schemas
│   ├── core/         # Core domain logic
│   ├── quarter/      # Quarter-specific logic
│   ├── learning/     # Learning domain
│   ├── config/       # Configuration
│   └── services/     # Domain services
├── worker/           # Web Workers
├── state/            # State management
└── integration-tests/ # Integration tests
```

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Testing

```bash
npm test
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

## PWA Features

The application is configured as a Progressive Web App with:
- Offline support via service worker
- Web app manifest for installability
- Automatic updates

## Scripts

- `dev` - Start development server
- `build` - Type check and build for production
- `preview` - Preview production build locally
- `lint` - Run ESLint
- `typecheck` - Run TypeScript compiler checks
- `test` - Run Vitest test suite
