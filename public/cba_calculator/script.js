// script.js

// --- UTILITY FUNCTIONS ---
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const COST_MULTIPLIER_MRD = 1e9;
const COST_MULTIPLIER_MILL = 1e6;
const MAX_REASONABLE_TOLL = 1000;
const ADDED_TRAFFIC_BENEFIT_FACTOR = 0.5;

// Global chart instances for proper cleanup
let aadtChart = null;
let nnbRatioChart = null;
let netBenefitChart = null;

// --- UI FUNCTIONS ---
function openTab(event, tabName) {
  $$(".tab-content").forEach((tab) => tab.classList.remove("active"));
  $$(".tab-link").forEach((link) => link.classList.remove("active"));
  $(`#${tabName}`).classList.add("active");
  event.currentTarget.classList.add("active");
}

function getFormData() {
  const form = $("#cba-form");
  const inputs = form.querySelectorAll("input, textarea");
  const config = {
    other: {},
    traffic: { traffic_growth_ferry: {}, traffic_growth_project: {} },
    ferry: { costs: {}, extra_time: {} },
    vehicle_costs: {},
    time_values: {},
    toll: {
      static: { costs: {} },
      dynamic: { elasticity: {} },
    },
  };

  // Helper to parse numbers
  const parseNum = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? value : num;
  };

  // Helper to parse JSON textareas
  const parseJson = (value) => {
    try {
      return JSON.parse(value.trim());
    } catch (e) {
      log(`Feil i tolkning av JSON: ${e.message}`);
      return {};
    }
  };

  // General
  config.price_level = parseNum($("#price_level").value);
  config.comparison_year = parseNum($("#comparison_year").value);
  config.opening_year = parseNum($("#opening_year").value);
  config.construction_period = parseNum($("#construction_period").value);
  config.lifetime = parseNum($("#lifetime").value);
  config.analysis_period = parseNum($("#analysis_period").value);
  config.construction_cost =
    parseNum($("#construction_cost").value) * COST_MULTIPLIER_MRD * -1;
  config.annual_maintenance =
    parseNum($("#annual_maintenance").value) * COST_MULTIPLIER_MILL * -1;
  config.vat_construction = parseNum($("#vat_construction").value) / 100;
  config.vat_general = parseNum($("#vat_general").value) / 100;
  config.bnp_growth = parseNum($("#bnp_growth").value) / 100;
  config.capital_interest_0_40 =
    parseNum($("#capital_interest_0_40").value) / 100;
  config.capital_interest_41_75 =
    parseNum($("#capital_interest_41_75").value) / 100;
  config.tax_factor = parseNum($("#tax_factor").value) / 100;

  // Traffic
  config.traffic.aadt_ferry = parseNum($("#aadt_ferry").value);
  config.traffic.aadt_project = parseNum($("#aadt_project").value);

  // Normalize all vehicle shares to sum to 100%
  let heavy_share = parseNum($("#heavy_share").value);
  let leisure_share = parseNum($("#leisure_share").value);
  let work_share = parseNum($("#work_share").value);
  let business_share = parseNum($("#business_share").value);
  const total_share = heavy_share + leisure_share + work_share + business_share;

  if (total_share > 0 && Math.abs(total_share - 100) > 1e-9) {
    const scale = 100 / total_share;
    heavy_share *= scale;
    leisure_share *= scale;
    work_share *= scale;
    business_share *= scale;
    log(
      `INFO: Kjøretøyandeler summerte ikke til 100%. Normaliserte til: Tunge=${heavy_share.toFixed(
        1
      )}%, Fritid=${leisure_share.toFixed(1)}%, Arbeid=${work_share.toFixed(
        1
      )}%, Næring=${business_share.toFixed(1)}%`
    );
  }

  config.traffic.heavy_share = heavy_share / 100;
  config.traffic.leisure_share = leisure_share / 100;
  config.traffic.work_share = work_share / 100;
  config.traffic.business_share = business_share / 100;

  config.traffic.traffic_growth_ferry.light = parseJson(
    $("#ferry_growth_light").value
  );
  config.traffic.traffic_growth_ferry.heavy = parseJson(
    $("#ferry_growth_heavy").value
  );
  config.traffic.traffic_growth_project.light = parseJson(
    $("#project_growth_light").value
  );
  config.traffic.traffic_growth_project.heavy = parseJson(
    $("#project_growth_heavy").value
  );

  // Ferry
  config.ferry.costs.light = parseNum($("#ferry_cost_light").value);
  config.ferry.costs.heavy = parseNum($("#ferry_cost_heavy").value);
  config.annual_ferry_subsidy =
    parseNum($("#annual_ferry_subsidy").value) * COST_MULTIPLIER_MILL;
  config.ferry.comfort_factor = parseNum($("#ferry_comfort_factor").value);
  config.ferry.extra_time.leisure = parseNum($("#ferry_time_leisure").value);
  config.ferry.extra_time.work = parseNum($("#ferry_time_work").value);
  config.ferry.extra_time.business = parseNum($("#ferry_time_business").value);
  config.ferry.extra_time.heavy = parseNum($("#ferry_time_heavy").value);

  // Vehicle & Time
  config.vehicle_costs.change_in_road_length = parseNum(
    $("#change_in_road_length").value
  );
  config.vehicle_costs.speed_factor = parseNum($("#speed_factor").value);
  config.vehicle_costs.light = parseNum($("#voc_light").value);
  config.vehicle_costs.heavy = parseNum($("#voc_heavy").value);
  config.time_values.leisure = parseNum($("#vot_leisure").value);
  config.time_values.work = parseNum($("#vot_work").value);
  config.time_values.business = parseNum($("#vot_business").value);
  config.time_values.heavy = parseNum($("#vot_heavy").value);

  // Toll
  config.toll.enabled = $("#toll_enabled").checked;
  config.toll.enable_dynamic = $("#toll_dynamic_enabled").checked;
  config.toll.toll_loan = parseNum($("#toll_loan").value) * 1e9; // Convert billions to absolute
  config.toll.repayment_period = parseNum($("#repayment_period").value);
  config.toll.toll_loan_interest =
    parseNum($("#toll_loan_interest").value) / 100;
  config.toll.inflation_rate = parseNum($("#inflation_rate").value) / 100;
  config.toll.gradual_loan_uptake = $("#gradual_loan_uptake").checked;
  config.toll.heavy_vehicle_toll_factor = parseNum(
    $("#heavy_vehicle_toll_factor").value
  );
  config.toll.dynamic.elasticity.light = parseNum($("#elasticity_light").value);
  config.toll.dynamic.elasticity.heavy = parseNum($("#elasticity_heavy").value);

  // Other
  config.other.health_gs =
    parseNum($("#health_gs").value) * COST_MULTIPLIER_MILL;
  config.other.operators_sum =
    parseNum($("#operators_sum").value) * COST_MULTIPLIER_MILL;
  config.other.accidents =
    parseNum($("#accidents").value) * COST_MULTIPLIER_MILL;
  config.other.ghg_emissions =
    parseNum($("#ghg_emissions").value) * COST_MULTIPLIER_MILL;
  config.other.other_env_costs =
    parseNum($("#other_env_costs").value) * COST_MULTIPLIER_MILL;
  config.other.tax_income_correction =
    parseNum($("#tax_income_correction").value) * COST_MULTIPLIER_MILL;

  return config;
}

function log(message) {
  $("#log-output").textContent += message + "\n";
}

function clearLog() {
  $("#log-output").textContent = "";
}

