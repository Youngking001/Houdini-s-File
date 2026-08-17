/**
 * Build Sequence — Ground Up
 * -----------------------------------------------------------------
 * An interactive, decision-driven construction guide (site assessment
 * through handover).
 *
 * Structure (v2):
 *  - Landing view: shown whenever there's no signed-in session. Gives
 *    an overview of the app and hosts the sign in / sign up form.
 *  - Stage overview: shown right after sign-in — a grid of all 9
 *    stages with progress + lock status.
 *  - Stage detail: a single stage's content, reachable either by
 *    tapping a card in the overview, or via the dropdown / prev-next
 *    controls inside detail view itself.
 *
 * Branching content: answers recorded in one stage (soil type, budget
 * tier, floor count) change guidance shown in later stages — see
 * dynamicSummary() and the SOIL_TEXT / ROOF_TEXT / FLOORS_TEXT lookup
 * tables below.
 *
 * All progress/decision state is kept in React state only — nothing
 * persists between page loads except account + unlock status, which
 * live in Supabase (see supabaseClient.js).
 * -----------------------------------------------------------------
 */
import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabaseClient";

/* ---------- Design tokens: clean engineering white/gray + one accent ---------- */
const C = {
  bg: "#F6F7F9",
  bgAlt: "#EEF0F3",
  panel: "#FFFFFF",
  border: "#DDE1E6",
  borderStrong: "#C3C9D1",
  text: "#1B1F24",
  textDim: "#5B6472",
  accent: "#1D4ED8", // primary brand / CTA blue
  accentDim: "#1E40AF",
  accentSoft: "rgba(29,78,216,0.08)",
  yellow: "#D9A017", // safety-yellow, used sparingly as a second accent
  yellowSoft: "rgba(217,160,23,0.10)",
  ok: "#15803D",
  warn: "#B91C1C", // locked / error / caution
  warnSoft: "rgba(185,28,28,0.06)",
};

// Subtle blue + yellow color wash behind the white/gray base. Used on
// full-page backgrounds via backgroundImage — kept low-opacity so text
// contrast stays clean.
const BG_WASH = `
  radial-gradient(ellipse 700px 500px at 10% -5%, rgba(29,78,216,0.07), transparent 60%),
  radial-gradient(ellipse 600px 500px at 100% 15%, rgba(217,160,23,0.08), transparent 55%),
  radial-gradient(ellipse 500px 400px at 15% 100%, rgba(217,160,23,0.05), transparent 55%),
  radial-gradient(ellipse 600px 500px at 100% 100%, rgba(29,78,216,0.05), transparent 55%)
`;

const FONT = "'Times New Roman', Times, serif";

/* ---------- Simple line-art civil engineering sketches ----------
 * Plain stroke-only SVGs (no fill) so they read as sketches, not
 * clip-art. Used both small (feature icons) and large + faint
 * (decorative background elements on the landing page). */
function IconHardHat({ size = 40, color = C.accent, opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={opacity}>
      <path d="M8 44 C8 24 18 16 32 16 C46 16 56 24 56 44" />
      <line x1="4" y1="44" x2="60" y2="44" />
      <rect x="26" y="7" width="12" height="9" rx="2" />
    </svg>
  );
}

function IconSetSquare({ size = 40, color = C.accent, opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={opacity}>
      <path d="M10 54 L10 10 L54 54 Z" />
      <line x1="10" y1="20" x2="19" y2="20" />
      <line x1="10" y1="30" x2="19" y2="30" />
      <line x1="10" y1="40" x2="19" y2="40" />
    </svg>
  );
}

function IconLevel({ size = 40, color = C.accent, opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={opacity}>
      <rect x="5" y="26" width="54" height="12" rx="2" />
      <circle cx="32" cy="32" r="4" />
      <line x1="17" y1="26" x2="17" y2="38" />
      <line x1="47" y1="26" x2="47" y2="38" />
    </svg>
  );
}

function IconClipboard({ size = 40, color = C.accent, opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={opacity}>
      <rect x="14" y="10" width="36" height="48" rx="3" />
      <rect x="24" y="6" width="16" height="8" rx="2" />
      <line x1="22" y1="26" x2="42" y2="26" />
      <line x1="22" y1="36" x2="42" y2="36" />
      <line x1="22" y1="46" x2="36" y2="46" />
    </svg>
  );
}

