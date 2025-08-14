import json
import math
import os
import sys

import easydict
import numpy as np
import pandas as pd
import yaml
from matplotlib import pyplot as plt

MAX_REASONABLE_TOLL = 1000
ADDED_TRAFFIC_BENEFIT_FACTOR = 0.5
DEBUG = 0


def xprint(*args):
    """print only if DEBUG > 0"""
    if DEBUG == 0:
        return

    print(*args)


def calculate_toll_rates(
    # --- Financial Parameters ---
    loan_initial: float = 10_000_000_000,
    build_years: int = 7,
    repay_years: int = 20,
    interest_rate: float = 0.03,
    gradual_loan_uptake: bool = True,
    # --- Common Travel Parameters ---
    extra_dist_km: float = 22,
    # --- Light Vehicle Parameters ---
    light_initial_aadt_project: float = 10000,
    light_time_saving_hr: float = 1,
    light_traffic_growth: float = 0.01,
    light_elasticity: float = -0.5,
    light_ferry_price: float = 150,
    light_vot: float = 350,
    light_voc: float = 2.5,
    # --- Heavy Vehicle Parameters ---
    heavy_initial_aadt_project: float = 500,
    heavy_time_saving_hr: float = 1,
    heavy_traffic_growth: float = 0.01,
    heavy_elasticity: float = -0.2,
    heavy_ferry_price: float = 500.0,
    heavy_vot: float = 600,
    heavy_voc: float = 8.0,
    heavy_toll_factor: float = 3.0,
) -> dict:
    """
    Calculates required toll rates based on detailed, disaggregated parameters.

    This function models two separate vehicle classes (light and heavy) to find
    the toll rates that make the NPV of revenues equal to the project's loan
    value at opening. It supports two loan uptake models.

    Args:
        (All parameters are defined by the function signature with defaults)

    Returns:
        A dictionary containing all key results or an error message.
    """

    # --- Step 1: Calculate loan's future value at project opening ---
    if gradual_loan_uptake:
        # Assumes linear loan uptake over the construction period.
        # This is a standard approximation for interest during construction (IDC).
        interest_during_construction = loan_initial * interest_rate * (build_years / 2)
        loan_at_opening = loan_initial + interest_during_construction
    else:
        # Assumes the full loan is taken on day 1 and accrues compounding interest.
        loan_at_opening = loan_initial * (1 + interest_rate) ** build_years

    # --- Step 2: Calculate Generalized Cost Benefit per class ---
    # This is the total economic benefit a user gets from the new road.
    net_benefit_light = (
        (light_time_saving_hr * light_vot)
        + light_ferry_price
        - (extra_dist_km * light_voc)
    )
    net_benefit_heavy = (
        (heavy_time_saving_hr * heavy_vot)
        + heavy_ferry_price
        - (extra_dist_km * heavy_voc)
    )

    # --- Step 3: Set up and solve the quadratic equation for P_light ---
    # The NPV of the combined revenue streams is set equal to the final loan.

    def get_npv_growth_factor(r, g, n):
        # Helper function to calculate the NPV factor for a growing annuity
        if abs(r - g) < 1e-9:  # Avoid division by zero if r is very close to g
            return n / (1 + r)
        return (1 / (r - g)) * (1 - ((1 + g) / (1 + r)) ** n)

    # NPV factor for each traffic class (as growth rates can differ)
    npv_factor_light = get_npv_growth_factor(
        interest_rate, light_traffic_growth, repay_years
    )
    npv_factor_heavy = get_npv_growth_factor(
        interest_rate, heavy_traffic_growth, repay_years
    )

    # Build the coefficients for the quadratic equation a*P^2 + b*P + c = 0,
    # where P is the toll rate for light vehicles (P_light).

    # Contribution from light vehicles
    K_light = 365 * light_initial_aadt_project * npv_factor_light
    a_light = K_light * (light_elasticity / net_benefit_light)
    b_light = K_light

    # Contribution from heavy vehicles (P_heavy = factor * P_light)
    K_heavy = 365 * heavy_initial_aadt_project * npv_factor_heavy
    a_heavy = K_heavy * (heavy_elasticity / net_benefit_heavy) * (heavy_toll_factor**2)
    b_heavy = K_heavy * heavy_toll_factor

    # Total coefficients
    a = a_light + a_heavy
    b = b_light + b_heavy
    c = -loan_at_opening

    # --- Step 4: Solve the equation and calculate final results ---
    try:
        if abs(a) < 1e-9:  # Handle case where it's a linear equation
            if abs(b) < 1e-9:
                raise ValueError("Equation is unsolvable (a and b are zero).")
            toll_light = -c / b
        else:
            discriminant = b**2 - 4 * a * c
            if discriminant < 0:
                raise ValueError("No real solution exists (negative discriminant).")

            p1 = (-b + math.sqrt(discriminant)) / (2 * a)
            p2 = (-b - math.sqrt(discriminant)) / (2 * a)

            # Select the economically sensible solution (positive and realistic)
            toll_light = None
            if 0 < p1 < MAX_REASONABLE_TOLL:
                toll_light = p1
            elif 0 < p2 < MAX_REASONABLE_TOLL:
                toll_light = p2
            else:
                raise ValueError("No realistic positive solution found.")

        # Calculate all other results based on the found toll price
        toll_heavy = toll_light * heavy_toll_factor
        traffic_light = light_initial_aadt_project * (
            1 + light_elasticity * (toll_light / net_benefit_light)
        )
        traffic_heavy = heavy_initial_aadt_project * (
            1 + heavy_elasticity * (toll_heavy / net_benefit_heavy)
        )

        return {
            "status": "Success",
            "loan_at_opening": loan_at_opening,
            "gradual_loan_uptake_used": gradual_loan_uptake,
            "net_benefit_light": net_benefit_light,
            "net_benefit_heavy": net_benefit_heavy,
            "toll_light": toll_light,
            "toll_heavy": toll_heavy,
            "traffic_light_adt": traffic_light,
            "traffic_heavy_adt": traffic_heavy,
            "total_traffic_adt": traffic_light + traffic_heavy,
        }

    except (ValueError, ZeroDivisionError) as e:
        return {"status": "Error", "message": str(e)}


