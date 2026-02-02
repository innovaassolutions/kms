"use client";

import React, { useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  SimpleGrid,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Icon,
  useColorModeValue,
  Container,
} from "@chakra-ui/react";
import { CheckCircleIcon, WarningIcon } from "@chakra-ui/icons";

// ─── SVG MOCKUPS ──────────────────────────────────────────────────────────────

function BrowserFrame({ children, url }: { children: React.ReactNode; url: string }) {
  return (
    <svg viewBox="0 0 800 520" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "auto" }}>
      <rect width="800" height="520" rx="12" fill="#1a2233" />
      <rect width="800" height="36" rx="12" fill="#232b39" />
      <circle cx="20" cy="18" r="5" fill="#ef4444" />
      <circle cx="36" cy="18" r="5" fill="#F25C05" />
      <circle cx="52" cy="18" r="5" fill="#22c55e" />
      <rect x="80" y="8" width="560" height="20" rx="4" fill="#1a2233" />
      <text x="92" y="22" fontSize="10" fill="#718096" fontFamily="monospace">{url}</text>
      {children}
    </svg>
  );
}

function UploadMockup() {
  return (
    <BrowserFrame url="novakms.innovaas.co/upload">
      {/* Header */}
      <rect x="0" y="36" width="800" height="44" fill="#1e2a3a" />
      <text x="30" y="63" fontSize="14" fontWeight="bold" fill="#fff">Upload Documents</text>
      <rect x="650" y="47" width="120" height="28" rx="6" fill="#F25C05" />
      <text x="676" y="66" fontSize="11" fontWeight="bold" fill="#fff">+ New Upload</text>

      {/* Drop Zone */}
      <rect x="30" y="96" width="740" height="140" rx="10" fill="#232b39" stroke="#F25C05" strokeWidth="2" strokeDasharray="8 4" />
      <text x="310" y="148" fontSize="22" fill="#F25C05" fontWeight="bold">⬆</text>
      <text x="290" y="176" fontSize="13" fill="#a0aec0">Drop files here or click to browse</text>
      <text x="260" y="198" fontSize="10" fill="#718096">PDF, DOCX, TXT, MD, MP3, WAV, M4A, MP4, MOV — up to 5GB</text>

      {/* Recent Uploads */}
      <text x="30" y="262" fontSize="12" fontWeight="600" fill="#e2e8f0">Recent Uploads</text>

      {/* File row 1 */}
      <rect x="30" y="274" width="740" height="48" rx="6" fill="#232b39" />
      <rect x="44" y="284" width="28" height="28" rx="4" fill="#F25C05" opacity="0.15" />
      <text x="50" y="303" fontSize="10" fontWeight="bold" fill="#F25C05">PDF</text>
      <text x="84" y="295" fontSize="12" fill="#e2e8f0">Employee_Onboarding_Guide_v3.pdf</text>
      <text x="84" y="310" fontSize="9" fill="#718096">2.4 MB · Uploaded 2 min ago</text>
      <rect x="600" y="288" width="70" height="20" rx="4" fill="#22c55e" opacity="0.15" />
      <text x="612" y="302" fontSize="9" fontWeight="600" fill="#22c55e">Processed</text>
      <rect x="680" y="288" width="70" height="20" rx="4" fill="#F25C05" opacity="0.15" />
      <text x="692" y="302" fontSize="9" fontWeight="600" fill="#F25C05">Embedded</text>

      {/* File row 2 */}
      <rect x="30" y="330" width="740" height="48" rx="6" fill="#232b39" />
      <rect x="44" y="340" width="28" height="28" rx="4" fill="#9b59b6" opacity="0.15" />
      <text x="49" y="359" fontSize="10" fontWeight="bold" fill="#9b59b6">MP4</text>
      <text x="84" y="351" fontSize="12" fill="#e2e8f0">Safety_Training_Workshop_2025.mp4</text>
      <text x="84" y="366" fontSize="9" fill="#718096">1.8 GB · Uploaded 15 min ago</text>
      <rect x="600" y="344" width="70" height="20" rx="4" fill="#F25C05" opacity="0.15" />
      <text x="604" y="358" fontSize="9" fontWeight="600" fill="#F25C05">Processing</text>
      {/* Progress bar */}
      <rect x="680" y="350" width="70" height="6" rx="3" fill="#2d3748" />
      <rect x="680" y="350" width="45" height="6" rx="3" fill="#F25C05" />

      {/* File row 3 */}
      <rect x="30" y="386" width="740" height="48" rx="6" fill="#232b39" />
      <rect x="44" y="396" width="28" height="28" rx="4" fill="#3498db" opacity="0.15" />
      <text x="46" y="415" fontSize="10" fontWeight="bold" fill="#3498db">DOCX</text>
      <text x="84" y="407" fontSize="12" fill="#e2e8f0">IT_Security_Protocols_SOP.docx</text>
      <text x="84" y="422" fontSize="9" fill="#718096">340 KB · Uploaded 1 hour ago</text>
      <rect x="600" y="400" width="70" height="20" rx="4" fill="#22c55e" opacity="0.15" />
      <text x="612" y="414" fontSize="9" fontWeight="600" fill="#22c55e">Processed</text>
      <rect x="680" y="400" width="70" height="20" rx="4" fill="#F25C05" opacity="0.15" />
      <text x="692" y="414" fontSize="9" fontWeight="600" fill="#F25C05">Embedded</text>

      {/* File row 4 */}
      <rect x="30" y="442" width="740" height="48" rx="6" fill="#232b39" />
      <rect x="44" y="452" width="28" height="28" rx="4" fill="#e67e22" opacity="0.15" />
      <text x="49" y="471" fontSize="10" fontWeight="bold" fill="#e67e22">M4A</text>
      <text x="84" y="463" fontSize="12" fill="#e2e8f0">Team_Standup_Notes_Jan28.m4a</text>
      <text x="84" y="478" fontSize="9" fill="#718096">12.6 MB · Uploaded 3 hours ago</text>
      <rect x="600" y="456" width="70" height="20" rx="4" fill="#22c55e" opacity="0.15" />
      <text x="612" y="470" fontSize="9" fontWeight="600" fill="#22c55e">Processed</text>
      <rect x="680" y="456" width="70" height="20" rx="4" fill="#F25C05" opacity="0.15" />
      <text x="692" y="470" fontSize="9" fontWeight="600" fill="#F25C05">Embedded</text>
    </BrowserFrame>
  );
}

