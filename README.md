# VDH Vault

A Next.js application for managing trip details and memories.

## Features

- Trip management and details
- Offline support with caching
- Real-time updates
- Mobile-friendly interface
- PWA support

## Prerequisites

- Node.js 18+ 
- npm or pnpm
- Supabase account and project

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Development

1. Install dependencies:
```bash
npm install
# or
pnpm install
```

2. Run the development server:
```bash
npm run dev
# or
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

This project is configured for deployment on Vercel:

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add the environment variables in Vercel's project settings
4. Deploy!

## Testing

The application includes comprehensive logging for testing data loading and caching:

1. Open browser dev tools (F12)
2. Go to Console tab
3. Filter logs with "trip" to see data loading events
4. Test offline mode using Network tab's offline checkbox
5. Monitor cache behavior in Application tab's Local Storage

## License

MIT 