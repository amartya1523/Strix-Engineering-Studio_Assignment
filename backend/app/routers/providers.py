from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Provider, User
from ..schemas import ProviderIn, ProviderOut
from ..security import current_user, owned_provider, encrypt
from ..services.ai import validate_url, complete

router = APIRouter(prefix="/providers", tags=["AI providers"])


def out(provider):
    result = ProviderOut.model_validate(provider)
    result.has_api_key = bool(provider.encrypted_key)
    return result


@router.get("", response_model=list[ProviderOut])
def list_providers(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return [
        out(p) for p in db.scalars(select(Provider).where(Provider.user_id == user.id).order_by(Provider.created_at))
    ]


@router.post("", response_model=ProviderOut, status_code=201)
def create_provider(payload: ProviderIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    provider = Provider(
        user_id=user.id,
        name=payload.name,
        base_url=validate_url(payload.base_url),
        model=payload.model,
        encrypted_key=encrypt(payload.api_key),
    )
    db.add(provider)
    db.commit()
    return out(provider)


@router.put("/{provider_id}", response_model=ProviderOut)
def update_provider(
    provider_id: str, payload: ProviderIn, db: Session = Depends(get_db), user: User = Depends(current_user)
):
    provider = owned_provider(db, user, provider_id)
    provider.name, provider.base_url, provider.model = payload.name, validate_url(payload.base_url), payload.model
    # Empty key on edit preserves the existing key; delete/recreate to remove a key.
    if payload.api_key:
        provider.encrypted_key = encrypt(payload.api_key)
    db.commit()
    return out(provider)


@router.delete("/{provider_id}", status_code=204)
def delete_provider(provider_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    db.delete(owned_provider(db, user, provider_id))
    db.commit()


@router.post("/{provider_id}/test")
async def test_provider(provider_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    provider = owned_provider(db, user, provider_id)
    await complete(provider, [{"role": "user", "content": "Reply with OK."}])
    return {"message": "Connection successful", "model": provider.model}
