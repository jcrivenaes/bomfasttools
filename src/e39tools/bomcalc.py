import pandas as pd
import yaml

MAXTRIES = 1000
MAXYEARS = 200
MRD = 1000000000
MILL = 1000000


def compute_sumloan(inloan, buildyears, interest):
    """Compute sum loan accumulated to startup point.

    Args:
        inloan: size of capital needed
        buildyears: Number of years to build the shit
        interest: In fraction

    Returns:
        Cumulative loan
    """
    cum = 0.0
    for year in range(buildyears):

        cum = cum + (1.0 + interest) ** year

    result = cum * inloan / buildyears
    return result


def yearly_streams(cum, years, aadt, trafficgrowth, tollavg, interest, tollcost):
    """Return two lists with cashflows.

    Args:
        cum: Initial cumulative cost (loan)
        years: Number of years to pay back, typically 15 years
        aadt: Number of cars per 24 hour day (ÅDT in Norwegian)
        trafficgrowth: Expected traffic growth per year
        tollavg: AVg toll cash value
        interest: In fraction
        tollcost: Toll cost to the tolling company (assume constant)
    """

    cumincome = []
    restloan = []
    rest = cum
    for year in range(1, years + 1):

        income = 365 * aadt * ((1 + trafficgrowth) ** (year - 1)) * tollavg - tollcost

        cumincome.append(income)

        rest = (rest - income) * (1 + interest)
        restloan.append(rest)

    df = pd.DataFrame(
        {"YEARS": range(1, years + 1), "INCOME": cumincome, "RESTLOAN": restloan}
    )

    return df


def find_finalyear(df):
    """Find final year when loan is ending."""

    idx = (df.RESTLOAN.values < 0).argmax()

    if idx == 0:
        if df.RESTLOAN.values[0] < 0.0:
            return 1
        else:
            return -1

    return df.YEARS.values[idx]


def iterate_toll_value(dc):
    """Read a dict input and find toll by iteration."""

    buildyears = dc["buildyears"]
    loansum = dc["loansum"]

    cumloan = 0.0
    if buildyears < 5:
        partloansum = loansum
        year = buildyears
        cumloan += compute_sumloan(partloansum, year, dc["interest"])

    elif buildyears >= 5:
        b1 = buildyears // 2
        b2 = buildyears
        partloansum = loansum / 2
        cumloan += compute_sumloan(partloansum, b1, dc["interest"])
        cumloan += compute_sumloan(partloansum, b2, dc["interest"])
        # print(f"Year 1")

    print(f"INLOAN {loansum}, CUMLOAN: {cumloan}")
    toll = dc["tollavg"]
    for _ in range(MAXTRIES):
        df = yearly_streams(
            cumloan,
            MAXYEARS,
            dc["aadt"],
            dc["trafficgrowth"],
            toll,
            dc["interest"],
            dc["tollcost"],
        )

        trg = dc["targetyears"]

        # print(df[(df.YEARS > trg - 2) & (df.YEARS < trg + 2)])

        finalyear = find_finalyear(df)
        # print(finalyear)

        if finalyear == 1:
            toll = toll / 2.0
        elif finalyear == -1:
            toll = toll * 2.0
        elif finalyear > dc["targetyears"] or finalyear == 1:
            toll = toll + 0.01 * toll
        elif finalyear < dc["targetyears"] or finalyear == -1:
            toll = toll - 0.01 * toll
        else:
            break

    # fine tune iterations
    print(f"Proposed toll is {toll} ... fine tune...")
    limit = 0.0001 * cumloan
    for _ in range(MAXTRIES):
        df = yearly_streams(
            cumloan,
            MAXYEARS,
            dc["aadt"],
            dc["trafficgrowth"],
            toll,
            dc["interest"],
            dc["tollcost"],
        )

        trg = dc["targetyears"]

        # print(df[(df.YEARS > trg - 2) & (df.YEARS < trg + 3)])

        if df.iloc[trg - 1, 2] < -1 * limit:
            toll = toll - 0.1
        else:
            print(f"Final toll is {toll}")
            finalyear = find_finalyear(df)
            print("Finalyear is still: ", finalyear)
            return toll

    return None


def bycar_type(dc, toll):
    """Based on computed avg toll, compute per car type."""

    dx = dc.get("vehicles", None)

    if not dx:
        return None

    a = dx["elcarfraction"]
    n = dx["elcarrate"]
    u = dx["heavyfraction"]
    t = dx["heavymultiplier"]

    x = toll / (a * n + 1 - a * u * n - u + u * t - a + a * u)

    return x, x * n, x * t  # basis, elcar, heavy


def _xin(text, default, itype=float):
    """Make input() smarter"""

    answer = itype(input(f"{text} [default is {default}]: ") or default)
    print(f"You said: {answer}")
    return answer


def main():

    dc = {}

    inyaml = input("Give YAML file or enter: ")

    if inyaml:
        with open(inyaml, "r") as stream:
            dc = yaml.safe_load(stream)
    else:
        dc["loansum"] = _xin("Give total sum in MRD NOK to pay back", 12)
        dc["loansum"] *= MRD
        dc["buildyears"] = _xin(
            "Give number of years to build this stuff", 6, itype=int
        )
        dc["targetyears"] = _xin("Give number of years to pay back", 15, itype=int)
        dc["interest"] = _xin("Give interest as fraction", 0.055)
        dc["tollavg"] = _xin("Give assumed toll average value", 200)
        dc["aadt"] = _xin("Give expected ÅDT at start", 10000)
        dc["trafficgrowth"] = _xin("Give expected traffic growth", 0.02)
        dc["tollcost"] = _xin("Give yearly cost to TollCompany in million NOK", 10)
        dc["tollcost"] *= MILL

    computedtoll = iterate_toll_value(dc)

    print(f"Computed TOLL is: {computedtoll}")

    basis, elcar, heavy = bycar_type(dc, computedtoll)
    if basis:
        print(f"Ordinary cars: {basis}")
        print(f"Elcars cars: {elcar}")
        print(f"Heavy cars: {heavy}")


if __name__ == "__main__":

    main()
