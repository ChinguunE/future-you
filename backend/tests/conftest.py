"""Shared deterministic fixtures for the finance-core tests.

A tiny three-asset world — a volatile equity, a steadier bond, and a near-cash
holding — used across the optimisation, tilt, and allocation tests so the
known-answer numbers stay consistent.
"""

import numpy as np
import pytest
from numpy.typing import NDArray

# Fixed seed for any test that samples random portfolios.
SEED = 12345


@pytest.fixture
def market() -> tuple[NDArray[np.float64], NDArray[np.float64]]:
    """Expected annual returns and the covariance matrix for three assets.

    vols = [0.18, 0.07, 0.01]; equity/bond correlation 0.2; cash uncorrelated.
    cov[i, j] = corr[i, j] * vol_i * vol_j.
    """
    mu = np.array([0.08, 0.05, 0.02])
    cov = np.array(
        [
            [0.0324, 0.00252, 0.0],
            [0.00252, 0.0049, 0.0],
            [0.0, 0.0, 0.0001],
        ]
    )
    return mu, cov
