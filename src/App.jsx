/**
 * Build Sequence — Ground Up
 * -----------------------------------------------------------------
 * An interactive, decision-driven construction guide (site assessment
 * through handover).
 *
 * Structure:
 *  - Landing view: shown whenever there's no signed-in session.
 *  - Stage overview: shown right after sign-in — a grid of all 9
 *    stages with progress + lock status.
 *  - Stage detail: a single stage's content, reachable either by
 *    tapping a card in the overview, or via the dropdown / prev-next
 *    controls inside detail view itself.
 *  - Project summary: reached from Stage 9, recaps every choice made.
 *
 * Checklist items can be either:
 *  - manual (the user ticks them themselves), or
 *  - linked to a decision (checklist.linkedDecision = a decisions{}
 *    key) — these auto-tick the moment that decision is answered,
 *    since the real-world "is this actually done" for that item is
 *    genuinely determined by which choice was made, not by a
 *    self-report checkbox. Two people who started on the same option
 *    can still end up with different downstream items ticked, because
 *    what's "done" depends on the specific answer, not just that an
 *    answer exists.
 *
 * All progress/decision state is kept in React state only — nothing
 * persists between page loads except account + unlock status, which
 * live in Supabase (see supabaseClient.js).
 * -----------------------------------------------------------------
 */
import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { PAYSTACK_PUBLIC_KEY, STAGE_PRICE_NAIRA, BUNDLE_PRICE_NAIRA } from "./paystackClient";

/* ---------- Design tokens: clean engineering white/gray + one accent ---------- */
const C = {
  bg: "#F6F7F9",
  bgAlt: "#EEF0F3",
  panel: "#FFFFFF",
  border: "#DDE1E6",
  borderStrong: "#C3C9D1",
  text: "#1B1F24",
  textDim: "#5B6472",
  accent: "#1D4ED8",
  accentDim: "#1E40AF",
  accentSoft: "rgba(29,78,216,0.08)",
  yellow: "#D9A017",
  yellowSoft: "rgba(217,160,23,0.10)",
  ok: "#15803D",
  warn: "#B91C1C",
  warnSoft: "rgba(185,28,28,0.06)",
};

const BG_WASH = `
  radial-gradient(ellipse 700px 500px at 10% -5%, rgba(29,78,216,0.07), transparent 60%),
  radial-gradient(ellipse 600px 500px at 100% 15%, rgba(217,160,23,0.08), transparent 55%),
  radial-gradient(ellipse 500px 400px at 15% 100%, rgba(217,160,23,0.05), transparent 55%),
  radial-gradient(ellipse 600px 500px at 100% 100%, rgba(29,78,216,0.05), transparent 55%)
`;

const FONT = "'Times New Roman', Times, serif";

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
        <div key={i} style={{ position: "absolute", top: it.top, left: it.left, right: it.right, bottom: it.bottom, transform: `rotate(${it.rot}deg)` }}>
          <it.Icon size={it.size} color={it.color} opacity={0.1} />
        </div>
      ))}
    </div>
  );
}

function SummaryElevation({ decisions }) {
  const floorsCount = decisions.floors === "3+" ? 3 : decisions.floors === "2" ? 2 : 1;
  const floorHeight = 46;
  const floorWidth = 170;
  const baseX = 65;
  const groundY = 210;
  const roofColor = decisions.budget === "premium" ? C.yellow : decisions.budget === "economy" ? C.borderStrong : C.accent;

  const floorRects = [];
  for (let i = 0; i < floorsCount; i++) {
    const y = groundY - floorHeight * (i + 1);
    floorRects.push(<rect key={"f" + i} x={baseX} y={y} width={floorWidth} height={floorHeight} fill="#FFFFFF" stroke={C.text} strokeWidth="2" />);
    floorRects.push(<rect key={"w1-" + i} x={baseX + 18} y={y + 14} width={26} height={20} fill="none" stroke={C.textDim} strokeWidth="1.5" />);
    floorRects.push(<rect key={"w2-" + i} x={baseX + floorWidth - 44} y={y + 14} width={26} height={20} fill="none" stroke={C.textDim} strokeWidth="1.5" />);
  }

  const roofBaseY = groundY - floorHeight * floorsCount;
  const roofTopY = roofBaseY - 38;

  let foundationEl;
  let groundLineY;
  if (decisions.soil === "waterlogged") {
    groundLineY = groundY + 30;
    foundationEl = (
      <g>
        <line x1={baseX + 14} y1={groundY} x2={baseX + 14} y2={groundLineY} stroke={C.text} strokeWidth="3" />
        <line x1={baseX + floorWidth / 2} y1={groundY} x2={baseX + floorWidth / 2} y2={groundLineY} stroke={C.text} strokeWidth="3" />
        <line x1={baseX + floorWidth - 14} y1={groundY} x2={baseX + floorWidth - 14} y2={groundLineY} stroke={C.text} strokeWidth="3" />
      </g>
    );
  } else if (decisions.soil === "clay") {
    groundLineY = groundY + 14;
    foundationEl = <rect x={baseX - 18} y={groundY} width={floorWidth + 36} height={14} fill={C.bgAlt} stroke={C.text} strokeWidth="2" />;
  } else {
    groundLineY = groundY + 10;
    foundationEl = <rect x={baseX - 6} y={groundY} width={floorWidth + 12} height={10} fill={C.bgAlt} stroke={C.text} strokeWidth="2" />;
  }

  return (
    <svg width="100%" height="240" viewBox="0 0 300 240" style={{ maxWidth: 300, display: "block", margin: "0 auto" }}>
      <line x1="15" y1={groundLineY} x2="285" y2={groundLineY} stroke={C.border} strokeWidth="2" />
      {foundationEl}
      {floorRects}
      <polygon points={`${baseX - 10},${roofBaseY} ${baseX + floorWidth / 2},${roofTopY} ${baseX + floorWidth + 10},${roofBaseY}`} fill={roofColor} stroke={C.text} strokeWidth="2" />
    </svg>
  );
}

