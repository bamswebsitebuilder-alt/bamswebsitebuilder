'use strict';
const form = document.querySelector('#booking-preview');
const service = document.querySelector('#service');
const button = document.querySelector('#preview-button');
const result = document.querySelector('#booking-result');
const durations = {cut: '60 minutes', color: '2 hours', blowout: '45 minutes'};
if (form && service && button && result) {
  const clear = () => { result.textContent = ''; };
  const preview = () => {
    if (!Object.hasOwn(durations, service.value)) { service.reportValidity(); return; }
    result.textContent = service.selectedOptions[0].textContent + ' · ' + durations[service.value] + '. Example time: 10:00 a.m. This is a demo. No appointment was booked.';
  };
  button.hidden = false;
  button.addEventListener('click', preview);
  form.addEventListener('submit', event => { event.preventDefault(); preview(); });
  service.addEventListener('change', clear);
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    service.value = link.dataset.service;
    clear();
  }));
}
