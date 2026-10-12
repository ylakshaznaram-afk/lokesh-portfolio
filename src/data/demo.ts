/**
 * Interactive concept demo — deterministic, local, scripted.
 * All records below are synthetic. Nothing here talks to any real system.
 */

export type DemoState = 'greeting' | 'intent' | 'clarify' | 'resolve' | 'fallback' | 'handoff';

export const stateMeta: Record<DemoState, { label: string; hint: string }> = {
  greeting: { label: 'Greeting', hint: 'Set expectations and offer clear starting points.' },
  intent: { label: 'Intent', hint: 'Map what the person said to a topic.' },
  clarify: { label: 'Clarify', hint: 'Ask one useful question — only what the flow needs.' },
  resolve: { label: 'Next step', hint: 'End with a concrete, honest next action.' },
  fallback: { label: 'Fallback', hint: 'Recover from input the bot can’t place, without blame.' },
  handoff: { label: 'Handoff', hint: 'Pass context to a person when self-service isn’t enough.' },
};

export interface DemoCard {
  kind: 'ticket' | 'steps' | 'handoff';
  title: string;
  rows?: [string, string][];
  steps?: string[];
  note?: string;
}

export interface DemoNode {
  state: DemoState;
  intent?: string;
  bot: string[];
  card?: DemoCard;
  options: { label: string; next: string }[];
}

export interface Scenario {
  id: string;
  label: string;
  start: string;
  nodes: Record<string, DemoNode>;
}

const handoff: DemoNode = {
  state: 'handoff',
  bot: ['I’ll pass this to the support team with a summary of what we’ve covered, so you don’t have to repeat yourself.'],
  card: {
    kind: 'handoff',
    title: 'Example handoff state',
    rows: [
      ['Queue', 'Service Desk (sample)'],
      ['Context', 'Conversation recap attached'],
      ['Status', 'Simulated — not sent'],
    ],
    note: 'Simulation only — no agent has been contacted.',
  },
  options: [],
};

