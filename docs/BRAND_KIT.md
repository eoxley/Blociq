# 🎨 BlocIQ Brand Kit & Design System

*Complete UI design specifications for www.blociq.co.uk*

---

## 🎯 **Brand Overview**

**BlocIQ** is a UK property management platform with a modern, professional design aesthetic that emphasizes trust, efficiency, and innovation. The design system combines clean typography, sophisticated gradients, and intuitive user interfaces.

---

## 🎨 **Color Palette**

### **Primary Brand Colors**
```css
/* Core Brand Colors */
--brand-teal: #0d9488        /* Primary brand color */
--brand-blue: #2563eb        /* Secondary brand color */
--brand-purple: #7c3aed      /* Accent brand color */

/* Extended Teal Palette */
teal-50: #f0fdfa
teal-100: #ccfbf1
teal-200: #99f6e4
teal-300: #5eead4
teal-400: #2dd4bf
teal-500: #14b8a6            /* Main teal */
teal-600: #0d9488            /* Brand teal */
teal-700: #0f766e
teal-800: #115e59
teal-900: #134e4a

/* Extended Blue Palette */
blue-50: #eff6ff
blue-100: #dbeafe
blue-200: #bfdbfe
blue-300: #93c5fd
blue-400: #60a5fa
blue-500: #3b82f6            /* Main blue */
blue-600: #2563eb            /* Brand blue */
blue-700: #1d4ed8
blue-800: #1e40af
blue-900: #1e3a8a

/* Extended Purple Palette */
purple-50: #faf5ff
purple-100: #f3e8ff
purple-200: #e9d5ff
purple-300: #d8b4fe
purple-400: #c084fc
purple-500: #a855f7
purple-600: #9333ea
purple-700: #7c3aed          /* Brand purple */
purple-800: #6b21a8
purple-900: #581c87
```

### **UI System Colors**
```css
/* Background Colors */
--primary-bg: #ffffff         /* Main background */
--secondary-bg: #f8fafc      /* Secondary background */
--tertiary-bg: #f1f5f9       /* Tertiary background */

/* Text Colors */
--text-primary: #1e293b      /* Primary text */
--text-secondary: #64748b     /* Secondary text */
--text-muted: #94a3b8        /* Muted text */

/* Border & Input Colors */
--border: #e2e8f0            /* Default borders */
--input: #e2e8f0             /* Input borders */
--ring: #0d9488              /* Focus rings */

/* Status Colors */
--success: #10b981           /* Success states */
--warning: #f59e0b           /* Warning states */
--error: #ef4444             /* Error states */
--info: #6366f1              /* Info states */
```

---

## 🌈 **Gradients**

### **Primary Hero Banner Gradient (Communications Hub Style)**
```css
--hero-gradient: linear-gradient(to right, #4f46e5 0%, #a855f7 100%);
/* Indigo → Purple (right direction) */
```

### **Legacy Brand Gradient**
```css
--brand-gradient: linear-gradient(135deg, #14b8a6 0%, #3b82f6 50%, #8b5cf6 100%);
/* Teal → Blue → Purple (135° angle) - Legacy */
```

### **AI Feature Gradient**
```css
--ai-gradient: linear-gradient(135deg, #14b8a6 0%, #3b82f6 50%, #8b5cf6 100%);
/* Same as legacy brand gradient for AI features */
```

### **Interactive Gradients**
```css
/* Hero Banner Gradient */
.hero-banner: var(--hero-gradient)
/* from-[#4f46e5] to-[#a855f7] */

/* Button Gradients */
.btn-primary: linear-gradient(135deg, #4f46e5, #a855f7)
.ai-button: var(--ai-gradient)

/* Hover Effects */
hover:brightness(110)        /* 10% brightness increase */
```

---

## 🔤 **Typography**

### **Font Family**
```css
/* Primary Font */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;

/* Signature Font (for documents) */
font-family: 'Bradley Hand ITC', 'Bradley Hand', 'Brush Script MT', cursive, serif;
```

### **Font Weights**
```css
font-weight: 300;            /* Light */
font-weight: 400;            /* Regular */
font-weight: 500;            /* Medium */
font-weight: 600;            /* Semi-bold */
font-weight: 700;            /* Bold */
```

