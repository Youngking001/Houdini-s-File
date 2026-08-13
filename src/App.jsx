/**
 * Build Sequence — Ground Up
 * -----------------------------------------------------------------
 * An interactive, decision-driven construction guide (site assessment
 * through handover). Two things make this different from a static
 * checklist:
 *
 * 1. Branching content: answers recorded in one stage (soil type,
 *    budget tier, floor count) change the guidance shown in later
 *    stages — see `dynamicSummary()` and the SOIL_TEXT / ROOF_TEXT
 *    lookup tables below.
 * 2. Per-stage "common site errors" — practical failure modes, not
 *    just textbook steps.
 *
 * All state (checklist progress, decisions, project name) is kept in
 * React state only — nothing persists between page loads yet. See
 * README.md for notes on adding persistent storage.
 * -----------------------------------------------------------------
 */
import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabaseClient";

/* ---------- Design tokens ---------- */
const C = {
  bg: "#0F2A43",
  bgPanel: "#123655",
  bgPanelAlt: "#0D2438",
  line: "#2C5A82",
  lineFaint: "rgba(143,168,189,0.16)",
  accent: "#E8631C",
  accentDim: "#B54E17",
  text: "#EDEFF2",
  textDim: "#8FA8BD",
  ok: "#3FA796",
  warn: "#E8631C",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
`;

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

/* ---------- Component ----------
 * State shape:
 *  - decisions: { soil?, budget?, floors? } — answers from the
 *    decision blocks in Stages 1, 2, and 6. Read by dynamicSummary()
 *    to pick the right guidance text for Stages 4 and 7.
 *  - checks: { "<stageId>-<itemIndex>": true } — flat map of which
 *    checklist items are ticked, keyed per stage so progress can be
 *    computed per-stage and overall (see stageProgress / overallProgress).
 */
/* Stages 1-FREE_LIMIT are open to everyone; the rest are shown in the
 * nav rail (so the full scope of the app is visible) but gated behind
 * a waitlist prompt instead of content. Raise/lower this number to
 * change how much of the demo is free. */
const FREE_LIMIT = 3;

export default function App() {
  const [active, setActive] = useState(1);
  const [projectName, setProjectName] = useState("UNTITLED PROJECT");
  const [decisions, setDecisions] = useState({});
  const [checks, setChecks] = useState({});
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

  /* ---------- Auth: session, profile (is_paid), sign in/up form ---------- */
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // { id, email, is_paid }
  const [authMode, setAuthMode] = useState("signin"); // "signin" | "signup"
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authInfo, setAuthInfo] = useState("");
  const [showAuthForm, setShowAuthForm] = useState(false);

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
      .select("id, email, is_paid")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setProfile(data || null));
  }, [session]);

  const isPaid = !!profile?.is_paid;
  const isUnlocked = (stageId) => stageId <= FREE_LIMIT || isPaid;

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
      // Create the matching profiles row (id must equal auth.uid()).
      // Uses upsert so retrying signup on the same account doesn't error.
      if (data.user) {
        await supabase
          .from("profiles")
          .upsert({ id: data.user.id, email: authEmail });
      }
      // If email confirmation is still required on the Supabase project,
      // signUp succeeds but returns no session yet — the account exists
      // but can't sign in until the confirmation link is clicked (or the
      // project owner turns off "Confirm email" in Supabase Auth settings).
      if (!data.session) {
        setAuthLoading(false);
        setAuthInfo(
          "Account created. If sign-in doesn't work right away, email confirmation may still be required on this project — check your inbox, or try again shortly."
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
    setShowAuthForm(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

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

  const floorsWarning =
    decisions.floors === "3+" ? (
      <div
        style={{
          border: `1px solid ${C.accent}`,
          background: "rgba(232,99,28,0.08)",
          padding: "10px 12px",
          borderRadius: 4,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12.5,
          color: C.text,
          marginTop: 12,
        }}
      >
        3+ storeys flagged — column, beam, and foundation sizing beyond two
        storeys should not be estimated from this guide alone. Confirm every
        member size directly with your structural engineer.
      </div>
    ) : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        backgroundImage: `
          radial-gradient(ellipse at 20% 0%, rgba(63,167,150,0.07), transparent 55%),
          radial-gradient(ellipse at 100% 100%, rgba(232,99,28,0.06), transparent 50%),
          linear-gradient(${C.lineFaint} 1px, transparent 1px),
          linear-gradient(90deg, ${C.lineFaint} 1px, transparent 1px)
        `,
        backgroundSize: "auto, auto, 28px 28px, 28px 28px",
        color: C.text,
        fontFamily: "'Space Grotesk', sans-serif",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <style>{FONTS}</style>

      {/* Corner registration marks — drafting-sheet detail */}
      {[
        { top: 10, left: 10, borderRight: 0, borderBottom: 0 },
        { top: 10, right: 10, borderLeft: 0, borderBottom: 0 },
        { bottom: 10, left: 10, borderRight: 0, borderTop: 0 },
        { bottom: 10, right: 10, borderLeft: 0, borderTop: 0 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "fixed",
            width: 14,
            height: 14,
            border: `1.5px solid ${C.line}`,
            opacity: 0.6,
            pointerEvents: "none",
            zIndex: 50,
            ...pos,
          }}
        />
      ))}

      {/* Header */}
      <header
        style={{
          borderBottom: `2px solid ${C.line}`,
          boxShadow: `0 1px 0 0 ${C.lineFaint}`,
          padding: "20px 22px",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.02), transparent)",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.18em",
              color: C.accent,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13 }}>⌖</span>
            BUILD SEQUENCE — GROUND UP
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              marginTop: 4,
              letterSpacing: "-0.01em",
              textShadow: "0 0 24px rgba(232,99,28,0.25)",
            }}
          >
            Foundation-to-Finish Guide
          </div>
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            color: C.textDim,
            textAlign: "right",
            minWidth: 150,
          }}
        >
          OVERALL PROGRESS
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "flex-end",
              marginTop: 4,
            }}
          >
            <div
              style={{
                width: 70,
                height: 6,
                background: C.bgPanelAlt,
                border: `1px solid ${C.line}`,
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${overallProgress.pct}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${C.accentDim}, ${C.accent})`,
                  boxShadow: `0 0 8px ${C.accent}`,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <span style={{ color: C.accent, fontSize: 16, fontWeight: 700 }}>
              {overallProgress.pct}%
            </span>
          </div>
          {session && (
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: isPaid ? C.ok : C.textDim,
              }}
            >
              {session.user.email} {isPaid ? "· PAID" : "· FREE"}{" "}
              <button
                onClick={handleSignOut}
                style={{
                  background: "none",
                  border: "none",
                  color: C.textDim,
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  padding: 0,
                }}
              >
                sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Stage rail */}
        <nav
          style={{
            width: 250,
            minWidth: 200,
            borderRight: `2px solid ${C.line}`,
            padding: "16px 0",
            overflowY: "auto",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.015), transparent 30%)",
          }}
        >
          {STAGES.map((s) => {
            const p = stageProgress(s);
            const isActive = s.id === active;
            const complete = p.done === p.total;
            const stagePct = p.total ? Math.round((p.done / p.total) * 100) : 0;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: isActive
                    ? `linear-gradient(90deg, ${C.bgPanel}, ${C.bgPanelAlt})`
                    : "transparent",
                  border: "none",
                  borderLeft: isActive
                    ? `3px solid ${C.accent}`
                    : "3px solid transparent",
                  boxShadow: isActive
                    ? "inset 0 0 20px rgba(232,99,28,0.05)"
                    : "none",
                  padding: "10px 16px",
                  cursor: "pointer",
                  color: C.text,
                  transition: "background 0.15s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: complete ? C.ok : C.textDim,
                    }}
                  >
                    {String(s.id).padStart(2, "0")} · {s.weight}%
                  </span>
                  {!isUnlocked(s.id) ? (
                    <span style={{ color: C.textDim, fontSize: 11 }}>🔒</span>
                  ) : (
                    complete && (
                      <span style={{ color: C.ok, fontSize: 11 }}>✓</span>
                    )
                  )}
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    marginTop: 3,
                    marginBottom: 6,
                    fontWeight: isActive ? 600 : 400,
                    lineHeight: 1.3,
                    color: !isUnlocked(s.id) ? C.textDim : C.text,
                  }}
                >
                  {s.name}
                </div>
                {isUnlocked(s.id) && (
                  <div
                    style={{
                      width: "100%",
                      height: 3,
                      background: "rgba(143,168,189,0.12)",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${stagePct}%`,
                        height: "100%",
                        background: complete ? C.ok : C.accentDim,
                        transition: "width 0.25s ease",
                      }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Main panel */}
        <main
          style={{
            flex: 1,
            padding: "24px 28px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: C.textDim,
              letterSpacing: "0.1em",
              marginBottom: 6,
            }}
          >
            STAGE {String(stage.id).padStart(2, "0")} / {STAGES.length} · WEIGHT{" "}
            {stage.weight}% OF BUILD
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 12px" }}>
            {stage.name}
          </h2>
          <p
            style={{
              color: C.textDim,
              lineHeight: 1.55,
              maxWidth: 640,
              fontSize: 14.5,
            }}
          >
            {!isUnlocked(stage.id)
              ? "This stage — checklist, decision branching, and common site errors — is part of the full version, which is still in progress."
              : dynamicSummary(stage)}
          </p>

          {/* Gate: locked stages show account-aware messaging instead
              of the checklist/decision/errors content. */}
          {!isUnlocked(stage.id) ? (
            <div
              style={{
                marginTop: 18,
                border: `1px solid ${C.accent}`,
                background: "rgba(232,99,28,0.06)",
                padding: 20,
                borderRadius: 4,
                maxWidth: 480,
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: C.accent,
                  letterSpacing: "0.08em",
                  marginBottom: 10,
                }}
              >
                🔒 FULL VERSION — LAUNCHING SOON
              </div>
              <p
                style={{
                  fontSize: 13.5,
                  color: C.textDim,
                  lineHeight: 1.5,
                  marginBottom: 14,
                }}
              >
                Stages {FREE_LIMIT + 1}–{STAGES.length} (foundation through
                handover) are still being finished and aren't open to
                sign-ups yet. Leave your email and you'll hear directly
                when access opens — no charge, no action needed from you
                right now.
              </p>

              {session ? (
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12.5,
                    color: C.textDim,
                  }}
                >
                  Signed in as {session.user.email} — you're set up and on
                  the list. This account will be switched on once the full
                  version is ready; no further action needed from you.
                </div>
              ) : waitlistSubmitted ? (
                <div
                  style={{
                    color: C.ok,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                  }}
                >
                  ✓ You're on the list — we'll email you when it's ready.
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 180,
                      background: C.bgPanelAlt,
                      border: `1px solid ${C.line}`,
                      color: C.text,
                      padding: "9px 10px",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      borderRadius: 4,
                    }}
                  />
                  <button
                    onClick={submitWaitlist}
                    disabled={waitlistSubmitting}
                    style={navBtnStyle(waitlistSubmitting)}
                  >
                    {waitlistSubmitting ? "SAVING..." : "NOTIFY ME"}
                  </button>
                </div>
              )}
              {!session && (
                <button
                  onClick={() => setShowAuthForm((v) => !v)}
                  style={{
                    marginTop: 12,
                    background: "transparent",
                    border: "none",
                    color: C.textDim,
                    textDecoration: "underline",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Already have an account? Sign in
                </button>
              )}
              {!session && showAuthForm && (
                <div
                  style={{
                    marginTop: 12,
                    borderTop: `1px solid ${C.line}`,
                    paddingTop: 12,
                  }}
                >
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <button
                      onClick={() => setAuthMode("signin")}
                      style={{
                        ...navBtnStyle(false),
                        padding: "5px 10px",
                        fontSize: 11,
                        opacity: authMode === "signin" ? 1 : 0.5,
                      }}
                    >
                      SIGN IN
                    </button>
                    <button
                      onClick={() => setAuthMode("signup")}
                      style={{
                        ...navBtnStyle(false),
                        padding: "5px 10px",
                        fontSize: 11,
                        opacity: authMode === "signup" ? 1 : 0.5,
                      }}
                    >
                      SIGN UP
                    </button>
                  </div>
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    style={{
                      display: "block",
                      width: "100%",
                      marginBottom: 6,
                      background: C.bgPanelAlt,
                      border: `1px solid ${C.line}`,
                      color: C.text,
                      padding: "9px 10px",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      borderRadius: 4,
                      boxSizing: "border-box",
                    }}
                  />
                  <input
                    type="password"
                    placeholder="password (6+ characters)"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    style={{
                      display: "block",
                      width: "100%",
                      marginBottom: 8,
                      background: C.bgPanelAlt,
                      border: `1px solid ${C.line}`,
                      color: C.text,
                      padding: "9px 10px",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      borderRadius: 4,
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    onClick={handleAuth}
                    disabled={authLoading}
                    style={navBtnStyle(authLoading)}
                  >
                    {authLoading
                      ? "..."
                      : authMode === "signup"
                      ? "CREATE ACCOUNT"
                      : "SIGN IN"}
                  </button>
                  {authError && (
                    <div
                      style={{
                        color: C.accent,
                        fontSize: 12,
                        marginTop: 8,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {authError}
                    </div>
                  )}
                  {authInfo && (
                    <div
                      style={{
                        color: C.ok,
                        fontSize: 12,
                        marginTop: 8,
                        fontFamily: "'JetBrains Mono', monospace",
                        lineHeight: 1.4,
                      }}
                    >
                      {authInfo}
                    </div>
                  )}
                </div>
              )}
              {waitlistError && (
                <div
                  style={{
                    color: C.accent,
                    fontSize: 12.5,
                    marginTop: 8,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {waitlistError}
                </div>
              )}
            </div>
          ) : null}

          {/* Decision block — free stages only */}
          {isUnlocked(stage.id) && stage.decision && (
            <div
              style={{
                marginTop: 18,
                border: `1px solid ${C.line}`,
                background: `linear-gradient(135deg, ${C.bgPanelAlt}, ${C.bgPanel})`,
                padding: 16,
                borderRadius: 4,
                maxWidth: 640,
                boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: C.accent,
                  letterSpacing: "0.08em",
                  marginBottom: 10,
                }}
              >
                DECISION POINT
              </div>
              <div style={{ fontSize: 14, marginBottom: 10 }}>
                {stage.decision.label}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {stage.decision.options.map((opt) => {
                  const selected =
                    decisions[stage.decision.key] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setDecisions((d) => ({
                          ...d,
                          [stage.decision.key]: opt.value,
                        }))
                      }
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12.5,
                        padding: "8px 12px",
                        border: `1px solid ${
                          selected ? C.accent : C.line
                        }`,
                        background: selected
                          ? "rgba(232,99,28,0.15)"
                          : "transparent",
                        color: C.text,
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {stage.id === 6 && floorsWarning}
            </div>
          )}

          {/* Checklist + Common errors — free stages only */}
          {isUnlocked(stage.id) && (
            <>
              <div style={{ marginTop: 24, maxWidth: 640 }}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: C.textDim,
                    letterSpacing: "0.08em",
                    marginBottom: 10,
                  }}
                >
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
                        padding: "8px 0",
                        borderBottom: `1px solid ${C.lineFaint}`,
                        cursor: "pointer",
                        fontSize: 14,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => toggleCheck(stage.id, idx)}
                        style={{ marginTop: 3, accentColor: C.accent }}
                      />
                      <span
                        style={{
                          color: done ? C.ok : C.text,
                          lineHeight: 1.4,
                        }}
                      >
                        {item}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div style={{ marginTop: 24, maxWidth: 640, marginBottom: 20 }}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: C.accent,
                    letterSpacing: "0.08em",
                    marginBottom: 10,
                  }}
                >
                  ⚠ COMMON SITE ERRORS AT THIS STAGE
                </div>
                {stage.errors.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 13.5,
                      color: C.textDim,
                      lineHeight: 1.5,
                      padding: "6px 0",
                    }}
                  >
                    — {e}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Prev/Next */}
          <div style={{ display: "flex", gap: 10, marginBottom: 30 }}>
            <button
              disabled={active === 1}
              onClick={() => setActive((a) => Math.max(1, a - 1))}
              style={navBtnStyle(active === 1)}
            >
              ← PREV STAGE
            </button>
            <button
              disabled={active === STAGES.length}
              onClick={() => setActive((a) => Math.min(STAGES.length, a + 1))}
              style={navBtnStyle(active === STAGES.length)}
            >
              NEXT STAGE →
            </button>
          </div>
        </main>
      </div>

      {/* Title block, drafting-sheet style */}
      <footer
        style={{
          borderTop: `1px solid ${C.line}`,
          padding: "10px 20px",
          display: "flex",
          gap: 24,
          alignItems: "center",
          flexWrap: "wrap",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: C.textDim,
          background: C.bgPanelAlt,
        }}
      >
        <div>
          PROJECT:{" "}
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value.toUpperCase())}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: `1px solid ${C.line}`,
              color: C.text,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              width: 180,
            }}
          />
        </div>
        <div>
          SHEET: {String(stage.id).padStart(2, "0")} / {STAGES.length}
        </div>
        <div>
          SOIL: {decisions.soil ? decisions.soil.toUpperCase() : "—"}
        </div>
        <div>
          BUDGET: {decisions.budget ? decisions.budget.toUpperCase() : "—"}
        </div>
        <div>FLOORS: {decisions.floors || "—"}</div>
      </footer>
    </div>
  );
}

function navBtnStyle(disabled) {
  return {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    padding: "10px 16px",
    background: disabled ? "transparent" : "rgba(232,99,28,0.12)",
    border: `1px solid ${disabled ? "#2C5A82" : "#E8631C"}`,
    color: disabled ? "#8FA8BD" : "#EDEFF2",
    cursor: disabled ? "not-allowed" : "pointer",
    borderRadius: 4,
    opacity: disabled ? 0.5 : 1,
  };
}