function SearchMockup() {
  return (
    <BrowserFrame url="novakms.innovaas.co/search">
      {/* Header */}
      <rect x="0" y="36" width="800" height="44" fill="#1e2a3a" />
      <text x="30" y="63" fontSize="14" fontWeight="bold" fill="#fff">AI-Powered Search</text>

      {/* Search bar */}
      <rect x="30" y="96" width="740" height="44" rx="8" fill="#232b39" stroke="#F25C05" strokeWidth="1.5" />
      <text x="50" y="122" fontSize="13" fill="#e2e8f0">How do we handle customer refund requests?</text>
      <rect x="700" y="104" width="56" height="28" rx="6" fill="#F25C05" />
      <text x="712" y="123" fontSize="11" fontWeight="bold" fill="#fff">Search</text>

      {/* Result 1 */}
      <rect x="30" y="158" width="740" height="100" rx="8" fill="#232b39" />
      <rect x="42" y="168" width="56" height="20" rx="4" fill="#22c55e" opacity="0.15" />
      <text x="49" y="182" fontSize="9" fontWeight="bold" fill="#22c55e">98.4% match</text>
      <rect x="106" y="168" width="36" height="20" rx="4" fill="#F25C05" opacity="0.15" />
      <text x="112" y="182" fontSize="9" fontWeight="bold" fill="#F25C05">PDF</text>
      <text x="42" y="202" fontSize="13" fontWeight="bold" fill="#e2e8f0">Customer_Service_SOP_v5.pdf</text>
      <text x="42" y="220" fontSize="11" fill="#a0aec0">&quot;...Refund requests must be processed within 48 hours. The agent should verify</text>
      <text x="42" y="234" fontSize="11" fill="#a0aec0">the original purchase, check return eligibility, and initiate the refund through...&quot;</text>
      <text x="42" y="250" fontSize="9" fill="#718096">Page 12, Section 4.3 — Last updated Jan 15, 2026</text>

      {/* Result 2 */}
      <rect x="30" y="270" width="740" height="100" rx="8" fill="#232b39" />
      <rect x="42" y="280" width="56" height="20" rx="4" fill="#22c55e" opacity="0.15" />
      <text x="49" y="294" fontSize="9" fontWeight="bold" fill="#22c55e">94.1% match</text>
      <rect x="106" y="280" width="36" height="20" rx="4" fill="#9b59b6" opacity="0.15" />
      <text x="111" y="294" fontSize="9" fontWeight="bold" fill="#9b59b6">MP4</text>
      <text x="42" y="314" fontSize="13" fontWeight="bold" fill="#e2e8f0">Customer_Support_Training_2025.mp4</text>
      <text x="42" y="332" fontSize="11" fill="#a0aec0">&quot;...so when a customer asks for a refund, the first thing you want to do is pull</text>
      <text x="42" y="346" fontSize="11" fill="#a0aec0">up their order history. Always empathize first, then explain the process...&quot;</text>
      <text x="42" y="362" fontSize="9" fill="#718096">Timestamp 14:32 — Audio transcription match</text>

      {/* Result 3 */}
      <rect x="30" y="382" width="740" height="100" rx="8" fill="#232b39" />
      <rect x="42" y="392" width="56" height="20" rx="4" fill="#F25C05" opacity="0.15" />
      <text x="49" y="406" fontSize="9" fontWeight="bold" fill="#F25C05">87.6% match</text>
      <rect x="106" y="392" width="44" height="20" rx="4" fill="#3498db" opacity="0.15" />
      <text x="111" y="406" fontSize="9" fontWeight="bold" fill="#3498db">DOCX</text>
      <text x="42" y="426" fontSize="13" fontWeight="bold" fill="#e2e8f0">Refund_Policy_Update_Memo.docx</text>
      <text x="42" y="444" fontSize="11" fill="#a0aec0">&quot;...Effective February 2026, refund processing time has been reduced from 5</text>
      <text x="42" y="458" fontSize="11" fill="#a0aec0">business days to 48 hours for all approved requests under $500...&quot;</text>
      <text x="42" y="474" fontSize="9" fill="#718096">Section 2 — Updated Jan 28, 2026</text>
    </BrowserFrame>
  );
}

