import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "/Users/user/Documents/Upay-Corporate-Assist";
const SKILL_DIR = "/Users/user/.codex/plugins/cache/openai-primary-runtime/presentations/26.904.11930/skills/presentations";
const FINAL_PPTX = path.join(workspaceDir, "output/upay-corporate-assist-professional-proposal.pptx");
const RUNTIME_PYTHON = "/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const { resolvePresentationFont, finalizePresentation } = await import(
  pathToFileURL(path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs")).href,
);
const font = resolvePresentationFont({ fontFamily: "Arial", availableFonts: ["Arial"] });
const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });

const C = {
  dark: "#2D3142",
  orange: "#EF8354",
  slate: "#4F5D75",
  muted: "#BFC0C0",
  white: "#FFFFFF",
  bg: "#F7F9F6",
  border: "#DCE7DD",
  success: "#059669",
  alert: "#F55E5A",
  orangeSoft: "#FFF1EB",
  ink: "#2D3142",
  paleSlate: "#EEF1F5",
};

function box(slide, x, y, w, h, fill, rounded = false, stroke = "none", strokeWidth = 0) {
  return slide.shapes.add({
    geometry: rounded ? "roundRect" : "rect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { fill: stroke, width: strokeWidth },
  });
}

function label(slide, value, x, y, w, h, size = 22, color = C.ink, bold = false, align = "left") {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  shape.text = value;
  shape.text.style = {
    typeface: font,
    fontSize: size,
    color,
    bold,
    alignment: align,
    verticalAlignment: "middle",
    autoFit: "shrinkText",
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0,
  };
  return shape;
}

function shell(slide, number, heading, subheading = "") {
  slide.background.fill = C.bg;
  box(slide, 0, 0, 86, 720, C.dark);
  box(slide, 0, 0, 86, 12, C.orange);
  box(slide, 28, 42, 30, 30, C.orange, true);
  label(slide, "u", 28, 41, 30, 30, 18, C.white, true, "center");
  label(slide, String(number).padStart(2, "0"), 28, 654, 30, 24, 12, C.muted, true, "center");
  label(slide, heading, 126, 45, 1050, 48, 34, C.dark, true);
  if (subheading) label(slide, subheading, 126, 96, 1030, 28, 16, C.slate);
  box(slide, 126, 140, 1004, 2, C.border);
}

function notes(slide, value) {
  slide.speakerNotes.textFrame.setText(value);
}

// Slide 1: Presenter introduction
{
  const s = deck.slides.add();
  s.background.fill = C.dark;
  box(s, 0, 0, 1280, 14, C.orange);
  box(s, 80, 66, 50, 50, C.orange, true);
  label(s, "u", 80, 65, 50, 50, 28, C.white, true, "center");
  label(s, "upay", 148, 62, 160, 36, 28, C.white, true);
  label(s, "CORPORATE ASSIST", 148, 96, 230, 22, 12, C.muted, true);
  label(s, "Hello, I’m", 80, 205, 540, 42, 23, C.orange, true);
  label(s, "[YOUR NAME]", 80, 248, 720, 78, 52, C.white, true);
  label(s, "[YOUR ROLE]", 82, 335, 560, 38, 23, C.muted, true);
  box(s, 82, 397, 88, 4, C.orange);
  label(s, "Working at [COMPANY / DEPARTMENT]", 82, 425, 650, 45, 22, C.white);
  label(s, "Secure corporate payroll operations", 82, 486, 600, 38, 17, C.muted);
  box(s, 850, 168, 290, 350, C.slate, true);
  box(s, 886, 204, 218, 54, C.dark, true);
  box(s, 906, 222, 20, 20, C.orange, true);
  label(s, "Corporate workspace", 944, 216, 140, 30, 15, C.white, true);
  for (let i = 0; i < 4; i++) {
    box(s, 886, 286 + i * 48, 218, 34, i === 1 ? C.orange : C.dark, true);
    box(s, 903, 297 + i * 48, 14, 14, i === 1 ? C.white : C.muted, true);
    box(s, 933, 300 + i * 48, 110 + (i % 2) * 34, 7, i === 1 ? C.white : C.muted, true);
  }
  notes(s, "Timing: 35 seconds. Introduce yourself, your role, and where you work. Briefly connect your responsibilities to corporate payroll operations. Replace the bracketed placeholders before presenting.");
}

