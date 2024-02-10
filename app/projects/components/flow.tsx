"use client";

import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  ReactFlowInstance,
  ControlButton,
} from "reactflow";
import { useState, useCallback } from "react";
import { useViewport } from "~/components/viewport";
import { CardNode } from "./card-node";
import { TextNode } from "./text-node";
import { initialNodes } from "./nodes";

import "reactflow/dist/base.css";

const nodeTypes = {
  text: TextNode,
  card: CardNode,
};

const proOptions = {
  hideAttribution: true,
};

const mobileViewport = {
  x: -624.6842512618459,
  y: -193.013306361682,
  zoom: 0.879039560911796,
};

const desktopViewport = {
  x: -112.43815751184593,
  y: -111.52111886168206,
  zoom: 0.879039560911796,
};

export const Flow = () => {
  const { isMobile } = useViewport();
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);

  const onSave = useCallback(() => {
    if (rfInstance) {
      const flow = rfInstance.toObject();
      console.log("save flow", flow, JSON.stringify(flow, null, 2));
    }
  }, [rfInstance]);

  return (
    <ReactFlow
      nodes={nodes}
      onNodesChange={onNodesChange}
      proOptions={proOptions}
      nodeTypes={nodeTypes}
      onInit={setRfInstance}
      nodesConnectable={false}
      defaultViewport={isMobile ? mobileViewport : desktopViewport}
      nodesDraggable={!isMobile}
    >
      <Controls>
        {process.env.NODE_ENV === "development" && (
          <ControlButton onClick={onSave}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 17V3" />
              <path d="m6 11 6 6 6-6" />
              <path d="M19 21H5" />
            </svg>
          </ControlButton>
        )}
      </Controls>
      <MiniMap
        maskColor="var(--minimap-mask)"
        nodeColor="var(--node-color)"
        pannable
        zoomable
      />
      <Background />
      <button onClick={onSave}>save</button>
    </ReactFlow>
  );
};
