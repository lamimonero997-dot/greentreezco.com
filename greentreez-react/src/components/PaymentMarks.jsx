/**
 * Payment-brand marks drawn inline so the checkout never waits on a CDN and the
 * logos stay crisp at any size. Each mark is a self-contained SVG sized to sit
 * on the 40x26 tile used by the checkout payment picker.
 */

const TILE = { width: 40, height: 26 };
const SANS = 'Helvetica Neue, Helvetica, Arial, sans-serif';

function Tile({ children, label, fill = '#fff', stroke = '#e2e0d7' }) {
  return (
    <svg {...TILE} viewBox="0 0 40 26" role="img" aria-label={label}>
      <rect x="0.5" y="0.5" width="39" height="25" rx="4" fill={fill} stroke={stroke} />
      {children}
    </svg>
  );
}

export function VisaMark() {
  return (
    <Tile label="Visa">
      <text
        x="20"
        y="17.5"
        textAnchor="middle"
        fontFamily={SANS}
        fontSize="11"
        fontStyle="italic"
        fontWeight="700"
        letterSpacing="0.4"
        fill="#1A1F71"
      >
        VISA
      </text>
    </Tile>
  );
}

export function MastercardMark() {
  return (
    <Tile label="Mastercard">
      <circle cx="16.5" cy="13" r="7" fill="#EB001B" />
      <circle cx="23.5" cy="13" r="7" fill="#F79E1B" />
      <path
        d="M20 7.9a7 7 0 000 10.2 7 7 0 000-10.2z"
        fill="#FF5F00"
      />
    </Tile>
  );
}

export function AmexMark() {
  return (
    <Tile label="American Express" fill="#2E77BC" stroke="#2E77BC">
      <text x="20" y="16.5" textAnchor="middle" fontFamily={SANS} fontSize="8" fontWeight="800" fill="#fff">
        AMEX
      </text>
    </Tile>
  );
}

export function CashAppMark() {
  return (
    <Tile label="Cash App" fill="#00D632" stroke="#00D632">
      <text x="20" y="18.5" textAnchor="middle" fontFamily={SANS} fontSize="15" fontWeight="800" fill="#fff">
        $
      </text>
    </Tile>
  );
}

export function ZelleMark() {
  return (
    <Tile label="Zelle" fill="#6D1ED4" stroke="#6D1ED4">
      {/* The Zelle mark is a Z crossed by a vertical stroke. */}
      <rect x="19.3" y="4" width="1.4" height="18" rx="0.7" fill="#fff" />
      <path d="M14.5 8.6h11l-7.6 8.8h7.8v2.2H13.5l7.6-8.8h-6.6z" fill="#fff" />
    </Tile>
  );
}

export function VenmoMark() {
  return (
    <Tile label="Venmo" fill="#008CFF" stroke="#008CFF">
      <text x="20" y="18" textAnchor="middle" fontFamily={SANS} fontSize="13" fontWeight="800" fill="#fff">
        V
      </text>
    </Tile>
  );
}

export function ApplePayMark() {
  return (
    <Tile label="Apple Pay">
      <g transform="translate(6.5 5) scale(0.62)" fill="#111">
        <path d="M14.9 6.1c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.55 1.31-.56.65-1.05 1.68-.92 2.67.97.08 1.96-.49 2.57-1.22z" />
        <path d="M17.05 12.53c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.18-1.72-1.35-.14-2.64.8-3.33.8-.69 0-1.75-.78-2.87-.76-1.48.02-2.84.86-3.6 2.18-1.54 2.67-.39 6.62 1.1 8.79.73 1.06 1.6 2.25 2.74 2.21 1.1-.04 1.51-.71 2.84-.71 1.33 0 1.7.71 2.86.69 1.18-.02 1.93-1.08 2.65-2.14.84-1.23 1.18-2.42 1.2-2.48-.03-.01-2.29-.88-2.31-3.49z" />
      </g>
      <text x="27.5" y="17" textAnchor="middle" fontFamily={SANS} fontSize="9" fontWeight="600" fill="#111">
        Pay
      </text>
    </Tile>
  );
}

export function GooglePayMark() {
  return (
    <Tile label="Google Pay">
      <g transform="translate(4.5 6) scale(0.58)">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
          fill="#EA4335"
        />
      </g>
      <text x="27.5" y="17" textAnchor="middle" fontFamily={SANS} fontSize="9" fontWeight="600" fill="#3C4043">
        Pay
      </text>
    </Tile>
  );
}

export function BitcoinMark() {
  return (
    <Tile label="Bitcoin" fill="#F7931A" stroke="#F7931A">
      {/* A B with the two vertical strokes that make the bitcoin symbol. */}
      <rect x="17.4" y="4.6" width="1.5" height="16.8" rx="0.7" fill="#fff" />
      <rect x="21" y="4.6" width="1.5" height="16.8" rx="0.7" fill="#fff" />
      <text x="20.6" y="18" textAnchor="middle" fontFamily={SANS} fontSize="13" fontWeight="800" fill="#fff">
        B
      </text>
    </Tile>
  );
}

export function TetherMark() {
  return (
    <Tile label="Tether USDT" fill="#26A17B" stroke="#26A17B">
      <rect x="10" y="6.4" width="20" height="2.6" rx="0.8" fill="#fff" />
      <rect x="18.6" y="6.4" width="2.8" height="14" rx="0.9" fill="#fff" />
      <ellipse cx="20" cy="11.4" rx="7.6" ry="2.5" fill="#26A17B" stroke="#fff" strokeWidth="1.5" />
    </Tile>
  );
}

export function CashMark() {
  return (
    <Tile label="Cash">
      <rect x="5.5" y="7.5" width="29" height="11" rx="2" fill="#e8f0e2" stroke="#5f8a6d" strokeWidth="1.1" />
      <circle cx="20" cy="13" r="3.1" fill="none" stroke="#5f8a6d" strokeWidth="1.1" />
      <path d="M9.5 13h2M28.5 13h2" stroke="#5f8a6d" strokeWidth="1.1" strokeLinecap="round" />
    </Tile>
  );
}

/** The marks shown for each payment method id on the checkout page. */
export const PAYMENT_MARKS = {
  card: [VisaMark, MastercardMark, AmexMark],
  cashapp: [CashAppMark],
  zelle: [ZelleMark],
  venmo: [VenmoMark],
  wallet: [ApplePayMark, GooglePayMark],
  crypto: [BitcoinMark, TetherMark],
  cash: [CashMark],
};

export default function PaymentMarkRow({ methodId }) {
  const marks = PAYMENT_MARKS[methodId] || [];
  if (!marks.length) return null;
  return (
    <span className="gtz-option__marks" aria-hidden="true">
      {marks.map((Mark, index) => (
        <Mark key={index} />
      ))}
    </span>
  );
}