function IconCrane({ size = 40, color = C.accent, opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={opacity}>
      <line x1="12" y1="58" x2="12" y2="10" />
      <line x1="12" y1="10" x2="52" y2="10" />
      <line x1="14" y1="18" x2="22" y2="10" />
      <line x1="52" y1="10" x2="52" y2="22" />
      <line x1="4" y1="58" x2="20" y2="58" />
    </svg>
  );
}

function IconBlueprintRoll({ size = 40, color = C.accent, opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={opacity}>
      <rect x="10" y="14" width="44" height="30" rx="2" />
      <line x1="18" y1="22" x2="30" y2="22" />
      <line x1="18" y1="28" x2="46" y2="28" />
      <line x1="18" y1="34" x2="38" y2="34" />
      <ellipse cx="10" cy="29" rx="4" ry="15" />
      <ellipse cx="54" cy="29" rx="4" ry="15" />
    </svg>
  );
}

// Faint, large, rotated sketches scattered behind the landing page's
// content — decorative only (pointer-events: none, low opacity).
function LandingSketches() {
  const items = [
    { Icon: IconSetSquare, top: "6%", left: "3%", size: 130, rot: -8, color: C.accent },
    { Icon: IconHardHat, top: "8%", right: "4%", size: 110, rot: 10, color: C.yellow },
    { Icon: IconLevel, bottom: "16%", left: "6%", size: 120, rot: 6, color: C.yellow },
    { Icon: IconCrane, bottom: "4%", right: "6%", size: 150, rot: -4, color: C.accent },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: it.top,
            left: it.left,
            right: it.right,
            bottom: it.bottom,
            transform: `rotate(${it.rot}deg)`,
          }}
        >
          <it.Icon size={it.size} color={it.color} opacity={0.1} />
        </div>
      ))}
    </div>
  );
}

