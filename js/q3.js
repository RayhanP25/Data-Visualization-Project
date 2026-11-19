const DECREASE = '#C8553D';
const INCREASE = '#161F73';
const GROUPS = ['Bus occupant', 'Car driver', 'Car passenger', 'Car unknown position', 'Heavy transport driver', 'Heavy transport passenger', 'Heavy transport unknown position', 'Motorcyclist', 'Other or unknown', 'Pedal cyclist', 'Pedestrian', 'Pick-up truck or van occupant'];
const YEARS = d3.range(2011, 2022);
const MUTED = '#6B6F76';
const INK = '#16181D';
const GRID = '#E6E6E1';
const fmt = d3.format(',');

const chartEl = document.getElementById('chart');
const chartCard = chartEl.parentElement;
const tooltip = document.getElementById('tooltip');
const viewButtons = document.querySelectorAll('[data-view]');
const aboutTexts = document.querySelectorAll('[data-about]');
const casesSetting = document.getElementById('cases-setting');
const casesToggle = document.getElementById('cases-toggle');
const roadToggle = document.getElementById('road-toggle');
const roadMenu = document.getElementById('road-menu');
const roadCount = document.getElementById('road-count');
const roadCheckboxes = document.querySelectorAll('[data-road]');
const selectedRoads = new Set();
let rows = [];
let view = 'index';

function visibleRows() {
  return rows.filter((d) => selectedRoads.has(d.name));
}

function colourFor(v) {
  return v < 0 ? DECREASE : INCREASE;
}

function signed(v, digits = 0) {
  return `${v < 0 ? '−' : '+'}${digits ? Math.abs(v).toFixed(digits) : fmt(Math.round(Math.abs(v)))}`;
}

function tickLabel(v) {
  const sign = v > 0 ? '+' : v < 0 ? '−' : '';
  return casesToggle.checked ? `${sign}${fmt(Math.abs(v))}` : `${sign}${Math.abs(v)}%`;
}

function showTooltip(event, d) {
  tooltip.innerHTML = `<p class="font-bold">${d.name}</p>`
    + `<p>${fmt(d.y2011)} in 2011, ${fmt(d.y2021)} in 2021</p>`
    + `<p class="text-nav">${signed(d.abs)} cases (${signed(d.pct, 1)}%)</p>`;
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

function spread(items, gap) {
  items.sort((a, b) => a.y - b.y);
  for (let i = 1; i < items.length; i++) {
    if (items[i].y - items[i - 1].y < gap) items[i].y = items[i - 1].y + gap;
  }
  return items;
}

function barValue(d) {
  return casesToggle.checked ? d.abs : d.pct;
}

function drawBars(svg, width, height) {
  const margin = { top: 44, right: 40, bottom: 64, left: 170 };
  const visible = visibleRows().sort((a, b) => barValue(a) - barValue(b));
  const maxAbs = d3.max(visible, (d) => Math.abs(barValue(d))) || 1;
  const reach = maxAbs * 1.35;
  const step = casesToggle.checked ? 1000 : 20;
  const limit = Math.floor(reach / step) * step;
  const ticks = d3.range(-limit, limit + 1, step);
  const x = d3.scaleLinear().domain([-reach, reach]).range([margin.left, width - margin.right]);
  const y = d3.scaleBand().domain(visible.map((d) => d.name)).range([margin.top, height - margin.bottom]).padding(0.3);

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickValues(ticks).tickSize(-(height - margin.top - margin.bottom)).tickFormat(''))
    .call((g) => g.select('.domain').remove())
    .call((g) => g.selectAll('line').attr('stroke', GRID));

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickValues(ticks).tickSize(0).tickFormat(tickLabel))
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
    .text(casesToggle.checked ? 'Change in hospitalisations, 2011 to 2021 (cases)' : 'Change in hospitalisations, 2011 to 2021 (% of 2011 count)');

  const legend = svg.append('g').attr('transform', `translate(${margin.left},8)`);
  [['Decrease', DECREASE], ['Increase', INCREASE]].forEach(([label, colour], i) => {
    const offset = i * 130;
    legend.append('rect').attr('x', offset).attr('y', 0).attr('width', 14).attr('height', 14).attr('rx', 3).attr('fill', colour);
    legend.append('text').attr('x', offset + 22).attr('y', 7).attr('dy', '0.32em').attr('fill', MUTED).attr('font-size', 13).text(label);
  });

  const rowG = svg.append('g')
    .selectAll('g')
    .data(visible)
    .join('g')
    .attr('transform', (d) => `translate(0,${y(d.name)})`)
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
    .text((d) => d.name);

  rowG.append('rect')
    .attr('x', (d) => x(Math.min(0, barValue(d))))
    .attr('width', (d) => Math.abs(x(barValue(d)) - x(0)))
    .attr('y', 0)
    .attr('height', y.bandwidth())
    .attr('rx', 6)
    .attr('fill', (d) => colourFor(barValue(d)));
}