class TrafficBenefitCalculator:
    """Class for toll and traffic benefit calculations."""

    def __init__(self, analysis_period=None, scaled_period=None):
        config_in = self.read_yaml_file()
        self.config = easydict.EasyDict(config_in)  # EasyDict for attribute access

        if analysis_period is None:
            self._analysis_period = self.config.analysis_period
            self._lifetime = self.config.lifetime
            self._scaling = 1

        else:
            # this is for parametric input, so NNB can be computed for different time
            # spans without restverdi; this is more optional
            self._analysis_period = analysis_period
            self._lifetime = self._analysis_period
            self._scaling = self._analysis_period / self.config.analysis_period

        self.tolls = dict()

        # Initialize an empty DataFrame for calculations
        self.df = pd.DataFrame()

        self.result_construction_cost = 0  # construction cost ex VAT, discounted
        self.result_traffic_benefit = 0
        self.result_dv_costs = 0  # discounted D&V costs
        self.result_ferry_subsidy_costs = 0  # ferry costs, discounted
        self.result_restverdi = 0  # residual value (restverdi), discounted

    @staticmethod
    def read_yaml_file():
        """Reads a YAML file and returns its content as a Python dict object."""
        if len(sys.argv) < 2:
            raise ValueError("Please provide YAML configuration file as argument")

        filename = sys.argv[1]
        xprint("Reading YAML file:", filename)

        if not os.path.exists(filename):
            raise FileNotFoundError(f"Configuration file not found: {filename}")

        with open(filename, "r", encoding="utf-8") as file:
            return yaml.safe_load(file)

    def year_npv_series(self):
        """
        Compute the year series in the dataframe
        """

        start1 = -self.config.construction_period
        start2 = self.config.opening_year - self.config.comparison_year
        start = min(start1, start2)
        end = self._lifetime

        self.df["PRJ_YEAR"] = range(start, end + 1)
        self.df["COMPARISON_YEAR"] = (
            self.df["PRJ_YEAR"] + self.config.opening_year - self.config.comparison_year
        )
        self.df["CALENDAR_YEAR"] = (
            self.df["COMPARISON_YEAR"] + self.config.comparison_year
        )

        # compute discount factor for each year using dual discount rates
        # D1 for PRJ_YEAR 0-40, D2 for PRJ_YEAR 41-75
        d1 = self.config.capital_interest_0_40  # First discount rate
        d2 = self.config.capital_interest_41_75  # First discount rate

        # Calculate discount factors
        discount_factors = []
        for prj_year, comp_year in zip(self.df["PRJ_YEAR"], self.df["COMPARISON_YEAR"]):
            if prj_year <= 40:
                # Use D1 for years 0-40
                discount_factor = 1 / ((1 + d1) ** comp_year)
            else:
                # Use D2 for years 41-75, but need to account for transition
                # Discount first 40 years with D1, then remaining years with D2
                discount_factor_40 = 1 / ((1 + d1) ** 40)  # Value at year 40 using D1
                additional_years = prj_year - 40
                discount_factor = discount_factor_40 / ((1 + d2) ** additional_years)

            discount_factors.append(discount_factor)

        self.df["DISCOUNT_FACTOR"] = discount_factors

        # compute bnp_growth per year after opening year
        self.df["BNP_GROWTH"] = np.nan
        self.df.loc[self.df["PRJ_YEAR"] >= 0, "BNP_GROWTH"] = (
            1 + self.config.bnp_growth
        ) ** self.df.loc[self.df["PRJ_YEAR"] >= 0, "PRJ_YEAR"]

    def estimate_toll_rates_aadt(self):
        """
        Estimate toll rates and AADT based on the configuration.
        """
        xprint("Estimate toll rates and AADT based on the configuration.")
        cfg = self.config
        if not cfg.toll.enabled:
            self.tolls = {
                "aadt_multiplier": 1,
                "cost_light": 0,
                "cost_heavy": 0,
            }
            return

        if not cfg.toll.enable_dynamic:
            # Static toll rates, no AADT calculation
            self.tolls["aadt_multiplier"] = cfg.toll.static.toll_aadt_multiplier
            self.tolls["cost_light"] = cfg.toll.static.costs.light
            self.tolls["cost_heavy"] = cfg.toll.static.costs.heavy
            xprint("Using static toll rates:", self.tolls)
            return

        # Dynamic toll rates, calculate AADT and tolls
        eff_interest = (cfg.toll.toll_loan_interest - cfg.toll.inflation_rate) / (
            1 + cfg.toll.inflation_rate
        )
        # Using Fisher equation: real_rate = (nominal_rate - inflation_rate) / (1 + inflation_rate)

        heavy_share = cfg.traffic.heavy_share
        light_share = 1 - heavy_share

        # normalized leisure etc share, when excluding the heavy share
        leisure_share = cfg.traffic.leisure_share / light_share
        work_share = cfg.traffic.work_share / light_share
        business_share = cfg.traffic.business_share / light_share

        light_vot = (
            cfg.time_values.leisure * leisure_share
            + cfg.time_values.work * work_share
            + cfg.time_values.business * business_share
        )

        # Extract traffic growth from first period in traffic_growth_project
        def get_first_period_growth(growth_config):
            """Get traffic growth rate from the first (earliest) period"""
            if not growth_config:
                return 0.0
            sorted_years = sorted([int(year) for year in growth_config.keys()])
            first_year = str(sorted_years[0])
            return growth_config[first_year]

        light_traffic_growth = get_first_period_growth(cfg.traffic.traffic_growth_project.light)
        heavy_traffic_growth = get_first_period_growth(cfg.traffic.traffic_growth_project.heavy)

        res = calculate_toll_rates(
            # financial parameters
            loan_initial=cfg.toll.toll_loan,
            build_years=cfg.construction_period,
            repay_years=cfg.toll.repayment_period,
            interest_rate=eff_interest,
            gradual_loan_uptake=cfg.toll.gradual_loan_uptake,
            # travel parameters, common
            extra_dist_km=cfg.vehicle_costs.change_in_road_length,
            # light vehicle parameters
            light_initial_aadt_project=cfg.traffic.aadt_project * light_share,
            light_time_saving_hr=cfg.ferry.extra_time.leisure,  # assume leisure ~ light
            light_traffic_growth=light_traffic_growth,
            light_elasticity=cfg.toll.dynamic.elasticity.light,
            light_ferry_price=cfg.ferry.costs.light,
            light_vot=light_vot,
            light_voc=cfg.vehicle_costs.light * cfg.vehicle_costs.speed_factor,
            # heavy vehicle parameters
            heavy_initial_aadt_project=cfg.traffic.aadt_project * heavy_share,
            heavy_time_saving_hr=cfg.ferry.extra_time.heavy,
            heavy_traffic_growth=heavy_traffic_growth,
            heavy_elasticity=cfg.toll.dynamic.elasticity.heavy,
            heavy_vot=cfg.time_values.heavy,
            heavy_voc=cfg.vehicle_costs.heavy * cfg.vehicle_costs.speed_factor,
            # toll prize for heavy is typically 2 or 3 times for light
            heavy_toll_factor=cfg.toll.heavy_vehicle_toll_factor,
        )
        if res["status"] == "Error":
            raise RuntimeError(res["message"])

        self.tolls["aadt_multiplier"] = (
            res["total_traffic_adt"] / cfg.traffic.aadt_project
        )
        self.tolls["cost_light"] = res["toll_light"]
        self.tolls["cost_heavy"] = res["toll_heavy"]
        xprint("Using DYNAMIC toll rates:", self.tolls)
        return

        xprint(json.dumps(res, indent=4, ensure_ascii=False))

    def _calculate_traffic_with_periods(self, base_aadt, growth_config, ferry=True):
        """
        Calculate traffic for a vehicle type with different growth periods.
        Returns a list of values for each year in the dataframe.
        """
        # Initialize result list with base AADT for all years
        result = [base_aadt] * len(self.df)
        calendar_year = self.df["CALENDAR_YEAR"].to_list()
        project_year = self.df["PRJ_YEAR"].to_list()

        # Get sorted years for processing
        if not growth_config:
            return result

        sorted_years = sorted([int(year) for year in growth_config.keys()])
        previous_aadt = 0

        growth_vector = np.array(result)

        xprint(sorted_years)
        for row, year in enumerate(calendar_year):
            for byear in sorted_years:
                if year >= byear:
                    factor = growth_config[str(byear)]
                    growth_vector[row] = factor

        growth_vector = growth_vector.tolist()

        for row, year in enumerate(calendar_year):
            prj_year = project_year[row]

            if prj_year < 0:
                result[row] = np.nan
                aadt = base_aadt
                previous_aadt = aadt
                continue

            if prj_year == 0:
                result[row] = base_aadt
                previous_aadt = base_aadt
                continue

            aadt = previous_aadt * (1 + growth_vector[row])

            result[row] = aadt

            previous_aadt = aadt

        # now modify the array if AADT is reduced by toll
        for row, year in enumerate(project_year):
            if not ferry and year <= self.config.toll.repayment_period:
                multiplier = self.tolls["aadt_multiplier"]
                result[row] *= multiplier

        return result

    def traffic_series(self):
        """
        Calculate the traffic series based on the configuration.
        This includes AADT, traffic growth, and other parameters.
        """
        heavy_initial_share = self.config.traffic.heavy_share
        light_initial_share = 1 - heavy_initial_share

        # Calculate ferry traffic for each vehicle type
        for vehicle_type in ["light", "heavy"]:
            actual_share = (
                light_initial_share if vehicle_type == "light" else heavy_initial_share
            )
            base_aadt = self.config.traffic.aadt_ferry * actual_share
            growth_config = self.config.traffic.traffic_growth_ferry[vehicle_type]

            column_name = "AADT_FER_" + vehicle_type.upper()
            traffic_values = self._calculate_traffic_with_periods(
                base_aadt, growth_config, ferry=True
            )
            self.df[column_name] = traffic_values

        # Create summary columns
        self.df["AADT_FER"] = self.df[["AADT_FER_LIGHT", "AADT_FER_HEAVY"]].sum(axis=1)
        self.df.loc[self.df["PRJ_YEAR"] < 0, "AADT_FER"] = np.nan

        # Calculate project traffic for each vehicle type
        for vehicle_type in ["light", "heavy"]:
            actual_share = (
                light_initial_share if vehicle_type == "light" else heavy_initial_share
            )
            base_aadt = self.config.traffic.aadt_project * actual_share
            growth_config = self.config.traffic.traffic_growth_project[vehicle_type]

            column_name = "AADT_PRJ_" + vehicle_type.upper()
            traffic_values = self._calculate_traffic_with_periods(
                base_aadt, growth_config, ferry=False
            )
            self.df[column_name] = traffic_values

        # Create summary columns
        self.df["AADT_PRJ"] = self.df[["AADT_PRJ_LIGHT", "AADT_PRJ_HEAVY"]].sum(axis=1)

    def compute_discounted_building_costs(self):
        """
        Compute the discounted building costs for each year in the DataFrame.
        """

        if self.config.toll.enabled:
            toll_loan = self.config.toll.toll_loan
        else:
            toll_loan = 0

        bcost_ex_vat = (self.config.construction_cost + toll_loan) / (
            1 + self.config.vat_construction
        )

        xprint(f"Building cost ex VAT: {bcost_ex_vat:_.0f} NOK")

        discounted_bcost = 0
        yearly_cost = bcost_ex_vat / self.config.construction_period
        for year in range(
            -self.config.construction_period,
            0,
        ):
            discounted_bcost += (
                yearly_cost
                * self.df.loc[self.df["PRJ_YEAR"] == year, "DISCOUNT_FACTOR"].values[0]
            )

        xprint(f"Discounted building costs: {discounted_bcost:_.0f} NOK")
        self.result_construction_cost = discounted_bcost

    def calculate_traffic_ferry_cost(self):
        """
        Calculate ferry cost based on the provided data and parameters.
        It has two components: ferry cost and extra time cost, per leisure, etc
        """
        for travel_purpose in ["leisure", "work", "business", "heavy"]:
            ferry_cost = (
                self.config.ferry.costs.heavy
                if travel_purpose == "heavy"
                else self.config.ferry.costs.light
            )

            # the value of time increases with bnp growth
            self.df[f"FER_COST_{travel_purpose.upper()}"] = ferry_cost + (
                self.config.ferry.extra_time[travel_purpose]
                * self.config.time_values[travel_purpose]
                * self.df["BNP_GROWTH"]
                * self.config.ferry.comfort_factor
            )

    def calculate_traffic_project_cost(self):
        """
        Calculate the traffic costs for bridge project.
        Includes extra costs for cars due to longer road distance and eventual tolls.
        """
        for travel_purpose in ["leisure", "work", "business", "heavy"]:
            vehicle_costs = (
                self.config.vehicle_costs.heavy
                if travel_purpose == "heavy"
                else self.config.vehicle_costs.light
            )

            if not self.config.toll.enabled:
                toll = 0
            else:
                toll = (
                    self.tolls["cost_heavy"]
                    if travel_purpose == "heavy"
                    else self.tolls["cost_light"]
                )

            self.df[f"PRJ_COST_{travel_purpose.upper()}"] = (
                vehicle_costs
                * self.config.vehicle_costs.speed_factor
                * self.config.vehicle_costs.change_in_road_length
                + toll
            )
            self.df.loc[
                self.df["PRJ_YEAR"] < 0, f"PRJ_COST_{travel_purpose.upper()}"
            ] = np.nan

    def diff_benefit(self):
        """
        Compute the diff travel cost for existing AADT and added AADT.
        """
        for travel_purpose in ["leisure", "work", "business", "heavy"]:
            aadt_name = (
                "AADT_FER_HEAVY" if travel_purpose == "heavy" else "AADT_FER_LIGHT"
            )

            self.df[f"DIFF_BENEFIT_EXISTING_AADT_{travel_purpose.upper()}"] = (
                (
                    self.df[f"FER_COST_{travel_purpose.upper()}"]
                    - self.df[f"PRJ_COST_{travel_purpose.upper()}"]
                )
                * self.df[aadt_name]
                * 365
            )
        for travel_purpose in ["leisure", "work", "business", "heavy"]:
            aadt_fer = (
                "AADT_FER_HEAVY" if travel_purpose == "heavy" else "AADT_FER_LIGHT"
            )
            aadt_prj = (
                "AADT_PRJ_HEAVY" if travel_purpose == "heavy" else "AADT_PRJ_LIGHT"
            )
            self.df[f"DIFF_BENEFIT_ADDED_AADT_{travel_purpose.upper()}"] = (
                (
                    self.df[f"FER_COST_{travel_purpose.upper()}"]
                    - self.df[f"PRJ_COST_{travel_purpose.upper()}"]
                )
                * (self.df[aadt_prj] - self.df[aadt_fer])
                * 365
                * ADDED_TRAFFIC_BENEFIT_FACTOR
            )

        for travel_purpose in ["leisure", "work", "business", "heavy"]:
            self.df[f"DIFF_BENEFIT_{travel_purpose.upper()}"] = (
                self.df[f"DIFF_BENEFIT_EXISTING_AADT_{travel_purpose.upper()}"]
                + self.df[f"DIFF_BENEFIT_ADDED_AADT_{travel_purpose.upper()}"]
            )

        self.df["DIFF_BENEFIT_WEIGHTED"] = 0

        # normalize weights for light traffic
        light_share = {}
        light = 1 - self.config.traffic.heavy_share
        light_share["leisure"] = self.config.traffic.leisure_share / light
        light_share["work"] = self.config.traffic.work_share / light
        light_share["business"] = self.config.traffic.business_share / light

        for travel_purpose in ["leisure", "work", "business"]:
            self.df["DIFF_BENEFIT_WEIGHTED"] += (
                self.df[f"DIFF_BENEFIT_{travel_purpose.upper()}"]
                * light_share[travel_purpose]
            )

        # add heavy, which has it owns AADT
        self.df["DIFF_BENEFIT_WEIGHTED"] += self.df["DIFF_BENEFIT_HEAVY"]

        self.df["DIFF_BENEFIT_WEIGHTED_DISCOUNTED"] = (
            self.df["DIFF_BENEFIT_WEIGHTED"] * self.df["DISCOUNT_FACTOR"]
        )
        self.df.loc[self.df["PRJ_YEAR"] < 0, "DIFF_BENEFIT_WEIGHTED_DISCOUNTED"] = 0
        self.df.loc[
            self.df["PRJ_YEAR"] >= self._analysis_period,
            "DIFF_BENEFIT_WEIGHTED_DISCOUNTED",
        ] = 0

    def compute_derived_numbers(self):
        """Compute derived numbers for the DataFrame.

        * Discounted D&V costs
        * Discounted ferry subsidy
        * Dynamic tax revenue calculation
        """
        analysis_period = self._analysis_period

        self.result_traffic_benefit = self.df["DIFF_BENEFIT_WEIGHTED_DISCOUNTED"].sum()

        # Only include maintenance costs for operational years within analysis period
        mask = (self.df["PRJ_YEAR"] >= 0) & (self.df["PRJ_YEAR"] < analysis_period)
        self.result_dv_costs = (
            self.config.annual_maintenance * self.df.loc[mask, "DISCOUNT_FACTOR"]
        ).sum()
        self.result_ferry_subsidy_costs = (
            self.config.annual_ferry_subsidy * self.df.loc[mask, "DISCOUNT_FACTOR"]
        ).sum()

        # Calculate dynamic tax revenue
        self.result_tax_revenue = self._calculate_tax_revenue()

        # residual_value (restverdi) is the discounted value of the benefit
        # at the end of the analysis period summed of years to end lifetime
        last_year_benefit = self.df.loc[
            self.df["PRJ_YEAR"] == analysis_period, "DIFF_BENEFIT_WEIGHTED"
        ].values[0]

        # Calculate the residual value (restverdi) as the sum of the discounted benefits
        mask = (self.df["PRJ_YEAR"] > self._analysis_period) & (
            self.df["PRJ_YEAR"] < self._lifetime
        )
        self.result_restverdi = (
            last_year_benefit * self.df.loc[mask, "DISCOUNT_FACTOR"].sum()
        )

    def _calculate_tax_revenue(self):
        """Calculate dynamic tax and fee revenues from the project.

        This is quite hard to compute, so will add a correction from input file
        """
        total_tax_revenue = 0

        # Analysis period mask
        mask = (self.df["PRJ_YEAR"] >= 0) & (
            self.df["PRJ_YEAR"] < self._analysis_period
        )

        # 1. Tax revenue from toll operations (if enabled)
        toll_tax_discounted = 0
        if self.config.toll.enabled:
            toll_revenue_light = (
                self.df.loc[mask, "AADT_PRJ_LIGHT"] * self.tolls["cost_light"] * 365
            )
            toll_revenue_heavy = (
                self.df.loc[mask, "AADT_PRJ_HEAVY"] * self.tolls["cost_heavy"] * 365
            )

            # VAT on toll revenue (25%)
            toll_tax = (
                toll_revenue_light + toll_revenue_heavy
            ) * self.config.vat_general
            toll_tax_discounted = (
                toll_tax * self.df.loc[mask, "DISCOUNT_FACTOR"]
            ).sum()
            total_tax_revenue += toll_tax_discounted

        # 2. Limited vehicle cost tax component (only if justified by extra fuel consumption)
        # Include only a small portion if extra road distance genuinely increases fuel taxes
        vehicle_cost_tax_component = 0
        if (
            self.config.vehicle_costs.change_in_road_length > 0
        ):  # Only if road gets longer
            extra_vehicle_costs_light = (
                self.df.loc[mask, "AADT_PRJ_LIGHT"]
                * 365
                * self.config.vehicle_costs.change_in_road_length
                * self.config.vehicle_costs.light
                * self.config.vehicle_costs.speed_factor
            )

            extra_vehicle_costs_heavy = (
                self.df.loc[mask, "AADT_PRJ_HEAVY"]
                * 365
                * self.config.vehicle_costs.change_in_road_length
                * self.config.vehicle_costs.heavy
                * self.config.vehicle_costs.speed_factor
            )

            # Only 20% of vehicle costs treated as genuine tax revenue (fuel taxes only)
            vehicle_cost_tax = (
                extra_vehicle_costs_light + extra_vehicle_costs_heavy
            ) * 0.20  # Much more conservative: only fuel taxes
            vehicle_cost_tax_component = (
                vehicle_cost_tax * self.df.loc[mask, "DISCOUNT_FACTOR"]
            ).sum()
            total_tax_revenue += vehicle_cost_tax_component

        # 3. Loss of VAT revenue from ferry tickets (negative tax revenue)
        ferry_vat_loss = 0
        ferry_revenue_light = (
            self.df.loc[mask, "AADT_FER_LIGHT"] * self.config.ferry.costs.light * 365
        )
        ferry_revenue_heavy = (
            self.df.loc[mask, "AADT_FER_HEAVY"] * self.config.ferry.costs.heavy * 365
        )

        # VAT loss on ferry revenue (25% VAT that is lost when ferry is replaced)
        ferry_vat_loss = (
            ferry_revenue_light + ferry_revenue_heavy
        ) * self.config.vat_general
        ferry_vat_loss_discounted = (
            ferry_vat_loss * self.df.loc[mask, "DISCOUNT_FACTOR"]
        ).sum()
        total_tax_revenue -= ferry_vat_loss_discounted  # Subtract because it's a loss

        # 4. Conservative estimate: Tax revenue from economic activity generated by time savings
        # This represents genuine new economic activity, not transfers
        time_savings_tax = (
            self.df.loc[mask, "DIFF_BENEFIT_WEIGHTED"] * 0.02 * 0.22
        )  # 2% of time savings assumed to be new economic activity, taxed at 22%
        time_savings_tax_discounted = (
            time_savings_tax * self.df.loc[mask, "DISCOUNT_FACTOR"]
        ).sum()
        total_tax_revenue += time_savings_tax_discounted

        # Note: Vehicle cost taxes excluded as they are typically considered transfers
        # in Norwegian infrastructure analysis (taxes paid by users = costs to users)

        # Debug: Print breakdown of tax components
        xprint("\n============ TAX REVENUE BREAKDOWN (MODERATE) =========")
        xprint(f"1. Toll tax (discounted): {toll_tax_discounted:_.0f}")
        xprint("   (25% VAT on toll revenue)")
        xprint(f"2. Vehicle fuel tax (discounted): {vehicle_cost_tax_component:_.0f}")
        xprint("   (20% of additional vehicle costs - fuel taxes only)")
        xprint(f"3. Ferry VAT loss (discounted): {ferry_vat_loss_discounted:_.0f}")
        xprint("   (25% VAT lost when ferry is replaced)")
        xprint(
            f"4. Economic activity tax (discounted): {time_savings_tax_discounted:_.0f}"
        )
        xprint("   (2% of time savings × 22% tax rate - conservative)")
        xprint(f"Total tax revenue: {total_tax_revenue:_.0f}")
        xprint("=" * 50, "\n")

        return total_tax_revenue + self.config.other.tax_income_correction

    def calculate_summary_results(self):
        """Calculate summary results for reporting."""
        cfg = self.config
        oth = cfg.other

        # Traffic and transport users
        # Traffic benefit is already calculated with correct period, no scaling needed
        sum_traffic = self.result_traffic_benefit + oth.health_gs * self._scaling
        sum_operators = oth.operators_sum * self._scaling

        # Public sector
        # These are already calculated with correct analysis period, no scaling needed
        inv = self.result_construction_cost
        dv = self.result_dv_costs
        fer = self.result_ferry_subsidy_costs
        tax = self.result_tax_revenue
        sum_public = inv + dv + fer + tax

        # Rest of society
        tax_cost = (
            self.config.tax_factor * sum_public
        )  # No scaling - calculated from actual public costs
        sum_the_rest = (
            oth.accidents * self._scaling  # Scale with analysis period
            + oth.ghg_emissions * self._scaling  # Scale with analysis period
            + oth.other_env_costs * self._scaling  # Scale with analysis period
            + self.result_restverdi  # No scaling - already calculated correctly
            + tax_cost  # No scaling - based on actual public costs
        )

        # Total net benefit
        sum_all = sum_traffic + sum_operators + sum_public + sum_the_rest
        nnb = sum_all / (-sum_public) if sum_public != 0 else 0

        return {
            "sum_traffic": sum_traffic,
            "sum_operators": sum_operators,
            "sum_public": sum_public,
            "sum_the_rest": sum_the_rest,
            "sum_all": sum_all,
            "nnb": nnb,
            "tax_cost": tax_cost,
        }

    def present_results(self):
        """Present the results of the calculations."""
        cfg = self.config
        oth = cfg.other

        # Calculate summary results
        summary = self.calculate_summary_results()

        # Print basic results
        print("\n\n")
        print(f"Total traffic benefit (discounted): {self.result_traffic_benefit:_.0f}")
        print(
            f"Total construction cost (discounted): {self.result_construction_cost:_.0f}"
        )
        print(f"Total D&V costs (discounted): {self.result_dv_costs:_.0f}")
        print(f"Restverdi (residual value): {self.result_restverdi:_.0f}")

        # Present like SVV
        print("\n\n")
        print("#" * 50)
        print(f"Resultater (1000 kroner, prisnivå {cfg.price_level}):")
        print("#" * 50)
        print("=" * 50)
        print("Trafikkanter og transportbrukere:")
        print("=" * 50)
        print(
            f"{'Trafikkantnytte:':<30} {round(self.result_traffic_benefit / 1000):>15_}"
        )
        print(f"{'Helsevirkninger GS*:':<30} {round(oth.health_gs / 1000):>15_}")
        print("-" * 50)
        print(f"{'SUM TRAFIKKANTER:':<30} {round(summary['sum_traffic'] / 1000):>15_}")
        print("=" * 50)
        print("Operatører (forenklet)")
        print("=" * 50)
        print(f"{'SUM OPERATØRER*:':<30} {round(summary['sum_operators'] / 1000):>15_}")

        print("=" * 50)
        print("Det offentlige")
        print("-" * 50)
        print(
            f"{'Investeringer :':<30} {round(self.result_construction_cost / 1000):>15_}  "
        )
        print(
            f"{'Drift og vedlikehold :':<30} {round(self.result_dv_costs / 1000):>15_}"
        )
        print(
            f"{'Overføringer (operatører):':<30} {round(self.result_ferry_subsidy_costs / 1000):>15_}"
        )
        print(
            f"{'Skatte- og avgiftsinntekter*:':<30} {round(self.result_tax_revenue / 1000):>15_}"
        )
        print("-" * 50)
        print(
            f"{'SUM OFFENTLIGE BUDSJETT':<30} {round(summary['sum_public'] / 1000):>15_}"
        )

        print("=" * 50)
        print("Resten av samfunnet")
        print("=" * 50)
        print(f"{'Ulykker:':<30} {round(oth.accidents / 1000):>15_}")
        print(f"{'Klimagassutslipp:':<30} {round(oth.ghg_emissions / 1000):>15_}")
        print(f"{'Andre miljøkostnader:':<30} {round(oth.other_env_costs / 1000):>15_}")
        print(f"{'Restverdi:':<30} {round(self.result_restverdi / 1000):>15_}")
        print(f"{'Skattekostnad:':<30} {round(summary['tax_cost'] / 1000):>15_}")
        print("-" * 50)
        print(
            f"{'SUM SAMFUNNET FORØVRIG:':<30} {round(summary['sum_the_rest'] / 1000):>15_}"
        )
        print("=" * 50)
        print("\n")

        print(f"{'Netto nytte:':<30} {round(summary['sum_all'] / 1000):>15_}")
        print(f"{'NNB (Netto Nytte-Beregning):':<30} {summary['nnb']:>15.2f}")

    def plot_aadt(self):
        """Make plot of AADT vs CALENDAR_YEAR"""
        # Filter out NaN values for cleaner plotting
        mask = ~(self.df["AADT_FER"].isna() | self.df["AADT_PRJ"].isna())
        plot_data = self.df[mask]

        plt.figure(figsize=(12, 8))

        # Plot ferry AADT
        plt.plot(
            plot_data["CALENDAR_YEAR"],
            plot_data["AADT_FER"],
            label="Ferry AADT",
            linewidth=2,
            marker="o",
            markersize=4,
        )

        # Plot project AADT
        plt.plot(
            plot_data["CALENDAR_YEAR"],
            plot_data["AADT_PRJ"],
            label="Project AADT",
            linewidth=2,
            marker="s",
            markersize=4,
        )

        plt.xlabel("Calendar Year")
        plt.ylabel("Annual Average Daily Traffic (AADT)")
        plt.title("Traffic Development: Ferry vs Project AADT")
        plt.legend()
        plt.grid(True, alpha=0.3)

        # Set minimum Y value to 0 and x value to first year
        plt.ylim(bottom=0)
        plt.xlim(left=self.config.comparison_year)

        # Format y-axis to show thousands separator
        plt.ticklabel_format(style="plain", axis="y")
        ax = plt.gca()
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f"{x:,.0f}"))

        plt.tight_layout()
        plt.show()