/* ---------- Content model ---------- */
const STAGES = [
  {
    id: 1,
    name: "Site Assessment & Documentation",
    weight: 3,
    summary: "Confirm legal title, boundaries, and ground conditions before anything is designed. This stage produces the facts every later decision depends on.",
    checklist: [
      { text: "Certificate of Occupancy / land title verified" },
      { text: "Survey plan obtained and beacons located on site" },
      { text: "Soil test carried out (bearing capacity + water table)", linkedDecision: "soil" },
      { text: "Setback / zoning rules confirmed with local planning authority", linkedDecision: "landSize" },
      { text: "Topographic survey done if plot is sloped" },
    ],
    errors: [
      "Starting excavation before the soil test result is back — the foundation type downstream depends on it.",
      "Relying on a neighbour's soil report instead of testing your own plot; conditions vary within metres.",
    ],
    decisionPoints: [
      {
        key: "soil",
        label: "What did the soil test show?",
        options: [
          { value: "sandy", label: "Sandy / firm loamy" },
          { value: "clay", label: "Clayey / expansive" },
          { value: "waterlogged", label: "Waterlogged / weak / peaty" },
        ],
      },
      {
        key: "landSize",
        label: "What size is the plot?",
        options: [
          { value: "half", label: "Half plot (~300–350 sqm)" },
          { value: "full", label: "Full plot (~600–650 sqm)" },
          { value: "large", label: "Multiple plots / 900+ sqm" },
        ],
        detail: {
          half: "On a half plot, setback allowances eat a proportionally larger share of your buildable area — confirm your local planning authority's minimum setback (commonly around 1.5m at the sides, more at the front) before the architectural footprint is finalised. There's little room for boundary error at this size, so the survey plan's accuracy matters more than usual.",
          full: "A full plot gives more flexibility in footprint and setback compliance, but don't assume a 'standard' plot size — dimensions vary by estate and by state. Confirm actual boundary measurements against your survey plan rather than a plot-size assumption.",
          large: "On multiple plots or 900+ sqm, there's room for a larger footprint or future extensions — but if the land was acquired as separate parcels, the survey plan needs to clearly demarcate each plot's boundary. Confirm whether the beacons reflect a single consolidated title or whether each plot's documentation stays distinct; this affects how the C of O is issued.",
        },
      },
    ],
    deepDive: {
      title: "Producing your survey drawing, step by step",
      steps: [
        "Engage a surveyor registered with the state Surveyor-General's office — an unregistered survey has no standing for title or approval purposes.",
        "The surveyor visits the site to establish beacons (boundary corner markers) using coordinates tied to the national grid, not just tape-measured distances from a neighbour's fence.",
        "A survey plan is drafted showing the plot's exact dimensions, coordinates, and beacon numbers, then prepared to the format the Surveyor-General's office requires for registration.",
        "The plan is submitted for vetting and registration at the Surveyor-General's office — this is what makes it a legally recognised document, not just a private drawing.",
        "Keep the registered survey plan and its coordinates on hand; your architect and structural engineer both need it to site the building correctly, and it's required to apply for your Certificate of Occupancy.",
      ],
    },
  },
  {
    id: 2,
    name: "Planning & Design",
    weight: 3,
    summary: "Architectural, structural, and MEP drawings are produced and reconciled here, along with the Bill of Quantities that will govern cost tracking.",
    checklist: [
      { text: "Architectural drawings finalised and client-approved", linkedDecision: "drawings" },
      { text: "Structural drawings signed off by a registered structural engineer", linkedDecision: "codeStandard" },
      { text: "Electrical & plumbing (MEP) drawings coordinated with structural" },
      { text: "Bill of Quantities (BOQ) prepared", linkedDecision: "budget" },
      { text: "Building permit application submitted" },
    ],
    errors: [
      "Proceeding without a structural engineer's stamp — this is a common shortcut that shows up as cracking later.",
      "Under-budgeting the BOQ by pricing only materials and skipping labour, waste allowance, and haulage.",
    ],
    codeRefs: [
      { code: "Nigerian National Building Code (NBC) 2006", note: "Nigeria's primary statutory building code — your building permit application is checked against this first, regardless of which structural design code your engineer uses." },
      { code: "BS 8110-1:1997 or Eurocode 2 (EN 1992-1-1)", note: "Whichever your structural engineer confirms is governing your drawings — see the decision above." },
    ],
    decisionPoints: [
      {
        key: "budget",
        label: "What budget tier are you designing for?",
        options: [
          { value: "economy", label: "Economy" },
          { value: "standard", label: "Standard" },
          { value: "premium", label: "Premium" },
        ],
      },
      {
        key: "drawings",
        label: "Do you already have your architectural & structural drawings?",
        options: [
          { value: "need", label: "No — I need guidance producing them" },
          { value: "have", label: "Yes — I have them ready" },
        ],
        detail: {
          need: [
            "Architectural drawings: engage a registered architect. These cover floor plans, elevations, and sections — the building's layout and appearance — and are what your building permit application is based on.",
            "Structural drawings & reinforcement detailing: engage a registered structural engineer separately from the architect. Structural drawings include a bar schedule for every reinforced element — each entry lists a bar mark, diameter, shape (straight, L-bend, U-bend, stirrup, etc.), cut length, and quantity. This is what your site steel-fixer works from, and it's also what a quantity surveyor uses to price the steel line in your BOQ. Cover thickness and lap lengths (how far bars overlap where they're spliced) are specified here too — both matter for durability, not just strength.",
            "Electrical & plumbing (MEP) coordination: MEP drawings must be overlaid on the structural drawing before casting, not adjusted after. The structural engineer needs to know where conduit runs and plumbing stacks pass through slabs and beams, so sleeves and openings can be built into the formwork in advance. Coordinating this afterward means chasing finished concrete — weakening it — instead of casting it correctly the first time.",
          ],
          have: ["Good — upload your drawing files below so they're attached to this project. Accepted formats: PDF, JPG/PNG (scanned sheets), or DWG."],
        },
      },
      {
        key: "codeStandard",
        label: "Which structural design code is your engineer using?",
        options: [
          { value: "bs8110", label: "BS 8110 (legacy British Standard)" },
          { value: "eurocode2", label: "Eurocode 2 (EN 1992)" },
          { value: "unsure", label: "Not sure yet" },
        ],
        detail: {
          bs8110: "BS 8110-1:1997 was formally withdrawn in the UK in 2010, but it's still the code most Nigerian consultancies actually design to in practice — it hasn't disappeared locally the way it has in the UK. That's a legitimate, common choice; just make sure it's stated on your drawings and applied consistently, not mixed with Eurocode requirements on the same element.",
          eurocode2: "Eurocode 2 (EN 1992) is increasingly used in Nigeria, particularly by international firms and larger consultancies, and is the current standard in the UK and much of Europe. If your engineer is using it, that's a forward-looking choice — just confirm the UK or relevant National Annex being applied, since Eurocodes are deliberately adaptable by country.",
          unsure: "This is worth pinning down early, not left implicit. Ask your structural engineer directly which code governs your drawings — BS 8110 and Eurocode 2 give different (though usually similar) results for the same element, and a design shouldn't mix requirements from both on the same structure.",
        },
      },
    ],
  },
  {
    id: 3,
    name: "Site Preparation & Setting Out",
    weight: 5,
    summary: "The plot is cleared, levelled, and the building's exact footprint is marked on the ground using profile boards and string lines.",
    checklist: [
      { text: "Site cleared of vegetation, debris, and topsoil stripped" },
      { text: "Site fenced and temporary water/power arranged" },
      { text: "Profile boards erected at corners" },
      { text: "Building lines and diagonals checked (equal diagonals = square corners)" },
      { text: "Bench mark level established for excavation depth reference" },
    ],
    errors: [
      "Skipping the diagonal check — a footprint that's a few centimetres off-square compounds into real wall and roofing problems.",
      "Building right up against the boundary without re-confirming beacons against the survey plan.",
    ],
    deepDive: {
      title: "Setting out, explained: profile boards, building lines, diagonals, and benchmark",
      steps: [
        "Profile boards: horizontal boards nailed to pairs of pegs, set back roughly 1–1.5m beyond each corner of the building so they survive the coming excavation undisturbed. Nails or saw-cuts on top of each board mark the exact wall lines, so string can be stretched, removed, and re-stretched in exactly the same position throughout construction.",
        "Building lines: strings pulled taut between the marked points on opposite profile boards, tracing the actual faces of every wall. These lines — not the excavation edges — are what excavation, blockwork, and every trade after it line up against.",
        "Diagonals check: for a rectangular footprint, measure both corner-to-corner diagonals. If the footprint is truly square, the two diagonals are equal; a difference of even a few centimetres means a corner isn't a true right angle, and it should be corrected before excavation starts — the error only compounds once walls and roof go up.",
        "Benchmark level: a fixed, undisturbed reference point — often a peg driven well outside the work area, or a mark on an existing permanent structure — with a known or assumed reduced level (RL). Every depth and height on the project (excavation depth, DPC level, floor level, lintel level) is measured relative to this one benchmark, not re-measured from the ground each time, so small errors don't accumulate stage by stage.",
      ],
    },
  },
  {
    id: 4,
    name: "Foundation",
    weight: 15,
    summary: null,
    checklist: [
      { text: "Excavation to the depth specified for the confirmed soil condition", linkedDecision: "soil" },
      { text: "Plain Cement Concrete (PCC) blinding layer laid before reinforcement", linkedDecision: "mixScenario" },
      { text: "Reinforcement placed and inspected before pouring" },
      { text: "Concrete poured in one continuous operation per section" },
      { text: "Minimum 7-day moist curing before loading the foundation" },
    ],
    errors: [
      "Pouring concrete before the blinding layer cures — this compromises the reinforcement cover.",
      "Backfilling or building on the foundation before the minimum curing period.",
      "Using an ad-hoc mix ratio instead of the one specified in the structural drawing.",
    ],
    codeRefs: [
      { code: "BS 8110-1:1997 or Eurocode 2 (EN 1992-1-1)", note: "Governs concrete grade and mix design. The ratios given below are general guidance — the grade stated on your structural drawing always takes precedence." },
      { code: "BS 8004 or Eurocode 7 (EN 1997)", note: "The dedicated foundation/geotechnical design codes — this is what your soil test result and foundation type (strip, raft, or pile) should ultimately be checked against by a geotechnical or structural engineer, not general guidance like this app." },
    ],
    decisionPoints: [
      {
        key: "mixScenario",
        label: "Which element are you mixing concrete for right now?",
        options: [
          { value: "blinding", label: "Blinding / PCC layer" },
          { value: "massFooting", label: "Mass concrete strip footing" },
          { value: "reinforcedFooting", label: "Reinforced footing / raft" },
        ],
        detail: {
          blinding: "Blinding (PCC) is a thin, non-structural levelling layer poured directly on excavated ground before reinforcement — typically mixed 1:4:8 or 1:3:6 (cement:sand:granite), about 50–75mm thick. Its job is to give a clean, level, non-porous surface so reinforcement bars sit at the correct cover height instead of resting in mud.",
          massFooting: "A mass concrete strip footing (no reinforcement, used on firm soils per your Stage 1 soil result) is typically mixed 1:3:6 or 1:2:4 (cement:sand:granite) where a stronger mix is specified. Confirm the exact ratio against your structural drawing rather than defaulting to a rule of thumb — footing size and soil bearing capacity determine what's actually required.",
          reinforcedFooting: "A reinforced footing or raft (typically required on clayey/expansive or waterlogged soils per your Stage 1 result) is normally mixed 1:2:4 (cement:sand:granite) or to the specific grade stated on your structural drawing. Water-cement ratio matters as much as the volumetric ratio here — too much water weakens the cured strength even if the mix looks 'right'. If your soil test flagged waterlogged or sulfate-bearing ground, ask your engineer whether sulfate-resisting cement is needed.",
        },
      },
    ],
    deepDive: {
      title: "Getting curing right",
      steps: [
        "Keep every poured element moist for a minimum of 7 days — concrete gains strength through a chemical reaction with water, not by drying out, so letting it dry early stops that reaction partway.",
        "Cover with wet hessian sacking, straw, or polythene sheeting to slow evaporation, especially the first 24–48 hours when fresh concrete is most vulnerable to surface cracking.",
        "In hot, dry, or windy conditions, water more frequently than the minimum — evaporation outpaces the cure faster than most people expect, particularly on exposed foundation work.",
        "Do not load, backfill against, or build on top of any element before its minimum curing period is complete, even if it looks and feels hard on the surface.",
      ],
    },
  },
  {
    id: 5,
    name: "Substructure — DPC & Plinth",
    weight: 8,
    summary: "The damp-proof course and plinth beam form the transition between foundation and superstructure, and are the building's main defence against rising damp.",
    checklist: [
      { text: "Damp-proof course (DPC) laid across the full wall width" },
      { text: "Plinth beam cast and cured" },
      { text: "Backfilling done in compacted layers, not dumped in bulk" },
      { text: "Plinth level checked against the bench mark before wall-up begins" },
    ],
    errors: [
      "Skipping the DPC to save cost — this is one of the most common causes of damp walls years later.",
      "Backfilling in one bulk layer, leaving air pockets that settle unevenly under floor slabs.",
    ],
    codeRefs: [
      { code: "Nigerian National Building Code (NBC) 2006", note: "Sets minimum damp-proofing requirements for Nigerian construction." },
      { code: "BS 8215 (Code of practice for design and installation of damp-proof courses)", note: "A workmanship-focused reference for DPC detailing, commonly cited alongside the NBC. Plinth beam sizing itself follows the same structural code (BS 8110 or Eurocode 2) as the rest of the frame." },
    ],
    deepDive: {
      title: "DPC and plinth beam, in detail",
      steps: [
        "DPC placement: lay the damp-proof course as a continuous horizontal layer across the full thickness of every wall — including through any cavity — at a level roughly 150–225mm above finished ground level and below the floor slab. Gaps or narrow strips defeat the purpose; moisture bypasses any part of the wall width the DPC doesn't cover.",
        "DPC material & laps: common materials are bituminous felt, polythene sheeting, or a dense, low-permeability mortar layer — confirm which your specification calls for. Where one length meets the next, overlap by at least 100–150mm so there's no continuous gap for moisture to track through.",
        "DPC at openings: door thresholds and other ground-level openings need special DPC detailing (stepped or dressed up at the sides) so the barrier stays continuous around the opening rather than stopping short at it — a common gap point for rising damp.",
        "Plinth beam purpose: a reinforced concrete beam cast at plinth level, running continuously around the building's perimeter and across internal load lines, tying every column together at that level. It spreads load evenly onto the foundation and resists differential settlement between columns founded on slightly different ground conditions.",
        "Plinth beam reinforcement & casting: sized and reinforced per your structural drawing — commonly a rectangular cage with top and bottom bars plus stirrups at specified spacing. Reinforcement must run continuously (lapped, not simply butted) past every column, and the beam needs the same moist curing (minimum 7 days) as any other structural concrete element before it's loaded.",
        "Plinth level check: before wall-up begins above the plinth beam, recheck the top level against your Stage 3 benchmark — this is the reference level every wall course, and eventually the floor slab, will be built up from.",
      ],
    },
  },
  {
    id: 6,
    name: "Superstructure — Frame & Walls",
    weight: 30,
    summary: "Columns, beams, and slabs are cast to form the building's skeleton, then walls are built up between them to lintel and roof level.",
    checklist: [
      { text: "Columns cast plumb and cured before loading" },
      { text: "Beams and slabs cast per structural drawing at each floor level", linkedDecision: "floors" },
      { text: "Block/brick walls raised with correct mortar mix" },
      { text: "Lintels cast over every door and window opening before wall continues above" },
      { text: "Curing maintained on all fresh concrete elements" },
    ],
    errors: [
      "Continuing block work above an opening without casting the lintel first.",
      "Rushing curing time on columns before the next floor's load is applied.",
    ],
    codeRefs: [
      { code: "BS 8110-1:1997 or Eurocode 2 (EN 1992-1-1)", note: "Governs column, beam, and slab sizing and reinforcement — confirm which one applies from your Stage 2 decision." },
      { code: "BS 6399-2 or Eurocode 1 / EN 1991-1-4 (wind actions)", note: "Governs wind loading. This is exactly why 3+ storey buildings need full engineering design rather than rule-of-thumb sizing — wind load on a tall building's face becomes a real structural input, not a rounding error." },
    ],
    decisionPoints: [
      {
        key: "floors",
        label: "How many floors is the building?",
        options: [
          { value: "1", label: "Single storey" },
          { value: "2", label: "Two storeys" },
          { value: "3+", label: "Three or more" },
        ],
        detail: {
          "1": "Standard column, beam, and foundation sizing from your structural drawing applies directly — loads are straightforward and a typical strip or pad foundation (per your soil result in Stage 1) is usually sufficient.",
          "2": "Do not assume ground-floor column and beam sizing simply carries up. The added floor roughly doubles the load path down to the foundation, so beam spans, column sections, and foundation bearing capacity all need to be rechecked for two storeys specifically — confirm this explicitly with your structural engineer rather than reusing single-storey numbers.",
          "3+": "This is a different structural regime, not just 'more of the same'. Wind loading — and seismic loading, depending on your location — becomes a real design factor, not a rounding error. Column and beam sizing must be calculated storey by storey, not assumed uniform. A raft or pile foundation is common instead of a simple strip footing, since point loads at the base are significantly higher. Full engineering design, structural drawings, and formal approval are required before construction — this height should not be attempted on a self-build, rule-of-thumb basis.",
        },
      },
    ],
  },
  {
    id: 7,
    name: "Roofing",
    weight: 12,
    summary: null,
    checklist: [
      { text: "Roof structure (trusses/rafters) erected and braced" },
      { text: "Roof pitch confirmed as suitable for the chosen covering material" },
      { text: "Roofing sheets/tiles fixed with correct fasteners and overlap" },
      { text: "Fascia boards and gutters installed with a fall toward downpipes" },
    ],
    errors: [
      "Choosing a low pitch with a material that needs a steeper slope, causing leaks in the rains.",
      "Skipping truss bracing — trusses can rack sideways under wind load without it.",
    ],
    codeRefs: [
      { code: "BS 6399-2 or Eurocode 1 / EN 1991-1-4 (wind actions)", note: "Governs wind-uplift design for roof structures and their fixings — this is the technical basis behind truss bracing requirements and fastener spacing, not just manufacturer preference." },
    ],
    deepDive: {
      title: "Roof structure & trusses, explained",
      steps: [
        "Truss types: timber trusses (king-post for shorter spans, queen-post or fink trusses for wider spans) or light steel trusses (common on premium or wide-span roofs). Span and roofing material weight determine which is appropriate — this is a structural decision, not an aesthetic one, so confirm truss type and spacing against your structural or roofing drawing.",
        "Roof pitch: dictated by the roofing material, not personal preference — long-span aluminium sheets tolerate lower pitches, while clay or concrete tiles typically need steeper pitches to shed water properly. Using a pitch below what the manufacturer specifies for your chosen material is a common, avoidable cause of leaks.",
        "Truss bracing: individual trusses are inherently unstable sideways until they're braced to each other — diagonal and longitudinal bracing members tie the whole truss run together so wind load is shared across the roof structure rather than racking a single truss over. This is easy to skip on a self-build and is a safety issue, not just a durability one.",
        "Fascia & gutter fall: fascia boards close off the truss ends and carry the gutter; the gutter itself needs a consistent fall toward the downpipe outlets — a flat or reverse-falling gutter holds water and overflows in heavy rain instead of draining it away.",
        "Roofing sheet/tile fixing: fasteners, overlap, and fixing pattern should follow the manufacturer's specification for your material and pitch — under-fixing or incorrect overlap is a common cause of wind-lift failure in storms.",
      ],
    },
  },
  {
    id: 8,
    name: "MEP Rough-in & Finishing",
    weight: 22,
    summary: "Electrical and plumbing lines are installed, then the building is plastered, floored, and fitted out.",
    checklist: [
      { text: "Electrical conduits and plumbing pipes sleeved before plastering" },
      { text: "Plastering done to a true, plumb finish" },
      { text: "Screeding and floor finishes (tiles/terrazzo/etc.) laid" },
      { text: "Doors, windows, and ironmongery fitted" },
      { text: "Painting and final fixtures installed" },
    ],
    errors: [
      "Chasing walls for wiring after plastering is complete, instead of sleeving conduits beforehand.",
      "Tiling before screed has fully cured, causing hollow or cracked tiles.",
    ],
    deepDive: {
      title: "MEP rough-in & finishing, in the right sequence",
      steps: [
        "Conduit & pipe sleeving: electrical conduit runs and plumbing sleeves that pass through structural elements should already be planned into the structural drawing from Stage 2 — chasing them into finished concrete afterward cuts into reinforcement cover and weakens the member.",
        "Test before you cover: pressure-test plumbing runs and continuity-test electrical circuits before plastering over them. A fault hidden behind finished plaster is far more expensive to fix than one caught now.",
        "Plastering: only once conduits and pipework are fully routed, fixed, and tested — plastering is meant to be the last thing that happens to the wall surface, not a cover-up for unfinished rough-in.",
        "Screeding & curing: lay screed only after below-floor plumbing and electrical work is complete and tested. Let the screed cure fully — commonly 7 or more days depending on thickness — before tiling; tiling over green screed is a frequent cause of hollow or cracked tiles.",
        "Fixtures & fittings: fit doors, windows, and ironmongery once plastering is dry, so frames aren't knocked out of alignment by wall movement during cure.",
        "Painting: apply only after every wet trade — plastering, screeding, tiling — is complete and properly dry. Painting too early traps moisture behind the finish, which shows up later as peeling or staining.",
      ],
    },
  },
  {
    id: 9,
    name: "Inspection & Handover",
    weight: 2,
    summary: "The building is checked against drawings and code, defects are logged and closed out, and documentation is handed to the owner.",
    checklist: [
      { text: "Final structural and safety inspection carried out" },
      { text: "Snag list (defects) compiled and closed out" },
      { text: "Certificate of completion / occupancy obtained where required" },
      { text: "As-built drawings and warranty documents handed over" },
    ],
    errors: [
      "Skipping the formal inspection because the building 'looks done'.",
      "No as-built documentation left with the owner — this becomes a real problem for any future renovation.",
    ],
    deepDive: {
      title: "Inspection & handover, step by step",
      steps: [
        "Final structural and safety inspection: a qualified inspector (or your structural engineer) checks the completed building against the approved drawings — not against how it 'looks' finished. This covers structural elements, electrical safety, and fire/means-of-escape basics where applicable.",
        "Snag list: walk the building systematically, room by room, logging every defect — a cracked tile, a door that doesn't close flush, a paint run — with a location and a responsible trade. Nothing gets fixed off a mental list; it gets fixed off a written one that both sides sign off against.",
        "Closing out the snag list: each item is fixed, then re-inspected and marked closed individually. A snag list that's 'mostly done' isn't done — the last few items are usually the ones that get forgotten permanently if they're not tracked to explicit closure.",
        "Certificate of completion / occupancy: apply through your local planning authority once the building matches its approved drawings. This is the document that makes the building legally fit for occupation — moving in without it carries real legal risk, not just a formality.",
        "As-built drawings: your architect and structural engineer update the original drawings to reflect anything that changed during construction (a moved wall, a rerouted pipe run). This as-built set — not the original design drawings — is what any future renovation, extension, or repair should be based on.",
        "Handover pack: gather the as-built drawings, warranty documents for major installations (roofing, electrical, plumbing fixtures), and any professional certificates into one set handed to the owner. This is the building's permanent record — treat it as seriously as the title documents.",
      ],
    },
  },
];

