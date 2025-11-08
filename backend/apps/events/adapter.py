import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


def publish_event(topic: str, payload: Dict[str, Any]):
    """
    Publishes an event to trigger downstream processing.

    Instead of using a message queue (Redis, Kafka), this adapter
    directly calls downstream functions synchronously.

    Args:
        topic (str): Event topic (e.g., "transaction.parsed", "forecast.requested")
        payload (dict): Event payload with business_id, affected_products, etc.
    """
    logger.info(f"Event published: topic={topic}, payload={payload}")

    if topic == "transaction.parsed":
        # Trigger downstream processing for newly parsed transactions
        trigger_forecast_generation(payload)
        trigger_churn_calculation(payload)
    elif topic == "forecast.requested":
        # Other topic types can be added here
        logger.info(f"[STUB] Forecast requested event: {payload}")


def trigger_forecast_generation(payload: Dict[str, Any]):
    """
    Triggers forecast generation for affected products.

    This is imported from the forecasting app and called synchronously.
    In a real implementation, this would be enqueued to a Celery task.
    """
    try:
        from apps.forecasting.tasks import generate_forecasts

        business_id = payload.get('business_id')
        affected_products = payload.get('affected_products', [])

        logger.info(f"Triggering forecast generation for business {business_id}")
        generate_forecasts(business_id, affected_products)
    except ImportError as e:
        logger.error(f"Failed to import forecasting tasks: {e}")
    except Exception as e:
        logger.error(f"Error triggering forecast generation: {e}")


def trigger_churn_calculation(payload: Dict[str, Any]):
    """
    Triggers RFM/churn score recalculation for affected customers.

    This is imported from the churn app and called synchronously.
    In a real implementation, this would be enqueued to a Celery task.
    """
    try:
        from apps.churn.tasks import recalculate_rfm_scores

        business_id = payload.get('business_id')
        affected_customers = payload.get('affected_customers', [])

        logger.info(f"Triggering churn calculation for business {business_id}")
        recalculate_rfm_scores(business_id, affected_customers)
    except ImportError as e:
        logger.error(f"Failed to import churn tasks: {e}")
    except Exception as e:
        logger.error(f"Error triggering churn calculation: {e}")
