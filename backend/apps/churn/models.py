from __future__ import annotations

import uuid
from decimal import Decimal

from django.db import models

from accounts.models import Business
from data.models import Customer


class CustomerChurnScore(models.Model):
    """Persisted RFM and churn analytics for a customer."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="churn_scores",
    )
    customer = models.OneToOneField(
        Customer,
        on_delete=models.CASCADE,
        related_name="churn_score",
    )

    recency_score = models.PositiveSmallIntegerField()
    frequency_score = models.PositiveSmallIntegerField()
    monetary_score = models.PositiveSmallIntegerField()
    rfm_score = models.PositiveSmallIntegerField()
    rfm_segment = models.CharField(max_length=32)

    churn_risk_score = models.DecimalField(max_digits=5, decimal_places=2)
    churn_risk_level = models.CharField(max_length=16)
    risk_reason = models.CharField(max_length=255)

    purchase_count = models.PositiveIntegerField(default=0)
    total_spent = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    avg_purchase_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    days_since_purchase = models.PositiveIntegerField(default=0)
    last_purchase = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["business", "churn_risk_level"]),
            models.Index(fields=["business", "rfm_segment"]),
        ]
        ordering = ["-updated_at"]
        verbose_name = "Customer churn score"
        verbose_name_plural = "Customer churn scores"

    def __str__(self) -> str:  # pragma: no cover - human readable representation
        return f"Churn score for {self.customer.name} ({self.business.name})"