function exportFormDataAsJSON() {
  try {
    const config = getFormData();

    // Convert back to the JSON file format
    const exportData = {
      opening_year: config.opening_year,
      construction_period: config.construction_period,
      price_level: config.price_level,
      comparison_year: config.comparison_year,
      vat_construction: config.vat_construction,
      vat_general: config.vat_general,
      analysis_period: config.analysis_period,
      lifetime: config.lifetime,
      construction_cost: config.construction_cost,
      tax_factor: config.tax_factor,
      annual_maintenance: config.annual_maintenance,
      annual_ferry_subsidy: config.annual_ferry_subsidy,
      capital_interest_0_40: config.capital_interest_0_40,
      capital_interest_41_75: config.capital_interest_41_75,
      bnp_growth: config.bnp_growth,
      other: {
        health_gs: config.other.health_gs || 0,
        tax_income_correction: config.other.tax_income_correction || 0, // This field doesn't exist in form, use default
        accidents: config.other.accidents || 0,
        ghg_emissions: config.other.ghg_emissions || 0,
        other_env_costs: config.other.other_env_costs || 0,
        operators_sum: config.other.operators_sum || 0,
      },
      traffic: {
        aadt_ferry: config.traffic.aadt_ferry,
        traffic_growth_ferry: {
          light: config.traffic.traffic_growth_ferry.light,
          heavy: config.traffic.traffic_growth_ferry.heavy,
        },
        aadt_project: config.traffic.aadt_project,
        traffic_growth_project: {
          light: config.traffic.traffic_growth_project.light,
          heavy: config.traffic.traffic_growth_project.heavy,
        },
        heavy_share: config.traffic.heavy_share,
        work_share: config.traffic.work_share,
        leisure_share: config.traffic.leisure_share,
        business_share: config.traffic.business_share,
      },
      ferry: {
        costs: {
          light: config.ferry.costs.light,
          heavy: config.ferry.costs.heavy,
        },
        comfort_factor: config.ferry.comfort_factor,
        extra_time: {
          leisure: config.ferry.extra_time.leisure,
          work: config.ferry.extra_time.work,
          business: config.ferry.extra_time.business,
          heavy: config.ferry.extra_time.heavy,
        },
      },
      vehicle_costs: {
        change_in_road_length: config.vehicle_costs.change_in_road_length,
        speed_factor: config.vehicle_costs.speed_factor,
        light: config.vehicle_costs.light,
        heavy: config.vehicle_costs.heavy,
      },
      time_values: {
        leisure: config.time_values.leisure,
        work: config.time_values.work,
        business: config.time_values.business,
        heavy: config.time_values.heavy,
      },
      toll: {
        enabled: config.toll.enabled,
        toll_loan: config.toll.toll_loan,
        repayment_period: config.toll.repayment_period,
        toll_loan_interest: config.toll.toll_loan_interest,
        inflation_rate: config.toll.inflation_rate,
        gradual_loan_uptake: config.toll.gradual_loan_uptake,
        heavy_vehicle_toll_factor: config.toll.heavy_vehicle_toll_factor,
        enable_dynamic: config.toll.enable_dynamic,
        static: {
          toll_aadt_multiplier: 0.7, // Default value, not in form
          costs: config.toll.static.costs || { light: 0, heavy: 0 },
        },
        dynamic: {
          elasticity: {
            light: config.toll.dynamic.elasticity.light,
            heavy: config.toll.dynamic.elasticity.heavy,
          },
        },
      },
    };

    // Create filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, "");
    const filename = `cba_config_${timestamp}.json`;

    // Create and download the file
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    log(`Konfigurasjonen ble eksportert til ${filename}`);
  } catch (error) {
    log(`Feil ved eksport: ${error.message}`);
    console.error(error);
  }
}

// --- CORE CALCULATION LOGIC (from Python) ---

function calculateTollRates({
  loan_initial,
  build_years,
  repay_years,
  interest_rate,
  gradual_loan_uptake,
  extra_dist_km,
  light_initial_aadt_project,
  light_time_saving_hr,
  light_traffic_growth,
  light_elasticity,
  light_ferry_price,
  light_vot,
  light_voc,
  heavy_initial_aadt_project,
  heavy_time_saving_hr,
  heavy_traffic_growth,
  heavy_elasticity,
  heavy_ferry_price,
  heavy_vot,
  heavy_voc,
  heavy_toll_factor,
}) {
  let loan_at_opening;
  if (gradual_loan_uptake) {
    const interest_during_construction =
      loan_initial * interest_rate * (build_years / 2);
    loan_at_opening = loan_initial + interest_during_construction;
  } else {
    loan_at_opening = loan_initial * Math.pow(1 + interest_rate, build_years);
  }

  const net_benefit_light =
    light_time_saving_hr * light_vot +
    light_ferry_price -
    extra_dist_km * light_voc;
  const net_benefit_heavy =
    heavy_time_saving_hr * heavy_vot +
    heavy_ferry_price -
    extra_dist_km * heavy_voc;

  const get_npv_growth_factor = (r, g, n) => {
    if (Math.abs(r - g) < 1e-9) return n / (1 + r);
    return (1 / (r - g)) * (1 - Math.pow((1 + g) / (1 + r), n));
  };

  const npv_factor_light = get_npv_growth_factor(
    interest_rate,
    light_traffic_growth,
    repay_years
  );
  const npv_factor_heavy = get_npv_growth_factor(
    interest_rate,
    heavy_traffic_growth,
    repay_years
  );

  const K_light = 365 * light_initial_aadt_project * npv_factor_light;
  const a_light = K_light * (light_elasticity / net_benefit_light);
  const b_light = K_light;

  const K_heavy = 365 * heavy_initial_aadt_project * npv_factor_heavy;
  const a_heavy =
    K_heavy * (heavy_elasticity / net_benefit_heavy) * heavy_toll_factor ** 2;
  const b_heavy = K_heavy * heavy_toll_factor;

  const a = a_light + a_heavy;
  const b = b_light + b_heavy;
  const c = -loan_at_opening;

  try {
    let toll_light;
    if (Math.abs(a) < 1e-9) {
      if (Math.abs(b) < 1e-9)
        throw new Error("Equation is unsolvable (a and b are zero).");
      toll_light = -c / b;
    } else {
      const discriminant = b ** 2 - 4 * a * c;
      if (discriminant < 0)
        throw new Error("No real solution exists (negative discriminant).");
      const p1 = (-b + Math.sqrt(discriminant)) / (2 * a);
      const p2 = (-b - Math.sqrt(discriminant)) / (2 * a);

      if (p1 > 0 && p1 < MAX_REASONABLE_TOLL) toll_light = p1;
      else if (p2 > 0 && p2 < MAX_REASONABLE_TOLL) toll_light = p2;
      else throw new Error("No realistic positive solution found.");
    }

    const toll_heavy = toll_light * heavy_toll_factor;
    const traffic_light =
      light_initial_aadt_project *
      (1 + light_elasticity * (toll_light / net_benefit_light));
    const traffic_heavy =
      heavy_initial_aadt_project *
      (1 + heavy_elasticity * (toll_heavy / net_benefit_heavy));

    return {
      status: "Success",
      loan_at_opening,
      gradual_loan_uptake_used: gradual_loan_uptake,
      net_benefit_light,
      net_benefit_heavy,
      toll_light,
      toll_heavy,
      traffic_light_adt: traffic_light,
      traffic_heavy_adt: traffic_heavy,
      total_traffic_adt: traffic_light + traffic_heavy,
    };
  } catch (e) {
    return { status: "Error", message: e.message };
  }
}

class TrafficBenefitCalculator {
  constructor(config, analysis_period = null) {
    this.config = config;
    this.tolls = {};
    this.df = [];
    this.results = {};

    // Handle analysis period override like in Python
    if (analysis_period === null) {
      this._analysis_period = this.config.analysis_period;
      this._lifetime = this.config.lifetime;
      this._scaling = 1;
    } else {
      // This is for parametric input, so NNB can be computed for different time
      // spans without restverdi; this is more optional
      this._analysis_period = analysis_period;
      this._lifetime = this._analysis_period;
      this._scaling = this._analysis_period / this.config.analysis_period;
    }
  }

  run() {
    clearLog();
    log("Start beregning...");
    this.year_npv_series();
    this.estimate_toll_rates_aadt();

    // Check if toll calculation failed - if so, stop here and show error
    console.log("Checking toll calculation status:", this.tolls);
    if (this.tolls.calculation_error) {
      console.log("Toll calculation failed, showing error");
      this.present_error_results();
      log("Beregning stoppet på grunn av bompengeberegningsfeil");
      return;
    }
    console.log("Toll calculation OK, continuing with normal calculation");

    this.traffic_series();
    this.compute_discounted_building_costs();
    this.calculate_traffic_ferry_cost();
    this.calculate_traffic_project_cost();
    this.diff_benefit();
    this.compute_derived_numbers();
    this.present_results();
    this.plot_aadt();
    log("Beregning ferdig!");
  }

