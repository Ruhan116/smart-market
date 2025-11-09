import logging
from typing import Iterable

from django.db import transaction

from accounts.models import Business

from .services import RFMCalculator

logger = logging.getLogger(__name__)


def recalculate_rfm_scores(business_id: str, affected_customers: Iterable[str] | None = None) -> None:
    """Recalculate and persist churn scores for a business."""

    del affected_customers  # scoring is relative across the full cohort

    try:
        business = Business.objects.get(id=business_id)
    except Business.DoesNotExist:
        logger.warning("Churn recalculation skipped; business %s not found", business_id)
        return

    calculator = RFMCalculator(business)
    with transaction.atomic():
        churn_scores = calculator.recalculate()

    logger.info(
        "Churn recalculation complete for business %s (%s customers)",
        business_id,
        len(churn_scores),
    )
