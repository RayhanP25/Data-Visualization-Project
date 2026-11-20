const AGE_ORDER = ["0-7", "8-16", "17-25", "26-39", "40-64", "65-74", "75+"];
const MALE = "#161F73";
const FEMALE = "#E18A62";
const MUTED = "#6B6F76";
const GRID = "#E6E6E1";
const fmt = d3.format(",");

const chartEl = document.getElementById("chart");
const chartCard = chartEl.parentElement;
const tooltip = document.getElementById("tooltip");
const viewButtons = document.querySelectorAll("[data-view]");
const aboutTexts = document.querySelectorAll("[data-about]");
const findingLists = document.querySelectorAll("[data-findings]");
let ageRows = [];
let roadRows = [];
let view = "age";

function displayAge(name) {
  return name.replace("-", "–");
}

function showTooltip(event, html) {
  tooltip.innerHTML = html;
  tooltip.classList.remove("hidden");
  moveTooltip(event);
}

function moveTooltip(event) {
  const box = chartCard.getBoundingClientRect();
  tooltip.style.left = `${event.clientX - box.left + 16}px`;
  tooltip.style.top = `${event.clientY - box.top + 16}px`;
}

function hideTooltip() {
  tooltip.classList.add("hidden");
}

function styleAxis(g) {
  g.selectAll("text").attr("fill", MUTED).attr("font-size", 14).attr("font-family", "Inter");
  g.selectAll(".domain, line").attr("stroke", GRID);
}

function drawAge(svg, width, height) {
  const margin = { top: 24, right: 24, bottom: 56, left: 80 };
  const x = d3.scaleBand().domain(ageRows.map((d) => d.name)).range([margin.left, width - margin.right]).padding(0.25);
  const xGender = d3.scaleBand().domain(["male", "female"]).range([0, x.bandwidth()]).padding(0.12);
  const y = d3.scaleLinear().domain([0, d3.max(ageRows, (d) => Math.max(d.male, d.female)) * 1.1]).nice().range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickSize(-(width - margin.left - margin.right)).tickFormat(d3.format("~s")))
    .call(styleAxis)
    .call((g) => g.select(".domain").remove());

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickSize(0).tickFormat(displayAge))
    .call(styleAxis)
    .call((g) => g.select(".domain").remove());

  const groups = svg.append("g")
    .selectAll("g")
    .data(ageRows)
    .join("g")
    .attr("transform", (d) => `translate(${x(d.name)},0)`)
    .on("mouseenter", (event, d) => {
      showTooltip(event, `<p class="font-bold">Age ${displayAge(d.name)}</p><p>Male: ${fmt(d.male)}</p><p>Female: ${fmt(d.female)}</p><p class="text-nav">Gap (M − F): ${fmt(d.gap)}</p>`);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip);

  groups.selectAll("rect")
    .data((d) => [
      { gender: "male", value: d.male },
      { gender: "female", value: d.female },
    ])
    .join("rect")
    .attr("x", (d) => xGender(d.gender))
    .attr("y", (d) => y(d.value))
    .attr("width", xGender.bandwidth())
    .attr("height", (d) => y(0) - y(d.value))
    .attr("rx", 4)
    .attr("fill", (d) => (d.gender === "male" ? MALE : FEMALE));
}

function drawRoad(svg, width, height) {
  const margin = { top: 24, right: 90, bottom: 56, left: 250 };
  const data = [...roadRows].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  const x = d3.scaleLinear().domain([0, d3.max(data, (d) => Math.max(d.male, d.female)) * 1.1]).nice().range([margin.left, width - margin.right]);
  const y = d3.scaleBand().domain(data.map((d) => d.name)).range([margin.top, height - margin.bottom]).padding(0.35);
  const rowY = (d) => y(d.name) + y.bandwidth() / 2;

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickSize(-(height - margin.top - margin.bottom)).tickFormat(d3.format("~s")))
    .call(styleAxis)
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick line").attr("stroke", GRID).attr("stroke-dasharray", "3,4"));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickSize(0))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick text").attr("fill", "#16181D").attr("font-size", 14).attr("font-family", "Inter").attr("dx", "-10"));

  const rows = svg.append("g")
    .selectAll("g")
    .data(data)
    .join("g")
    .on("mouseenter", (event, d) => {
      const direction = d.gap > 0 ? "More male hospitalisations" : d.gap < 0 ? "More female hospitalisations" : "Equal hospitalisations";
      showTooltip(event, `<p class="font-bold">${d.name}</p><p>Male: ${fmt(d.male)}</p><p>Female: ${fmt(d.female)}</p><p class="text-nav">${direction}: ${fmt(Math.abs(d.gap))}</p>`);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip);

  rows.append("line")
    .attr("x1", (d) => x(Math.min(d.male, d.female)))
    .attr("x2", (d) => x(Math.max(d.male, d.female)))
    .attr("y1", rowY)
    .attr("y2", rowY)
    .attr("stroke", "#BFC7D8")
    .attr("stroke-width", 4)
    .attr("stroke-linecap", "round");

  rows.append("circle")
    .attr("cx", (d) => x(d.male))
    .attr("cy", rowY)
    .attr("r", 7)
    .attr("fill", MALE)
    .attr("stroke", "#FFFFFF")
    .attr("stroke-width", 2);

  rows.append("circle")
    .attr("cx", (d) => x(d.female))
    .attr("cy", rowY)
    .attr("r", 7)
    .attr("fill", FEMALE)
    .attr("stroke", "#FFFFFF")
    .attr("stroke-width", 2);
}

function render() {
  if (!ageRows.length) return;
  const { width, height } = chartEl.getBoundingClientRect();
  const svg = d3.select(chartEl)
    .selectAll("svg")
    .data([null])
    .join("svg")
    .attr("width", width)
    .attr("height", height);
  svg.selectAll("*").remove();
  hideTooltip();
  if (view === "age") drawAge(svg, width, height);
  else drawRoad(svg, width, height);
  aboutTexts.forEach((p) => { p.hidden = p.dataset.about !== view; });
  findingLists.forEach((ul) => { ul.hidden = ul.dataset.findings !== view; });
}

viewButtons.forEach((btn) => btn.addEventListener("click", () => {
  view = btn.dataset.view;
  viewButtons.forEach((b) => {
    const active = b === btn;
    b.classList.toggle("bg-accent", active);
    b.classList.toggle("text-white", active);
    b.classList.toggle("text-muted", !active);
  });
  render();
}));

window.addEventListener("resize", render);

function parseRow(d, categoryKey) {
  const male = +d["Male+Sum(Sum(Hospitalisations))"];
  const female = +d["Female+Sum(Sum(Hospitalisations))"];
  return { name: d[categoryKey].trim(), male, female, gap: male - female };
}

Promise.all([
  d3.csv("data/processed/Q2_Age_Gender.csv"),
  d3.csv("data/processed/Q2_RoadUser_Gender.csv"),
]).then(([ageCsv, roadCsv]) => {
  ageRows = ageCsv
    .map((d) => ({ ...d, "Age group": d["Age group"].trim() === "2016-08-01" ? "8-16" : d["Age group"].trim() }))
    .filter((d) => AGE_ORDER.includes(d["Age group"]))
    .map((d) => parseRow(d, "Age group"))
    .sort((a, b) => AGE_ORDER.indexOf(a.name) - AGE_ORDER.indexOf(b.name));
  roadRows = roadCsv.map((d) => parseRow(d, "Road user"));
  render();
});
