var mainHeight = 800;
var mainWidth = 1450;
var padding = 100;

var countyView = false;
var currState = "Alabama";
var currYear = "2005";
var sortDefault = true;

d3.csv("http://localhost:8080/drugs.csv").then((data) => {
  // default view is to graph by state
  graphByState(data, "2005");
  timeHandler(data);
  viewHandler(data);
  sortHandler(data);
});

// reset the current graph
function clearGraph() {
  d3.select("#vis").selectAll("*").remove();
}

// dropdown for selecting states only shows up conditionally
function initializeDropdown(data) {
  uniqueStates = [...new Set(data.map((x) => x.State))];

  // if dropdown is changed, update the state in graph
  function dropdownChange() {
    var currStateSelection = d3.select(this).property("value");
    currState = currStateSelection;
    graphByCounty(data);
  }

  // label for dropdown
  //   d3.select("#viewby")
  //     .append("tspan")
  //     .attr("dy", "25")
  //     .text("Select a state: \n");

  var dropdown = d3
    .select("#viewby")
    .append("select")
    .attr("dy", "1em")
    .attr("id", "ddSel")
    .on("change", dropdownChange);

  var options = dropdown
    .selectAll("option")
    .data(uniqueStates.sort())
    .enter()
    .append("option")
    .text(function (d) {
      return d;
    });
}

function sortHandler(data) {
  function changeSort() {
    var form = document.getElementById("sortmenu");
    var form_val;

    // check which sorting option is currently selected
    for (var i = 0; i < form.length; i++) {
      if (form[i].checked) {
        form_val = form[i].id;
      }
    }

    if (form_val === "alphabet") {
      sortDefault = true;
    } else {
      sortDefault = false;
    }

    // redraw the graph based on selection
    if (countyView) {
      graphByCounty(data);
    } else {
      graphByState(data);
    }
  }

  d3.select("#sortmenu").on("change", changeSort);
}

// viewing mode handler
function viewHandler(data) {
  // change handler
  function changeView() {
    var form = document.getElementById("dimensions");
    var form_val;

    // check which viewing mode is selected
    for (var i = 0; i < form.length; i++) {
      if (form[i].checked) {
        form_val = form[i].id;
      }
    }

    if (form_val === "wholecountry") {
      countyView = false;

      // take away the dropdown
      d3.select("#statelabel").selectAll("text").remove();
      d3.select("#viewby").selectAll("select").remove();

      // revert to country view
      graphByState(data);
    } else {
      countyView = true;
      // display the dropdown
      initializeDropdown(data);

      // graph by county
      graphByCounty(data);
    }
  }

  var dataDim = d3.select("#dimensions");
  dataDim.on("change", changeView);
}

function getStateData(data, stateToFind) {
  var stateData = [];
  var stateStartInd = 0;
  var stateEndInd = 0;

  // access stateIndices object
  for (var i = 0; i < stateIndices.length; i++) {
    if (stateIndices[i].state === stateToFind) {
      stateStartInd = stateIndices[i].startIndex;
      stateEndInd = stateIndices[i].endIndex;
    }
  }
  // now we know where the state start/end indices are
  for (var i = stateStartInd; i <= stateEndInd; i++) {
    // if the year matches, get the county data
    if (data[i].Year === currYear) {
      var county = data[i].County;
      var death = data[i]["Model-based Death Rate"];
      var urbanruralcategory = data[i]["Urban/Rural Category"];
      var pop = data[i]["Population"];

      // add to array
      stateData.push({
        key: county,
        mean: death,
        density: urbanruralcategory,
        population: pop
      });
    }
  }

  return stateData;
}

// for setting a scale that allows comparison over time
function getStateMax() {
  // access stateIndices object
  for (var i = 0; i < stateMax.length; i++) {
    if (stateMax[i].state === currState) {
      return stateMax[i].max;
    }
  }
}