def main():
    """Main function"""
    calc = TrafficBenefitCalculator()
    # print(json.dumps(calc.config, indent=4, ensure_ascii=False))
    calc.year_npv_series()
    calc.estimate_toll_rates_aadt()
    calc.traffic_series()
    calc.compute_discounted_building_costs()
    calc.calculate_traffic_ferry_cost()
    calc.calculate_traffic_project_cost()
    calc.diff_benefit()
    # Print the full DataFrame
    with pd.option_context(
        "display.max_rows", None, "display.max_columns", None, "display.width", None
    ):
        print(calc.df.head(100))

    calc.compute_derived_numbers()
    calc.present_results()

    # Plot AADT data
    calc.plot_aadt()


def nnb_graph():
    """Additional recalculations for dynamic analysis_period"""

    years = []
    nnb_values = []
    net_benefits = []

    for year in range(20, 105, 5):
        calc = TrafficBenefitCalculator(analysis_period=year)
        calc.year_npv_series()
        calc.estimate_toll_rates_aadt()
        calc.traffic_series()
        calc.compute_discounted_building_costs()
        calc.calculate_traffic_ferry_cost()
        calc.calculate_traffic_project_cost()
        calc.diff_benefit()

        calc.compute_derived_numbers()
        res = calc.calculate_summary_results()

        years.append(year)
        nnb_values.append(res["nnb"])
        net_benefits.append(res["sum_all"] / 1e9)  # Convert to billions

        print(f"{year}:  {res['nnb']:.3f} (nytte: {res['sum_all'] / 1e9:.0f})")

    # Create plots
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10))

    # Plot NNB (Net Benefit Ratio)
    ax1.plot(years, nnb_values, "b-o", linewidth=2, markersize=6)
    ax1.set_xlabel("Analysis Period (years)")
    ax1.set_ylabel("NNB (Net Benefit Ratio)")
    ax1.set_title("Net Benefit Ratio vs Analysis Period")
    ax1.grid(True, alpha=0.3)
    ax1.axhline(y=0, color="r", linestyle="--", alpha=0.7, label="Break-even")
    ax1.legend()

    # Plot Net Benefit (in billions NOK)
    ax2.plot(years, net_benefits, "g-s", linewidth=2, markersize=6)
    ax2.set_xlabel("Analysis Period (years)")
    ax2.set_ylabel("Net Benefit (billion NOK)")
    ax2.set_title("Total Net Benefit vs Analysis Period")
    ax2.grid(True, alpha=0.3)
    ax2.axhline(y=0, color="r", linestyle="--", alpha=0.7, label="Break-even")
    ax2.legend()

    plt.tight_layout()
    plt.show()

    return years, nnb_values, net_benefits


if __name__ == "__main__":
    main()
    nnb_graph()
