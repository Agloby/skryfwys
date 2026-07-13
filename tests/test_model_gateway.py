from __future__ import annotations

import asyncio

from services.language_engine.models import PrivacyMode, RewriteMode, RewriteRequest
from services.language_engine.rewrite import rewrite_text
from services.model_gateway.gateway import ModelGateway, ModelRewritePayload, _openai_rewrite_schema


class _Provider:
    name = "test-provider"

    async def rewrite(self, request: RewriteRequest) -> ModelRewritePayload:
        return ModelRewritePayload(
            rewritten_text=request.text.replace("Op hierdie stadium", "Nou"),
            changes=[
                {
                    "original": "Op hierdie stadium",
                    "replacement": "Nou",
                    "explanation_af": "Korter formulering.",
                }
            ],
        )


def test_gateway_uses_value_comparison_for_cloud_privacy_mode() -> None:
    request = RewriteRequest(
        text="Op hierdie stadium stuur ek die nota.",
        mode=RewriteMode.CLEARER,
        privacy_mode=PrivacyMode.CLOUD_AI,
    )
    deterministic = rewrite_text(request)

    # Pydantic/FastAPI paths may reconstruct enum values; equality is the
    # intended contract, not object identity.
    assert request.model_copy().privacy_mode == PrivacyMode.CLOUD_AI

    response = asyncio.run(ModelGateway(_Provider()).rewrite(request, deterministic))
    assert response.ai_used is True
    assert response.provider == "test-provider"


def test_openai_schema_marks_every_property_required() -> None:
    schema = _openai_rewrite_schema()
    assert set(schema["required"]) == set(schema["properties"])
    change_schema = schema["properties"]["changes"]["items"]
    assert set(change_schema["required"]) == set(change_schema["properties"])
