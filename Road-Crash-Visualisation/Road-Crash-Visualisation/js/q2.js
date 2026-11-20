
const ageFile = "data/Q2_Age_Gender.csv";
const roadFile = "data/Q2_RoadUser_Gender.csv";

const q2Chart = d3.select("#q2Chart");
const q2Tooltip = d3.select("#q2Tooltip");
const q2Legend = d3.select("#q2Legend");
const q2Findings = d3.select("#q2Findings");

const ageBtn = d3.select("#ageBtn");
const roadBtn = d3.select("#roadBtn");

const q2Title = d3.select("#q2ChartTitle");
const q2Subtitle = d3.select("#q2ChartSubtitle");
const q2Description = d3.select("#q2Description");

const maleColor = "#161F73";
const femaleColor = "#E18A62";
const axisColor = "#6B6F76";

const q2Format = d3.format(",");

let ageData = [];
let roadData = [];

const ageOrder = [
  "0-7",
  "2016-08-01",
  "17-25",
  "26-39",
  "40-64",
  "65-74",
  "75+"
];

// The original CSV has an apparent date-conversion error.
// This is a provisional label, pending source verification.
function ageLabel(value) {
  if (value === "2016-08-01") {
    return "8–16*";
  }
  return value;
}

function parseGenderRow(d, categoryKey) {
  const male = Number(
    d["Male+Sum(Sum(Hospitalisations))"] || 0
  );

  const female = Number(
    d["Female+Sum(Sum(Hospitalisations))"] || 0
  );

  return {
    name: String(d[categoryKey] || "").trim(),
    male: male,
    female: female,
    gap: male - female
  };
}

// Load CSV datasets
Promise.all([
  d3.csv(ageFile),
  d3.csv(roadFile)
]).then(([ages, roads]) => {

  ageData = ages
    .map(d => parseGenderRow(d, "Age group"))
    .filter(d => ageOrder.includes(d.name))
    .sort((a, b) =>
      ageOrder.indexOf(a.name) -
      ageOrder.indexOf(b.name)
    );

  roadData = roads
    .map(d => parseGenderRow(d, "Road user"))
    .filter(d => d.name);

  showAgeChart();

}).catch(error => {
  console.error("Q2 CSV error:", error);

  q2Chart.html(`
    <p style="color:#B42318;padding:20px">
      Could not load the Q2 CSV files.
      Check the filenames and run the page using Live Server.
    </p>
  `);

  q2Findings.text("Data could not be loaded.");
});

// ====================================
// TOOLTIP
// ====================================

function showQ2Tooltip(event, html) {
  q2Tooltip
    .style("display", "block")
    .html(html);

  moveQ2Tooltip(event);
}

function moveQ2Tooltip(event) {
  const node = q2Tooltip.node();

  const width = node.offsetWidth;
  const height = node.offsetHeight;

  const x = Math.max(
    10,
    Math.min(
      event.clientX + 15,
      window.innerWidth - width - 10
    )
  );

  const y = Math.max(
    10,
    Math.min(
      event.clientY - height - 15,
      window.innerHeight - height - 10
    )
  );

  q2Tooltip
    .style("left", x + "px")
    .style("top", y + "px");
}

function hideQ2Tooltip() {
  q2Tooltip.style("display", "none");
}

// ====================================
// BUTTON STYLING
// ====================================

function updateQ2Buttons(view) {
  const active =
    "rounded-full bg-accent px-4 py-1.5 text-white";

  const inactive =
    "rounded-full px-4 py-1.5 text-muted";

  ageBtn.attr(
    "class",
    view === "age" ? active : inactive
  );

  roadBtn.attr(
    "class",
    view === "road" ? active : inactive
  );
}

// ====================================
// LEGEND
// ====================================

function setQ2Legend(items) {
  q2Legend.selectAll("*").remove();

  const legendItems = q2Legend
    .selectAll(".legend-item")
    .data(items)
    .enter()
    .append("div")
    .attr("class", "legend-item")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "8px");

  legendItems
    .append("span")
    .style("display", "inline-block")
    .style("width", "12px")
    .style("height", "12px")
    .style("border-radius", "50%")
    .style("background-color", d => d.color);

  legendItems
    .append("span")
    .text(d => d.label);
}

// ====================================
// AGE GROUPS: GROUPED BAR CHART
// ====================================

