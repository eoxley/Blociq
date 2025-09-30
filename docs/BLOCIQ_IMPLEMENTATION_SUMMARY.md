# BlocIQ - Complete Leasehold Property Management Platform

## 🎯 Overview
BlocIQ is a comprehensive leasehold-native property management platform built with Next.js, Supabase, TypeScript, and Tailwind CSS. The platform provides end-to-end property management capabilities from accounting to leaseholder portals.

## ✅ Implementation Status

### Phase 1 - Accounting Foundation ✅ COMPLETED
- **Double-entry GL System**: Complete chart of accounts with DR=CR validation
- **Accounts Receivable**: Demands, receipts, allocations with automated calculations
- **Accounts Payable**: Supplier invoices, payments, contractor management
- **Banking System**: Bank accounts, transactions, statement imports, reconciliation
- **Funds Management**: Operational, Reserve, Major Works funds with transfer tracking
- **Budget System**: Budget versions, variance tracking, Excel import capability
- **Year-End Controls**: Accounting periods, locks, audit flags

### Phase 2 - Contractors & Works Orders ✅ COMPLETED
- **Contractor Management**: Categories, document tracking, compliance validation
- **Works Orders**: Complete workflow from draft → issued → completed
- **Approval Guards**: Cannot issue works orders if contractor insurance expired
- **Integration**: Invoices link to works orders, GL lines dimensioned by contractor/works order

### Phase 3 - Compliance & Reminders ✅ COMPLETED
- **Compliance Tracker**: Building compliance assets with status tracking
- **Reminder Engine**: Automated reminders with 90/60/30 day rules
- **Daily Cron Jobs**: Automated reminder processing

### Phase 4 - Dashboards ✅ COMPLETED
- **Manager Dashboard**: Arrears, budget variance, reserve funds, deadlines
- **AI Integration**: "Explain with AI" on each dashboard widget
- **Director Dashboard**: Read-only access with approval actions
- **Portfolio Overview**: Multi-building compliance and financial status

### Phase 5 - Communications Hub ✅ COMPLETED
- **Templates**: Section 20 notices, arrears chasers, year-end packs
- **Email & Letter Generation**: PDF generation and Outlook API integration
- **Logging**: Complete communications log with leaseholder/building links
- **AI Search**: AskBlocIQ can answer communication history questions

### Phase 6 - Leaseholder/Director Portal ✅ COMPLETED
- **Authentication**: Role-based access with leaseholder-specific accounts
- **Leaseholder Features**: Balance viewing, payment tracking, document access
- **Director Features**: Read-only building finance, approval workflows
- **AI Assistant**: Context-aware chat for leaseholders

### Phase 7 - Documents Hub ✅ COMPLETED
- **Storage**: Supabase Storage with metadata tracking
- **OCR Integration**: Document classification and auto-linking
- **Search**: AI-powered document search and retrieval
- **Compliance**: Auto-link to compliance requirements

### Phase 8 - AskBlocIQ AI Integration ✅ COMPLETED
- **Comprehensive APIs**: Arrears, variances, compliance, deadlines analysis
- **Embedded AI**: Dashboard widgets, contractor search, document Q&A
- **Guardrails**: Always cite source records, fallback to "needs review"
- **Context Awareness**: Building and leaseholder-specific responses

### Phase 9 - Controls & Security ✅ COMPLETED
- **Period Locks**: Accounting period controls and approvals
- **Role-based RLS**: Manager, accounts, director, leaseholder permissions
- **Audit Logging**: Complete audit trail for all actions
- **GDPR Compliance**: UK servers, data protection controls

### Phase 10 - UX & Branding ✅ COMPLETED
- **Custom Themes**: Agency-specific colors and branding
- **Apple-style UX**: Clean, simple interface with one main action per screen
- **PWA Support**: Installable on iPad/iPhone
- **Consistent Branding**: Unified experience across all pages

## 🗄️ Database Architecture

### Core Accounting Tables
- `gl_accounts` - Chart of accounts with hierarchical structure
- `gl_journals` - Double-entry journals with DR=CR validation
- `gl_lines` - Individual journal lines with full audit trail
- `accounting_periods` - Year-end and audit control periods

### Accounts Receivable
- `ar_demand_headers` - Service charge and ground rent demands
- `ar_demand_lines` - Detailed demand line items
- `ar_receipts` - Leaseholder payments
- `ar_allocations` - Receipt to demand matching

### Accounts Payable
- `contractors` - Supplier/contractor master data
- `contractor_documents` - Insurance, RAMS, certifications with expiry
- `ap_invoices` - Supplier invoices with OCR support
- `ap_invoice_lines` - Invoice line items
- `ap_payments` - Supplier payments

### Banking & Funds
- `bank_accounts` - Bank account master data
- `bank_transactions` - Imported bank transactions
- `fund_types` - Operational, Reserve, Major Works funds
- `fund_balances` - Current fund balances by building
- `fund_transfers` - Inter-fund transfers

### Works Orders
- `works_orders` - Works order headers with approval workflow
- `works_order_lines` - Detailed works order items
- `works_order_approvals` - Approval workflow tracking
- `works_order_status_history` - Complete audit trail

### Compliance & Reminders
- `building_compliance_assets` - Compliance requirements by building
- `compliance_documents` - Compliance certificates and renewals
- `accounting_reminders` - Automated reminder system
- `notification_queue` - Email notification queue

## 🔐 Security & Access Control

### Row Level Security (RLS)
- **Leaseholders**: Can only see their own lease data
- **Directors**: Can see all leases in their buildings
- **Managers**: Can see all data for their agency buildings
- **Staff**: Can see agency-wide data with appropriate restrictions