### **Type Scale**
```css
/* Headings */
h1: text-5xl (3rem)         /* Hero titles */
h2: text-2xl (1.5rem)       /* Section titles */
h3: text-xl (1.25rem)       /* Subsection titles */
h4: text-lg (1.125rem)      /* Card titles */
h5: text-base (1rem)        /* Small titles */
h6: text-sm (0.875rem)      /* Micro titles */

/* Body Text */
body: text-base (1rem)      /* Default body text */
p: text-base (1rem)         /* Paragraphs */
small: text-sm (0.875rem)   /* Small text */
xs: text-xs (0.75rem)       /* Extra small */
```

---

## 🎭 **Logo & Icons**

### **Primary Logo**
```tsx
// BlocIQ Logo Component
<BlocIQLogo size={24} className="text-current" />

/* Logo Design Elements */
- House outline with door
- Chimney with dot accent
- Clean, geometric design
- Scalable vector format
- Inherits current text color
```

### **Icon System**
```css
/* Icon Containers */
.icon-brain {
  background: var(--ai-gradient);
  border-radius: 12px;
  padding: 8px;
  color: white;
}

.icon-house {
  background: var(--brand-gradient);
  border-radius: 12px;
  padding: 8px;
  color: white;
}

/* Icon Sizes */
w-4 h-4                     /* 16px - Small */
w-5 h-5                     /* 20px - Medium */
w-6 h-6                     /* 24px - Large */
w-8 h-8                     /* 32px - Extra Large */
w-12 h-12                   /* 48px - Hero */
```

---

## 🔲 **Border Radius System**

### **Radius Scale**
```css
/* Default Radius */
--radius: 1rem               /* 16px base radius */

/* Component Radius */
rounded-sm: 2px              /* Small elements */
rounded: 12px                /* Default (buttons, inputs) */
rounded-lg: 16px             /* Large (cards) */
rounded-xl: 20px             /* Extra large */
rounded-2xl: 24px            /* Hero elements */
rounded-3xl: 32px            /* Circular elements */
rounded-full: 9999px         /* Perfect circles */

/* Custom Radius Classes */
.rounded-modern: 16px        /* Modern card radius */
.rounded-button: 12px        /* Button radius */
.rounded-input: 12px         /* Input radius */
```

---

## 🌟 **Shadows & Depth**

### **Shadow System**
```css
/* Shadow Scale */
.shadow-soft: 0 2px 8px rgba(0, 0, 0, 0.04)
.shadow-medium: 0 4px 12px rgba(0, 0, 0, 0.08)
.shadow-strong: 0 8px 25px rgba(0, 0, 0, 0.12)
.shadow-3xl: 0 35px 60px -12px rgba(0, 0, 0, 0.25)

/* Component Shadows */
.card: 0 1px 3px rgba(0, 0, 0, 0.1)
.feature-card: 0 4px 6px rgba(0, 0, 0, 0.05)
.btn-primary: 0 4px 12px rgba(0, 0, 0, 0.15)
```

---

## 🎬 **Animations & Transitions**

### **Transition System**
```css
/* Base Transitions */
transition: all 0.2s ease    /* Default transition */
transition: all 0.3s ease    /* Slower transitions */
transition: all 0.15s ease-in-out /* Quick interactions */

/* Hover Effects */
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Button Animations */
.btn-primary:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

### **Keyframe Animations**
```css
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Slide Up */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Blob Animation */
@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}
```

---

## 🎨 **Component Styles**

### **Button System**
```css
/* Primary Button */
.btn-primary {
  background: var(--brand-gradient);
  color: white;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

/* Secondary Button */
.btn-secondary {
  background: white;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
}

/* Icon Button */
.btn-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  cursor: pointer;
}
```

### **Card System**
```css
/* Base Card */
.card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--tertiary-bg);
  transition: all 0.2s ease;
}

/* Feature Card */
.feature-card {
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  padding: 24px;
  transition: all 0.2s ease;
}

