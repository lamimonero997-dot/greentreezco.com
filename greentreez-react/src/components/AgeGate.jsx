import { useEffect, useState } from 'react';
import { useSiteSettings } from '../lib/settings.js';

const KEY = 'gtz-age-verified-v1';
const MAX_AGE_DAYS = 30;
const MIN_AGE = 21;

/**
 * Age verification for a 21+ retailer.
 *
 * A client-side gate cannot *prove* anything - anyone can clear storage - so this
 * is a documented, auditable affirmation rather than a security control. The
 * visitor confirms once that they are 21 or older, and we re-ask after 30 days.
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

export default function AgeGate() {
  const settings = useSiteSettings();
  const [verified, setVerified] = useState(() => Boolean(readVerification()));

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

  function confirm() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), confirmedMinAge: MIN_AGE }));
    } catch {
      /* private mode: the gate simply reappears next visit */
    }
    setVerified(true);
  }

  return (
    <div className="gtz-agegate" role="dialog" aria-modal="true" aria-labelledby="gtz-agegate-title">
      <div className="gtz-agegate__card">
        <span className="gtz-agegate__eyebrow">{settings.storeName}</span>
        <h1 id="gtz-agegate-title">Are you {MIN_AGE} or older?</h1>
        <p>
          This store sells hemp-derived THC and CBD products. You must be {MIN_AGE} or older to enter. Valid photo ID is
          required in store and on delivery.
        </p>
        <div className="gtz-agegate__choices">
          <button type="button" onClick={confirm}>
            Yes, I am {MIN_AGE} or older
          </button>
          <a className="gtz-agegate__exit" href="https://www.google.com" rel="noreferrer">
            No, I am under {MIN_AGE}
          </a>
        </div>
        <p className="gtz-agegate__legal">
          By entering you confirm the information above is accurate. Products contain less than 0.3% Delta-9 THC derived
          from hemp and are not evaluated by the FDA.
        </p>
      </div>
    </div>
  );
}