const SOIL_TEXT = {
  sandy: "Sandy / firm loamy soil confirmed — a strip or pad footing is typically adequate. Excavate to the depth specified in your structural drawing (commonly 1–1.5m, but let the engineer's numbers govern).",
  clay: "Clayey / expansive soil confirmed — expansive clays shrink and swell with moisture, so a raft foundation or a deeper strip footing with extra reinforcement is usually specified. Do not use a standard strip-footing depth here without engineer sign-off.",
  waterlogged: "Waterlogged / weak soil confirmed — this soil condition generally requires a pile foundation or significant ground improvement. This is not a stage to economise on; get a geotechnical engineer directly involved.",
  default: "Foundation type depends on your soil test result. Go back to Stage 1 and record the result to see the specific guidance here.",
};

const ROOF_TEXT = {
  economy: "Economy tier — long-span aluminium roofing sheets on timber trusses is the common cost-effective choice. Keep pitch and fastening exactly to the sheet manufacturer's spec; skimping here is a frequent leak cause.",
  standard: "Standard tier — aluminium or step-tile sheeting on timber or light steel trusses, with proper fascia and gutter detailing, is typical.",
  premium: "Premium tier — clay/concrete tiles or Decra-type stone-coated sheets on engineered trusses are common, with attention to insulation and ceiling detailing.",
  default: "Roofing material recommendation depends on your budget tier. Set it in Stage 2 to see specific guidance here.",
};

