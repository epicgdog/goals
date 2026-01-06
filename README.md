# Goals Tracker

A mobile app that uses AI to analyze photos of handwritten journal pages, extract tasks, and score progress against user-defined goals.

## Features

- Photograph journal pages with the in-app camera
- AI-powered task extraction using Google Gemini
- Define goals and track completion with scoring
- Edit detected tasks with inline text editing
- View history of past entries
- Data stored in PostgreSQL (no images saved, text only)

## Tech Stack

- Frontend: React Native (Expo)
- Backend: Express.js with TypeScript
- Database: PostgreSQL
- AI: Google Gemini 2.5 Flash

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- Google Gemini API key
- (Optional) Google OAuth credentials for authentication

## Quick Start

1. Clone the repository

2. Create a `.env` file in the root directory:
```
GEMINI_API_KEY=your_gemini_api_key
```

3. Start all services with Docker:
```bash
docker compose up --build
```

4. Scan the QR code from the Expo terminal output with your phone

## Running Without Docker

### Start the database
```bash
docker compose up postgres -d
```

### Start the backend
```bash
cd server
npm install
npm run dev
```

### Start the frontend
```bash
npm install
npm start
```

## Project Structure

```
goals/
├── app/                    # Expo Router screens
│   ├── (tabs)/             # Tab navigation
│   │   ├── index.tsx       # Goals management
│   │   ├── capture.tsx     # Camera view
│   │   └── history.tsx     # Entry history
│   ├── login.tsx           # Login screen
│   └── _layout.tsx         # Navigation layout
├── stores/                 # Zustand state management
│   ├── authStore.ts        # Authentication state
│   ├── goalStore.ts        # Goals state
│   └── entryStore.ts       # Entries state
├── server/                 # Express backend
│   ├── index.ts            # API endpoints
│   ├── db.ts               # PostgreSQL connection
│   └── migrations/         # Database schema
└── docker-compose.yml      # Docker configuration
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/google | Authenticate user |
| GET | /goals | Get user goals |
| POST | /goals | Create goal |
| DELETE | /goals/:id | Delete goal |
| GET | /entries | Get user entries |
| POST | /entries | Save entry |
| PATCH | /entries/:id | Update entry |
| POST | /analyze | Analyze journal image |
| POST | /generate-phrases | Generate goal phrases |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| GEMINI_API_KEY | Yes | Google Gemini API key |
| EXPO_PUBLIC_GOOGLE_CLIENT_ID | No | Google OAuth client ID |
| DB_HOST | No | PostgreSQL host (default: localhost) |
| DB_PORT | No | PostgreSQL port (default: 5432) |
| DB_NAME | No | Database name (default: goals_tracker) |
| DB_USER | No | Database user (default: goals_user) |
| DB_PASSWORD | No | Database password (default: goals_password) |

## Development Notes

- Use "Dev Login" button during development to bypass Google OAuth
- Images are not stored; only extracted text is saved to the database
- The camera sends images directly to the AI and discards them after analysis

## License

MIT
