/**
 * Portfolio content — single source of truth.
 *
 * Every professional claim on the site is rendered from this file and mirrors
 * the resume content supplied with the brief. Do not add metrics, outcomes,
 * client names, testimonials, badges or URLs that are not documented there.
 *
 * Before publishing:
 *  - Confirm the Deloitte role is still current (`experience[0].end`).
 *  - Add a resume file to /public and set `profile.resumeUrl` to enable the
 *    download buttons. They stay hidden while this is null.
 *  - Add details for the Safran role if they should appear.
 */

export const profile = {
  name: 'Lokesh Gadchanda',
  nameLines: ['Lokesh', 'Gadchanda'],
  initials: 'LG',
  role: 'ServiceNow Developer & Conversational Designer',
  /** The two halves of the role, shown as connected chips in the hero. */
  roles: ['ServiceNow Developer', 'Conversational Designer'] as const,
  intro: 'I build Virtual Agent experiences, custom applications, and integrations that make enterprise services easier to use.',
  focus: ['Virtual Agent', 'Conversational UX', 'Integrations', 'ITSM', 'HRSD', 'ITOM'],
  slogan: ['Complex workflows.', 'Clear conversations.'],
  email: 'lokeshgadchanda2000@gmail.com',
  linkedin: 'https://www.linkedin.com/in/lokesh-gadchanda-875387237/',
  /** Relative path to a real resume asset in /public, or null to hide the download. */
  resumeUrl: null as string | null,
};

