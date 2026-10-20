"""
WebSocket Connection Manager
Maintains real-time connections to React frontend dashboards and broadcasts events.
"""
from typing import List, Dict, Any
import json
import logging
from fastapi import WebSocket

logger = logging.getLogger("websocket_manager")


class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"[WS] Client connected. Active clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"[WS] Client disconnected. Active clients: {len(self.active_connections)}")

    async def broadcast_json(self, data: Dict[str, Any]):
        """Broadcasts a JSON payload to all connected clients."""
        if not self.active_connections:
            return

        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(data, default=str))
            except Exception as e:
                logger.warning(f"[WS] Failed to send to client: {e}")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)


ws_manager = WebSocketManager()