const SUMMARY_LABELS = {
  soil: { sandy: "Sandy / firm loamy", clay: "Clayey / expansive", waterlogged: "Waterlogged / weak / peaty" },
  landSize: { half: "Half plot (~300–350 sqm)", full: "Full plot (~600–650 sqm)", large: "Multiple plots / 900+ sqm" },
  budget: { economy: "Economy", standard: "Standard", premium: "Premium" },
  drawings: { need: "Guided through producing drawings", have: "Uploaded own drawings" },
  codeStandard: { bs8110: "BS 8110 (legacy British Standard)", eurocode2: "Eurocode 2 (EN 1992)", unsure: "Not yet confirmed with engineer" },
  mixScenario: { blinding: "Blinding / PCC", massFooting: "Mass concrete strip footing", reinforcedFooting: "Reinforced footing / raft" },
  floors: { "1": "Single storey", "2": "Two storeys", "3+": "Three or more storeys" },
};

const TERMS_CONTENT = {
  title: "Terms of Service",
  updated: "Last updated: August 2026",
  sections: [
    { heading: "What this app is", body: ["Build Sequence is a general educational and organisational guide to residential construction, presented in stages with checklists, decision-based guidance, and common-error notes."] },
    { heading: "Not professional advice", body: [
      "Nothing in this app is architectural, structural engineering, surveying, or legal advice, and using it does not create a professional relationship of any kind. Every real design and construction decision — foundation type, structural sizing, drawings, approvals, and anything affecting safety or legal compliance — must be made by a licensed architect, structural engineer, surveyor, or other appropriate professional for your specific site and project.",
      "The schematic illustration shown after Stage 9 is a visual recap of the choices you made in the app, not a real elevation, section, or 3D model, and must never be used as one.",
    ]},
    { heading: "No liability", body: ["This app is provided 'as is', without warranty of any kind. To the fullest extent permitted by law, the app's creator is not liable for any loss, damage, injury, or cost arising from use of this app, including reliance on any guidance, checklist, or illustration it contains."] },
    { heading: "Accounts", body: ["You're responsible for the accuracy of the information you provide when creating an account, and for keeping your password confidential."] },
    { heading: "Paid access", body: ["Some stages may require payment to unlock, either individually or as a bundle, as described in the app. Pricing and payment terms will be confirmed at the time payment is introduced."] },
    { heading: "Changes", body: ["These terms may be updated as the app develops. Continued use after a change means you accept the updated terms."] },
    { heading: "Contact", body: ["Questions about these terms: [insert contact email]."] },
  ],
};