function ChatMockup() {
  return (
    <BrowserFrame url="novakms.innovaas.co/chat">
      {/* Header */}
      <rect x="0" y="36" width="800" height="44" fill="#1e2a3a" />
      <text x="30" y="63" fontSize="14" fontWeight="bold" fill="#fff">RAG Chat Assistant</text>
      <rect x="650" y="47" width="120" height="28" rx="6" fill="#232b39" />
      <text x="672" y="66" fontSize="10" fill="#a0aec0">3 sources loaded</text>

      {/* User message */}
      <rect x="200" y="100" width="570" height="52" rx="10" fill="#F25C05" />
      <text x="220" y="122" fontSize="12" fill="#fff">What&apos;s the process for onboarding a new remote employee?</text>
      <text x="220" y="140" fontSize="12" fill="#fff">Include any IT setup requirements.</text>

      {/* AI response */}
      <rect x="30" y="168" width="620" height="200" rx="10" fill="#232b39" />
      <circle cx="50" cy="188" r="10" fill="#F25C05" opacity="0.2" />
      <text x="44" y="192" fontSize="10" fontWeight="bold" fill="#F25C05">AI</text>
      <text x="68" y="192" fontSize="11" fontWeight="600" fill="#e2e8f0">NovaKMS Assistant</text>

      <text x="42" y="216" fontSize="11" fill="#e2e8f0">Based on your organization&apos;s documents, here&apos;s the remote</text>
      <text x="42" y="232" fontSize="11" fill="#e2e8f0">onboarding process:</text>

      <text x="42" y="256" fontSize="11" fill="#a0aec0">1. HR sends welcome packet + credentials (Day -3)</text>
      <text x="42" y="272" fontSize="11" fill="#a0aec0">2. IT provisions laptop, VPN access, and email (Day -2)</text>
      <text x="42" y="288" fontSize="11" fill="#a0aec0">3. Manager assigns onboarding buddy (Day 1)</text>
      <text x="42" y="304" fontSize="11" fill="#a0aec0">4. Complete security training module (Week 1)</text>

      <text x="42" y="328" fontSize="10" fontWeight="600" fill="#F25C05">📄 Sources:</text>
      <text x="42" y="344" fontSize="9" fill="#718096">[1] Remote_Onboarding_Checklist.pdf — p.3, Section 2.1</text>
      <text x="42" y="358" fontSize="9" fill="#718096">[2] IT_Setup_Guide_Remote.docx — p.1, "Hardware Provisioning"</text>

      {/* Second user message */}
      <rect x="300" y="384" width="470" height="36" rx="10" fill="#F25C05" />
      <text x="320" y="407" fontSize="12" fill="#fff">What security training is required in the first week?</text>

      {/* AI typing indicator */}
      <rect x="30" y="436" width="200" height="36" rx="10" fill="#232b39" />
      <circle cx="60" cy="454" r="4" fill="#a0aec0" opacity="0.4" />
      <circle cx="76" cy="454" r="4" fill="#a0aec0" opacity="0.6" />
      <circle cx="92" cy="454" r="4" fill="#a0aec0" opacity="0.8" />

      {/* Input bar */}
      <rect x="30" y="484" width="740" height="28" rx="6" fill="#232b39" stroke="#4a5568" strokeWidth="1" />
      <text x="46" y="502" fontSize="11" fill="#718096">Ask a question about your knowledge base...</text>
    </BrowserFrame>
  );
}

