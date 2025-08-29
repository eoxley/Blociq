# 🎨 BlocIQ Brand Kit & Design System - MASTER VERSION

> **📅 Last Updated**: December 2024  
> **🎯 Version**: Master Copy with Communications Hub Hero Banner  
> **📋 Status**: Complete & Approved Design System  

---

## 🎨 **Color Palette**

### **Primary Brand Colors**
```css
--brand-teal: #14b8a6        /* Primary brand color */
--brand-blue: #3b82f6        /* Secondary brand color */
--brand-purple: #8b5cf6      /* Accent brand color */
--brand-pink: #ec4899        /* Highlight color */
```

### **UI Colors**
```css
--ui-white: #ffffff
--ui-slate-50: #f8fafc
--ui-slate-100: #f1f5f9
--ui-slate-200: #e2e8f0
--ui-slate-300: #cbd5e1
--ui-slate-400: #94a3b8
--ui-slate-500: #64748b
--ui-slate-600: #475569
--ui-slate-700: #334155
--ui-slate-800: #1e293b
--ui-slate-900: #0f172a
```

### **Status Colors**
```css
--success: #10b981          /* Green */
--warning: #f59e0b          /* Amber */
--error: #ef4444            /* Red */
--info: #3b82f6             /* Blue */
```

### **Extended Palette**
```css
--indigo-500: #6366f1       /* Communications Hub primary */
--indigo-600: #4f46e5       /* Communications Hub start */
--purple-500: #a855f7       /* Communications Hub end */
--purple-600: #9333ea       /* Darker purple */
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

### **Font Families**
```css
--font-primary: 'Inter', system-ui, -apple-system, sans-serif
--font-display: 'Bradley Hand ITC', cursive, serif
--font-mono: 'JetBrains Mono', 'Fira Code', monospace
```

### **Font Weights**
```css
--font-light: 300
--font-normal: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700
--font-extrabold: 800
```

### **Font Sizes**
```css
--text-xs: 0.75rem      /* 12px */
--text-sm: 0.875rem     /* 14px */
--text-base: 1rem       /* 16px */
--text-lg: 1.125rem     /* 18px */
--text-xl: 1.25rem      /* 20px */
--text-2xl: 1.5rem      /* 24px */
--text-3xl: 1.875rem    /* 30px */
--text-4xl: 2.25rem     /* 36px */
--text-5xl: 3rem        /* 48px */
--text-6xl: 3.75rem     /* 60px */
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

## 🔲 **Borders & Shadows**

### **Border Radius**
```css
--radius-sm: 0.25rem      /* 4px */
--radius-md: 0.375rem     /* 6px */
--radius-lg: 0.5rem       /* 8px */
--radius-xl: 0.75rem      /* 12px */
--radius-2xl: 1rem        /* 16px */
--radius-3xl: 1.5rem      /* 24px */
--radius-full: 9999px     /* Full circle */
```

### **Shadows**
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1)
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25)
--shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)
```

### **Custom Shadows**
```css
--shadow-brand: 0 4px 14px 0 rgba(20, 184, 166, 0.25)
--shadow-ai: 0 4px 14px 0 rgba(139, 92, 246, 0.25)
--shadow-hero: 0 25px 50px -12px rgba(79, 70, 229, 0.25)
```

---

## 🎯 **Design Principles**

### **Visual Hierarchy**
1. **Hero Banners**: Use Communications Hub style gradient (indigo to purple) with decorative blur elements
2. **Primary Actions**: Use brand gradient buttons with strong shadows
3. **Secondary Actions**: Use outline buttons with subtle borders
4. **Information**: Use cards with medium shadows and rounded corners
5. **Background**: Use subtle gradients and soft shadows for depth

### **Color Usage Guidelines**
- **Primary Actions**: Use brand teal (#14b8a6) for main CTAs
- **Secondary Actions**: Use brand blue (#3b82f6) for secondary buttons
- **Accents**: Use brand purple (#8b5cf6) for highlights and special elements
- **Hero Banners**: Use Communications Hub gradient (#4f46e5 to #a855f7)
- **Text**: Use slate scale for readability and hierarchy
- **Status**: Use semantic colors for success, warning, error, and info states

### **Spacing System**
```css
--space-1: 0.25rem    /* 4px */
--space-2: 0.5rem     /* 8px */
--space-3: 0.75rem    /* 12px */
--space-4: 1rem       /* 16px */
--space-6: 1.5rem     /* 24px */
--space-8: 2rem       /* 32px */
--space-12: 3rem      /* 48px */
--space-16: 4rem      /* 64px */
--space-20: 5rem      /* 80px */
--space-24: 6rem      /* 96px */
```

---

## 🧩 **Component Examples**

### **Button Styles**
```css
/* Primary Button */
.btn-primary {
  background: linear-gradient(135deg, #14b8a6, #3b82f6);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  box-shadow: var(--shadow-md);
  transition: all 0.2s ease;
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #3b82f6;
  border: 2px solid #3b82f6;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

/* AI Button */
.btn-ai {
  background: var(--ai-gradient);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  box-shadow: var(--shadow-ai);
  transition: all 0.2s ease;
}
```

### **Card Styles**
```css
/* Standard Card */
.card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--ui-slate-200);
}

