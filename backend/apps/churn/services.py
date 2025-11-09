from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Callable, Dict, Iterable, List

from django.db import transaction
from django.db.models import Avg, Count, Max, Sum
from django.utils import timezone

from accounts.models import Business
from data.models import Customer, Transaction

from .models import CustomerChurnScore


@dataclass
class CustomerMetrics:
    customer: Customer
    purchase_count: int
    total_spent: Decimal
    avg_value: Decimal
    days_since: int
    last_purchase: date | None


class RFMCalculator:
    """Compute and persist RFM + churn scores for a business."""

    RECENCY_WEIGHT = Decimal("0.4")
    FREQUENCY_WEIGHT = Decimal("0.3")
    MONETARY_WEIGHT = Decimal("0.3")

    def __init__(self, business: Business):
        self.business = business

    @transaction.atomic
    def recalculate(self) -> List[CustomerChurnScore]:
        customers = list(Customer.objects.filter(business=self.business))
        if not customers:
            return []

        metrics_map = self._collect_metrics(customers)
        if not metrics_map:
            # Ensure churn scores exist (all zeroed) even if no transactions yet
            return [
                self._persist_score(metrics)
                for metrics in self._initial_metrics(customers).values()
            ]

        recency_scores = self._rank_scores(metrics_map.values(), key=lambda m: m.days_since, higher_is_better=False)
        frequency_scores = self._rank_scores(metrics_map.values(), key=lambda m: m.purchase_count, higher_is_better=True)
        monetary_scores = self._rank_scores(metrics_map.values(), key=lambda m: m.total_spent, higher_is_better=True)

        churn_objects: List[CustomerChurnScore] = []
        for customer_id, metrics in metrics_map.items():
            recency_score = recency_scores.get(customer_id, 1)
            frequency_score = frequency_scores.get(customer_id, 1)
            monetary_score = monetary_scores.get(customer_id, 1)

            churn_objects.append(
                self._persist_score(
                    metrics,
                    recency_score=recency_score,
                    frequency_score=frequency_score,
                    monetary_score=monetary_score,
                )
            )

        return churn_objects

    def _collect_metrics(self, customers: Iterable[Customer]) -> Dict[str, CustomerMetrics]:
        customer_map = {str(customer.customer_id): customer for customer in customers}
        customer_ids = list(customer_map.keys())
        stats = (
            Transaction.objects.filter(
                business=self.business,
                customer_id__in=customer_ids,
            )
            .values("customer_id")
            .annotate(
                last_purchase=Max("date"),
                purchase_count=Count("transaction_id"),
                total_spent=Sum("amount"),
                avg_value=Avg("amount"),
            )
        )

        today = timezone.now().date()
        metrics_map: Dict[str, CustomerMetrics] = {}
        for stat in stats:
            customer_id = str(stat["customer_id"])
            customer = customer_map.get(customer_id)
            if customer is None:
                continue

            last_purchase = stat["last_purchase"]
            days_since = (today - last_purchase).days if last_purchase else 365
            purchase_count = int(stat["purchase_count"] or 0)
            total_spent = Decimal(stat["total_spent"] or 0).quantize(Decimal("0.01"))
            avg_value_raw = Decimal(stat["avg_value"] or 0)
            avg_value = (
                avg_value_raw.quantize(Decimal("0.01")) if purchase_count else Decimal("0.00")
            )

            metrics_map[str(customer.customer_id)] = CustomerMetrics(
                customer=customer,
                purchase_count=purchase_count,
                total_spent=total_spent if purchase_count else Decimal("0.00"),
                avg_value=avg_value,
                days_since=days_since,
                last_purchase=last_purchase,
            )

        # Include customers with no transactions yet
        for customer in customers:
            key = str(customer.customer_id)
            if key not in metrics_map:
                metrics_map[key] = CustomerMetrics(
                    customer=customer,
                    purchase_count=0,
                    total_spent=Decimal("0.00"),
                    avg_value=Decimal("0.00"),
                    days_since=365,
                    last_purchase=None,
                )

        return metrics_map

    def _rank_scores(
        self,
        metrics: Iterable[CustomerMetrics],
        *,
        key: Callable[[CustomerMetrics], Decimal | int],
        higher_is_better: bool,
    ) -> Dict[str, int]:
        metrics_list = list(metrics)
        if not metrics_list:
            return {}

        sorted_metrics = sorted(
            metrics_list,
            key=lambda metric: key(metric),
            reverse=higher_is_better,
        )
        total = len(sorted_metrics)
        score_map: Dict[str, int] = {}

        for index, metric in enumerate(sorted_metrics, start=1):
            percentile = index / total
            if percentile <= 0.2:
                score = 5
            elif percentile <= 0.4:
                score = 4
            elif percentile <= 0.6:
                score = 3
            elif percentile <= 0.8:
                score = 2
            else:
                score = 1
            score_map[str(metric.customer.customer_id)] = score

        return score_map

    def _persist_score(
        self,
        metrics: CustomerMetrics,
        *,
        recency_score: int = 1,
        frequency_score: int = 1,
        monetary_score: int = 1,
    ) -> CustomerChurnScore:
        engagement = (
            Decimal(recency_score) * self.RECENCY_WEIGHT
            + Decimal(frequency_score) * self.FREQUENCY_WEIGHT
            + Decimal(monetary_score) * self.MONETARY_WEIGHT
        ) / Decimal("5") * Decimal("100")
        churn_risk_score = (Decimal("100") - engagement).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        churn_risk_score = min(Decimal("100"), max(Decimal("0"), churn_risk_score))

        if churn_risk_score >= 70:
            churn_risk_level = "high"
        elif churn_risk_score >= 40:
            churn_risk_level = "medium"
        else:
            churn_risk_level = "low"

        rfm_segment = self._segment_customer(
            recency_score,
            frequency_score,
            monetary_score,
            metrics.days_since,
        )
        risk_reason = self._build_risk_reason(metrics, recency_score, frequency_score, monetary_score)

        defaults = {
            "business": self.business,
            "recency_score": recency_score,
            "frequency_score": frequency_score,
            "monetary_score": monetary_score,
            "rfm_score": recency_score + frequency_score + monetary_score,
            "rfm_segment": rfm_segment,
            "churn_risk_score": churn_risk_score,
            "churn_risk_level": churn_risk_level,
            "risk_reason": risk_reason,
            "purchase_count": metrics.purchase_count,
            "total_spent": metrics.total_spent,
            "avg_purchase_value": metrics.avg_value,
            "days_since_purchase": metrics.days_since,
            "last_purchase": metrics.last_purchase,
        }

        churn_score, _ = CustomerChurnScore.objects.update_or_create(
            customer=metrics.customer,
            defaults=defaults,
        )

        # Keep high-level aggregate fields in sync on the customer record
        metrics.customer.total_purchases = metrics.total_spent
        metrics.customer.last_purchase = metrics.last_purchase
        metrics.customer.save(update_fields=["total_purchases", "last_purchase", "updated_at"])

        return churn_score

    def _segment_customer(
        self,
        recency: int,
        frequency: int,
        monetary: int,
        days_since: int,
    ) -> str:
        if recency >= 4 and frequency >= 4 and monetary >= 4:
            return "champion"
        if recency >= 3 and frequency >= 3:
            return "loyal"
        if days_since > 90:
            return "dormant"
        if recency <= 2:
            return "at_risk"
        if frequency <= 2:
            return "potential"
        if monetary <= 2:
            return "potential"
        return "potential"

    def _build_risk_reason(
        self,
        metrics: CustomerMetrics,
        recency_score: int,
        frequency_score: int,
        monetary_score: int,
    ) -> str:
        if metrics.purchase_count == 0:
            return "No purchases recorded yet"
        if metrics.days_since >= 120:
            return f"Last purchase {metrics.days_since} days ago"
        if recency_score <= 2:
            return f"Last purchase {metrics.days_since} days ago"
        if frequency_score <= 2:
            return f"Only {metrics.purchase_count} purchases so far"
        if monetary_score <= 2:
            avg_value = int(metrics.avg_value)
            return f"Low average spend (৳{avg_value}) compared to peers"
        return "Healthy engagement maintained"

    def _initial_metrics(self, customers: Iterable[Customer]) -> Dict[str, CustomerMetrics]:
        return {
            str(customer.customer_id): CustomerMetrics(
                customer=customer,
                purchase_count=0,
                total_spent=Decimal("0.00"),
                avg_value=Decimal("0.00"),
                days_since=365,
                last_purchase=None,
            )
            for customer in customers
        }
