import re
import json
from datetime import datetime
from memory.graph_memory import GraphMemory
from utils.logger import log_action
import google.generativeai as genai
import os

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class AuditorAgent:
    def __init__(self, memory: GraphMemory):
        self.memory = memory
        self.model = genai.GenerativeModel("models/gemini-2.5-flash")

    def run(self, result_node):
        """Auditor reviews the Executor output and returns structured feedback."""
        if isinstance(result_node, dict):
            content = result_node.get("content", "")
        else:
            content = str(result_node)

        prompt = (
            f"You are an AI auditor reviewing another AI’s response.\n"
            f"Response:\n{content}\n\n"
            f"Return ONLY a valid JSON in this format:\n"
            f'{{"verdict": "pass|revise|fail", "confidence": 0.0-1.0, "explanation": "text"}}'
        )

        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()

            # ✅ Extract JSON portion even if surrounded by markdown or text
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                clean_json = match.group(0)
                audit_data = json.loads(clean_json)
            else:
                audit_data = {
                    "verdict": "unknown",
                    "confidence": 0,
                    "explanation": text,
                }

        except Exception as e:
            audit_data = {
                "verdict": "error",
                "confidence": 0,
                "explanation": f"Audit failed: {str(e)}",
            }

        # Log audit decision to graph memory
        node = self.memory.add_node({
            "type": "audit",
            "content": json.dumps(audit_data),
            "timestamp": datetime.utcnow().isoformat()
        })

        if isinstance(result_node, dict) and result_node.get("id"):
            self.memory.add_edge(result_node["id"], node["id"], "CheckedBy")

        log_action("AUDIT", audit_data)
        return audit_data
