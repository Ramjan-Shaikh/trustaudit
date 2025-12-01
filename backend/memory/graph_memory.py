import os, uuid
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from database import GraphNode, GraphEdge
import json

def now_iso():
    return datetime.utcnow().isoformat() + "Z"


class GraphMemory:
    def __init__(self, db: Optional[Session] = None, user_id: Optional[int] = None):
        """
        Initialize GraphMemory with database session and user_id.
        If db is None, falls back to in-memory NetworkX graph (for backward compatibility).
        """
        self.db = db
        self.user_id = user_id
        
        # Fallback to NetworkX if no database provided
        if db is None:
            import networkx as nx
            self.G = nx.DiGraph()
            self.use_db = False
        else:
            self.use_db = True

    # -------------------------------
    # Core Graph Functions
    # -------------------------------
    def add_node(self, node: Dict[str, Any]):
        """Add a node to the graph. Requires user_id if using database."""
        node.setdefault("id", str(uuid.uuid4()))
        node.setdefault("timestamp", now_iso())

        if self.use_db and self.db and self.user_id is not None:
            # Store in database
            graph_node = GraphNode(
                id=node["id"],
                user_id=self.user_id,
                type=node.get("type", "unknown"),
                content=node.get("content", ""),
                node_metadata=json.dumps(node.get("explain", {})) if "explain" in node else None
            )
            self.db.add(graph_node)
            self.db.commit()
        else:
            # Fallback to in-memory NetworkX
            if not hasattr(self, 'G'):
                import networkx as nx
                self.G = nx.DiGraph()
            self.G.add_node(node["id"], **node)
        
        return node

    def add_edge(self, a: str, b: str, rel: str):
        """Create a directional edge (a -> b) with label rel"""
        if self.use_db and self.db and self.user_id is not None:
            # Store in database
            edge = GraphEdge(
                user_id=self.user_id,
                source_id=a,
                target_id=b,
                label=rel
            )
            self.db.add(edge)
            self.db.commit()
        else:
            # Fallback to in-memory NetworkX
            if not hasattr(self, 'G'):
                import networkx as nx
                self.G = nx.DiGraph()
            self.G.add_edge(a, b, label=rel)

    def fetch_graph(self):
        """Return a frontend-compatible graph structure for the current user"""
        if self.use_db and self.db and self.user_id is not None:
            # Fetch from database
            nodes_query = self.db.query(GraphNode).filter(GraphNode.user_id == self.user_id).all()
            edges_query = self.db.query(GraphEdge).filter(GraphEdge.user_id == self.user_id).all()
            
            nodes = []
            for n in nodes_query:
                node_data = {
                    "id": n.id,
                    "type": n.type,
                    "content": n.content,
                    "timestamp": n.timestamp.isoformat() if n.timestamp else now_iso()
                }
                if n.node_metadata:
                    try:
                        node_data["explain"] = json.loads(n.node_metadata)
                    except:
                        pass
                nodes.append(node_data)
            
            edges = [
                {
                    "id": f"{e.source_id}-{e.target_id}",
                    "source": e.source_id,
                    "target": e.target_id,
                    "label": e.label or "related"
                }
                for e in edges_query
            ]
            
            return {"nodes": nodes, "edges": edges}
        else:
            # Fallback to in-memory NetworkX
            if not hasattr(self, 'G'):
                return {"nodes": [], "edges": []}
            nodes = [d for _, d in self.G.nodes(data=True)]
            edges = [
                {
                    "id": f"{a}-{b}",
                    "source": a,
                    "target": b,
                    "label": d.get("label", "related"),
                }
                for a, b, d in self.G.edges(data=True)
            ]
            return {"nodes": nodes, "edges": edges}

    def edit_node(self, node_id: str, new_content: str):
        """Update node content by ID"""
        if self.use_db and self.db and self.user_id is not None:
            node = self.db.query(GraphNode).filter(
                GraphNode.id == node_id,
                GraphNode.user_id == self.user_id
            ).first()
            if node:
                node.content = new_content
                self.db.commit()
                return {
                    "id": node.id,
                    "type": node.type,
                    "content": node.content,
                    "timestamp": node.timestamp.isoformat() if node.timestamp else now_iso()
                }
            return None
        else:
            # Fallback to in-memory NetworkX
            if hasattr(self, 'G') and node_id in self.G.nodes:
                self.G.nodes[node_id]["content"] = new_content
                return self.G.nodes[node_id]
            return None

    def search_relevant_context(self, query: str, limit: int = 5) -> list:
        """
        Search for relevant context nodes based on keyword matching.
        Returns a list of relevant nodes sorted by relevance.
        
        Args:
            query: The search query string
            limit: Maximum number of results to return
        
        Returns:
            List of relevant node dictionaries
        """
        if not query or not query.strip():
            return []
        
        query_lower = query.lower().strip()
        query_words = set(query_lower.split())
        
        if self.use_db and self.db and self.user_id is not None:
            # Fetch all nodes for this user
            nodes_query = self.db.query(GraphNode).filter(
                GraphNode.user_id == self.user_id
            ).all()
            
            scored_nodes = []
            for n in nodes_query:
                if not n.content:
                    continue
                
                content_lower = n.content.lower()
                content_words = set(content_lower.split())
                
                # Calculate relevance score: number of matching words
                matching_words = query_words.intersection(content_words)
                score = len(matching_words)
                
                # Bonus for exact phrase matches
                if query_lower in content_lower:
                    score += 2
                
                # Only include nodes with at least one matching word
                if score > 0:
                    node_data = {
                        "id": n.id,
                        "type": n.type,
                        "content": n.content,
                        "timestamp": n.timestamp.isoformat() if n.timestamp else now_iso(),
                        "relevance_score": score
                    }
                    if n.node_metadata:
                        try:
                            node_data["explain"] = json.loads(n.node_metadata)
                        except:
                            pass
                    scored_nodes.append(node_data)
            
            # Sort by relevance score (descending) and return top results
            scored_nodes.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
            return scored_nodes[:limit]
        else:
            # Fallback to in-memory NetworkX
            if not hasattr(self, 'G'):
                return []
            
            scored_nodes = []
            for node_id, node_data in self.G.nodes(data=True):
                content = node_data.get("content", "")
                if not content:
                    continue
                
                content_lower = content.lower()
                content_words = set(content_lower.split())
                
                # Calculate relevance score
                matching_words = query_words.intersection(content_words)
                score = len(matching_words)
                
                if query_lower in content_lower:
                    score += 2
                
                if score > 0:
                    node_data_copy = node_data.copy()
                    node_data_copy["id"] = node_id
                    node_data_copy["relevance_score"] = score
                    scored_nodes.append(node_data_copy)
            
            scored_nodes.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
            return scored_nodes[:limit]
