# Rameswaram Animated Wedding Invitation Website

A faithful, high-fidelity recreation of the scroll-driven Rameswaram temple wedding invitation reference experience.

---

## 🌟 Highlights

- **Visual Fidelity:** Section-by-section match with the reference design (Cormorant Garamond typography, Rameswaram architecture imagery, natural sandy palette).
- **Parallax & Motion:** Built with **GSAP & ScrollTrigger** for smooth scroll-driven parallax, camera zooms, and typography fade-in animations.
- **Configurable Names:** The bride and groom names are configurable from a **single configuration file** (`src/data/invitation.config.ts`).
- **Interactive RSVP Modal:** Built with Framer Motion, matching the exact styling, form fields, and animations of the original website.
- **Mobile-First Responsive Layout:** Perfectly optimized for mobile and tablet screens.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd wedding-invitation
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ✍️ How to Personalize (Change Bride & Groom Names)

Edit only **`src/data/invitation.config.ts`**:

```typescript
export const config = {
  groom: {
    firstName: "YourGroomName",      // Replace [GROOM_NAME]
    fullName: "YourGroomName Kumar",
  },
  bride: {
    firstName: "YourBrideName",      // Replace [BRIDE_NAME]
    fullName: "YourBrideName Sharma",
  },
  // ... all other content, dates, and event schedules are preserved
};
```

The updated names will automatically populate across:
1. **Hero Section** (`[GROOM_NAME] & [BRIDE_NAME]`)
2. **Main Invitation Headlines**
3. **RSVP Modal Header**
4. **Browser Title & Meta Tags**

---

## 📸 Running Automated QA Verification

To generate full-fidelity screenshots of all 6 sections and the RSVP modal:

```bash
node qa_screenshots.mjs
```

Screenshots are saved to `qa_screenshots/`:
- `01_hero.png` — Hero section with parchment background and gopuram zoom
- `02_blessing.png` — Section 02 (The Blessing)
- `03_light.png` — Section 03 (The Light)
- `04_gathering.png` — Section 04 (The Gathering & Event Schedule)
- `05_horizon.png` — Section 05 (The Horizon)
- `06_promise.png` — Section 06 (The Promise & RSVP CTA)
- `07_rsvp_modal.png` — Interactive RSVP modal card

---

## 🛠 Tech Stack

- **React 18** + **TypeScript**
- **Vite**
- **GSAP 3** + **ScrollTrigger**
- **Framer Motion**
- **Puppeteer** (Automated QA testing)