// depending on the state selected, graphs each county in state
function graphByCounty(data) {
  var stateData = getStateData(data, currState);

  clearGraph();

  // sort based on sorting selection
  stateData.sort(
    sortDefault
      ? (a, b) => a.key.localeCompare(b.key) // if checked, sort by value
      : (a, b) => b.mean - a.mean
  );

  // create scales
  var xScale = d3
    .scaleBand()
    .domain(stateData.map((d) => d.key))
    .range([padding, mainWidth - padding])
    .paddingInner(0.2);

  var stateMax = getStateMax(data);

  var yScale = d3
    .scaleLinear()
    .domain([0, stateMax])
    .range([mainHeight - padding, padding]);

  xAxisHelper(xScale, "county");
  yAxisHelper(yScale, "funding comparison", false);

  // define tooltip
  var div = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("width", "115px")
    .style("height", "65px")
    .style("line-height", "100%")
    .style("position", "absolute")
    .style("background", "white")
    .style("pointer-events", "none")
    .style("font-size", "13px")
    .style("font-family", "Arial")
    .style("border", "1px")
    .style("border-radius", "7px")
    .style("text-align", "center");

  // graph, with colors based on urban/rural divide
  d3.select("#vis")
    .selectAll("rect")
    .data(stateData)
    .enter()
    .append("rect")
    .attr("width", xScale.bandwidth())
    .attr("height", (d) => mainHeight - yScale(d.mean) - padding)
    .attr("x", (d) => xScale(d["key"]) + "px")
    .attr("y", (d) => yScale(d.mean) + "px")
    .attr("fill", function (d) {
      if (d.density === colors[0][0]) {
        return colors[0][1];
      } else if (d.density === colors[1][0]) {
        return colors[1][1];
      } else if (d.density === colors[2][0]) {
        return colors[2][1];
      } else if (d.density === colors[3][0]) {
        return colors[3][1];
      } else if (d.density === colors[4][0]) {
        return colors[4][1];
      } else {
        return colors[5][1];
      }
    })
    // add tooltip
    .on("mouseover", function (d) {
        div.transition().duration(200).style("opacity", 0.9);
        div
          .html("<br>" + d["key"].substring(0, d["key"].length-4) + "<br>Rate " + parseFloat(d.mean).toFixed(2) + ",<br>Pop. " +d["population"] )
          .style("left", d3.event.pageX + "px")
          .style("top", d3.event.pageY - 28 + "px");
      })
      .on("mouseout", function (d) {
        div.transition().duration(500).style("opacity", 0);
      });

  addLegend();
}

// appends legend to graph
function addLegend() {
  var legend = d3
    .select("#vis")
    .append("g")
    .attr("class", "legend")
    .attr("height", 200)
    .attr("width", 100);
  // .attr("transform", "translate(-20,50)");

  // add colored squares
  var legendRect = legend
    .selectAll("rect")
    .data(colors)
    .enter()
    .append("rect")
    .attr("x", mainWidth - 220)
    .attr("width", 12)
    .attr("height", 12)
    .attr("y", function (d, i) {
      return i * 19 + 18;
    })
    .style("fill", function (d) {
      return d[1];
    });

  // add legend labels
  var legendText = legend
    .selectAll("text")
    .data(colors)
    .enter()
    .append("text")
    .attr("x", mainWidth - 200)
    .attr("y", function (d, i) {
      return i * 20 + 25;
    })
    .text(function (d) {
      return d[0];
    });
}

