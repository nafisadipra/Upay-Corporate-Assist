import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "/Users/user/Documents/Upay-Corporate-Assist";
const SKILL_DIR = "/Users/user/.codex/plugins/cache/openai-primary-runtime/presentations/26.904.11930/skills/presentations";
const TMP_DIR = path.join(workspaceDir, ".codex-build/proposal-deck");
const FINAL_PPTX = path.join(workspaceDir, "output/upay-corporate-assist-project-proposal.pptx");
const RUNTIME_PYTHON = "/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const { resolvePresentationFont, finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs")).href);
const font = resolvePresentationFont({ fontFamily: "Aptos", availableFonts: ["Aptos", "Arial"] });
const p = Presentation.create({ slideSize: { width: 1280, height: 720 } });

const C = { blue: "#0047BA", navy: "#0A192F", yellow: "#FFC700", ink: "#0F172A", slate: "#475569", muted: "#64748B", pale: "#EFF6FF", line: "#D8E2EE", white: "#FFFFFF", bg: "#F6F8FB", green: "#0F9D72", red: "#D64545" };

function shape(slide, left, top, width, height, fill, radius = false, line = "none") {
  return slide.shapes.add({ geometry: radius ? "roundRect" : "rect", position: { left, top, width, height }, fill, line: { fill: line, width: line === "none" ? 0 : 1 } });
}
function text(slide, value, left, top, width, height, size=24, color=C.ink, bold=false, align="left") {
  const s = slide.shapes.add({ geometry: "textbox", position: { left, top, width, height }, fill: "none", line: { fill: "none", width: 0 } });
  s.text = value;
  s.text.style = { typeface: font, fontSize: size, color, bold, alignment: align, verticalAlignment: "middle", autoFit: "shrinkText", marginLeft: 0, marginRight: 0, marginTop: 0, marginBottom: 0 };
  return s;
}
function base(slide, num, dark=false) {
  slide.background.fill = dark ? C.navy : C.bg;
  if (!dark) shape(slide, 0, 0, 18, 720, C.yellow);
  text(slide, String(num).padStart(2,"0"), 1180, 660, 42, 24, 12, dark ? "#AFC2DA" : C.muted, true, "right");
}
function title(slide, value, sub, num) {
  base(slide, num);
  text(slide, value, 72, 45, 1080, 56, 34, C.navy, true);
  if (sub) text(slide, sub, 72, 105, 1080, 32, 16, C.muted, false);
}
function note(slide, body) { slide.speakerNotes.textFrame.setText(body); }

// 1 — Cover
{
  const s = p.slides.add(); base(s, 1, true);
  shape(s, 0, 0, 1280, 18, C.yellow);
  text(s, "upay", 78, 74, 180, 55, 34, C.yellow, true);
  text(s, "Corporate Assist", 76, 180, 760, 90, 54, C.white, true);
  text(s, "A controlled payroll-disbursement platform for corporate teams", 78, 286, 740, 70, 25, "#C7D4E4", false);
  shape(s, 78, 400, 175, 5, C.yellow);
  text(s, "PROJECT PROPOSAL", 78, 430, 300, 28, 15, C.yellow, true);
  text(s, "5-minute overview", 78, 468, 280, 28, 17, "#C7D4E4");
  // abstract payroll ledger motif
  shape(s, 890, 135, 250, 410, "#102945", true, "#254566");
  for (let i=0;i<5;i++) {
    shape(s, 930, 190+i*60, 34, 34, i===4?C.yellow:C.blue, true);
    shape(s, 990, 196+i*60, 105+(i%2)*45, 8, "#5E7896", true);
    shape(s, 990, 214+i*60, 75+(i%3)*25, 6, "#284563", true);
  }
  text(s, "✓", 922, 475, 52, 48, 30, C.navy, true, "center");
  note(s, "Timing: 30 seconds. Introduce upay Corporate Assist as a proposed platform for safer and more visible corporate payroll operations. Explain that the presentation covers the business problem, the solution, the main features, the workflow, and the delivery plan.");
}