function drawAgeChart() {
  q2Chart.selectAll("*").remove();
  hideQ2Tooltip();

  const width = 900;
  const height = 450;

  const margin = {
    top: 30,
    right: 25,
    bottom: 70,
    left: 85
  };

  const svg = q2Chart.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("role", "img")
    .attr(
      "aria-label",
      "Grouped bar chart comparing male and female hospitalisations by age group"
    );

  const x = d3.scaleBand()
    .domain(ageData.map(d => d.name))
    .range([margin.left, width - margin.right])
    .padding(0.23);

  const xGender = d3.scaleBand()
    .domain(["male", "female"])
    .range([0, x.bandwidth()])
    .padding(0.12);

  const y = d3.scaleLinear()
    .domain([
      0,
      d3.max(ageData, d =>
        Math.max(d.male, d.female)
      ) * 1.12
    ])
    .nice()
    .range([
      height - margin.bottom,
      margin.top
    ]);

  // Y axis and gridlines
  svg.append("g")
    .attr(
      "transform",
      `translate(${margin.left},0)`
    )
    .call(
      d3.axisLeft(y)
        .ticks(5)
        .tickSize(
          -(width - margin.left - margin.right)
        )
        .tickFormat(d3.format("~s"))
    )
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line")
      .attr("stroke", "#E6E6E6"))
    .call(g => g.selectAll(".tick text")
      .attr("fill", axisColor)
      .attr("font-size", "13px"));

  // X axis
  svg.append("g")
    .attr(
      "transform",
      `translate(0,${height - margin.bottom})`
    )
    .call(
      d3.axisBottom(x)
        .tickSize(0)
        .tickFormat(ageLabel)
    )
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick text")
      .attr("fill", axisColor)
      .attr("font-size", "14px")
      .attr("dy", "1.3em"));

  const grouped = svg
    .selectAll(".age-group")
    .data(ageData)
    .enter()
    .append("g")
    .attr("class", "age-group")
    .attr(
      "transform",
      d => `translate(${x(d.name)},0)`
    );

  const bars = grouped
    .selectAll("rect")
    .data(d => [
      {
        category: d.name,
        gender: "male",
        value: d.male,
        male: d.male,
        female: d.female
      },
      {
        category: d.name,
        gender: "female",
        value: d.female,
        male: d.male,
        female: d.female
      }
    ])
    .enter()
    .append("rect")
    .attr("x", d => xGender(d.gender))
    .attr("y", y(0))
    .attr("width", xGender.bandwidth())
    .attr("height", 0)
    .attr("rx", 4)
    .attr(
      "fill",
      d => d.gender === "male"
        ? maleColor
        : femaleColor
    )
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3.select(this).attr("opacity", 0.75);

      showQ2Tooltip(event, `
        <strong>Age: ${ageLabel(d.category)}</strong>
        <div>Male: ${q2Format(d.male)}</div>
        <div>Female: ${q2Format(d.female)}</div>
        <div>
          Gap (M − F):
          ${q2Format(d.male - d.female)}
        </div>
      `);
    })
    .on("mousemove", moveQ2Tooltip)
    .on("mouseout", function() {
      d3.select(this).attr("opacity", 1);
      hideQ2Tooltip();
    });

  bars.transition()
    .duration(700)
    .attr("y", d => y(d.value))
    .attr(
      "height",
      d => y(0) - y(d.value)
    );
}

// ====================================
// ROAD USERS: DUMBBELL CHART
// ====================================

