export const SERVICE_VERSION = 'bam-client-service-2026-11-02-v1';
export const MAX_PDF_BYTES = 700 * 1024;
export const STATUS_LABELS = {
  assigned: 'Assigned — awaiting signatures',
  client_signed: 'Client signed — awaiting BAM signature (staff confirmed)',
  completed: 'Both parties signed (staff confirmed)',
  cancelled: 'Cancelled'
};

export function signingUrl(value) {
  if (!value?.trim()) return '';
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !(url.hostname === 'jotform.com' || url.hostname.endsWith('.jotform.com')) || url.href.length > 2000) {
    throw new Error('Use an HTTPS signing link supplied by Jotform.');
  }
  return url.href;
}

export function canTransition(from, to) {
  return (from === 'assigned' && ['client_signed','completed','cancelled'].includes(to)) ||
    (from === 'client_signed' && ['completed','cancelled'].includes(to));
}

export async function pdfBytes(file) {
  if (!file || file.size < 5 || file.size > MAX_PDF_BYTES) throw new Error('Choose a signed PDF of at most 700 KiB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0,5)) !== '%PDF-') throw new Error('The selected file is not a PDF.');
  return bytes;
}