  year_npv_series() {
    const {
      construction_period,
      opening_year,
      comparison_year,
      capital_interest_0_40,
      capital_interest_41_75,
      bnp_growth,
    } = this.config;
    const start1 = -construction_period;
    const start2 = opening_year - comparison_year;
    const start = Math.min(start1, start2);
    const end = this._lifetime; // Use instance variable instead of config

    for (let i = start; i <= end; i++) {
      const prj_year = i;
      const comparison_year_offset = prj_year + opening_year - comparison_year;
      const calendar_year = comparison_year_offset + comparison_year;

      let discount_factor;
      if (prj_year <= 40) {
        discount_factor =
          1 / Math.pow(1 + capital_interest_0_40, comparison_year_offset);
      } else {
        const discount_factor_40 = 1 / Math.pow(1 + capital_interest_0_40, 40);
        const additional_years = prj_year - 40;
        discount_factor =
          discount_factor_40 /
          Math.pow(1 + capital_interest_41_75, additional_years);
      }

      const bnp_growth_factor =
        prj_year >= 0 ? Math.pow(1 + bnp_growth, prj_year) : NaN;

      this.df.push({
        PRJ_YEAR: prj_year,
        COMPARISON_YEAR: comparison_year_offset,
        CALENDAR_YEAR: calendar_year,
        DISCOUNT_FACTOR: discount_factor,
        BNP_GROWTH: bnp_growth_factor,
      });
    }
  }

  estimate_toll_rates_aadt() {
    const cfg = this.config;
    if (!cfg.toll.enabled) {
      this.tolls = { aadt_multiplier: 1, cost_light: 0, cost_heavy: 0 };
      log("Beregning uten bompenger");
      return;
    }
    log("Estimerer bompenger og endring i ÅDT");

    if (!cfg.toll.enable_dynamic) {
      // Calculate loan at opening for static tolls too
      const eff_interest =
        (cfg.toll.toll_loan_interest - cfg.toll.inflation_rate) /
        (1 + cfg.toll.inflation_rate);
      let loan_at_opening;
      if (cfg.toll.gradual_loan_uptake) {
        const interest_during_construction =
          cfg.toll.toll_loan * eff_interest * (cfg.construction_period / 2);
        loan_at_opening = cfg.toll.toll_loan + interest_during_construction;
      } else {
        loan_at_opening =
          cfg.toll.toll_loan *
          Math.pow(1 + eff_interest, cfg.construction_period);
      }

      this.tolls = {
        aadt_multiplier: cfg.toll.static.toll_aadt_multiplier,
        cost_light: cfg.toll.static.costs.light,
        cost_heavy: cfg.toll.static.costs.heavy,
        loan_at_opening: loan_at_opening,
      };
      log(`Bruker statiske bompenger: ${JSON.stringify(this.tolls)}`);
      return;
    }

    const eff_interest =
      (cfg.toll.toll_loan_interest - cfg.toll.inflation_rate) /
      (1 + cfg.toll.inflation_rate);
    // Using Fisher equation: real_rate = (nominal_rate - inflation_rate) / (1 + inflation_rate)
    const heavy_share = cfg.traffic.heavy_share;
    const light_share = 1 - heavy_share;

    const leisure_share = cfg.traffic.leisure_share / light_share;
    const work_share = cfg.traffic.work_share / light_share;
    const business_share = cfg.traffic.business_share / light_share;

    const light_vot =
      cfg.time_values.leisure * leisure_share +
      cfg.time_values.work * work_share +
      cfg.time_values.business * business_share;

    // Extract traffic growth from first period in traffic_growth_project
    const getFirstPeriodGrowth = (growthConfig) => {
      if (!growthConfig || Object.keys(growthConfig).length === 0) {
        return 0.0;
      }
      const sortedYears = Object.keys(growthConfig)
        .map(Number)
        .sort((a, b) => a - b);
      const firstYear = sortedYears[0].toString();
      return growthConfig[firstYear];
    };

    const light_traffic_growth = getFirstPeriodGrowth(
      cfg.traffic.traffic_growth_project.light
    );
    const heavy_traffic_growth = getFirstPeriodGrowth(
      cfg.traffic.traffic_growth_project.heavy
    );

    const params = {
      loan_initial: cfg.toll.toll_loan,
      build_years: cfg.construction_period,
      repay_years: cfg.toll.repayment_period,
      interest_rate: eff_interest,
      gradual_loan_uptake: cfg.toll.gradual_loan_uptake,
      extra_dist_km: cfg.vehicle_costs.change_in_road_length,
      light_initial_aadt_project: cfg.traffic.aadt_project * light_share,
      light_time_saving_hr: cfg.ferry.extra_time.leisure,
      light_traffic_growth: light_traffic_growth,
      light_elasticity: cfg.toll.dynamic.elasticity.light,
      light_ferry_price: cfg.ferry.costs.light,
      light_vot: light_vot,
      light_voc: cfg.vehicle_costs.light * cfg.vehicle_costs.speed_factor,
      heavy_initial_aadt_project: cfg.traffic.aadt_project * heavy_share,
      heavy_time_saving_hr: cfg.ferry.extra_time.heavy,
      heavy_traffic_growth: heavy_traffic_growth,
      heavy_elasticity: cfg.toll.dynamic.elasticity.heavy,
      heavy_ferry_price: cfg.ferry.costs.heavy,
      heavy_vot: cfg.time_values.heavy,
      heavy_voc: cfg.vehicle_costs.heavy * cfg.vehicle_costs.speed_factor,
      heavy_toll_factor: cfg.toll.heavy_vehicle_toll_factor,
    };

    const res = calculateTollRates(params);
    if (res.status === "Error") {
      log(`FEIL i bompengeberegning: ${res.message}`);
      // Set toll values to indicate calculation failed
      this.tolls = {
        aadt_multiplier: 1, // No traffic change if calculation failed
        cost_light: null,
        cost_heavy: null,
        loan_at_opening: null,
        calculation_error: res.message,
      };
      return;
    }

    this.tolls.aadt_multiplier =
      res.total_traffic_adt / cfg.traffic.aadt_project;
    this.tolls.cost_light = res.toll_light;
    this.tolls.cost_heavy = res.toll_heavy;
    this.tolls.loan_at_opening = res.loan_at_opening;
    log(
      `Estimerer bompenger og trafikk-avvisning... ${JSON.stringify(
        this.tolls,
        null,
        2
      )}`
    );
  }

  _calculate_traffic_with_periods(base_aadt, growth_config, is_ferry = true) {
    const result = new Array(this.df.length).fill(base_aadt);
    if (!growth_config) return result;

    const sorted_years = Object.keys(growth_config)
      .map(Number)
      .sort((a, b) => a - b);

    const growth_vector = this.df.map((row) => {
      let factor = 0;
      for (const year of sorted_years) {
        if (row.CALENDAR_YEAR >= year) {
          factor = growth_config[year];
        }
      }
      return factor;
    });

    let previous_aadt = base_aadt;
    for (let i = 0; i < this.df.length; i++) {
      const row = this.df[i];
      if (row.PRJ_YEAR < 0) {
        result[i] = NaN;
        previous_aadt = base_aadt;
        continue;
      }
      if (row.PRJ_YEAR === 0) {
        result[i] = base_aadt;
        previous_aadt = base_aadt;
        continue;
      }

      const aadt = previous_aadt * (1 + growth_vector[i]);
      result[i] = aadt;
      previous_aadt = aadt;
    }

    if (!is_ferry) {
      for (let i = 0; i < this.df.length; i++) {
        if (
          this.df[i].PRJ_YEAR >= 0 &&
          this.df[i].PRJ_YEAR <= this.config.toll.repayment_period
        ) {
          result[i] *= this.tolls.aadt_multiplier;
        }
      }
    }
    return result;
  }

  traffic_series() {
    const {
      heavy_share,
      aadt_ferry,
      aadt_project,
      traffic_growth_ferry,
      traffic_growth_project,
    } = this.config.traffic;
    const light_initial_share = 1 - heavy_share;

    ["light", "heavy"].forEach((type) => {
      const share = type === "light" ? light_initial_share : heavy_share;
      const fer_aadt = this._calculate_traffic_with_periods(
        aadt_ferry * share,
        traffic_growth_ferry[type],
        true
      );
      const prj_aadt = this._calculate_traffic_with_periods(
        aadt_project * share,
        traffic_growth_project[type],
        false
      );

      this.df.forEach((row, i) => {
        row[`AADT_FER_${type.toUpperCase()}`] = fer_aadt[i];
        row[`AADT_PRJ_${type.toUpperCase()}`] = prj_aadt[i];
      });
    });

    this.df.forEach((row) => {
      row.AADT_FER = (row.AADT_FER_LIGHT || 0) + (row.AADT_FER_HEAVY || 0);
      if (row.PRJ_YEAR < 0) row.AADT_FER = NaN;
      row.AADT_PRJ = (row.AADT_PRJ_LIGHT || 0) + (row.AADT_PRJ_HEAVY || 0);
    });
  }

