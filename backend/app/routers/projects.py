from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Project, CodeFile, Review, User
from ..schemas import ProjectIn, ProjectOut, FileOut, FileDetail
from ..security import current_user, owned_project
from ..services.uploads import MAX_TOTAL, MAX_FILES, parse_upload

router = APIRouter(prefix="/projects", tags=["Projects and files"])


def project_out(db, project):
    result = ProjectOut.model_validate(project)
    result.file_count = db.scalar(select(func.count()).select_from(CodeFile).where(CodeFile.project_id == project.id))
    result.review_count = db.scalar(select(func.count()).select_from(Review).where(Review.project_id == project.id))
    return result


@router.get("", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return [
        project_out(db, p)
        for p in db.scalars(select(Project).where(Project.user_id == user.id).order_by(Project.created_at.desc()))
    ]


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    project = Project(user_id=user.id, **payload.model_dump())
    db.add(project)
    db.commit()
    return project_out(db, project)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return project_out(db, owned_project(db, user, project_id))


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    db.delete(owned_project(db, user, project_id))
    db.commit()


@router.get("/{project_id}/files", response_model=list[FileOut])
def list_files(project_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    owned_project(db, user, project_id)
    return db.scalars(select(CodeFile).where(CodeFile.project_id == project_id).order_by(CodeFile.path)).all()


@router.get("/{project_id}/files/{file_id}", response_model=FileDetail)
def get_file(project_id: str, file_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    owned_project(db, user, project_id)
    file = db.get(CodeFile, file_id)
    if not file or file.project_id != project_id:
        raise HTTPException(404, "File not found")
    return file


@router.post("/{project_id}/files", response_model=list[FileOut], status_code=201)
async def upload_files(
    project_id: str,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    project = owned_project(db, user, project_id)
    db.execute(select(Project).where(Project.id == project.id).with_for_update())
    incoming = {}
    total = 0
    if len(files) > MAX_FILES:
        raise HTTPException(413, "Too many files")
    for upload in files:
        data = await upload.read(MAX_TOTAL + 1)
        total += len(data)
        if total > MAX_TOTAL:
            raise HTTPException(413, "Upload exceeds 10 MB")
        for item in parse_upload(upload.filename or "unknown", data):
            incoming[item["path"]] = item
    if not incoming:
        raise HTTPException(
            400, "No supported UTF-8 source files found. Secret .env files and generated folders are excluded."
        )
    existing = {f.path: f for f in db.scalars(select(CodeFile).where(CodeFile.project_id == project_id))}
    if len(set(existing) | set(incoming)) > MAX_FILES:
        raise HTTPException(413, "A project can contain up to 300 files")
    if (
        sum(item["size"] for item in incoming.values()) + sum(f.size for p, f in existing.items() if p not in incoming)
        > MAX_TOTAL
    ):
        raise HTTPException(413, "Project exceeds 10 MB")
    result = []
    for path, item in incoming.items():
        file = existing.get(path)
        if file:
            for key, value in item.items():
                setattr(file, key, value)
        else:
            file = CodeFile(project_id=project_id, **item)
            db.add(file)
        result.append(file)
    db.commit()
    return result
