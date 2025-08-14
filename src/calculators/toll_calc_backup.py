# keep for later


def toll_rate_light_heavy(self, aadt=None):
    data = self.config
    if aadt is None:
        aadt = data.traffic.aadt_project * 0.6
        print("Estimated AADT:", aadt)

    traffic_growth = data.traffic.traffic_growth_project
    heavy_vehicle_share = data.traffic.heavy_vehicle_share
    heavy_vehicle_toll_factor = data.toll.heavy_vehicle_toll_factor
    repayment_period = data.toll.repayment_period
    construction_period = data.construction_period
    loan_amount = data.toll.toll_share * data.construction_cost

    inflation_rate = data.toll.inflation_rate
    toll_loan_interest = data.toll.toll_loan_interest

    # Compute real interest rate from nominal and inflation
    interest = (1 + toll_loan_interest) / (1 + inflation_rate) - 1
    print("Real (net) interest rate: %.3f%%" % (100 * interest))

    # 1. Net present value of future toll revenues
    q = (1 + traffic_growth) / (1 + interest)
    factor_sum = (1 - pow(q, repayment_period)) / (1 - q)
    npv_from_opening = factor_sum / (1 + interest)
    npv_total = npv_from_opening * pow(1 / (1 + interest), construction_period)

    b1 = loan_amount / npv_total  # First year's payment

    # 2. Total number of vehicles over the repayment period
    traffic_sum = (pow(1 + traffic_growth, repayment_period) - 1) / traffic_growth
    num_vehicles = aadt * 365 * traffic_sum

    # 3. Total income = B1 * traffic_sum
    total_income = b1 * traffic_sum

    # 4. Average rate per vehicle
    avg_rate = total_income / num_vehicles

    # 5. Distribution between light and heavy vehicles
    factor = (1 - heavy_vehicle_share) + heavy_vehicle_share * heavy_vehicle_toll_factor
    light_vehicle_rate = avg_rate / factor
    heavy_vehicle_rate = light_vehicle_rate * heavy_vehicle_toll_factor

    print(
        "Calculated toll rates:"
        f"\nAverage rate: {avg_rate:.2f} NOK"
        f"\nLight vehicle rate: {light_vehicle_rate:.2f} NOK"
        f"\nHeavy vehicle rate: {heavy_vehicle_rate:.2f} NOK"
    )

    return (
        round(avg_rate, 2),
        round(light_vehicle_rate, 2),
        round(heavy_vehicle_rate, 2),
    )
