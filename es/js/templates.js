/* BAM'S WEBSITE BUILDER — TEMPLATES PAGE FILTERS */

'use strict';

const filterButtons = document.querySelectorAll('.template-filter');
const templateCards = document.querySelectorAll('.template-card');

filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        filterButtons.forEach((item) => item.classList.remove('active'));
        button.classList.add('active');

        const selectedFilter = button.dataset.filter;

        templateCards.forEach((card) => {
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