  compute_discounted_building_costs() {
    const { toll, construction_cost, vat_construction, construction_period } =
      this.config;
    const toll_loan = toll.enabled ? toll.toll_loan : 0;
    const bcost_ex_vat =
      (construction_cost + toll_loan) / (1 + vat_construction);
    log(
      `Byggekostnader uten moms: ${bcost_ex_vat.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      })} NOK`
    );

    const yearly_cost = bcost_ex_vat / construction_period;
    let discounted_bcost = 0;
    this.df.forEach((row) => {
      if (row.PRJ_YEAR < 0 && row.PRJ_YEAR >= -construction_period) {
        discounted_bcost += yearly_cost * row.DISCOUNT_FACTOR;
      }
    });

    this.results.construction_cost = discounted_bcost;
    log(
      `Byggekostnad diskontert til sammenligningsår (inkl kapitalkostnader, eksl. moms): ${discounted_bcost.toLocaleString(
        "en-US",
        {
          maximumFractionDigits: 0,
        }
      )} NOK`
    );
  }

  calculate_traffic_ferry_cost() {
    const { ferry, time_values } = this.config;
    ["leisure", "work", "business", "heavy"].forEach((purpose) => {
      const ferry_cost =
        purpose === "heavy" ? ferry.costs.heavy : ferry.costs.light;
      this.df.forEach((row) => {
        row[`FER_COST_${purpose.toUpperCase()}`] =
          ferry_cost +
          ferry.extra_time[purpose] *
            time_values[purpose] *
            row.BNP_GROWTH *
            ferry.comfort_factor;
      });
    });
  }

  calculate_traffic_project_cost() {
    const { vehicle_costs, toll } = this.config;
    ["leisure", "work", "business", "heavy"].forEach((purpose) => {
      const voc =
        purpose === "heavy" ? vehicle_costs.heavy : vehicle_costs.light;
      const toll_cost = !toll.enabled
        ? 0
        : purpose === "heavy"
        ? this.tolls.cost_heavy
        : this.tolls.cost_light;

      this.df.forEach((row) => {
        if (row.PRJ_YEAR < 0) {
          row[`PRJ_COST_${purpose.toUpperCase()}`] = NaN;
        } else {
          row[`PRJ_COST_${purpose.toUpperCase()}`] =
            voc *
              vehicle_costs.speed_factor *
              vehicle_costs.change_in_road_length +
            toll_cost;
        }
      });
    });
  }

  diff_benefit() {
    ["leisure", "work", "business", "heavy"].forEach((purpose) => {
      const aadt_fer_name = `AADT_FER_${
        purpose === "heavy" ? "HEAVY" : "LIGHT"
      }`;
      const aadt_prj_name = `AADT_PRJ_${
        purpose === "heavy" ? "HEAVY" : "LIGHT"
      }`;

      this.df.forEach((row) => {
        const benefit_existing =
          (row[`FER_COST_${purpose.toUpperCase()}`] -
            row[`PRJ_COST_${purpose.toUpperCase()}`]) *
          row[aadt_fer_name] *
          365;
        const benefit_added =
          (row[`FER_COST_${purpose.toUpperCase()}`] -
            row[`PRJ_COST_${purpose.toUpperCase()}`]) *
          (row[aadt_prj_name] - row[aadt_fer_name]) *
          365 *
          ADDED_TRAFFIC_BENEFIT_FACTOR;
        row[`DIFF_BENEFIT_${purpose.toUpperCase()}`] =
          benefit_existing + benefit_added;
      });
    });

    const light_share_total = 1 - this.config.traffic.heavy_share;
    const light_shares = {
      leisure: this.config.traffic.leisure_share / light_share_total,
      work: this.config.traffic.work_share / light_share_total,
      business: this.config.traffic.business_share / light_share_total,
    };

    this.df.forEach((row) => {
      let weighted_benefit = 0;
      ["leisure", "work", "business"].forEach((purpose) => {
        weighted_benefit +=
          row[`DIFF_BENEFIT_${purpose.toUpperCase()}`] * light_shares[purpose];
      });
      weighted_benefit += row.DIFF_BENEFIT_HEAVY;
      row.DIFF_BENEFIT_WEIGHTED = weighted_benefit;

      let discounted_benefit = row.DIFF_BENEFIT_WEIGHTED * row.DISCOUNT_FACTOR;
      if (row.PRJ_YEAR < 0 || row.PRJ_YEAR >= this._analysis_period) {
        discounted_benefit = 0;
      }
      row.DIFF_BENEFIT_WEIGHTED_DISCOUNTED = discounted_benefit;
    });
  }

  _calculate_tax_revenue() {
    let total_tax_revenue = 0;
    const { toll, vat_general, vehicle_costs, ferry } = this.config;
    const analysis_period = this._analysis_period; // Use instance variable
    const mask = (row) => row.PRJ_YEAR >= 0 && row.PRJ_YEAR < analysis_period;

    const filtered_df = this.df.filter(mask);

    // 1. Toll tax
    let toll_tax_discounted = 0;
    if (toll.enabled) {
      const toll_revenue = filtered_df.reduce((sum, row) => {
        const light = row.AADT_PRJ_LIGHT * this.tolls.cost_light * 365;
        const heavy = row.AADT_PRJ_HEAVY * this.tolls.cost_heavy * 365;
        return sum + (light + heavy) * row.DISCOUNT_FACTOR;
      }, 0);
      toll_tax_discounted = toll_revenue * vat_general;
      total_tax_revenue += toll_tax_discounted;
    }

    // 2. Vehicle fuel tax
    let vehicle_cost_tax_component = 0;
    if (vehicle_costs.change_in_road_length > 0) {
      const extra_costs = filtered_df.reduce((sum, row) => {
        const light =
          row.AADT_PRJ_LIGHT *
          365 *
          vehicle_costs.change_in_road_length *
          vehicle_costs.light *
          vehicle_costs.speed_factor;
        const heavy =
          row.AADT_PRJ_HEAVY *
          365 *
          vehicle_costs.change_in_road_length *
          vehicle_costs.heavy *
          vehicle_costs.speed_factor;
        return sum + (light + heavy) * row.DISCOUNT_FACTOR;
      }, 0);
      vehicle_cost_tax_component = extra_costs * 0.2; // Fuel tax component
      total_tax_revenue += vehicle_cost_tax_component;
    }

    // 3. Ferry VAT loss
    const ferry_revenue = filtered_df.reduce((sum, row) => {
      const light = row.AADT_FER_LIGHT * ferry.costs.light * 365;
      const heavy = row.AADT_FER_HEAVY * ferry.costs.heavy * 365;
      return sum + (light + heavy) * row.DISCOUNT_FACTOR;
    }, 0);
    const ferry_vat_loss_discounted = ferry_revenue * vat_general;
    total_tax_revenue -= ferry_vat_loss_discounted;

    // 4. Economic activity tax
    const time_savings_tax = filtered_df.reduce((sum, row) => {
      return (
        sum + row.DIFF_BENEFIT_WEIGHTED * 0.02 * 0.22 * row.DISCOUNT_FACTOR
      );
    }, 0);
    total_tax_revenue += time_savings_tax;

    this.results.tax_breakdown = {
      toll_tax_discounted,
      vehicle_cost_tax_component,
      ferry_vat_loss_discounted,
      time_savings_tax_discounted: time_savings_tax,
      total_tax_revenue,
    };

    return total_tax_revenue + this.config.other.tax_income_correction;
  }

