const NAV_LINKS = [
  { label: 'Overview', href: 'index.html' },
  { label: 'Method', href: 'method.html' },
  { label: 'Data source', href: 'data-source.html' },
];

function renderHeader() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const links = NAV_LINKS.map(({ label, href }) => {
    const active = href === currentPage;
    return `<a href="${href}" class="${active ? 'font-bold text-white' : 'text-nav'}">${label}</a>`;
  }).join('');

  document.getElementById('site-header').innerHTML = `
    <header class="flex h-20 items-center justify-between border-b border-header-line bg-header px-20 text-[15px]">
      <div class="flex items-center gap-3">
        <img src="assets/hospital.png" alt="" class="h-12 w-12">
        <span class="text-base font-bold text-white">Road Crash Hospitalisations</span>
      </div>
      <nav class="flex gap-10">${links}</nav>
    </header>`;
}

renderHeader();
