# BlocIQ - AI-Powered Property Management Platform

## Overview

BlocIQ is a comprehensive AI-powered property management platform designed specifically for UK leasehold compliance and property management. Built with modern technologies including Next.js, TypeScript, Tailwind CSS, and Supabase, BlocIQ provides intelligent automation for property management workflows.

## 🚀 Key Features

### AI-Powered Inbox Assistant
- **Smart Email Categorization**: Automatically categorizes incoming emails by priority and type
- **Auto-Draft Responses**: AI-generated response drafts based on property management best practices
- **Priority Flagging**: Intelligent prioritization of urgent matters
- **Building Association**: Links emails to specific buildings and units

### Compliance Management
- **Automated Deadline Tracking**: Never miss compliance deadlines with intelligent reminders
- **Document Management**: Secure storage and organization of compliance documents
- **Audit Trails**: Complete audit trail for all compliance activities
- **AI Document Location**: Instant AI-powered document search and retrieval

### Portfolio Calendar & Events
- **Intelligent Scheduling**: Smart scheduling for inspections and maintenance
- **Automated Reminders**: Proactive notification system for upcoming events
- **Event Management**: Comprehensive event tracking and management
- **Outlook Integration**: Seamless calendar synchronization

### Building Management
- **Comprehensive Building Profiles**: Detailed building information and specifications
- **Unit Management**: Individual unit tracking and leaseholder information
- **Asset Tracking**: Building assets and maintenance schedules
- **Major Works Management**: Project tracking and contractor management

## 🛠 Technology Stack

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icons
- **Radix UI**: Accessible UI components

### Backend & Database
- **Supabase**: PostgreSQL database with real-time features
- **PostgreSQL**: Robust relational database
- **Row Level Security**: Built-in security features

### AI & Integrations
- **OpenAI GPT-4**: Advanced AI capabilities
- **Microsoft Graph API**: Outlook integration
- **Azure MSAL**: Microsoft authentication
- **Google Cloud Vision**: Document processing

### Development Tools
- **ESLint**: Code linting
- **TypeScript**: Static type checking
- **Turbopack**: Fast development builds

## 📋 Prerequisites

Before running BlocIQ, ensure you have:

- **Node.js 18+** installed
- **npm** or **yarn** package manager
- **Supabase** account and project
- **OpenAI API** key
- **Microsoft Azure** account (for Outlook integration)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/blociq-frontend.git
cd blociq-frontend
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Microsoft Azure Configuration
AZURE_CLIENT_ID=your_azure_client_id
AZURE_CLIENT_SECRET=your_azure_client_secret
AZURE_TENANT_ID=your_azure_tenant_id

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Database Setup

Run the complete database schema:

```bash
# Connect to your Supabase database and run:
psql -h your_supabase_host -U postgres -d postgres -f blociq_complete_database.sql
```

### 5. Start Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🗄 Database Schema

The BlocIQ database includes comprehensive tables for:

### Core Management
- **buildings**: Building information and specifications
- **units**: Individual unit details
- **leaseholders**: Leaseholder information
- **occupiers**: Current occupier details

### Compliance
- **compliance_items**: Compliance tracking items
- **compliance_assets**: Compliance templates and categories
- **compliance_docs**: Compliance documents
- **building_assets**: Building-specific assets

### Communication
- **incoming_emails**: Email management
- **email_history**: Sent email tracking
- **communications**: General communications
- **communication_templates**: Email templates

### Events & Calendar
- **property_events**: Property-specific events
- **calendar_events**: Outlook-synced events
- **diary_entries**: Internal diary entries

### AI & Analytics
- **ai_logs**: AI usage tracking
- **chat_history**: AI chat interactions

## 🎨 UI Components

### Landing Page Features
- **Modern Design**: Clean, professional interface
- **Responsive Layout**: Mobile-first design
- **Interactive Elements**: Hover effects and animations
- **Contact Form**: Integrated enquiry form
- **Feature Showcase**: Highlighted key features

### Key Components
- **BlocIQLogo**: Custom SVG logo component
- **ContactForm**: Interactive contact form with validation
- **Navigation**: Sticky navigation with branding
- **Feature Cards**: Highlighted feature sections

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database Management
npm run seed:compliance    # Seed compliance assets
npm run check:compliance   # Check compliance data
npm run cleanup:audit      # Audit cleanup
npm run cleanup:cleanup    # Data cleanup

# Email Management
npm run fix:emails         # Fix email data
npm run fix:emails:simple  # Simple email fixes
```

## 🔒 Security Features

- **Row Level Security**: Database-level security
- **Authentication**: Supabase Auth integration
- **API Protection**: Secure API endpoints
- **Data Encryption**: Encrypted data storage
- **GDPR Compliance**: Built-in privacy features

## 🚀 Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy automatically on push

### Manual Deployment

```bash
npm run build
npm run start
```

## 📊 Performance Optimization

- **Turbopack**: Fast development builds
- **Image Optimization**: Next.js image optimization
- **Code Splitting**: Automatic code splitting
- **Caching**: Intelligent caching strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions:

- **Email**: eleanor.oxley@blociq.co.uk
- **Documentation**: See inline code comments
- **Issues**: Create GitHub issues for bugs

## 🔄 Version History

- **v0.1.0**: Initial release with core features
- **v0.2.0**: Added AI inbox assistant
- **v0.3.0**: Enhanced compliance management
- **v0.4.0**: Outlook integration and calendar features

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] Advanced AI features
- [ ] Third-party integrations
- [ ] Advanced analytics dashboard
- [ ] Multi-language support

---

**BlocIQ** - AI-Powered Property Management, Reimagined 