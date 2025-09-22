# BlocIQ Marketing Components

A comprehensive collection of reusable React components for marketing materials, styled with BlocIQ's brand kit.

## 🎨 Components

### ValuePropCard
Reusable cards for value propositions with icons and descriptions.

```tsx
import { ValuePropCard, SaveTimeCard, StayCompliantCard, BuiltForUKCard } from '@/components/marketing';

// Custom card
<ValuePropCard
  icon="clock"
  title="Save Time"
  description="Automate 70% of admin tasks with AI-powered workflows"
/>

// Pre-configured cards
<SaveTimeCard />
<StayCompliantCard />
<BuiltForUKCard />
```

### HeroBanner
Eye-catching hero sections for landing pages and presentations.

```tsx
import { HeroBanner, PrimaryHero, SecondaryHero, MinimalHero } from '@/components/marketing';

// Custom hero
<HeroBanner
  title="Custom Title"
  subtitle="Custom subtitle"
  variant="primary"
/>

// Pre-configured heroes
<PrimaryHero />
<SecondaryHero />
<MinimalHero />
```

### ProcessDiagram
Visual diagrams showing how BlocIQ works and security features.

```tsx
import { ProcessDiagram, SecurityFeatures } from '@/components/marketing';

<ProcessDiagram variant="flow" />
<SecurityFeatures />
```

### CallToAction
Compelling call-to-action sections for conversions.

```tsx
import { CallToAction, PrimaryCTA, SecondaryCTA, MinimalCTA } from '@/components/marketing';

// Custom CTA
<CallToAction
  title="Ready to Get Started?"
  subtitle="Transform your property management today"
  primaryButton={{ text: "Start Trial", icon: "arrow" }}
  variant="primary"
/>

// Pre-configured CTAs
<PrimaryCTA />
<SecondaryCTA />
<MinimalCTA />
```

## 🎨 Brand Colors

All components use BlocIQ's official brand colors:

- **Brand Teal**: `#0d9488` (Primary)
- **Brand Blue**: `#2563eb` (Secondary)
- **Brand Purple**: `#7c3aed` (Accent)
- **Success Green**: `#10b981`
- **Warning Orange**: `#f59e0b`
- **Error Red**: `#ef4444`

## 📱 Responsive Design

All components are fully responsive and work across:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🚀 Usage

### Basic Usage
```tsx
import { SaveTimeCard, PrimaryHero } from '@/components/marketing';

export function MyPage() {
  return (
    <div>
      <PrimaryHero />
      <SaveTimeCard />
    </div>
  );
}
```

### Custom Styling
```tsx
<ValuePropCard
  icon="clock"
  title="Custom Title"
  description="Custom description"
  className="my-custom-class"
/>
```

### Download Functionality
```tsx
import { DownloadButton } from '@/components/marketing';

const elementRef = useRef<HTMLDivElement>(null);

<div ref={elementRef}>
  <SaveTimeCard />
</div>

<DownloadButton
  elementRef={elementRef}
  filename="save-time-card"
/>
```

## 📁 File Structure

```
components/marketing/
├── ValuePropCard.tsx      # Value proposition cards
├── HeroBanner.tsx         # Hero banner components
├── ProcessDiagram.tsx     # Process flow diagrams
├── CallToAction.tsx       # Call-to-action components
├── DownloadButton.tsx     # Download functionality
├── index.ts              # Component exports
└── README.md             # This file
```

## 🎯 Marketing Vault

Visit `/marketing/vault` to see all components in action with download functionality.

## 🔧 Customization

### Adding New Icons
1. Import the icon from `lucide-react`
2. Add it to the `iconMap` in the component
3. Update the TypeScript interface

### Adding New Variants
1. Add the variant to the component's variant type
2. Define the variant styles in the `variants` object
3. Apply the styles in the component's className

### Brand Color Updates
Update the color values in each component's `colorSchemes` or `variants` objects to match new brand guidelines.

## 📦 Dependencies

- React 18+
- Next.js 15+
- Tailwind CSS
- Lucide React (icons)
- shadcn/ui components
- TypeScript

## 🚀 Production Ready

All components are:
- ✅ TypeScript typed
- ✅ Responsive design
- ✅ Accessible (ARIA labels)
- ✅ Performance optimized
- ✅ Brand consistent
- ✅ Reusable and modular