/* ---------- Content model ---------- */
const STAGES = [
  {
    id: 1,
    name: "Site Assessment & Documentation",
    weight: 3,
    summary:
      "Confirm legal title, boundaries, and ground conditions before anything is designed. This stage produces the facts every later decision depends on.",
    checklist: [
      "Certificate of Occupancy / land title verified",
      "Survey plan obtained and beacons located on site",
      "Soil test carried out (bearing capacity + water table)",
      "Setback / zoning rules confirmed with local planning authority",
      "Topographic survey done if plot is sloped",
    ],
    errors: [
      "Starting excavation before the soil test result is back — the foundation type downstream depends on it.",
      "Relying on a neighbour's soil report instead of testing your own plot; conditions vary within metres.",
    ],
    decision: {
      key: "soil",
      label: "What did the soil test show?",
      options: [
        { value: "sandy", label: "Sandy / firm loamy" },
        { value: "clay", label: "Clayey / expansive" },
        { value: "waterlogged", label: "Waterlogged / weak / peaty" },
      ],
    },
  },
  {
    id: 2,
    name: "Planning & Design",
    weight: 3,
    summary:
      "Architectural, structural, and MEP drawings are produced and reconciled here, along with the Bill of Quantities that will govern cost tracking.",
    checklist: [
      "Architectural drawings finalised and client-approved",
      "Structural drawings signed off by a registered structural engineer",
      "Electrical & plumbing (MEP) drawings coordinated with structural",
      "Bill of Quantities (BOQ) prepared",
      "Building permit application submitted",
    ],
    errors: [
      "Proceeding without a structural engineer's stamp — this is a common shortcut that shows up as cracking later.",
      "Under-budgeting the BOQ by pricing only materials and skipping labour, waste allowance, and haulage.",
    ],
    decision: {
      key: "budget",
      label: "What budget tier are you designing for?",
      options: [
        { value: "economy", label: "Economy" },
        { value: "standard", label: "Standard" },
        { value: "premium", label: "Premium" },
      ],
    },
  },
  {
    id: 3,
    name: "Site Preparation & Setting Out",
    weight: 5,
    summary:
      "The plot is cleared, levelled, and the building's exact footprint is marked on the ground using profile boards and string lines.",
    checklist: [
      "Site cleared of vegetation, debris, and topsoil stripped",
      "Site fenced and temporary water/power arranged",
      "Profile boards erected at corners",
      "Building lines and diagonals checked (equal diagonals = square corners)",
      "Bench mark level established for excavation depth reference",
    ],
    errors: [
      "Skipping the diagonal check — a footprint that's a few centimetres off-square compounds into real wall and roofing problems.",
      "Building right up against the boundary without re-confirming beacons against the survey plan.",
    ],
  },
  {
    id: 4,
    name: "Foundation",
    weight: 15,
    summary: null, // filled dynamically by soil decision
    checklist: [
      "Excavation to the depth specified for the confirmed soil condition",
      "Plain Cement Concrete (PCC) blinding layer laid before reinforcement",
      "Reinforcement placed and inspected before pouring",
      "Concrete poured in one continuous operation per section",
      "Minimum 7-day moist curing before loading the foundation",
    ],
    errors: [
      "Pouring concrete before the blinding layer cures — this compromises the reinforcement cover.",
      "Backfilling or building on the foundation before the minimum curing period.",
      "Using an ad-hoc mix ratio instead of the one specified in the structural drawing.",
    ],
  },
  {
    id: 5,
    name: "Substructure — DPC & Plinth",
    weight: 8,
    summary:
      "The damp-proof course and plinth beam form the transition between foundation and superstructure, and are the building's main defence against rising damp.",
    checklist: [
      "Damp-proof course (DPC) laid across the full wall width",
      "Plinth beam cast and cured",
      "Backfilling done in compacted layers, not dumped in bulk",
      "Plinth level checked against the bench mark before wall-up begins",
    ],
    errors: [
      "Skipping the DPC to save cost — this is one of the most common causes of damp walls years later.",
      "Backfilling in one bulk layer, leaving air pockets that settle unevenly under floor slabs.",
    ],
  },
  {
    id: 6,
    name: "Superstructure — Frame & Walls",
    weight: 30,
    summary:
      "Columns, beams, and slabs are cast to form the building's skeleton, then walls are built up between them to lintel and roof level.",
    checklist: [
      "Columns cast plumb and cured before loading",
      "Beams and slabs cast per structural drawing at each floor level",
      "Block/brick walls raised with correct mortar mix",
      "Lintels cast over every door and window opening before wall continues above",
      "Curing maintained on all fresh concrete elements",
    ],
    errors: [
      "Continuing block work above an opening without casting the lintel first.",
      "Rushing curing time on columns before the next floor's load is applied.",
    ],
    decision: {
      key: "floors",
      label: "How many floors is the building?",
      options: [
        { value: "1", label: "Single storey" },
        { value: "2", label: "Two storeys" },
        { value: "3+", label: "Three or more" },
      ],
    },
  },
  {
    id: 7,
    name: "Roofing",
    weight: 12,
    summary: null, // filled dynamically by budget decision
    checklist: [
      "Roof structure (trusses/rafters) erected and braced",
      "Roof pitch confirmed as suitable for the chosen covering material",
      "Roofing sheets/tiles fixed with correct fasteners and overlap",
      "Fascia boards and gutters installed with a fall toward downpipes",
    ],
    errors: [
      "Choosing a low pitch with a material that needs a steeper slope, causing leaks in the rains.",
      "Skipping truss bracing — trusses can rack sideways under wind load without it.",
    ],
  },
  {
    id: 8,
    name: "MEP Rough-in & Finishing",
    weight: 22,
    summary:
      "Electrical and plumbing lines are installed, then the building is plastered, floored, and fitted out.",
    checklist: [
      "Electrical conduits and plumbing pipes sleeved before plastering",
      "Plastering done to a true, plumb finish",
      "Screeding and floor finishes (tiles/terrazzo/etc.) laid",
      "Doors, windows, and ironmongery fitted",
      "Painting and final fixtures installed",
    ],
    errors: [
      "Chasing walls for wiring after plastering is complete, instead of sleeving conduits beforehand.",
      "Tiling before screed has fully cured, causing hollow or cracked tiles.",
    ],
  },
  {
    id: 9,
    name: "Inspection & Handover",
    weight: 2,
    summary:
      "The building is checked against drawings and code, defects are logged and closed out, and documentation is handed to the owner.",
    checklist: [
      "Final structural and safety inspection carried out",
      "Snag list (defects) compiled and closed out",
      "Certificate of completion / occupancy obtained where required",
      "As-built drawings and warranty documents handed over",
    ],
    errors: [
      "Skipping the formal inspection because the building 'looks done'.",
      "No as-built documentation left with the owner — this becomes a real problem for any future renovation.",
    ],
  },
];

