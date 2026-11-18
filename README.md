# FemmeFatale 👗

FemmeFatale is a mobile application designed to simplify tailoring business management by bringing customers, measurements, orders, billing, expenses, staff, and garment design references into one place.

## Features

- Customer management
- Customer measurement management
- Tailoring order management
- Billing and receipt generation
- Expense tracking
- Staff management
- Garment sketch and design reference management
- Authentication and owner PIN
- Supabase backend integration
- AI sketch enhancement using Supabase Edge Functions

## Tech Stack

- React Native
- Expo
- TypeScript
- Supabase

## Getting Started

### Prerequisites

- Node.js (LTS)
- npm
- Git
- Expo Go or Android Emulator

### Installation

Clone the repository:

```bash
git clone https://github.com/SanjaykumarBejjanki/FemmeFatale.git
```

Navigate to the project:

```bash
cd FemmeFatale
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npx expo start
```

### Run on Android

```bash
npx expo start --android
```

### Run on Web

```bash
npx expo start --web
```

## Backend

FemmeFatale uses Supabase for backend services, database functionality, and authentication.

The project includes a Supabase Edge Function for sketch enhancement.

Configure your Supabase credentials and backend secrets before using backend-dependent features.

## Security

- Never commit private API keys or service-role credentials.
- Configure Supabase Row Level Security (RLS).
- Store sensitive credentials securely.

## Project Status

Actively under development.

## Developer

**Sanjay Kumar Bejjanki**

GitHub: https://github.com/SanjaykumarBejjanki

Repository: https://github.com/SanjaykumarBejjanki/FemmeFatale

---

Made with ❤️ using React Native and Expo.