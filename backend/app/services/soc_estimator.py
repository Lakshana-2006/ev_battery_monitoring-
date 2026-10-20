"""
State of Charge (SOC) Estimator Service
Implements Coulomb Counting with charge efficiency, integration bounds, and resting OCV recalibration.
"""
from typing import Optional
from datetime import datetime, timezone
from app.config import settings


class CoulombCountingSOCEstimator:
    """
    Coulomb Counting (Ah Integration) Algorithm:
    SOC(t) = SOC(t0) + (1 / C_nominal) * Integral( I(t) * eta dt ) * 100%
    
    Sign Convention:
    - I > 0: Charging (increases SOC), efficiency eta = COULOMB_CHARGE_EFFICIENCY (e.g. 0.98)
    - I < 0: Discharging (decreases SOC), efficiency eta = 1.00
    - I = 0: Resting
    """
    def __init__(self, capacity_ah: float = settings.BATTERY_CAPACITY_AH, initial_soc: float = settings.INITIAL_SOC_PERCENT):
        self.capacity_ah = capacity_ah
        self.capacity_as = capacity_ah * 3600.0  # Capacity in Ampere-seconds (Coulombs)
        self.current_soc = initial_soc
        self.last_timestamp: Optional[datetime] = None
        self.total_energy_wh: float = 0.0
        self.is_calibrated: bool = False
        self.resting_counter: int = 0

    def reset_state(self, soc: float):
        """Manually calibrate or reset current SOC."""
        self.current_soc = max(0.0, min(100.0, soc))
        self.is_calibrated = True
        self.last_timestamp = None

    def update(self, current_a: Optional[float], voltage_v: Optional[float], timestamp: Optional[datetime] = None) -> Optional[float]:
        """
        Updates the SOC based on elapsed time and current measurement.
        If current is unavailable (None), cannot integrate and returns None.
        """
        if current_a is None:
            return None  # Cannot calculate SOC without current measurements

        if timestamp is None:
            timestamp = datetime.now(timezone.utc)

        # First reading initialization
        if self.last_timestamp is None:
            self.last_timestamp = timestamp
            return round(self.current_soc, 2)

        dt = (timestamp - self.last_timestamp).total_seconds()
        self.last_timestamp = timestamp

        # Guard against clock jumps or negative intervals
        if dt <= 0 or dt > 3600.0:
            return round(self.current_soc, 2)

        # Efficiency calculation
        eta = settings.COULOMB_CHARGE_EFFICIENCY if current_a > 0 else 1.00
        
        # Delta charge in Coulombs (Ampere * seconds)
        delta_q_coulombs = current_a * dt * eta
        
        # Delta SOC in percentage
        delta_soc_pct = (delta_q_coulombs / self.capacity_as) * 100.0
        self.current_soc = max(0.0, min(100.0, self.current_soc + delta_soc_pct))

        # Check for OCV resting recalibration opportunities
        # If battery is resting (|current| < 0.1A) and voltage is stable
        if abs(current_a) < 0.15 and voltage_v is not None:
            self.resting_counter += 1
            series_cells = settings.SERIES_CELLS
            cell_v = voltage_v / series_cells

            # After resting for > 10 cycles (~15-20s):
            if self.resting_counter > 10:
                if cell_v >= 4.18:
                    # Full charge resting recalibration
                    self.current_soc = 100.0
                    self.is_calibrated = True
                elif cell_v <= 3.00:
                    # Deep discharge recalibration
                    self.current_soc = 0.0
                    self.is_calibrated = True
        else:
            self.resting_counter = 0

        return round(self.current_soc, 2)


# Global singleton instance for the default battery
soc_service = CoulombCountingSOCEstimator()