function VideoMockup() {
  return (
    <BrowserFrame url="novakms.innovaas.co/video-analysis">
      {/* Header */}
      <rect x="0" y="36" width="800" height="44" fill="#1e2a3a" />
      <text x="30" y="63" fontSize="14" fontWeight="bold" fill="#fff">Video Intelligence</text>
      <text x="560" y="63" fontSize="11" fill="#a0aec0">Safety_Training_Workshop.mp4</text>

      {/* Video preview area */}
      <rect x="30" y="96" width="480" height="270" rx="8" fill="#0a0f18" />
      {/* Play button */}
      <circle cx="270" cy="230" r="28" fill="#F25C05" opacity="0.8" />
      <polygon points="262,218 262,242 282,230" fill="#fff" />
      {/* Video timeline */}
      <rect x="40" y="336" width="460" height="4" rx="2" fill="#2d3748" />
      <rect x="40" y="336" width="220" height="4" rx="2" fill="#F25C05" />
      <circle cx="260" cy="338" r="6" fill="#F25C05" />
      <text x="40" y="354" fontSize="9" fill="#718096">14:32 / 47:15</text>
      {/* Scene label on video */}
      <rect x="40" y="106" width="160" height="24" rx="4" fill="#000" opacity="0.7" />
      <text x="50" y="122" fontSize="10" fill="#22c55e">● Scene 8 — Fire Extinguisher Demo</text>

      {/* Extracted frames panel */}
      <rect x="530" y="96" width="240" height="390" rx="8" fill="#232b39" />
      <text x="546" y="118" fontSize="11" fontWeight="600" fill="#e2e8f0">Extracted Frames (24)</text>

      {/* Frame 1 */}
      <rect x="546" y="130" width="100" height="56" rx="4" fill="#1a2233" stroke="#F25C05" strokeWidth="1.5" />
      <text x="576" y="160" fontSize="9" fill="#F25C05">▶ 02:15</text>
      <rect x="656" y="130" width="100" height="56" rx="4" fill="#1a2233" />
      <text x="686" y="160" fontSize="9" fill="#718096">▶ 05:42</text>

      {/* Frame 2 */}
      <rect x="546" y="196" width="100" height="56" rx="4" fill="#1a2233" />
      <text x="576" y="226" fontSize="9" fill="#718096">▶ 08:17</text>
      <rect x="656" y="196" width="100" height="56" rx="4" fill="#1a2233" />
      <text x="686" y="226" fontSize="9" fill="#718096">▶ 12:03</text>

      {/* Frame 3 */}
      <rect x="546" y="262" width="100" height="56" rx="4" fill="#1a2233" stroke="#F25C05" strokeWidth="1.5" />
      <text x="576" y="292" fontSize="9" fill="#F25C05">▶ 14:32</text>
      <rect x="656" y="262" width="100" height="56" rx="4" fill="#1a2233" />
      <text x="686" y="292" fontSize="9" fill="#718096">▶ 18:45</text>

      {/* AI Analysis */}
      <rect x="546" y="330" width="210" height="76" rx="6" fill="#1a2233" />
      <text x="558" y="348" fontSize="9" fontWeight="600" fill="#F25C05">🤖 Claude Vision Analysis</text>
      <text x="558" y="364" fontSize="9" fill="#a0aec0">Scene shows instructor</text>
      <text x="558" y="376" fontSize="9" fill="#a0aec0">demonstrating fire extinguisher</text>
      <text x="558" y="388" fontSize="9" fill="#a0aec0">technique: PASS method</text>
      <text x="558" y="400" fontSize="9" fill="#718096">Confidence: 96.2%</text>

      {/* Transcription panel bottom */}
      <rect x="30" y="374" width="480" height="112" rx="8" fill="#232b39" />
      <text x="46" y="396" fontSize="11" fontWeight="600" fill="#e2e8f0">Audio Transcription</text>
      <text x="46" y="416" fontSize="10" fill="#a0aec0">[14:30] &quot;...so remember the PASS method — Pull the pin, Aim at</text>
      <text x="46" y="432" fontSize="10" fill="#a0aec0">the base of the fire, Squeeze the handle, and Sweep side to</text>
      <text x="46" y="448" fontSize="10" fill="#a0aec0">side. Let me demonstrate with this training unit...&quot;</text>
      <text x="46" y="468" fontSize="9" fill="#718096">Speaker: John Davis (Instructor) · Confidence: 97.8%</text>
    </BrowserFrame>
  );
}

function HeroMockup() {
  return (
    <BrowserFrame url="novakms.innovaas.co/dashboard">
      {/* Header */}
      <rect x="0" y="36" width="800" height="44" fill="#1e2a3a" />
      <text x="30" y="63" fontSize="14" fontWeight="bold" fill="#fff">NovaKMS Dashboard</text>
      <text x="620" y="63" fontSize="11" fill="#a0aec0">Welcome back, Alex</text>

      {/* Stats Row */}
      <rect x="20" y="92" width="185" height="68" rx="8" fill="#232b39" />
      <text x="34" y="112" fontSize="9" fill="#718096">Total Documents</text>
      <text x="34" y="138" fontSize="22" fontWeight="bold" fill="#fff">247</text>

      <rect x="215" y="92" width="185" height="68" rx="8" fill="#232b39" />
      <text x="229" y="112" fontSize="9" fill="#718096">Search Queries Today</text>
      <text x="229" y="138" fontSize="22" fontWeight="bold" fill="#F25C05">84</text>

      <rect x="410" y="92" width="185" height="68" rx="8" fill="#232b39" />
      <text x="424" y="112" fontSize="9" fill="#718096">Avg Response Time</text>
      <text x="424" y="138" fontSize="22" fontWeight="bold" fill="#22c55e">1.2s</text>

      <rect x="605" y="92" width="175" height="68" rx="8" fill="#232b39" />
      <text x="619" y="112" fontSize="9" fill="#718096">Knowledge Coverage</text>
      <text x="619" y="138" fontSize="22" fontWeight="bold" fill="#fff">94%</text>

      {/* Recent Activity */}
      <rect x="20" y="174" width="470" height="200" rx="8" fill="#232b39" />
      <text x="34" y="196" fontSize="12" fontWeight="600" fill="#e2e8f0">Recent Questions</text>

      <rect x="34" y="208" width="442" height="36" rx="6" fill="#1a2233" />
      <text x="48" y="228" fontSize="10" fill="#a0aec0">&quot;What&apos;s our vacation policy for remote employees?&quot;</text>
      <text x="48" y="240" fontSize="8" fill="#22c55e">Answered · 3 sources · 0.8s</text>

      <rect x="34" y="252" width="442" height="36" rx="6" fill="#1a2233" />
      <text x="48" y="272" fontSize="10" fill="#a0aec0">&quot;How do I submit an expense report?&quot;</text>
      <text x="48" y="284" fontSize="8" fill="#22c55e">Answered · 2 sources · 1.1s</text>

      <rect x="34" y="296" width="442" height="36" rx="6" fill="#1a2233" />
      <text x="48" y="316" fontSize="10" fill="#a0aec0">&quot;What safety certifications do warehouse staff need?&quot;</text>
      <text x="48" y="328" fontSize="8" fill="#22c55e">Answered · 5 sources · 1.4s</text>

      <rect x="34" y="340" width="442" height="26" rx="6" fill="#1a2233" />
      <text x="48" y="358" fontSize="10" fill="#718096">View all activity →</text>

      {/* Processing Status */}
      <rect x="510" y="174" width="270" height="200" rx="8" fill="#232b39" />
      <text x="524" y="196" fontSize="12" fontWeight="600" fill="#e2e8f0">Processing</text>

      <text x="524" y="220" fontSize="10" fill="#a0aec0">Training_Video_Q1.mp4</text>
      <rect x="524" y="226" width="242" height="6" rx="3" fill="#2d3748" />
      <rect x="524" y="226" width="170" height="6" rx="3" fill="#F25C05" />
      <text x="524" y="244" fontSize="8" fill="#718096">68% — Extracting frames...</text>

      <text x="524" y="266" fontSize="10" fill="#a0aec0">HR_Policies_2026.pdf</text>
      <rect x="524" y="272" width="242" height="6" rx="3" fill="#2d3748" />
      <rect x="524" y="272" width="242" height="6" rx="3" fill="#22c55e" />
      <text x="524" y="290" fontSize="8" fill="#22c55e">✓ Complete — 42 chunks indexed</text>

      <text x="524" y="312" fontSize="10" fill="#a0aec0">Meeting_Notes_Audio.m4a</text>
      <rect x="524" y="318" width="242" height="6" rx="3" fill="#2d3748" />
      <rect x="524" y="318" width="100" height="6" rx="3" fill="#F25C05" />
      <text x="524" y="336" fontSize="8" fill="#718096">38% — Transcribing audio...</text>

      {/* Type breakdown */}
      <rect x="20" y="386" width="760" height="110" rx="8" fill="#232b39" />
      <text x="34" y="408" fontSize="12" fontWeight="600" fill="#e2e8f0">Document Types</text>
      <rect x="34" y="420" width="160" height="24" rx="4" fill="#F25C05" opacity="0.2" />
      <text x="44" y="436" fontSize="10" fill="#F25C05">PDF — 98 files</text>
      <rect x="204" y="420" width="140" height="24" rx="4" fill="#3498db" opacity="0.2" />
      <text x="214" y="436" fontSize="10" fill="#3498db">DOCX — 64 files</text>
      <rect x="354" y="420" width="120" height="24" rx="4" fill="#9b59b6" opacity="0.2" />
      <text x="364" y="436" fontSize="10" fill="#9b59b6">MP4 — 38 files</text>
      <rect x="484" y="420" width="120" height="24" rx="4" fill="#e67e22" opacity="0.2" />
      <text x="494" y="436" fontSize="10" fill="#e67e22">M4A — 27 files</text>
      <rect x="614" y="420" width="80" height="24" rx="4" fill="#22c55e" opacity="0.2" />
      <text x="624" y="436" fontSize="10" fill="#22c55e">TXT — 12 files</text>
      <rect x="34" y="454" width="80" height="24" rx="4" fill="#718096" opacity="0.2" />
      <text x="44" y="470" fontSize="10" fill="#718096">MD — 8 files</text>
    </BrowserFrame>
  );
}