  compute_derived_numbers() {
    const { annual_maintenance, annual_ferry_subsidy } = this.config;
    const analysis_period = this._analysis_period; // Use instance variable
    const lifetime = this._lifetime; // Use instance variable
    const mask = (row) => row.PRJ_YEAR >= 0 && row.PRJ_YEAR < analysis_period;
    const filtered_df = this.df.filter(mask);

    this.results.traffic_benefit = this.df.reduce(
      (sum, row) => sum + row.DIFF_BENEFIT_WEIGHTED_DISCOUNTED,
      0
    );
    this.results.dv_costs = filtered_df.reduce(
      (sum, row) => sum + annual_maintenance * row.DISCOUNT_FACTOR,
      0
    );
    this.results.ferry_subsidy_costs = filtered_df.reduce(
      (sum, row) => sum + annual_ferry_subsidy * row.DISCOUNT_FACTOR,
      0
    );
    this.results.tax_revenue = this._calculate_tax_revenue();

    const last_year_benefit_row = this.df.find(
      (row) => row.PRJ_YEAR === analysis_period
    );
    const last_year_benefit = last_year_benefit_row
      ? last_year_benefit_row.DIFF_BENEFIT_WEIGHTED
      : 0;

    this.results.restverdi = this.df
      .filter(
        (row) => row.PRJ_YEAR > analysis_period && row.PRJ_YEAR < lifetime
      )
      .reduce((sum, row) => sum + last_year_benefit * row.DISCOUNT_FACTOR, 0);
  }

  calculate_summary_results() {
    const { other, tax_factor } = this.config;
    const res = this.results;

    // Traffic and transport users
    // Traffic benefit is already calculated with correct period, no scaling needed
    const sum_traffic = res.traffic_benefit + other.health_gs * this._scaling;
    const sum_operators = other.operators_sum * this._scaling;

    // Public sector
    // These are already calculated with correct analysis period, no scaling needed
    const sum_public =
      res.construction_cost +
      res.dv_costs +
      res.ferry_subsidy_costs +
      res.tax_revenue;

    // Rest of society
    const tax_cost = tax_factor * sum_public; // No scaling - calculated from actual public costs
    const sum_the_rest =
      other.accidents * this._scaling + // Scale with analysis period
      other.ghg_emissions * this._scaling + // Scale with analysis period
      other.other_env_costs * this._scaling + // Scale with analysis period
      res.restverdi + // No scaling - already calculated correctly
      tax_cost; // No scaling - based on actual public costs

    // Total net benefit
    const sum_all = sum_traffic + sum_operators + sum_public + sum_the_rest;
    const nnb = sum_public !== 0 ? sum_all / -sum_public : 0;

    return {
      sum_traffic,
      sum_operators,
      sum_public,
      sum_the_rest,
      sum_all,
      nnb,
      tax_cost,
    };
  }

  getTollSummaryHtml() {
    const { toll } = this.config;

    if (!toll.enabled) {
      return "<p><strong>Bompengesammendrag:</strong> Bompenger deaktivert</p>";
    }

    // Check if toll calculation failed
    if (this.tolls.calculation_error) {
      return `<p><strong>Bompengeberegning mislyktes:</strong> Ingen realistisk løsning funnet.</p>`;
    }

    const lightToll = this.tolls.cost_light;
    const heavyToll = this.tolls.cost_heavy;
    const heavyShare = this.config.traffic.heavy_share;
    const lightShare = 1 - heavyShare;

    // Calculate traffic-weighted average toll
    const averageToll = lightToll * lightShare + heavyToll * heavyShare;

    const f = (num) => Math.round(num).toLocaleString("no-NO");
    const fb = (num) => Math.round(num / 1e9).toLocaleString("no-NO");

    return `
      <div class="toll-summary">
        <h4>Bompengesammendrag</h4>
        <table class="results-table">
          <tr>
            <td>Bompris personbil:</td>
            <td>${f(lightToll)} NOK</td>
          </tr>
          <tr>
            <td>Bompris tungbil:</td>
            <td>${f(heavyToll)} NOK</td>
          </tr>
          <tr>
            <td>Trafikkvektet gjennomsnittsbompris:</td>
            <td><strong>${f(averageToll)} NOK</strong></td>
          </tr>
          <tr>
            <td>Bompengelån ved åpning:</td>
            <td><strong>${fb(
              this.tolls.loan_at_opening || toll.toll_loan
            )} mrd NOK</strong></td>
          </tr>
          <tr>
            <td>Trafikkendringsfaktor:</td>
            <td>${(this.tolls.aadt_multiplier * 100).toFixed(1)}%</td>
          </tr>
        </table>
      </div>
    `;
  }

  present_error_results() {
    const errorMessage =
      this.tolls.calculation_error || "Ukjent feil i bompengeberegning";
    $("#summary-results").innerHTML = `
      <div class="error-summary" style="padding: 20px; background-color: #ffe6e6; border: 1px solid #ff9999; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #cc0000; margin-top: 0;">Beregning kunne ikke fullføres</h3>
        <p><strong>Bompengeberegning mislyktes:</strong> Ingen realistisk løsning funnet.</p>
        <p style="font-size: 0.9em; color: #666;">
          Dette skjer vanligvis når bomprisen som kreves for å finansiere prosjektet er så høy 
          at trafikken ville reduseres mer enn det som er praktisk mulig.
        </p>
      </div>
    `;

    // Clear any existing charts
    if (window.chartAADT) {
      window.chartAADT.destroy();
      window.chartAADT = null;
    }
    if (window.chartNNB) {
      window.chartNNB.destroy();
      window.chartNNB = null;
    }
    if (typeof aadtChart !== "undefined" && aadtChart) {
      aadtChart.destroy();
      aadtChart = null;
    }

    // Clear all other result sections - with null checks
    const resultsTable = $("#results-table");
    if (resultsTable) resultsTable.innerHTML = "";

    const taxBreakdown = $("#tax-breakdown");
    if (taxBreakdown) taxBreakdown.innerHTML = "";

    const chartContainer = $("#chart-container");
    if (chartContainer) chartContainer.innerHTML = "";

    const nnbRatioChart = $("#nnb-ratio-chart");
    if (nnbRatioChart) nnbRatioChart.innerHTML = "";

    const netBenefitChart = $("#net-benefit-chart");
    if (netBenefitChart) netBenefitChart.innerHTML = "";

    // Hide the reference comparison section
    const referenceSection = $("#reference-section");
    if (referenceSection) {
      referenceSection.style.display = "none";
    }

    // Hide the NNB analysis button and its container
    const nnbBtn = document.getElementById("nnb-analysis-btn");
    if (nnbBtn) {
      nnbBtn.style.display = "none";
      // Also hide the parent container
      if (nnbBtn.parentNode) {
        nnbBtn.parentNode.style.display = "none";
      }
    }
  }

