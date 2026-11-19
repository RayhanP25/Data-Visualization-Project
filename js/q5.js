const FELL = d3.interpolateRgbBasis(['#F6E7DC', '#E08A5A', '#B34D1E']);
const ROSE = d3.interpolateRgbBasis(['#E4ECF4', '#7F9CB8', '#3E5C78']);
const MUTED = '#6B6F76';
const INK = '#16181D';
const GRID = '#E6E6E1';

const chartEl = document.getElementById('chart');
const chartCard = chartEl.parentElement;
const tooltip = document.getElementById('tooltip');
const modeButtons = document.querySelectorAll('[data-mode]');
const roadToggle = document.getElementById('road-toggle');
const roadMenu = document.getElementById('road-menu');
const roadCount = document.getElementById('road-count');
const roadCheckboxes = document.querySelectorAll('[data-road]');
const aboutTexts = document.querySelectorAll('[data-about]');
const selectedRoads = new Set();
let rows = [];
let mode = 'pct';

function valueFor(d) {
  return mode === 'pct' ? d.percentage_vs_trend : d.actual - d.predicted;
}

function visibleRows() {
  return rows
    .filter((d) => selectedRoads.has(d.road_user))
    .sort((a, b) => valueFor(a) - valueFor(b));
}

function signed(v) {
  return v < 0 ? '−' : '+';
}

function formatValue(v) {
  return mode === 'pct'
    ? `${signed(v)}${Math.abs(v).toFixed(1)}%`
    : `${signed(v)}${d3.format(',')(Math.round(Math.abs(v)))}`;
}

function showTooltip(event, d) {
  const fmt = d3.format(',');
  tooltip.innerHTML = `<p class="font-bold">${d.road_user}</p>`
    + `<p>${fmt(d.actual)} hospitalisations, ${fmt(Math.round(d.predicted))} expected</p>`
    + `<p class="text-nav">${signed(d.percentage_vs_trend)}${Math.abs(d.percentage_vs_trend).toFixed(1)}% vs expected</p>`;
  tooltip.classList.remove('hidden');
  moveTooltip(event);
}

function moveTooltip(event) {
  const box = chartCard.getBoundingClientRect();
  tooltip.style.left = `${event.clientX - box.left + 16}px`;
  tooltip.style.top = `${event.clientY - box.top + 16}px`;
}

function hideTooltip() {
  tooltip.classList.add('hidden');
}

function styleAxis(g) {
  g.selectAll('text').attr('fill', MUTED).attr('font-size', 14).attr('font-family', 'Inter');
  g.selectAll('.domain, line').attr('stroke', GRID);
}

