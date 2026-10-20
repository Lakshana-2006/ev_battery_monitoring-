"""
Unit Tests for Coulomb Counting State of Charge (SOC) Estimator
"""
from datetime import datetime, timezone, timedelta
from app.services.soc_estimator import CoulombCountingSOCEstimator


def test_soc_coulomb_counting_discharge():
    # 2.5 Ah battery, initial SOC 80%
    estimator = CoulombCountingSOCEstimator(capacity_ah=2.5, initial_soc=80.0)
    t0 = datetime.now(timezone.utc)
    
    # First packet sets baseline time
    soc1 = estimator.update(current_a=-2.5, voltage_v=11.8, timestamp=t0)
    assert soc1 == 80.0

    # Discharge at 2.5A (1C rate) for 360 seconds (6 minutes = 10% capacity)
    t1 = t0 + timedelta(seconds=360)
    soc2 = estimator.update(current_a=-2.5, voltage_v=11.6, timestamp=t1)
    
    # 2.5A * 360s = 900 Coulombs.
    # Total capacity = 2.5 * 3600 = 9000 Coulombs.
    # 900 / 9000 = 10% decrease -> 80% - 10% = 70.0%
    assert abs(soc2 - 70.0) < 0.1


def test_soc_bounds_clamped():
    estimator = CoulombCountingSOCEstimator(capacity_ah=1.0, initial_soc=5.0)
    t0 = datetime.now(timezone.utc)
    estimator.update(current_a=-10.0, voltage_v=10.0, timestamp=t0)
    
    # Deep discharge over 2 hours
    t1 = t0 + timedelta(seconds=7200)
    soc = estimator.update(current_a=-10.0, voltage_v=9.0, timestamp=t1)
    assert soc >= 0.0


def test_soc_null_when_current_absent():
    estimator = CoulombCountingSOCEstimator(capacity_ah=2.5, initial_soc=80.0)
    soc = estimator.update(current_a=None, voltage_v=12.0)
    assert soc is None
