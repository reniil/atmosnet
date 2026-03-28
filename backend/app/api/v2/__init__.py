from fastapi import APIRouter
from .enterprise import router as enterprise_router

router = APIRouter()
router.include_router(enterprise_router)
