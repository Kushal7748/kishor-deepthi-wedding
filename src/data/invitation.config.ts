// ============================================================
// WEDDING INVITATION CONFIGURATION
// ============================================================
// Personalization details referenced directly from the wedding
// invitation card for Chi. Ry. Kishor V & Chi. Sou. Deepthi V.
// ============================================================

export const config = {
  // ── INVOCATIONS ───────────────────────────────────────────
  invocations: [
    "|| Sri Lakshmivenkateshwara Swamy Prasanna ||",
    "|| Sri Muthuraya Swamy Prasanna ||",
  ],

  // ── COUPLE ────────────────────────────────────────────────
  groom: {
    title: "Chi. Ry.",
    firstName: "Kishor V",
    degree: "M.B.A.",
    fullName: "Chi. Ry. Kishor. V M.B.A.",
  },
  bride: {
    title: "Chi. Sou.",
    firstName: "Deepthi V",
    degree: "M.B.A.",
    fullName: "Chi. Sou. Deepthi. V M.B.A.",
  },

  // ── PARENTS & FAMILIES ────────────────────────────────────
  parents: {
    groom: {
      names: "Smt. H. Pushpalatha & Sri M. Venkatesh",
      lineage: "(S/o. Late Smt. Sakamma & Late Sri Muniyappa)",
      address: "Aluru, Dasanapura Hobli, Bangalore North Taluk - 562162",
    },
    bride: {
      names: "Smt. Ganga & Sri Venkatesh. M",
      address: "No. 09, Sri Varaha Krupa, 2nd Cross, New Town, Nelamangala, Bangalore R. Dist.",
    },
    awaitingPresence: [
      "Smt. H. Pushpalatha & Sri M. Venkatesh",
      "Chi. Muthuraj. V B.Pharm., MBA (HA)",
      "Smt. Ganga & Sri Venkatesh. M",
    ],
    compliments: "With Best Compliments From: Relatives & Friends",
  },

  // ── VENUE ─────────────────────────────────────────────────
  venue: {
    name: '"SUVIDHA RESORTS" (AJJI THOTA)',
    landmark: "Opp. Acharya College, Thammenahallipalya",
    hobli: "Dasanapura Hobli, Bangalore North - 562162",
    mapQuery: "Suvidha Resorts, Thammenahalli Palya, Acharya College, Bangalore",
  },

  // ── HERO ──────────────────────────────────────────────────
  hero: {
    supertitle: "WITH FULL HEARTS & OUR FAMILIES' BLESSINGS",
    // Marked subtitles removed per user request (2nd pic)
    tagline1:   "",
    tagline2:   "",
    dateRange:  "19 — 20 NOVEMBER 2026",
    location:   "SUVIDHA RESORTS · BANGALORE",
  },

  // ── SECTIONS ──────────────────────────────────────────────
  sections: {
    blessing: {
      label:     "02 THE BLESSING",
      supertitle:"IN THE QUIET, WE FOUND OUR ANSWER",
      headline1: "Some journeys",
      headline2: "feel like prayer.",
      body1:     "With grateful hearts and our elders' blessings,",
      body2:     "we take our first steps towards forever.",
    },
    light: {
      label:     "03 THE LIGHT",
      supertitle:"A LITTLE LIGHT. A LIFETIME OF LOVE.",
      headline1: "Every ordinary day.",
      headline2: "With you.",
      // Marked subtitles removed per user request (3rd pic)
      body1:     "",
      body2:     "",
    },
    gathering: {
      label:     "04 THE CELEBRATIONS",
      supertitle:"TWO SACRED DAYS. A LIFETIME OF LOVE.",
      headline1: "The auspicious",
      headline2: "ceremonies.",
      events: [
        {
          date: "19 NOV",
          fullDate: "19-11-2026, Thursday",
          day: "Thursday",
          time: "06:30 PM ONWARDS",
          name: "Reception",
          note: "06:30 p.m. onwards",
          description: "An evening of celebration, warm blessings, and dinner.",
        },
        {
          date: "20 NOV",
          fullDate: "20-11-2026, Friday",
          day: "Friday",
          time: "09:10 AM — 10:10 AM",
          name: "Muhurtham",
          note: "Lagnam: Dhanassu (09:10 am to 10:10 am)",
          description: "The sacred wedding muhurtham followed by traditional feast.",
        },
      ],
    },
    horizon: {
      label:     "05 THE VENUE",
      supertitle:"WHERE OUR FOREVER BEGINS",
      headline1: "Suvidha Resorts",
      headline2: "(Ajji Thota)",
      body1:     "Opp. Acharya College, Thammenahallipalya",
      body2:     "Dasanapura Hobli, Bangalore North - 562162",
    },
    promise: {
      label:     "06 THE INVITATION",
      supertitle:"SOLICIT YOUR GRACIOUS PRESENCE",
      headline1: "Our forever.",
      headline2: "Your presence.",
      body1:     "Solicit your gracious presence with family & friends",
      body2:     "on this auspicious occasion of our wedding.",
      ctaButton: "JOIN OUR CELEBRATION",
      ctaLink:   "THE WEDDING DETAILS",
    },
  },

  // ── RSVP MODAL ────────────────────────────────────────────
  rsvp: {
    heading:     "A place for you.",
    description: "Please grace the occasion with your presence and blessings.",
    ctaButton:   "Save my RSVP",
    rsvpOptions: ["Joyfully accept", "Sending love from afar"],
  },

  // ── NAVIGATION ────────────────────────────────────────────
  nav: {
    celebrationsLink: "THE CELEBRATIONS",
    scrollCta:        "SCROLL TO UNFOLD",
    backLink:         "BACK TO THE BEGINNING",
  },

  // ── ASSETS ────────────────────────────────────────────────
  images: {
    hero:      "/images/hero-gopuram.jpg",
    blessing:  "/images/temple-corridor.jpg",
    light:     "/images/pillared-mandapa.jpg",
    gathering: "/images/stone-colonnade.jpg",
    horizon:   "/images/coastal-sea.jpg",
    promise:   "/images/coastal-arch.jpg",
  },

  audio: {
    backgroundMusic: "/audio/wedding-music.mp3",
  },
};

export type InvitationConfig = typeof config;
