# PlaySoFlo.AI

A modern React + Vite application with integrated APIs for AI, payments, communications, and video conferencing.

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
git clone <repo-url>
cd Playsoflo.Ai.
npm install
npm run dev
```

Visit `http://localhost:5173`

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Anthropic Claude AI
ANTHROPIC_API_KEY=your_anthropic_api_key

# Email (Resend)
RESEND_API_KEY=your_resend_api_key

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Payments (Stripe)
STRIPE_SECRET_KEY=your_stripe_secret_key

# Video Conferencing (Agora)
AGORA_APP_ID=your_agora_app_id

# Database (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Where to Enter Environment Variables

### Local Development
1. Create `.env.local` in the project root (same level as `package.json`)
2. Add your environment variables from the list above
3. Restart `npm run dev` for changes to take effect

### Production (Vercel)
1. Go to your project on [Vercel](https://vercel.com)
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable and its value
4. Redeploy your project for changes to take effect

**Note:** Never commit `.env.local` to version control. It's already in `.gitignore`.

## Available Scripts

- `npm run dev` - Start development server on port 5173
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
├── api/                    # Serverless API endpoints
│   ├── email.js           # Email via Resend
│   ├── sms.js             # SMS via Twilio
│   ├── stripe-intent.js   # Payment intent creation
│   ├── agora-token.js     # Video conferencing tokens
│   └── ronron.js          # AI assistant via Anthropic
├── src/
│   ├── components/        # React components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities
│   └── main.jsx           # Entry point
├── index.html             # HTML template
└── vite.config.js         # Vite configuration
```

## API Endpoints

All API endpoints are serverless functions in the `/api` directory:

- `POST /api/email` - Send emails
- `POST /api/sms` - Send SMS messages
- `POST /api/ronron` - Query AI assistant
- `POST /api/stripe-intent` - Create Stripe payment intent
- `POST /api/agora-token` - Generate Agora video tokens

## Tech Stack

- **Frontend:** React 18, Vite, TailwindCSS
- **UI Components:** Radix UI, shadcn/ui
- **State Management:** React Query, Zustand (if used)
- **Database:** Supabase
- **Payments:** Stripe
- **AI:** Anthropic Claude
- **Communications:** Twilio, Resend
- **Video:** Agora RTC

## Documentation

See `src/components/errors/README.md` for error handling patterns.
See `src/components/performance/README.md` for performance optimization tips.

## Support

For issues and questions, open a GitHub issue in this repository.
