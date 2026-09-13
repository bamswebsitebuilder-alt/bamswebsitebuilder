/* BAM'S WEBSITE BUILDER — TEMPLATES PAGE FILTERS */

'use strict';

/* Split the AFTERHOURS clothing demo into a base option and a premium option. */
const afterhoursCard = document.querySelector('#afterhours-template');
if (afterhoursCard) {
  afterhoursCard.innerHTML = `
    <span class="template-badge">New Demo</span>
    <div class="template-preview industry-photo-preview">
      <img src="/afterhours/campaign.png" alt="AFTERHOURS streetwear campaign" loading="lazy" class="industry-project-photo">
    </div>
    <div class="template-card-body">
      <p class="template-category">Clothing Brand / Streetwear</p>
      <h2>AFTERHOURS Starter</h2>
      <ul>
        <li>Mobile-friendly clothing brand layout</li>
        <li>Collection showcase</li>
        <li>Product detail previews</li>
        <li>Brand story section</li>
      </ul>
      <p class="template-price">
        <span>Base Template</span>
        <strong>$250</strong>
        <small>starting price</small>
      </p>
      <div class="template-actions">
        <a class="template-demo" href="/afterhours/" target="_blank" rel="noopener">Live Demo</a>
        <a class="template-select" data-package="starter" data-template="AFTERHOURS Starter" href="/contact?template=AFTERHOURS%20Starter&amp;package=starter">Use This Template</a>
      </div>
    </div>`;

  const premiumCard = afterhoursCard.cloneNode(true);
  premiumCard.id = 'afterhours-premium-template';
  premiumCard.innerHTML = `
    <span class="template-badge">Premium</span>
    <div class="template-preview industry-photo-preview">
      <img src="/afterhours/campaign.png" alt="AFTERHOURS premium streetwear ecommerce website" loading="lazy" class="industry-project-photo">
    </div>
    <div class="template-card-body">
      <p class="template-category">Clothing Brand / Premium Store</p>
      <h2>AFTERHOURS Premium</h2>
      <ul>
        <li>Everything in the base clothing template</li>
        <li>Up to 10 website pages</li>
        <li>Online store setup</li>
        <li>Advanced contact forms</li>
        <li>Search engine optimization</li>
        <li>Priority support</li>
        <li>Domain name connection</li>
        <li>Business email setup</li>
        <li>Google Business Profile setup</li>
        <li>Website maintenance setup</li>
        <li>Website content updates</li>
        <li>Booking system integration</li>
        <li>Expanded ecommerce features</li>
      </ul>
      <p class="template-price">
        <span>Premium + Additional Services</span>
        <strong>$850</strong>
        <small>starting price</small>
      </p>
      <div class="template-actions">
        <a class="template-demo" href="/afterhours/" target="_blank" rel="noopener">Live Demo</a>
        <a class="template-select" data-package="premium" data-template="AFTERHOURS Premium" href="/contact?template=AFTERHOURS%20Premium&amp;package=premium">Use This Template</a>
      </div>
    </div>`;
  afterhoursCard.insertAdjacentElement('afterend', premiumCard);
}

const filterButtons = document.querySelectorAll('.template-filter');
filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        filterButtons.forEach((item) => item.classList.remove('active'));
        button.classList.add('active');

        const selectedFilter = button.dataset.filter;

        document.querySelectorAll('.template-card').forEach((card) => {
            const matchesFilter =
                selectedFilter === 'all' ||
                card.dataset.category === selectedFilter;

            card.hidden = !matchesFilter;
        });
    });
});

/* Accessible feedback while the contact page opens. */
document.querySelectorAll('.template-select').forEach((link) => {
  link.addEventListener('click', () => {
    link.classList.add('is-loading');
    link.setAttribute('aria-busy', 'true');
  }, { once: true });
});
