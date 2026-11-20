
const NAV_LINKS = [
  { label: 'Overview', page: 'home', href: 'index.html' },
  { label: 'Method', page: 'method', href: 'method.html' },
  { label: 'Data source', page: 'data-source', href: 'data-source.html' },
];

const headerMount = document.getElementById('site-header');
const activePage = headerMount.dataset.page;

const links = NAV_LINKS.map(({ label, page, href }) =>
  `<a href="${href}" class="${page === activePage ? 'font-bold text-white' : 'text-nav'}">${label}</a>`
).join('');

headerMount.innerHTML = `
  <header class="flex h-20 shrink-0 items-center justify-between border-b border-header-line bg-header px-20 text-[0.9375rem]">
    <a href="index.html" class="flex items-center gap-3">
      <img src="assets/hospital.png" alt="" class="h-12 w-12">
      <span class="text-base font-bold text-white">Road Crash Hospitalisations</span>
    </a>
    <nav class="flex gap-10">${links}</nav>
  </header>`;
