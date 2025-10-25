# Unwrap

A modern full-stack web application built with Next.js 15, Tailwind CSS, and MongoDB.

## Features

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **MongoDB** with Mongoose ODM
- **ESLint** for code quality
- API routes with MongoDB integration

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- pnpm (v8 or higher) - Install with `npm install -g pnpm`
- MongoDB (local installation or MongoDB Atlas account)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/christianzmwang/unwrap.git
cd unwrap
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Update the `MONGODB_URI` with your MongoDB connection string

```bash
cp .env.local.example .env.local
```

For local MongoDB:
```
MONGODB_URI=mongodb://localhost:27017/unwrap
```

For MongoDB Atlas:
```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/unwrap?retryWrites=true&w=majority
```

## Running the Application

### Development Mode
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Production Build
```bash
pnpm build
pnpm start
```

### Linting
```bash
pnpm lint
```

## Project Structure

```
unwrap/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── users/
│   │   │       └── route.ts      # User API endpoints
│   │   ├── globals.css           # Global styles with Tailwind
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Home page
│   ├── lib/
│   │   └── mongodb.ts            # MongoDB connection utility
│   └── models/
│       └── User.ts               # User model example
├── .env.local                    # Environment variables (not in git)
├── .env.local.example            # Environment variables template
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json
```

## API Routes

### Users API

**GET /api/users**
- Fetch all users
- Returns: `{ success: true, data: User[] }`

**POST /api/users**
- Create a new user
- Body: `{ name: string, email: string }`
- Returns: `{ success: true, data: User }`

Example usage:
```javascript
// Fetch users
const response = await fetch('/api/users');
const { data } = await response.json();

// Create user
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' })
});
const { data } = await response.json();
```

## Database Models

### User Model
Located in `src/models/User.ts`

```typescript
interface IUser {
  name: string;
  email: string;
  createdAt: Date;
}
```

## Styling

This project uses Tailwind CSS for styling. The configuration can be found in `tailwind.config.ts`.

To customize:
- Edit `tailwind.config.ts` for theme customization
- Add global styles in `src/app/globals.css`
- Use Tailwind utility classes in your components

## MongoDB Connection

The MongoDB connection is handled by the utility function in `src/lib/mongodb.ts`. It includes:
- Connection caching to prevent multiple connections
- Hot reload support in development
- Error handling

## Creating New Models

1. Create a new file in `src/models/` (e.g., `Post.ts`)
2. Define your schema using Mongoose
3. Export the model

Example:
```typescript
import { Schema, model, models } from 'mongoose';

const PostSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default models.Post || model('Post', PostSchema);
```


