const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SEASONS = ["Summer", "Autumn", "Winter", "Spring"];
const NAVY = "#161F73";
const SEASON_BLUE = "#8798C7";
const PEAK = "#DF5839";
const MUTED = "#6B6F76";
const GRID = "#E6E6E1";
const fmt = d3.format(",");

const chartEl = document.getElementById("chart");
const chartCard = chartEl.parentElement;
const tooltip = document.getElementById("tooltip");
const viewButtons = document.querySelectorAll("[data-view]");
const aboutTexts = document.querySelectorAll("[data-about]");
let monthly = [];
let seasonal = [];
let view = "monthly";

function showTooltip(event, d, category) {
  tooltip.innerHTML = `<p class="font-bold">${category}: ${d.name}</p><p>${fmt(d.value)} hospitalisations</p>`;
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

function drawMonthly(svg, width, height) {
  const margin = { top: 24, right: 24, bottom: 56, left: 80 };
  const peak = d3.greatest(monthly, (d) => d.value);
  const x = d3.scaleBand().domain(monthly.map((d) => d.name)).range([margin.left, width - margin.right]).padding(0.25);
  const y = d3.scaleLinear().domain([0, d3.max(monthly, (d) => d.value) * 1.1]).nice().range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickSize(-(width - margin.left - margin.right)).tickFormat(fmt))
    .call(styleAxis)
    .call((g) => g.select(".domain").remove());

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickSize(0).tickFormat((name) => name.substring(0, 3)))
    .call(styleAxis)
    .call((g) => g.select(".domain").remove());

  svg.append("g")
    .selectAll("rect")
    .data(monthly)
    .join("rect")
    .attr("x", (d) => x(d.name))
    .attr("y", (d) => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", (d) => y(0) - y(d.value))
    .attr("rx", 5)
    .attr("fill", (d) => (d.name === peak.name ? PEAK : NAVY))
    .on("mouseenter", function (event, d) {
      d3.select(this).attr("opacity", 0.75);
      showTooltip(event, d, "Month");
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", function () {
      d3.select(this).attr("opacity", 1);
      hideTooltip();
    });
}

function drawSeasonal(svg, width, height) {
  const margin = { top: 24, right: 40, bottom: 56, left: 110 };
  const peak = d3.greatest(seasonal, (d) => d.value);
  const x = d3.scaleLinear().domain([0, d3.max(seasonal, (d) => d.value) * 1.1]).nice().range([margin.left, width - margin.right]);
  const y = d3.scaleBand().domain(seasonal.map((d) => d.name)).range([margin.top, height - margin.bottom]).padding(0.35);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5).tickSize(-(height - margin.top - margin.bottom)).tickFormat(d3.format("~s")))
    .call(styleAxis)
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick line").attr("stroke", GRID));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickSize(0))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick text").attr("fill", "#16181D").attr("font-size", 15).attr("font-family", "Inter").attr("dx", "-10"));

  svg.append("g")
    .selectAll("rect")
    .data(seasonal)
    .join("rect")
    .attr("x", x(0))
    .attr("y", (d) => y(d.name))
    .attr("width", (d) => x(d.value) - x(0))
    .attr("height", y.bandwidth())
    .attr("rx", 6)
    .attr("fill", (d) => (d.name === peak.name ? PEAK : SEASON_BLUE))
    .on("mouseenter", function (event, d) {
      d3.select(this).attr("opacity", 0.75);
      showTooltip(event, d, "Season");
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", function () {
      d3.select(this).attr("opacity", 1);
      hideTooltip();
    });
}

function render() {
  if (!monthly.length) return;
  const { width, height } = chartEl.getBoundingClientRect();
  const svg = d3.select(chartEl)
    .selectAll("svg")
    .data([null])
    .join("svg")
    .attr("width", width)
    .attr("height", height);
  svg.selectAll("*").remove();
  hideTooltip();
  if (view === "monthly") drawMonthly(svg, width, height);
  else drawSeasonal(svg, width, height);
  aboutTexts.forEach((p) => { p.hidden = p.dataset.about !== view; });
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

Promise.all([
  d3.csv("data/processed/Q1_Monthly.csv", d3.autoType),
  d3.csv("data/processed/Q1_Season.csv", d3.autoType),
]).then(([monthlyRows, seasonalRows]) => {
  monthly = monthlyRows
    .map((d) => ({ name: d.Month.trim(), value: d["Sum(Hospitalisations)"] }))
    .sort((a, b) => MONTHS.indexOf(a.name) - MONTHS.indexOf(b.name));
  seasonal = seasonalRows
    .map((d) => ({ name: d.Season.trim(), value: d["Sum(Hospitalisations)"] }))
    .sort((a, b) => SEASONS.indexOf(a.name) - SEASONS.indexOf(b.name));
  render();
});
