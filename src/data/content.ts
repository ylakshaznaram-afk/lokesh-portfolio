/**
 * Portfolio content — single source of truth.
 *
 * Every professional claim on the site is rendered from this file. Wording
 * here mirrors the resume supplied with the brief; do not add metrics,
 * client names, testimonials, badges or URLs that are not documented there.
 *
 * Before publishing:
 *  - Confirm the Deloitte role is still current (`experience[0].end`).
 *  - Add a resume file to /public and set `profile.resumeUrl` to enable the
 *    download button. It stays hidden while this is null.
 *  - Add details for the Safran role if they should appear.
 */

export const profile = {
  name: 'Lokesh Gadchanda',
  initials: 'LG',
  role: 'ServiceNow Developer & Conversational Designer',
  email: 'lokeshgadchanda2000@gmail.com',
  linkedin: 'https://www.linkedin.com/in/lokesh-gadchanda-875387237/',
  /** Relative path to a real resume asset in /public, or null to hide the download. */
  resumeUrl: null as string | null,
  eyebrow: ['ServiceNow', 'Virtual Agent', 'Conversational UX'],
  headline: ['Complex workflows.', 'Clear conversations.'],
  intro:
    'I’m Lokesh Gadchanda, a ServiceNow developer and conversational designer building Virtual Agent experiences, custom applications, and enterprise integrations.',
  specializations: ['ServiceNow Virtual Agent', 'Conversational UX', 'Enterprise integrations', 'ITSM', 'HRSD', 'ITOM'],
};

