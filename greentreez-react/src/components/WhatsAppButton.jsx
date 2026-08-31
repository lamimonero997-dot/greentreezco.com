import { useSiteContact, whatsappUrl } from '../lib/site.js';

export default function WhatsAppButton() {
  const contact = useSiteContact();
  if (!contact.showWhatsappButton) return null;

  return (
    <a
      className="gtz-whatsapp-fab"
      href={whatsappUrl(contact.whatsappGreeting)}
      target="_blank"
      rel="noreferrer"
      aria-label={`Chat with us on WhatsApp at ${contact.whatsappDisplay}`}
    >
      <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2A9.9 9.9 0 0 0 2.13 11.9c0 1.75.46 3.46 1.33 4.97L2 22l5.28-1.38a9.87 9.87 0 0 0 4.76 1.21h.01a9.9 9.9 0 0 0 9.9-9.9A9.9 9.9 0 0 0 12.04 2Zm0 18.06h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.13.82.84-3.05-.2-.31a8.19 8.19 0 0 1-1.26-4.38 8.24 8.24 0 1 1 8.24 8.25Zm4.52-6.17c-.25-.13-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.63.8-.78.96-.14.17-.29.19-.53.06-.25-.12-1.05-.38-1.99-1.23a7.4 7.4 0 0 1-1.38-1.71c-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.14.17-.25.25-.41.09-.17.05-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.47a.9.9 0 0 0-.66.31c-.22.25-.86.85-.86 2.06s.88 2.39 1 2.55c.13.17 1.74 2.65 4.2 3.71.59.26 1.05.41 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29Z" />
      </svg>
      <span>Chat with us</span>
    </a>
  );
}
