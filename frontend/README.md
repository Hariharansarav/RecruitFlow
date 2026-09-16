# RecruitFlow — Recruitment Screening & Candidate Evaluation (Frontend)

Next.js frontend for the RecruitFlow recruitment screening and candidate evaluation platform.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: JavaScript (ES6+)
- **Styling**: Tailwind CSS + Custom Design System Tokens (`brand` Indigo `#4F46E5`, `accent` Violet `#7C3AED`, Slate neutrals)
- **Icons**: Lucide React
- **HTTP Client**: Axios (`services/api.js`)
- **Authentication**: Simple session management via `localStorage` (`recruitment_user`) — **No JWT**
- **Backend API**: NestJS running on `http://localhost:5000/api`

---

## Project Structure
```
frontend/
├── app/
│   ├── login/
│   │   └── page.js                   # Split-screen modern login with demo helpers
│   ├── hr/
│   │   ├── layout.js                 # HR role gate + AppLayout shell
│   │   ├── dashboard/
│   │   │   └── page.js               # HR Dashboard (StatCards + Recent Activity)
│   │   ├── jobs/
│   │   │   └── page.js               # Job requisitions management view
│   │   ├── candidates/
│   │   │   └── page.js               # Candidate pipeline view
│   │   └── evaluations/
│   │       └── page.js               # Interview evaluations view
│   ├── company/
│   │   ├── layout.js                 # Company role gate + AppLayout shell
│   │   ├── dashboard/
│   │   │   └── page.js               # Company Dashboard (StatCards + Review Queue)
│   │   └── candidates/
│   │       └── page.js               # Candidate submissions view
│   ├── page.js                       # Root router (redirects to /login or dashboard)
│   ├── layout.js                     # Root HTML layout with Inter font
│   └── globals.css                   # Tailwind directives & CSS design tokens
├── components/
│   ├── layout/
│   │   ├── AppLayout.js              # Application shell (Sidebar + Header + Content)
│   │   ├── Sidebar.js                # Role-specific navigation with active states
│   │   ├── Header.js                 # Breadcrumbs, notifications, mobile menu
│   │   └── UserMenu.js               # Profile dropdown with avatar & sign out
│   ├── ui/
│   │   ├── Button.js                 # Reusable primary/secondary/outline/ghost buttons
│   │   ├── Badge.js                  # Status badges (OPEN, CLOSED, EVALUATED, etc.)
│   │   └── StatCard.js               # Dashboard KPI metric cards
│   └── auth/
│       └── AuthGuard.js              # Standalone route protection guard
├── services/
│   ├── api.js                        # Axios instance configured for http://localhost:5000/api
│   └── authService.js                # Session management (login, logout, getCurrentUser)
├── tailwind.config.js                # Brand color palettes, radius, fonts
├── postcss.config.mjs                # PostCSS Tailwind + Autoprefixer config
└── package.json
```

---

## Running the Application

### 1. Configure Environment
Ensure `.env.local` contains:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 2. Start the Development Server
```bash
npm run dev
```

The frontend runs at:
[http://localhost:3000](http://localhost:3000)

### 3. Demo Credentials
- **HR Recruiter**: `hr@recruitment.com` / `123456`
- **Company Reviewer**: `company@recruitment.com` / `123456`