function drawIndex(svg, width, height) {
  const margin = { top: 44, right: 250, bottom: 64, left: 70 };
  const lines = visibleRows().map((d) => ({
    d,
    points: YEARS.map((year, i) => ({ year, value: (d.series[i] / d.series[0]) * 100 })),
  }));
  const all = lines.flatMap((l) => l.points.map((p) => p.value));
  const lo = Math.min(d3.min(all) || 100, 100);
  const hi = Math.max(d3.max(all) || 100, 100);
  const pad = (hi - lo) * 0.08 || 5;
  const x = d3.scalePoint().domain(YEARS).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([lo - pad, hi + pad]).nice().range([height - margin.bottom, margin.top]);

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickSize(-(width - margin.left - margin.right)).tickFormat(''))
    .call((g) => g.select('.domain').remove())
    .call((g) => g.selectAll('line').attr('stroke', GRID));

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickSize(0).tickFormat(d3.format('d')))
    .call(styleAxis)
    .call((g) => g.select('.domain').remove());

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call(styleAxis)
    .call((g) => g.select('.domain').remove());

  svg.append('line')
    .attr('x1', margin.left).attr('x2', width - margin.right)
    .attr('y1', y(100)).attr('y2', y(100))
    .attr('stroke', INK)
    .attr('stroke-dasharray', '4 4');

  svg.append('text')
    .attr('x', margin.left)
    .attr('y', margin.top - 22)
    .attr('fill', MUTED)
    .attr('font-size', 13)
    .text('Index, 2011 = 100');

  const path = d3.line().x((p) => x(p.year)).y((p) => y(p.value));

  svg.append('g')
    .selectAll('path')
    .data(lines)
    .join('path')
    .attr('d', (l) => path(l.points))
    .attr('fill', 'none')
    .attr('stroke', (l) => colourFor(l.d.abs))
    .attr('stroke-width', 2.5)
    .attr('stroke-linecap', 'round')
    .on('mouseenter', (event, l) => showTooltip(event, l.d))
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip);

  const labels = spread(lines.map((l) => ({ l, y: y(l.points[l.points.length - 1].value) })), 18);
  svg.append('g')
    .selectAll('text')
    .data(labels)
    .join('text')
    .attr('x', x(YEARS[YEARS.length - 1]) + 12)
    .attr('y', (item) => item.y)
    .attr('dy', '0.32em')
    .attr('fill', INK)
    .attr('font-size', 14)
    .text((item) => item.l.d.name);
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
  if (view === 'bars') drawBars(svg, width, height);
  else drawIndex(svg, width, height);
  aboutTexts.forEach((p) => { p.hidden = p.dataset.about !== view; });
  casesSetting.classList.toggle('hidden', view !== 'bars');
}

viewButtons.forEach((btn) => btn.addEventListener('click', () => {
  view = btn.dataset.view;
  viewButtons.forEach((b) => {
    const active = b === btn;
    b.classList.toggle('bg-accent', active);
    b.classList.toggle('text-white', active);
    b.classList.toggle('text-muted', !active);
  });
  render();
}));

casesToggle.addEventListener('change', render);

roadToggle.addEventListener('click', () => roadMenu.classList.toggle('hidden'));

document.addEventListener('click', (event) => {
  if (!roadMenu.contains(event.target) && !roadToggle.contains(event.target)) roadMenu.classList.add('hidden');
});

roadCheckboxes.forEach((box) => box.addEventListener('change', () => {
  if (box.checked) selectedRoads.add(box.dataset.road);
  else selectedRoads.delete(box.dataset.road);
  roadCount.textContent = `${selectedRoads.size} of ${GROUPS.length}`;
  render();
}));

window.addEventListener('resize', render);

d3.csv('data/processed/road_user_changes_2011_2021.csv').then((data) => {
  rows = data
    .filter((d) => GROUPS.includes(d['Road User Group']))
    .map((d) => ({
      name: d['Road User Group'],
      series: YEARS.map((year) => +d[`${year}+Sum(Hospitalisations)`]),
      y2011: +d['2011+Sum(Hospitalisations)'],
      y2021: +d['2021+Sum(Hospitalisations)'],
      abs: +d['Absolute Change'],
      pct: +d['Percentage Change'],
    }));
  const top = [...rows].sort((a, b) => Math.abs(b.abs) - Math.abs(a.abs)).slice(0, 6).map((d) => d.name);
  top.forEach((name) => selectedRoads.add(name));
  roadCheckboxes.forEach((box) => { box.checked = selectedRoads.has(box.dataset.road); });
  roadCount.textContent = `${selectedRoads.size} of ${GROUPS.length}`;
  render();
});
