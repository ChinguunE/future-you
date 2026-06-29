"""Known-answer tests for `core.decumulation` (METHODOLOGY §9, withdrawal phase).

The safe withdrawal that exactly drains a pot (the inverse of capital-needs) and
sequence-of-returns stress: a rough early retirement ends worse than the
average-return path, even with the same withdrawals.
"""

import pytest

from core import decumulation
from core.retirement import capital_needed

# --- Safe withdrawal (inverse of capital needed) ---------------------------


def test_safe_withdrawal_inverts_capital_needed() -> None:
    pot = 1_000_000.0
    income = decumulation.safe_withdrawal_amount(pot, 0.0, 25)
    assert income == pytest.approx(40_000)
    # Round trip: the capital needed for that income is the pot again.
    assert capital_needed(income, 25, 0.0) == pytest.approx(pot)


def test_safe_withdrawal_round_trips_with_a_real_rate() -> None:
    pot = 1_000_000.0
    income = decumulation.safe_withdrawal_amount(pot, 0.04, 30)
    assert capital_needed(income, 30, 0.04) == pytest.approx(pot)


# --- Withdrawal path -------------------------------------------------------


def test_withdrawal_terminal_known_paths() -> None:
    # Withdraw 10 at the start of each year, then the year's return applies.
    #   good-first: (100-10)*1.2 = 108 -> (108-10)*0.8 = 78.4
    #   bad-first:  (100-10)*0.8 = 72  -> (72-10)*1.2  = 74.4
    assert decumulation.withdrawal_terminal(100.0, [0.20, -0.20], 10.0) == pytest.approx(78.4)
    assert decumulation.withdrawal_terminal(100.0, [-0.20, 0.20], 10.0) == pytest.approx(74.4)


# --- Sequence-of-returns stress -------------------------------------------


def test_sequence_stress_ends_worse_than_the_average_path() -> None:
    returns = [0.20, -0.20]  # arithmetic mean 0
    withdrawal, initial = 10.0, 100.0
    stressed = decumulation.sequence_stress_terminal(initial, returns, withdrawal)
    average = decumulation.average_path_terminal(initial, 0.0, withdrawal, len(returns))
    assert stressed == pytest.approx(74.4)  # worst order: bad year first
    assert average == pytest.approx(80.0)  # flat mean-return path
    assert stressed < average
