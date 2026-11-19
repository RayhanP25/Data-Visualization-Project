const AGE_GROUPS = ['0-7', '8-16', '17-25', '26-39', '40-64', '65-74', '75+'];
const LINE_COLORS = {
  '0-7': '#5B6BC9',
  '8-16': '#F0935A',
  '17-25': '#A4D26F',
  '26-39': '#F6C75E',
  '40-64': '#E2665F',
  '65-74': '#7FC3E0',
  '75+': '#4E9E6E',
};
const HEAT_STOPS = ['#FDE6D6', '#F0955A', '#A8420F'];
const heatInterpolator = d3.interpolateRgbBasis(HEAT_STOPS);
const MUTED = '#6B6F76';
const GRID = '#E6E6E1';

const chartEl = document.getElementById('chart');
const chartCard = chartEl.parentElement;
const tooltip = document.getElementById('tooltip');
const buttons = document.querySelectorAll('[data-view]');
const heatmapOptions = document.getElementById('heatmap-options');
const dimToggle = document.getElementById('dim-toggle');
const scaleToggle = document.getElementById('scale-toggle');
const countsToggle = document.getElementById('counts-toggle');
const selectedGroups = new Set(AGE_GROUPS);
const aboutTexts = document.querySelectorAll('[data-about]');
let rows = [];
let view = 'heatmap';

function valueFor(d) {
  return countsToggle.checked ? d.hospitalisations : d.rate_per_100k;
}

function showTooltip(event, d) {
  const fmt = d3.format(',');
  const amount = countsToggle.checked
    ? `${fmt(d.hospitalisations)} hospitalisations`
    : `${d.rate_per_100k.toFixed(1)} per 100k`;
  tooltip.innerHTML = `<p class="font-bold">${d.age_group.replace('-', '–')}, ${d.year}</p><p>${amount}</p><p class="text-nav">${fmt(d.hospitalisations)} out of ${fmt(d.population)} population</p>`;
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

function dimCells(cells, hovered) {
  cells.attr('opacity', (d) => (d.year === hovered.year || d.age_group === hovered.age_group ? 1 : 0.25));
}

function resetCells(cells) {
  cells.attr('opacity', 1);
}

function styleAxis(g) {
  g.selectAll('text').attr('fill', MUTED).attr('font-size', 14).attr('font-family', 'Inter');
  g.selectAll('.domain, line').attr('stroke', GRID);
}

function drawHeatmap(svg, width, height) {
  const margin = { top: 44, right: 0, bottom: 36, left: 72 };
  const years = [...new Set(rows.map((d) => d.year))];
  const x = d3.scaleBand().domain(years).range([margin.left, width - margin.right]).padding(0.05);
  const y = d3.scaleBand().domain(AGE_GROUPS).range([margin.top, height - margin.bottom]).padding(0.05);
  const overallColor = d3.scaleSequential(heatInterpolator).domain(d3.extent(rows, valueFor));
  const groupColor = new Map(AGE_GROUPS.map((group) => [
    group,
    d3.scaleSequential(heatInterpolator).domain(d3.extent(rows.filter((d) => d.age_group === group), valueFor)),
  ]));
  const fillFor = (d) => (scaleToggle.checked ? groupColor.get(d.age_group) : overallColor)(valueFor(d));

  const cells = svg.append('g')
    .selectAll('rect')
    .data(rows)
    .join('rect')
    .attr('x', (d) => x(d.year))
    .attr('y', (d) => y(d.age_group))
    .attr('width', x.bandwidth())
    .attr('height', y.bandwidth())
    .attr('rx', 8)
    .attr('fill', fillFor)
    .on('mouseenter', (event, d) => {
      showTooltip(event, d);
      if (dimToggle.checked) dimCells(cells, d);
    })
    .on('mousemove', moveTooltip)
    .on('mouseleave', () => {
      hideTooltip();
      resetCells(cells);
    });

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call(styleAxis)
    .call((g) => g.select('.domain').remove());

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickSize(0).tickFormat((d) => d.replace('-', '–')))
    .call(styleAxis)
    .call((g) => g.select('.domain').remove());

  const gradient = svg.append('defs')
    .append('linearGradient')
    .attr('id', 'heat-gradient');
  gradient.selectAll('stop')
    .data(d3.range(0, 1.01, 0.1))
    .join('stop')
    .attr('offset', (t) => `${t * 100}%`)
    .attr('stop-color', (t) => heatInterpolator(t));

  const barWidth = 150;
  const legendEnd = width - 56;
  const legendStart = legendEnd - barWidth;
  const legend = svg.append('g');
  legend.append('text').attr('x', legendEnd + 8).attr('y', 6).attr('dy', '0.32em').attr('fill', MUTED).attr('font-size', 13).text('Higher');
  legend.append('text').attr('x', legendStart - 8).attr('y', 6).attr('text-anchor', 'end').attr('dy', '0.32em').attr('fill', MUTED).attr('font-size', 13).text('Lower');
  legend.append('rect')
    .attr('x', legendStart)
    .attr('y', 0)
    .attr('width', barWidth)
    .attr('height', 12)
    .attr('rx', 3)
    .attr('fill', 'url(#heat-gradient)');
}