// ─── LEAD CAPTURE FORM ────────────────────────────────────────────────────────

const NOVACRM_API_URL =
  process.env.NEXT_PUBLIC_NOVACRM_API_URL || "https://nova-cyan-mu.vercel.app";
const NOVACRM_API_KEY =
  process.env.NEXT_PUBLIC_NOVACRM_LEAD_API_KEY || "";

type FormStatus = "idle" | "submitting" | "success" | "error";

function LeadCaptureForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    organization_name: "",
    role: "",
    notes: "",
  });
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const cardBg = useColorModeValue("white", "#232b39");
  const border = useColorModeValue("#e2e8f0", "#2d3748");
  const textCol = useColorModeValue("#181f2a", "#fff");
  const muted = useColorModeValue("#555", "#a0aec0");
  const inputBg = useColorModeValue("white", "#181f2a");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch(`${NOVACRM_API_URL}/api/leads/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(NOVACRM_API_KEY ? { "X-Api-Key": NOVACRM_API_KEY } : {}),
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          organization_name: form.organization_name || undefined,
          role: form.role || undefined,
          interest: "novakms",
          notes: form.notes || undefined,
          page_slug: "novakms-landing",
          source: "novakms-landing",
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Request failed (${res.status})`);
      }

      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    }
  };

  if (status === "success") {
    return (
      <Flex direction="column" align="center" py={10}>
        <Flex
          w={16}
          h={16}
          borderRadius="full"
          bg="rgba(242, 92, 5, 0.1)"
          align="center"
          justify="center"
          mb={4}
        >
          <Icon as={CheckCircleIcon} w={8} h={8} color="#F25C05" />
        </Flex>
        <Heading as="h3" size="lg" mb={2} color={textCol} textAlign="center">
          Thanks! We&apos;ll be in touch shortly.
        </Heading>
        <Text color={muted} textAlign="center" maxW="400px">
          We&apos;ve received your message and will reach out within one business day.
        </Text>
      </Flex>
    );
  }

  return (
    <Box
      as="form"
      onSubmit={handleSubmit}
      bg={cardBg}
      borderRadius="xl"
      boxShadow="xl"
      borderWidth="1px"
      borderColor={border}
      p={{ base: 6, md: 10 }}
      maxW="640px"
      mx="auto"
    >
      <VStack spacing={5} align="stretch">
        <Flex direction={{ base: "column", sm: "row" }} gap={4}>
          <FormControl isRequired flex={1}>
            <FormLabel color={textCol} fontSize="sm" fontWeight={600}>
              Full Name
            </FormLabel>
            <Input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Jane Smith"
              bg={inputBg}
              color={textCol}
              borderColor={border}
              _focus={{ borderColor: "#F25C05", boxShadow: "0 0 0 1px #F25C05" }}
              size="lg"
            />
          </FormControl>
          <FormControl isRequired flex={1}>
            <FormLabel color={textCol} fontSize="sm" fontWeight={600}>
              Work Email
            </FormLabel>
            <Input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="jane@company.com"
              bg={inputBg}
              color={textCol}
              borderColor={border}
              _focus={{ borderColor: "#F25C05", boxShadow: "0 0 0 1px #F25C05" }}
              size="lg"
            />
          </FormControl>
        </Flex>

        <Flex direction={{ base: "column", sm: "row" }} gap={4}>
          <FormControl flex={1}>
            <FormLabel color={textCol} fontSize="sm" fontWeight={600}>
              Company Name
            </FormLabel>
            <Input
              name="organization_name"
              value={form.organization_name}
              onChange={handleChange}
              placeholder="Acme Corp"
              bg={inputBg}
              color={textCol}
              borderColor={border}
              _focus={{ borderColor: "#F25C05", boxShadow: "0 0 0 1px #F25C05" }}
              size="lg"
            />
          </FormControl>
          <FormControl flex={1}>
            <FormLabel color={textCol} fontSize="sm" fontWeight={600}>
              Job Title
            </FormLabel>
            <Input
              name="role"
              value={form.role}
              onChange={handleChange}
              placeholder="VP of Operations"
              bg={inputBg}
              color={textCol}
              borderColor={border}
              _focus={{ borderColor: "#F25C05", boxShadow: "0 0 0 1px #F25C05" }}
              size="lg"
            />
          </FormControl>
        </Flex>

        <FormControl>
          <FormLabel color={textCol} fontSize="sm" fontWeight={600}>
            What&apos;s your biggest knowledge management challenge?
          </FormLabel>
          <Textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="e.g. We lose institutional knowledge when experienced employees leave..."
            rows={4}
            bg={inputBg}
            color={textCol}
            borderColor={border}
            _focus={{ borderColor: "#F25C05", boxShadow: "0 0 0 1px #F25C05" }}
            size="lg"
          />
        </FormControl>

        {status === "error" && (
          <Flex
            align="center"
            gap={2}
            bg="rgba(220, 38, 38, 0.1)"
            borderRadius="lg"
            px={4}
            py={3}
          >
            <Icon as={WarningIcon} color="red.400" w={4} h={4} />
            <Text fontSize="sm" color="red.400">
              {errorMsg}
            </Text>
          </Flex>
        )}

        <Button
          type="submit"
          isLoading={status === "submitting"}
          loadingText="Sending…"
          size="lg"
          fontWeight={700}
          bg="#F25C05"
          color="#fff"
          _hover={{ bg: "#d94e04" }}
          w="100%"
          py={7}
          fontSize="lg"
        >
          Send Message
        </Button>

        <Text fontSize="xs" color={muted} textAlign="center">
          We respect your privacy and will never share your information.
        </Text>
      </VStack>
    </Box>
  );
}