  present_results() {
    const { price_level } = this.config;
    const res = this.results;
    const f = (num) => Math.round(num / 1000).toLocaleString("en-US");
    const qq = (num) => (num / 1e9).toFixed(2);

    // Calculate summary results
    const summary = this.calculate_summary_results();

    // Summary with prominent NNB display
    const nnbColor = summary.nnb >= 0 ? "#1976d2" : "#d32f2f"; // Blue for positive, red for negative
    $("#summary-results").innerHTML = `
            <div style="text-align: center; margin-bottom: 2em; padding: 1.5em; background: #f8f9fa; border-radius: 8px; border: 2px solid ${nnbColor};">
                <h2 style="margin: 0 0 0.5em 0; color: ${nnbColor}; font-size: 2.5em;">NNB: ${summary.nnb.toFixed(
      2
    )} (${qq(summary.sum_all)} MRD NOK)</h2>
                <p style="margin: 0; font-size: 1.1em; color: #666;">Netto nytte per budsjettkrone (netto nytte)</p>
            </div>
            <h3>Nøkkeltall (diskontert til sammenligningsår)</h3>
            <p><strong>Total trafikkantnytte:</strong> ${res.traffic_benefit.toLocaleString(
              "en-US",
              { maximumFractionDigits: 0 }
            )}</p>
            <p><strong>Total Byggekostander (eksl. MVA):</strong> ${res.construction_cost.toLocaleString(
              "en-US",
              { maximumFractionDigits: 0 }
            )}</p>
            <p><strong>Totalt D&V utgifter:</strong> ${res.dv_costs.toLocaleString(
              "en-US",
              { maximumFractionDigits: 0 }
            )}</p>
            <p><strong>Restverdi:</strong> ${res.restverdi.toLocaleString(
              "en-US",
              { maximumFractionDigits: 0 }
            )}</p>
            ${this.getTollSummaryHtml()}
        `;

    // Main Table
    $("#results-table").innerHTML = `
            <h3>Resultater (i 1000, ${price_level} NOK)</h3>
            <table>
                <tr class="header-row"><th colspan="2">Component</th><th>Value</th></tr>

                <tr><th colspan="3">Trafikkanter</th></tr>
                <tr><td>Trafikkantnytte:</td><td colspan="1"></td><td>${f(
                  res.traffic_benefit
                )}</td></tr>
                <tr><td>Helsevirkninger GS*:</td><td colspan="1"></td><td>${f(
                  this.config.other.health_gs
                )}</td></tr>
                <tr class="sum-row"><td>SUM TRAFIKKANTER:</td><td colspan="1"></td><td>${f(
                  summary.sum_traffic
                )}</td></tr>

                <tr><th colspan="3">Operators</th></tr>
                <tr class="sum-row"><td>SUM OPERATORS*:</td><td colspan="1"></td><td>${f(
                  summary.sum_operators
                )}</td></tr>

                <tr><th colspan="3">Det offentlige</th></tr>
                <tr><td>Investeringer:</td><td colspan="1"></td><td>${f(
                  res.construction_cost
                )}</td></tr>
                <tr><td>Drift og vedlikehold:</td><td colspan="1"></td><td>${f(
                  res.dv_costs
                )}</td></tr>
                <tr><td>Overføringer (operatører):</td><td colspan="1"></td><td>${f(
                  res.ferry_subsidy_costs
                )}</td></tr>
                <tr><td>Skatte- og avgiftsinntekter*:</td><td colspan="1"></td><td>${f(
                  res.tax_revenue
                )}</td></tr>
                <tr class="sum-row"><td>SUM DET OFFENTLIGE:</td><td colspan="1"></td><td>${f(
                  summary.sum_public
                )}</td></tr>

                <tr><th colspan="3">Samfunnet forøvrig</th></tr>
                <tr><td>Ulykker:</td><td colspan="1"></td><td>${f(
                  this.config.other.accidents
                )}</td></tr>
                <tr><td>Klimagassutslipp:</td><td colspan="1"></td><td>${f(
                  this.config.other.ghg_emissions
                )}</td></tr>
                <tr><td>Andre miljøkostnader:</td><td colspan="1"></td><td>${f(
                  this.config.other.other_env_costs
                )}</td></tr>
                <tr><td>Restverdi:</td><td colspan="1"></td><td>${f(
                  res.restverdi
                )}</td></tr>
                <tr><td>Skattekostnad:</td><td colspan="1"></td><td>${f(
                  summary.tax_cost
                )}</td></tr>
                <tr class="sum-row"><td>SUM SAMFUNNET FORØVRIG:</td><td colspan="1"></td><td>${f(
                  summary.sum_the_rest
                )}</td></tr>

                <tr class="header-row"><th colspan="2">Netto nytte</th><th></th></tr>
                <tr class="sum-row"><td>Netto nytte:</td><td colspan="1"></td><td>${f(
                  summary.sum_all
                )}</td></tr>
                <tr class="sum-row"><td>NNB (Netto nytte per budsjettkrone):</td><td colspan="1"></td><td>${summary.nnb.toFixed(
                  2
                )}</td></tr>
            </table>
        `;

    // Tax Breakdown
    const tax = this.results.tax_breakdown;
    $("#tax-breakdown").innerHTML = `
            <h3>Skatter og avgifter (diskontert)</h3>
            <table>
                <tr><td>1. Bompenger (MVA)</td><td>${tax.toll_tax_discounted.toLocaleString(
                  "en-US",
                  { maximumFractionDigits: 0 }
                )}</td></tr>
                <tr><td>2. Kjøretøykostnader (avgifter estimert)</td><td>${tax.vehicle_cost_tax_component.toLocaleString(
                  "en-US",
                  { maximumFractionDigits: 0 }
                )}</td></tr>
                <tr><td>3. Fergebillett (MVA)</td><td>${(-tax.ferry_vat_loss_discounted).toLocaleString(
                  "en-US",
                  { maximumFractionDigits: 0 }
                )}</td></tr>
                <tr><td>4. Økonomiaks aktivitet (fra spart tid)</td><td>${tax.time_savings_tax_discounted.toLocaleString(
                  "en-US",
                  { maximumFractionDigits: 0 }
                )}</td></tr>
                <tr class="sum-row"><td><strong>Totalt</strong></td><td><strong>${tax.total_tax_revenue.toLocaleString(
                  "en-US",
                  { maximumFractionDigits: 0 }
                )}</strong></td></tr>
            </table>
        `;

    $("#results").classList.remove("hidden");
  }

  plot_aadt() {
    // Destroy existing chart if it exists
    if (aadtChart) {
      aadtChart.destroy();
      aadtChart = null;
    }

    const plot_data = this.df.filter(
      (row) => !isNaN(row.AADT_FER) && !isNaN(row.AADT_PRJ)
    );
    const options = {
      chart: { type: "line", height: 400 },
      series: [
        {
          name: "Ferge ÅDT",
          data: plot_data.map((d) => [d.CALENDAR_YEAR, d.AADT_FER]),
        },
        {
          name: "Prosjekt ÅDT",
          data: plot_data.map((d) => [d.CALENDAR_YEAR, d.AADT_PRJ]),
        },
      ],
      xaxis: {
        type: "numeric",
        title: { text: "År" },
        min: this.config.comparison_year,
        labels: {
          formatter: function (val) {
            return Math.round(val).toString();
          },
        },
        tickAmount: undefined, // Let ApexCharts decide the optimal number of ticks
        forceNiceScale: true,
      },
      yaxis: {
        title: { text: "Årsdøgntrafikk (ÅDT)" },
        labels: { formatter: (val) => val.toLocaleString() },
      },
      stroke: { width: 2, curve: "smooth" },
      markers: { size: 4 },
      legend: { position: "top" },
      grid: {
        borderColor: "#f1f1f1",
      },
    };

    $("#chart-container").innerHTML = "";
    aadtChart = new ApexCharts($("#chart-container"), options);
    aadtChart.render();
  }

  // New method: NNB analysis over different time periods (like Python nnb_graph)
  static nnb_analysis_plot(baseConfig) {
    const years = [];
    const nnb_values = [];
    const net_benefits = [];

    log("Starter NNB-analyse over ulike analyseperioder...");

    // Run calculations for different analysis periods
    for (let year = 20; year <= 100; year += 5) {
      // Don't modify the original config - pass analysis_period as separate parameter
      const calc = new TrafficBenefitCalculator(baseConfig, year);

      // Run all calculations silently
      calc.year_npv_series();
      calc.estimate_toll_rates_aadt();
      calc.traffic_series();
      calc.compute_discounted_building_costs();
      calc.calculate_traffic_ferry_cost();
      calc.calculate_traffic_project_cost();
      calc.diff_benefit();
      calc.compute_derived_numbers();

      const summary = calc.calculate_summary_results();

      years.push(year);
      nnb_values.push(summary.nnb);
      net_benefits.push(summary.sum_all / 1e9); // Convert to billions

      log(
        `${year} år: NNB=${summary.nnb.toFixed(3)} (nytte: ${(
          summary.sum_all / 1e9
        ).toFixed(0)} MRD)`
      );
    }

    // Create the NNB analysis charts
    TrafficBenefitCalculator.create_nnb_charts(years, nnb_values, net_benefits);

    return { years, nnb_values, net_benefits };
  }