// graphs states
function graphByState(data) {
  uniqueStates = [...new Set(data.map((x) => x.State))];
  averages = [];

  // cycle through each state
  for (var stateInd = 0; stateInd < uniqueStates.length; stateInd++) {
    var stateToFind = uniqueStates[stateInd];

    var stateStartInd = 0;
    var stateEndInd = 0;
    var currSum = 0;
    var numCounties = 0;

    // get stateIndices object
    for (var i = 0; i < stateIndices.length; i++) {
      if (stateIndices[i].state === stateToFind) {
        stateStartInd = stateIndices[i].startIndex;
        stateEndInd = stateIndices[i].endIndex;
      }
    }

    // now we know start and stop
    for (var i = stateStartInd; i < stateEndInd; i++) {
      // if the year matches, get add to average
      if (data[i].Year === currYear) {
        var deathRate = data[i]["Model-based Death Rate"];
        var deathRateNum = parseFloat(deathRate);
        currSum += deathRateNum;
        numCounties++;
      }
    }

    // calculate the average across each county
    var stateAvg = currSum / numCounties;
    averages.push({
      key: stateToFind,
      mean: stateAvg,
    });
  }

  // remove an invalid values
  for (var i = 0; i < averages.length; i++) {
    if (isNaN(averages[i]["mean"])) {
      averages.splice(i, 1);
    }
  }

  // sort depending on which sorting option is selected
  averages.sort(
    sortDefault
      ? (a, b) => a.key.localeCompare(b.key)
      : (a, b) => b.mean - a.mean
  );

  clearGraph();

  // create scales
  var xScale = d3
    .scaleBand()
    .domain(averages.map((d) => d.key))
    .range([padding, mainWidth - padding])
    .paddingInner(0.2);

  var yScale = d3
    .scaleLinear()
    .domain([0, 40])
    .range([mainHeight - padding, padding]);

  xAxisHelper(xScale, "state");
  yAxisHelper(yScale, "mortality rate, per 100,000 deaths", true);

  // define tooltip
  var div = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("width", "100px")
    .style("height", "55px")
    .style("line-height", "100%")
    .style("position", "absolute")
    .style("background", "white")
    .style("pointer-events", "none")
    .style("font-size", "13px")
    .style("font-family", "Arial")
    .style("border", "1px")
    .style("border-radius", "7px")
    .style("text-align", "center");

  // graph bars
  d3.select("#vis")
    .selectAll("rect")
    .data(averages)
    .enter()
    .append("rect")
    .attr("width", xScale.bandwidth())
    .attr("height", (d) => mainHeight - yScale(d.mean) - padding)
    .attr("x", (d) => xScale(d["key"]) + "px")
    .attr("y", (d) => yScale(d.mean) + "px")
    .attr("fill", "blue")
    // add tooltip
    .on("mouseover", function (d) {
      div.transition().duration(200).style("opacity", 0.9);
      div
        .html("<br>" + d["key"] + "<br>Rate " + d["mean"].toFixed(2))
        .style("left", d3.event.pageX + "px")
        .style("top", d3.event.pageY - 28 + "px");
    })
    .on("mouseout", function (d) {
      div.transition().duration(500).style("opacity", 0);
    });
}

// adds y-axis and label to graph, formatted correctly
// uses dynamic global width and height variables
function yAxisHelper(inputScale, labelName, labelAvg) {
  var yAxis = d3.axisLeft().scale(inputScale);

  // y-axis
  d3.select("#vis")
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + padding + ",0)")
    .call(yAxis);

  // third function parameter is whether or not the measure is an average
  if (labelAvg) {
    labelName = "Average " + labelName;
  }

  // y-axis label
  d3.select("#vis")
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", 0 - mainHeight / 2)
    .attr("y", 1)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text(labelName);
}

// adds x-axis and label to the graph
function xAxisHelper(inputScale, labelName) {
  var xAxis = d3.axisBottom().scale(inputScale);

  // add x-axis element
  d3.select("#vis")
    .append("g")
    .attr("transform", "translate(0," + (mainHeight - padding) + ")")
    .call(xAxis)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    // tick labels are rotated so they don't overlap as much with each other
    // Some of the longer ones still run off the SVG area, but
    // it is still more readable than having them all horizontal
    .attr("transform", "rotate(-35)");

  // x-axis label
  d3.select("#vis")
    .append("text")
    .attr(
      "transform",
      "translate(" + mainWidth / 2 + " ," + (mainHeight - 20) + ")"
    )
    .style("text-anchor", "middle")
    .text(labelName);
}

