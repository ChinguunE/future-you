"""Invariant tests for `core.tilts` — THE centerpiece (METHODOLOGY §5).

"Recommend *with* you, not at you": the user names something they want to hold
(e.g. NVIDIA), and the engine includes it at a responsibly risk-adjusted weight
instead of silently excluding it. These tests pin the guardrails that stop
"include what you want" from becoming "bet the plan":

* weights sum to 1
* every weight stays within its cap
* a tilt moves weight toward the pick, but bounded
* a riskier pick earns a strictly smaller cap (and weight)
* a minimum diversified core is preserved
* the trade-off vs the optimal mix is reported
"""

import numpy as np
import pytest

from core import tilts

# Shared cap configuration for the blend tests.
_CFG = dict(reference_risk=0.15, base_cap=0.05, hard_cap=0.10, satellite_cap=0.20)


# --- Risk-based position sizing (the cap) ----------------------------------


def test_cap_strictly_decreases_with_risk() -> None:
    def cap(r: float) -> float:
        return tilts.risk_adjusted_cap(r, reference_risk=0.15, base_cap=0.05, hard_cap=0.10)

    assert cap(0.10) > cap(0.20) > cap(0.30)  # riskier -> smaller responsible weight


def test_cap_never_exceeds_the_hard_cap() -> None:
    # A very safe name would compute a large cap; the hard cap still binds.
    cap = tilts.risk_adjusted_cap(0.02, reference_risk=0.15, base_cap=0.05, hard_cap=0.10)
    assert cap == pytest.approx(0.10)
    assert cap <= 0.10


# --- The blend (view-blending + risk-budgeted sizing) ----------------------


def test_blend_weights_sum_to_one() -> None:
    result = tilts.blend_views([0.6, 0.3, 0.1], [0.20, 0.45], **_CFG)
    assert np.sum(result.tilted_weights) == pytest.approx(1.0)


def test_every_weight_stays_within_its_cap() -> None:
    result = tilts.blend_views([0.6, 0.3, 0.1], [0.20, 0.45], **_CFG)
    assert np.all(result.tilted_weights <= result.caps + 1e-12)


def test_tilt_moves_toward_the_picks_but_bounded() -> None:
    result = tilts.blend_views([0.6, 0.3, 0.1], [0.20, 0.45], **_CFG)
    pick_weights = result.tilted_weights[3:]
    pick_caps = result.caps[3:]
    assert np.all(pick_weights > 0.0)  # the pick is actually included
    assert np.all(pick_weights <= pick_caps + 1e-12)  # but never above its cap
    # The core shrinks to make room; picks appear from nothing.
    assert np.all(result.delta[:3] <= 0.0)
    assert np.all(result.delta[3:] > 0.0)
    assert np.allclose(result.delta, result.tilted_weights - result.optimal_weights)


def test_riskier_pick_gets_a_strictly_smaller_weight() -> None:
    # The NVIDIA point: a higher-risk pick is sized down relative to a calmer one.
    result = tilts.blend_views([0.6, 0.3, 0.1], [0.20, 0.45], **_CFG)
    calmer, riskier = result.tilted_weights[3], result.tilted_weights[4]
    assert riskier < calmer


def test_minimum_diversified_core_is_preserved() -> None:
    result = tilts.blend_views([0.6, 0.3, 0.1], [0.20, 0.45], **_CFG)
    assert result.core_weight >= 1.0 - _CFG["satellite_cap"] - 1e-12


def test_satellite_total_is_capped_when_picks_are_greedy() -> None:
    # Five low-risk picks would each want the hard cap (0.10) -> 0.50 total,
    # but the satellite sleeve cap (0.20) must bind.
    result = tilts.blend_views([0.7, 0.3], [0.05, 0.05, 0.05, 0.05, 0.05], **_CFG)
    assert result.satellite_weight == pytest.approx(0.20)
    assert np.sum(result.tilted_weights) == pytest.approx(1.0)


def test_zero_strength_returns_the_optimal_mix_unchanged() -> None:
    result = tilts.blend_views([0.6, 0.3, 0.1], [0.20, 0.45], **_CFG, tilt_strength=0.0)
    assert result.satellite_weight == pytest.approx(0.0)
    assert np.allclose(result.tilted_weights, result.optimal_weights)


def test_stronger_tilt_allocates_more_to_the_pick_up_to_the_cap() -> None:
    weak = tilts.blend_views([0.6, 0.3, 0.1], [0.20], **_CFG, tilt_strength=0.5)
    strong = tilts.blend_views([0.6, 0.3, 0.1], [0.20], **_CFG, tilt_strength=1.0)
    assert strong.tilted_weights[3] > weak.tilted_weights[3]
    assert strong.tilted_weights[3] <= strong.caps[3] + 1e-12


# --- The trade-off report (optimal vs your mix) ----------------------------


def test_tilt_cost_reports_return_risk_and_sharpe() -> None:
    # Combined universe: a steady core asset and one higher-risk pick.
    mu = np.array([0.05, 0.06])
    cov = np.array([[0.0049, 0.0], [0.0, 0.09]])  # vols 0.07 and 0.30, uncorrelated
    optimal = np.array([1.0, 0.0])
    tilted = np.array([0.95, 0.05])
    cost = tilts.tilt_cost(optimal, tilted, mu, cov, risk_free=0.0)

    assert cost.optimal_return == pytest.approx(0.05)
    assert cost.tilted_return == pytest.approx(0.0505)
    assert cost.optimal_risk == pytest.approx(0.07)
    assert cost.tilted_risk == pytest.approx(np.sqrt(0.00464725))
    assert cost.optimal_sharpe == pytest.approx(0.05 / 0.07)
    assert cost.tilted_sharpe == pytest.approx(0.0505 / np.sqrt(0.00464725))
