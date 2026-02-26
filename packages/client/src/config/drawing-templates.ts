// ---------------------------------------------------------------------------
// Drawing templates for Excalidraw
// These export raw skeleton data compatible with `convertToExcalidrawElements`.
// The consumer is responsible for calling `convertToExcalidrawElements` on
// the `elements` array before passing them to Excalidraw.
// ---------------------------------------------------------------------------

export interface DrawingTemplate {
  id: string;
  name: string;
  description: string;
  elements: unknown[]; // ExcalidrawElementSkeleton[]
}

// ─── 1. Flowchart ─────────────────────────────────────────────────────────────

const flowchartElements: unknown[] = [
  // Title
  {
    type: "text",
    x: 260,
    y: 0,
    text: "Process flowchart",
    fontSize: 28,
    fontFamily: 2,
    textAlign: "center",
  },

  // Start node
  {
    type: "rectangle",
    id: "flow-start",
    x: 240,
    y: 60,
    width: 200,
    height: 60,
    backgroundColor: "#d3f9d8",
    strokeColor: "#2b8a3e",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
    label: { text: "Start", fontSize: 18, fontFamily: 2 },
  },

  // Process 1
  {
    type: "rectangle",
    id: "flow-process-1",
    x: 240,
    y: 180,
    width: 200,
    height: 60,
    backgroundColor: "#e7f5ff",
    strokeColor: "#1971c2",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
    label: { text: "Gather input", fontSize: 16, fontFamily: 2 },
  },

  // Arrow: Start -> Process 1
  {
    type: "arrow",
    x: 340,
    y: 120,
    start: { type: "rectangle", id: "flow-start" },
    end: { type: "rectangle", id: "flow-process-1" },
    strokeColor: "#495057",
    strokeWidth: 2,
  },

  // Process 2
  {
    type: "rectangle",
    id: "flow-process-2",
    x: 240,
    y: 300,
    width: 200,
    height: 60,
    backgroundColor: "#e7f5ff",
    strokeColor: "#1971c2",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
    label: { text: "Process data", fontSize: 16, fontFamily: 2 },
  },

  // Arrow: Process 1 -> Process 2
  {
    type: "arrow",
    x: 340,
    y: 240,
    start: { type: "rectangle", id: "flow-process-1" },
    end: { type: "rectangle", id: "flow-process-2" },
    strokeColor: "#495057",
    strokeWidth: 2,
  },

  // Decision diamond
  {
    type: "diamond",
    id: "flow-decision",
    x: 220,
    y: 420,
    width: 240,
    height: 140,
    backgroundColor: "#fff9db",
    strokeColor: "#e67700",
    fillStyle: "solid",
    strokeWidth: 2,
    label: { text: "Valid?", fontSize: 16, fontFamily: 2 },
  },

  // Arrow: Process 2 -> Decision
  {
    type: "arrow",
    x: 340,
    y: 360,
    start: { type: "rectangle", id: "flow-process-2" },
    end: { type: "diamond", id: "flow-decision" },
    strokeColor: "#495057",
    strokeWidth: 2,
  },

  // Process 3 (Yes path)
  {
    type: "rectangle",
    id: "flow-process-3",
    x: 240,
    y: 620,
    width: 200,
    height: 60,
    backgroundColor: "#e7f5ff",
    strokeColor: "#1971c2",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
    label: { text: "Generate output", fontSize: 16, fontFamily: 2 },
  },

  // Arrow: Decision -> Process 3 (Yes)
  {
    type: "arrow",
    x: 340,
    y: 560,
    start: { type: "diamond", id: "flow-decision" },
    end: { type: "rectangle", id: "flow-process-3" },
    strokeColor: "#2b8a3e",
    strokeWidth: 2,
    label: { text: "Yes", fontSize: 14, fontFamily: 2 },
  },

  // Retry node (No path — loops back to Process 1)
  {
    type: "rectangle",
    id: "flow-retry",
    x: 540,
    y: 460,
    width: 160,
    height: 50,
    backgroundColor: "#fff3bf",
    strokeColor: "#e67700",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
    label: { text: "Retry", fontSize: 14, fontFamily: 2 },
  },

  // Arrow: Decision -> Retry (No)
  {
    type: "arrow",
    x: 460,
    y: 490,
    start: { type: "diamond", id: "flow-decision" },
    end: { type: "rectangle", id: "flow-retry" },
    strokeColor: "#c92a2a",
    strokeWidth: 2,
    label: { text: "No", fontSize: 14, fontFamily: 2 },
  },

  // Arrow: Retry -> Process 1 (loop back)
  {
    type: "arrow",
    x: 620,
    y: 460,
    start: { type: "rectangle", id: "flow-retry" },
    end: { type: "rectangle", id: "flow-process-1" },
    strokeColor: "#495057",
    strokeWidth: 2,
  },

  // End node
  {
    type: "rectangle",
    id: "flow-end",
    x: 240,
    y: 740,
    width: 200,
    height: 60,
    backgroundColor: "#ffe3e3",
    strokeColor: "#c92a2a",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
    label: { text: "End", fontSize: 18, fontFamily: 2 },
  },

  // Arrow: Process 3 -> End
  {
    type: "arrow",
    x: 340,
    y: 680,
    start: { type: "rectangle", id: "flow-process-3" },
    end: { type: "rectangle", id: "flow-end" },
    strokeColor: "#495057",
    strokeWidth: 2,
  },
];

