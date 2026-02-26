// ---------------------------------------------------------------------------
// Default Excalidraw library items
// Each item's `elements` array is produced by calling convertToExcalidrawElements
// at module load time so callers can use the items directly with Excalidraw's
// initialLibraryItems / libraryItems prop without any extra conversion step.
// ---------------------------------------------------------------------------

import { convertToExcalidrawElements } from "@excalidraw/excalidraw";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function convert(skeletons: unknown[]): unknown[] {
  return convertToExcalidrawElements(skeletons as any);
}

const CREATED = 1700000000000;

// ─── Basic Shapes ─────────────────────────────────────────────────────────────

const roundedRectElements = convert([
  {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 160,
    height: 80,
    backgroundColor: "#a5d8ff",
    strokeColor: "#1971c2",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
  },
]);

const circleElements = convert([
  {
    type: "ellipse",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    backgroundColor: "#b2f2bb",
    strokeColor: "#2b8a3e",
    fillStyle: "solid",
    strokeWidth: 2,
  },
]);

const diamondElements = convert([
  {
    type: "diamond",
    x: 0,
    y: 0,
    width: 120,
    height: 120,
    backgroundColor: "#ffec99",
    strokeColor: "#e67700",
    fillStyle: "solid",
    strokeWidth: 2,
  },
]);

const pillElements = convert([
  {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 180,
    height: 50,
    backgroundColor: "#96f2d7",
    strokeColor: "#0ca678",
    fillStyle: "solid",
    strokeWidth: 2,
    // Maximum corner rounding gives the pill/capsule look
    roundness: { type: 3 },
  },
]);

const squareElements = convert([
  {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    backgroundColor: "#d0bfff",
    strokeColor: "#7048e8",
    fillStyle: "solid",
    strokeWidth: 2,
  },
]);

// Hexagon-like shape: a wide diamond approximates a hex in sketch style
const hexagonElements = convert([
  {
    type: "diamond",
    x: 0,
    y: 0,
    width: 140,
    height: 80,
    backgroundColor: "#ffd8a8",
    strokeColor: "#e8590c",
    fillStyle: "solid",
    strokeWidth: 2,
  },
]);

// ─── Containers & Cards ───────────────────────────────────────────────────────

const cardContainerElements = convert([
  {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 240,
    height: 160,
    backgroundColor: "#ffffff",
    strokeColor: "#ced4da",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
  },
]);

const calloutBoxElements = convert([
  {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 240,
    height: 80,
    backgroundColor: "#fff9db",
    strokeColor: "#f08c00",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
    label: { text: "Note", fontSize: 16, fontFamily: 2 },
  },
]);

const statusBadgeElements = convert([
  {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 100,
    height: 32,
    backgroundColor: "#b2f2bb",
    strokeColor: "#2b8a3e",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
    label: { text: "Active", fontSize: 13, fontFamily: 2 },
  },
]);

const infoBoxElements = convert([
  {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 260,
    height: 100,
    backgroundColor: "#e7f5ff",
    strokeColor: "#1971c2",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
    label: { text: "Information", fontSize: 15, fontFamily: 2 },
  },
]);

// ─── Arrows & Connectors ──────────────────────────────────────────────────────

const simpleArrowElements = convert([
  {
    type: "arrow",
    x: 0,
    y: 0,
    points: [
      [0, 0],
      [150, 0],
    ],
    strokeColor: "#343a40",
    strokeWidth: 2,
  },
]);

const bidirectionalArrowElements = convert([
  {
    type: "arrow",
    x: 0,
    y: 0,
    points: [
      [0, 0],
      [200, 0],
    ],
    strokeColor: "#343a40",
    strokeWidth: 2,
    startArrowhead: "arrow",
    endArrowhead: "arrow",
  },
]);

const dashedConnectorElements = convert([
  {
    type: "arrow",
    x: 0,
    y: 0,
    points: [
      [0, 0],
      [150, 0],
    ],
    strokeColor: "#868e96",
    strokeWidth: 2,
    strokeStyle: "dashed",
  },
]);

const elbowedArrowElements = convert([
  {
    type: "arrow",
    x: 0,
    y: 0,
    points: [
      [0, 0],
      [80, 0],
      [80, 80],
      [160, 80],
    ],
    strokeColor: "#343a40",
    strokeWidth: 2,
  },
]);

// ─── Text & Labels ────────────────────────────────────────────────────────────

const headingTextElements = convert([
  {
    type: "text",
    x: 0,
    y: 0,
    text: "Heading",
    fontSize: 24,
    fontFamily: 2,
    textAlign: "left",
  },
]);

const bodyTextElements = convert([
  {
    type: "text",
    x: 0,
    y: 0,
    text: "Body text goes here.\nAdd your content on this line.\nAnd continue below as needed.",
    fontSize: 16,
    fontFamily: 2,
    textAlign: "left",
  },
]);

const labelBadgeElements = convert([
  {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 80,
    height: 28,
    backgroundColor: "#e9ecef",
    strokeColor: "#adb5bd",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 3 },
    label: { text: "Label", fontSize: 13, fontFamily: 2 },
  },
]);

// ─── Wireframe Components ─────────────────────────────────────────────────────

const buttonElements = convert([
  {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 120,
    height: 40,
    backgroundColor: "#228be6",
    strokeColor: "#1971c2",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
    label: { text: "Button", fontSize: 15, fontFamily: 2 },
  },
]);

