from fastapi import APIRouter, HTTPException

from ..models import InsightsRequest, InsightsResponse
from ..services import InsightsGenerator

router = APIRouter(prefix="/api/insights", tags=["insights"])

insights_generator = InsightsGenerator()


@router.post("", response_model=InsightsResponse)
async def generate_insights(request: InsightsRequest):
    try:
        insights = insights_generator.generate_insights(
            profile_username=request.profile_username
        )

        return InsightsResponse(
            best_posting_time=insights["best_posting_time"],
            suggested_caption=insights["suggested_caption"],
            hashtags=insights["hashtags"],
            engagement_tip=insights["engagement_tip"],
            confidence_score=insights["confidence_score"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/posting-time")
async def get_best_posting_time():
    return {"best_time": insights_generator.calculate_best_posting_time()}


@router.get("/caption")
async def get_caption_suggestion(context: str = None):
    return {"caption": insights_generator.generate_caption(context)}


@router.get("/hashtags")
async def get_hashtag_suggestions(count: int = 5):
    return {"hashtags": insights_generator.generate_hashtags(count)}


@router.get("/tip")
async def get_engagement_tip():
    return {"tip": insights_generator.get_engagement_tip()}
