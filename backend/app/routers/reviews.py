from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_, cast, String
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Project, CodeFile, Review, User
from ..schemas import ReviewIn, ReviewOut
from ..security import current_user, owned_project, owned_provider
from ..services.ai import review_code

router = APIRouter(tags=["Reviews"])


@router.post("/projects/{project_id}/reviews", response_model=ReviewOut, status_code=201)
async def create_review(
    project_id: str, payload: ReviewIn, db: Session = Depends(get_db), user: User = Depends(current_user)
):
    owned_project(db, user, project_id)
    provider = owned_provider(db, user, payload.provider_id)
    files = db.scalars(select(CodeFile).where(CodeFile.project_id == project_id).order_by(CodeFile.path)).all()
    if payload.file_ids:
        selected = set(payload.file_ids)
        files = [f for f in files if f.id in selected]
        if len(files) != len(selected):
            raise HTTPException(404, "One or more selected files were not found in this project")
    if not files:
        raise HTTPException(400, "Upload code before running a review")
    # Snapshot content before network I/O; saved paths and results represent this input.
    result = await review_code(provider, files, payload.mode)
    review = Review(
        project_id=project_id,
        mode=payload.mode,
        provider_name=provider.name,
        model=provider.model,
        file_paths=[f.path for f in files],
        result=result,
    )
    db.add(review)
    db.commit()
    return review


@router.get("/reviews", response_model=list[ReviewOut])
def list_reviews(
    q: str = Query(default="", max_length=200),
    project_id: str | None = None,
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    query = select(Review).join(Project).where(Project.user_id == user.id)
    if project_id:
        owned_project(db, user, project_id)
        query = query.where(Review.project_id == project_id)
    if q:
        escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        term = f"%{escaped}%"
        query = query.where(
            or_(
                Project.name.ilike(term, escape="\\"),
                Review.mode.ilike(term, escape="\\"),
                cast(Review.result, String).ilike(term, escape="\\"),
            )
        )
    return db.scalars(query.order_by(Review.created_at.desc()).limit(limit).offset(offset)).all()


@router.get("/reviews/{review_id}", response_model=ReviewOut)
def get_review(review_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(404, "Review not found")
    owned_project(db, user, review.project_id)
    return review