const SOIL_TEXT = {
  sandy:
    "Sandy / firm loamy soil confirmed — a strip or pad footing is typically adequate. Excavate to the depth specified in your structural drawing (commonly 1–1.5m, but let the engineer's numbers govern).",
  clay:
    "Clayey / expansive soil confirmed — expansive clays shrink and swell with moisture, so a raft foundation or a deeper strip footing with extra reinforcement is usually specified. Do not use a standard strip-footing depth here without engineer sign-off.",
  waterlogged:
    "Waterlogged / weak soil confirmed — this soil condition generally requires a pile foundation or significant ground improvement. This is not a stage to economise on; get a geotechnical engineer directly involved.",
  default:
    "Foundation type depends on your soil test result. Go back to Stage 1 and record the result to see the specific guidance here.",
};

const ROOF_TEXT = {
  economy:
    "Economy tier — long-span aluminium roofing sheets on timber trusses is the common cost-effective choice. Keep pitch and fastening exactly to the sheet manufacturer's spec; skimping here is a frequent leak cause.",
  standard:
    "Standard tier — aluminium or step-tile sheeting on timber or light steel trusses, with proper fascia and gutter detailing, is typical.",
  premium:
    "Premium tier — clay/concrete tiles or Decra-type stone-coated sheets on engineered trusses are common, with attention to insulation and ceiling detailing.",
  default:
    "Roofing material recommendation depends on your budget tier. Set it in Stage 2 to see specific guidance here.",
};

// Detailed, storey-specific structural guidance — this replaces the old
// one-line "3+ storeys, be careful" warning with an actual explanation
// of what changes at each height.
const FLOORS_TEXT = {
  "1": {
    label: "Single storey",
    detail:
      "Standard column, beam, and foundation sizing from your structural drawing applies directly — loads are straightforward and a typical strip or pad foundation (per your soil result in Stage 1) is usually sufficient.",
  },
  "2": {
    label: "Two storeys",
    detail:
      "Do not assume ground-floor column and beam sizing simply carries up. The added floor roughly doubles the load path down to the foundation, so beam spans, column sections, and foundation bearing capacity all need to be rechecked for two storeys specifically — confirm this explicitly with your structural engineer rather than reusing single-storey numbers.",
  },
  "3+": {
    label: "Three or more storeys",
    detail:
      "This is a different structural regime, not just 'more of the same'. Wind loading — and seismic loading, depending on your location — becomes a real design factor, not a rounding error. Column and beam sizing must be calculated storey by storey, not assumed uniform. A raft or pile foundation is common instead of a simple strip footing, since point loads at the base are significantly higher. Full engineering design, structural drawings, and formal approval are required before construction — this height should not be attempted on a self-build, rule-of-thumb basis.",
  },
};

const FREE_LIMIT = 3;