// handle time slider
function timeHandler(allData) {
  var dataTime = d3.range(0, 15).map(function (d) {
    return new Date(2003 + d, 10, 3);
  });

  var slider = d3
    .sliderBottom()
    .min(d3.min(dataTime))
    .max(d3.max(dataTime))
    .step(1000 * 60 * 60 * 24 * 365)
    .width(800)
    .tickFormat(d3.timeFormat("%Y"))
    .tickValues(dataTime)
    .default(new Date(2005, 10, 3))
    .on("onchange", (val) => {
      currYear = d3.timeFormat("%Y")(val);

      // updates year attribute in HTML div 
      document.getElementById("time-div").setAttribute("year", currYear); 

    //   d3.select('p#value-time').text(d3.timeFormat('%Y')(val));

      if (countyView) {
        graphByCounty(allData);
      } else {
        graphByState(allData);
      }
    });

  var gTime = d3
    .select("div#slider-time")
    .append("svg")
    .attr("width", 900)
    .attr("height", 100)
    .append("g")
    .attr("transform", "translate(30,30)");

  gTime.call(slider);
}

var stateMax = [
  { state: "Alabama", max: 40 },
  { state: "Alaska", max: 25 },
  { state: "Arizona", max: 35 },
  { state: "Arkansas", max: 35 },
  { state: "California", max: 45 },
  { state: "Colorado", max: 35 },
  { state: "Connecticut", max: 35 },
  { state: "Delaware", max: 40 },
  { state: "District of Columbia", max: 45 },
  { state: "Florida", max: 50 },
  { state: "Georgia", max: 30 },
  { state: "Hawaii", max: 25 },
  { state: "Idaho", max: 25 },
  { state: "Illinois", max: 40 },
  { state: "Indiana", max: 80 },
  { state: "Iowa", max: 20 },
  { state: "Kansas", max: 25 },
  { state: "Kentucky", max: 70 },
  { state: "Louisiana", max: 50 },
  { state: "Maine", max: 40 },
  { state: "Maryland", max: 90 },
  { state: "Massachusetts", max: 50 },
  { state: "Michigan", max: 45 },
  { state: "Minnesota", max: 25 },
  { state: "Mississippi", max: 40 },
  { state: "Missouri", max: 65 },
  { state: "Montana", max: 25 },
  { state: "Nebraska", max: 25 },
  { state: "Nevada", max: 35 },
  { state: "New Hampshire", max: 50 },
  { state: "New Jersey", max: 55 },
  { state: "New Mexico", max: 70 },
  { state: "New York", max: 35 },
  { state: "North Carolina", max: 45 },
  { state: "North Dakota", max: 20 },
  { state: "Ohio", max: 100 },
  { state: "Oklahoma", max: 35 },
  { state: "Oregon", max: 25 },
  { state: "Pennsylvania", max: 70 },
  { state: "Rhode Island", max: 35 },
  { state: "South Carolina", max: 40 },
  { state: "South Dakota", max: 20 },
  { state: "Tennessee", max: 55 },
  { state: "Texas", max: 35 },
  { state: "Utah", max: 45 },
  { state: "Vermont", max: 30 },
  { state: "Virginia", max: 55 },
  { state: "Washington", max: 30 },
  { state: "West Virginia", max: 132 },
  { state: "Wisconsin", max: 40 },
  { state: "Wyoming", max: 30 },
];

