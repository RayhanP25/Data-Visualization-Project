
// Load the processed road user dataset
d3.csv("data/processed/road_user_changes_2011_2021.csv")
    .then(function(data) {

        // Convert dataset values into numbers
        data.forEach(function(d) {
            d["2011+Sum(Hospitalisations)"] = Number(d["2011+Sum(Hospitalisations)"]);
            d["2021+Sum(Hospitalisations)"] = Number(d["2021+Sum(Hospitalisations)"]);
            d["Absolute Change"] = Number(d["Absolute Change"]);
            d["Percentage Change"] = Number(d["Percentage Change"]);
        });

        // Set the chart dimensions
        const width = 1100;
        const height = 600;

        const margin = {
            top: 30,
            right: 100,
            bottom: 70,
            left: 260
        };

        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Create the SVG chart area
        const svg = d3.select("#q3-chart")
            .append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("width", "100%");

        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Create the axis label
        const axisLabel = svg.append("text")
            .attr("x", width / 2)
            .attr("y", height - 15)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px");

        // Create the chart axes
        const xAxis = chart.append("g")
            .attr("transform", `translate(0,${chartHeight})`);

        const yAxis = chart.append("g");

        // Create the zero reference line
        const zeroLine = chart.append("line")
            .attr("stroke", "#333333")
            .attr("stroke-width", 2);

        // Store the current filter selections
        let selectedMetric = "absolute";
        let selectedGroup = "all";

        // Function to update the chart
        function updateChart() {

            // Choose which values to display
            const metric = selectedMetric === "absolute"
                ? "Absolute Change"
                : "Percentage Change";

            // Filter the road user groups
            let filteredData = data.filter(function(d) {

                if (selectedGroup === "increase") {
                    return d[metric] > 0;
                }

                if (selectedGroup === "decrease") {
                    return d[metric] < 0;
                }

                return true;
            });

            // Sort from largest increase to largest decrease
            filteredData.sort(function(a, b) {
                return b[metric] - a[metric];
            });

            // Find the largest absolute value
            const maxChange = d3.max(filteredData, function(d) {
                return Math.abs(d[metric]);
            }) || 1;

            // Create the horizontal scale
            const xScale = d3.scaleLinear()
                .domain([-maxChange * 1.15, maxChange * 1.15])
                .range([0, chartWidth]);

            // Create the vertical scale
            const yScale = d3.scaleBand()
                .domain(filteredData.map(function(d) {
                    return d["Road User Group"];
                }))
                .range([0, chartHeight])
                .padding(0.25);

            // Update the horizontal axis
            xAxis.call(
                d3.axisBottom(xScale)
                    .ticks(7)
                    .tickFormat(function(value) {
                        return selectedMetric === "absolute"
                            ? d3.format(",")(value)
                            : value + "%";
                    })
            );

            // Update the vertical axis
            yAxis.call(d3.axisLeft(yScale));

            // Update the zero reference line
            zeroLine
                .attr("x1", xScale(0))
                .attr("x2", xScale(0))
                .attr("y1", 0)
                .attr("y2", chartHeight);

            // Draw the bars
            const bars = chart.selectAll(".bar")
                .data(filteredData, function(d) {
                    return d["Road User Group"];
                });

            bars.exit().remove();

            bars.enter()
                .append("rect")
                .attr("class", "bar")
                .merge(bars)
                .attr("x", function(d) {
                    const actualWidth = Math.abs(xScale(d[metric]) - xScale(0));
                    const visibleWidth = Math.max(actualWidth - 2, 4);

                    return d[metric] >= 0
                        ? xScale(0) + 1
                        : xScale(0) - 1 - visibleWidth;
                })
                .attr("y", function(d) {
                    return yScale(d["Road User Group"]);
                })
                .attr("width", function(d) {
                    const actualWidth = Math.abs(xScale(d[metric]) - xScale(0));

                    return d[metric] === 0
                        ? 0
                        : Math.max(actualWidth - 1, 4);
                })
                .attr("height", yScale.bandwidth())
                .attr("fill", function(d) {
                    return d[metric] >= 0 ? "#3E5DAA" : "#D66B6B";
                })
                .style("transition", "filter 180ms ease, opacity 180ms ease")
                .on("mouseover", function() {
                    d3.select(this)
                        .style("filter", "brightness(1.12) drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.18))")
                        .attr("opacity", 1);
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .style("filter", "none")
                        .attr("opacity", 1);
                })
                .selectAll("title")
                .data(function(d) {
                    return [d];
                })
                .join("title")
                .text(function(d) {
                    return d["Road User Group"] +
                        "\n2011 hospitalisations: " + d3.format(",")(d["2011+Sum(Hospitalisations)"]) +
                        "\n2021 hospitalisations: " + d3.format(",")(d["2021+Sum(Hospitalisations)"]) +
                        "\nAbsolute change: " + d3.format("+,")(d["Absolute Change"]) +
                        "\nPercentage change: " + d["Percentage Change"].toFixed(2) + "%";
                });

            // Add the values beside the bars
            const labels = chart.selectAll(".value-label")
                .data(filteredData, function(d) {
                    return d["Road User Group"];
                });

            labels.exit().remove();

            labels.enter()
                .append("text")
                .attr("class", "value-label")
                .merge(labels)
                .attr("x", function(d) {
                    const labelGap = 14;

                    if (d[metric] >= 0) {
                        return Math.max(
                            xScale(d[metric]) + labelGap,
                            xScale(0) + labelGap
                        );
                    } else {
                        return Math.min(
                            xScale(d[metric]) - labelGap,
                            xScale(0) - labelGap
                        );
                    }
                })
                .attr("y", function(d) {
                    return yScale(d["Road User Group"]) + yScale.bandwidth() / 2;
                })
                .attr("dy", "0.35em")
                .attr("text-anchor", function(d) {
                    return d[metric] >= 0 ? "start" : "end";
                })
                .attr("font-size", "12px")
                .attr("fill", "#222222")
                .text(function(d) {
                    return selectedMetric === "absolute"
                        ? d3.format("+,")(d[metric])
                        : d3.format("+.2f")(d[metric]) + "%";
                });

            // Update the horizontal axis label
            axisLabel.text(
                selectedMetric === "absolute"
                    ? "Change in hospitalisations (cases)"
                    : "Percentage change in hospitalisations (%)"
            );
        }

        // Handle metric selection buttons
        d3.selectAll(".metric-option")
            .on("click", function() {

                selectedMetric = this.dataset.metric;

                // Update the selected button appearance
                d3.selectAll(".metric-option")
                    .classed("bg-white shadow-sm text-ink", false)
                    .classed("text-muted", true);

                d3.select(this)
                    .classed("bg-white shadow-sm text-ink", true)
                    .classed("text-muted", false);

                updateChart();
            });

        // Handle road user group buttons
        d3.selectAll(".group-option")
            .on("click", function() {

                selectedGroup = this.dataset.group;

                // Update the selected button appearance
                d3.selectAll(".group-option")
                    .classed("bg-white shadow-sm text-ink", false)
                    .classed("text-muted", true);

                d3.select(this)
                    .classed("bg-white shadow-sm text-ink", true)
                    .classed("text-muted", false);

                updateChart();
            });

        // Handle reset button
        d3.select("#reset-filters")
            .on("click", function() {

                selectedMetric = "absolute";
                selectedGroup = "all";

                // Restore the original button selections
                d3.selectAll(".metric-option")
                    .classed("bg-white shadow-sm text-ink", false)
                    .classed("text-muted", true);

                d3.select('[data-metric="absolute"]')
                    .classed("bg-white shadow-sm text-ink", true)
                    .classed("text-muted", false);

                d3.selectAll(".group-option")
                    .classed("bg-white shadow-sm text-ink", false)
                    .classed("text-muted", true);

                d3.select('[data-group="all"]')
                    .classed("bg-white shadow-sm text-ink", true)
                    .classed("text-muted", false);

                updateChart();
            });

        // Display the original chart when the page loads
        updateChart();

    })
    .catch(function(error) {
        console.error("Error loading road user dataset:", error);
    });
