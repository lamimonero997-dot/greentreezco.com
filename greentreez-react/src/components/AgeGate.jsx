import { useEffect, useState } from 'react';
import { useSiteSettings } from '../lib/settings.js';

const KEY = 'gtz-age-verified-v1';
const MAX_AGE_DAYS = 30;
const MIN_AGE = 21;

/**
 * Age verification for a 21+ retailer.
 *
 * A client-side gate cannot *prove* anything - anyone can clear storage - so this
 * is a documented, auditable affirmation rather than a security control. It asks
 * for a date of birth instead of a single "yes" button so the record shows what
 * the visitor actually attested to, and it re-asks after 30 days.
 */
function readVerification() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!stored?.at) return null;
    const ageDays = (Date.now() - stored.at) / 86_400_000;
    return ageDays < MAX_AGE_DAYS ? stored : null;
  } catch {
    return null;
  }
}

function yearsSince(dateString) {
  const dob = new Date(dateString);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) years -= 1;
  return years;
}

export default function AgeGate() {
  const settings = useSiteSettings();
  const [verified, setVerified] = useState(() => Boolean(readVerification()));
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');

  // The gate covers the page, so the page behind it must not scroll.
  useEffect(() => {
    if (verified) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [verified]);

  if (verified) return null;

  function submit(event) {
    event.preventDefault();
    const age = yearsSince(dob);
    if (age === null) {
      setError('Enter your date of birth.');
      return;
    }
    if (age < MIN_AGE) {
      setError(`You must be ${MIN_AGE} or older to enter this store.`);
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), age }));
    } catch {
      /* private mode: the gate simply reappears next visit */
    }
    setVerified(true);
  }

  return (
    <div className="gtz-agegate" role="dialog" aria-modal="true" aria-labelledby="gtz-agegate-title">
      <div className="gtz-agegate__card">
        <span className="gtz-agegate__eyebrow">{settings.storeName}</span>
        <h1 id="gtz-agegate-title">Verify your age</h1>
        <p>
          This store sells hemp-derived THC and CBD products. You must be {MIN_AGE} or older to enter. Valid photo ID is
          required in store and on delivery.
        </p>
        <form onSubmit={submit}>
          <label htmlFor="gtz-dob">Date of birth</label>
          <input
            id="gtz-dob"
            type="date"
            value={dob}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => {
              setDob(event.target.value);
              setError('');
            }}
            required
          />
          {error ? <p className="gtz-agegate__error">{error}</p> : null}
          <button type="submit">Enter store</button>
        </form>
        <a className="gtz-agegate__exit" href="https://www.google.com" rel="noreferrer">
          I am under {MIN_AGE} — leave
        </a>
        <p className="gtz-agegate__legal">
          By entering you confirm the information above is accurate. Products contain less than 0.3% Delta-9 THC derived
          from hemp and are not evaluated by the FDA.
        </p>
      </div>
    </div>
  );
}
