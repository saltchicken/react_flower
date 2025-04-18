import React, { useCallback, memo, useMemo, useState, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

import InputWidget from './widgets/InputWidget.tsx';
import DropdownWidget from './widgets/DropdownWidget.tsx';
import SliderWidget from './widgets/SliderWidget.tsx';
import TextAreaWidget from './widgets/TextAreaWidget.tsx';
import ImageWidget from './widgets/ImageWidget.tsx';
import FileUploadWidget from './widgets/FileUploadWidget.tsx';
import ImageFileUploadWidget from './widgets/ImageFileUploadWidget.tsx';
import VideoFileUploadWidget from './widgets/VideoFileUploadWidget.tsx';
import ButtonWidget from './widgets/ButtonWidget.tsx';
import NodeInput from './handles/NodeInput.tsx';
import NodeOutput from './handles/NodeOutput.tsx';


const NodeControlPanel = ({ id, onCollapse, isCollapsed }) => {
  const { setNodes, setEdges } = useReactFlow();

  const handleDelete = useCallback(() => {
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
    setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id));
  }, [id, setNodes, setEdges]);

  return (
    <div style={{
      position: 'absolute',
      top: '-25px',
      right: '0',
      display: 'flex',
      gap: '4px',
      padding: '2px',
      backgroundColor: '#1e1e1e',
      borderRadius: '4px',
      border: '1px solid #333',
      zIndex: 10,
    }}>
      <button
        onClick={onCollapse}
        title={isCollapsed ? "Expand" : "Collapse"}
        style={{
          backgroundColor: '#2d2d2d',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          padding: '2px 6px',
          fontSize: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {isCollapsed ? '▼' : '▲'}
      </button>
      <button
        onClick={handleDelete}
        title="Delete node"
        style={{
          backgroundColor: '#ff4444',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          padding: '2px 6px',
          fontSize: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        ×
      </button>
    </div>
  );
};

function PythonNode({ id, data, onWidgetValuesChange }) {
  const [isCollapsed, setIsCollapsed] = useState(data.isCollapsed || false);

  const handleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);
  const [widgetValues, setWidgetValues] = useState(() => {
    // Initialize with either existing widgetValues or default values
    if (data.widgetValues && Object.keys(data.widgetValues).length > 0) {
      return { ...data.widgetValues };
    }
    const values = {};
    data.widgets?.forEach(widget => {
      values[widget.name] = widget.value || (
        widget.type === 'dropdown' ? widget.options[0] :
          widget.type === 'slider' ? (widget.min || 0) :
            ''
      );
    });
    onWidgetValuesChange?.(values);
    return values;
  });

  // Sync widgetValues when updates come from backend
  useEffect(() => {
    if (data.widgetValues) {
      setWidgetValues(prev => ({
        ...prev,
        ...data.widgetValues
      }));
    }
  }, [data.widgetValues]);

  const onChange = useCallback((evt) => {
    const { name, value } = evt.target;
    const newValues = {
      ...widgetValues,
      [name]: value
    };
    setWidgetValues(newValues);
    onWidgetValuesChange?.(newValues);
  }, [widgetValues, onWidgetValuesChange]);

  const renderWidget = (widget) => {
    const widgetWithValues = {
      ...widget,
      widgetValues: widgetValues  // Use local state instead of data.widgetValues
    };

    const widgetComponents = {
      dropdown: DropdownWidget,
      slider: SliderWidget,
      textarea: TextAreaWidget,
      image: ImageWidget,
      file_upload: FileUploadWidget,
      image_file_upload: ImageFileUploadWidget,
      video_file_upload: VideoFileUploadWidget,
      button: ButtonWidget
    };

    const Component = widgetComponents[widget.type] || InputWidget;
    return <Component
      key={widget.name}
      widget={widgetWithValues}
      onChange={widget.type === 'image' ? onWidgetValuesChange : onChange}
      nodeId={id}
    />;
  }

  const { inputs, outputs, widgets, widgetTopPadding, spacing, topPadding } = useMemo(() => {
    const inputs = Array.isArray(data.inputs) ? data.inputs : ['default'];
    const outputs = Array.isArray(data.outputs) ? data.outputs : ['default'];
    const widgets = Array.isArray(data.widgets) ? data.widgets : [];
    const spacing = 15; // 5% spacing between handles
    const topPadding = 15; // 10% padding from the top
    const maxHandles = Math.max(inputs.length, outputs.length);
    const widgetTopPadding = topPadding + (maxHandles * spacing);

    return { inputs, outputs, widgets, widgetTopPadding, spacing, topPadding };
  }, [data.inputs, data.outputs, data.widgets]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: 'auto auto 1fr',
      gap: '0px',
      width: '100%',
      height: '100%',
      padding: '0px 15px 15px 15px',
      position: 'relative'
    }}>
      <NodeControlPanel
        id={id}
        onCollapse={handleCollapse}
        isCollapsed={isCollapsed}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '50px 1fr 50px',
        position: 'relative'
      }}>
        <div style={{ position: 'relative' }}>
          {inputs.map((input, index) => (
            <NodeInput
              key={input.name}
              input={input}
              spacing={spacing}
            />
          ))}
        </div>

        <div style={{
          textAlign: 'center',
          fontSize: '8px',
          fontWeight: 'bold',
          position: 'sticky',
          top: '0',
          backgroundColor: '#1e1e1e',
          padding: '0px',
          borderRadius: '5px',
          zIndex: -1
        }}>
          {data.label}
        </div>

        <div style={{ position: 'relative' }}>
          {outputs.map((output, index) => (
            <NodeOutput
              key={output.name}
              output={output}
              spacing={spacing}
            />
          ))}
        </div>
      </div>

      {!isCollapsed && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '10px 0'
        }}>
          {widgets.map((widget) => renderWidget(widget))}
        </div>
      )}
    </div>
  );
}

export default memo(PythonNode, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data);
});

