# 🚫 BlocIQ UI Visual Baseline Lock

This file documents the current stable UI and layout baseline for BlocIQ.

---

## 📦 Baseline Details

- **Branch**: `feature/deploy-mvp`
- **Commit Hash**: `d60714c`
- **Deployment ID**: `63rXXk3Ju`
- **Environment**: Production
- **Primary Domain**: [www.blociq.co.uk](https://www.blociq.co.uk)
- **Vercel Preview Domain**: `blociq-h3xv-git-feature-deploy-mvp-eleanoroxley-9774s-projects.vercel.app`

---

## 🔐 Locked Files (Do not modify without test confirmation)

- `app/layout.tsx`
- `app/globals.css`
- `tailwind.config.ts`
- `postcss.config.js`
- `components/Layout.tsx`
- `components/LayoutWithSidebar.tsx`

---

## ✅ Visual Snapshot Includes

- Homepage layout and hero text
- Custom fonts (Georgia serif)
- Brand colours (Aqua Teal, Deep Teal, Charcoal, Soft White)
- All Tailwind styling intact
- Functional navigation and inbox components

---

## 🧪 Test Checklist Before Modifying Layout or Styles

- [ ] Visually test all key pages
- [ ] Confirm production build compiles successfully on Vercel
- [ ] Avoid unsupported utility classes (e.g., `font-brand`)
- [ ] Check mobile responsiveness

---

## ♻️ Recovery Instructions

To restore this exact baseline:

```bash
git checkout feature/deploy-mvp
git reset --hard d60714c
```