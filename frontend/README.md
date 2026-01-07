# Prompt Manager Frontend

This is the frontend application for Prompt Manager, a full-stack application designed to help developers and prompt engineers manage, version, and organize their LLM prompts efficiently.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Code Highlighting**: Highlight.js
- **Markdown**: React Markdown

## Key Features

- Modern React application with TypeScript support
- Responsive design with Tailwind CSS
- Real-time streaming responses for AI optimization
- Multi-version comparison in test playground
- Import/Export functionality for data migration
- Integration tutorial and SDK support

## Development

### Prerequisites

- Node.js 16 or higher
- npm or yarn

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

The application will start on `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Application pages
├── services/      # API client and external services
├── types/         # TypeScript type definitions
├── hooks/         # Custom React hooks
├── lib/           # Utility functions
└── assets/        # Static assets
```

## API Integration

The frontend communicates with the backend API at `http://localhost:8080/api`. The API client is implemented in `src/services/api.ts` and provides methods for:

- Project management
- Prompt versioning
- AI optimization
- Import/Export operations
- Settings management