// Slide 2: Current work
{
  const s = deck.slides.add();
  shell(s, 2, "What I’m working on", "A safer way to prepare, approve, and execute corporate payroll");
  label(s, "upay Corporate Assist", 126, 176, 620, 54, 32, C.dark, true);
  label(s, "Multi-tenant corporate payroll and disbursement platform", 126, 233, 650, 42, 20, C.slate);
  const nodes = [
    ["Corporate HR", "Prepares payroll"],
    ["Corporate Assist", "Controls the workflow"],
    ["Employee wallets", "Receive payments"],
  ];
  nodes.forEach((n, i) => {
    const x = 126 + i * 352;
    if (i < 2) box(s, x + 260, 398, 92, 5, C.border);
    box(s, x, 330, 260, 145, i === 1 ? C.dark : C.white, true, i === 1 ? C.dark : C.border, 1);
    box(s, x + 24, 354, 38, 38, i === 1 ? C.orange : C.orangeSoft, true);
    label(s, String(i + 1), x + 24, 354, 38, 38, 16, i === 1 ? C.white : C.orange, true, "center");
    label(s, n[0], x + 24, 406, 210, 28, 19, i === 1 ? C.white : C.dark, true);
    label(s, n[1], x + 24, 437, 210, 24, 14, i === 1 ? C.muted : C.slate);
  });
  box(s, 126, 550, 1056, 76, C.orangeSoft, true);
  label(s, "My focus", 150, 568, 130, 30, 16, C.orange, true);
  label(s, "Turning spreadsheet handoffs into a controlled digital process", 292, 558, 840, 46, 22, C.dark, true);
  notes(s, "Timing: 40 seconds. Explain that your current project is upay Corporate Assist. It supports the full path from corporate payroll preparation to employee wallet payment, with controls between each stage.");
}

// Slide 3: Agenda
{
  const s = deck.slides.add();
  shell(s, 3, "Today’s presentation", "A short overview of the proposal");
  const agenda = [
    ["01", "The problem", "Where payroll operations create risk"],
    ["02", "The solution", "How Corporate Assist addresses it"],
    ["03", "Main features", "The capabilities included in the platform"],
    ["04", "Implementation", "How we can validate the solution"],
  ];
  agenda.forEach((a, i) => {
    const y = 180 + i * 106;
    box(s, 126, y, 88, 72, i === 1 ? C.orange : C.dark, true);
    label(s, a[0], 126, y, 88, 72, 22, C.white, true, "center");
    label(s, a[1], 246, y + 1, 360, 32, 23, C.dark, true);
    label(s, a[2], 246, y + 37, 690, 27, 16, C.slate);
    if (i < 3) box(s, 246, y + 86, 760, 1, C.border);
  });
  notes(s, "Timing: 25 seconds. Set expectations for the presentation. You will explain the operational problem, introduce the proposed platform, highlight the main features, and close with an implementation approach.");
}

// Slide 4: Problem
{
  const s = deck.slides.add();
  shell(s, 4, "The payroll operations gap", "Spreadsheet-based handoffs make control and visibility difficult");
  const problems = [
    ["File errors", "Invalid accounts and duplicate rows"],
    ["Approval risk", "Weak separation of duties"],
    ["Wallet shortfalls", "Funding issues discovered late"],
    ["Limited audit visibility", "Approvals spread across channels"],
  ];
  problems.forEach((p, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 126 + col * 525;
    const y = 188 + row * 180;
    box(s, x, y, 470, 140, C.white, true, C.border, 1);
    box(s, x, y, 10, 140, i === 1 ? C.alert : C.orange, true);
    label(s, String(i + 1).padStart(2, "0"), x + 31, y + 24, 44, 28, 14, C.orange, true);
    label(s, p[0], x + 90, y + 18, 345, 36, 21, C.dark, true);
    label(s, p[1], x + 90, y + 61, 345, 45, 16, C.slate);
  });
  box(s, 126, 572, 995, 3, C.orange);
  label(s, "Need", 126, 593, 86, 32, 16, C.orange, true);
  label(s, "One controlled and traceable payroll workflow", 220, 585, 700, 46, 23, C.dark, true);
  notes(s, "Timing: 45 seconds. Describe the four common gaps: data quality, independent approval, funding readiness, and evidence for audit or support. Emphasize that these issues interact during a time-sensitive payroll cycle.");
}

