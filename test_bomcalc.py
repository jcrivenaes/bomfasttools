from typing import Iterable
import pytest
import e39tools.bomcalc as bom

MRD = 1000000000


def test_sumloan():

    summ = bom.compute_sumloan(10.66, 10, 0.05)
    assert summ == pytest.approx(13.408033)


def test_yearly_streams_and_break():
    """Test yearly streams and year when nullified."""
    df = bom.yearly_streams(13.408033 * MRD, 20, 6000, 0.02, 409, 0.05, 6000000)

    # print(df)
    assert df.iloc[17, 2] == pytest.approx(1773417768.4584382)

    endingyear = bom.find_finalyear(df)

    assert endingyear == 20


def test_iterate_tollvalue():
    """Based on loan, growth etc, find toll by iteration."""

    indata = {
        "loansum": 10.66 * MRD,
        "buildyears": 10,
        "interest": 0.05,
        "tollavg": 90,
        "aadt": 5500,
        "targetyears": 15,
        "tollcost": 6000000,
        "trafficgrowth": 0.02,
    }

    result = bom.iterate_toll_value(indata)

    print(result)
