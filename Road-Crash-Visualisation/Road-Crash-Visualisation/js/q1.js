const monthlyFile = "data/Q1_Monthly.csv";
const seasonalFile = "data/Q1_Season.csv";

const chart = d3.select("#chart");
const tooltip = d3.select("#tooltip");

const monthlyBtn = d3.select("#monthlyBtn");
const seasonalBtn = d3.select("#seasonalBtn");

const chartTitle = d3.select("#chartTitle");
const chartSubtitle = d3.select("#chartSubtitle");
const description = d3.select("#chartDescription");
const findings = d3.select("#keyFindings");

const navy = "#161F73";
const orange = "#DF5839";
const lightBlue = "#8798C7";

const formatNumber = d3.format(",");

const months = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December"
];

const seasons = [
  "Summer", "Autumn", "Winter", "Spring"
];

let monthlyData = [];
let seasonalData = [];
let currentView = "monthly";

// Load CSV files
Promise.all([
  d3.csv(monthlyFile),
  d3.csv(seasonalFile)
]).then(([monthly, seasonal]) => {

  monthlyData = monthly.map(d => ({
    name: d.Month.trim(),
    value: +d["Sum(Hospitalisations)"]
  }));

  seasonalData = seasonal.map(d => ({
    name: d.Season.trim(),
    value: +d["Sum(Hospitalisations)"]
  }));

  monthlyData.sort((a, b) =>
    months.indexOf(a.name) - months.indexOf(b.name)
  );

  seasonalData.sort((a, b) =>
    seasons.indexOf(a.name) - seasons.indexOf(b.name)
  );

  showMonthly();

}).catch(error => {
  console.error(error);

  chart.html(
    "<p style='color:red;padding:20px'>" +
    "Unable to load the CSV files. " +
    "Please run the website using Live Server." +
    "</p>"
  );
});

// Tooltip
function showTooltip(event, d, category) {
  tooltip
    .style("display", "block")
    .html(`
      <strong>${category}: ${d.name}</strong>
      <div>Hospitalisations: ${formatNumber(d.value)}</div>
    `);

  moveTooltip(event);
}

function moveTooltip(event) {
  const node = tooltip.node();

  const tooltipWidth = node.offsetWidth;
  const tooltipHeight = node.offsetHeight;

  const x = Math.max(
    10,
    Math.min(
      event.clientX + 16,
      window.innerWidth - tooltipWidth - 10
    )
  );

  const y = Math.max(
    10,
    Math.min(
      event.clientY - tooltipHeight - 15,
      window.innerHeight - tooltipHeight - 10
    )
  );

  tooltip
    .style("left", x + "px")
    .style("top", y + "px");
}

function hideTooltip() {
  tooltip.style("display", "none");
}

// Key findings
function updateFindings(data) {
  const highest = d3.greatest(data, d => d.value);
  const lowest = d3.least(data, d => d.value);

  const difference = highest.value - lowest.value;

  findings.html(`
    <ul class="list-disc space-y-3 pl-5">
      <li>
        <strong>Highest:</strong>
        ${highest.name} with
        ${formatNumber(highest.value)} hospitalisations.
      </li>

      <li>
        <strong>Lowest:</strong>
        ${lowest.name} with
        ${formatNumber(lowest.value)} hospitalisations.
      </li>

      <li>
        <strong>Difference:</strong>
        ${formatNumber(difference)} hospitalisations.
      </li>
    </ul>
  `);
}

// Monthly vertical bar chart
function drawMonthlyChart() {
  chart.selectAll("*").remove();
  hideTooltip();

  const width = 900;
  const height = 440;

  const margin = {
    top: 45,
    right: 25,
    bottom: 65,
    left: 80
  };

  const svg = chart.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("role", "img")
    .attr("aria-label", "Monthly hospitalisation bar chart");

  const x = d3.scaleBand()
    .domain(monthlyData.map(d => d.name))
    .range([margin.left, width - margin.right])
    .padding(0.25);

  const y = d3.scaleLinear()
    .domain([
      0,
      d3.max(monthlyData, d => d.value) * 1.15
    ])
    .nice()
    .range([height - margin.bottom, margin.top]);

  // Gridlines and Y axis
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(
      d3.axisLeft(y)
        .ticks(5)
        .tickSize(-(width - margin.left - margin.right))
        .tickFormat(d3.format(","))
    )
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line")
      .attr("stroke", "#E6E6E6"))
    .call(g => g.selectAll(".tick text")
      .attr("fill", "#6B6F76")
      .attr("font-size", "13px"));

  // X axis
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3.axisBottom(x)
        .tickSize(0)
        .tickFormat(d => d.substring(0, 3))
    )
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick text")
      .attr("fill", "#6B6F76")
      .attr("font-size", "13px")
      .attr("dy", "1.4em"));

  const peak = d3.greatest(monthlyData, d => d.value);

  // Bars
  svg.selectAll(".monthly-bar")
    .data(monthlyData)
    .enter()
    .append("rect")
    .attr("class", "monthly-bar")
    .attr("x", d => x(d.name))
    .attr("width", x.bandwidth())
    .attr("y", y(0))
    .attr("height", 0)
    .attr("rx", 5)
    .attr("fill", d =>
      d.name === peak.name ? orange : navy
    )
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3.select(this).attr("opacity", 0.75);
      showTooltip(event, d, "Month");
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", function() {
      d3.select(this).attr("opacity", 1);
      hideTooltip();
    })
    .transition()
    .duration(700)
    .attr("y", d => y(d.value))
    .attr("height", d => y(0) - y(d.value));

  // Peak label
  svg.append("text")
    .attr("x", x(peak.name) + x.bandwidth() / 2)
    .attr("y", y(peak.value) - 12)
    .attr("text-anchor", "middle")
    .attr("fill", orange)
    .attr("font-weight", "bold")
    .attr("font-size", "14px")
    .text(formatNumber(peak.value));
}

