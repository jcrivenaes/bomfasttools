// cba_loader.js
// Script to load JSON case and populate the CBA form

async function loadCaseJSON(jsonFile) {
  // Show loading message
  const messageDiv = document.createElement("div");
  messageDiv.style.cssText =
    "position: fixed; top: 10px; right: 10px; background: #4CAF50; color: white; padding: 10px; border-radius: 4px; z-index: 9999;";
  messageDiv.textContent = "Loading configuration...";
  document.body.appendChild(messageDiv);

  const response = await fetch(jsonFile);
  const data = await response.json();

  // Helper to set value if element exists
  function setValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === "checkbox") {
      el.checked = !!value;
    } else {
      el.value = value;
    }
  }

  // General fields
  setValue("price_level", data.price_level);
  setValue("comparison_year", data.comparison_year);
  setValue("opening_year", data.opening_year);
  setValue("construction_period", data.construction_period);
  setValue("lifetime", data.lifetime);
  setValue("analysis_period", data.analysis_period);
  setValue("construction_cost", Math.abs(data.construction_cost) / 1e9); // Mrd
  setValue("annual_maintenance", Math.abs(data.annual_maintenance) / 1e6); // Mill
  setValue("vat_construction", data.vat_construction * 100);
  setValue("vat_general", data.vat_general * 100);
  setValue("bnp_growth", (data.bnp_growth * 100).toFixed(1));
  setValue("capital_interest_0_40", data.capital_interest_0_40 * 100);
  setValue("capital_interest_41_75", data.capital_interest_41_75 * 100);
  setValue("tax_factor", data.tax_factor * 100);

  // Traffic
  setValue("aadt_ferry", data.traffic?.aadt_ferry);
  setValue("aadt_project", data.traffic?.aadt_project);
  setValue("heavy_share", Math.round((data.traffic?.heavy_share || 0) * 100));
  setValue(
    "leisure_share",
    Math.round((data.traffic?.leisure_share || 0) * 100)
  );
  setValue("work_share", Math.round((data.traffic?.work_share || 0) * 100));
  setValue(
    "business_share",
    Math.round((data.traffic?.business_share || 0) * 100)
  );
  function updateSliderDisplay(id, value) {
    const display = document.getElementById(id + "_display");
    if (display) display.textContent = value + "%";
  }

  updateSliderDisplay(
    "heavy_share",
    Math.round((data.traffic?.heavy_share || 0) * 100)
  );
  updateSliderDisplay(
    "leisure_share",
    Math.round((data.traffic?.leisure_share || 0) * 100)
  );
  updateSliderDisplay(
    "work_share",
    Math.round((data.traffic?.work_share || 0) * 100)
  );
  updateSliderDisplay(
    "business_share",
    Math.round((data.traffic?.business_share || 0) * 100)
  );

  // Ferry
  setValue("ferry_cost_light", data.ferry?.costs?.light);
  setValue("ferry_cost_heavy", data.ferry?.costs?.heavy);
  setValue("annual_ferry_subsidy", Math.abs(data.annual_ferry_subsidy) / 1e6);
  setValue("ferry_comfort_factor", data.ferry?.comfort_factor);
  setValue("ferry_time_leisure", data.ferry?.extra_time?.leisure);
  setValue("ferry_time_work", data.ferry?.extra_time?.work);
  setValue("ferry_time_business", data.ferry?.extra_time?.business);
  setValue("ferry_time_heavy", data.ferry?.extra_time?.heavy);

  // Vehicle
  setValue("change_in_road_length", data.vehicle_costs?.change_in_road_length);
  setValue("speed_factor", data.vehicle_costs?.speed_factor);
  setValue("voc_light", data.vehicle_costs?.light);
  setValue("voc_heavy", data.vehicle_costs?.heavy);

  // VOT
  setValue("vot_leisure", data.time_values?.leisure);
  setValue("vot_work", data.time_values?.work);
  setValue("vot_business", data.time_values?.business);
  setValue("vot_heavy", data.time_values?.heavy);

  // Toll
  setValue("toll_enabled", data.toll?.enabled);
  setValue("toll_dynamic_enabled", data.toll?.enable_dynamic);
  setValue("toll_loan", data.toll?.toll_loan / 1e9); // Mrd kr
  setValue("repayment_period", data.toll?.repayment_period);
  setValue("toll_loan_interest", data.toll?.toll_loan_interest * 100);
  setValue("inflation_rate", data.toll?.inflation_rate * 100);
  setValue("gradual_loan_uptake", data.toll?.gradual_loan_uptake);
  setValue("heavy_vehicle_toll_factor", data.toll?.heavy_vehicle_toll_factor);

  setValue("elasticity_light", data.toll?.dynamic?.elasticity?.light);
  setValue("elasticity_heavy", data.toll?.dynamic?.elasticity?.heavy);

  // Other
  setValue("health_gs", data.other?.health_gs / 1e6);
  setValue("operators_sum", data.other?.operators_sum / 1e6);
  setValue("accidents", data.other?.accidents / 1e6);
  setValue("ghg_emissions", data.other?.ghg_emissions / 1e6);
  setValue("other_env_costs", data.other?.other_env_costs / 1e6);
  setValue("tax_income_correction", data.other?.tax_income_correction / 1e6);

  // Traffic growth (JSON textareas)
  if (data.traffic?.traffic_growth_ferry?.light)
    document.getElementById("ferry_growth_light").value = JSON.stringify(
      data.traffic.traffic_growth_ferry.light
    );
  if (data.traffic?.traffic_growth_ferry?.heavy)
    document.getElementById("ferry_growth_heavy").value = JSON.stringify(
      data.traffic.traffic_growth_ferry.heavy
    );
  if (data.traffic?.traffic_growth_project?.light)
    document.getElementById("project_growth_light").value = JSON.stringify(
      data.traffic.traffic_growth_project.light
    );
  if (data.traffic?.traffic_growth_project?.heavy)
    document.getElementById("project_growth_heavy").value = JSON.stringify(
      data.traffic.traffic_growth_project.heavy
    );

  // Update traffic growth tables from JSON data
  updateTrafficGrowthTablesFromJSON(data.traffic);

  // Try to automatically load corresponding reference image
  autoLoadReferenceImage(jsonFile);

  // Remove loading message
  setTimeout(() => {
    const messageDiv = document.querySelector('div[style*="position: fixed"]');
    if (messageDiv) messageDiv.remove();
  }, 1000);
}