// 2 — Problem
{
  const s = p.slides.add(); title(s, "The payroll operations gap", "Corporate payroll involves sensitive data, multiple approvals, and strict timing", 2);
  text(s, "Today’s process can break at four points", 72, 165, 520, 38, 22, C.blue, true);
  const items = [
    ["01", "File errors", "Invalid accounts, duplicate rows, or typing mistakes delay payroll."],
    ["02", "Weak separation of duties", "One person may prepare and release a payment without an independent check."],
    ["03", "Funding uncertainty", "Teams can discover a wallet shortfall too close to payday."],
    ["04", "Limited traceability", "Scattered approvals and corrections make audit review difficult."]
  ];
  items.forEach((it,i)=>{
    const y=225+i*88;
    text(s,it[0],76,y,55,44,18,C.blue,true);
    shape(s,145,y+7,4,55,i===2?C.yellow:C.line);
    text(s,it[1],175,y,260,34,21,C.navy,true);
    text(s,it[2],445,y,700,48,17,C.slate,false);
  });
  text(s, "Proposal goal", 72, 606, 190, 28, 16, C.muted, true);
  text(s, "Move payroll from spreadsheet handoffs to a controlled, trackable workflow.", 270, 598, 840, 42, 24, C.navy, true);
  note(s, "Timing: 45 seconds. Explain that payroll risk does not come from one single issue. It comes from file quality, approval control, wallet readiness, and audit evidence. The proposal addresses all four in one workflow.");
}

// 3 — Solution
{
  const s = p.slides.add(); title(s, "Proposed solution", "One shared platform with role-specific workspaces", 3);
  const cols = [
    ["Corporate HR", "MAKER", "Registers employees\nUploads payroll\nCorrects invalid records\nExecutes approved batches"],
    ["Corporate Finance", "CHECKER", "Reviews totals and exceptions\nApproves or rejects batches\nRecords review notes"],
    ["upay Operations", "ADMIN", "Onboards companies\nManages wallets\nApproves registrations\nMonitors activity and forecasts"]
  ];
  cols.forEach((it,i)=>{
    const x=72+i*396;
    text(s,it[0],x,175,330,40,24,C.navy,true);
    text(s,it[1],x,222,150,26,14,C.blue,true);
    shape(s,x,267,330,5,i===1?C.yellow:C.blue);
    text(s,it[2],x,292,330,190,18,C.slate,false);
  });
  shape(s,72,535,1128,1,C.line);
  text(s,"Shared control layer",72,560,260,34,19,C.blue,true);
  text(s,"Flask API + PostgreSQL enforce authentication, tenant isolation, workflow rules, and audit records.",330,552,840,52,20,C.navy,true);
  note(s, "Timing: 50 seconds. Introduce the three user groups. HR prepares the payroll, finance independently reviews it, and upay operations manages the corporate relationship and wallet. All interfaces use the same backend rules and tenant-scoped database.");
}

// 4 — Features
{
  const s = p.slides.add(); title(s, "Main product features", "Controls are embedded from employee onboarding through payment execution", 4);
  const features = [
    ["01", "Payroll upload and validation", "Excel or CSV upload, roster matching, duplicate checks, and inline correction."],
    ["02", "Maker-checker approval", "HR submits a batch. Finance reviews exceptions and approves or rejects it."],
    ["03", "Risk and anomaly review", "Suspicious records receive clear flags for human review before payout."],
    ["04", "Wallet and disbursement control", "The platform checks funds, records execution, and protects the approved amount."],
    ["05", "Audit trail", "User actions, review notes, status changes, and payroll history remain traceable."],
    ["06", "Liquidity forecasting", "Company payroll history supports future funding estimates and shortfall planning."]
  ];
  features.forEach((it,i)=>{
    const col=i%2, row=Math.floor(i/2), x=72+col*565, y=165+row*148;
    text(s,it[0],x,y,48,30,15,C.blue,true);
    text(s,it[1],x+58,y,455,34,21,C.navy,true);
    text(s,it[2],x+58,y+42,455,68,16,C.slate,false);
    shape(s,x,y+119,500,1,C.line);
  });
  note(s, "Timing: 65 seconds. Focus on the first four capabilities as the operational core. Then position the audit trail as evidence for support and compliance, and forecasting as a planning feature that uses only each company’s own payroll history.");
}

