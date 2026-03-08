from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None
    organization: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str | None
    organization: str | None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: str | None = None
    organization: str | None = None
    password: str | None = None  # if provided, update password


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