function updateTrafficGrowthTablesFromJSON(trafficData) {
  // Function to populate a traffic growth table from JSON data
  function populateTable(tableId, textareaId, jsonData) {
    if (!jsonData) return;

    const table = document.getElementById(tableId);
    if (!table) return;

    // Clear existing rows (except header)
    const existingRows = table.querySelectorAll(".traffic-growth-row");
    existingRows.forEach((row) => row.remove());

    // Add rows from JSON data
    Object.entries(jsonData).forEach(([year, rate]) => {
      // addTrafficGrowthRowWithData expects rate as percentage
      const ratePercent = (rate * 100).toFixed(2);
      addTrafficGrowthRowWithData(tableId, textareaId, year, ratePercent);
    });
  }

  // Update all four traffic growth tables
  if (trafficData?.traffic_growth_ferry?.light) {
    populateTable(
      "ferry-light-table",
      "ferry_growth_light",
      trafficData.traffic_growth_ferry.light
    );
  }
  if (trafficData?.traffic_growth_ferry?.heavy) {
    populateTable(
      "ferry-heavy-table",
      "ferry_growth_heavy",
      trafficData.traffic_growth_ferry.heavy
    );
  }
  if (trafficData?.traffic_growth_project?.light) {
    populateTable(
      "project-light-table",
      "project_growth_light",
      trafficData.traffic_growth_project.light
    );
  }
  if (trafficData?.traffic_growth_project?.heavy) {
    populateTable(
      "project-heavy-table",
      "project_growth_heavy",
      trafficData.traffic_growth_project.heavy
    );
  }
}

function autoLoadReferenceImage(jsonFile) {
  const img = document.getElementById("reference-image");
  const display = document.getElementById("reference-display");
  const toggleBtn = document.getElementById("toggle-reference");

  if (!img || !display || !toggleBtn) return; // Elements not found

  // Get the base name from the JSON file - handle both full paths and just filenames
  let baseName;
  if (jsonFile.includes("/")) {
    // Extract filename from path like "references/hfast_svv_2025.json"
    baseName = jsonFile.split("/").pop().replace(".json", "");
  } else {
    // Simple filename like "hfast_svv_2025.json"
    baseName = jsonFile.replace(".json", "");
  }

  const referenceImagePath = `references/${baseName}.png`;

  // Create a temporary image to test if the file exists
  const testImg = new Image();

  testImg.onload = function () {
    // Image exists, load it
    img.src = referenceImagePath;
    display.style.display = "block";
    toggleBtn.style.display = "inline-block";
  };

  testImg.onerror = function () {
    // Image doesn't exist, hide reference section
    display.style.display = "none";
    toggleBtn.style.display = "none";
  };

  testImg.src = referenceImagePath;
}

// Dropdown logic for loading cases
document.addEventListener("DOMContentLoaded", function () {
  const select = document.getElementById("case-select");
  if (select) {
    select.addEventListener("change", function () {
      loadCaseJSON(this.value);
    });
    // Load default (first) case on page load
    loadCaseJSON(select.value);
  }
});
