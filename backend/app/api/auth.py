from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, UserUpdate, Token
from app.utils.security import hash_password, verify_password, create_access_token, decode_access_token
from app.api.deps import get_current_user_id

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    q = select(User).where(User.email == data.email)
    r = await db.execute(q)
    if r.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        name=data.name,
        organization=data.organization,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return Token(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email, name=user.name, organization=user.organization),
    )


@router.post("/login", response_model=Token)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    q = select(User).where(User.email == data.email)
    r = await db.execute(q)
    user = r.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return Token(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email, name=user.name, organization=user.organization),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    q = select(User).where(User.id == user_id)
    r = await db.execute(q)
    user = r.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(id=user.id, email=user.email, name=user.name, organization=user.organization)


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    data: UserUpdate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    q = select(User).where(User.id == user_id)
    r = await db.execute(q)
    user = r.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.name is not None:
        user.name = data.name
    if data.organization is not None:
        user.organization = data.organization
    if data.password is not None:
        if len(data.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        user.hashed_password = hash_password(data.password)
    await db.commit()
    await db.refresh(user)
    return UserResponse(id=user.id, email=user.email, name=user.name, organization=user.organization)
