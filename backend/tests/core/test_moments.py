"""Known-answer tests for `core.moments` and `core._linalg` (METHODOLOGY §1).

Every value below is computed by hand from a tiny series so the assertion is a
textbook check, not a re-derivation of the implementation.
"""

import numpy as np
import pytest

from core import _linalg, moments

# --- Mean (arithmetic vs geometric) ---------------------------------------


def test_arithmetic_mean_known() -> None:
    # (0.04 + 0.08 - 0.02 + 0.10) / 4 = 0.05
    assert moments.arithmetic_mean([0.04, 0.08, -0.02, 0.10]) == pytest.approx(0.05)


def test_geometric_mean_known() -> None:
    # (1 + 0.21)^(1/2) - 1 = 1.1 - 1 = 0.10 exactly.
    assert moments.geometric_mean([0.0, 0.21]) == pytest.approx(0.10)


def test_geometric_mean_is_the_compounded_experience() -> None:
    # The classic -50% then +100% round trip: you end where you started.
    # Arithmetic mean overstates it (+25%); geometric tells the truth (0%).
    series = [-0.5, 1.0]
    assert moments.geometric_mean(series) == pytest.approx(0.0, abs=1e-12)
    assert moments.arithmetic_mean(series) == pytest.approx(0.25)
    assert moments.geometric_mean(series) < moments.arithmetic_mean(series)


# --- Variance / volatility -------------------------------------------------


def test_variance_and_volatility_sample_default() -> None:
    # series mean 0.05; squared deviations sum to 0.0084.
    series = [0.04, 0.08, -0.02, 0.10]
    # Sample (ddof=1): 0.0084 / 3 = 0.0028.
    assert moments.variance(series) == pytest.approx(0.0028)
    assert moments.volatility(series) == pytest.approx(np.sqrt(0.0028))


def test_variance_population_ddof_zero() -> None:
    series = [0.04, 0.08, -0.02, 0.10]
    # Population (ddof=0): 0.0084 / 4 = 0.0021.
    assert moments.variance(series, ddof=0) == pytest.approx(0.0021)
    assert moments.volatility(series, ddof=0) == pytest.approx(np.sqrt(0.0021))


# --- Covariance / correlation ---------------------------------------------
# Returns matrices are time x asset: rows = periods, columns = assets.


def test_covariance_matrix_symmetric_and_diagonal_is_variance() -> None:
    # Asset A = [1, 2, 3], Asset B = [3, 2, 1] (perfectly anti-correlated).
    returns = np.array([[1.0, 3.0], [2.0, 2.0], [3.0, 1.0]])
    cov = moments.covariance_matrix(returns)
    # Symmetric.
    assert np.allclose(cov, cov.T)
    # Diagonal equals each column's own variance.
    assert cov[0, 0] == pytest.approx(moments.variance([1.0, 2.0, 3.0]))
    assert cov[1, 1] == pytest.approx(moments.variance([3.0, 2.0, 1.0]))
    # Known sample covariance: [[1, -1], [-1, 1]].
    assert np.allclose(cov, [[1.0, -1.0], [-1.0, 1.0]])


def test_correlation_matrix_perfectly_correlated() -> None:
    # B = 2 * A, so correlation is 1 everywhere.
    returns = np.array([[1.0, 2.0], [2.0, 4.0], [3.0, 6.0]])
    corr = moments.correlation_matrix(returns)
    assert np.allclose(corr, [[1.0, 1.0], [1.0, 1.0]])
    # Diagonal of a correlation matrix is always exactly 1.
    assert np.allclose(np.diag(corr), 1.0)


def test_cov_to_corr_known() -> None:
    cov = np.array([[0.04, 0.03], [0.03, 0.09]])  # vols 0.2 and 0.3, corr 0.5
    corr = moments.cov_to_corr(cov)
    assert np.allclose(corr, [[1.0, 0.5], [0.5, 1.0]])


def test_corr_to_cov_round_trips() -> None:
    corr = np.array([[1.0, 0.5], [0.5, 1.0]])
    vols = np.array([0.2, 0.3])
    cov = moments.corr_to_cov(corr, vols)
    assert np.allclose(cov, [[0.04, 0.03], [0.03, 0.09]])
    # Round trip back to the correlation matrix.
    assert np.allclose(moments.cov_to_corr(cov), corr)


# --- Portfolio volatility (the 2-asset known case) ------------------------


def test_portfolio_volatility_perfectly_correlated_is_weighted_average() -> None:
    # corr = 1, both vols 0.2 -> portfolio vol is exactly 0.2 for any weights.
    cov = np.array([[0.04, 0.04], [0.04, 0.04]])
    weights = np.array([0.5, 0.5])
    assert moments.portfolio_volatility(weights, cov) == pytest.approx(0.2)


def test_portfolio_variance_and_volatility_diversified() -> None:
    # vols 0.2 each, corr 0.5: w'Σw = 0.03.
    cov = np.array([[0.04, 0.02], [0.02, 0.04]])
    weights = np.array([0.5, 0.5])
    assert moments.portfolio_variance(weights, cov) == pytest.approx(0.03)
    assert moments.portfolio_volatility(weights, cov) == pytest.approx(np.sqrt(0.03))


# --- Nearest positive-semidefinite repair (core._linalg) ------------------


def test_is_positive_semidefinite_detects_valid_and_invalid() -> None:
    assert _linalg.is_positive_semidefinite(np.eye(2))
    assert _linalg.is_positive_semidefinite([[1.0, 0.5], [0.5, 1.0]])
    # Eigenvalues 3 and -1 -> not PSD.
    assert not _linalg.is_positive_semidefinite([[1.0, 2.0], [2.0, 1.0]])


def test_nearest_psd_repairs_an_invalid_matrix() -> None:
    # A correlation estimate that slipped out of range (eigenvalues 2.1, -0.1).
    bad = np.array([[1.0, 1.1], [1.1, 1.0]])
    assert not _linalg.is_positive_semidefinite(bad)
    repaired = _linalg.nearest_psd(bad)
    assert _linalg.is_positive_semidefinite(repaired)
    assert np.allclose(repaired, repaired.T)  # stays symmetric
    # Spectral projection clips -0.1 to 0: [[1.05, 1.05], [1.05, 1.05]].
    assert np.allclose(repaired, [[1.05, 1.05], [1.05, 1.05]])


def test_nearest_psd_leaves_a_valid_matrix_unchanged() -> None:
    good = np.array([[1.0, 0.5], [0.5, 1.0]])  # eigenvalues 1.5, 0.5
    assert np.allclose(_linalg.nearest_psd(good), good)