/* BlocIQ Card */
.blociq-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #f1f5f9;
  font-family: 'Inter', system-ui, sans-serif;
}
```

### **Input System**
```css
/* Text Input */
input, textarea {
  border-radius: 12px;
  border: 1px solid var(--border);
  padding: 12px 16px;
  font-family: 'Inter', system-ui, sans-serif;
  transition: all 0.2s ease;
}

/* Focus States */
input:focus, textarea:focus {
  outline: none;
  border-color: var(--brand-teal);
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
}
```

---

## 🎪 **Hero Banner & Special Elements**

### **Hero Banner Styling (Communications Hub Style)**
```css
.hero-banner {
  background: linear-gradient(to right, #4f46e5 0%, #a855f7 100%);
  padding: 4rem 0;
  color: white;
  position: relative;
  overflow: hidden;
}

.hero-title {
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 700;
  font-size: 2.25rem; /* text-4xl */
  color: white;
  margin-bottom: 1.5rem;
}

.hero-subtitle {
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 400;
  font-size: 1.25rem; /* text-xl */
  color: rgba(255, 255, 255, 0.9); /* text-white/90 */
  max-width: 48rem; /* max-w-3xl */
  margin: 0 auto;
  line-height: 1.75;
}

/* Hero Icon Container */
.hero-icon {
  width: 5rem; /* w-20 */
  height: 5rem; /* h-20 */
  background: rgba(255, 255, 255, 0.2); /* bg-white/20 */
  backdrop-filter: blur(8px);
  border-radius: 1rem; /* rounded-2xl */
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 2rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); /* shadow-2xl */
}

/* Decorative Blur Elements */
.hero-banner::before {
  content: '';
  position: absolute;
  top: 2.5rem;
  left: 2.5rem;
  width: 8rem;
  height: 8rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  filter: blur(80px); /* blur-3xl */
}