export const scenarios: Scenario[] = [
  {
    id: 'it',
    label: 'Request IT support',
    start: 'start',
    nodes: {
      start: {
        state: 'greeting',
        bot: ['Hi — I can help with IT issues. What’s going on?'],
        options: [
          { label: 'I can’t sign in', next: 'signin' },
          { label: 'I need access to an app', next: 'access' },
          { label: 'my thing is broken??', next: 'unclear' },
        ],
      },
      signin: {
        state: 'intent',
        intent: 'password_reset',
        bot: ['Sounds like a sign-in problem. Is it your main work account, or one specific application?'],
        options: [
          { label: 'My main work account', next: 'signinMain' },
          { label: 'One specific app', next: 'signinApp' },
        ],
      },
      signinMain: {
        state: 'resolve',
        bot: ['Thanks. The quickest route is self-service reset — here’s what would happen next.'],
        card: {
          kind: 'steps',
          title: 'Suggested next step',
          steps: ['Open the self-service reset page', 'Verify your identity', 'Choose a new password'],
          note: 'Simulated guidance — no reset was started.',
        },
        options: [
          { label: 'That didn’t work', next: 'handoff' },
          { label: 'Start over', next: '__reset' },
        ],
      },
      signinApp: {
        state: 'clarify',
        bot: ['Which kind of app is it? That tells me who owns the access.'],
        options: [
          { label: 'Collaboration tool', next: 'access' },
          { label: 'I’m not sure', next: 'handoff' },
        ],
      },
      access: {
        state: 'intent',
        intent: 'access_request',
        bot: ['I can help you request access. Do you need it for yourself or for someone on your team?'],
        options: [
          { label: 'For me', next: 'accessMe' },
          { label: 'For a teammate', next: 'accessTeam' },
        ],
      },
      accessMe: {
        state: 'resolve',
        bot: ['Got it. Access requests usually need a manager’s approval. Here’s the path.'],
        card: {
          kind: 'steps',
          title: 'Suggested next step',
          steps: ['Pick the application from the catalog', 'Add a short business reason', 'Your manager approves'],
          note: 'Simulated guidance — no request was created.',
        },
        options: [{ label: 'Start over', next: '__reset' }],
      },
      accessTeam: {
        state: 'clarify',
        bot: ['Are you their manager? Requests on someone else’s behalf usually go through their manager.'],
        options: [
          { label: 'Yes, I’m their manager', next: 'accessMe' },
          { label: 'No', next: 'handoff' },
        ],
      },
      unclear: {
        state: 'fallback',
        bot: ['Sorry, I didn’t quite catch that. Which of these is closest?'],
        options: [
          { label: 'Sign-in problem', next: 'signin' },
          { label: 'Access to an app', next: 'access' },
          { label: 'Talk to a person', next: 'handoff' },
        ],
      },
      handoff,
    },
  },
  {
    id: 'ticket',
    label: 'Check a sample ticket',
    start: 'start',
    nodes: {
      start: {
        state: 'greeting',
        bot: ['I can look up a ticket. Which one? (These are sample tickets.)'],
        options: [
          { label: 'INC-DEMO-0042', next: 't42' },
          { label: 'INC-DEMO-0107', next: 't107' },
          { label: 'I don’t know the number', next: 'unknown' },
        ],
      },
      t42: {
        state: 'resolve',
        intent: 'ticket_status',
        bot: ['Here’s the latest on that sample ticket.'],
        card: {
          kind: 'ticket',
          title: 'INC-DEMO-0042',
          rows: [
            ['Summary', 'Printer offline on floor 3'],
            ['State', 'In progress'],
            ['Group', 'Desk Support (sample)'],
            ['Updated', '2 hours ago'],
          ],
          note: 'Synthetic record.',
        },
        options: [
          { label: 'Add a comment', next: 'comment' },
          { label: 'It’s urgent', next: 'urgent' },
          { label: 'Start over', next: '__reset' },
        ],
      },
      t107: {
        state: 'resolve',
        intent: 'ticket_status',
        bot: ['That sample ticket is resolved. Is the issue actually fixed for you?'],
        card: {
          kind: 'ticket',
          title: 'INC-DEMO-0107',
          rows: [
            ['Summary', 'VPN disconnects'],
            ['State', 'Resolved'],
            ['Group', 'Network (sample)'],
            ['Updated', 'Yesterday'],
          ],
          note: 'Synthetic record.',
        },
        options: [
          { label: 'Yes, all good', next: 'done' },
          { label: 'No, it’s back', next: 'reopen' },
        ],
      },
      unknown: {
        state: 'clarify',
        intent: 'ticket_status',
        bot: ['No problem. Roughly what was it about? I’ll narrow it down.'],
        options: [
          { label: 'A printer', next: 't42' },
          { label: 'Network / VPN', next: 't107' },
          { label: 'Something else', next: 'notfound' },
        ],
      },
      notfound: {
        state: 'fallback',
        bot: ['I couldn’t find a matching sample ticket. I can connect you with someone who can search more widely.'],
        options: [
          { label: 'Talk to a person', next: 'handoff' },
          { label: 'Start over', next: '__reset' },
        ],
      },
      comment: {
        state: 'clarify',
        bot: ['In the real flow I’d ask for your comment here. For this demo, pick a sample one.'],
        options: [{ label: '“Still offline this morning”', next: 'commented' }],
      },
      commented: {
        state: 'resolve',
        bot: ['Your comment would be added to the ticket and the assigned group notified.'],
        card: { kind: 'steps', title: 'What would happen', steps: ['Comment added to INC-DEMO-0042', 'Assignment group notified'], note: 'Simulation — nothing was updated.' },
        options: [{ label: 'Start over', next: '__reset' }],
      },
      urgent: {
        state: 'clarify',
        bot: ['Understood. Is anyone else affected, or just you?'],
        options: [
          { label: 'Several people', next: 'handoff' },
          { label: 'Just me', next: 'comment' },
        ],
      },
      reopen: {
        state: 'clarify',
        bot: ['Sorry to hear that. Should I reopen it, or would you rather speak to someone?'],
        options: [
          { label: 'Reopen it', next: 'reopened' },
          { label: 'Talk to a person', next: 'handoff' },
        ],
      },
      reopened: {
        state: 'resolve',
        bot: ['In production, the ticket would move back to In progress with your note attached.'],
        card: { kind: 'steps', title: 'What would happen', steps: ['INC-DEMO-0107 → In progress', 'Network group notified'], note: 'Simulation — nothing was updated.' },
        options: [{ label: 'Start over', next: '__reset' }],
      },
      done: {
        state: 'resolve',
        bot: ['Great — nothing else to do. Anything else?'],
        options: [{ label: 'Start over', next: '__reset' }],
      },
      handoff,
    },
  },
  {
    id: 'hr',
    label: 'Find HR guidance',
    start: 'start',
    nodes: {
      start: {
        state: 'greeting',
        bot: ['Hi — I can point you to HR guidance. What’s it about?'],
        options: [
          { label: 'Taking leave', next: 'leave' },
          { label: 'A payroll question', next: 'payroll' },
          { label: 'can u help with the thing from HR', next: 'unclear' },
        ],
      },
      leave: {
        state: 'intent',
        intent: 'leave_request',
        bot: ['Is this planned leave, or something unplanned like sick leave?'],
        options: [
          { label: 'Planned', next: 'leavePlanned' },
          { label: 'Unplanned', next: 'leaveUnplanned' },
        ],
      },
      leavePlanned: {
        state: 'resolve',
        bot: ['For planned leave, here’s the usual path.'],
        card: { kind: 'steps', title: 'Suggested next step', steps: ['Read the leave policy article', 'Submit a leave request', 'Track status in Employee Center'], note: 'Sample guidance — not a real HR policy.' },
        options: [
          { label: 'I have a question about the policy', next: 'handoff' },
          { label: 'Start over', next: '__reset' },
        ],
      },
      leaveUnplanned: {
        state: 'resolve',
        bot: ['Hope you’re okay. For unplanned leave, the first step is letting your manager know.'],
        card: { kind: 'steps', title: 'Suggested next step', steps: ['Notify your manager', 'Record the absence', 'HR follows up if documents are needed'], note: 'Sample guidance — not a real HR policy.' },
        options: [{ label: 'Start over', next: '__reset' }],
      },
      payroll: {
        state: 'intent',
        intent: 'payroll_query',
        bot: ['Payroll questions can involve personal details, so I won’t ask for any here. Which is closest?'],
        options: [
          { label: 'Understanding my payslip', next: 'payslip' },
          { label: 'Something looks wrong', next: 'handoff' },
        ],
      },
      payslip: {
        state: 'resolve',
        bot: ['Here’s where a payslip explainer would live.'],
        card: { kind: 'steps', title: 'Suggested next step', steps: ['Open “Reading your payslip” (sample article)', 'Still unclear? Raise an HR case'], note: 'Sample guidance.' },
        options: [{ label: 'Start over', next: '__reset' }],
      },
      unclear: {
        state: 'fallback',
        bot: ['I want to get this right — which of these is it closest to?'],
        options: [
          { label: 'Leave', next: 'leave' },
          { label: 'Payroll', next: 'payroll' },
          { label: 'Document verification', next: 'docs' },
          { label: 'Talk to a person', next: 'handoff' },
        ],
      },
      docs: {
        state: 'clarify',
        intent: 'document_verification',
        bot: ['Is this a document you need from HR, or one HR needs from you?'],
        options: [
          { label: 'I need a letter from HR', next: 'docsLetter' },
          { label: 'HR asked me for one', next: 'handoff' },
        ],
      },
      docsLetter: {
        state: 'resolve',
        bot: ['That would be routed to the document team as a request.'],
        card: { kind: 'steps', title: 'Suggested next step', steps: ['Choose the letter type', 'Request is routed to HR', 'Track it in Employee Center'], note: 'Simulation — no request was created.' },
        options: [{ label: 'Start over', next: '__reset' }],
      },
      handoff: { ...handoff, bot: ['I’ll connect you with an HR specialist and share what we’ve covered.'] },
    },
  },
];
