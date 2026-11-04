// Public configuration only. Never put API keys, webhook secrets or signer-specific links here.
export const serviceAgreementConfig = Object.freeze({
  // Optional generic Jotform Sign template link. Prefer a recipient-specific link on each assignment.
  defaultSigningUrl: 'https://form.jotform.com/263058308288060',
  // Controls the optional administrative preview. Clients always sign inside the portal.
  displayMode: 'embed'
});
