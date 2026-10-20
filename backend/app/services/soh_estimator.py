"""
State of Health (SOH) Estimator Interface
Defines the engineering interface for battery health assessment.

Strict Constraint:
SOH CANNOT be derived from instantaneous voltage or single-point readings.
True SOH estimation requires either:
1. Full 100% to 0% discharge capacity cycle integration under controlled load.
2. Electrochemical Impedance Spectroscopy (EIS).
3. Trained physics-informed degradation neural networks with long-term cycle history.

Until validated capacity-test datasets or calibrated BMS cycle counters are supplied,
this service strictly returns None (null) and status 'Not calibrated'.
"""
from typing import Optional, Dict, Any


class SOHEstimatorInterface:
    def __init__(self):
        self.is_calibrated: bool = False
        self.nominal_capacity_ah: float = 2.5
        self.actual_measured_capacity_ah: Optional[float] = None
        self.cycle_count: int = 0

    def estimate_soh(self, telemetry_history: list = None) -> Optional[float]:
        """
        Calculates SOH percentage: (Actual Usable Capacity / Nominal Rated Capacity) * 100%
        Returns None if calibrated full-cycle discharge data has not been logged.
        """
        if not self.is_calibrated or self.actual_measured_capacity_ah is None:
            return None  # Strictly return None as mandated
        
        return round((self.actual_measured_capacity_ah / self.nominal_capacity_ah) * 100.0, 1)

    def get_status(self) -> Dict[str, Any]:
        return {
            "status": "UNAVAILABLE" if not self.is_calibrated else "ESTIMATED",
            "message": "Not calibrated - requires full controlled discharge capacity cycle test data",
            "cycle_count": self.cycle_count,
            "nominal_capacity_ah": self.nominal_capacity_ah,
            "estimated_soh_pct": None if not self.is_calibrated else self.estimate_soh()
        }


# Global singleton instance
soh_service = SOHEstimatorInterface()