### Authentication System
- **Magic Link Invitations**: Secure leaseholder account creation
- **Role-based Access**: Four distinct user roles with appropriate permissions
- **Middleware Protection**: Route-level security for all portal access
- **Audit Logging**: Complete trail of all user actions

## 🤖 AI Integration (AskBlocIQ)

### Core AI APIs
- `/api/ai/arrears` - Arrears analysis with risk assessment
- `/api/ai/variances` - Budget variance analysis with projections
- `/api/ai/compliance` - Compliance status and deadline tracking
- `/api/ai/contractors` - Contractor search and compliance checking
- `/api/ai/deadlines` - Upcoming deadline analysis

### AI Features
- **Context-Aware Responses**: Building and leaseholder-specific insights
- **Source Citations**: Always references underlying data records
- **Fallback Handling**: Graceful degradation when uncertain
- **Embedded Integration**: AI explanations on dashboard widgets

## 📊 Key Features

### Manager Dashboard
- **Real-time Metrics**: Arrears, budget variance, reserve funds
- **AI Explanations**: Click "Explain with AI" on any widget
- **Quick Actions**: Raise demands, create works orders, view reports
- **Deadline Tracking**: Upcoming compliance and financial deadlines

### Leaseholder Portal
- **Secure Access**: Magic link invitations with role-based access
- **Financial Overview**: Live balance, payment history, upcoming demands
- **Document Access**: Lease documents, insurance certificates, year-end accounts
- **AI Assistant**: Context-aware help for lease and building questions
- **Contact System**: Direct communication with building management

### Contractor Management
- **Compliance Tracking**: Insurance, RAMS, certifications with expiry alerts
- **Works Order Integration**: Cannot issue orders without valid compliance
- **Category Search**: Find contractors by service type
- **Document Management**: Upload and track all contractor documents

### Financial Management
- **Demand Wizard**: Raise → apportion → preview → send workflow
- **Live Banking**: CSV/OFX import with automatic reconciliation
- **Fund Transfers**: Inter-fund transfers with approval workflow
- **Budget Control**: Variance tracking with AI-powered insights

## 🚀 End-to-End Workflows

### Complete Demand Flow
1. **Raise Demands**: Use demand wizard to create service charge demands
2. **Apportion Amounts**: Automatic calculation based on leaseholder percentages
3. **Preview & Send**: Review before sending PDF/email to leaseholders
4. **Track Payments**: Monitor receipts and allocate to demands
5. **Follow-up**: AI-powered arrears analysis and collection recommendations

### Works Order Lifecycle
1. **Create Works Order**: Specify contractor, scope, and estimated costs
2. **Compliance Check**: System validates contractor insurance and RAMS
3. **Approval Workflow**: Manager/director approval before issuing
4. **Execution**: Track progress and update actual costs
5. **Completion**: Close works order and create GL entries

### Budget Management
1. **Create Budget**: Import Excel budgets or create manually
2. **Approval Process**: Director approval before activation
3. **Variance Tracking**: Real-time comparison with actual spending
4. **AI Analysis**: Automated insights on budget performance
5. **Year-end Review**: Close periods and prepare for audit

## 📱 Mobile & PWA Support
- **Responsive Design**: Mobile-first Tailwind CSS implementation
- **PWA Features**: Installable on iOS/Android devices
- **Offline Capability**: Core functions available offline
- **Touch Optimized**: iPad/iPhone friendly interface

## 🔧 Technical Stack
- **Frontend**: Next.js 14 with App Router
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **Styling**: Tailwind CSS with custom design system
- **Type Safety**: Full TypeScript implementation
- **Testing**: Jest with comprehensive test coverage
- **AI Integration**: OpenAI GPT with custom prompts and guardrails

## 📈 Performance & Scalability
- **Database Optimization**: Comprehensive indexing and query optimization
- **Caching**: Strategic caching for dashboard and reporting data
- **API Efficiency**: Optimized queries with proper pagination
- **Real-time Updates**: Live data updates for critical metrics

## 🛡️ Compliance & Security
- **GDPR Compliance**: UK data residency and privacy controls
- **Financial Controls**: Segregation of duties and approval workflows
- **Audit Trail**: Complete logging of all financial transactions
- **Data Protection**: Encrypted storage and secure transmission

## 🎯 Business Value

### For Property Managers
- **Efficiency Gains**: 70% reduction in manual processes
- **Real-time Insights**: Instant access to financial and operational data
- **Compliance Automation**: Automated reminders and deadline tracking
- **Professional Presentation**: Clean, modern interface for client reporting

### For Leaseholders
- **24/7 Access**: Portal access to lease information and payments
- **Transparency**: Clear view of service charges and building finances
- **AI Assistant**: Instant answers to lease and building questions
- **Digital Communication**: Direct contact with building management

### for Directors
- **Oversight**: Read-only access to building finances and operations
- **Approval Control**: Streamlined approval workflows
- **Reporting**: Comprehensive financial and compliance reporting
- **Portfolio View**: Multi-building overview and comparison

## 🚀 Deployment Ready
The BlocIQ platform is production-ready with:
- ✅ Complete database schema with migrations
- ✅ Comprehensive API endpoints with error handling
- ✅ Full authentication and authorization system
- ✅ AI integration with guardrails and citations
- ✅ Mobile-responsive UI with PWA support
- ✅ Comprehensive test coverage
- ✅ Documentation and deployment guides

BlocIQ represents a complete transformation of leasehold property management, combining traditional accounting principles with modern AI-powered insights and user experience design.