.hero-banner::after {
  content: '';
  position: absolute;
  bottom: 2.5rem;
  right: 2.5rem;
  width: 10rem;
  height: 10rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  filter: blur(80px); /* blur-3xl */
}
```

### **Communications Hub Hero Banner (Primary Reference)**
```css
/* Main Hero Banner - Communications Hub Style */
.communications-hero-banner {
  background: linear-gradient(to right, #4f46e5 0%, #a855f7 100%);
  padding: 4rem 0;
  position: relative;
  overflow: hidden;
}

/* Icon Container */
.hero-icon-container {
  width: 5rem;
  height: 5rem;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 2rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

/* Decorative Blur Elements */
.hero-banner::before {
  content: '';
  position: absolute;
  top: 2.5rem;
  left: 2.5rem;
  width: 8rem;
  height: 8rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  filter: blur(80px);
}

.hero-banner::after {
  content: '';
  position: absolute;
  bottom: 2.5rem;
  right: 2.5rem;
  width: 10rem;
  height: 10rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  filter: blur(80px);
}
```

### **Ask BlocIQ Circular Widget**
```css
.ask-blociq-circle {
  background: linear-gradient(135deg, #14b8a6, #3b82f6, #8b5cf6);
  border-radius: 50%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  transition: all 0.5s ease;
}

/* Radial Glow Effects */
.ask-blociq-circle::before {
  background: linear-gradient(to-br, rgba(20, 184, 166, 0.2), rgba(59, 130, 246, 0.2));
  filter: blur(40px);
}

.ask-blociq-circle::after {
  background: linear-gradient(to-br, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
  filter: blur(80px);
}
```

---

## 📱 **Responsive Design**

### **Breakpoint System**
```css
/* Mobile First Approach */
sm: 640px                  /* Small devices */
md: 768px                  /* Medium devices */
lg: 1024px                 /* Large devices */
xl: 1280px                 /* Extra large devices */
2xl: 1536px                /* 2X large devices */

/* Container Max Widths */
max-w-6xl: 72rem           /* 1152px - Main content */
max-w-7xl: 80rem           /* 1280px - Wide content */
max-w-3xl: 48rem           /* 768px - Text content */
max-w-2xl: 42rem           /* 672px - Narrow content */
```

### **Grid System**
```css
/* Responsive Grid */
.grid-responsive {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

/* Column Layouts */
grid-cols-1                 /* Single column */
md:grid-cols-2             /* Two columns on medium+ */
lg:grid-cols-3             /* Three columns on large+ */
```

---

## 🎭 **Status & Badge System**

### **Status Badges**
```css
/* Coming Soon Badge */
.badge-coming-soon {
  background: var(--brand-purple);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

/* Active Badge */
.badge-active {
  background: var(--success);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

/* Warning Badge */
.badge-warning {
  background: var(--warning);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}
```

---

## 🔧 **Utility Classes**

### **Spacing System**
```css
/* Margin & Padding Scale */
p-2: 0.5rem                /* 8px */
p-3: 0.75rem               /* 12px */
p-4: 1rem                  /* 16px */
p-6: 1.5rem                /* 24px */
p-8: 2rem                  /* 32px */
p-12: 3rem                 /* 48px */
p-16: 4rem                 /* 64px */

/* Gap Scale */
gap-2: 0.5rem              /* 8px */
gap-4: 1rem                /* 16px */
gap-6: 1.5rem              /* 24px */
gap-8: 2rem                /* 32px */
gap-12: 3rem               /* 48px */
```

### **Layout Utilities**
```css
/* Flexbox Utilities */
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Grid Utilities */
.grid-center {
  display: grid;
  place-items: center;
}

.grid-responsive {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}
```

---

## 🎨 **Design Principles**

### **Visual Hierarchy**
1. **Hero Banners**: Use Communications Hub style gradient (indigo to purple) with decorative blur elements
2. **Primary Actions**: Use brand gradient buttons with strong shadows
3. **Secondary Actions**: Use outline buttons with subtle borders
4. **Information**: Use cards with medium shadows and rounded corners
5. **Background**: Use subtle gradients and soft shadows for depth

### **Color Usage Guidelines**
- **Primary**: Use brand colors for main actions and highlights
- **Secondary**: Use neutral grays for supporting elements
- **Accent**: Use purple for special features and AI elements
- **Status**: Use semantic colors (green, yellow, red) for feedback

### **Typography Guidelines**
- **Headings**: Use Inter font with appropriate weights (600-700)
- **Body**: Use Inter font with regular weight (400) for readability
- **Interactive**: Use medium weight (500) for buttons and links
- **Hierarchy**: Maintain clear size differences between heading levels

### **Spacing Guidelines**
- **Components**: Use consistent 16px (1rem) base spacing
- **Sections**: Use 24px (1.5rem) for section separation
- **Cards**: Use 16px (1rem) internal padding
- **Buttons**: Use 12px (0.75rem) vertical, 24px (1.5rem) horizontal padding

---

## 📋 **Implementation Checklist**

### **Required Elements**
- [ ] Inter font family imported and applied
- [ ] CSS custom properties defined for all brand colors
- [ ] Gradient backgrounds implemented for hero sections
- [ ] Border radius system applied consistently
- [ ] Shadow system implemented for depth
- [ ] Transition system for smooth interactions
- [ ] Responsive breakpoints configured
- [ ] Component classes defined and documented

### **Quality Assurance**
- [ ] All colors meet accessibility contrast ratios
- [ ] Typography scales consistently across components
- [ ] Spacing system applied uniformly
- [ ] Interactive states clearly defined
- [ ] Mobile-first responsive design implemented
- [ ] Performance optimizations applied
- [ ] Cross-browser compatibility verified

---

## 📚 **Resources & References**

### **Font Sources**
- **Inter Font**: Google Fonts (https://fonts.google.com/specimen/Inter)
- **Bradley Hand ITC**: CDN Fonts (https://www.cdnfonts.com/bradley-hand-itc.font)

### **Color Tools**
- **Contrast Checker**: WebAIM (https://webaim.org/resources/contrastchecker/)
- **Color Palette Generator**: Coolors (https://coolors.co/)

### **Design System Tools**
- **Figma**: Component library and design tokens
- **Storybook**: Component documentation and testing
- **Tailwind CSS**: Utility-first CSS framework

---

*This brand kit represents the complete design system for BlocIQ as of 2025. All specifications are based on the current implementation at www.blociq.co.uk.*
