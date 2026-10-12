import { useEffect, useRef, useState } from 'react';
import { profile } from '../data/content';
import { EngineStatic } from '../engine/EngineStatic';
import { useReducedMotion } from '../hooks/useMotion';
import { Icon } from './Icon';

export function Contact() {
  const reduced = useReducedMotion();
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(profile.email);
      ok = true;
    } catch {
      // Fallback for browsers/contexts without the async clipboard API.
      const ta = document.createElement('textarea');
      ta.value = profile.email;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      ta.remove();
    }
    setCopied(ok ? 'ok' : 'fail');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied('idle'), 2600);
  };

  return (
    <section className="section contact" id="contact" aria-labelledby="contact-title">
      <div className="container">
        <div className="contact__panel card">
          <p className="eyebrow">Contact</p>
          <h2 id="contact-title" className="contact__title">
            Let’s make enterprise experiences feel simpler.
          </h2>
          <p className="contact__lead">For roles, projects or a conversation about Virtual Agent and ServiceNow work, email is the best way to reach me.</p>
          <div className="contact__actions">
            <a className="btn btn--primary contact__email" href={`mailto:${profile.email}`}>
              <Icon name="mail" /> {profile.email}
            </a>
            <button type="button" className="btn btn--ghost" onClick={copy}>
              <Icon name={copied === 'ok' ? 'check' : 'copy'} /> {copied === 'ok' ? 'Copied' : 'Copy email'}
            </button>
            <a className="btn btn--ghost" href={profile.linkedin} target="_blank" rel="noopener noreferrer">
              LinkedIn <Icon name="arrowUpRight" />
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </div>
          <p className="contact__status" role="status" aria-live="polite">
            {copied === 'ok' && 'Email address copied to clipboard.'}
            {copied === 'fail' && `Couldn’t copy automatically — the address is ${profile.email}.`}
          </p>
          <div className="contact__art" aria-hidden="true">
            <EngineStatic selected={null} animate={!reduced} />
          </div>
        </div>
      </div>
    </section>
  );
}
