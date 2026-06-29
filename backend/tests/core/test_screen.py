"""Known-name pass/fail tests for `core.screen` (METHODOLOGY §10).

The safe-universe screen defines "safe, not gambling" by rules: quality
large-caps for stocks, UCITS/KID/low-TER/acceptable-domicile for funds, and
investment-grade for bonds. Failing the safe screen doesn't ban a name — it
flags why it's risky (a high-beta pick can still enter as a *capped satellite*
via core.tilts), which is exactly the NVIDIA story.
"""

from core import screen
from core.screen import FundMetrics, StockMetrics

# --- Stocks ----------------------------------------------------------------


def test_quality_large_cap_passes() -> None:
    blue_chip = StockMetrics(
        market_cap=200e9,
        is_profitable=True,
        pays_dividend=True,
        years_listed=20,
        beta=1.1,
        is_index_member=True,
    )
    result = screen.screen_stock(blue_chip)
    assert result.passed
    assert result.reasons == ()


def test_high_beta_name_fails_only_on_beta() -> None:
    # NVIDIA-like: a quality mega-cap, but too volatile for the *safe* core.
    nvidia_like = StockMetrics(
        market_cap=1_000e9,
        is_profitable=True,
        pays_dividend=True,
        years_listed=25,
        beta=1.7,
        is_index_member=True,
    )
    result = screen.screen_stock(nvidia_like)
    assert not result.passed
    assert result.reasons == ("beta_too_high",)


def test_micro_cap_meme_fails_many_rules() -> None:
    meme = StockMetrics(
        market_cap=50e6,
        is_profitable=False,
        pays_dividend=False,
        years_listed=0.5,
        beta=2.5,
        is_index_member=False,
    )
    result = screen.screen_stock(meme)
    assert not result.passed
    assert set(result.reasons) == {
        "market_cap_too_small",
        "not_profitable_or_paying",
        "insufficient_track_record",
        "beta_too_high",
        "not_index_member",
    }


# --- Funds (UCITS-first, Swiss-appropriate) --------------------------------


def test_irish_ucits_low_ter_passes() -> None:
    cspx_like = FundMetrics(
        is_ucits=True,
        has_kid=True,
        ter=0.0007,
        aum=5e9,
        years_since_inception=10,
        physical_replication=True,
        domicile="IE",
    )
    assert screen.screen_fund(cspx_like).passed


def test_us_domiciled_no_kid_fails() -> None:
    spy_like = FundMetrics(
        is_ucits=False,
        has_kid=False,
        ter=0.0009,
        aum=400e9,
        years_since_inception=30,
        physical_replication=True,
        domicile="US",
    )
    result = screen.screen_fund(spy_like)
    assert not result.passed
    assert "domicile_not_allowed" in result.reasons
    assert "no_kid" in result.reasons
    assert "not_ucits" in result.reasons


def test_expensive_fund_fails_on_ter() -> None:
    pricey = FundMetrics(
        is_ucits=True,
        has_kid=True,
        ter=0.02,
        aum=5e9,
        years_since_inception=10,
        physical_replication=True,
        domicile="LU",
    )
    result = screen.screen_fund(pricey)
    assert not result.passed
    assert result.reasons == ("ter_too_high",)


# --- Bonds -----------------------------------------------------------------


def test_investment_grade_boundary() -> None:
    assert screen.is_investment_grade("AAA")
    assert screen.is_investment_grade("BBB-")
    assert not screen.is_investment_grade("BB+")
    assert not screen.is_investment_grade("D")
