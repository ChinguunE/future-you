"""Linear-algebra helpers shared by moments, frontier, and analytics.

The headline routine is :func:`nearest_psd`. Real-world covariance and
correlation estimates can drift slightly out of the valid range (sampling
noise, a hand-entered entry just over 1, blending mismatched assumptions),
leaving a matrix that is **not** positive-semidefinite. An optimiser fed such a
matrix can manufacture risk-free return that does not exist. We project back to
the closest valid (PSD) matrix in Frobenius norm by clipping negative
eigenvalues up to a floor (METHODOLOGY §1: "keeps the risk model valid").
"""

from __future__ import annotations

import numpy as np
from numpy.typing import ArrayLike, NDArray


def _as_square(matrix: ArrayLike) -> NDArray[np.float64]:
    m = np.asarray(matrix, dtype=np.float64)
    if m.ndim != 2 or m.shape[0] != m.shape[1]:
        raise ValueError("matrix must be square")
    return m


def is_positive_semidefinite(matrix: ArrayLike, *, tol: float = 1e-10) -> bool:
    """True if ``matrix`` is symmetric and positive-semidefinite.

    Symmetric so the risk model is internally consistent; all eigenvalues
    ``>= -tol`` so no direction has negative variance.
    """
    m = _as_square(matrix)
    if not np.allclose(m, m.T, atol=tol):
        return False
    eigenvalues = np.linalg.eigvalsh((m + m.T) / 2.0)
    return bool(eigenvalues.min() >= -tol)


def nearest_psd(matrix: ArrayLike, *, floor: float = 0.0) -> NDArray[np.float64]:
    """Closest positive-semidefinite matrix in Frobenius norm.

    Symmetrise, eigen-decompose, clip every eigenvalue up to ``floor`` (0 by
    default), then reconstruct. A matrix that is already PSD comes back
    unchanged (up to floating-point noise).
    """
    m = _as_square(matrix)
    symmetric = (m + m.T) / 2.0
    eigenvalues, eigenvectors = np.linalg.eigh(symmetric)
    clipped = np.clip(eigenvalues, floor, None)
    repaired = (eigenvectors * clipped) @ eigenvectors.T
    # Force exact symmetry against tiny floating-point drift.
    return np.asarray((repaired + repaired.T) / 2.0, dtype=np.float64)
