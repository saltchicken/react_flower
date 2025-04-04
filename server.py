import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from typing import List
import os
import json
from node_utils import get_python_classes, ReactflowGraph, ReactflowNode  # Updated import path


app = FastAPI()

# CORS middleware configuration - updated with more specific settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],  # Explicitly list allowed methods
    allow_headers=["*"],
    expose_headers=["*"],
)

# Mount static files from the dist directory
app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

@app.get("/")
async def read_root():
    return FileResponse("dist/index.html")

@app.get("/{catch_all:path}")
async def catch_all(catch_all: str):
    file_path = os.path.join("dist", catch_all)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    return FileResponse("dist/index.html")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                json_data = json.loads(data)
                graph = ReactflowGraph(json_data)
                
                # Get execution order
                try:
                    ordered_nodes = graph.get_execution_order()
                    print("Execution order:")
                    for node in ordered_nodes:
                        print(f"  {node.id} ({node.label})")
                        connected = graph.get_connected_nodes(node.id)
                        print(f"    Input nodes: {[n.id for n in connected['inputs']]}")
                        print(f"    Output nodes: {[n.id for n in connected['outputs']]}")
                except ValueError as e:
                    print(f"Error determining execution order: {e}")
                    await websocket.send_json({
                        "status": "error",
                        "message": "Graph contains cycles"
                    })
                    
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON: {e}")
                await websocket.send_json({
                    "status": "error",
                    "message": "Invalid JSON format"
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.post("/python_nodes")
@app.get("/python_nodes")  # Adding GET support as well
async def python_nodes_handler(request: Request):
    """Handles both POST and GET requests for python nodes."""
    try:
        python_classes = get_python_classes()
        python_classes_without_class = [{k: v for k, v in d.items() if k != 'class'} for d in python_classes]
        return JSONResponse(
            content={"status": "success", "nodes": python_classes_without_class},
            status_code=200
        )
    except Exception as e:
        print(f"Error in python_nodes_handler: {str(e)}")
        return JSONResponse(
            content={"status": "error", "message": str(e)},
            status_code=500
        )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3000)

