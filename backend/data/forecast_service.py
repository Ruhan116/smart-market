from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Dict, List

import pandas as pd
from django.db.models import Sum
from django.utils import timezone
from prophet import Prophet

from .models import Transaction


@dataclass
class ForecastResult:
    historical: List[Dict[str, object]]
    forecast: List[Dict[str, object]]
    metrics: Dict[str, object]
    generated_at: str


class DemandForecastService:
    """Generate demand forecasts for products using Prophet."""

    def __init__(self, business):
        self.business = business

    def forecast_product(self, product_id, periods: int = 30) -> ForecastResult:
        qs = (
            Transaction.objects
            .filter(business=self.business, product_id=product_id)
            .values('date')
            .order_by('date')
            .annotate(total_quantity=Sum('quantity'))
        )

        rows = list(qs)
        if not rows:
            raise ValueError('Not enough transaction history to generate a forecast for this product.')

        df = self._build_training_frame(rows)

        try:
            model = Prophet(
                daily_seasonality=True,
                weekly_seasonality=True,
                yearly_seasonality=False,
                changepoint_prior_scale=0.5,  # allow more flexible trend shifts
                seasonality_prior_scale=20.0,  # enable stronger seasonal amplitudes
            )
            model.fit(df)
        except Exception as exc:  # pragma: no cover - prophet fitting failures are rare but possible
            raise ValueError('Failed to train forecasting model') from exc

        future = model.make_future_dataframe(periods=periods, freq='D', include_history=True)
        forecast_frame = model.predict(future)

        predictions = self._extract_predictions(forecast_frame, periods)
        historical = self._serialize_historical(df)
        metrics = self._compute_metrics(forecast_frame, df)

        return ForecastResult(
            historical=historical,
            forecast=predictions,
            metrics=metrics,
            generated_at=timezone.now().isoformat(),
        )

    def _build_training_frame(self, rows: List[Dict[str, object]]) -> pd.DataFrame:
        if len(rows) == 1:
            single = rows[0]
            base_date = single['date']
            rows = [
                {'date': base_date - timedelta(days=1), 'total_quantity': single['total_quantity']},
                single,
            ]

        df = pd.DataFrame(rows)
        df = df.rename(columns={'date': 'ds', 'total_quantity': 'y'})
        df['ds'] = pd.to_datetime(df['ds'])
        df['y'] = df['y'].astype(float)
        return df

    def _extract_predictions(self, forecast_frame: pd.DataFrame, periods: int) -> List[Dict[str, object]]:
        tail = forecast_frame.tail(periods)
        results: List[Dict[str, object]] = []
        for _, row in tail.iterrows():
            date_value = row['ds'].date().isoformat()
            results.append({
                'date': date_value,
                'predicted': max(0.0, float(row['yhat'])),
                'lower': max(0.0, float(row['yhat_lower'])),
                'upper': max(0.0, float(row['yhat_upper'])),
            })
        return results

    def _serialize_historical(self, df: pd.DataFrame) -> List[Dict[str, object]]:
        historical: List[Dict[str, object]] = []
        for _, row in df.iterrows():
            historical.append({
                'date': row['ds'].date().isoformat(),
                'quantity': float(row['y']),
            })
        return historical

    def _compute_metrics(self, forecast_frame: pd.DataFrame, training_frame: pd.DataFrame) -> Dict[str, object]:
        merged = forecast_frame[['ds', 'yhat']].merge(training_frame, on='ds', how='left')
        merged = merged.dropna(subset=['y'])
        if merged.empty:
            return {'mape': None, 'data_points': 0}

        actual = merged['y']
        prediction = merged['yhat']
        with pd.option_context('mode.use_inf_as_na', True):
            denominator = actual.replace(0, pd.NA)
            errors = (actual - prediction).abs() / denominator
            errors = errors.dropna()
        mape = float(errors.mean()) * 100 if not errors.empty else None
        return {
            'mape': mape,
            'data_points': int(len(training_frame)),
        }