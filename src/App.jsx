import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  Panel,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';


import ContextMenu from './components/ContextMenu';

import PythonNode from './nodes/PythonNode.tsx';

const nodeTypes = {
  pythonNode: PythonNode
};


const Flow = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [menu, setMenu] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pythonNodes, setPythonNodes] = useState([]);
  const ref = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    const fetchPythonNodes = async () => {
      try {
        const API_URL = `http://${window.location.hostname}:3000/python_nodes`;
        const response = await fetch(API_URL, {
          method: "POST"
        });
        if (!response.ok) {
          throw new Error('Failed to fetch python nodes');
        }
        const data = await response.json();
        console.log('Python nodes:', data.nodes);
        setPythonNodes(data.nodes);
      } catch (error) {
        console.error('Error fetching python nodes:', error);
      }
    };

    fetchPythonNodes();
  }, []);


  const connectWebSocket = useCallback(() => {
    const WS_URL = `ws://${window.location.hostname}:3000/ws`;
    console.log(WS_URL);
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('Connected to WebSocket');
      setSocket(ws);
      setIsConnected(true);
      // Clear any existing reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      console.log('Received:', event.data);
      // Handle incoming messages here
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
      setSocket(null);
      
      // Schedule reconnection attempt
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect...');
        connectWebSocket();
      }, 2000); // Try to reconnect after 2 seconds
    };

    return ws;
  }, []);

  useEffect(() => {
    const ws = connectWebSocket();

    // Cleanup on component unmount
    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      setIsConnected(false);
      setSocket(null);
    };
  }, [connectWebSocket]);

  const sendToWebSocket = useCallback((data) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }, [socket]);

  const onConnect = useCallback(
    (params) => setEdges((els) => addEdge(params, els)),
    [setEdges],
  );

const onConnectEnd = useCallback(
  (event, params) => {
      console.log(event);
      console.log(params);
  },
  []
);

  const onSave = useCallback(() => {
    const flow = {
      nodes: nodes,
      edges: edges,
    };
    const json = JSON.stringify(flow);
    localStorage.setItem('flow', json);
  }, [nodes, edges]);


const onRestore = useCallback(() => {
  const flowString = localStorage.getItem('flow');
  if (!flowString) return;
  
  const flow = JSON.parse(flowString);
  if (flow) {
    // Ensure widgetValues are properly restored for each node
    const nodesWithRestoredWidgets = flow.nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        widgetValues: node.data.widgetValues || {}  // Preserve or initialize widgetValues
      }
    }));
    
    setNodes(nodesWithRestoredWidgets);
    setEdges(flow.edges);
  }
}, [setNodes, setEdges]);

  const onProcess = useCallback(() => {
    const flow = {
      nodes: nodes.map(node => ({
        ...node,
        // Only include necessary data
        data: {
          ...node.data,
          widgetValues: node.data.widgetValues || {},
        }
      })),
      edges: edges,
    };
    const json = JSON.stringify(flow, (key, value) =>
      key === "position" || key === "measured" ? undefined : value, 2);
    console.log(json);
    sendToWebSocket(flow); //TODO: JSON.stringify is called twice. Here and in sendToWebSocket
  }, [nodes, edges, sendToWebSocket]);

  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();
      const pane = ref.current.getBoundingClientRect();
      setMenu({
        id: node.id,
        type: 'node',
        top: event.clientY < pane.height - 200 && event.clientY,
        left: event.clientX < pane.width - 200 && event.clientX,
        right: event.clientX >= pane.width - 200 && pane.width - event.clientX,
        bottom:
          event.clientY >= pane.height - 200 && pane.height - event.clientY,
      });
    },
    [setMenu],
  );

  const onPaneContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      const pane = ref.current.getBoundingClientRect();
      setMenu({
        type: 'pane',
        top: event.clientY < pane.height - 200 && event.clientY,
        left: event.clientX < pane.width - 200 && event.clientX,
        right: event.clientX >= pane.width - 200 && pane.width - event.clientX,
        bottom:
          event.clientY >= pane.height - 200 && pane.height - event.clientY,
      });
    },
    [setMenu],
  );

  // Close the context menu if it's open whenever the window is clicked.
  const onPaneClick = useCallback(() => setMenu(null), [setMenu]);
  const onPaneMove = useCallback(() => setMenu(null), [setMenu]);


  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        ref={ref}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onMove={onPaneMove}
        onNodeContextMenu={onNodeContextMenu}
        nodeTypes={nodeTypes}
        fitView
        colorMode="dark"
      >
        <Background />
        {menu && <ContextMenu onClick={onPaneClick} pythonNodes={pythonNodes} {...menu} />}

        <Controls />
        <Panel position="top-left">
          <button onClick={onRestore}>Restore</button>
          <button onClick={onSave}>Save</button>
          <button onClick={onProcess}>Process</button>
          <div style={{ color: 'white' }}>
            Status: {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default Flow;