function drawRoadChart() {
  q2Chart.selectAll("*").remove();
  hideQ2Tooltip();

  // Sort by largest absolute gender gap
  const data = [...roadData].sort(
    (a, b) => Math.abs(b.gap) - Math.abs(a.gap)
  );

  const width = 1000;
  const height = Math.max(540, data.length * 43 + 90);

  const margin = {
    top: 35,
    right: 90,
    bottom: 65,
    left: 250
  };

  const svg = q2Chart.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("role", "img")
    .attr(
      "aria-label",
      "Dumbbell chart comparing male and female hospitalisation totals by road user type"
    );

  // Both genders share the same numerical axis
  const maxValue = d3.max(
    data,
    d => Math.max(d.male, d.female)
  );

  const x = d3.scaleLinear()
    .domain([0, maxValue * 1.12])
    .nice()
    .range([
      margin.left,
      width - margin.right
    ]);

  const y = d3.scaleBand()
    .domain(data.map(d => d.name))
    .range([
      margin.top,
      height - margin.bottom
    ])
    .padding(0.3);

  // Vertical gridlines
  svg.append("g")
    .attr(
      "transform",
      `translate(0,${height - margin.bottom})`
    )
    .call(
      d3.axisBottom(x)
        .ticks(6)
        .tickSize(
          -(height - margin.top - margin.bottom)
        )
        .tickFormat(d3.format("~s"))
    )
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line")
      .attr("stroke", "#E9E9E9")
      .attr("stroke-dasharray", "3,4"))
    .call(g => g.selectAll(".tick text")
      .attr("fill", axisColor)
      .attr("font-size", "12px")
      .attr("dy", "1.3em"));

  // Road-user category labels
  svg.append("g")
    .attr(
      "transform",
      `translate(${margin.left},0)`
    )
    .call(
      d3.axisLeft(y).tickSize(0)
    )
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick text")
      .attr("fill", "#16181D")
      .attr("font-size", "12px")
      .attr("dx", "-10px"));

  // Light alternating row backgrounds
  svg.selectAll(".dumbbell-row-bg")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "dumbbell-row-bg")
    .attr("x", margin.left)
    .attr("y", d => y(d.name) - 3)
    .attr(
      "width",
      width - margin.left - margin.right
    )
    .attr("height", y.bandwidth() + 6)
    .attr("rx", 4)
    .attr(
      "fill",
      (d, i) => i % 2 === 0
        ? "#F8F9FC"
        : "transparent"
    );

  // Each category gets one dumbbell group
  const groups = svg
    .selectAll(".dumbbell-group")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "dumbbell-group")
    .style("cursor", "pointer");

  function tooltipHTML(d) {
    const higher = d.gap > 0
      ? "More male hospitalisations"
      : d.gap < 0
        ? "More female hospitalisations"
        : "Equal hospitalisations";

    return `
      <strong>${d.name}</strong>
      <div>Male: ${q2Format(d.male)}</div>
      <div>Female: ${q2Format(d.female)}</div>
      <div>Gender gap: ${q2Format(Math.abs(d.gap))}</div>
      <div>${higher}</div>
    `;
  }

  groups
    .on("mouseover", function(event, d) {
      d3.select(this)
        .select(".dumbbell-line")
        .attr("stroke-width", 7);

      d3.select(this)
        .selectAll(".dumbbell-dot")
        .attr("r", 9);

      showQ2Tooltip(event, tooltipHTML(d));
    })
    .on("mousemove", moveQ2Tooltip)
    .on("mouseout", function() {
      d3.select(this)
        .select(".dumbbell-line")
        .attr("stroke-width", 4);

      d3.select(this)
        .selectAll(".dumbbell-dot")
        .attr("r", 7);

      hideQ2Tooltip();
    });

  // Connecting lines show the gender gap
  groups.append("line")
    .attr("class", "dumbbell-line")
    .attr("x1", d => x(d.male))
    .attr("x2", d => x(d.male))
    .attr(
      "y1",
      d => y(d.name) + y.bandwidth() / 2
    )
    .attr(
      "y2",
      d => y(d.name) + y.bandwidth() / 2
    )
    .attr("stroke", "#BFC7D8")
    .attr("stroke-width", 4)
    .attr("stroke-linecap", "round")
    .transition()
    .duration(800)
    .attr(
      "x1",
      d => x(Math.min(d.male, d.female))
    )
    .attr(
      "x2",
      d => x(Math.max(d.male, d.female))
    );

  // Male dots
  groups.append("circle")
    .attr("class", "dumbbell-dot male-dot")
    .attr("cx", d => x(d.male))
    .attr(
      "cy",
      d => y(d.name) + y.bandwidth() / 2
    )
    .attr("r", 0)
    .attr("fill", maleColor)
    .attr("stroke", "#FFFFFF")
    .attr("stroke-width", 2)
    .transition()
    .duration(600)
    .delay(200)
    .attr("r", 7);

  // Female dots
  groups.append("circle")
    .attr("class", "dumbbell-dot female-dot")
    .attr("cx", d => x(d.female))
    .attr(
      "cy",
      d => y(d.name) + y.bandwidth() / 2
    )
    .attr("r", 0)
    .attr("fill", femaleColor)
    .attr("stroke", "#FFFFFF")
    .attr("stroke-width", 2)
    .transition()
    .duration(600)
    .delay(300)
    .attr("r", 7);

  // Transparent hover area for easier interaction
  groups.append("rect")
    .attr("x", d =>
      x(Math.min(d.male, d.female)) - 10
    )
    .attr(
      "y",
      d => y(d.name) + y.bandwidth() / 2 - 13
    )
    .attr(
      "width",
      d => Math.max(
        22,
        x(Math.max(d.male, d.female)) -
        x(Math.min(d.male, d.female)) + 20
      )
    )
    .attr("height", 26)
    .attr("fill", "transparent");

  // X-axis title
  svg.append("text")
    .attr("x", (margin.left + width - margin.right) / 2)
    .attr("y", height - 12)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .attr("fill", axisColor)
    .text("Number of hospitalisations");
}