export const navItems = [
  { id: 'work', label: 'Work' },
  { id: 'expertise', label: 'Expertise' },
  { id: 'experience', label: 'Experience' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
] as const;

/* ------------------------------------------------------------------ */
/* Credibility strip                                                   */
/* ------------------------------------------------------------------ */

export const highlights = [
  { id: 'topics', value: '20+', label: 'Virtual Agent topics', note: 'Conversation scope at Deloitte' },
  {
    id: 'assets',
    value: '10,000+',
    label: 'Infrastructure assets in CMDB context',
    note: 'The CMDB behind incident and change conversations at Cognizant',
  },
  { id: 'csa', value: 'CSA', label: 'ServiceNow Certified System Administrator', note: 'Certification' },
  { id: 'ms', value: 'M.S.', label: 'Business Analytics Management', note: 'Avila University' },
] as const;

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

export type ProjectVisual = 'ribbon' | 'panels' | 'constellation' | 'journey';

export interface Project {
  slug: string;
  index: string;
  title: string;
  employer: string;
  summary: string;
  tags: [string, ...string[]];
  visual: ProjectVisual;
  visualAlt: string;
  caseStudy: {
    overview: string;
    challenge: string;
    role: string[];
    approach: string;
    implementation: { step: string; note: string }[];
    stack: string[];
    testing: string[];
    delivered: string[];
  };
}

export const projects: Project[] = [
  {
    slug: 'enterprise-virtual-agent',
    index: '01',
    title: 'Enterprise Virtual Agent',
    employer: 'Deloitte',
    summary:
      'End-to-end Virtual Agent conversations across 20+ IT and HR topics, connected to enterprise systems through IntegrationHub and Scripted REST APIs.',
    tags: ['Virtual Agent', 'IntegrationHub', 'Scripted REST'],
    visual: 'ribbon',
    visualAlt:
      'Workflow Ribbon: a satin-metal ribbon passing through three glass gates labelled Request, Route and Resolve, with light travelling along it, beside a small illustrative conversation panel.',
    caseStudy: {
      overview:
        'As a ServiceNow Developer at Deloitte, I designed and built Virtual Agent conversations for IT and HR services, end to end.',
      challenge:
        'Employees needed one conversational entry point for IT and HR requests that otherwise live across several enterprise systems — without having to know which system holds the answer.',
      role: [
        'Designed and built end-to-end Virtual Agent conversations across more than 20 topics.',
        'Shaped greetings, prompts, intent handling, multi-step flows and fallback paths.',
        'Designed the conversational UX for HR Case and Incident interactions.',
        'Implemented integrations with IntegrationHub and Scripted REST APIs.',
        'Worked on connections involving Workday, CMDB and Salesforce CSM.',
      ],
      approach:
        'The topics share a common structure: a greeting that sets expectations, intent handling that finds the right topic, a multi-step flow that asks only for what it needs, and a fallback path for unrecognised input.',
      implementation: [
        { step: 'Request', note: 'An employee describes an IT or HR need in Virtual Agent.' },
        { step: 'Intent handling', note: 'Intent handling matches the request to a topic.' },
        { step: 'Topic flow', note: 'A multi-step flow collects the details one step at a time.' },
        { step: 'Integrations', note: 'IntegrationHub and Scripted REST APIs reach Workday, CMDB or Salesforce CSM.' },
        { step: 'Record', note: 'The conversation ends in an HR Case or Incident.' },
      ],
      stack: ['Virtual Agent', 'IntegrationHub', 'Scripted REST APIs', 'Workday', 'CMDB', 'Salesforce CSM', 'ITSM', 'HRSD'],
      testing: ['Fallback paths designed into the conversations, so unrecognised input has a defined route instead of a dead end.'],
      delivered: [
        'Employees can raise IT and HR requests in Virtual Agent, across 20+ topics.',
        'Conversations lead straight into HR Case and Incident processes.',
        'Integration paths to Workday, CMDB and Salesforce CSM through IntegrationHub and Scripted REST APIs.',
      ],
    },
  },
  {
    slug: 'it-self-service',
    index: '02',
    title: 'IT Self-Service Conversations',
    employer: 'SenecaGlobal',
    summary:
      'NLU-driven conversations for password resets, access requests and outage notifications, with incident creation, ticket status and live-agent routing.',
    tags: ['NLU', 'Virtual Agent', 'ITSM'],
    visual: 'panels',
    visualAlt:
      'Layered conversation panels at depth: an IT support chat moving from request to clarification to resolution, in front of an intent tree branching into password reset, access request and outage notification. Illustrative, sample data.',
    caseStudy: {
      overview: 'As a ServiceNow Developer at SenecaGlobal, I built IT self-service conversations in Virtual Agent.',
      challenge:
        'Someone locked out, missing access or affected by an outage wants to say so in their own words, get a clear next step — and reach a person when self-service isn’t enough.',
      role: [
        'Built conversations for password reset, access requests and outage notifications.',
        'Configured intents and entities so requests are recognised from natural language.',
        'Designed decision trees and topic flows for each request type.',
        'Implemented incident creation and ticket-status retrieval within conversations.',
        'Designed fallback handling and live-agent routing.',
      ],
      approach:
        'Natural language first: intents and entities recognise the request, decision trees ask only the clarifying questions a branch needs, and paths are designed to end in a resolution, a fallback or a handoff to a person.',
      implementation: [
        { step: 'Request', note: 'NLU maps the message to an intent and extracts entities.' },
        { step: 'Clarify', note: 'Decision trees ask only what is needed to pick the branch.' },
        { step: 'Resolve', note: 'The topic flow creates an incident or retrieves ticket status.' },
        { step: 'Fallback', note: 'Low-confidence or unknown input gets a recovery prompt.' },
        { step: 'Handoff', note: 'When self-service can’t resolve it, the conversation routes to a live agent.' },
      ],
      stack: ['Virtual Agent', 'NLU', 'Intents & entities', 'Incident', 'ITSM', 'SIT/UAT'],
      testing: [
        'Took part in SIT/UAT and conversation testing of the self-service topics.',
        'Fallback handling and live-agent routing designed as explicit paths for requests self-service can’t resolve.',
      ],
      delivered: [
        'Self-service for password reset, access requests and outage notifications, in the employee’s own words.',
        'Incidents created and ticket status checked without leaving the chat.',
        'A route to a live agent when self-service can’t resolve the request.',
      ],
    },
  },
  {
    slug: 'cmdb-service-workflows',
    index: '03',
    title: 'CMDB-Aware Service Workflows',
    employer: 'Cognizant',
    summary: 'Incident, Problem and Change conversations that draw on CMDB context, approval workflows and change-risk information.',
    tags: ['CMDB', 'ITSM', 'Predictive Intelligence'],
    visual: 'constellation',
    visualAlt:
      'Service Constellation: a miniature dark-ceramic infrastructure model — a business service connected to an application, two servers and a database by fine illuminated lines.',
    caseStudy: {
      overview:
        'As a ServiceNow Developer at Cognizant, I built service conversations on a CMDB that held configuration item data for more than 10,000 infrastructure assets.',
      challenge:
        'Incident, Problem and Change conversations are only useful if they understand the infrastructure they refer to — which service is affected, how risky a change is, and where approvals stand.',
      role: [
        'Built Virtual Agent topics for Incident, Problem and Change.',
        'Used CMDB configuration item data as conversation context.',
        'Integrated approval workflows and change-risk retrieval into conversations.',
        'Designed ITIL-aligned flows.',
        'Applied Predictive Intelligence-based categorisation.',
      ],
      approach:
        'Let the platform supply the context instead of asking for it: CMDB data identifies the configuration items involved, change risk and approval state are retrieved, and each record type follows its ITIL stages.',
      implementation: [
        { step: 'Topic', note: 'The user starts an Incident, Problem or Change conversation.' },
        { step: 'CI context', note: 'CMDB data identifies the configuration items involved.' },
        { step: 'Categorisation', note: 'Predictive Intelligence suggests a category.' },
        { step: 'Risk & approvals', note: 'Change risk is retrieved and approval workflow state surfaced.' },
        { step: 'Record', note: 'The flow follows ITIL stages for the record type.' },
      ],
      stack: ['Virtual Agent', 'CMDB', 'ITSM', 'Change Management', 'Approval workflows', 'Predictive Intelligence'],
      testing: [],
      delivered: [
        'Incident, Problem and Change conversations that use CMDB data about the configuration items involved.',
        'Change risk and approval status available inside the conversation.',
        'Categories suggested by Predictive Intelligence.',
      ],
    },
  },
  {
    slug: 'employee-center-hr-journeys',
    index: '04',
    title: 'Employee Center HR Journeys',
    employer: 'Deloitte',
    summary: 'Guided Employee Center journeys for leave, payroll and document verification, with conditional routing and status tracking.',
    tags: ['HRSD', 'Employee Center', 'Workflows'],
    visual: 'journey',
    visualAlt:
      'Layered employee-service interfaces arranged along a journey: request categories, a routed request, a dialog step and a status tracker, each with sample data.',
    caseStudy: {
      overview: 'As a ServiceNow Developer at Deloitte, I built HR Service Delivery journeys in Employee Center.',
      challenge:
        'An employee asking about leave, pay or a document should reach the right process without knowing how HR is organised — and be able to see where the request stands.',
      role: [
        'Implemented conditional routing for leave requests, payroll queries and document verification.',
        'Built HRSD Employee Center dialog flows.',
        'Built widget-based status tracking.',
        'Integrated onboarding and offboarding workflows.',
      ],
      approach:
        'Route by condition, not by org chart: the request type decides the process, the dialog collects only what that process needs, and a status widget keeps the employee informed.',
      implementation: [
        { step: 'Category', note: 'The employee chooses or describes a request: leave, payroll or documents.' },
        { step: 'Routing', note: 'Conditions direct the request to the matching HR process.' },
        { step: 'Dialog', note: 'An Employee Center dialog collects what that process needs.' },
        { step: 'Status', note: 'Progress is visible in a status-tracking widget.' },
        { step: 'Lifecycle', note: 'Onboarding and offboarding workflows connect to the same experience.' },
      ],
      stack: ['HRSD', 'Employee Center', 'Service Portal widgets', 'Workflows'],
      testing: ['Conditional routing distinguishes leave, payroll and document-verification requests so each reaches its own process.'],
      delivered: [
        'One guided entry point for leave, payroll and document-verification requests.',
        'Request status visible in Employee Center.',
        'Onboarding and offboarding connected to the same experience.',
      ],
    },
  },
];

/* Workflow Ribbon stages (featured project). Sample conversation lines are synthetic. */
export const ribbonStages = [
  {
    id: 'request',
    label: 'Request',
    text: 'An employee describes an IT or HR need in plain language, and intent handling matches it to a topic.',
    sample: { from: 'user', text: 'I need to update my home address for HR records.' },
  },
  {
    id: 'route',
    label: 'Route',
    text: 'A multi-step topic flow gathers the details, then IntegrationHub and Scripted REST APIs reach systems such as Workday, CMDB or Salesforce CSM.',
    sample: { from: 'bot', text: 'Thanks — I’ll check the details on file before we continue.' },
  },
  {
    id: 'resolve',
    label: 'Resolve',
    text: 'The conversation ends in an HR Case or Incident — or a fallback path when the request isn’t understood.',
    sample: { from: 'record', text: 'HR Case · HRC-DEMO-0193 · Draft' },
  },
] as const;

/* Service Constellation topology (CMDB project). Entirely synthetic. */
export const constellationNodes = [
  { id: 'service', short: 'Service', label: 'Payments Portal', type: 'Business service', relation: 'The service people notice. An incident raised against it can be traced through every component below.' },
  { id: 'app', short: 'Application', label: 'pay-api', type: 'Application', relation: 'Supports Payments Portal and runs on both servers, so the service depends on each of them.' },
  { id: 'server-a', short: 'Server A', label: 'app-srv-01', type: 'Server', relation: 'Hosts pay-api and reads from db-cluster-a. Part of Payments Portal’s footprint.' },
  { id: 'server-b', short: 'Server B', label: 'app-srv-02', type: 'Server', relation: 'The second pay-api host. A change here is assessed against the service it supports.' },
  { id: 'database', short: 'Database', label: 'db-cluster-a', type: 'Database', relation: 'The shared data store behind both servers: one change here affects both.' },
] as const;

/* ------------------------------------------------------------------ */
/* Expertise                                                           */
/* ------------------------------------------------------------------ */

export const expertise = [
  {
    id: 'conversation',
    title: 'Conversation design',
    summary: 'Turning a process into a dialogue people can finish.',
    detail:
      'I map the journey first, then write prompts and topic blocks that ask one thing at a time — with defined paths for misunderstanding and for handing over to a person.',
    items: ['Journey mapping', 'Prompts', 'Topic blocks', 'Entities', 'NLU', 'Fallback handling', 'Live-agent handoff'],
  },
  {
    id: 'development',
    title: 'ServiceNow development',
    summary: 'The platform work underneath the conversation.',
    detail: 'Custom applications, data models and the rules that govern them — access, form behaviour and server-side logic.',
    items: ['JavaScript', 'Custom applications', 'Workflows', 'Data models', 'ACLs', 'UI Policies', 'Business Rules', 'Orchestration'],
  },
  {
    id: 'integrations',
    title: 'Integrations',
    summary: 'Connecting conversations to the systems that hold the answer.',
    detail: 'Inbound and outbound APIs and IntegrationHub connections to HR, identity, ERP and CRM platforms.',
    items: ['REST', 'SOAP', 'Scripted REST APIs', 'IntegrationHub', 'Workday', 'Azure AD', 'SAP', 'Salesforce'],
  },
  {
    id: 'quality',
    title: 'Testing & delivery',
    summary: 'Testing what people actually say, not just the happy path.',
    detail: 'Conversation testing and failed-intent analysis alongside SIT/UAT, delivered in Agile teams.',
    items: ['Conversation testing', 'Failed-intent analysis', 'Edge cases', 'SIT/UAT', 'Agile', 'Jira', 'Azure Boards', 'Confluence'],
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
  { degree: 'Bachelor of Arts in Computer Applications, Communicative English, Office Management', school: 'Osmania University' },
];

export const certifications = [{ name: 'Certified System Administrator', issuer: 'ServiceNow' }];