// ─── 2. Wireframe ─────────────────────────────────────────────────────────────

const wireframeElements: unknown[] = [
  // Browser frame
  {
    type: "rectangle",
    id: "wf-frame",
    x: 0,
    y: 0,
    width: 800,
    height: 900,
    backgroundColor: "#ffffff",
    strokeColor: "#ced4da",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
  },

  // Nav bar
  {
    type: "rectangle",
    id: "wf-nav",
    x: 0,
    y: 0,
    width: 800,
    height: 60,
    backgroundColor: "#212529",
    strokeColor: "#212529",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: null,
  },

  // Logo text
  {
    type: "text",
    x: 30,
    y: 18,
    text: "Logo",
    fontSize: 20,
    fontFamily: 2,
    textAlign: "left",
  },

  // Nav links
  {
    type: "text",
    x: 460,
    y: 20,
    text: "Home",
    fontSize: 16,
    fontFamily: 2,
    textAlign: "left",
  },
  {
    type: "text",
    x: 540,
    y: 20,
    text: "Features",
    fontSize: 16,
    fontFamily: 2,
    textAlign: "left",
  },
  {
    type: "text",
    x: 660,
    y: 20,
    text: "Contact",
    fontSize: 16,
    fontFamily: 2,
    textAlign: "left",
  },

  // Hero section background
  {
    type: "rectangle",
    id: "wf-hero",
    x: 0,
    y: 60,
    width: 800,
    height: 280,
    backgroundColor: "#f1f3f5",
    strokeColor: "#ced4da",
    fillStyle: "solid",
    strokeWidth: 1,
  },

  // Hero heading
  {
    type: "text",
    x: 160,
    y: 120,
    text: "Welcome to our product",
    fontSize: 36,
    fontFamily: 2,
    textAlign: "center",
  },

  // Hero subtitle
  {
    type: "text",
    x: 160,
    y: 180,
    text: "Build something amazing with our platform.\nGet started in minutes, not hours.",
    fontSize: 18,
    fontFamily: 2,
    textAlign: "center",
  },

  // CTA button
  {
    type: "rectangle",
    id: "wf-cta",
    x: 320,
    y: 260,
    width: 160,
    height: 44,
    backgroundColor: "#228be6",
    strokeColor: "#1971c2",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
    label: { text: "Get started", fontSize: 16, fontFamily: 2 },
  },

  // Cards section label
  {
    type: "text",
    x: 300,
    y: 370,
    text: "Features",
    fontSize: 24,
    fontFamily: 2,
    textAlign: "center",
  },

  // Card 1
  {
    type: "rectangle",
    id: "wf-card-1",
    x: 40,
    y: 420,
    width: 220,
    height: 200,
    backgroundColor: "#ffffff",
    strokeColor: "#dee2e6",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
  },
  {
    type: "text",
    x: 80,
    y: 460,
    text: "Fast",
    fontSize: 20,
    fontFamily: 2,
    textAlign: "center",
  },
  {
    type: "text",
    x: 60,
    y: 500,
    text: "Lightning-fast\nperformance out\nof the box.",
    fontSize: 14,
    fontFamily: 2,
    textAlign: "center",
  },

  // Card 2
  {
    type: "rectangle",
    id: "wf-card-2",
    x: 290,
    y: 420,
    width: 220,
    height: 200,
    backgroundColor: "#ffffff",
    strokeColor: "#dee2e6",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
  },
  {
    type: "text",
    x: 340,
    y: 460,
    text: "Secure",
    fontSize: 20,
    fontFamily: 2,
    textAlign: "center",
  },
  {
    type: "text",
    x: 310,
    y: 500,
    text: "Enterprise-grade\nsecurity built in\nfrom day one.",
    fontSize: 14,
    fontFamily: 2,
    textAlign: "center",
  },

  // Card 3
  {
    type: "rectangle",
    id: "wf-card-3",
    x: 540,
    y: 420,
    width: 220,
    height: 200,
    backgroundColor: "#ffffff",
    strokeColor: "#dee2e6",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
  },
  {
    type: "text",
    x: 580,
    y: 460,
    text: "Scalable",
    fontSize: 20,
    fontFamily: 2,
    textAlign: "center",
  },
  {
    type: "text",
    x: 560,
    y: 500,
    text: "Grows with your\nteam from one to\none thousand.",
    fontSize: 14,
    fontFamily: 2,
    textAlign: "center",
  },

  // Footer bar
  {
    type: "rectangle",
    id: "wf-footer",
    x: 0,
    y: 840,
    width: 800,
    height: 60,
    backgroundColor: "#212529",
    strokeColor: "#212529",
    fillStyle: "solid",
    strokeWidth: 2,
  },
  {
    type: "text",
    x: 280,
    y: 858,
    text: "\u00a9 2026 Company Inc.",
    fontSize: 14,
    fontFamily: 2,
    textAlign: "center",
  },
];

