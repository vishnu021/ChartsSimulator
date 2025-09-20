import { useState, useEffect, useRef, useCallback } from 'react';
import { CHART_CONSTANTS, UI_CONSTANTS } from '../../utils/constants';
import { canvasUtils } from '../../utils/chart';

/**
 * Base chart hook providing common chart functionality
 */
export function useBaseChart({ data, enableZoom = true, enablePan = true, onViewStateChange }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const [viewState, setViewState] = useState({
    zoom: 1,
    verticalZoom: 1,
    offset: 0,
    targetOffset: 0,
    velocity: 0,
    verticalOffset: 0,
    targetVerticalOffset: 0,
    verticalVelocity: 0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, offset: 0, verticalOffset: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < UI_CONSTANTS.BREAKPOINTS.MOBILE);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      canvasUtils.setupCanvas(canvas);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [data]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setViewState(prev => {
        const { FRICTION, SPRING_STRENGTH, VELOCITY_THRESHOLD, OFFSET_THRESHOLD } =
          CHART_CONSTANTS.ANIMATION;

        if (!isDragging) {
          // Horizontal animation
          const offsetDiff = prev.targetOffset - prev.offset;
          prev.velocity = prev.velocity * FRICTION + offsetDiff * SPRING_STRENGTH;
          prev.offset += prev.velocity;

          if (
            Math.abs(prev.velocity) < VELOCITY_THRESHOLD &&
            Math.abs(offsetDiff) < OFFSET_THRESHOLD
          ) {
            prev.offset = prev.targetOffset;
            prev.velocity = 0;
          }

          // Vertical animation
          const verticalOffsetDiff = prev.targetVerticalOffset - prev.verticalOffset;
          prev.verticalVelocity =
            prev.verticalVelocity * FRICTION + verticalOffsetDiff * SPRING_STRENGTH;
          prev.verticalOffset += prev.verticalVelocity;

          if (
            Math.abs(prev.verticalVelocity) < VELOCITY_THRESHOLD &&
            Math.abs(verticalOffsetDiff) < OFFSET_THRESHOLD
          ) {
            prev.verticalOffset = prev.targetVerticalOffset;
            prev.verticalVelocity = 0;
          }
        } else {
          prev.offset = prev.targetOffset;
          prev.velocity = 0;
          prev.verticalOffset = prev.targetVerticalOffset;
          prev.verticalVelocity = 0;
        }

        return { ...prev };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDragging]);

  // Mouse event handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || isMobile || (!enableZoom && !enablePan)) return;

    const handleWheel = e => {
      if (!enableZoom) return;

      e.preventDefault();
      e.stopPropagation();

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const padding = canvasUtils.getPadding(isMobile);
      const chartWidth = rect.width - padding.left - padding.right;
      const chartHeight = rect.height - padding.top - padding.bottom;

      const mouseRatioX = (x - padding.left) / chartWidth;
      const mouseRatioY = (y - padding.top) / chartHeight;

      // Determine dominant wheel delta to support Shift+Scroll where deltaX is used
      const dominantDelta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const effectiveDelta = dominantDelta !== 0 ? dominantDelta : e.deltaY || e.deltaX || 0;
      const zoomFactor = effectiveDelta > 0 ? 0.9 : 1.1;

      if (e.shiftKey) {
        // Vertical zoom
        const newVerticalZoom = Math.max(
          CHART_CONSTANTS.MIN_VERTICAL_ZOOM,
          Math.min(CHART_CONSTANTS.MAX_VERTICAL_ZOOM, viewState.verticalZoom * zoomFactor)
        );

        const zoomRatio = newVerticalZoom / viewState.verticalZoom;
        const offsetAdjustment = chartHeight * (mouseRatioY - 0.5) * (1 - 1 / zoomRatio);

        setViewState(prev => ({
          ...prev,
          verticalZoom: newVerticalZoom,
          verticalOffset: prev.verticalOffset + offsetAdjustment,
          targetVerticalOffset: prev.targetVerticalOffset + offsetAdjustment,
        }));
      } else {
        // Horizontal zoom
        const newZoom = Math.max(
          CHART_CONSTANTS.MIN_ZOOM,
          Math.min(CHART_CONSTANTS.MAX_ZOOM, viewState.zoom * zoomFactor)
        );

        const totalWidth = chartWidth * viewState.zoom;
        const newTotalWidth = chartWidth * newZoom;
        const widthChange = newTotalWidth - totalWidth;

        const newOffset = viewState.offset - widthChange * mouseRatioX;
        const maxOffset = 0;
        const minOffset = Math.min(0, chartWidth - newTotalWidth);
        const clampedOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));

        setViewState(prev => ({
          ...prev,
          zoom: newZoom,
          offset: clampedOffset,
          targetOffset: clampedOffset,
        }));
      }
    };

    const handleMouseDown = e => {
      if (!enablePan) return;

      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        offset: viewState.targetOffset,
        verticalOffset: viewState.targetVerticalOffset,
      });
      canvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = e => {
      const rect = canvas.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

      if (isDragging && enablePan) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;

        setViewState(prev => ({
          ...prev,
          targetOffset: dragStart.offset + dx,
          targetVerticalOffset: dragStart.verticalOffset - dy,
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
  }, [data, viewState, isDragging, dragStart, isMobile, enableZoom, enablePan]);

  // Notify parent of view state changes
  useEffect(() => {
    if (onViewStateChange) {
      onViewStateChange(viewState);
    }
  }, [viewState, onViewStateChange]);

  const resetView = useCallback(() => {
    setViewState({
      zoom: 1,
      verticalZoom: 1,
      offset: 0,
      targetOffset: 0,
      velocity: 0,
      verticalOffset: 0,
      targetVerticalOffset: 0,
      verticalVelocity: 0,
    });
  }, []);

  return {
    canvasRef,
    viewState,
    mousePos,
    showCrosshair,
    isMobile,
    isDragging,
    resetView,
  };
}