export default function App() {
  /* ---------- Core state ---------- */
  const [page, setPage] = useState("landing"); // "landing" | "overview" | "detail"
  const [active, setActive] = useState(1);
  const [projectName, setProjectName] = useState("UNTITLED PROJECT");
  const [decisions, setDecisions] = useState({});
  const [checks, setChecks] = useState({});

  /* ---------- Waitlist (for locked stages) ---------- */
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistError, setWaitlistError] = useState("");

  const submitWaitlist = async () => {
    if (!waitlistEmail.includes("@")) return;
    setWaitlistSubmitting(true);
    setWaitlistError("");
    const { error } = await supabase
      .from("waitlist")
      .insert({ email: waitlistEmail });
    setWaitlistSubmitting(false);
    if (error) {
      setWaitlistError("Something went wrong — try again in a moment.");
      return;
    }
    setWaitlistSubmitted(true);
  };

  /* ---------- Auth: session, profile (is_paid / unlocked_stages) ---------- */
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authMode, setAuthMode] = useState("signin"); // "signin" | "signup"
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authInfo, setAuthInfo] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("id, email, is_paid, unlocked_stages")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setProfile(data || null));
  }, [session]);

  // The moment a session appears while we're still on the landing
  // page (e.g. right after sign-in), move to the stage overview.
  useEffect(() => {
    if (session && page === "landing") setPage("overview");
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPaid = !!profile?.is_paid;
  const unlockedStages = profile?.unlocked_stages || [];
  const isUnlocked = (stageId) =>
    stageId <= FREE_LIMIT || isPaid || unlockedStages.includes(stageId);

  const handleAuth = async () => {
    setAuthError("");
    setAuthInfo("");
    if (!authEmail.includes("@") || authPassword.length < 6) {
      setAuthError("Enter a valid email and a password of 6+ characters.");
      return;
    }
    setAuthLoading(true);
    if (authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        setAuthLoading(false);
        setAuthError(error.message);
        return;
      }
      if (data.user) {
        await supabase
          .from("profiles")
          .upsert({ id: data.user.id, email: authEmail });
      }
      if (!data.session) {
        setAuthLoading(false);
        setAuthInfo(
          "Account created. If sign-in doesn't work right away, email confirmation may still be required — check your inbox, or try again shortly."
        );
        setAuthPassword("");
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        setAuthLoading(false);
        setAuthError(
          error.message.toLowerCase().includes("confirm")
            ? "This account's email hasn't been confirmed yet. Check your inbox for a confirmation link, or check back shortly."
            : error.message
        );
        return;
      }
    }
    setAuthLoading(false);
    setAuthEmail("");
    setAuthPassword("");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setPage("landing");
  };

  /* ---------- Progress / content helpers ---------- */
  const stage = STAGES.find((s) => s.id === active);

  const toggleCheck = (stageId, idx) => {
    const key = `${stageId}-${idx}`;
    setChecks((c) => ({ ...c, [key]: !c[key] }));
  };

  const stageProgress = (s) => {
    const total = s.checklist.length;
    let done = 0;
    for (let i = 0; i < total; i++) if (checks[`${s.id}-${i}`]) done++;
    return { done, total };
  };

  const overallProgress = useMemo(() => {
    let done = 0,
      total = 0;
    STAGES.forEach((s) => {
      const p = stageProgress(s);
      done += p.done;
      total += p.total;
    });
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [checks]);

  const dynamicSummary = (s) => {
    if (s.id === 4) return SOIL_TEXT[decisions.soil] || SOIL_TEXT.default;
    if (s.id === 7) return ROOF_TEXT[decisions.budget] || ROOF_TEXT.default;
    return s.summary;
  };

  const goToStage = (id) => {
    setActive(id);
    setPage("detail");
  };

  /* AuthPanel and AccountBar are defined outside App() (near the
     bottom of this file) so their component identity stays stable
     across renders — see the note down there for why that matters. */


  /* ================= RENDER ================= */

  // ---- Landing page (no session) ----
  if (!session) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          backgroundImage: BG_WASH,
          fontFamily: FONT,
          color: C.text,
          position: "relative",
        }}
      >
        <LandingSketches />
        <header
          style={{
            borderBottom: `1px solid ${C.border}`,
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(4px)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <IconBlueprintRoll size={22} color={C.accent} />
            Build Sequence
          </div>
          <div style={{ fontSize: 12.5, color: C.textDim, letterSpacing: "0.06em" }}>
            GROUND UP — FOUNDATION TO FINISH
          </div>
        </header>

        <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 80px", position: "relative", zIndex: 1 }}>
          <h1 style={{ fontSize: 34, lineHeight: 1.25, marginBottom: 14, fontWeight: 700 }}>
            A construction guide that walks with you from cleared land to
            handover — one decision at a time.
          </h1>
          <p style={{ fontSize: 17, color: C.textDim, lineHeight: 1.6, maxWidth: 640, marginBottom: 32 }}>
            Nine stages, real site checklists, and guidance that actually
            changes based on your soil test, your budget, and your floor
            count — not a generic list of steps copied from a textbook.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginBottom: 44,
            }}
          >
            {[
              {
                title: "Decision-driven",
                body: "Your soil type changes the foundation guidance. Your budget changes the roofing guidance. Your floor count changes structural guidance.",
                Icon: IconSetSquare,
                iconColor: C.accent,
                bg: C.accentSoft,
              },
              {
                title: "Site checklists",
                body: "Every stage ships with a practical, tickable checklist — not just theory.",
                Icon: IconClipboard,
                iconColor: C.yellow,
                bg: C.yellowSoft,
              },
              {
                title: "Common site errors",
                body: "Each stage flags the mistakes that actually happen on real sites, not textbook trivia.",
                Icon: IconHardHat,
                iconColor: C.accent,
                bg: C.accentSoft,
              },
            ].map((f, i) => (
              <div
                key={i}
                style={{
                  background: C.panel,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: 18,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    background: f.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <f.Icon size={26} color={f.iconColor} />
                </div>
                <div style={{ fontWeight: 700, marginBottom: 6, color: C.text }}>
                  {f.title}
                </div>
                <div style={{ fontSize: 14, color: C.textDim, lineHeight: 1.5 }}>
                  {f.body}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: 28,
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              maxWidth: 400,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
              Get started
            </div>
            <div style={{ fontSize: 13.5, color: C.textDim, marginBottom: 18 }}>
              Stages 1–{FREE_LIMIT} are free for everyone once you're signed
              in. No card required to create an account.
            </div>
            <AuthPanel
              authMode={authMode}
              setAuthMode={setAuthMode}
              authEmail={authEmail}
              setAuthEmail={setAuthEmail}
              authPassword={authPassword}
              setAuthPassword={setAuthPassword}
              authLoading={authLoading}
              authError={authError}
              authInfo={authInfo}
              handleAuth={handleAuth}
            />
          </div>
        </main>
      </div>
    );
  }

  // ---- Stage overview (signed in, page === "overview") ----
  if (page === "overview") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, backgroundImage: BG_WASH, fontFamily: FONT, color: C.text }}>
        <header
          style={{
            borderBottom: `1px solid ${C.border}`,
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <IconBlueprintRoll size={22} color={C.accent} />
            Build Sequence
          </div>
          <AccountBar session={session} isPaid={isPaid} unlockedStages={unlockedStages} handleSignOut={handleSignOut} />
        </header>

        <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 60px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Your stages</h2>
            <span style={{ fontSize: 13.5, color: C.textDim }}>
              Overall progress: <strong style={{ color: C.accent }}>{overallProgress.pct}%</strong>
            </span>
          </div>
          <p style={{ color: C.textDim, marginBottom: 26, fontSize: 14.5 }}>
            Select any stage to begin. Locked stages are shown so you can
            see the full scope of the guide.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {STAGES.map((s) => {
              const p = stageProgress(s);
              const complete = p.done === p.total;
              const unlocked = isUnlocked(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => goToStage(s.id)}
                  style={{
                    textAlign: "left",
                    background: C.panel,
                    border: `1px solid ${unlocked ? C.border : C.warn}`,
                    borderRadius: 6,
                    padding: 16,
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    fontFamily: FONT,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12.5, color: C.textDim }}>
                      Stage {String(s.id).padStart(2, "0")} · {s.weight}% of build
                    </span>
                    {!unlocked ? (
                      <span style={{ color: C.warn, fontSize: 12.5 }}>Locked</span>
                    ) : complete ? (
                      <span style={{ color: C.ok, fontSize: 12.5 }}>Complete</span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: C.text }}>
                    {s.name}
                  </div>
                  {unlocked && (
                    <div style={{ width: "100%", height: 5, background: C.bgAlt, borderRadius: 3, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${p.total ? Math.round((p.done / p.total) * 100) : 0}%`,
                          height: "100%",
                          background: complete ? C.ok : C.accent,
                        }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  // ---- Stage detail (signed in, page === "detail") ----
  const floorsInfo = decisions.floors ? FLOORS_TEXT[decisions.floors] : null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, backgroundImage: BG_WASH, fontFamily: FONT, color: C.text }}>
      <header
        style={{
          borderBottom: `1px solid ${C.border}`,
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(4px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <button onClick={() => setPage("overview")} style={linkBtnStyle}>
            ← All stages
          </button>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Build Sequence</div>
        </div>
        <AccountBar session={session} isPaid={isPaid} unlockedStages={unlockedStages} handleSignOut={handleSignOut} />
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "28px 24px 60px" }}>
        {/* Stage dropdown + prev/next */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
          <select
            value={active}
            onChange={(e) => setActive(Number(e.target.value))}
            style={{
              ...inputStyle,
              width: "auto",
              flex: "1 1 220px",
              marginBottom: 0,
              fontFamily: FONT,
            }}
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {String(s.id).padStart(2, "0")} — {s.name}
                {!isUnlocked(s.id) ? " (locked)" : ""}
              </option>
            ))}
          </select>
          <button
            disabled={active === 1}
            onClick={() => setActive((a) => Math.max(1, a - 1))}
            style={secondaryBtnStyle(active === 1)}
          >
            ← Prev
          </button>
          <button
            disabled={active === STAGES.length}
            onClick={() => setActive((a) => Math.min(STAGES.length, a + 1))}
            style={secondaryBtnStyle(active === STAGES.length)}
          >
            Next →
          </button>
        </div>

        <div style={{ fontSize: 13, color: C.textDim, marginBottom: 4 }}>
          Stage {String(stage.id).padStart(2, "0")} of {STAGES.length} · {stage.weight}% of build
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 12px" }}>{stage.name}</h2>
        <p style={{ color: C.textDim, lineHeight: 1.6, fontSize: 15.5, marginBottom: 18 }}>
          {!isUnlocked(stage.id)
            ? "This stage — checklist, decision branching, and common site errors — is part of the full version, which is still in progress."
            : dynamicSummary(stage)}
        </p>

        {!isUnlocked(stage.id) ? (
          <div
            style={{
              border: `1px solid ${C.warn}`,
              background: C.warnSoft,
              borderRadius: 6,
              padding: 20,
              maxWidth: 460,
            }}
          >
            <div style={{ fontWeight: 700, color: C.warn, marginBottom: 8 }}>
              Full version — launching soon
            </div>
            <p style={{ fontSize: 13.5, color: C.textDim, lineHeight: 1.5, marginBottom: 6 }}>
              Available either one stage at a time, or as a full bundle at a
              discount. Payment isn't live yet — leave your email and
              you'll hear when it opens.
            </p>
            {waitlistSubmitted ? (
              <div style={{ color: C.ok, fontSize: 13.5, marginTop: 10 }}>
                ✓ You're on the list — we'll email you when it's ready.
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  style={{ ...inputStyle, flex: 1, minWidth: 180, marginBottom: 0 }}
                />
                <button
                  onClick={submitWaitlist}
                  disabled={waitlistSubmitting}
                  style={primaryBtnStyle(waitlistSubmitting)}
                >
                  {waitlistSubmitting ? "Saving..." : "Notify me"}
                </button>
              </div>
            )}
            {waitlistError && <div style={errorTextStyle}>{waitlistError}</div>}
          </div>
        ) : (
          <>
            {stage.decision && (
              <div
                style={{
                  border: `1px solid ${C.border}`,
                  background: C.panel,
                  borderRadius: 6,
                  padding: 18,
                  marginBottom: 22,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ fontSize: 12.5, color: C.accent, fontWeight: 700, marginBottom: 10 }}>
                  DECISION POINT
                </div>
                <div style={{ fontSize: 15, marginBottom: 12 }}>{stage.decision.label}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {stage.decision.options.map((opt) => {
                    const selected = decisions[stage.decision.key] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setDecisions((d) => ({ ...d, [stage.decision.key]: opt.value }))
                        }
                        style={{
                          fontFamily: FONT,
                          fontSize: 14,
                          padding: "9px 14px",
                          border: `1px solid ${selected ? C.accent : C.border}`,
                          background: selected ? C.accentSoft : C.bg,
                          color: selected ? C.accent : C.text,
                          borderRadius: 5,
                          cursor: "pointer",
                          fontWeight: selected ? 700 : 400,
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {stage.id === 6 && floorsInfo && (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: `1px solid ${C.border}`,
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: C.text,
                    }}
                  >
                    <strong>{floorsInfo.label}:</strong> {floorsInfo.detail}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: 26 }}>
              <div style={{ fontSize: 12.5, color: C.textDim, fontWeight: 700, marginBottom: 10 }}>
                SITE CHECKLIST
              </div>
              {stage.checklist.map((item, idx) => {
                const key = `${stage.id}-${idx}`;
                const done = !!checks[key];
                return (
                  <label
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "9px 0",
                      borderBottom: `1px solid ${C.border}`,
                      cursor: "pointer",
                      fontSize: 15,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleCheck(stage.id, idx)}
                      style={{ marginTop: 3, accentColor: C.accent }}
                    />
                    <span style={{ color: done ? C.ok : C.text, lineHeight: 1.45 }}>{item}</span>
                  </label>
                );
              })}
            </div>

            <div style={{ marginBottom: 30 }}>
              <div style={{ fontSize: 12.5, color: C.warn, fontWeight: 700, marginBottom: 10 }}>
                COMMON SITE ERRORS AT THIS STAGE
              </div>
              {stage.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 14.5, color: C.textDim, lineHeight: 1.55, padding: "6px 0" }}>
                  — {e}
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            disabled={active === 1}
            onClick={() => setActive((a) => Math.max(1, a - 1))}
            style={secondaryBtnStyle(active === 1)}
          >
            ← Prev stage
          </button>
          <button
            disabled={active === STAGES.length}
            onClick={() => setActive((a) => Math.min(STAGES.length, a + 1))}
            style={secondaryBtnStyle(active === STAGES.length)}
          >
            Next stage →
          </button>
        </div>
      </main>
    </div>
  );
}

/**
 * AuthPanel / AccountBar — defined OUTSIDE App() on purpose.
 *
 * Bug this fixes: when a component like this was defined *inside*
 * App() (as `const AuthPanel = () => (...)`), a brand-new function —
 * and therefore a brand-new component type, as far as React is
 * concerned — was created on every single App() re-render. Typing one
 * character into the email field changes state, which re-renders
 * App(), which redefines AuthPanel from scratch, which makes React
 * unmount the old <input> and mount a fresh one. On mobile that
 * unmount/remount is exactly what dismisses the keyboard after every
 * keystroke. Defining these as stable, top-level components (and
 * passing state in as props instead of closing over it) keeps their
 * identity fixed across renders, so the <input> element itself is
 * never torn down — focus and the keyboard stay put.
 */
function AuthPanel({
  authMode,
  setAuthMode,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authLoading,
  authError,
  authInfo,
  handleAuth,
}) {
  return (
    <div style={{ maxWidth: 360 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button
          onClick={() => setAuthMode("signin")}
          style={tabBtnStyle(authMode === "signin")}
        >
          SIGN IN
        </button>
        <button
          onClick={() => setAuthMode("signup")}
          style={tabBtnStyle(authMode === "signup")}
        >
          CREATE ACCOUNT
        </button>
      </div>
      <input
        type="email"
        placeholder="you@email.com"
        value={authEmail}
        onChange={(e) => setAuthEmail(e.target.value)}
        style={inputStyle}
      />
      <input
        type="password"
        placeholder="password (6+ characters)"
        value={authPassword}
        onChange={(e) => setAuthPassword(e.target.value)}
        style={{ ...inputStyle, marginBottom: 12 }}
      />
      <button
        onClick={handleAuth}
        disabled={authLoading}
        style={primaryBtnStyle(authLoading)}
      >
        {authLoading
          ? "..."
          : authMode === "signup"
          ? "Create account"
          : "Sign in"}
      </button>
      {authError && <div style={errorTextStyle}>{authError}</div>}
      {authInfo && <div style={infoTextStyle}>{authInfo}</div>}
    </div>
  );
}

function AccountBar({ session, isPaid, unlockedStages, handleSignOut }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontSize: 13,
        color: C.textDim,
      }}
    >
      <span>
        {session?.user?.email}{" "}
        {isPaid
          ? "· Full access"
          : unlockedStages.length > 0
          ? `· ${unlockedStages.length} stage${
              unlockedStages.length > 1 ? "s" : ""
            } unlocked`
          : "· Free"}
      </span>
      <button onClick={handleSignOut} style={linkBtnStyle}>
        Sign out
      </button>
    </div>
  );
}

/* ---------- Shared style helpers ---------- */
const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  background: "#FFFFFF",
  border: `1px solid ${C_border()}`,
  color: "#1B1F24",
  padding: "10px 12px",
  fontSize: 14,
  borderRadius: 5,
  marginBottom: 10,
};

function C_border() {
  return "#DDE1E6";
}

function tabBtnStyle(active) {
  return {
    fontFamily: FONT,
    fontSize: 12.5,
    padding: "7px 12px",
    border: `1px solid ${active ? "#1D4ED8" : "#DDE1E6"}`,
    background: active ? "rgba(29,78,216,0.08)" : "transparent",
    color: active ? "#1D4ED8" : "#5B6472",
    borderRadius: 5,
    cursor: "pointer",
    fontWeight: active ? 700 : 400,
  };
}

function primaryBtnStyle(disabled) {
  return {
    fontFamily: FONT,
    fontSize: 14,
    padding: "10px 16px",
    background: disabled ? "#9CA8C4" : "#1D4ED8",
    border: "none",
    color: "#FFFFFF",
    borderRadius: 5,
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
  };
}

function secondaryBtnStyle(disabled) {
  return {
    fontFamily: FONT,
    fontSize: 14,
    padding: "9px 15px",
    background: disabled ? "#F0F1F3" : "#FFFFFF",
    border: `1px solid ${disabled ? "#DDE1E6" : "#C3C9D1"}`,
    color: disabled ? "#9AA2AC" : "#1B1F24",
    borderRadius: 5,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

const linkBtnStyle = {
  background: "none",
  border: "none",
  color: "#5B6472",
  textDecoration: "underline",
  cursor: "pointer",
  fontFamily: FONT,
  fontSize: 13,
  padding: 0,
};

const errorTextStyle = {
  color: "#B91C1C",
  fontSize: 12.5,
  marginTop: 8,
  fontFamily: FONT,
};

const infoTextStyle = {
  color: "#15803D",
  fontSize: 12.5,
  marginTop: 8,
  fontFamily: FONT,
  lineHeight: 1.4,
};