// ─── 3. Mind Map ──────────────────────────────────────────────────────────────

const mindMapElements: unknown[] = [
  // Central idea
  {
    type: "ellipse",
    id: "mm-center",
    x: 340,
    y: 280,
    width: 200,
    height: 100,
    backgroundColor: "#d0bfff",
    strokeColor: "#7048e8",
    fillStyle: "solid",
    strokeWidth: 2,
    label: { text: "Main idea", fontSize: 22, fontFamily: 2 },
  },

  // Topic A (top-left)
  {
    type: "ellipse",
    id: "mm-topic-a",
    x: 20,
    y: 80,
    width: 160,
    height: 80,
    backgroundColor: "#d3f9d8",
    strokeColor: "#2b8a3e",
    fillStyle: "solid",
    strokeWidth: 2,
    label: { text: "Topic A", fontSize: 16, fontFamily: 2 },
  },

  // Arrow: Center -> Topic A
  {
    type: "arrow",
    x: 340,
    y: 300,
    start: { type: "ellipse", id: "mm-center" },
    end: { type: "ellipse", id: "mm-topic-a" },
    strokeColor: "#2b8a3e",
    strokeWidth: 2,
  },

  // Topic B (top-right)
  {
    type: "ellipse",
    id: "mm-topic-b",
    x: 700,
    y: 80,
    width: 160,
    height: 80,
    backgroundColor: "#d0bfff",
    strokeColor: "#7048e8",
    fillStyle: "solid",
    strokeWidth: 2,
    label: { text: "Topic B", fontSize: 16, fontFamily: 2 },
  },

  // Arrow: Center -> Topic B
  {
    type: "arrow",
    x: 540,
    y: 300,
    start: { type: "ellipse", id: "mm-center" },
    end: { type: "ellipse", id: "mm-topic-b" },
    strokeColor: "#7048e8",
    strokeWidth: 2,
  },

  // Topic C (bottom-right)
  {
    type: "ellipse",
    id: "mm-topic-c",
    x: 700,
    y: 500,
    width: 160,
    height: 80,
    backgroundColor: "#e7f5ff",
    strokeColor: "#1971c2",
    fillStyle: "solid",
    strokeWidth: 2,
    label: { text: "Topic C", fontSize: 16, fontFamily: 2 },
  },

  // Arrow: Center -> Topic C
  {
    type: "arrow",
    x: 540,
    y: 360,
    start: { type: "ellipse", id: "mm-center" },
    end: { type: "ellipse", id: "mm-topic-c" },
    strokeColor: "#1971c2",
    strokeWidth: 2,
  },

  // Topic D (bottom-left)
  {
    type: "ellipse",
    id: "mm-topic-d",
    x: 20,
    y: 500,
    width: 160,
    height: 80,
    backgroundColor: "#fff3bf",
    strokeColor: "#e67700",
    fillStyle: "solid",
    strokeWidth: 2,
    label: { text: "Topic D", fontSize: 16, fontFamily: 2 },
  },

  // Arrow: Center -> Topic D
  {
    type: "arrow",
    x: 340,
    y: 360,
    start: { type: "ellipse", id: "mm-center" },
    end: { type: "ellipse", id: "mm-topic-d" },
    strokeColor: "#e67700",
    strokeWidth: 2,
  },

  // Sub-branch A1
  {
    type: "ellipse",
    id: "mm-sub-a1",
    x: -180,
    y: 0,
    width: 140,
    height: 60,
    backgroundColor: "#ebfbee",
    strokeColor: "#51cf66",
    fillStyle: "solid",
    strokeWidth: 2,
    label: { text: "Detail A1", fontSize: 14, fontFamily: 2 },
  },

  // Arrow: Topic A -> Sub A1
  {
    type: "arrow",
    x: 40,
    y: 100,
    start: { type: "ellipse", id: "mm-topic-a" },
    end: { type: "ellipse", id: "mm-sub-a1" },
    strokeColor: "#51cf66",
    strokeWidth: 2,
  },

  // Sub-branch A2
  {
    type: "ellipse",
    id: "mm-sub-a2",
    x: -180,
    y: 140,
    width: 140,
    height: 60,
    backgroundColor: "#ebfbee",
    strokeColor: "#51cf66",
    fillStyle: "solid",
    strokeWidth: 2,
    label: { text: "Detail A2", fontSize: 14, fontFamily: 2 },
  },

  // Arrow: Topic A -> Sub A2
  {
    type: "arrow",
    x: 40,
    y: 140,
    start: { type: "ellipse", id: "mm-topic-a" },
    end: { type: "ellipse", id: "mm-sub-a2" },
    strokeColor: "#51cf66",
    strokeWidth: 2,
  },
];

