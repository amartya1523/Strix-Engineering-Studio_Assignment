from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def email_valid(cls, value):
        import re

        value = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid email address")
        return value


class Registration(Credentials):
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def name_valid(cls, value):
        if not value.strip():
            raise ValueError("Name is required")
        return value.strip()


class UserOut(ORMModel):
    id: str
    name: str
    email: str


class ProjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=2000)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value):
        if not value.strip():
            raise ValueError("Project name is required")
        return value.strip()


class ProjectOut(ORMModel):
    id: str
    name: str
    description: str
    created_at: datetime
    file_count: int = 0
    review_count: int = 0


class FileOut(ORMModel):
    id: str
    path: str
    language: str
    size: int


class FileDetail(FileOut):
    content: str


class ProviderIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    base_url: str = Field(min_length=8, max_length=500)
    model: str = Field(min_length=1, max_length=150)
    api_key: str = Field(default="", max_length=2000)

    @field_validator("name", "model")
    @classmethod
    def non_blank(cls, value):
        if not value.strip():
            raise ValueError("This field is required")
        return value.strip()


class ProviderOut(ORMModel):
    id: str
    name: str
    base_url: str
    model: str
    has_api_key: bool = False
    environment_managed: bool = False


ReviewMode = Literal["security", "performance", "quality", "documentation", "architecture"]


class ReviewIn(BaseModel):
    provider_id: str
    mode: ReviewMode = "quality"
    file_ids: list[str] = Field(default_factory=list, max_length=300)


class Issue(BaseModel):
    severity: Literal["critical", "high", "medium", "low"]
    file: str
    line: int | None = Field(default=None, ge=1)
    title: str = Field(min_length=1, max_length=300)
    description: str = Field(min_length=1, max_length=10000)
    recommendation: str = Field(min_length=1, max_length=10000)


class ReviewResult(BaseModel):
    summary: str = Field(min_length=1, max_length=20000)
    issues: list[Issue] = Field(default_factory=list, max_length=100)
    recommendations: list[str] = Field(default_factory=list, max_length=100)
    artifact: str | None = Field(default=None, max_length=100000)


class ReviewOut(ORMModel):
    id: str
    project_id: str
    mode: str
    provider_name: str
    model: str
    file_paths: list[str]
    result: dict
    created_at: datetime


class ChatIn(BaseModel):
    provider_id: str
    question: str = Field(min_length=1, max_length=4000)
    session_id: str | None = None

    @field_validator("question")
    @classmethod
    def non_blank(cls, value):
        if not value.strip():
            raise ValueError("Question is required")
        return value.strip()