const PRIVACY_CONTENT = {
  title: "Privacy Policy",
  updated: "Last updated: August 2026",
  sections: [
    { heading: "What's collected", body: [
      "Account email and password (handled by Supabase Authentication — your password is never visible to or stored directly by this app).",
      "Waitlist email addresses, if you submit one on a locked stage.",
      "Files you choose to upload on Stage 2 (architectural/structural drawings), stored privately and restricted to your own account.",
      "Your project decisions (soil type, budget, floor count, etc.) and checklist progress are kept only in your browser's memory for the current session and are not sent to or stored on any server.",
    ]},
    { heading: "What's not collected", body: ["No advertising trackers, no third-party analytics pixels, and no browser storage (cookies/localStorage) are used by this app at this time."] },
    { heading: "How data is used", body: ["Account and payment-status data is used solely to control access to paid stages. Waitlist emails are used solely to notify you when full access opens. Uploaded drawings are stored solely for your own reference within your account."] },
    { heading: "Third parties", body: ["Account data, uploaded files, and payment status are stored and processed by Supabase, acting as a data processor for this app. No data is sold or shared with advertisers."] },
    { heading: "Your rights", body: ["You can request deletion of your account and associated data at any time by contacting [insert contact email]."] },
    { heading: "Changes", body: ["This policy may be updated as the app develops. Material changes will be reflected here with an updated date."] },
    { heading: "Contact", body: ["Questions about this policy: [insert contact email]."] },
  ],
};

const FREE_LIMIT = 3;