// ─── 4. Kanban Board ──────────────────────────────────────────────────────────

const kanbanElements: unknown[] = [
  // Title
  {
    type: "text",
    x: 280,
    y: 0,
    text: "Project board",
    fontSize: 28,
    fontFamily: 2,
    textAlign: "center",
  },

  // --- Column 1: To do ---
  {
    type: "rectangle",
    id: "kb-col-todo",
    x: 0,
    y: 60,
    width: 260,
    height: 520,
    backgroundColor: "#f8f9fa",
    strokeColor: "#ced4da",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
  },
  {
    type: "text",
    x: 80,
    y: 80,
    text: "To do",
    fontSize: 20,
    fontFamily: 2,
    textAlign: "center",
  },

  // Sticky notes in To do
  {
    type: "rectangle",
    id: "kb-todo-1",
    x: 20,
    y: 120,
    width: 220,
    height: 80,
    backgroundColor: "#fff3bf",
    strokeColor: "#fab005",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 3 },
    label: { text: "Research competitors", fontSize: 14, fontFamily: 2 },
  },
  {
    type: "rectangle",
    id: "kb-todo-2",
    x: 20,
    y: 220,
    width: 220,
    height: 80,
    backgroundColor: "#fff3bf",
    strokeColor: "#fab005",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 3 },
    label: { text: "Define user personas", fontSize: 14, fontFamily: 2 },
  },
  {
    type: "rectangle",
    id: "kb-todo-3",
    x: 20,
    y: 320,
    width: 220,
    height: 80,
    backgroundColor: "#fff3bf",
    strokeColor: "#fab005",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 3 },
    label: { text: "Write technical spec", fontSize: 14, fontFamily: 2 },
  },

  // --- Column 2: In progress ---
  {
    type: "rectangle",
    id: "kb-col-progress",
    x: 280,
    y: 60,
    width: 260,
    height: 520,
    backgroundColor: "#f8f9fa",
    strokeColor: "#ced4da",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
  },
  {
    type: "text",
    x: 340,
    y: 80,
    text: "In progress",
    fontSize: 20,
    fontFamily: 2,
    textAlign: "center",
  },

  // Sticky notes in In progress
  {
    type: "rectangle",
    id: "kb-prog-1",
    x: 300,
    y: 120,
    width: 220,
    height: 80,
    backgroundColor: "#d0bfff",
    strokeColor: "#7048e8",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 3 },
    label: { text: "Design landing page", fontSize: 14, fontFamily: 2 },
  },
  {
    type: "rectangle",
    id: "kb-prog-2",
    x: 300,
    y: 220,
    width: 220,
    height: 80,
    backgroundColor: "#d0bfff",
    strokeColor: "#7048e8",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 3 },
    label: { text: "Set up CI/CD pipeline", fontSize: 14, fontFamily: 2 },
  },

  // --- Column 3: Done ---
  {
    type: "rectangle",
    id: "kb-col-done",
    x: 560,
    y: 60,
    width: 260,
    height: 520,
    backgroundColor: "#f8f9fa",
    strokeColor: "#ced4da",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
  },
  {
    type: "text",
    x: 650,
    y: 80,
    text: "Done",
    fontSize: 20,
    fontFamily: 2,
    textAlign: "center",
  },

  // Sticky notes in Done
  {
    type: "rectangle",
    id: "kb-done-1",
    x: 580,
    y: 120,
    width: 220,
    height: 80,
    backgroundColor: "#d3f9d8",
    strokeColor: "#2b8a3e",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 3 },
    label: { text: "Project kickoff meeting", fontSize: 14, fontFamily: 2 },
  },
  {
    type: "rectangle",
    id: "kb-done-2",
    x: 580,
    y: 220,
    width: 220,
    height: 80,
    backgroundColor: "#d3f9d8",
    strokeColor: "#2b8a3e",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 3 },
    label: { text: "Create repository", fontSize: 14, fontFamily: 2 },
  },
  {
    type: "rectangle",
    id: "kb-done-3",
    x: 580,
    y: 320,
    width: 220,
    height: 80,
    backgroundColor: "#d3f9d8",
    strokeColor: "#2b8a3e",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 3 },
    label: { text: "Initial wireframes", fontSize: 14, fontFamily: 2 },
  },
];