  static create_nnb_charts(years, nnb_values, net_benefits) {
    // Create container for NNB charts if it doesn't exist
    let nnbContainer = $("#nnb-chart-container");
    if (!nnbContainer) {
      nnbContainer = document.createElement("div");
      nnbContainer.id = "nnb-chart-container";
      nnbContainer.innerHTML = `
        <h3>NNB-analyse over ulike analyseperioder (uten restverdi)</h3>
        <div id="nnb-ratio-chart" style="margin-bottom: 20px;"></div>
        <div id="net-benefit-chart"></div>
      `;
      $("#results").appendChild(nnbContainer);
    }

    // NNB Ratio Chart
    const nnbOptions = {
      chart: { type: "line", height: 350 },
      series: [
        {
          name: "NNB (Netto Nytte per Budsjettkrone)",
          data: years.map((year, i) => [year, nnb_values[i]]),
        },
      ],
      xaxis: {
        type: "numeric",
        title: { text: "Analyseperiode (år)" },
      },
      yaxis: {
        title: { text: "NNB" },
        labels: { formatter: (val) => val.toFixed(2) },
      },
      stroke: { width: 3, curve: "straight" },
      markers: { size: 6 },
      colors: ["#1976d2"],
      grid: { borderColor: "#f1f1f1" },
      annotations: {
        yaxis: [
          {
            y: 0,
            borderColor: "#d32f2f",
            borderWidth: 2,
            strokeDashArray: 5,
            label: {
              text: "Break-even",
              style: { color: "#d32f2f" },
            },
          },
        ],
      },
      title: {
        text: "NNB vs analyseperiode",
        align: "center",
      },
    };

    // Net Benefit Chart
    const benefitOptions = {
      chart: { type: "line", height: 350 },
      series: [
        {
          name: "Netto Nytte (milliarde NOK)",
          data: years.map((year, i) => [year, net_benefits[i]]),
        },
      ],
      xaxis: {
        type: "numeric",
        title: { text: "Analyseperiode (år)" },
      },
      yaxis: {
        title: { text: "Netto Nytte (milliarde NOK)" },
        labels: { formatter: (val) => val.toFixed(1) },
      },
      stroke: { width: 3, curve: "straight" },
      markers: { size: 6 },
      colors: ["#388e3c"],
      grid: { borderColor: "#f1f1f1" },
      annotations: {
        yaxis: [
          {
            y: 0,
            borderColor: "#d32f2f",
            borderWidth: 2,
            strokeDashArray: 5,
            label: {
              text: "Break-even",
              style: { color: "#d32f2f" },
            },
          },
        ],
      },
      title: {
        text: "Netto nytte vs analyseperiode",
        align: "center",
      },
    };

    // Destroy existing charts if they exist
    if (nnbRatioChart) {
      nnbRatioChart.destroy();
      nnbRatioChart = null;
    }
    if (netBenefitChart) {
      netBenefitChart.destroy();
      netBenefitChart = null;
    }

    // Render the charts
    $("#nnb-ratio-chart").innerHTML = "";
    $("#net-benefit-chart").innerHTML = "";

    nnbRatioChart = new ApexCharts($("#nnb-ratio-chart"), nnbOptions);
    netBenefitChart = new ApexCharts($("#net-benefit-chart"), benefitOptions);

    nnbRatioChart.render();
    netBenefitChart.render();
  }
}

// --- EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
  // Initialize slider functionality
  initializeSliders();

  // Initialize traffic growth tables
  initializeTrafficGrowthTables();

  $("#calculate-btn").addEventListener("click", () => {
    try {
      const config = getFormData();
      const calculator = new TrafficBenefitCalculator(config);
      calculator.run();
    } catch (error) {
      log(`En kritisk feil skjedde: ${error.message}`);
      console.error(error);
    }
  });

  // Add NNB Analysis button functionality
  const nnbAnalysisBtn = document.createElement("button");
  nnbAnalysisBtn.id = "nnb-analysis-btn";
  nnbAnalysisBtn.textContent = "Kjør NNB-analyse uten restverdi over tid";
  nnbAnalysisBtn.style.cssText = `
    display: block;
    margin: 20px auto;
    padding: 12px 24px;
    background-color: #ff9800;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
  `;
  nnbAnalysisBtn.style.display = "none"; // Initially hidden

  // Add hover effect
  nnbAnalysisBtn.addEventListener("mouseenter", () => {
    if (!nnbAnalysisBtn.disabled) {
      nnbAnalysisBtn.style.backgroundColor = "#f57c00";
      nnbAnalysisBtn.style.transform = "translateY(-1px)";
      nnbAnalysisBtn.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
    }
  });

  nnbAnalysisBtn.addEventListener("mouseleave", () => {
    if (!nnbAnalysisBtn.disabled) {
      nnbAnalysisBtn.style.backgroundColor = "#ff9800";
      nnbAnalysisBtn.style.transform = "translateY(0)";
      nnbAnalysisBtn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
    }
  });

  // Add the button to a container that centers it
  const buttonContainer = document.createElement("div");
  buttonContainer.style.cssText = `
    text-align: center;
    margin: 20px 0;
  `;
  buttonContainer.appendChild(nnbAnalysisBtn);

  // Add the container after the calculate button's parent
  const calculateBtn = $("#calculate-btn");
  if (calculateBtn && calculateBtn.parentNode) {
    calculateBtn.parentNode.parentNode.insertBefore(
      buttonContainer,
      calculateBtn.parentNode.nextSibling
    );
  }

  nnbAnalysisBtn.addEventListener("click", () => {
    try {
      // Disable button and grey it out
      nnbAnalysisBtn.disabled = true;
      nnbAnalysisBtn.style.backgroundColor = "#9e9e9e";
      nnbAnalysisBtn.style.color = "#ffffff";
      nnbAnalysisBtn.style.cursor = "not-allowed";
      nnbAnalysisBtn.style.transform = "none";
      nnbAnalysisBtn.style.boxShadow = "0 1px 2px rgba(0,0,0,0.1)";
      nnbAnalysisBtn.textContent = "Kjører analyse...";

      const config = getFormData();
      log("Starter omfattende NNB-analyse...");

      // Use setTimeout to allow UI to update before heavy calculation
      setTimeout(() => {
        try {
          TrafficBenefitCalculator.nnb_analysis_plot(config);
          log("NNB-analyse fullført!");

          // Update button text but keep it disabled
          nnbAnalysisBtn.textContent = "NNB-analyse fullført";
        } catch (error) {
          log(`Feil i NNB-analyse: ${error.message}`);
          console.error(error);

          // Re-enable button on error
          nnbAnalysisBtn.disabled = false;
          nnbAnalysisBtn.style.backgroundColor = "#ff9800";
          nnbAnalysisBtn.style.color = "white";
          nnbAnalysisBtn.style.cursor = "pointer";
          nnbAnalysisBtn.textContent = "Kjør NNB-analyse over tid";
        }
      }, 100);
    } catch (error) {
      log(`Feil i NNB-analyse: ${error.message}`);
      console.error(error);
    }
  });

  // Show NNB analysis button after first calculation
  const originalRun = TrafficBenefitCalculator.prototype.run;
  TrafficBenefitCalculator.prototype.run = function () {
    originalRun.call(this);
    // Only show button if calculation was successful (no error)
    if (!this.tolls.calculation_error) {
      nnbAnalysisBtn.style.display = "inline-block";
      // Also show the parent container in case it was hidden
      if (nnbAnalysisBtn.parentNode) {
        nnbAnalysisBtn.parentNode.style.display = "block";
      }
      // Show the reference section again
      const referenceSection = $("#reference-section");
      if (referenceSection) {
        referenceSection.style.display = "block";
      }
    }
  };

  // Function to clear NNB charts and reset button when form data changes
  function resetNNBAnalysis() {
    console.log("NNB analysis reset triggered"); // Debug log

    // Destroy existing NNB charts
    if (nnbRatioChart) {
      nnbRatioChart.destroy();
      nnbRatioChart = null;
      console.log("NNB ratio chart destroyed"); // Debug log
    }
    if (netBenefitChart) {
      netBenefitChart.destroy();
      netBenefitChart = null;
      console.log("Net benefit chart destroyed"); // Debug log
    }

    // Remove NNB chart container
    const nnbContainer = $("#nnb-chart-container");
    if (nnbContainer) {
      nnbContainer.remove();
      console.log("NNB chart container removed"); // Debug log
    }

    // Reset button state only if it exists and was previously disabled
    if (
      nnbAnalysisBtn &&
      (nnbAnalysisBtn.disabled ||
        nnbAnalysisBtn.textContent === "NNB-analyse fullført")
    ) {
      nnbAnalysisBtn.disabled = false;
      nnbAnalysisBtn.style.backgroundColor = "#ff9800";
      nnbAnalysisBtn.style.color = "white";
      nnbAnalysisBtn.style.cursor = "pointer";
      nnbAnalysisBtn.style.transform = "scale(1)";
      nnbAnalysisBtn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
      nnbAnalysisBtn.textContent = "Kjør NNB-analyse uten restverdi over tid";
      console.log("NNB analysis button reset"); // Debug log
    }
  }

  // Make resetNNBAnalysis globally accessible
  window.resetNNBAnalysis = resetNNBAnalysis;

  // Add event listeners to all form inputs to reset NNB analysis when values change
  const form = $("#cba-form");
  const inputs = form.querySelectorAll("input, textarea");
  inputs.forEach((input) => {
    input.addEventListener("input", resetNNBAnalysis);
    input.addEventListener("change", resetNNBAnalysis);
  });
});

