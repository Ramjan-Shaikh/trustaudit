import os, uuid, time
import google.generativeai as genai
from memory.graph_memory import GraphMemory
from utils.logger import log_event

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Configure the Gemini SDK
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class ExecutorAgent:
    def __init__(self, memory: GraphMemory):
        self.memory = memory
        self.current_task_id = None  # Track the current task ID for feedback loops

    async def run(self, prompt: str, feedback: dict = None, original_task_id: str = None):
        """
        Execute a task. If feedback is provided, acknowledge it and improve the response.
        
        Args:
            prompt: The original user prompt
            feedback: Optional feedback dict with 'explanation' and 'confidence' from auditor
            original_task_id: Optional task ID to link improved results back to original task
        """
        # Retrieve relevant context from memory (only for original prompts, not feedback loops)
        context_info = ""
        if not feedback:
            relevant_nodes = self.memory.search_relevant_context(prompt, limit=5)
            if relevant_nodes:
                context_info = "\n\nRelevant context from previous conversations:\n"
                for i, node in enumerate(relevant_nodes, 1):
                    node_type = node.get("type", "information")
                    node_content = node.get("content", "")[:200]  # Limit content length
                    context_info += f"{i}. [{node_type}]: {node_content}\n"
                context_info += "\nUse this context to provide a more informed and consistent response.\n"
        
        if feedback:
            log_event("executor.feedback", {"feedback": feedback})
            # Create a feedback-aware prompt
            feedback_prompt = (
                f"Original request: {prompt}\n\n"
                f"Auditor feedback (confidence: {feedback.get('confidence', 0):.2f}):\n"
                f"{feedback.get('explanation', 'No specific feedback provided')}\n\n"
                f"Please acknowledge this feedback and provide an improved response that addresses the concerns."
            )
            execution_prompt = feedback_prompt
        else:
            log_event("executor.start", {"prompt": prompt})
            # Include context in the prompt
            execution_prompt = prompt + context_info

        # Add prompt to graph memory (only for original prompts, not feedback loops)
        if not feedback:
            task = {
                "id": str(uuid.uuid4()),
                "type": "task",
                "content": prompt,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            }
            self.memory.add_node(task)
            self.current_task_id = task["id"]
            task_id = task["id"]
        else:
            # For feedback loops, use the original task ID if provided
            task_id = original_task_id or self.current_task_id

        # Generate real or mock response
        if GEMINI_API_KEY:
            try:
                model = genai.GenerativeModel("gemini-2.5-flash")
                response = model.generate_content(execution_prompt)
                text = response.text
                confidence = 0.95
            except Exception as e:
                text = f"[ERROR] Gemini API failed: {str(e)}"
                confidence = 0.0
        else:
            text = f"[MOCK]{execution_prompt[:100]}..."
            confidence = 0.5

        result = {
            "id": str(uuid.uuid4()),
            "type": "result",
            "content": text,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "explain": {"confidence": confidence, "model": "gemini-2.5-flash"},
        }
        
        if feedback:
            result["feedback_acknowledged"] = True
            result["original_confidence"] = feedback.get("confidence", 0)

        self.memory.add_node(result)
        if task_id:
            if feedback:
                # Link improved result to original task
                self.memory.add_edge(task_id, result["id"], "ImprovedBy")
            else:
                # Link initial result to task
                self.memory.add_edge(task_id, result["id"], "GeneratedBy")

        log_event("executor.finish", {"result_id": result["id"], "has_feedback": feedback is not None})
        return result