export default function App() {
  const [page, setPage] = useState("landing");
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
    const { error } = await supabase.from("waitlist").insert({ email: waitlistEmail });
    setWaitlistSubmitting(false);
    if (error) {
      setWaitlistError("Something went wrong — try again in a moment.");
      return;
    }
    setWaitlistSubmitted(true);
  };

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authMode, setAuthMode] = useState("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authInfo, setAuthInfo] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  const refetchProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("id, email, is_paid, unlocked_stages").eq("id", userId).single();
    setProfile(data || null);
  };

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    refetchProfile(session.user.id);
  }, [session]);

  useEffect(() => {
    if (session && page === "landing") setPage("overview");
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page, active]);

  const isPaid = !!profile?.is_paid;
  const unlockedStages = profile?.unlocked_stages || [];
  const isUnlocked = (stageId) => stageId <= FREE_LIMIT || isPaid || unlockedStages.includes(stageId);

  const [paying, setPaying] = useState(null);
  const [payError, setPayError] = useState("");

  const handlePayment = (purchaseType, stageId) => {
    if (!session?.user) return;
    if (!window.PaystackPop) {
      setPayError("Payment isn't available right now — please refresh and try again.");
      return;
    }
    setPayError("");
    setPaying(purchaseType === "bundle" ? "bundle" : stageId);

    const amountNaira = purchaseType === "bundle" ? BUNDLE_PRICE_NAIRA : STAGE_PRICE_NAIRA;

    const popup = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: session.user.email,
      amount: amountNaira * 100,
      currency: "NGN",
      metadata: { userId: session.user.id, purchaseType, stageId },
      callback: (response) => {
        fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: response.reference, userId: session.user.id, purchaseType, stageId }),
        })
          .then((r) => r.json())
          .then((result) => {
            setPaying(null);
            if (!result.success) {
              setPayError("Payment went through, but we couldn't confirm it automatically. Contact support with reference " + response.reference + ".");
              return;
            }
            refetchProfile(session.user.id);
          })
          .catch(() => {
            setPaying(null);
            setPayError("Payment went through, but we couldn't confirm it automatically. Contact support with reference " + response.reference + ".");
          });
      },
      onClose: () => {
        setPaying(null);
      },
    });
    popup.openIframe();
  };

  const handleAuth = async () => {
    setAuthError("");
    setAuthInfo("");
    if (!authEmail.includes("@") || authPassword.length < 6) {
      setAuthError("Enter a valid email and a password of 6+ characters.");
      return;
    }
    setAuthLoading(true);
    if (authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      if (error) {
        setAuthLoading(false);
        setAuthError(error.message);
        return;
      }
      if (data.user) {
        await supabase.from("profiles").upsert({ id: data.user.id, email: authEmail });
      }
      if (!data.session) {
        setAuthLoading(false);
        setAuthInfo("Account created. If sign-in doesn't work right away, email confirmation may still be required — check your inbox, or try again shortly.");
        setAuthPassword("");
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) {
        setAuthLoading(false);
        setAuthError(error.message.toLowerCase().includes("confirm") ? "This account's email hasn't been confirmed yet. Check your inbox for a confirmation link, or check back shortly." : error.message);
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

  const stage = STAGES.find((s) => s.id === active);

  const toggleCheck = (stageId, idx, isLinked) => {
    if (isLinked) return;
    const key = `${stageId}-${idx}`;
    setChecks((c) => ({ ...c, [key]: !c[key] }));
  };

  const stageProgress = (s) => {
    const total = s.checklist.length;
    let done = 0;
    for (let i = 0; i < total; i++) {
      const item = s.checklist[i];
      const isDone = item.linkedDecision ? !!decisions[item.linkedDecision] : !!checks[`${s.id}-${i}`];
      if (isDone) done++;
    }
    return { done, total };
  };

  const overallProgress = useMemo(() => {
    let done = 0, total = 0;
    STAGES.forEach((s) => {
      const p = stageProgress(s);
      done += p.done;
      total += p.total;
    });
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [checks, decisions]);

  const dynamicSummary = (s) => {
    if (s.id === 4) return SOIL_TEXT[decisions.soil] || SOIL_TEXT.default;
    if (s.id === 7) return ROOF_TEXT[decisions.budget] || ROOF_TEXT.default;
    return s.summary;
  };

  const boqGuidance = () => {
    const landLabel = { half: "a half plot", full: "a full plot", large: "multiple plots / a large site" }[decisions.landSize];
    const budgetLabel = decisions.budget;
    if (!landLabel || !budgetLabel) return null;
    return `Your plot size (${landLabel}) mainly drives the *quantities* in your BOQ — footprint, wall area, roof area, and so on scale with it, so a quantity surveyor should size every line item against your actual survey dimensions, not a generic per-square-metre guess. Your budget tier (${budgetLabel}) mainly drives *specification* within those same line items — which grade of block, which finish, which roofing material — rather than changing what's on the list. Treat these as two separate levers: get the quantities right from the drawings first, then apply your budget tier to select the specification for each item. A registered quantity surveyor is worth engaging here — local material prices move too often for any fixed figure to stay accurate.`;
  };

  const goToStage = (id) => {
    setActive(id);
    setPage("detail");
  };

  /* ================= RENDER ================= */

  if (page === "terms") {
    return <LegalPage content={TERMS_CONTENT} onBack={() => setPage(session ? "overview" : "landing")} />;
  }
  if (page === "privacy") {
    return <LegalPage content={PRIVACY_CONTENT} onBack={() => setPage(session ? "overview" : "landing")} />;
  }

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, backgroundImage: BG_WASH, fontFamily: FONT, color: C.text, position: "relative" }}>
        <LandingSketches />
        <header style={{ borderBottom: `1px solid ${C.border}`, padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <IconBlueprintRoll size={22} color={C.accent} />
            Build Sequence
          </div>
          <div style={{ fontSize: 12.5, color: C.textDim, letterSpacing: "0.06em" }}>GROUND UP — FOUNDATION TO FINISH</div>
        </header>

        <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 80px", position: "relative", zIndex: 1 }}>
          <h1 style={{ fontSize: 34, lineHeight: 1.25, marginBottom: 14, fontWeight: 700 }}>
            A construction guide that walks with you from cleared land to handover — one decision at a time.
          </h1>
          <p style={{ fontSize: 17, color: C.textDim, lineHeight: 1.6, maxWidth: 640, marginBottom: 32 }}>
            Nine stages, real site checklists, and guidance that actually changes based on your soil test, your budget, and your floor count — not a generic list of steps copied from a textbook.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 44 }}>
            {[
              { title: "Decision-driven", body: "Your soil type changes the foundation guidance. Your budget changes the roofing guidance. Your floor count changes structural guidance.", Icon: IconSetSquare, iconColor: C.accent, bg: C.accentSoft },
              { title: "Site checklists", body: "Every stage ships with a practical checklist — some items tick themselves based on the choices you've actually made.", Icon: IconClipboard, iconColor: C.yellow, bg: C.yellowSoft },
              { title: "Common site errors", body: "Each stage flags the mistakes that actually happen on real sites, not textbook trivia.", Icon: IconHardHat, iconColor: C.accent, bg: C.accentSoft },
            ].map((f, i) => (
              <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <f.Icon size={26} color={f.iconColor} />
                </div>
                <div style={{ fontWeight: 700, marginBottom: 6, color: C.text }}>{f.title}</div>
                <div style={{ fontSize: 14, color: C.textDim, lineHeight: 1.5 }}>{f.body}</div>
              </div>
            ))}
          </div>

          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 28, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", maxWidth: 400 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Get started</div>
            <div style={{ fontSize: 13.5, color: C.textDim, marginBottom: 18 }}>
              Stages 1–{FREE_LIMIT} are free for everyone once you're signed in. No card required to create an account.
            </div>
            <AuthPanel
              authMode={authMode} setAuthMode={setAuthMode}
              authEmail={authEmail} setAuthEmail={setAuthEmail}
              authPassword={authPassword} setAuthPassword={setAuthPassword}
              authLoading={authLoading} authError={authError} authInfo={authInfo}
              handleAuth={handleAuth}
            />
          </div>
        </main>
        <LegalFooter setPage={setPage} />
      </div>
    );
  }

  if (page === "overview") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, backgroundImage: BG_WASH, fontFamily: FONT, color: C.text }}>
        <header style={{ borderBottom: `1px solid ${C.border}`, padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)" }}>
          <div style={{ fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <IconBlueprintRoll size={22} color={C.accent} />
            Build Sequence
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <ProgressBadge pct={overallProgress.pct} />
            <AccountBar session={session} isPaid={isPaid} unlockedStages={unlockedStages} handleSignOut={handleSignOut} />
          </div>
        </header>

        <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 60px" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>Your stages</h2>
          <p style={{ color: C.textDim, marginBottom: 26, fontSize: 14.5 }}>
            Select any stage to begin. Locked stages are shown so you can see the full scope of the guide.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {STAGES.map((s) => {
              const p = stageProgress(s);
              const complete = p.done === p.total;
              const unlocked = isUnlocked(s.id);
              return (
                <button key={s.id} onClick={() => goToStage(s.id)} style={{ textAlign: "left", background: C.panel, border: `1px solid ${unlocked ? C.border : C.warn}`, borderRadius: 6, padding: 16, cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", fontFamily: FONT }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12.5, color: C.textDim }}>Stage {String(s.id).padStart(2, "0")} · {s.weight}% of build</span>
                    {!unlocked ? <span style={{ color: C.warn, fontSize: 12.5 }}>Locked</span> : complete ? <span style={{ color: C.ok, fontSize: 12.5 }}>Complete</span> : null}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: C.text }}>{s.name}</div>
                  {unlocked && (
                    <div style={{ width: "100%", height: 5, background: C.bgAlt, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${p.total ? Math.round((p.done / p.total) * 100) : 0}%`, height: "100%", background: complete ? C.ok : C.accent }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </main>
        <LegalFooter setPage={setPage} />
      </div>
    );
  }

  if (page === "summary") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, backgroundImage: BG_WASH, fontFamily: FONT, color: C.text }}>
        <header style={{ borderBottom: `1px solid ${C.border}`, padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <button onClick={() => goToStage(9)} style={linkBtnStyle}>← Back to Stage 9</button>
            <div style={{ fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <IconBlueprintRoll size={22} color={C.accent} />
              Build Sequence
            </div>
          </div>
          <AccountBar session={session} isPaid={isPaid} unlockedStages={unlockedStages} handleSignOut={handleSignOut} />
        </header>

        <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px 60px" }}>
          <div style={{ fontSize: 12.5, color: C.textDim, letterSpacing: "0.06em", marginBottom: 6 }}>PROJECT COMPLETE</div>
          <h2 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>Project Summary</h2>
          <p style={{ color: C.textDim, lineHeight: 1.6, fontSize: 15, marginBottom: 22 }}>
            A recap of every choice made across your nine stages, with a schematic illustration built from those choices.
          </p>

          <div style={{ border: `1px solid ${C.border}`, background: C.panel, borderRadius: 6, padding: 20, marginBottom: 22, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <SummaryElevation decisions={decisions} />
            <div style={{ marginTop: 18 }}>
              {Object.keys(SUMMARY_LABELS).map((key) => {
                const rawValue = decisions[key];
                const label = rawValue ? SUMMARY_LABELS[key][rawValue] : null;
                const fieldName = { soil: "Soil condition", landSize: "Land size", budget: "Budget tier", drawings: "Drawings", codeStandard: "Design code", mixScenario: "Foundation mix scenario", floors: "Floor count" }[key];
                return (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
                    <span style={{ color: C.textDim }}>{fieldName}</span>
                    <span style={{ color: label ? C.text : C.textDim, fontStyle: label ? "normal" : "italic" }}>{label || "Not yet chosen"}</span>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 12.5, color: C.textDim, lineHeight: 1.5, marginTop: 16, marginBottom: 0 }}>
              This is a schematic recap for orientation only — a simple illustration built from the choices you made, not a real elevation, section, or 3D model. Actual elevations, sections, and 3D representation must come from your architect's and structural engineer's real drawings (Stage 2) — those are based on your actual site and design, not a handful of multiple-choice answers.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setPage("overview")} style={secondaryBtnStyle(false)}>← All stages</button>
          </div>
        </main>
        <LegalFooter setPage={setPage} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, backgroundImage: BG_WASH, fontFamily: FONT, color: C.text }}>
      <header style={{ borderBottom: `1px solid ${C.border}`, padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <button onClick={() => setPage("overview")} style={linkBtnStyle}>← All stages</button>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Build Sequence</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <ProgressBadge pct={overallProgress.pct} />
          <AccountBar session={session} isPaid={isPaid} unlockedStages={unlockedStages} handleSignOut={handleSignOut} />
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "28px 24px 60px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
          <select value={active} onChange={(e) => setActive(Number(e.target.value))} style={{ ...inputStyle, width: "auto", flex: "1 1 220px", marginBottom: 0, fontFamily: FONT }}>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>{String(s.id).padStart(2, "0")} — {s.name}{!isUnlocked(s.id) ? " (locked)" : ""}</option>
            ))}
          </select>
          <button disabled={active === 1} onClick={() => setActive((a) => Math.max(1, a - 1))} style={secondaryBtnStyle(active === 1)}>← Prev</button>
          <button disabled={active === STAGES.length} onClick={() => setActive((a) => Math.min(STAGES.length, a + 1))} style={secondaryBtnStyle(active === STAGES.length)}>Next →</button>
        </div>

        <div style={{ fontSize: 13, color: C.textDim, marginBottom: 4 }}>Stage {String(stage.id).padStart(2, "0")} of {STAGES.length} · {stage.weight}% of build</div>
        <h2 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 12px" }}>{stage.name}</h2>
        <p style={{ color: C.textDim, lineHeight: 1.6, fontSize: 15.5, marginBottom: 18 }}>
          {!isUnlocked(stage.id) ? "This stage — checklist, decision branching, and common site errors — is part of the full version, which is still in progress." : dynamicSummary(stage)}
        </p>

        {!isUnlocked(stage.id) ? (
          <div style={{ border: `1px solid ${C.warn}`, background: C.warnSoft, borderRadius: 6, padding: 20, maxWidth: 460 }}>
            <div style={{ fontWeight: 700, color: C.warn, marginBottom: 8 }}>🔒 This stage is locked</div>
            <p style={{ fontSize: 13.5, color: C.textDim, lineHeight: 1.5, marginBottom: 16 }}>
              Unlock just this stage, or get all {STAGES.length - FREE_LIMIT} remaining stages together at a discount.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => handlePayment("stage", stage.id)} disabled={paying === stage.id} style={secondaryBtnStyle(paying === stage.id)}>
                {paying === stage.id ? "Opening checkout..." : `Unlock this stage — ₦${STAGE_PRICE_NAIRA.toLocaleString()}`}
              </button>
              <button onClick={() => handlePayment("bundle")} disabled={paying === "bundle"} style={primaryBtnStyle(paying === "bundle")}>
                {paying === "bundle" ? "Opening checkout..." : `Unlock all ${STAGES.length - FREE_LIMIT} remaining stages — ₦${BUNDLE_PRICE_NAIRA.toLocaleString()}`}
              </button>
            </div>
            {payError && <div style={{ ...errorTextStyle, marginTop: 12 }}>{payError}</div>}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              {waitlistSubmitted ? (
                <div style={{ color: C.ok, fontSize: 12.5 }}>✓ You're also on our email list — thanks.</div>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: C.textDim, marginBottom: 8 }}>Not ready to buy yet? Leave your email and we'll let you know about updates and offers.</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input type="email" placeholder="you@email.com" value={waitlistEmail} onChange={(e) => setWaitlistEmail(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 160, marginBottom: 0, fontSize: 12.5 }} />
                    <button onClick={submitWaitlist} disabled={waitlistSubmitting} style={{ ...secondaryBtnStyle(waitlistSubmitting), padding: "8px 12px", fontSize: 12.5 }}>{waitlistSubmitting ? "..." : "Notify me"}</button>
                  </div>
                </>
              )}
              {waitlistError && <div style={errorTextStyle}>{waitlistError}</div>}
            </div>
          </div>
        ) : (
          <>
            {stage.decisionPoints && stage.decisionPoints.map((dp, dpIdx) => {
              const selectedValue = decisions[dp.key];
              const detailContent = dp.detail && selectedValue ? dp.detail[selectedValue] : null;
              return (
                <div key={dp.key} style={{ border: `1px solid ${C.border}`, background: C.panel, borderRadius: 6, padding: 18, marginBottom: dpIdx === stage.decisionPoints.length - 1 ? 22 : 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize: 12.5, color: C.accent, fontWeight: 700, marginBottom: 10 }}>DECISION POINT</div>
                  <div style={{ fontSize: 15, marginBottom: 12 }}>{dp.label}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {dp.options.map((opt) => {
                      const selected = selectedValue === opt.value;
                      return (
                        <button key={opt.value} onClick={() => setDecisions((d) => ({ ...d, [dp.key]: opt.value }))} style={{ fontFamily: FONT, fontSize: 14, padding: "9px 14px", border: `1px solid ${selected ? C.accent : C.border}`, background: selected ? C.accentSoft : C.bg, color: selected ? C.accent : C.text, borderRadius: 5, cursor: "pointer", fontWeight: selected ? 700 : 400 }}>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {detailContent && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}`, fontSize: 14, lineHeight: 1.55, color: C.text }}>
                      {Array.isArray(detailContent) ? detailContent.map((para, i) => <p key={i} style={{ margin: i === 0 ? "0 0 10px" : "10px 0" }}>{para}</p>) : <p style={{ margin: 0 }}>{detailContent}</p>}
                    </div>
                  )}
                  {stage.id === 2 && dp.key === "drawings" && selectedValue === "have" && <DrawingUpload session={session} />}
                </div>
              );
            })}

            {stage.id === 2 && boqGuidance() && (
              <div style={{ border: `1px solid ${C.border}`, background: C.yellowSoft, borderRadius: 6, padding: 18, marginBottom: 22 }}>
                <div style={{ fontSize: 12.5, color: C.accentDim, fontWeight: 700, marginBottom: 10 }}>BOQ GUIDANCE FOR YOUR PLOT + BUDGET</div>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: C.text, margin: 0 }}>{boqGuidance()}</p>
              </div>
            )}

            {stage.deepDive && (
              <div style={{ border: `1px solid ${C.border}`, background: C.panel, borderRadius: 6, padding: 18, marginBottom: 22, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 12.5, color: C.accent, fontWeight: 700, marginBottom: 10 }}>{stage.deepDive.title.toUpperCase()}</div>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  {stage.deepDive.steps.map((step, i) => <li key={i} style={{ fontSize: 14, lineHeight: 1.6, color: C.text, marginBottom: 8 }}>{step}</li>)}
                </ol>
              </div>
            )}

            {stage.codeRefs && (
              <div style={{ border: `1px solid ${C.accent}`, background: C.accentSoft, borderRadius: 6, padding: 18, marginBottom: 22 }}>
                <div style={{ fontSize: 12.5, color: C.accentDim, fontWeight: 700, marginBottom: 10 }}>RELEVANT BUILDING CODES</div>
                {stage.codeRefs.map((c, i) => (
                  <div key={i} style={{ marginBottom: i === stage.codeRefs.length - 1 ? 0 : 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{c.code}</div>
                    <div style={{ fontSize: 13.5, color: C.textDim, lineHeight: 1.5, marginTop: 2 }}>{c.note}</div>
                  </div>
                ))}
                <p style={{ fontSize: 12, color: C.textDim, fontStyle: "italic", marginTop: 12, marginBottom: 0 }}>
                  These are pointers for orientation, not a substitute for your registered structural engineer confirming which code governs your specific drawings — and a design should never mix requirements from different codes on the same element.
                </p>
              </div>
            )}

            <div style={{ marginBottom: 26 }}>
              <div style={{ fontSize: 12.5, color: C.textDim, fontWeight: 700, marginBottom: 10 }}>SITE CHECKLIST</div>
              {stage.checklist.map((item, idx) => {
                const key = `${stage.id}-${idx}`;
                const isLinked = !!item.linkedDecision;
                const done = isLinked ? !!decisions[item.linkedDecision] : !!checks[key];
                return (
                  <label key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.border}`, cursor: isLinked ? "default" : "pointer", fontSize: 15 }}>
                    <input
                      type="checkbox"
                      checked={done}
                      disabled={isLinked}
                      onChange={() => toggleCheck(stage.id, idx, isLinked)}
                      style={{ marginTop: 3, accentColor: C.accent, opacity: isLinked ? 0.7 : 1 }}
                    />
                    <span style={{ color: done ? C.ok : C.text, lineHeight: 1.45 }}>
                      {item.text}
                      {isLinked && <span style={{ fontSize: 11.5, color: C.textDim, fontStyle: "italic" }}> — based on your answer above</span>}
                    </span>
                  </label>
                );
              })}
            </div>

            <div style={{ marginBottom: 30 }}>
              <div style={{ fontSize: 12.5, color: C.warn, fontWeight: 700, marginBottom: 10 }}>COMMON SITE ERRORS AT THIS STAGE</div>
              {stage.errors.map((e, i) => <div key={i} style={{ fontSize: 14.5, color: C.textDim, lineHeight: 1.55, padding: "6px 0" }}>— {e}</div>)}
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button disabled={active === 1} onClick={() => setActive((a) => Math.max(1, a - 1))} style={secondaryBtnStyle(active === 1)}>← Prev stage</button>
          {active === STAGES.length ? (
            <button onClick={() => setPage("summary")} style={primaryBtnStyle(false)}>View project summary →</button>
          ) : (
            <button onClick={() => setActive((a) => Math.min(STAGES.length, a + 1))} style={secondaryBtnStyle(false)}>Next stage →</button>
          )}
        </div>
      </main>
      <LegalFooter setPage={setPage} />
    </div>
  );
}

function AuthPanel({ authMode, setAuthMode, authEmail, setAuthEmail, authPassword, setAuthPassword, authLoading, authError, authInfo, handleAuth }) {
  return (
    <div style={{ maxWidth: 360 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={() => setAuthMode("signin")} style={tabBtnStyle(authMode === "signin")}>SIGN IN</button>
        <button onClick={() => setAuthMode("signup")} style={tabBtnStyle(authMode === "signup")}>CREATE ACCOUNT</button>
      </div>
      <input type="email" placeholder="you@email.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} style={inputStyle} />
      <input type="password" placeholder="password (6+ characters)" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
      <button onClick={handleAuth} disabled={authLoading} style={primaryBtnStyle(authLoading)}>
        {authLoading ? "..." : authMode === "signup" ? "Create account" : "Sign in"}
      </button>
      {authError && <div style={errorTextStyle}>{authError}</div>}
      {authInfo && <div style={infoTextStyle}>{authInfo}</div>}
    </div>
  );
}

function AccountBar({ session, isPaid, unlockedStages, handleSignOut }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13, color: C.textDim }}>
      <span>
        {session?.user?.email}{" "}
        {isPaid ? "· Full access" : unlockedStages.length > 0 ? `· ${unlockedStages.length} stage${unlockedStages.length > 1 ? "s" : ""} unlocked` : "· Free"}
      </span>
      <button onClick={handleSignOut} style={linkBtnStyle}>Sign out</button>
    </div>
  );
}

function ProgressBadge({ pct }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 60, height: 6, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: C.accent, transition: "width 0.25s ease" }} />
      </div>
      <span style={{ fontSize: 12, color: C.textDim, fontFamily: FONT }}>{pct}%</span>
    </div>
  );
}

function LegalFooter({ setPage }) {
  return (
    <div style={{ maxWidth: 900, margin: "40px auto 0", padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 16, fontSize: 12.5, color: C.textDim }}>
      <button onClick={() => setPage("terms")} style={linkBtnStyle}>Terms of Service</button>
      <button onClick={() => setPage("privacy")} style={linkBtnStyle}>Privacy Policy</button>
    </div>
  );
}

function LegalPage({ content, onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, backgroundImage: BG_WASH, fontFamily: FONT, color: C.text }}>
      <header style={{ borderBottom: `1px solid ${C.border}`, padding: "18px 24px", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)" }}>
        <button onClick={onBack} style={linkBtnStyle}>← Back</button>
      </header>
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px 80px" }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 4px" }}>{content.title}</h2>
        <div style={{ fontSize: 12.5, color: C.textDim, marginBottom: 24 }}>{content.updated}</div>
        {content.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{s.heading}</div>
            {s.body.map((p, j) => <p key={j} style={{ fontSize: 14, lineHeight: 1.6, color: C.textDim, margin: "0 0 8px" }}>{p}</p>)}
          </div>
        ))}
      </main>
    </div>
  );
}

function DrawingUpload({ session }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadedName, setUploadedName] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !session?.user?.id) return;
    setUploading(true);
    setUploadError("");
    setUploadedName("");
    const path = `${session.user.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("drawings").upload(path, file);
    setUploading(false);
    if (error) {
      setUploadError("Upload failed — this usually means the 'drawings' storage bucket isn't set up yet on this project. (" + error.message + ")");
      return;
    }
    setUploadedName(file.name);
  };

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
      <input type="file" accept=".pdf,.dwg,.jpg,.jpeg,.png" onChange={handleFile} style={{ fontFamily: FONT, fontSize: 13 }} />
      {uploading && <div style={{ fontSize: 12.5, color: C.textDim, marginTop: 8 }}>Uploading…</div>}
      {uploadedName && <div style={{ fontSize: 12.5, color: C.ok, marginTop: 8 }}>✓ {uploadedName} uploaded and attached to your account.</div>}
      {uploadError && <div style={errorTextStyle}>{uploadError}</div>}
    </div>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  background: "#FFFFFF",
  border: "1px solid #DDE1E6",
  color: "#1B1F24",
  padding: "10px 12px",
  fontSize: 14,
  borderRadius: 5,
  marginBottom: 10,
};

function tabBtnStyle(active) {
  return {
    fontFamily: FONT, fontSize: 12.5, padding: "7px 12px",
    border: `1px solid ${active ? "#1D4ED8" : "#DDE1E6"}`,
    background: active ? "rgba(29,78,216,0.08)" : "transparent",
    color: active ? "#1D4ED8" : "#5B6472",
    borderRadius: 5, cursor: "pointer", fontWeight: active ? 700 : 400,
  };
}

function primaryBtnStyle(disabled) {
  return {
    fontFamily: FONT, fontSize: 14, padding: "10px 16px",
    background: disabled ? "#9CA8C4" : "#1D4ED8",
    border: "none", color: "#FFFFFF", borderRadius: 5,
    cursor: disabled ? "not-allowed" : "pointer", fontWeight: 700,
  };
}

function secondaryBtnStyle(disabled) {
  return {
    fontFamily: FONT, fontSize: 14, padding: "9px 15px",
    background: disabled ? "#F0F1F3" : "#FFFFFF",
    border: `1px solid ${disabled ? "#DDE1E6" : "#C3C9D1"}`,
    color: disabled ? "#9AA2AC" : "#1B1F24",
    borderRadius: 5, cursor: disabled ? "not-allowed" : "pointer",
  };
}

const linkBtnStyle = {
  background: "none", border: "none", color: "#5B6472",
  textDecoration: "underline", cursor: "pointer",
  fontFamily: FONT, fontSize: 13, padding: 0,
};

const errorTextStyle = { color: "#B91C1C", fontSize: 12.5, marginTop: 8, fontFamily: FONT };
const infoTextStyle = { color: "#15803D", fontSize: 12.5, marginTop: 8, fontFamily: FONT, lineHeight: 1.4 };
