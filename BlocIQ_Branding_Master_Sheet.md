# BlocIQ Branding Master Sheet

*AI-Powered Property Management Platform*

---

## Table of Contents
1. [Logo Usage](#logo-usage)
2. [Colour Palette](#colour-palette)
3. [Typography](#typography)
4. [UI Components & Style](#ui-components--style)
5. [Voice & Tone](#voice--tone)
6. [Brand Guidelines Summary](#brand-guidelines-summary)

---

## Logo Usage

### Primary Logo
**Format:** SVG (scalable vector graphic)  
**Dimensions:** 24x24 base viewBox (scalable)  
**Description:** House icon with modern rounded elements and distinctive chimney dot

#### Logo Implementation:
```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
  <!-- House outline -->
  <path d="M3 12L12 3L21 12V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V12Z" 
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  <!-- Door -->
  <rect x="9" y="15" width="6" height="6" stroke="currentColor" strokeWidth="2" fill="none"/>
  <!-- Chimney dot (brand identifier) -->
  <circle cx="19" cy="2" r="2.5" fill="currentColor"/>
  <!-- Small chimney -->
  <rect x="18" y="6" width="2" height="2" stroke="currentColor" strokeWidth="1" fill="none"/>
</svg>
```

### Background Options
- **Light backgrounds:** Use `#008C8F` (Primary Teal) or gradient
- **Dark backgrounds:** Use `#FFFFFF` (White) 
- **Gradient backgrounds:** Use white with opacity or primary colors

### Logo with Brand Name
**Combination:** Logo + "BlocIQ" wordmark  
**Spacing:** 12px (0.75rem) minimum between logo and text  
**Alignment:** Center-aligned vertically

#### Logo Container Styling:
- **Size:** 56px × 56px (3.5rem) container for dashboard
- **Background:** Gradient `from-[#008C8F] to-[#7645ED]`
- **Border radius:** 12px (`rounded-xl`)
- **Shadow:** `shadow-lg` with hover effects

### Favicon Usage
**File:** `favicon.ico` located in `/app/favicon.ico`  
**Dimensions:** 16x16, 32x32, 48x48 standard sizes  
**Format:** ICO format for browser compatibility

### Sizing Guidelines
- **Minimum size:** 16px × 16px (favicon)
- **Standard size:** 24px × 24px (default)
- **Large size:** 40px × 40px (headers)
- **Dashboard container:** 56px × 56px with gradient background

---

## Colour Palette

### Primary Colors

#### **#008C8F** - Primary Teal
- **Usage:** Primary buttons, links, focus states, logo
- **RGB:** rgb(0, 140, 143)
- **Description:** Main brand color - modern, trustworthy teal

#### **#0F5D5D** - Deep Teal  
- **Usage:** Secondary elements, text on light backgrounds
- **RGB:** rgb(15, 93, 93)
- **Description:** Darker variant for contrast and depth

#### **#2BBEB4** - Aqua Teal
- **Usage:** Accent elements, highlights, success states
- **RGB:** rgb(43, 190, 180)
- **Description:** Brighter teal for visual interest

### Gradient Combinations

#### **Primary Brand Gradient**
```css
background: linear-gradient(135deg, #008C8F 0%, #7645ED 100%);
```
- **Usage:** Hero sections, primary CTAs, dashboard headers
- **Description:** Main brand gradient (teal to purple)

#### **Action Gradient**
```css
background: linear-gradient(135deg, #008C8F 0%, #007BDB 100%);
```
- **Usage:** Primary buttons, interactive elements
- **Description:** Teal to blue for actions

#### **Sidebar Active Gradient**
```css
background: linear-gradient(135deg, #2078F4 0%, #7645ED 100%);
```
- **Usage:** Active navigation states
- **Description:** Blue to purple for navigation

### Supporting Colors

#### **#7645ED** - Brand Purple
- **Usage:** Gradient combinations, accent elements
- **RGB:** rgb(118, 69, 237)
- **Description:** Secondary brand color

#### **#2078F4** - Accent Blue
- **Usage:** Information states, secondary CTAs
- **RGB:** rgb(32, 120, 244)
- **Description:** Professional blue accent

### Background Colors

#### **#FAFAFA** - Soft White
- **Usage:** Main background, page backgrounds
- **RGB:** rgb(250, 250, 250)
- **Description:** Primary background color

#### **#FFFFFF** - Pure White
- **Usage:** Card backgrounds, modal backgrounds
- **RGB:** rgb(255, 255, 255)
- **Description:** Clean white for content areas

#### **#F0FDFA** - Teal Tint
- **Usage:** Hover states, accent backgrounds
- **RGB:** rgb(240, 253, 250)
- **Description:** Very light teal for subtle highlighting

### Text Colors

#### **#333333** - Charcoal
- **Usage:** Primary text, headings
- **RGB:** rgb(51, 51, 51)
- **Description:** Main text color

#### **#64748B** - Neutral Grey
- **Usage:** Secondary text, descriptions
- **RGB:** rgb(100, 116, 139)
- **Description:** Muted text for secondary information

### Status Colors

#### **#10B981** - Success Green
- **Usage:** Success messages, positive states
- **RGB:** rgb(16, 185, 129)

#### **#EF4444** - Error Red
- **Usage:** Error states, critical alerts
- **RGB:** rgb(239, 68, 68)

#### **#FBBF24** - Warning Amber
- **Usage:** Warning states, caution indicators
- **RGB:** rgb(251, 191, 36)

#### **#6366F1** - Info Indigo
- **Usage:** Information states, neutral alerts
- **RGB:** rgb(99, 102, 241)

### Border & Outline Colors

#### **#E2E8F0** - Light Border
- **Usage:** Card borders, input borders, separators
- **RGB:** rgb(226, 232, 240)

---

## Typography

### Font Stack
**Primary Font:** Inter (Google Fonts)  
**Fallback:** system-ui, -apple-system, sans-serif  
**Implementation:** 
```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

### Brand Font (Special Use)
**Font:** Georgia (serif) - used for brand name  
**Usage:** Logo text, special headings  
**Implementation:**
```css
font-family: 'Georgia', serif;
```

### Font Weights & Sizes

#### **Headings**
- **H1 (Hero):** 48px-80px, font-weight: 700-800 (bold/extrabold)
- **H2 (Section):** 32px-48px, font-weight: 700 (bold)  
- **H3 (Subsection):** 24px-32px, font-weight: 600 (semibold)
- **H4 (Component):** 18px-24px, font-weight: 600 (semibold)

#### **Body Text**
- **Large body:** 18px-20px, font-weight: 400 (regular)
- **Regular body:** 14px-16px, font-weight: 400 (regular)
- **Small text:** 12px-14px, font-weight: 400-500 (regular/medium)

#### **Interactive Elements**
- **Buttons:** 14px-16px, font-weight: 500-600 (medium/semibold)
- **Links:** 14px-16px, font-weight: 400-500 (regular/medium)
- **Navigation:** 12px-14px, font-weight: 500-600 (medium/semibold)

### Text Hierarchy Examples

#### **Brand Name Treatment**
```css
/* Primary brand name */
font-size: 2rem; /* 32px */
font-weight: 800; /* extrabold */
background: linear-gradient(to right, #008C8F, #2BBEB4);
background-clip: text;
color: transparent;
```

#### **Tagline Treatment**
```css
/* "Property Intelligence Platform" */
font-size: 0.75rem; /* 12px */
font-weight: 500; /* medium */
color: #64748B; /* neutral grey */
```

---

## UI Components & Style

### Navigation Tiles (Sidebar)

#### **Default State**
- **Background:** `#FFFFFF` (white)
- **Border radius:** 8px (`rounded-lg`)
- **Padding:** 12px horizontal, 8px vertical
- **Text color:** `#333333`
- **Icon size:** 32px × 32px container
- **Transition:** `transition-all duration-300`

#### **Hover State**
- **Background:** `#F0FDFA` (teal tint)
- **Transform:** subtle scale or translate effects
- **Shadow:** enhanced `hover:shadow-md`

#### **Active State**
- **Background:** `linear-gradient(135deg, #008C8F 0%, #7645ED 100%)`
- **Text color:** `#FFFFFF` (white)
- **Font weight:** 600 (semibold)
- **Shadow:** `shadow-lg`

#### **Coming Soon State**
- **Background:** `#F3F4F6` (grey)
- **Text color:** `#64748B` (muted)
- **Cursor:** `cursor-not-allowed`
- **Badge:** "Coming Soon" with purple gradient

### CTA Buttons (BlocIQ Button Component)

#### **Primary Button**
```css
background: linear-gradient(to right, #008C8F, #007BDB);
color: #FFFFFF;
border-radius: 12px; /* rounded-xl */
padding: 12px 16px; /* py-3 px-4 */
font-weight: 500; /* medium */
box-shadow: 0 10px 15px rgba(0,0,0,0.1); /* shadow-lg */
transition: all 300ms;

/* Hover state */
background: linear-gradient(to right, #007BDB, #008C8F);
box-shadow: 0 20px 25px rgba(0,0,0,0.15); /* shadow-xl */
```

#### **Secondary Button**
```css
background: #F0FDFA;
color: #0F5D5D;
border: 1px solid #008C8F;
border-radius: 12px;

/* Hover state */
background: #008C8F;
color: #FFFFFF;
```

#### **Outline Button**
```css
background: #FFFFFF;
color: #333333;
border: 1px solid #E2E8F0;

/* Hover state */
background: #F0FDFA;
border-color: #008C8F;
```

### Widget Tiles (iPhone-style App Cards)

#### **Card Container**
```css
background: #FFFFFF;
border: 1px solid #E2E8F0;
border-radius: 12px; /* rounded-xl */
box-shadow: 0 1px 3px rgba(0,0,0,0.1); /* shadow-sm */
transition: all 300ms;

/* Hover state */
box-shadow: 0 10px 15px rgba(0,0,0,0.1); /* shadow-md */
transform: translateY(-4px); /* hover:-translate-y-1 */
```

#### **Card Header**
```css
padding: 24px; /* p-6 */
border-bottom: 1px solid #E2E8F0;
```

#### **Card Content**
```css
padding: 24px; /* p-6 */
```

#### **Card Footer**
```css
padding: 24px; /* p-6 */
border-top: 1px solid #E2E8F0;
background: #FAFAFA;
```

### Rounded Corners & Spacing

#### **Border Radius Scale**
- **Small:** 6px (`rounded`)
- **Medium:** 8px (`rounded-lg`)
- **Large:** 12px (`rounded-xl`)
- **Extra Large:** 20px (`rounded-2xl`)

#### **Spacing Scale** (based on 4px grid)
- **xs:** 4px
- **sm:** 8px  
- **md:** 12px
- **lg:** 16px
- **xl:** 24px
- **2xl:** 32px

### Shadows

#### **Elevation Hierarchy**
```css
/* Soft shadow for subtle elevation */
box-shadow: 0 4px 12px rgba(0,0,0,0.05);

/* Standard shadow for cards */
box-shadow: 0 1px 3px rgba(0,0,0,0.1);

/* Enhanced shadow for hover states */
box-shadow: 0 10px 15px rgba(0,0,0,0.1);

/* Dramatic shadow for modals/overlays */
box-shadow: 0 25px 50px rgba(0,0,0,0.25);
```

---

## Voice & Tone

### Brand Personality
- **Modern:** Contemporary, forward-thinking approach to property management
- **Witty:** Clever, engaging copy with subtle humor
- **British:** Professional British tone without being overly formal
- **Trustworthy:** Authoritative yet approachable on compliance matters

### Key Messaging Examples

#### **AI Assistant Greetings**
> "Hello! I'm your BlocIQ assistant. I can help you with property management questions, compliance guidance, and more. What would you like to know?"

#### **Welcome Messages**
> "Welcome back to BlocIQ"  
> "Welcome to BlocIQ"

#### **Feature Descriptions**
> "BlocIQ helps you stay compliant, work faster, and manage smarter — from inbox to inspection."

> "AI-powered property management reimagined."

#### **Value Propositions**
> "We're building the operating system for modern property teams — from prime city blocks to social housing estates."

> "While AI is being rapidly adopted across industries, most property firms are using generic tools like ChatGPT without oversight, data safeguards, or regulatory alignment. That's a risk — for firms, for clients, and for residents."

### Communication Principles

#### **Professional but Approachable**
- Use clear, jargon-free language
- Maintain professional credibility while being accessible
- Avoid overly technical property management terms without explanation

#### **Solution-Focused**
- Emphasize benefits and outcomes
- Address pain points directly
- Position BlocIQ as the intelligent choice

#### **Compliance-Aware**
- Reference regulatory knowledge appropriately
- Emphasize data security and GDPR compliance
- Position as a safer alternative to generic AI tools

#### **Future-Forward**
- Use language that positions BlocIQ as innovative
- Reference "modern property management"
- Emphasize AI-enhancement rather than replacement

---

## Brand Guidelines Summary

### Tagline
**Primary:** "AI-powered compliance for modern property managers"  
**Alternative:** "AI-Powered Property Management, Reimagined"

### Visual Mood
- **Gradient-rich:** Extensive use of teal-to-purple gradients
- **Modern:** Clean, contemporary design with generous whitespace
- **Calm and clear:** Accessible color palette with high contrast
- **Professional:** Serious about compliance, approachable in delivery

### Core Values
1. **Compliance Intelligence:** Built specifically for leasehold compliance
2. **Data Security:** GDPR-friendly, regulation-aware, never shared outside BlocIQ
3. **Operational Transparency:** Clear workflows and audit trails
4. **AI Enhancement:** Smart assistance that augments human expertise

### Usage Guidelines

#### **Do:**
- Use gradients for primary visual elements
- Maintain high contrast for accessibility
- Keep messaging clear and benefit-focused
- Emphasize compliance and data security
- Use the chimney dot as a brand identifier

#### **Don't:**
- Use colors outside the defined palette
- Place logo on low-contrast backgrounds
- Mix serif fonts with the primary Inter font stack
- Compromise on accessibility standards
- Use generic AI terminology without context

### Legal & Compliance Notes
- **GDPR Compliant:** All data handling follows GDPR guidelines
- **UK-Focused:** Specifically designed for UK property management
- **Leasehold Specialist:** Positioned as leasehold compliance expert
- **Professional Services:** Maintains appropriate professional standards

### Contact Information
- **Email:** privacy@blociq.co.uk
- **Support:** info@blociq.co.uk
- **Copyright:** © 2024 BlocIQ. All rights reserved.

---

*This branding master sheet is based on the current BlocIQ implementation as of 2024. All colors, components, and messaging examples are extracted from the live codebase to ensure consistency across design and development teams.*