var stateIndices = [
  { state: "Alabama", startIndex: 0, endIndex: 1004 },
  { state: "Alaska", startIndex: 1005, endIndex: 1409 },
  { state: "Arizona", startIndex: 1410, endIndex: 1634 },
  { state: "Arkansas", startIndex: 1635, endIndex: 2759 },
  { state: "California", startIndex: 2760, endIndex: 3629 },
  { state: "Colorado", startIndex: 3630, endIndex: 4529 },
  { state: "Connecticut", startIndex: 4530, endIndex: 4649 },
  { state: "Delaware", startIndex: 4650, endIndex: 4694 },
  { state: "District of Columbia", startIndex: 4695, endIndex: 4709 },
  { state: "Florida", startIndex: 4710, endIndex: 5714 },
  { state: "Georgia", startIndex: 5715, endIndex: 8099 },
  { state: "Hawaii", startIndex: 8100, endIndex: 8174 },
  { state: "Idaho", startIndex: 8175, endIndex: 8834 },
  { state: "Illinois", startIndex: 8835, endIndex: 10364 },
  { state: "Indiana", startIndex: 10365, endIndex: 11744 },
  { state: "Iowa", startIndex: 11745, endIndex: 13229 },
  { state: "Kansas", startIndex: 13230, endIndex: 14804 },
  { state: "Kentucky", startIndex: 14805, endIndex: 16604 },
  { state: "Louisiana", startIndex: 16605, endIndex: 17564 },
  { state: "Maine", startIndex: 17565, endIndex: 17804 },
  { state: "Maryland", startIndex: 17805, endIndex: 18164 },
  { state: "Massachusetts", startIndex: 18165, endIndex: 18361 },
  { state: "Michigan", startIndex: 18362, endIndex: 19619 },
  { state: "Minnesota", startIndex: 19620, endIndex: 20924 },
  { state: "Mississippi", startIndex: 20925, endIndex: 22154 },
  { state: "Missouri", startIndex: 22155, endIndex: 23879 },
  { state: "Montana", startIndex: 23880, endIndex: 24719 },
  { state: "Nebraska", startIndex: 24720, endIndex: 26114 },
  { state: "Nevada", startIndex: 26115, endIndex: 26369 },
  { state: "New Hampshire", startIndex: 26370, endIndex: 26519 },
  { state: "New Jersey", startIndex: 26520, endIndex: 26834 },
  { state: "New Mexico", startIndex: 26835, endIndex: 27329 },
  { state: "New York", startIndex: 27330, endIndex: 28259 },
  { state: "North Carolina", startIndex: 28260, endIndex: 29759 },
  { state: "North Dakota", startIndex: 29760, endIndex: 30554 },
  { state: "Ohio", startIndex: 30555, endIndex: 31874 },
  { state: "Oklahoma", startIndex: 31875, endIndex: 33029 },
  { state: "Oregon", startIndex: 33030, endIndex: 33569 },
  { state: "Pennsylvania", startIndex: 33570, endIndex: 34576 },
  { state: "Rhode Island", startIndex: 34577, endIndex: 34651 },
  { state: "South Carolina", startIndex: 34652, endIndex: 35343 },
  { state: "South Dakota", startIndex: 35344, endIndex: 36333 },
  { state: "Tennessee", startIndex: 36334, endIndex: 37754 },
  { state: "Texas", startIndex: 37755, endIndex: 41564 },
  { state: "Utah", startIndex: 41565, endIndex: 41999 },
  { state: "Vermont", startIndex: 42000, endIndex: 42209 },
  { state: "Virginia", startIndex: 42210, endIndex: 44204 },
  { state: "Washington", startIndex: 44205, endIndex: 44789 },
  { state: "West Virginia", startIndex: 44790, endIndex: 45614 },
  { state: "Wisconsin", startIndex: 45615, endIndex: 46694 },
  { state: "Wyoming", startIndex: 46695, endIndex: 47039 },
];

var colors = [
  ["Noncore", "#537320"],
  ["Micropolitan", "#b3fc7f"],
  ["Small Metro", "#f7e474"],
  ["Medium Metro", "#f7cf9e"],
  ["Large Fringe Metro", "#ebae3d"],
  ["Large Central Metro", "#eb603d"],
];