// Slider functionality for vehicle shares that always sum to 100%
function initializeSliders() {
  const sliders = {
    heavy_share: $("#heavy_share"),
    leisure_share: $("#leisure_share"),
    work_share: $("#work_share"),
    business_share: $("#business_share"),
  };

  const displays = {
    heavy_share: $("#heavy_share_display"),
    leisure_share: $("#leisure_share_display"),
    work_share: $("#work_share_display"),
    business_share: $("#business_share_display"),
  };

  // Check if all elements exist
  const missingElements = [];
  Object.keys(sliders).forEach((key) => {
    if (!sliders[key]) missingElements.push(`slider: ${key}`);
    if (!displays[key]) missingElements.push(`display: ${key}_display`);
  });

  if (missingElements.length > 0) {
    console.log("Missing slider elements:", missingElements);
    return; // Don't initialize if elements are missing
  }

  // Update display values initially
  updateDisplays();

  // Add event listeners to all sliders
  Object.keys(sliders).forEach((key) => {
    sliders[key].addEventListener("input", (e) => {
      handleSliderChange(key, parseFloat(e.target.value));
    });
  });

  function handleSliderChange(changedSlider, newValue) {
    const currentValues = {
      heavy_share: parseFloat(sliders.heavy_share.value),
      leisure_share: parseFloat(sliders.leisure_share.value),
      work_share: parseFloat(sliders.work_share.value),
      business_share: parseFloat(sliders.business_share.value),
    };

    // Update the changed slider value
    currentValues[changedSlider] = newValue;

    // Calculate total
    const total = Object.values(currentValues).reduce(
      (sum, val) => sum + val,
      0
    );

    // Always ensure total equals 100% by adjusting other sliders proportionally
    if (total !== 100 && total > 0) {
      const otherSliders = Object.keys(currentValues).filter(
        (key) => key !== changedSlider
      );
      const otherTotal = otherSliders.reduce(
        (sum, key) => sum + currentValues[key],
        0
      );

      // Calculate how much the other sliders need to sum to
      const targetOtherTotal = 100 - newValue;

      if (targetOtherTotal >= 0 && otherTotal > 0) {
        // Proportionally scale the other sliders
        const scaleFactor = targetOtherTotal / otherTotal;
        otherSliders.forEach((key) => {
          currentValues[key] = Math.max(0, currentValues[key] * scaleFactor);
        });
      } else if (targetOtherTotal < 0) {
        // If the changed slider is > 100, set it to 100 and others to 0
        currentValues[changedSlider] = 100;
        otherSliders.forEach((key) => {
          currentValues[key] = 0;
        });
      } else if (otherTotal === 0 && targetOtherTotal > 0) {
        // If other sliders are 0 but we need them to have some value,
        // distribute equally among them
        const equalShare = targetOtherTotal / otherSliders.length;
        otherSliders.forEach((key) => {
          currentValues[key] = equalShare;
        });
      }
    }

    // Update all slider values (round to nearest integer)
    Object.keys(currentValues).forEach((key) => {
      const roundedValue = Math.round(currentValues[key]);
      sliders[key].value = roundedValue;
    });

    updateDisplays();
  }

  function updateDisplays() {
    Object.keys(displays).forEach((key) => {
      displays[key].textContent = `${sliders[key].value}%`;
    });
  }
}

// --- TRAFFIC GROWTH TABLE FUNCTIONS ---
function initializeTrafficGrowthTables() {
  // Initialize all traffic growth tables
  const tables = [
    { tableId: "ferry-light-table", textareaId: "ferry_growth_light" },
    { tableId: "ferry-heavy-table", textareaId: "ferry_growth_heavy" },
    { tableId: "project-light-table", textareaId: "project_growth_light" },
    { tableId: "project-heavy-table", textareaId: "project_growth_heavy" },
  ];

  tables.forEach(({ tableId, textareaId }) => {
    populateTrafficGrowthTable(tableId, textareaId);
  });
}

function populateTrafficGrowthTable(tableId, textareaId) {
  const table = document.getElementById(tableId);
  const textarea = document.getElementById(textareaId);

  if (!table || !textarea) return;

  try {
    const data = JSON.parse(textarea.value);

    // Clear existing rows (keep header)
    const existingRows = table.querySelectorAll(".traffic-growth-row");
    existingRows.forEach((row) => row.remove());

    // Add rows for each year/rate pair
    Object.entries(data).forEach(([year, rate]) => {
      addTrafficGrowthRowWithData(tableId, textareaId, year, rate * 100); // Convert to percentage
    });
  } catch (e) {
    console.error("Error parsing traffic growth data:", e);
  }
}

function addTrafficGrowthRow(tableId, textareaId) {
  addTrafficGrowthRowWithData(tableId, textareaId, "", "");
}

function addTrafficGrowthRowWithData(
  tableId,
  textareaId,
  year = "",
  rate = ""
) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const row = document.createElement("div");
  row.className = "traffic-growth-row";

  row.innerHTML = `
    <input type="number" placeholder="År" value="${year}" min="2020" max="2100" 
           onchange="updateTrafficGrowthData('${tableId}', '${textareaId}')">
    <input type="number" placeholder="%" value="${rate}" step="0.01" 
           onchange="updateTrafficGrowthData('${tableId}', '${textareaId}')">
    <button type="button" onclick="removeTrafficGrowthRow(this, '${tableId}', '${textareaId}')">
      Slett
    </button>
  `;

  table.appendChild(row);
  updateTrafficGrowthData(tableId, textareaId);
}

function removeTrafficGrowthRow(button, tableId, textareaId) {
  const row = button.parentElement;
  row.remove();
  updateTrafficGrowthData(tableId, textareaId);
}

function updateTrafficGrowthData(tableId, textareaId) {
  const table = document.getElementById(tableId);
  const textarea = document.getElementById(textareaId);

  if (!table || !textarea) return;

  const rows = table.querySelectorAll(".traffic-growth-row");
  const data = {};

  rows.forEach((row) => {
    const inputs = row.querySelectorAll("input");
    const year = inputs[0].value.trim();
    const rate = parseFloat(inputs[1].value);

    if (year && !isNaN(rate)) {
      data[year] = rate / 100; // Convert percentage back to decimal
    }
  });

  textarea.value = JSON.stringify(data, null, 2);

  // Reset NNB analysis when traffic growth data changes
  if (typeof window.resetNNBAnalysis === "function") {
    window.resetNNBAnalysis();
  }
}

// --- REFERENCE IMAGE FUNCTIONS ---
function loadReferenceImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Check if it's an image
  if (!file.type.startsWith("image/")) {
    alert("Vennligst velg en bildefil (PNG, JPG, etc.)");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = document.getElementById("reference-image");
    const display = document.getElementById("reference-display");
    const toggleBtn = document.getElementById("toggle-reference");

    img.src = e.target.result;
    display.style.display = "block";
    toggleBtn.style.display = "inline-block";

    log(`Referansebilde lastet: ${file.name}`);
  };
  reader.readAsDataURL(file);
}

function toggleReferenceView() {
  const display = document.getElementById("reference-display");
  const currentDisplay = window.getComputedStyle(display).display;

  if (currentDisplay === "none") {
    display.style.display = "block";
  } else {
    display.style.display = "none";
  }
}

function loadDefaultReference() {
  const img = document.getElementById("reference-image");
  const display = document.getElementById("reference-display");
  const toggleBtn = document.getElementById("toggle-reference");
  const caseSelect = document.getElementById("case-select");

  if (!caseSelect || !caseSelect.value) {
    alert("Ingen case valgt. Vennligst velg en case først.");
    return;
  }

  // Get the selected case name and create reference image path
  const selectedCase = caseSelect.value;
  const baseName = selectedCase.replace(".json", "");
  const referenceImagePath = `references/${baseName}.png`;

  img.onload = function () {
    display.style.display = "block";
    toggleBtn.style.display = "inline-block";
    log(`Referansebilde lastet: ${baseName}.png`);
  };

  img.onerror = function () {
    alert(
      `Ingen referansebilde funnet for "${baseName}". ` +
        `Vennligst plasser en fil kalt "${baseName}.png" i mappen "references/" ` +
        `eller last opp ditt eget bilde.`
    );
  };

  img.src = referenceImagePath;
}