// ─── MAIN LANDING PAGE ────────────────────────────────────────────────────────

const STATS = [
  { value: "5GB", label: "Max file size" },
  { value: "100%", label: "Processing success rate" },
  { value: "AI", label: "Semantic search" },
  { value: "<30s", label: "Average answer time" },
];

const PAIN_POINTS = [
  {
    emoji: "🚪",
    title: "Knowledge Walks Out the Door",
    desc: "When experienced employees leave, years of institutional knowledge leave with them. No handoff doc can capture what's in their head.",
  },
  {
    emoji: "🐢",
    title: "Onboarding Takes Too Long",
    desc: "New hires take months to become productive because training materials are scattered across shared drives, wikis, and people's memories.",
  },
  {
    emoji: "🔍",
    title: "Can't Find the Right Document",
    desc: "Teams waste hours searching shared drives for the right document. Keyword search fails because you need to know the exact words.",
  },
];

const FEATURES = [
  {
    title: "Smart Document Upload",
    desc: "Multi-format support for PDF, DOCX, TXT, audio, and video files up to 5GB. Smart tagging, auto-processing pipeline, and background processing with auto-recovery.",
    mockup: <UploadMockup />,
  },
  {
    title: "AI-Powered Search",
    desc: "Semantic search across text, audio transcriptions, and video frames. Find answers by meaning, not keywords — with similarity scores and source citations.",
    mockup: <SearchMockup />,
  },
  {
    title: "RAG Chat Assistant",
    desc: "Ask questions in natural language and get accurate answers with exact source citations, page numbers, and timestamps. Like having an expert available 24/7.",
    mockup: <ChatMockup />,
  },
  {
    title: "Video Intelligence",
    desc: "Video frame extraction with scene detection and Claude Vision analysis. Search training videos by content — find the exact moment someone explains a process.",
    mockup: <VideoMockup />,
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Upload",
    desc: "Upload your documents, SOPs, training videos, and audio recordings. Any format, up to 5GB.",
  },
  {
    step: "2",
    title: "Process",
    desc: "AI processes, chunks, transcribes, and indexes everything automatically. No manual tagging required.",
  },
  {
    step: "3",
    title: "Ask",
    desc: "Your team asks questions and gets instant, cited answers. New hires are productive from day one.",
  },
];