function drawBars(svg, width, height) {
  const margin = { top: 44, right: 72, bottom: 64, left: 170 };
  const visible = visibleRows();
  const maxAbs = d3.max(visible, (d) => Math.abs(valueFor(d))) || 1;
  const maxFell = Math.max(d3.max(visible, (d) => -valueFor(d)) || 0, 1e-9);
  const maxRose = Math.max(d3.max(visible, (d) => valueFor(d)) || 0, 1e-9);
  const fellScale = d3.scaleSequential(FELL).domain([0, maxFell]);
  const roseScale = d3.scaleSequential(ROSE).domain([0, maxRose]);
  const colorFor = (v) => (v < 0 ? fellScale(-v) : roseScale(v));

  const x = d3.scaleLinear().domain([-maxAbs * 1.25, maxAbs * 1.25]).range([margin.left, width - margin.right]);
  const y = d3.scaleBand().domain(visible.map((d) => d.road_user)).range([margin.top, height - margin.bottom]).padding(0.3);
  const tickFormat = (d) => (mode === 'pct' ? `${d > 0 ? '+' : ''}${d}%` : `${d > 0 ? '+' : ''}${d3.format(',')(d)}`);
  const step = mode === 'pct' ? 5 : 500;
  const limit = Math.floor((maxAbs * 1.25) / step) * step;
  const tickValues = d3.range(-limit, limit + 1, step);

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickValues(tickValues).tickSize(-(height - margin.top - margin.bottom)).tickFormat(''))
    .call((g) => g.select('.domain').remove())
    .call((g) => g.selectAll('line').attr('stroke', GRID));

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickValues(tickValues).tickSize(0).tickFormat(tickFormat))
    .call(styleAxis)
    .call((g) => g.select('.domain').remove());

  svg.append('line')
    .attr('x1', x(0)).attr('x2', x(0))
    .attr('y1', margin.top - 8).attr('y2', height - margin.bottom)
    .attr('stroke', '#8A8F98');

  svg.append('text')
    .attr('x', (margin.left + width - margin.right) / 2)
    .attr('y', height - 16)
    .attr('text-anchor', 'middle')
    .attr('fill', MUTED)
    .attr('font-size', 13)
    .text(mode === 'pct' ? '% difference from expected (2011–2019 trend)' : 'Hospitalisations above (+) or below (−) expected');

  const legend = svg.append('g').attr('transform', `translate(${margin.left},8)`);
  [['Fell below expected', FELL(1)], ['Rose above expected', ROSE(1)]].forEach(([label, colour], i) => {
    const offset = i * 200;
    legend.append('rect').attr('x', offset).attr('y', 0).attr('width', 14).attr('height', 14).attr('rx', 3).attr('fill', colour);
    legend.append('text').attr('x', offset + 22).attr('y', 7).attr('dy', '0.32em').attr('fill', MUTED).attr('font-size', 13).text(label);
  });

  const rowG = svg.append('g')
    .selectAll('g')
    .data(visible)
    .join('g')
    .attr('transform', (d) => `translate(0,${y(d.road_user)})`)
    .on('mouseenter', showTooltip)
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip);

  rowG.append('text')
    .attr('x', margin.left - 14)
    .attr('y', y.bandwidth() / 2)
    .attr('dy', '0.32em')
    .attr('text-anchor', 'end')
    .attr('fill', INK)
    .attr('font-size', 15)
    .text((d) => d.road_user);

  rowG.append('rect')
    .attr('x', (d) => x(Math.min(0, valueFor(d))))
    .attr('width', (d) => Math.abs(x(valueFor(d)) - x(0)))
    .attr('y', 0)
    .attr('height', y.bandwidth())
    .attr('rx', 6)
    .attr('fill', (d) => colorFor(valueFor(d)));

  rowG.append('text')
    .attr('x', (d) => (valueFor(d) < 0 ? x(valueFor(d)) - 8 : x(valueFor(d)) + 8))
    .attr('y', y.bandwidth() / 2)
    .attr('dy', '0.32em')
    .attr('text-anchor', (d) => (valueFor(d) < 0 ? 'end' : 'start'))
    .attr('fill', INK)
    .attr('font-size', 13)
    .attr('font-weight', 700)
    .text((d) => formatValue(valueFor(d)));
}

function render() {
  if (!rows.length) return;
  const { width, height } = chartEl.getBoundingClientRect();
  const svg = d3.select(chartEl)
    .selectAll('svg')
    .data([null])
    .join('svg')
    .attr('width', width)
    .attr('height', height);
  svg.selectAll('*').remove();
  hideTooltip();
  drawBars(svg, width, height);
  updateAbout();
}

function updateAbout() {
  aboutTexts.forEach((p) => { p.hidden = p.dataset.about !== mode; });
}

modeButtons.forEach((btn) => btn.addEventListener('click', () => {
  mode = btn.dataset.mode;
  modeButtons.forEach((b) => {
    const active = b === btn;
    b.classList.toggle('bg-accent', active);
    b.classList.toggle('text-white', active);
    b.classList.toggle('text-muted', !active);
  });
  render();
}));

roadToggle.addEventListener('click', () => roadMenu.classList.toggle('hidden'));

document.addEventListener('click', (event) => {
  if (!roadMenu.contains(event.target) && !roadToggle.contains(event.target)) roadMenu.classList.add('hidden');
});

roadCheckboxes.forEach((box) => box.addEventListener('change', () => {
  if (box.checked) selectedRoads.add(box.dataset.road);
  else selectedRoads.delete(box.dataset.road);
  roadCount.textContent = `${selectedRoads.size} of ${rows.length}`;
  render();
}));

window.addEventListener('resize', render);

d3.csv('data/processed/question5.csv', d3.autoType).then((data) => {
  rows = data;
  rows.forEach((d) => selectedRoads.add(d.road_user));
  roadCount.textContent = `${selectedRoads.size} of ${rows.length}`;
  render();
});
