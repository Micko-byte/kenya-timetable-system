# 🇰🇪 SchootTime AI - Timetable Creator

[![Status: Production](https://img.shields.io/badge/Status-Production-success.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)]()

**SchootTime AI** is a state-of-the-art timetable generation platform specifically designed for the Kenyan education ecosystem. It leverages artificial intelligence to create conflict-free schedules for CBC, 8-4-4, and International curriculum schools.

## 🚀 Key Features

- **AI-Powered Generation**: Automatically creates optimized timetables based on school structure and teacher availability.
- **Dual View Mode**: 
  - **Stream View**: Class-specific timetables.
  - **Teacher View**: Individualized schedules for every teacher across the entire school.
- **Curriculum Support**: Deep integration with Kenyan CBC and 8-4-4 standards, including pre-populated subject lists and period structures.
- **Professional Exports**: Download high-quality, printable PDF and Excel files.
- **Dynamic Design**: Customizable themes (Classic Kenya, Modern, Minimalist) with font selection and color toggles.
- **Secure Payments**: Integrated with Paystack for seamless termly subscriptions.

## 🛠 Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Shadcn UI
- **Backend/Auth**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Payments**: Paystack API
- **Exports**: jsPDF, SheetJS

## 📦 Getting Started

### Prerequisites

- Node.js (v18+)
- Supabase Account
- Paystack Account (for payments)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/schoottime-ai.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (`.env`):
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## 🔒 Security & Roles

- **Admin Access**: Restricted to `leemwangi250@gmail.com` and authorized administrative roles.
- **Subscription Gate**: Advanced features like PDF/Excel exports and high-volume stream generation (10+) require an active subscription.

## 📄 SEO & Deployment

- `public/sitemap.xml`: Auto-generated sitemap for search engines.
- `public/robots.txt`: Crawler instructions.
- `project-info.yaml`: Comprehensive project metadata and SEO configurations.

---

© 2026 Elimu Digital. All rights reserved.
