"""
AI Anomaly Detection Service
Provides unsupervised Isolation Forest baseline inference and status tracking.

Strict Rule:
Untrained models must report 'NOT TRAINED' and must NEVER claim false predictions.
Rule-based threshold alerts are kept strictly separate from AI anomaly inferences.
"""
import os
import joblib
import numpy as np
from typing import Optional, Dict, Any
from app.config import settings


class AIAnomalyDetector:
    def __init__(self):
        self.model = None
        self.model_status: str = "NOT TRAINED"  # NOT TRAINED, DEMO ONLY, VALIDATED
        self.model_name: str = "IsolationForest_Baseline"
        self.model_version: str = "v1.0.0"
        self.feature_names = ["voltage_v", "current_a", "temperature_c", "power_w"]
        self.model_path = os.path.join(settings.MODEL_DIR, "isolation_forest.joblib")
        self._load_saved_model()

    def _load_saved_model(self):
        """Attempts to load a trained model from disk if available."""
        if os.path.exists(self.model_path):
            try:
                saved = joblib.load(self.model_path)
                self.model = saved.get("model")
                self.model_status = saved.get("status", "DEMO ONLY")
                self.model_version = saved.get("version", "v1.0.0")
                print(f"[AI] Successfully loaded trained model from {self.model_path} with status: {self.model_status}")
            except Exception as e:
                print(f"[AI] Error loading model from {self.model_path}: {e}")
                self.model = None
                self.model_status = "NOT TRAINED"
        else:
            self.model = None
            self.model_status = "NOT TRAINED"

    def predict(self, voltage_v: Optional[float], current_a: Optional[float],
                temperature_c: Optional[float], power_w: Optional[float],
                allow_demo_fallback: bool = False) -> Dict[str, Any]:
        """
        Runs anomaly detection inference.
        Returns:
            anomaly_score: float (Negative = more anomalous)
            is_anomaly: bool
            model_status: str
            risk_level: 'LOW', 'MEDIUM', 'HIGH'
            explanation: str
        """
        # If model is not trained and demo fallback is not requested
        if self.model is None and not allow_demo_fallback:
            return {
                "anomaly_score": None,
                "is_anomaly": False,
                "model_name": self.model_name,
                "model_version": self.model_version,
                "model_status": "NOT TRAINED",
                "risk_level": "LOW",
                "explanation": "AI model is not trained yet. Collect baseline hardware/telemetry data to train."
            }

        # Any missing required sensor feature invalidates ML vector
        if voltage_v is None or current_a is None or temperature_c is None:
            return {
                "anomaly_score": None,
                "is_anomaly": False,
                "model_name": self.model_name,
                "model_version": self.model_version,
                "model_status": self.model_status,
                "risk_level": "LOW",
                "explanation": "Missing sensor feature(s) - inference skipped."
            }

        calc_power = power_w if power_w is not None else (voltage_v * current_a)
        features = np.array([[voltage_v, current_a, temperature_c, calc_power]])

        if self.model is not None:
            try:
                # Isolation Forest: decision_function returns negative values for outliers
                raw_score = float(self.model.decision_function(features)[0])
                pred = int(self.model.predict(features)[0])  # -1 for anomaly, 1 for normal
                is_anomaly = (pred == -1)

                risk_level = "LOW"
                if raw_score < -0.15:
                    risk_level = "HIGH"
                elif raw_score < 0.0:
                    risk_level = "MEDIUM"

                explanation = (
                    f"Multivariate pattern is anomalous (isolation score: {raw_score:.3f})."
                    if is_anomaly else
                    f"Feature correlations align with normal operational envelope (score: {raw_score:.3f})."
                )

                return {
                    "anomaly_score": round(raw_score, 4),
                    "is_anomaly": is_anomaly,
                    "model_name": self.model_name,
                    "model_version": self.model_version,
                    "model_status": self.model_status,
                    "risk_level": risk_level,
                    "explanation": explanation
                }
            except Exception as e:
                return {
                    "anomaly_score": None,
                    "is_anomaly": False,
                    "model_name": self.model_name,
                    "model_version": self.model_version,
                    "model_status": self.model_status,
                    "risk_level": "LOW",
                    "explanation": f"Inference calculation error: {e}"
                }

        # Demo Fallback Mode (Statistically calculated for demonstration testing)
        # Evaluates sudden correlation shifts (e.g. high temp while discharging heavily or voltage drop mismatch)
        temp_factor = max(0.0, (temperature_c - 35.0) / 20.0)
        curr_factor = max(0.0, (abs(current_a) - 10.0) / 10.0)
        heuristic_score = round(0.25 - (temp_factor * 0.4 + curr_factor * 0.4), 3)
        is_demo_anomaly = heuristic_score < 0.0

        risk = "LOW"
        if heuristic_score < -0.2:
            risk = "HIGH"
        elif heuristic_score < 0.0:
            risk = "MEDIUM"

        return {
            "anomaly_score": heuristic_score,
            "is_anomaly": is_demo_anomaly,
            "model_name": "IsolationForest_Baseline (Demo Mode)",
            "model_version": "v1.0-demo",
            "model_status": "DEMO ONLY",
            "risk_level": risk,
            "explanation": "Synthesized baseline inference for simulation demonstrations. Train with real data for production."
        }


anomaly_detector = AIAnomalyDetector()
