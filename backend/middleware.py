"""
Middleware for rate limiting and input validation
"""
from fastapi import Request, HTTPException, status
from functools import lru_cache
from datetime import datetime, timedelta
from collections import defaultdict
import time

# Simple in-memory rate limiter (for production, use Redis)
_rate_limit_store = defaultdict(list)
_rate_limit_window = 60  # 60 seconds
_rate_limit_max_requests = 30  # 30 requests per minute per user


def rate_limit_middleware(request: Request, user_id: int = None):
    """
    Simple rate limiting middleware.
    In production, use Redis or a proper rate limiting library.
    """
    # Use user_id if available, otherwise use IP
    identifier = f"user_{user_id}" if user_id else f"ip_{request.client.host}"
    
    now = time.time()
    # Clean old entries
    _rate_limit_store[identifier] = [
        timestamp for timestamp in _rate_limit_store[identifier]
        if now - timestamp < _rate_limit_window
    ]
    
    # Check rate limit
    if len(_rate_limit_store[identifier]) >= _rate_limit_max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )
    
    # Add current request
    _rate_limit_store[identifier].append(now)
    
    return True


def validate_prompt(prompt: str, max_length: int = 5000) -> str:
    """
    Validate and sanitize user prompt.
    """
    if not prompt or not isinstance(prompt, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prompt must be a non-empty string"
        )
    
    prompt = prompt.strip()
    
    if len(prompt) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prompt cannot be empty"
        )
    
    if len(prompt) > max_length:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Prompt too long. Maximum length is {max_length} characters."
        )
    
    return prompt