// Seasonal horizontal bar chart
function drawSeasonalChart() {
  chart.selectAll("*").remove();
  hideTooltip();

  const width = 900;
  const height = 440;

  const margin = {
    top: 40,
    right: 110,
    bottom: 65,
    left: 110
  };

  const svg = chart.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("role", "img")
    .attr("aria-label", "Seasonal hospitalisation bar chart");

  const x = d3.scaleLinear()
    .domain([
      0,
      d3.max(seasonalData, d => d.value) * 1.15
    ])
    .nice()
    .range([margin.left, width - margin.right]);

  const y = d3.scaleBand()
    .domain(seasonalData.map(d => d.name))
    .range([margin.top, height - margin.bottom])
    .padding(0.35);

  // X axis
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3.axisBottom(x)
        .ticks(5)
        .tickFormat(d3.format("~s"))
    )
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick text")
      .attr("fill", "#6B6F76")
      .attr("font-size", "13px"));

  // Season labels
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickSize(0))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick text")
      .attr("fill", "#16181D")
      .attr("font-size", "14px")
      .attr("dx", "-10px"));

  const peak = d3.greatest(seasonalData, d => d.value);

  // Bars
  svg.selectAll(".season-bar")
    .data(seasonalData)
    .enter()
    .append("rect")
    .attr("class", "season-bar")
    .attr("x", x(0))
    .attr("y", d => y(d.name))
    .attr("height", y.bandwidth())
    .attr("width", 0)
    .attr("rx", 6)
    .attr("fill", d =>
      d.name === peak.name ? orange : lightBlue
    )
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3.select(this).attr("opacity", 0.75);
      showTooltip(event, d, "Season");
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", function() {
      d3.select(this).attr("opacity", 1);
      hideTooltip();
    })
    .transition()
    .duration(700)
    .attr("width", d => x(d.value) - x(0));

  // Values at the end of bars
  svg.selectAll(".season-value")
    .data(seasonalData)
    .enter()
    .append("text")
    .attr("x", d => x(d.value) + 10)
    .attr("y", d =>
      y(d.name) + y.bandwidth() / 2 + 5
    )
    .attr("fill", "#16181D")
    .attr("font-size", "13px")
    .attr("font-weight", "bold")
    .text(d => formatNumber(d.value));
}

// Update button appearance
function updateButtons(view) {
  const active =
    "rounded-full bg-accent px-4 py-1.5 text-white";

  const inactive =
    "rounded-full px-4 py-1.5 text-muted";

  monthlyBtn.attr(
    "class",
    view === "monthly" ? active : inactive
  );

  seasonalBtn.attr(
    "class",
    view === "seasonal" ? active : inactive
  );
}

// Monthly view
function showMonthly() {
  currentView = "monthly";

  updateButtons("monthly");

  chartTitle.text("Monthly Road Crash Hospitalisations");
  chartSubtitle.text("Total hospitalisations by month · 2011–2021");

  description.text(
    "Each bar represents the total number of road " +
    "crash hospitalisations for a calendar month, " +
    "aggregated across 2011–2021 in Australia. " +
    "The orange bar highlights the month with " +
    "the highest total."
  );

  updateFindings(monthlyData);
  drawMonthlyChart();
}

// Seasonal view
function showSeasonal() {
  currentView = "seasonal";

  updateButtons("seasonal");

  chartTitle.text("Seasonal Road Crash Hospitalisations");
  chartSubtitle.text("Total hospitalisations by season · 2011–2021");

  description.text(
    "Each horizontal bar represents the total " +
    "number of road crash hospitalisations " +
    "for an Australian season, aggregated across " +
    "2011–2021. Summer includes December, " +
    "January and February; Autumn includes " +
    "March, April and May; Winter includes " +
    "June, July and August; and Spring includes " +
    "September, October and November."
  );

  updateFindings(seasonalData);
  drawSeasonalChart();
}

// Button events
monthlyBtn.on("click", () => {
  if (monthlyData.length) showMonthly();
});

seasonalBtn.on("click", () => {
  if (seasonalData.length) showSeasonal();
});

