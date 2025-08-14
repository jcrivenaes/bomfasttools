#!/usr/bin/env python3
"""
Test script to compute toll rates and AADT reduction using the calculate_toll_rates function.
"""

import os
import sys

# Add the src directory to the path so we can import the function
sys.path.append(
    os.path.join(os.path.dirname(__file__), "src", "calculators", "trafikkantnytte_v3")
)

from tnytte import calculate_toll_rates


def test_toll_calculation():
    """Test the toll calculation with example parameters."""

    print("=" * 60)
    print("TOLL RATE CALCULATION TEST")
    print("=" * 60)

    # Example parameters (you can modify these)
    result = calculate_toll_rates(
        # Financial Parameters
        loan_initial=10_000_000_000,  # 10 billion NOK
        build_years=7,
        repay_years=20,
        interest_rate=0.03,  # 3% real interest rate
        gradual_loan_uptake=True,
        # Common Travel Parameters
        extra_dist_km=22,
        # Light Vehicle Parameters
        light_initial_aadt_project=8500,  # 85% of 10,000
        light_initial_aadt_ferry=3400,  # 85% of 4,000
        light_time_saving_hr=1.0,
        light_vehicle_share=0.85,
        light_traffic_growth=0.01,
        light_elasticity=-0.5,
        light_ferry_price=150,
        light_vot=350,
        light_voc=2.5,
        # Heavy Vehicle Parameters
        heavy_initial_aadt_project=1500,  # 15% of 10,000
        heavy_initial_aadt_ferry=600,  # 15% of 4,000
        heavy_time_saving_hr=1.0,
        heavy_traffic_growth=0.01,
        heavy_elasticity=-0.2,
        heavy_ferry_price=500.0,
        heavy_vot=600,
        heavy_voc=8.0,
        heavy_toll_factor=3.0,
    )

    print("\nRESULTS:")
    print("-" * 40)

    if result["status"] == "Success":
        print(f"Light vehicle toll rate: {result['toll_light']:.2f} NOK")
        print(f"Heavy vehicle toll rate: {result['toll_heavy']:.2f} NOK")
        print(
            f"Toll ratio (heavy/light): {result['toll_heavy'] / result['toll_light']:.2f}"
        )

        print(
            f"\nNet benefit for light vehicles: {result['net_benefit_light']:.2f} NOK"
        )
        print(f"Net benefit for heavy vehicles: {result['net_benefit_heavy']:.2f} NOK")

        print(f"\nTraffic with tolls:")
        print(f"Light vehicles: {result['traffic_light_adt']:.0f} AADT")
        print(f"Heavy vehicles: {result['traffic_heavy_adt']:.0f} AADT")
        print(f"Total traffic: {result['total_traffic_adt']:.0f} AADT")

        # Calculate original traffic for comparison
        original_light = 8500
        original_heavy = 1500
        original_total = original_light + original_heavy

        print(f"\nOriginal traffic (without tolls):")
        print(f"Light vehicles: {original_light:.0f} AADT")
        print(f"Heavy vehicles: {original_heavy:.0f} AADT")
        print(f"Total traffic: {original_total:.0f} AADT")

        print(f"\nTraffic reduction:")
        light_reduction = original_light - result["traffic_light_adt"]
        heavy_reduction = original_heavy - result["traffic_heavy_adt"]
        total_reduction = original_total - result["total_traffic_adt"]

        print(
            f"Light vehicles: {light_reduction:.0f} AADT ({light_reduction / original_light * 100:.1f}% reduction)"
        )
        print(
            f"Heavy vehicles: {heavy_reduction:.0f} AADT ({heavy_reduction / original_heavy * 100:.1f}% reduction)"
        )
        print(
            f"Total traffic: {total_reduction:.0f} AADT ({total_reduction / original_total * 100:.1f}% reduction)"
        )

        print(f"\nLoan information:")
        print(
            f"Initial loan: {result['loan_at_opening'] / 1_000_000:.0f} million NOK (at opening)"
        )

    else:
        print(f"ERROR: {result['message']}")

    print("=" * 60)


if __name__ == "__main__":
    test_toll_calculation()
