from fastapi import APIRouter

from app.api import integrations, settings as settings_api

api_router = APIRouter(prefix="/api")
api_router.include_router(integrations.router)
api_router.include_router(settings_api.router)