// 5 — Workflow
{
  const s = p.slides.add(); title(s, "End-to-end payroll workflow", "Each status change creates a clear owner and decision point", 5);
  const steps = [
    ["1", "Upload", "HR Maker"], ["2", "Validate", "System"], ["3", "Correct", "HR Maker"],
    ["4", "Review", "Finance Checker"], ["5", "Execute", "HR Maker"], ["6", "Record", "System"]
  ];
  steps.forEach((it,i)=>{
    const x=60+i*200;
    if(i<5) shape(s,x+118,289,82,6,i===3?C.yellow:C.line);
    shape(s,x,245,118,96,i===3?C.yellow:(i===5?C.green:C.blue),true);
    text(s,it[0],x+8,253,102,28,15,i===3?C.navy:C.white,true,"center");
    text(s,it[1],x+8,279,102,35,19,i===3?C.navy:C.white,true,"center");
    text(s,it[2],x-10,358,138,34,14,C.muted,true,"center");
  });
  shape(s,72,455,1128,118,C.white,true,C.line);
  text(s,"Control principle",98,477,230,30,18,C.blue,true);
  text(s,"Only an approved batch can be executed. The system writes payroll history after successful execution, then refreshes the funding forecast.",330,472,815,74,21,C.navy,true);
  text(s,"Upload  →  validation  →  correction  →  finance decision  →  payout  →  immutable record",72,622,1128,28,15,C.muted,false,"center");
  note(s, "Timing: 55 seconds. Walk left to right. Validation happens before submission. Finance provides the independent decision. HR can execute only after approval. Successful execution updates the wallet and payroll history, which then supports future forecasting.");
}

// 6 — Delivery
{
  const s = p.slides.add(); title(s, "Implementation plan and expected value", "A focused pilot can validate the workflow before broader rollout", 6);
  text(s,"Proposed delivery",72,166,340,35,22,C.blue,true);
  const phases = [
    ["Phase 1", "Pilot readiness", "Confirm users, company data, wallet rules, and payroll template."],
    ["Phase 2", "Controlled pilot", "Run sample and live batches with HR, finance, and upay operations."],
    ["Phase 3", "Production rollout", "Monitor exceptions, strengthen forecasting, and onboard more companies."]
  ];
  phases.forEach((it,i)=>{
    const y=220+i*112;
    shape(s,72,y,116,38,i===1?C.yellow:C.blue,true);
    text(s,it[0],78,y+4,104,30,15,i===1?C.navy:C.white,true,"center");
    text(s,it[1],215,y-2,260,32,20,C.navy,true);
    text(s,it[2],215,y+34,430,52,16,C.slate);
  });
  shape(s,700,170,2,390,C.line);
  text(s,"Expected value",750,166,350,35,22,C.blue,true);
  const values = [
    ["Fewer avoidable errors", "Validation and correction happen before approval."],
    ["Stronger payment control", "Maker-checker roles protect disbursement decisions."],
    ["Better funding visibility", "Wallet balances and forecasts support earlier action."],
    ["Clear audit evidence", "Every major action remains linked to a user and time."]
  ];
  values.forEach((it,i)=>{
    const y=222+i*83;
    shape(s,752,y+3,18,18,i===2?C.yellow:C.green,true);
    text(s,it[0],790,y-6,380,30,19,C.navy,true);
    text(s,it[1],790,y+27,380,42,15,C.slate);
  });
  shape(s,72,620,1128,2,C.yellow);
  text(s,"Decision requested: approve a pilot with one corporate client and named Maker, Checker, and Admin users.",72,635,1128,38,21,C.navy,true,"center");
  note(s, "Timing: 55 seconds. Close with a practical request: approve a pilot involving one corporate client and named users for each role. The pilot should validate file quality, approval timing, wallet operations, and reporting before expansion.");
}

await fs.mkdir(path.join(workspaceDir, ".codex-finalizer"), { recursive: true });
await fs.mkdir(path.dirname(FINAL_PPTX), { recursive: true });
const candidatePath = path.join(workspaceDir, ".codex-finalizer/upay-proposal-candidate.pptx");
await (await PresentationFile.exportPptx(p)).save(candidatePath);
const result = await finalizePresentation({
  workspaceDir, candidatePath, finalPath: FINAL_PPTX,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-heading-fit"],
  explicitTotalSlideCount: 6,
  requiredNativeTableOwnerSlides: [], requiredNativeChartOwnerSlides: [],
  fontPolicy: { basis: "design", families: [font] }, verifyArtifactToolImport: true,
  receiptPath: path.join(workspaceDir, ".codex-finalizer/upay-proposal.validation.json")
});
console.log(JSON.stringify({ font, final: FINAL_PPTX, result }, null, 2));