const USE_CASES = [
  {
    emoji: "🎓",
    title: "Employee Onboarding",
    desc: "New hires ask questions in natural language and get answers from SOPs with source citations. No more \"ask Bob, he's been here 20 years.\"",
  },
  {
    emoji: "📋",
    title: "SOP & Process Docs",
    desc: "Every standard operating procedure is instantly searchable. Find the exact section you need across hundreds of documents in seconds.",
  },
  {
    emoji: "🎬",
    title: "Technical Training",
    desc: "Training videos searchable by content — find the exact moment someone explains a process, complete with timestamps and transcriptions.",
  },
  {
    emoji: "🤝",
    title: "Cross-Team Knowledge",
    desc: "Share knowledge across departments without scheduling meetings. Engineering, HR, and operations — all searchable in one place.",
  },
];

export default function PromotionalLanding() {
  const bg = useColorModeValue("gray.50", "#0f1520");
  const cardBg = useColorModeValue("white", "#1a2233");
  const altBg = useColorModeValue("gray.100", "#141c2b");
  const headingCol = useColorModeValue("gray.900", "white");
  const textCol = useColorModeValue("gray.600", "gray.300");
  const mutedCol = useColorModeValue("gray.500", "gray.500");
  const borderCol = useColorModeValue("gray.200", "gray.700");
  const navBg = useColorModeValue("rgba(255,255,255,0.85)", "rgba(15,21,32,0.85)");

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={2000}
      bg={bg}
      overflowY="auto"
      overflowX="hidden"
    >
      {/* ── NAV ─────────────────────────────────────────────── */}
      <Box
        as="nav"
        position="sticky"
        top={0}
        zIndex={100}
        bg={navBg}
        backdropFilter="blur(12px)"
        borderBottom="1px solid"
        borderColor={borderCol}
      >
        <Container maxW="7xl">
          <Flex h="64px" align="center" justify="space-between">
            <HStack spacing={0}>
              <Text fontSize="xl" fontWeight="400" color={headingCol}>
                Nova
              </Text>
              <Text fontSize="xl" fontWeight="900" color="#F25C05">
                KMS
              </Text>
            </HStack>
            <HStack spacing={4}>
              <Button
                as="a"
                href="#features"
                variant="ghost"
                size="sm"
                color={textCol}
                _hover={{ color: headingCol }}
                display={{ base: "none", sm: "inline-flex" }}
              >
                Features
              </Button>
              <Button
                as="a"
                href="#contact"
                size="sm"
                bg="#F25C05"
                color="white"
                _hover={{ bg: "#d94e04" }}
                fontWeight={700}
              >
                Get Started
              </Button>
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* ── HERO ────────────────────────────────────────────── */}
      <Box
        pt={{ base: 16, md: 24 }}
        pb={{ base: 12, md: 20 }}
        bgGradient={useColorModeValue(
          "linear(to-br, orange.50, gray.50, gray.100)",
          "linear(to-br, rgba(242,92,5,0.06), #0f1520, #141c2b)"
        )}
      >
        <Container maxW="7xl">
          <VStack spacing={6} textAlign="center" maxW="3xl" mx="auto" mb={{ base: 10, md: 16 }}>
            <Heading
              as="h1"
              fontSize={{ base: "3xl", sm: "4xl", md: "5xl", lg: "6xl" }}
              fontWeight={800}
              lineHeight={1.1}
              color={headingCol}
            >
              Your Team&apos;s Knowledge,{" "}
              <Text as="span" color="#F25C05">
                Always Available
              </Text>
            </Heading>
            <Text fontSize={{ base: "lg", md: "xl" }} color={textCol} maxW="2xl">
              NovaKMS captures your organization&apos;s expertise — SOPs, training videos, process
              docs — and makes it instantly searchable with AI. New hires get answers in seconds,
              not days.
            </Text>
            <Button
              as="a"
              href="#contact"
              size="lg"
              bg="#F25C05"
              color="white"
              _hover={{ bg: "#d94e04" }}
              fontWeight={700}
              px={10}
              py={7}
              fontSize="lg"
            >
              Get Started →
            </Button>
          </VStack>

          {/* Hero Mockup */}
          <Box maxW="5xl" mx="auto" borderRadius="xl" overflow="hidden" boxShadow="2xl">
            <HeroMockup />
          </Box>
        </Container>
      </Box>

      {/* ── STATS BAR ───────────────────────────────────────── */}
      <Box bg={altBg} borderY="1px solid" borderColor={borderCol}>
        <Container maxW="7xl" py={{ base: 10, md: 14 }}>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 6, md: 10 }}>
            {STATS.map((s) => (
              <VStack key={s.label} spacing={1}>
                <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight={800} color={headingCol}>
                  {s.value}
                </Text>
                <Text fontSize="sm" color={mutedCol}>
                  {s.label}
                </Text>
              </VStack>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* ── PROBLEM ─────────────────────────────────────────── */}
      <Box py={{ base: 16, md: 24 }} bg={bg}>
        <Container maxW="7xl">
          <VStack spacing={4} mb={12} textAlign="center">
            <Heading fontSize={{ base: "2xl", md: "4xl" }} fontWeight={800} color={headingCol}>
              Sound Familiar?
            </Heading>
            <Text fontSize="lg" color={textCol} maxW="xl">
              These are the knowledge management problems every growing organization faces.
            </Text>
          </VStack>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
            {PAIN_POINTS.map((p) => (
              <Box
                key={p.title}
                bg={cardBg}
                borderRadius="xl"
                p={8}
                borderWidth="1px"
                borderColor={borderCol}
              >
                <Text fontSize="3xl" mb={4}>
                  {p.emoji}
                </Text>
                <Heading size="md" mb={3} color={headingCol}>
                  {p.title}
                </Heading>
                <Text color={textCol} lineHeight="tall">
                  {p.desc}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <Box id="features">
        {FEATURES.map((f, i) => {
          const isReversed = i % 2 === 1;
          const sectionBg = i % 2 === 0 ? altBg : bg;
          return (
            <Box key={f.title} py={{ base: 16, md: 24 }} bg={sectionBg}>
              <Container maxW="7xl">
                <Flex
                  direction={{
                    base: "column",
                    lg: isReversed ? "row-reverse" : "row",
                  }}
                  align="center"
                  gap={{ base: 10, lg: 16 }}
                >
                  {/* Text */}
                  <Box flex={1}>
                    <Heading
                      fontSize={{ base: "xl", md: "3xl" }}
                      fontWeight={800}
                      mb={4}
                      color={headingCol}
                    >
                      {f.title}
                    </Heading>
                    <Text fontSize="lg" color={textCol} lineHeight="tall">
                      {f.desc}
                    </Text>
                  </Box>

                  {/* Mockup */}
                  <Box flex={1} borderRadius="xl" overflow="hidden" boxShadow="xl">
                    {f.mockup}
                  </Box>
                </Flex>
              </Container>
            </Box>
          );
        })}
      </Box>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <Box py={{ base: 16, md: 24 }} bg={altBg}>
        <Container maxW="7xl">
          <VStack spacing={4} mb={12} textAlign="center">
            <Heading fontSize={{ base: "2xl", md: "4xl" }} fontWeight={800} color={headingCol}>
              How It Works
            </Heading>
            <Text fontSize="lg" color={textCol}>
              Three simple steps to searchable organizational knowledge.
            </Text>
          </VStack>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
            {HOW_IT_WORKS.map((step, i) => (
              <VStack
                key={step.step}
                spacing={4}
                textAlign="center"
                position="relative"
              >
                <Flex
                  w={16}
                  h={16}
                  borderRadius="full"
                  bg="#F25C05"
                  align="center"
                  justify="center"
                >
                  <Text fontSize="2xl" fontWeight={800} color="white">
                    {step.step}
                  </Text>
                </Flex>
                <Heading size="md" color={headingCol}>
                  {step.title}
                </Heading>
                <Text color={textCol} lineHeight="tall">
                  {step.desc}
                </Text>
                {i < HOW_IT_WORKS.length - 1 && (
                  <Box
                    display={{ base: "none", md: "block" }}
                    position="absolute"
                    right="-16%"
                    top="32px"
                    color="#F25C05"
                    fontSize="2xl"
                    fontWeight="bold"
                  >
                    →
                  </Box>
                )}
              </VStack>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* ── USE CASES ───────────────────────────────────────── */}
      <Box py={{ base: 16, md: 24 }} bg={bg}>
        <Container maxW="7xl">
          <VStack spacing={4} mb={12} textAlign="center">
            <Heading fontSize={{ base: "2xl", md: "4xl" }} fontWeight={800} color={headingCol}>
              Built For
            </Heading>
          </VStack>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={8}>
            {USE_CASES.map((uc) => (
              <Box
                key={uc.title}
                bg={cardBg}
                borderRadius="xl"
                p={6}
                borderWidth="1px"
                borderColor={borderCol}
                _hover={{ borderColor: "#F25C05", transform: "translateY(-2px)" }}
                transition="all 0.2s"
              >
                <Text fontSize="3xl" mb={3}>
                  {uc.emoji}
                </Text>
                <Heading size="sm" mb={2} color={headingCol}>
                  {uc.title}
                </Heading>
                <Text fontSize="sm" color={textCol} lineHeight="tall">
                  {uc.desc}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* ── LEAD CAPTURE ────────────────────────────────────── */}
      <Box
        id="contact"
        py={{ base: 16, md: 24 }}
        bgGradient={useColorModeValue(
          "linear(to-br, gray.100, orange.50, gray.100)",
          "linear(to-br, #141c2b, rgba(242,92,5,0.06), #141c2b)"
        )}
      >
        <Container maxW="7xl">
          <VStack spacing={4} mb={10} textAlign="center">
            <Heading fontSize={{ base: "2xl", md: "4xl" }} fontWeight={800} color={headingCol}>
              Let&apos;s Talk
            </Heading>
            <Text fontSize="lg" color={textCol} maxW="xl">
              Tell us about your knowledge management challenges and we&apos;ll show you how
              NovaKMS can help.
            </Text>
          </VStack>
          <LeadCaptureForm />
        </Container>
      </Box>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <Box borderTop="1px solid" borderColor={borderCol} py={8} bg={bg}>
        <Container maxW="7xl">
          <Flex
            direction={{ base: "column", sm: "row" }}
            align="center"
            justify="space-between"
            gap={4}
          >
            <HStack spacing={0} opacity={0.6}>
              <Text fontSize="md" fontWeight="400" color={headingCol}>
                Nova
              </Text>
              <Text fontSize="md" fontWeight="900" color="#F25C05">
                KMS
              </Text>
            </HStack>
            <Text fontSize="sm" color={mutedCol}>
              © 2026 INNOVAAS. All rights reserved.
            </Text>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
}
