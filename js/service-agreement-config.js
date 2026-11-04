// Public configuration only. Never put API keys, webhook secrets or signer-specific links here.
export const serviceAgreementConfig = Object.freeze({
  // Optional generic Jotform Sign template link. Prefer a recipient-specific link on each assignment.
  defaultSigningUrl: 'https://form.jotform.com/263058308288060',
  // Keep link mode for recipient-based signing unless the actual Jotform document supports embedding.
  displayMode: 'embed'
});
