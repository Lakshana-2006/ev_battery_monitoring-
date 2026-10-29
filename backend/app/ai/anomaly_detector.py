
"""
AI Anomaly Detection Service
Uses a NASA Battery Aging dataset-trained Isolation Forest.

Important:
This is experimental anomaly screening, not a validated battery
fault predictor or a replacement for physical battery protection.
"""

import os
import joblib
import numpy as np
from typing import Optional, Dict, Any
from app.config import settings


class AIAnomalyDetector:
    def __init__(self):
        self.model = None
        self.model_status = "NOT TRAINED"
        self.model_name = "NASA_BatteryAging_IsolationForest"
        self.model_version = "v1.0-experimental"

        # The NASA model was trained on these three features.
        self.feature_names = [
            "voltage_v",
            "current_a",
            "temperature_c",
        ]

        self.model_path = os.path.join(
            settings.MODEL_DIR, "isolation_forest.joblib"
        )
        self._load_saved_model()

    def _load_saved_model(self):
        """Load the saved estimator and its training feature names."""
        if not os.path.isfile(self.model_path):
            print(f"[AI] Model file not found: {self.model_path}")
            self.model_status = "NOT TRAINED"
            return

        try:
            saved = joblib.load(self.model_path)

            # Our training script saves a dictionary containing
            # the estimator and its feature names.
            if not isinstance(saved, dict) or "model" not in saved:
                raise ValueError(
                    "Unexpected model format: expected a dictionary "
                    "containing 'model' and 'features'."
                )

            model = saved["model"]
            features = saved.get("features")

            if not features:
                raise ValueError("Saved model has no feature list.")

            expected = [
                "voltage_v",
                "current_a",
                "temperature_c",
            ]

            if list(features) != expected:
                raise ValueError(
                    f"Feature mismatch. Expected {expected}, "
                    f"but model contains {list(features)}."
                )

            if not hasattr(model, "predict") or not hasattr(
                model, "decision_function"
            ):
                raise ValueError("Saved estimator does not support inference.")

            self.model = model
            self.feature_names = list(features)

            # The model has been trained, but its battery fault
            # detection performance has not been validated.
            self.model_status = "DEMO ONLY"

            print(
                f"[AI] NASA dataset model loaded: {self.model_path}"
            )
            print(f"[AI] Features: {self.feature_names}")
            print(f"[AI] Status: {self.model_status}")

        except Exception as exc:
            print(f"[AI] Model loading failed: {exc}")
            self.model = None
            self.model_status = "NOT TRAINED"

    def predict(
        self,
        voltage_v: Optional[float],
        current_a: Optional[float],
        temperature_c: Optional[float],
        power_w: Optional[float],
        allow_demo_fallback: bool = False,
    ) -> Dict[str, Any]:
        """Screen a measurement for unusual patterns."""

        if (
            voltage_v is None
            or current_a is None
            or temperature_c is None
        ):
            return {
                "anomaly_score": None,
                "is_anomaly": False,
                "model_name": self.model_name,
                "model_version": self.model_version,
                "model_status": self.model_status,
                "risk_level": "LOW",
                "explanation": (
                    "Missing voltage, current, or temperature. "
                    "AI inference skipped; LOW is not a safety clearance."
                ),
            }

        if self.model is None and not allow_demo_fallback:
            return {
                "anomaly_score": None,
                "is_anomaly": False,
                "model_name": self.model_name,
                "model_version": self.model_version,
                "model_status": "NOT TRAINED",
                "risk_level": "LOW",
                "explanation": (
                    "No usable trained model is loaded. "
                    "AI inference skipped; LOW is not a safety clearance."
                ),
            }

        if self.model is not None:
            try:
                # Match the exact three-feature training order.
                values = {
                    "voltage_v": float(voltage_v),
                    "current_a": float(current_a),
                    "temperature_c": float(temperature_c),
                }

                features = np.array(
                    [[values[name] for name in self.feature_names]],
                    dtype=float,
                )

                if not np.isfinite(features).all():
                    raise ValueError("Input contains non-finite values.")

                raw_score = float(
                    self.model.decision_function(features)[0]
                )
                prediction = int(self.model.predict(features)[0])
                is_anomaly = prediction == -1

                # These are screening labels, not calibrated battery
                # safety risk probabilities.
                screening_level = "LOW"
                if is_anomaly:
                    screening_level = (
                        "HIGH" if raw_score < -0.15 else "MEDIUM"
                    )

                if is_anomaly:
                    explanation = (
                        "NASA-trained Isolation Forest flagged an "
                        "unusual measurement pattern. This does not "
                        "confirm a battery fault."
                    )
                else:
                    explanation = (
                        "The measurement was not flagged as unusual "
                        "by the NASA-trained Isolation Forest. This "
                        "does not establish that the battery is safe."
                    )

                return {
                    "anomaly_score": round(raw_score, 4),
                    "is_anomaly": is_anomaly,
                    "model_name": self.model_name,
                    "model_version": self.model_version,
                    "model_status": self.model_status,
                    "risk_level": screening_level,
                    "explanation": explanation,
                }

            except Exception as exc:
                return {
                    "anomaly_score": None,
                    "is_anomaly": False,
                    "model_name": self.model_name,
                    "model_version": self.model_version,
                    "model_status": self.model_status,
                    "risk_level": "LOW",
                    "explanation": (
                        f"AI inference failed: {exc}. "
                        "No AI conclusion is available."
                    ),
                }

        # This fallback is permitted only for explicitly labelled
        # simulation telemetry when no trained model is available.
        temp_factor = max(0.0, (temperature_c - 35.0) / 20.0)
        curr_factor = max(0.0, (abs(current_a) - 10.0) / 10.0)
        score = round(
            0.25 - (temp_factor * 0.4 + curr_factor * 0.4), 3
        )
        is_anomaly = score < 0.0

        risk = "LOW"
        if score < -0.2:
            risk = "HIGH"
        elif is_anomaly:
            risk = "MEDIUM"

        return {
            "anomaly_score": score,
            "is_anomaly": is_anomaly,
            "model_name": "Heuristic_Simulation_Fallback",
            "model_version": "v1.0-demo",
            "model_status": "DEMO ONLY",
            "risk_level": risk,
            "explanation": (
                "Simulation-only heuristic result; not an ML prediction "
                "or a validated battery safety assessment."
            ),
        }


anomaly_detector = AIAnomalyDetector()