// Text input: outer rect (border) + inner placeholder text
const textInputElements = convert([
  {
    type: "rectangle",
    id: "input-field",
    x: 0,
    y: 0,
    width: 200,
    height: 36,
    backgroundColor: "#ffffff",
    strokeColor: "#ced4da",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 3 },
  },
  {
    type: "text",
    x: 10,
    y: 9,
    text: "Input...",
    fontSize: 14,
    fontFamily: 2,
    textAlign: "left",
    strokeColor: "#adb5bd",
  },
]);

const navBarElements = convert([
  {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 400,
    height: 48,
    backgroundColor: "#212529",
    strokeColor: "#212529",
    fillStyle: "solid",
    strokeWidth: 2,
    label: { text: "Nav bar", fontSize: 15, fontFamily: 2 },
  },
]);

const imagePlaceholderElements = convert([
  {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 200,
    height: 150,
    backgroundColor: "#f1f3f5",
    strokeColor: "#ced4da",
    fillStyle: "solid",
    strokeWidth: 2,
    label: { text: "[Image]", fontSize: 16, fontFamily: 2 },
  },
]);

// ─── Sticky Notes ─────────────────────────────────────────────────────────────

const yellowStickyElements = convert([
  {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 160,
    height: 160,
    backgroundColor: "#fff3bf",
    strokeColor: "#fab005",
    fillStyle: "solid",
    strokeWidth: 2,
  },
]);

const greenStickyElements = convert([
  {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 160,
    height: 160,
    backgroundColor: "#d3f9d8",
    strokeColor: "#51cf66",
    fillStyle: "solid",
    strokeWidth: 2,
  },
]);

const pinkStickyElements = convert([
  {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 160,
    height: 160,
    backgroundColor: "#ffe3e3",
    strokeColor: "#fa5252",
    fillStyle: "solid",
    strokeWidth: 2,
  },
]);

// ─── Export ───────────────────────────────────────────────────────────────────

export const DEFAULT_LIBRARY_ITEMS: Array<{
  id: string;
  status: "published";
  elements: unknown[];
  created: number;
  name: string;
}> = [
  // Basic shapes
  {
    id: "lib-rounded-rect",
    status: "published",
    created: CREATED,
    name: "Rounded rectangle",
    elements: roundedRectElements,
  },
  {
    id: "lib-circle",
    status: "published",
    created: CREATED,
    name: "Circle",
    elements: circleElements,
  },
  {
    id: "lib-diamond",
    status: "published",
    created: CREATED,
    name: "Diamond",
    elements: diamondElements,
  },
  {
    id: "lib-pill",
    status: "published",
    created: CREATED,
    name: "Pill / capsule",
    elements: pillElements,
  },
  {
    id: "lib-square",
    status: "published",
    created: CREATED,
    name: "Square",
    elements: squareElements,
  },
  {
    id: "lib-hexagon",
    status: "published",
    created: CREATED,
    name: "Hexagon",
    elements: hexagonElements,
  },

  // Containers & cards
  {
    id: "lib-card-container",
    status: "published",
    created: CREATED,
    name: "Card container",
    elements: cardContainerElements,
  },
  {
    id: "lib-callout-box",
    status: "published",
    created: CREATED,
    name: "Callout box",
    elements: calloutBoxElements,
  },
  {
    id: "lib-status-badge",
    status: "published",
    created: CREATED,
    name: "Status badge",
    elements: statusBadgeElements,
  },
  {
    id: "lib-info-box",
    status: "published",
    created: CREATED,
    name: "Info box",
    elements: infoBoxElements,
  },

  // Arrows & connectors
  {
    id: "lib-arrow-simple",
    status: "published",
    created: CREATED,
    name: "Simple arrow",
    elements: simpleArrowElements,
  },
  {
    id: "lib-arrow-bidirectional",
    status: "published",
    created: CREATED,
    name: "Bidirectional arrow",
    elements: bidirectionalArrowElements,
  },
  {
    id: "lib-arrow-dashed",
    status: "published",
    created: CREATED,
    name: "Dashed connector",
    elements: dashedConnectorElements,
  },
  {
    id: "lib-arrow-elbowed",
    status: "published",
    created: CREATED,
    name: "Elbowed arrow",
    elements: elbowedArrowElements,
  },

  // Text & labels
  {
    id: "lib-text-heading",
    status: "published",
    created: CREATED,
    name: "Heading text",
    elements: headingTextElements,
  },
  {
    id: "lib-text-body",
    status: "published",
    created: CREATED,
    name: "Body text block",
    elements: bodyTextElements,
  },
  {
    id: "lib-label-badge",
    status: "published",
    created: CREATED,
    name: "Label badge",
    elements: labelBadgeElements,
  },

  // Wireframe components
  {
    id: "lib-wf-button",
    status: "published",
    created: CREATED,
    name: "Button",
    elements: buttonElements,
  },
  {
    id: "lib-wf-input",
    status: "published",
    created: CREATED,
    name: "Text input field",
    elements: textInputElements,
  },
  {
    id: "lib-wf-navbar",
    status: "published",
    created: CREATED,
    name: "Nav bar",
    elements: navBarElements,
  },
  {
    id: "lib-wf-image",
    status: "published",
    created: CREATED,
    name: "Image placeholder",
    elements: imagePlaceholderElements,
  },

  // Sticky notes
  {
    id: "lib-sticky-yellow",
    status: "published",
    created: CREATED,
    name: "Yellow sticky note",
    elements: yellowStickyElements,
  },
  {
    id: "lib-sticky-green",
    status: "published",
    created: CREATED,
    name: "Green sticky note",
    elements: greenStickyElements,
  },
  {
    id: "lib-sticky-pink",
    status: "published",
    created: CREATED,
    name: "Pink sticky note",
    elements: pinkStickyElements,
  },
];
