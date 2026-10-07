from __future__ import annotations

import base64
import os
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="MimFlo French pronunciation assessment", version="0.1.0")\nMODEL_ID = os.getenv("MIMFLO_MODEL_ID", "facebook/wav2vec2-lv-60-espeak-cv-ft")

class AssessRequest(BaseModel):
    audio: str = Field(min_length=16)
    reference: str = Field(min_length=1, max_length=20000)
    language: str = "fr-FR"


def model_ready() -> bool:
    # The endpoint is fail-closed until a validated French phoneme model is installed.
    return os.getenv("MIMFLO_FRENCH_MODEL_READY", "false").lower() == "true"


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "modelReady": model_ready(), "language": "fr-FR", "model": MODEL_ID}


@app.post("/assess")
def assess(payload: AssessRequest) -> dict[str, Any]:
    if payload.language.lower() not in {"fr", "fr-fr"}:
        raise HTTPException(HTTPStatus.BAD_REQUEST, "Seul le français est pris en charge.")
    try:
        raw = base64.b64decode(payload.audio, validate=True)
    except Exception as exc:
        raise HTTPException(HTTPStatus.BAD_REQUEST, "Audio WAV base64 invalide.") from exc
    if len(raw) < 44:
        raise HTTPException(HTTPStatus.BAD_REQUEST, "Audio WAV vide ou invalide.")
    if not model_ready():
        raise HTTPException(HTTPStatus.SERVICE_UNAVAILABLE, "Le modèle phonétique français n'est pas encore chargé.")
    # Deliberately no heuristic fallback: the validated OpenPronounce-compatible
    # inference implementation must be installed before enabling this flag.
    raise HTTPException(HTTPStatus.NOT_IMPLEMENTED, "Le moteur français validé doit être installé avant activation.")


