from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
def now_iso(): return datetime.utcnow().isoformat() + "Z"
class TaskRequest(BaseModel):
    prompt: str
    mode: Optional[str] = "text"
    session_id: Optional[str] = None  # For grouping conversations
class MemoryEditRequest(BaseModel):
    id: str
    content: str
class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    timestamp: datetime
    session_id: Optional[str] = None
    message_metadata: Optional[str] = None
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
class ChatHistoryResponse(BaseModel):
    messages: List[ChatMessageResponse]
class UserCreate(BaseModel):
    username: str
    password: str
class UserResponse(BaseModel):
    id: int
    username: str
    created_at: datetime
    class Config:
        from_attributes = True
class Token(BaseModel):
    access_token: str
    token_type: str
class TokenData(BaseModel):
    username: Optional[str] = None