// Slide 5: Proposal
{
  const s = deck.slides.add();
  shell(s, 5, "Project proposal", "One platform with clear roles and shared controls");
  const roles = [
    ["HR Maker", "Prepare", "Employee registration\nPayroll upload\nCorrections"],
    ["Finance Checker", "Approve", "Exception review\nApprove or reject\nReview notes"],
    ["upay Admin", "Operate", "Company onboarding\nWallet management\nActivity monitoring"],
  ];
  roles.forEach((r, i) => {
    const x = 126 + i * 352;
    box(s, x, 184, 302, 330, C.white, true, C.border, 1);
    box(s, x, 184, 302, 72, i === 1 ? C.orange : C.dark, true);
    label(s, r[0], x + 22, 198, 258, 30, 21, C.white, true);
    label(s, r[1].toUpperCase(), x + 22, 270, 180, 26, 13, C.orange, true);
    label(s, r[2], x + 22, 315, 250, 140, 18, C.slate);
  });
  box(s, 126, 555, 1006, 72, C.dark, true);
  label(s, "Shared control layer", 152, 570, 236, 34, 17, C.orange, true);
  label(s, "Authentication  •  tenant isolation  •  workflow rules  •  audit records", 395, 568, 700, 38, 18, C.white, true);
  notes(s, "Timing: 50 seconds. Explain the three workspaces. HR prepares and corrects payroll. Finance provides independent review. upay Operations manages the corporate account and wallet. The shared backend applies the same security and workflow rules across all roles.");
}

// Slide 6: Features
{
  const s = deck.slides.add();
  shell(s, 6, "Main features", "Controls from employee onboarding through disbursement");
  const features = [
    ["Payroll upload", "Excel and CSV"],
    ["Data validation", "Roster and account checks"],
    ["Maker-checker", "Independent approval"],
    ["Risk review", "Exception flags"],
    ["Wallet control", "Balance and execution"],
    ["Forecasting", "Funding estimates"],
    ["Audit trail", "Recorded actions"],
  ];
  features.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 126 + col * 516;
    const y = 173 + row * 112;
    box(s, x, y, 474, 86, i === 6 ? C.dark : C.white, true, i === 6 ? C.dark : C.border, 1);
    box(s, x + 20, y + 25, 34, 34, i === 6 ? C.orange : C.orangeSoft, true);
    label(s, String(i + 1), x + 20, y + 25, 34, 34, 14, i === 6 ? C.white : C.orange, true, "center");
    label(s, f[0], x + 72, y + 15, 260, 30, 19, i === 6 ? C.white : C.dark, true);
    label(s, f[1], x + 72, y + 47, 350, 23, 14, i === 6 ? C.muted : C.slate);
  });
  notes(s, "Timing: 65 seconds. Briefly cover the features. Payroll upload and validation reduce file errors. Maker-checker approval and risk review strengthen decisions. Wallet controls manage execution. Forecasting improves funding preparation, and the audit trail records key actions.");
}

// Slide 7: Value and next step
{
  const s = deck.slides.add();
  s.background.fill = C.dark;
  box(s, 0, 0, 1280, 14, C.orange);
  box(s, 80, 58, 44, 44, C.orange, true);
  label(s, "u", 80, 57, 44, 44, 24, C.white, true, "center");
  label(s, "Expected value", 80, 158, 690, 60, 42, C.white, true);
  const values = [
    ["01", "Fewer payroll errors"],
    ["02", "Stronger payment control"],
    ["03", "Better funding visibility"],
    ["04", "Clear audit records"],
  ];
  values.forEach((v, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 82 + col * 430;
    const y = 270 + row * 112;
    label(s, v[0], x, y, 50, 28, 14, C.orange, true);
    label(s, v[1], x + 62, y - 5, 330, 40, 21, C.white, true);
    box(s, x + 62, y + 49, 300, 1, C.slate);
  });
  box(s, 80, 548, 1120, 92, C.orange, true);
  label(s, "NEXT STEP", 108, 568, 145, 30, 14, C.dark, true);
  label(s, "Approve a pilot with one corporate client", 265, 558, 850, 50, 26, C.dark, true);
  label(s, "Thank you", 1030, 660, 170, 24, 13, C.muted, true, "right");
  notes(s, "Timing: 40 seconds. Summarize the expected value and make the request clear: approve a focused pilot with one corporate client and named users for the Maker, Checker, and Admin roles. Close and invite questions.");
}

await fs.mkdir(path.join(workspaceDir, ".codex-finalizer"), { recursive: true });
await fs.mkdir(path.dirname(FINAL_PPTX), { recursive: true });
const candidatePath = path.join(workspaceDir, ".codex-finalizer/upay-professional-proposal-candidate.pptx");
await (await PresentationFile.exportPptx(deck)).save(candidatePath);

const result = await finalizePresentation({
  workspaceDir,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-heading-fit"],
  explicitTotalSlideCount: 7,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  fontPolicy: { basis: "design", families: [font] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(workspaceDir, ".codex-finalizer/upay-professional-proposal.validation.json"),
});
console.log(JSON.stringify({ final: FINAL_PPTX, font, result }, null, 2));
