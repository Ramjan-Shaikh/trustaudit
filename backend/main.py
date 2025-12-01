from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from datetime import timedelta
import json
import uuid

# Load environment variables
load_dotenv()

# Import internal modules
from memory.graph_memory import GraphMemory
from agents.executor_agent import ExecutorAgent
from agents.auditor_agent import AuditorAgent
from models.schemas import (
    TaskRequest, MemoryEditRequest, ChatMessageResponse, ChatHistoryResponse,
    UserCreate, UserResponse, Token
)
from database import init_db, get_db, ChatMessage, User, GraphNode, GraphEdge
from auth import (
    get_password_hash, authenticate_user, create_access_token,
    get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
)
from middleware import rate_limit_middleware, validate_prompt

# Initialize database
init_db()

# Initialize FastAPI app
app = FastAPI(title="TrustAudit++ API")

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Note: Memory and agents are now created per-user in endpoints


@app.get("/health")
def health():
    """Simple health check endpoint."""
    return {"status": "ok"}


# ==================== Authentication Endpoints ====================

@app.post("/auth/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user account"""
    # Check if user already exists
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/auth/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and get access token"""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user


@app.post("/execute_task")
async def execute_task(
    req: TaskRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Executor agent handles a user prompt and Auditor verifies it."""
    # Rate limiting
    try:
        rate_limit_middleware(request, user_id=current_user.id)
    except HTTPException:
        raise  # Re-raise rate limit errors
    
    # Validate and sanitize prompt
    validated_prompt = validate_prompt(req.prompt)
    
    # Generate or use provided session_id
    session_id = req.session_id or str(uuid.uuid4())
    
    # Save user message to database (with user_id)
    user_message = ChatMessage(
        user_id=current_user.id,
        role="user",
        content=validated_prompt,
        session_id=session_id
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)
    
    # Create user-specific memory and agents
    user_memory = GraphMemory(db=db, user_id=current_user.id)
    
    # Store user message in graph memory for context retrieval
    user_message_node = user_memory.add_node({
        "type": "user_message",
        "content": validated_prompt
    })
    
    executor = ExecutorAgent(user_memory)
    auditor = AuditorAgent(user_memory)
    
    # Execute task - initial response
    result = await executor.run(validated_prompt)
    audit = auditor.run(result)

    # ✅ Ensure audit is parsed properly
    if isinstance(audit, str):
        try:
            audit = json.loads(audit)
        except json.JSONDecodeError:
            audit = {
                "verdict": "unknown",
                "confidence": 0,
                "explanation": str(audit),
            }

    # Feedback loop: If confidence is less than 0.85, send feedback to executor
    confidence = audit.get("confidence", 0)
    max_iterations = 2  # Limit to prevent infinite loops
    iteration = 0
    improved_result = result
    final_audit = audit
    original_task_id = None
    
    # Get the original task ID from the first result
    if result.get("id"):
        # Find the task that generated this result
        graph = user_memory.fetch_graph()
        for edge in graph.get("edges", []):
            if edge.get("target") == result.get("id") and edge.get("label") == "GeneratedBy":
                original_task_id = edge.get("source")
                break
    
    while confidence < 0.85 and iteration < max_iterations:
        iteration += 1
        # Send feedback to executor for improvement
        improved_result = await executor.run(validated_prompt, feedback=audit, original_task_id=original_task_id)
        
        # Re-audit the improved response
        final_audit = auditor.run(improved_result)
        
        # Ensure audit is parsed properly
        if isinstance(final_audit, str):
            try:
                final_audit = json.loads(final_audit)
            except json.JSONDecodeError:
                final_audit = {
                    "verdict": "unknown",
                    "confidence": 0,
                    "explanation": str(final_audit),
                }
        
        confidence = final_audit.get("confidence", 0)
        
        # Update audit for next iteration if needed
        audit = final_audit
        
        # If still low confidence but we've reached max iterations, break
        if iteration >= max_iterations:
            break

    # Use the final (potentially improved) result
    result = improved_result
    audit = final_audit

    # Save assistant response to database (with user_id)
    assistant_message = ChatMessage(
        user_id=current_user.id,
        role="assistant",
        content=result.get("content", str(result)),
        session_id=session_id,
        message_metadata=json.dumps({
            "audit": audit, 
            "result_id": result.get("id"),
            "iterations": iteration + 1,
            "improved": iteration > 0
        })
    )
    db.add(assistant_message)
    db.commit()
    db.refresh(assistant_message)
    
    # Store assistant message in graph memory and link to user message
    assistant_message_node = user_memory.add_node({
        "type": "assistant_message",
        "content": result.get("content", str(result))
    })
    
    # Link user message to assistant response
    if user_message_node and assistant_message_node:
        user_memory.add_edge(user_message_node["id"], assistant_message_node["id"], "RespondedTo")
    
    # Link assistant message to the result node (if exists)
    if result.get("id") and assistant_message_node:
        user_memory.add_edge(assistant_message_node["id"], result.get("id"), "ContainsResult")

    return {
        "result": result,
        "audit": audit,
        "session_id": session_id,
        "message_id": assistant_message.id,
        "iterations": iteration + 1,
        "improved": iteration > 0
    }


@app.post("/audit_task")
def audit_task(
    result_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Auditor reviews an existing result node."""
    # Create user-specific memory and auditor
    user_memory = GraphMemory(db=db, user_id=current_user.id)
    auditor = AuditorAgent(user_memory)
    
    graph = user_memory.fetch_graph()
    nodes = {n["id"]: n for n in graph["nodes"]}
    result_node = nodes.get(result_id)

    if not result_node:
        raise HTTPException(status_code=404, detail="Result not found")

    audit = auditor.run(result_node)

    # ✅ Parse audit JSON safely
    if isinstance(audit, str):
        try:
            audit = json.loads(audit)
        except json.JSONDecodeError:
            audit = {
                "verdict": "unknown",
                "confidence": 0,
                "explanation": str(audit),
            }

    return {"audit": audit}


@app.get("/memory")
def get_memory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch the current user's graph-based memory."""
    user_memory = GraphMemory(db=db, user_id=current_user.id)
    return user_memory.fetch_graph()


@app.post("/memory/edit")
def edit_memory(
    req: MemoryEditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Edit a node in memory by ID."""
    user_memory = GraphMemory(db=db, user_id=current_user.id)
    node = user_memory.edit_node(req.id, req.content)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node


@app.delete("/memory/clear")
def clear_memory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clear all memory graph nodes and edges for the current user."""
    # Delete all graph edges for this user
    edges_deleted = db.query(GraphEdge).filter(GraphEdge.user_id == current_user.id).delete()
    # Delete all graph nodes for this user
    nodes_deleted = db.query(GraphNode).filter(GraphNode.user_id == current_user.id).delete()
    
    db.commit()
    
    return {
        "deleted_nodes": nodes_deleted,
        "deleted_edges": edges_deleted,
        "message": f"Cleared {nodes_deleted} node(s) and {edges_deleted} edge(s) from memory graph"
    }


@app.get("/chat/history")
def get_chat_history(
    session_id: str = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get chat history for the current user. If session_id is provided, returns messages for that session."""
    query = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id)
    
    if session_id:
        query = query.filter(ChatMessage.session_id == session_id)
    
    messages = query.order_by(ChatMessage.timestamp.asc()).limit(limit).all()
    # Convert SQLAlchemy models to Pydantic models
    message_list = [
        ChatMessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            timestamp=msg.timestamp,
            session_id=msg.session_id,
            message_metadata=msg.message_metadata
        )
        for msg in messages
    ]
    return ChatHistoryResponse(messages=message_list)


@app.get("/chat/sessions")
def get_chat_sessions(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of chat sessions for the current user (most recent first)"""
    from sqlalchemy import func
    
    sessions = db.query(
        ChatMessage.session_id,
        func.max(ChatMessage.timestamp).label("last_message_time"),
        func.count(ChatMessage.id).label("message_count")
    ).filter(ChatMessage.user_id == current_user.id).group_by(
        ChatMessage.session_id
    ).order_by(
        func.max(ChatMessage.timestamp).desc()
    ).limit(limit).all()
    
    return {
        "sessions": [
            {
                "session_id": s.session_id,
                "last_message_time": s.last_message_time.isoformat() if s.last_message_time else None,
                "message_count": s.message_count
            }
            for s in sessions
        ]
    }


@app.delete("/chat/history")
def clear_chat_history(
    session_id: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clear chat history for the current user. If session_id is provided, clears only that session."""
    query = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id)
    
    if session_id:
        query = query.filter(ChatMessage.session_id == session_id)
    
    deleted_count = query.delete()
    
    # Also clear memory graph if clearing all history (no session_id specified)
    if not session_id:
        # Delete all graph edges for this user
        edges_deleted = db.query(GraphEdge).filter(GraphEdge.user_id == current_user.id).delete()
        # Delete all graph nodes for this user
        nodes_deleted = db.query(GraphNode).filter(GraphNode.user_id == current_user.id).delete()
        
        db.commit()
        
        return {
            "deleted": deleted_count, 
            "message": f"Deleted {deleted_count} message(s), {nodes_deleted} graph node(s), and {edges_deleted} graph edge(s)"
        }
    
    db.commit()
    
    return {"deleted": deleted_count, "message": f"Deleted {deleted_count} message(s)"}