// ─── 5. SWOT Analysis ─────────────────────────────────────────────────────────

const swotElements: unknown[] = [
  // Title
  {
    type: "text",
    x: 200,
    y: 0,
    text: "SWOT analysis",
    fontSize: 32,
    fontFamily: 2,
    textAlign: "center",
  },

  // Top-left: Strengths
  {
    type: "rectangle",
    id: "swot-strengths",
    x: 0,
    y: 60,
    width: 320,
    height: 280,
    backgroundColor: "#d3f9d8",
    strokeColor: "#2b8a3e",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
  },
  {
    type: "text",
    x: 100,
    y: 80,
    text: "Strengths",
    fontSize: 22,
    fontFamily: 2,
    textAlign: "center",
  },
  {
    type: "text",
    x: 20,
    y: 120,
    text: "\u2022 Strong brand recognition\n\u2022 Experienced team\n\u2022 Loyal customer base\n\u2022 Proprietary technology",
    fontSize: 15,
    fontFamily: 2,
    textAlign: "left",
  },

  // Top-right: Weaknesses
  {
    type: "rectangle",
    id: "swot-weaknesses",
    x: 340,
    y: 60,
    width: 320,
    height: 280,
    backgroundColor: "#ffe3e3",
    strokeColor: "#c92a2a",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
  },
  {
    type: "text",
    x: 430,
    y: 80,
    text: "Weaknesses",
    fontSize: 22,
    fontFamily: 2,
    textAlign: "center",
  },
  {
    type: "text",
    x: 360,
    y: 120,
    text: "\u2022 Limited funding\n\u2022 Small market share\n\u2022 Gaps in skill sets\n\u2022 Aging infrastructure",
    fontSize: 15,
    fontFamily: 2,
    textAlign: "left",
  },

  // Bottom-left: Opportunities
  {
    type: "rectangle",
    id: "swot-opportunities",
    x: 0,
    y: 360,
    width: 320,
    height: 280,
    backgroundColor: "#e7f5ff",
    strokeColor: "#1971c2",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
  },
  {
    type: "text",
    x: 80,
    y: 380,
    text: "Opportunities",
    fontSize: 22,
    fontFamily: 2,
    textAlign: "center",
  },
  {
    type: "text",
    x: 20,
    y: 420,
    text: "\u2022 Emerging markets\n\u2022 Strategic partnerships\n\u2022 New product lines\n\u2022 Regulatory changes",
    fontSize: 15,
    fontFamily: 2,
    textAlign: "left",
  },

  // Bottom-right: Threats
  {
    type: "rectangle",
    id: "swot-threats",
    x: 340,
    y: 360,
    width: 320,
    height: 280,
    backgroundColor: "#fff4e6",
    strokeColor: "#e8590c",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
  },
  {
    type: "text",
    x: 450,
    y: 380,
    text: "Threats",
    fontSize: 22,
    fontFamily: 2,
    textAlign: "center",
  },
  {
    type: "text",
    x: 360,
    y: 420,
    text: "\u2022 Aggressive competitors\n\u2022 Economic downturn\n\u2022 Supply chain risks\n\u2022 Changing regulations",
    fontSize: 15,
    fontFamily: 2,
    textAlign: "left",
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const DRAWING_TEMPLATES: DrawingTemplate[] = [
  {
    id: "flowchart",
    name: "Flowchart",
    description:
      "A standard process flowchart with start/end nodes, process steps, and a decision branch.",
    elements: flowchartElements,
  },
  {
    id: "wireframe",
    name: "Wireframe",
    description:
      "A website wireframe with navigation bar, hero section, feature cards, and footer.",
    elements: wireframeElements,
  },
  {
    id: "mindMap",
    name: "Mind map",
    description:
      "A radial mind map with a central idea, four topic branches, and sub-branches.",
    elements: mindMapElements,
  },
  {
    id: "kanban",
    name: "Kanban board",
    description:
      "A three-column kanban board with To do, In progress, and Done columns containing task cards.",
    elements: kanbanElements,
  },
  {
    id: "swot",
    name: "SWOT analysis",
    description:
      "A 2\u00d72 grid for Strengths, Weaknesses, Opportunities, and Threats with example bullet points.",
    elements: swotElements,
  },
];
