import { memo } from 'react';
import { useCallback } from 'react';
import { Handle, Position , NodeResizeControl} from '@xyflow/react';

import SingleConnectionHandle from '../components/SingleConnectionHandle.jsx'

const controlStyle = {
  background: 'transparent',
  border: 'none',
};

function CustomNode({ data }) {
  const onChange = useCallback((evt) => {
    console.log(evt.target.value);
  }, []);

  const inputs = Array.isArray(data.inputs) ? data.inputs : ['default'];
  const outputs = Array.isArray(data.outputs) ? data.outputs : ['default'];
  const widgets = Array.isArray(data.widgets) ? data.widgets : [];
  const spacing = 15; // 5% spacing between handles
  const topPadding = 15; // 10% padding from the top

  const maxHandles = Math.max(inputs.length, outputs.length);
  const widgetTopPadding = topPadding + (maxHandles * spacing);

  return (
    <>
      <div style={{ width: '100%', position: 'absolute', top: `${widgetTopPadding}px` }}>
        {widgets.map((varName, index) => (
          <div key={varName} style={{ padding: '0px 0px 10px 0px', position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '20px',
              top: '5px',
              fontSize: '6px',
              color: '#AAA',
              zIndex: 1,
              pointerEvents: 'none'
            }}>
              {varName}
            </span>
            <input 
              id={varName}
              name={varName}
              onChange={onChange} 
              className="nodrag" 
              style={{
                width: 'calc(100% - 40px)',
                padding: '8px',
                border: '1px solid #333',
                borderRadius: '5px',
                fontSize: '12px',
                backgroundColor: '#1e1e1e',
                color: '#fff',
                paddingLeft: '7px',
                paddingTop: '12px'
              }}
            />
          </div>
        ))}
      </div>



      <NodeResizeControl style={controlStyle} minWidth={100} minHeight={50}>
        <ResizeIcon />
      </NodeResizeControl>
      {inputs.map((inputId, index) => (
        <div key={inputId}>
          <SingleConnectionHandle 
            type="target" 
            position={Position.Left} 
            style={{ top: `${topPadding + (index * spacing)}px` }} 
            id={inputId}
          />
          <span style={{
            position: 'absolute',
            left: '20px',
            top: `${topPadding + (index * spacing)}px`,
            transform: 'translateY(-50%)',
            fontSize: '8px',
            pointerEvents: 'none'
          }}>
            {inputId}
          </span>
        </div>
      ))}
      {outputs.map((outputId, index) => (
        <div key={outputId}>
          <Handle  
            type="source" 
            position={Position.Right} 
            style={{ top: `${topPadding + (index * spacing)}px` }} 
            id={outputId}
          />
          <span style={{
            position: 'absolute',
            right: '20px',
            top: `${topPadding + (index * spacing)}px`,
            transform: 'translateY(-50%)',
            fontSize: '8px',
            pointerEvents: 'none'
          }}>
            {outputId}
          </span>
        </div>
      ))}
    </>
  );
}

function ResizeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="#ff0071"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ position: 'absolute', right: 5, bottom: 5 }}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <polyline points="16 20 20 20 20 16" />
      <line x1="14" y1="14" x2="20" y2="20" />
      <polyline points="8 4 4 4 4 8" />
      <line x1="4" y1="4" x2="10" y2="10" />
    </svg>
  );
}

export default memo(CustomNode);