function drawLines(svg, width, height) {
  const margin = { top: 8, right: 16, bottom: 72, left: 64 };
  const years = [...new Set(rows.map((d) => d.year))];
  const groups = AGE_GROUPS.filter((g) => selectedGroups.has(g));
  const visibleRows = rows.filter((d) => selectedGroups.has(d.age_group));
  const x = d3.scalePoint().domain(years).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([0, d3.max(visibleRows, valueFor)]).nice().range([height - margin.bottom, margin.top]);

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickSize(-(width - margin.left - margin.right)).tickFormat(''))
    .call((g) => g.select('.domain').remove())
    .call((g) => g.selectAll('line').attr('stroke', GRID));

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickSize(0).tickFormat((d) => (d === 0 ? '' : d)))
    .call(styleAxis)
    .call((g) => g.select('.domain').remove());

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call(styleAxis)
    .call((g) => g.select('.domain').remove());

  svg.append('text')
    .attr('transform', `translate(16,${(margin.top + height - margin.bottom) / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle')
    .attr('fill', MUTED)
    .attr('font-size', 13)
    .text(countsToggle.checked ? 'hospitalisations' : 'hospitalisation per 100k');

  svg.append('text')
    .attr('x', (margin.left + width - margin.right) / 2)
    .attr('y', height - 40)
    .attr('text-anchor', 'middle')
    .attr('fill', MUTED)
    .attr('font-size', 13)
    .text('Year');

  const line = d3.line().x((d) => x(d.year)).y((d) => y(valueFor(d)));
  svg.append('g')
    .selectAll('path')
    .data(groups)
    .join('path')
    .attr('fill', 'none')
    .attr('stroke', (g) => LINE_COLORS[g])
    .attr('stroke-width', 2)
    .attr('d', (g) => line(rows.filter((d) => d.age_group === g)));

  svg.append('g')
    .selectAll('circle')
    .data(visibleRows)
    .join('circle')
    .attr('cx', (d) => x(d.year))
    .attr('cy', (d) => y(valueFor(d)))
    .attr('r', 8)
    .attr('fill', 'transparent')
    .on('mouseenter', showTooltip)
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip);

  const itemWidth = 80;
  const legendX = (width - AGE_GROUPS.length * itemWidth) / 2;
  const legend = svg.append('g').attr('transform', `translate(${legendX},${height - 8})`);
  const item = legend.selectAll('g').data(AGE_GROUPS).join('g')
    .attr('transform', (_, i) => `translate(${i * itemWidth},0)`)
    .attr('opacity', (g) => (selectedGroups.has(g) ? 1 : 0.3))
    .style('cursor', 'pointer')
    .on('click', (_, g) => {
      if (selectedGroups.has(g)) selectedGroups.delete(g);
      else selectedGroups.add(g);
      render();
    });
  item.append('circle').attr('r', 5).attr('fill', (g) => LINE_COLORS[g]);
  item.append('text').attr('x', 10).attr('dy', '0.32em').attr('fill', MUTED).attr('font-size', 13).text((g) => g);
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
  if (view === 'heatmap') drawHeatmap(svg, width, height);
  else drawLines(svg, width, height);
  updateAbout();
}

function updateAbout() {
  const key = view === 'line' ? 'line' : scaleToggle.checked ? 'heatmap-group' : 'heatmap';
  aboutTexts.forEach((p) => { p.hidden = p.dataset.about !== key; });
}

buttons.forEach((btn) => btn.addEventListener('click', () => {
  view = btn.dataset.view;
  buttons.forEach((b) => {
    const active = b === btn;
    b.classList.toggle('bg-accent', active);
    b.classList.toggle('text-white', active);
    b.classList.toggle('text-muted', !active);
  });
  heatmapOptions.classList.toggle('hidden', view !== 'heatmap');
  render();
}));

scaleToggle.addEventListener('change', render);
countsToggle.addEventListener('change', render);

window.addEventListener('resize', render);

d3.csv('data/processed/question4.csv', d3.autoType).then((data) => {
  rows = data;
  render();
});