/* Feature Card */
.card-feature {
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.05), rgba(59, 130, 246, 0.05));
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: var(--shadow-lg);
  border: 1px solid rgba(20, 184, 166, 0.1);
}

/* Hero Card */
.card-hero {
  background: var(--hero-gradient);
  color: white;
  border-radius: 1.5rem;
  padding: 3rem;
  box-shadow: var(--shadow-hero);
  position: relative;
  overflow: hidden;
}
```

---

## 📱 **Responsive Design**

### **Breakpoints**
```css
--breakpoint-sm: 640px
--breakpoint-md: 768px
--breakpoint-lg: 1024px
--breakpoint-xl: 1280px
--breakpoint-2xl: 1536px
```

### **Container Max Widths**
```css
--container-sm: 640px
--container-md: 768px
--container-lg: 1024px
--container-xl: 1280px
--container-2xl: 1536px
--container-7xl: 80rem  /* 1280px - Communications Hub style */
```

---

## 🎨 **Implementation Notes**

### **Tailwind CSS Classes**
```css
/* Hero Banner */
bg-gradient-to-r from-[#4f46e5] to-[#a855f7]
py-16
relative overflow-hidden

/* Icon Container */
w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl
flex items-center justify-center mx-auto mb-8 shadow-2xl

/* Decorative Elements */
absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl
absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl
absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl
```

### **CSS Variables Usage**
```css
:root {
  --hero-gradient: linear-gradient(to right, #4f46e5 0%, #a855f7 100%);
  --brand-teal: #14b8a6;
  --brand-blue: #3b82f6;
  --brand-purple: #8b5cf6;
  --shadow-hero: 0 25px 50px -12px rgba(79, 70, 229, 0.25);
}
```

---

## 📋 **Brand Assets**

### **Logo Specifications**
- **Primary Logo**: BlocIQ text with icon
- **Icon Only**: Square icon with rounded corners
- **Color Variations**: White, brand teal, and dark versions
- **Minimum Size**: 24px for icon, 120px for full logo

### **Icon System**
- **Style**: Rounded, friendly, modern
- **Stroke Width**: 2px for standard icons
- **Corner Radius**: 4px for square icons
- **Colors**: Use brand palette or semantic colors

---

## 🔄 **Version Control**

### **Change Log**
- **v1.0**: Initial brand kit creation
- **v1.1**: Added Communications Hub hero banner specifications
- **v1.2**: Updated gradients and design principles
- **v1.3**: Added component examples and implementation notes
- **v1.4**: **MASTER VERSION** - Complete design system with Communications Hub integration

### **Next Steps**
- Implement hero banner across all landing pages
- Update existing components to use new design tokens
- Create component library with new specifications
- Document additional use cases and variations

---

> **🎯 This is the MASTER VERSION of the BlocIQ Brand Kit**  
> **📅 Created**: December 2024  
> **✅ Status**: Complete & Approved  
> **🔒 Do not modify without approval**  
> **📋 Reference for all future design work**