// ====================================
// AGE GROUP VIEW
// ====================================

function showAgeChart() {
  updateQ2Buttons("age");

  q2Title.text(
    "Hospitalisations by Age Group and Gender"
  );

  q2Subtitle.text(
    "Male and female hospitalisation totals · 2011–2021"
  );

  q2Description.text(
    "This grouped bar chart compares male and female " +
    "road crash hospitalisations across age groups " +
    "in Australia from 2011 to 2021. Each pair " +
    "of bars shows the difference between genders."
  );

  setQ2Legend([
    { label: "Male", color: maleColor },
    { label: "Female", color: femaleColor }
  ]);

  const biggestGap = d3.greatest(
    ageData,
    d => Math.abs(d.gap)
  );

  const femaleHigher = ageData.filter(
    d => d.female > d.male
  );

  q2Findings.html(`
    <ul class="list-disc space-y-3 pl-5">
      <li>
        <strong>Largest gender gap:</strong>
        Age ${ageLabel(biggestGap.name)},
        with ${q2Format(Math.abs(biggestGap.gap))}
        more ${biggestGap.gap >= 0 ? "male" : "female"}
        hospitalisations.
      </li>

      <li>
        <strong>Male-higher age groups:</strong>
        ${ageData.filter(d => d.male > d.female).length}
        of ${ageData.length} age groups.
      </li>

      <li>
        <strong>Female-higher age groups:</strong>
        ${
          femaleHigher.length
            ? femaleHigher
                .map(d => ageLabel(d.name))
                .join(", ")
            : "None"
        }.
      </li>
    </ul>
  `);

  drawAgeChart();
}

// ====================================
// ROAD USER VIEW
// ====================================

function showRoadChart() {
  updateQ2Buttons("road");

  q2Title.text(
    "Male vs Female Hospitalisations by Road User Type"
  );

  q2Subtitle.text(
    "Dumbbell chart · Australia · 2011–2021"
  );

  q2Description.text(
    "This dumbbell chart compares male and female " +
    "hospitalisation totals for each road user type. " +
    "The navy dot represents males, while the orange " +
    "dot represents females. The connecting line " +
    "shows the difference between the two totals. " +
    "Longer lines indicate larger absolute gender gaps. " +
    "These are hospitalisation counts, not risk-adjusted rates."
  );

  setQ2Legend([
    { label: "Male", color: maleColor },
    { label: "Female", color: femaleColor }
  ]);

  const largestGap = d3.greatest(
    roadData,
    d => Math.abs(d.gap)
  );

  const largestMale = d3.greatest(
    roadData,
    d => d.gap
  );

  const largestFemale = d3.least(
    roadData,
    d => d.gap
  );

  q2Findings.html(`
    <ul class="list-disc space-y-3 pl-5">
      <li>
        <strong>Largest overall gender gap:</strong>
        ${largestGap.name}, with
        ${q2Format(Math.abs(largestGap.gap))}
        more ${largestGap.gap >= 0 ? "male" : "female"}
        hospitalisations.
      </li>

      <li>
        <strong>Largest male-higher gap:</strong>
        ${largestMale.name}, with
        ${q2Format(largestMale.gap)}
        more male hospitalisations.
      </li>

      <li>
        <strong>Largest female-higher gap:</strong>
        ${
          largestFemale.gap < 0
            ? largestFemale.name +
              ", with " +
              q2Format(Math.abs(largestFemale.gap)) +
              " more female hospitalisations."
            : "No female-higher category."
        }
      </li>
    </ul>
  `);

  drawRoadChart();
}

ageBtn.on("click", () => {
  if (ageData.length) {
    showAgeChart();
  }
});

roadBtn.on("click", () => {
  if (roadData.length) {
    showRoadChart();
  }
});
