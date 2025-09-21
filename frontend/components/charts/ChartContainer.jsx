'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Base ChartContainer component that handles:
 * - Canvas setup and pixel ratio management
 * - Viewport detection and responsive sizing
 * - Mobile device detection
 * - Mouse/touch event handling
 * - Zoom and pan state management
 */
export const ChartContainer = ({
  data,
  onRender,
  enableInteraction = true,
  className = '',
  style = {},
  sharedViewState = null,
  onViewStateChange = null,
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // State management - initialize from shared state if provided
  const [localViewState, setLocalViewState] = useState(() =>
    sharedViewState || {
      zoom: 1,
      offset: 0,
      targetOffset: 0,
      velocity: 0,
    }
  );

  // Always use local state for immediate responsiveness, sync to shared state when provided
  const viewState = localViewState;
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, offset: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Canvas setup with proper pixel ratio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      setCanvasDimensions({ width: rect.width, height: rect.height });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [data]);

  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      setLocalViewState(prev => {
        const friction = 0.9;
        const springStrength = 0.1;

        if (!isDragging) {
          const offsetDiff = prev.targetOffset - prev.offset;
          prev.velocity = prev.velocity * friction + offsetDiff * springStrength;
          prev.offset += prev.velocity;

          if (Math.abs(prev.velocity) < 0.1 && Math.abs(offsetDiff) < 0.1) {
            prev.offset = prev.targetOffset;
            prev.velocity = 0;
          }
        } else {
          prev.offset = prev.targetOffset;
          prev.velocity = 0;
        }

        const newState = { ...prev };

        // Sync to shared state if available
        if (onViewStateChange) {
          onViewStateChange(newState);
        }

        return newState;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDragging, onViewStateChange]);

  // Update local state when shared state changes (incoming sync from other panels)
  useEffect(() => {
    if (sharedViewState && !isDragging) {
      setLocalViewState(sharedViewState);
    }
  }, [sharedViewState, isDragging]);

  // Render chart using provided render function
  const renderChart = useCallback(() => {
    if (!data || !canvasRef.current || !onRender) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvasDimensions;

    if (width === 0 || height === 0) return;

    // Provide render context to the render function
    const renderContext = {
      ctx,
      canvas,
      width,
      height,
      dpr,
      viewState,
      isMobile,
      mousePos,
      showCrosshair,
      isDragging,
    };

    onRender(renderContext);
  }, [data, viewState, canvasDimensions, onRender, isMobile, mousePos, showCrosshair, isDragging]);

  // Trigger render on state changes
  useEffect(() => {
    renderChart();
  }, [renderChart]);

  // Mouse/touch event handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enableInteraction || isMobile) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const mouseRatio = x / rect.width;

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.5, Math.min(20, viewState.zoom * zoomFactor));

      const currentWidth = rect.width * viewState.zoom;
      const newWidth = rect.width * newZoom;
      const widthChange = newWidth - currentWidth;

      const newOffset = viewState.offset - widthChange * mouseRatio;
      const maxOffset = 0;
      const minOffset = Math.min(0, rect.width - newWidth);
      const clampedOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));

      setLocalViewState(prev => ({
        ...prev,
        zoom: newZoom,
        offset: clampedOffset,
        targetOffset: clampedOffset,
      }));
    };

    const handleMouseDown = (e) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX, offset: viewState.targetOffset });
      canvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

      if (isDragging) {
        const dx = e.clientX - dragStart.x;
        setLocalViewState(prev => ({
          ...prev,
          targetOffset: dragStart.offset + dx,
        }));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      canvas.style.cursor = 'crosshair';
    };

    const handleMouseEnter = () => {
      setShowCrosshair(true);
      canvas.style.cursor = 'crosshair';
    };

    const handleMouseLeave = () => {
      setShowCrosshair(false);
      setIsDragging(false);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseenter', handleMouseEnter);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseenter', handleMouseEnter);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [viewState, isDragging, dragStart, enableInteraction, isMobile]);

  // Reset view function
  const resetView = useCallback(() => {
    setLocalViewState({
      zoom: 1,
      offset: 0,
      targetOffset: 0,
      velocity: 0,
    });
  }, []);

  // Expose control functions
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current._chartControls = {
        resetView,
        getViewState: () => viewState,
        setViewState: setLocalViewState,
      };
    }
  }, [resetView, viewState]);

  if (!data) return null;

  return (
    <div
      className={`relative ${className}`}
      style={{
        width: '100%',
        height: '100%',
        maxHeight: '100vh',
        minHeight: 0,
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          cursor: enableInteraction && !isMobile ? 'crosshair' : 'default'
        }}
      />
    </div>
  );
};

export default ChartContainer;