export const navItems = [
  { id: 'work', label: 'Work' },
  { id: 'expertise', label: 'Expertise' },
  { id: 'experience', label: 'Experience' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
] as const;

/* ------------------------------------------------------------------ */
/* Conversation Engine modules (hero 3D + static fallback)             */
/* ------------------------------------------------------------------ */

export type EngineNodeId = 'core' | 'itsm' | 'hrsd' | 'cmdb' | 'integrations';

export interface EngineNode {
  id: EngineNodeId;
  label: string;
  code: string;
  title: string;
  body: string;
  related: string[]; // case-study slugs
  /** Position in the 3D scene (world units). */
  pos3: [number, number, number];
  /** Position in the 600×520 static SVG (fallback + mobile). */
  pos2: [number, number];
  accent: 'cyan' | 'violet';
}

export const engineNodes: EngineNode[] = [
  {
    id: 'core',
    label: 'Virtual Agent',
    code: 'VA.CORE',
    title: 'The conversation layer',
    body: 'Greetings, intent handling, multi-step topic flows, fallback paths and live-agent handoff — the layer employees actually talk to.',
    related: ['enterprise-virtual-agent', 'nlu-it-self-service'],
    pos3: [0, 0, 0],
    pos2: [300, 262],
    accent: 'cyan',
  },
  {
    id: 'itsm',
    label: 'ITSM',
    code: 'MOD.01',
    title: 'Incident, Problem & Change',
    body: 'Conversations that create incidents, retrieve ticket status and guide Incident, Problem and Change requests through ITIL-aligned flows.',
    related: ['nlu-it-self-service', 'cmdb-aware-conversations'],
    pos3: [-2.05, 1.05, -0.2],
    pos2: [112, 118],
    accent: 'cyan',
  },
  {
    id: 'hrsd',
    label: 'HRSD',
    code: 'MOD.02',
    title: 'HR Service Delivery',
    body: 'HR Case conversational UX and Employee Center dialog flows with conditional routing for leave, payroll and document verification.',
    related: ['enterprise-virtual-agent', 'employee-center-hr-journeys'],
    pos3: [2.05, 1.1, -0.35],
    pos2: [488, 112],
    accent: 'violet',
  },
  {
    id: 'cmdb',
    label: 'CMDB',
    code: 'MOD.03',
    title: 'Configuration context',
    body: 'Configuration item data used as conversation context — so an incident or change request knows which service and infrastructure it touches.',
    related: ['cmdb-aware-conversations'],
    pos3: [-1.75, -1.25, 0.35],
    pos2: [130, 418],
    accent: 'violet',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    code: 'MOD.04',
    title: 'Enterprise integrations',
    body: 'IntegrationHub and Scripted REST APIs connecting conversations to systems such as Workday, CMDB and Salesforce CSM.',
    related: ['enterprise-virtual-agent', 'employee-center-hr-journeys'],
    pos3: [1.85, -1.2, 0.3],
    pos2: [474, 424],
    accent: 'cyan',
  },
];

/** Workflow paths. Spokes connect each module to the core; links show cross-module relationships. */
export const engineLinks: { from: EngineNodeId; to: EngineNodeId; kind: 'spoke' | 'link' }[] = [
  { from: 'core', to: 'itsm', kind: 'spoke' },
  { from: 'core', to: 'hrsd', kind: 'spoke' },
  { from: 'core', to: 'cmdb', kind: 'spoke' },
  { from: 'core', to: 'integrations', kind: 'spoke' },
  { from: 'itsm', to: 'cmdb', kind: 'link' }, // incidents & changes reference CIs
  { from: 'hrsd', to: 'integrations', kind: 'link' }, // HR journeys reach Workday
];

/* ------------------------------------------------------------------ */
/* Credibility bento                                                   */
/* ------------------------------------------------------------------ */

export interface Highlight {
  id: string;
  value: string;
  label: string;
  caption: string;
  items?: string[];
  source: string;
}

export const highlights: Highlight[] = [
  {
    id: 'topics',
    value: '20+',
    label: 'Virtual Agent topics',
    caption: 'End-to-end conversations designed and built across IT and HR topics.',
    source: 'Scope · Deloitte',
  },
  {
    id: 'assets',
    value: '10,000+',
    label: 'Infrastructure assets in context',
    caption: 'Size of the CMDB whose CI data informed incident and change conversations — the data set, not assets personally managed.',
    source: 'Context · Cognizant',
  },
  {
    id: 'csa',
    value: 'CSA',
    label: 'Certified System Administrator',
    caption: 'ServiceNow certification.',
    source: 'ServiceNow',
  },
  {
    id: 'ms',
    value: 'M.S.',
    label: 'Business Analytics Management',
    caption: 'Master of Science.',
    source: 'Avila University',
  },
  {
    id: 'focus',
    value: '',
    label: 'Focus areas',
    caption: '',
    items: ['Conversation design', 'Platform development', 'Integrations'],
    source: 'Focus areas',
  },
];

/* ------------------------------------------------------------------ */
/* Case studies                                                        */
/* ------------------------------------------------------------------ */

export type VisualKind = 'enterprise' | 'nlu' | 'cmdb' | 'hr';

export interface CaseStudy {
  slug: string;
  index: string;
  title: string;
  context: string; // employer context
  visual: VisualKind;
  visualAlt: string;
  problem: string;
  contribution: string[];
  tech: string[];
  detail: {
    context: string;
    userNeed: string;
    contribution: string[];
    flow: { step: string; note: string }[];
    testing: string[];
    result: string;
  };
}

export const caseStudies: CaseStudy[] = [
  {
    slug: 'enterprise-virtual-agent',
    index: '01',
    title: 'Enterprise Virtual Agent for IT & HR',
    context: 'Deloitte',
    visual: 'enterprise',
    visualAlt:
      'Illustrative chat interface where an employee asks about an HR case, beside a workflow map routing the request through Virtual Agent topics and IntegrationHub to Workday, CMDB and Salesforce CSM.',
    problem: 'Employees needed one conversational entry point for IT and HR requests that otherwise live across several enterprise systems.',
    contribution: [
      'End-to-end conversations across 20+ topics',
      'Greetings, intent handling, multi-step flows and fallback paths',
      'HR Case and Incident conversational UX',
      'IntegrationHub and Scripted REST API connections',
    ],
    tech: ['Virtual Agent', 'IntegrationHub', 'Scripted REST APIs', 'Workday', 'CMDB', 'Salesforce CSM'],
    detail: {
      context:
        'Delivered as part of my ServiceNow Developer role at Deloitte. The work spans both IT and HR service conversations on the ServiceNow platform.',
      userNeed:
        'An employee with an IT or HR question should be able to describe it in a conversation, be guided through the right steps, and end up with the correct record or answer — without needing to know which back-end system holds it.',
      contribution: [
        'Designed and built end-to-end Virtual Agent conversations across more than 20 topics.',
        'Shaped the conversation structure: greetings, intent handling, multi-step flows and fallback paths.',
        'Designed the conversational UX for HR Case and Incident interactions.',
        'Implemented integrations with IntegrationHub and Scripted REST APIs.',
        'Worked on connections involving Workday, CMDB and Salesforce CSM.',
      ],
      flow: [
        { step: 'Greeting', note: 'Opens the conversation and sets expectations.' },
        { step: 'Intent handling', note: 'Identifies whether the request is IT or HR and which topic applies.' },
        { step: 'Multi-step topic flow', note: 'Collects only the details the topic needs, one step at a time.' },
        { step: 'Integration layer', note: 'IntegrationHub and Scripted REST APIs reach Workday, CMDB or Salesforce CSM.' },
        { step: 'Record', note: 'The conversation results in an HR Case or Incident interaction.' },
        { step: 'Fallback path', note: 'Unrecognized or ambiguous input is redirected rather than dead-ending.' },
      ],
      testing: [
        'Fallback paths designed into the conversations, so unrecognised input has a defined route instead of a dead end.',
      ],
      result:
        'Delivered capability: a set of 20+ Virtual Agent topics giving employees a conversational route into HR Case and Incident processes, backed by integrations with Workday, CMDB and Salesforce CSM.',
    },
  },
  {
    slug: 'nlu-it-self-service',
    index: '02',
    title: 'NLU-Powered IT Self-Service',
    context: 'SenecaGlobal',
    visual: 'nlu',
    visualAlt:
      'Illustrative branching intent map — password reset, access request and outage notification — paired with a simulated IT support chat. Request, clarification, resolution and handoff states are colour-coded.',
    problem: 'Common IT requests — password resets, access, outages — needed to be recognised from natural language and resolved or routed correctly.',
    contribution: [
      'Password reset, access request and outage notification conversations',
      'Intent and entity configuration, decision trees and topic flows',
      'Incident creation and ticket-status retrieval',
      'Fallback handling, live-agent routing, SIT/UAT and conversation testing',
    ],
    tech: ['Virtual Agent', 'NLU', 'Intents & entities', 'Incident', 'SIT/UAT'],
    detail: {
      context: 'Delivered in my ServiceNow Developer role at SenecaGlobal, focused on IT self-service through Virtual Agent.',
      userNeed:
        'Someone locked out, missing access, or affected by an outage wants to say so in their own words and get a clear next step — and reach a person when self-service is not enough.',
      contribution: [
        'Built conversations for password reset, access requests and outage notifications.',
        'Configured intents and entities so requests are recognised from natural language.',
        'Designed decision trees and topic flows for each request type.',
        'Implemented incident creation and ticket-status retrieval within conversations.',
        'Designed fallback handling and live-agent routing.',
        'Took part in SIT/UAT and conversation testing.',
      ],
      flow: [
        { step: 'Request', note: 'The user describes the issue; NLU maps it to an intent and extracts entities.' },
        { step: 'Clarification', note: 'Decision trees ask only what is needed to pick the right branch.' },
        { step: 'Resolution', note: 'Topic flow completes the task — e.g. creates an incident or retrieves status.' },
        { step: 'Fallback', note: 'Low-confidence or unknown input gets a recovery prompt.' },
        { step: 'Handoff', note: 'When self-service cannot resolve it, the conversation routes to a live agent.' },
      ],
      testing: [
        'Participated in SIT/UAT.',
        'Conversation testing of the self-service topics.',
        'Fallback handling and live-agent routing designed as explicit paths for requests self-service cannot resolve.',
      ],
      result:
        'Delivered capability: NLU-driven self-service conversations for password reset, access requests and outage notifications, with incident creation, ticket-status retrieval and live-agent routing.',
    },
  },
  {
    slug: 'cmdb-aware-conversations',
    index: '03',
    title: 'CMDB-Aware Incident & Change Conversations',
    context: 'Cognizant',
    visual: 'cmdb',
    visualAlt:
      'Illustrative infrastructure relationship map of a sample business service, its application, servers, database and network, with one configuration item highlighted beside a contextual change-request panel showing sample risk and approval state.',
    problem: 'Incident, Problem and Change conversations are only useful if they understand the infrastructure they refer to.',
    contribution: [
      'Virtual Agent topics for Incident, Problem and Change',
      'Conversation context from CMDB CI data (10,000+ assets in scope)',
      'Approval workflow integration and change-risk retrieval',
      'ITIL-aligned flows with Predictive Intelligence categorisation',
    ],
    tech: ['Virtual Agent', 'CMDB', 'ITSM', 'Predictive Intelligence', 'Approval workflows'],
    detail: {
      context:
        'Delivered in my ServiceNow Developer role at Cognizant, where the CMDB held configuration item data spanning more than 10,000 infrastructure assets.',
      userNeed:
        'When someone raises an incident or asks about a change, the conversation should already know the relevant configuration items, the change risk and where approvals stand.',
      contribution: [
        'Built Virtual Agent topics for Incident, Problem and Change.',
        'Used CMDB CI data as conversation context.',
        'Integrated approval workflows and change-risk retrieval into conversations.',
        'Designed ITIL-aligned flows.',
        'Applied Predictive Intelligence-based categorisation.',
      ],
      flow: [
        { step: 'Topic', note: 'User enters an Incident, Problem or Change conversation.' },
        { step: 'CI context', note: 'CMDB data identifies the configuration items involved.' },
        { step: 'Categorisation', note: 'Predictive Intelligence suggests a category.' },
        { step: 'Risk & approvals', note: 'Change risk is retrieved and approval workflow state is surfaced.' },
        { step: 'ITIL-aligned record', note: 'The flow follows ITIL process stages for the record type.' },
      ],
      testing: [
        'Flows were aligned with ITIL process stages for Incident, Problem and Change.',
        'Change risk and approval state are retrieved from the platform as part of the conversation.',
      ],
      result:
        'Delivered capability: Incident, Problem and Change conversations grounded in CMDB context, with change-risk retrieval, approval workflow integration and Predictive Intelligence categorisation.',
    },
  },
  {
    slug: 'employee-center-hr-journeys',
    index: '04',
    title: 'Employee Center HR Journeys',
    context: 'Deloitte',
    visual: 'hr',
    visualAlt:
      'Illustrative employee-service interface with request categories for leave, payroll, documents and onboarding, a four-step journey tracker, and sample status cards.',
    problem: 'HR requests such as leave, payroll and document verification each follow different routes — employees need a guided path and visible status.',
    contribution: [
      'Conditional routing for leave, payroll and document verification',
      'HRSD Employee Center dialog flows',
      'Widget-based status tracking',
      'Onboarding and offboarding workflow integrations',
    ],
    tech: ['HRSD', 'Employee Center', 'Service Portal widgets', 'Workflows'],
    detail: {
      context: 'Part of my ServiceNow Developer work at Deloitte on HR Service Delivery and Employee Center.',
      userNeed:
        'An employee asking about leave, pay or a document should be routed to the right process without knowing how HR is organised — and be able to see where their request stands.',
      contribution: [
        'Implemented conditional routing for leave requests, payroll queries and document verification.',
        'Built HRSD Employee Center dialog flows.',
        'Delivered widget-based status tracking.',
        'Integrated onboarding and offboarding workflows.',
      ],
      flow: [
        { step: 'Category', note: 'Employee chooses or describes a request: leave, payroll, documents.' },
        { step: 'Conditional routing', note: 'Conditions direct the request to the matching HR process.' },
        { step: 'Dialog flow', note: 'Employee Center dialog collects what that process needs.' },
        { step: 'Status widget', note: 'Progress is visible in a status-tracking widget.' },
        { step: 'Lifecycle workflows', note: 'Onboarding and offboarding workflows connect to the same experience.' },
      ],
      testing: [
        'Conditional routing distinguishes leave, payroll and document-verification requests so each reaches its own process.',
      ],
      result:
        'Delivered capability: guided Employee Center journeys for leave, payroll and document verification, with status tracking and onboarding/offboarding workflow integrations.',
    },
  },
];

/* ------------------------------------------------------------------ */
/* Expertise                                                           */
/* ------------------------------------------------------------------ */

export const expertise = [
  {
    id: 'conversation',
    title: 'Conversation design',
    summary: 'Turning a process into a dialogue people can finish.',
    detail:
      'Mapping the journey first, then writing prompts and topic blocks that ask one thing at a time — with defined paths for misunderstanding and for handing over to a person.',
    items: ['Journey mapping', 'Prompts', 'Topic blocks', 'Entities', 'NLU', 'Fallback handling', 'Live-agent handoff'],
    accent: 'cyan',
  },
  {
    id: 'development',
    title: 'ServiceNow development',
    summary: 'The platform work underneath the conversation.',
    detail: 'Custom applications, data models and the rules that govern them — access, form behaviour and server-side logic.',
    items: ['JavaScript', 'Custom applications', 'Workflows', 'Data models', 'ACLs', 'UI Policies', 'Business Rules', 'Orchestration'],
    accent: 'violet',
  },
  {
    id: 'integrations',
    title: 'Enterprise integrations',
    summary: 'Connecting conversations to the systems that hold the answer.',
    detail: 'Inbound and outbound APIs and IntegrationHub connections to HR, identity, ERP and CRM platforms.',
    items: ['REST', 'SOAP', 'Scripted REST APIs', 'IntegrationHub', 'Workday', 'Azure AD', 'SAP', 'Salesforce'],
    accent: 'cyan',
  },
  {
    id: 'quality',
    title: 'Quality and delivery',
    summary: 'Testing what people actually say, not just the happy path.',
    detail: 'Conversation testing and failed-intent analysis alongside SIT/UAT, delivered in Agile teams.',
    items: ['Conversation testing', 'Failed-intent analysis', 'Edge cases', 'SIT/UAT', 'Agile', 'JIRA', 'Azure Boards', 'Confluence'],
    accent: 'violet',
  },
] as const;

/* ------------------------------------------------------------------ */
/* Experience                                                          */
/* ------------------------------------------------------------------ */

export const experience = [
  {
    company: 'Deloitte',
    title: 'ServiceNow Developer',
    start: 'May 2024',
    end: 'Present', // As listed on the resume — confirm before publishing.
    points: [
      'End-to-end Virtual Agent conversations across 20+ topics, including greetings, intent handling, multi-step flows and fallback paths.',
      'HR Case and Incident conversational UX, with IntegrationHub and Scripted REST API integrations involving Workday, CMDB and Salesforce CSM.',
      'HRSD Employee Center dialog flows with conditional routing, widget-based status tracking and onboarding/offboarding workflow integrations.',
    ],
  },
  {
    company: 'SenecaGlobal',
    title: 'ServiceNow Developer',
    start: 'June 2023',
    end: 'January 2024',
    points: [
      'NLU-based conversations for password reset, access requests and outage notifications, with intent and entity configuration.',
      'Incident creation, ticket-status retrieval, fallback handling and live-agent routing.',
      'SIT/UAT and conversation testing.',
    ],
  },
  {
    company: 'Cognizant',
    title: 'ServiceNow Developer',
    start: 'December 2021',
    end: 'May 2023',
    points: [
      'Virtual Agent topics for Incident, Problem and Change using CMDB CI data spanning 10,000+ infrastructure assets.',
      'Approval workflow integration, change-risk retrieval and ITIL-aligned flows.',
      'Predictive Intelligence-based categorisation.',
    ],
  },
  {
    company: 'Safran India Private Limited',
    title: 'ServiceNow Admin/Developer',
    start: 'November 2020',
    end: 'October 2021',
    points: [] as string[], // Add resume details here before publishing.
  },
];

export const education = [
  { degree: 'Master of Science in Business Analytics Management', school: 'Avila University' },
  {
    degree: 'Bachelor of Arts in Computer Applications, Communicative English, Office Management',
    school: 'Osmania University',
  },
];

export const certifications = [{ name: 'Certified System Administrator', issuer: 'ServiceNow' }];
