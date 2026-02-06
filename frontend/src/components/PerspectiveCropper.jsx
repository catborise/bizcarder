import React, { useState, useRef, useEffect, useCallback } from 'react';
import { detectCard } from '../utils/rectDetector';

const PerspectiveCropper = ({ src, onCropComplete, initialPoints = null }) => {
    const containerRef = useRef(null);
    const imgRef = useRef(null);
    const magnifierCanvasRef = useRef(null);
    const [points, setPoints] = useState([]);
    const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
    const [draggingIdx, setDraggingIdx] = useState(null);
    const [draggingEdgeIdx, setDraggingEdgeIdx] = useState(null);
    const [isDraggingArea, setIsDraggingArea] = useState(false);
    const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
    const [showMagnifier, setShowMagnifier] = useState(false);
    const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0 });
    const [hoverState, setHoverState] = useState('default'); // 'default', 'edge', 'area', 'corner'

    const isPointInPolygon = (x, y, poly) => {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y;
            const xj = poly[j].x, yj = poly[j].y;
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    };

    const distToSegment = (px, py, x1, y1, x2, y2) => {
        const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        if (l2 === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    };

    const handleImageLoad = useCallback(() => {
        if (!imgRef.current || !imgRef.current.naturalWidth) return;

        // Give DOM a moment to settle
        setTimeout(() => {
            if (!imgRef.current) return;
            const { width, height } = imgRef.current.getBoundingClientRect();
            if (width === 0 || height === 0) return;

            setImgSize({ width, height });

            // AI tarafından belirlenmiş noktalar varsa onları kullan
            if (initialPoints && Array.isArray(initialPoints) && initialPoints.length === 4) {
                setPoints(initialPoints.map(p => ({
                    x: p.x * (width / 100), // AI 0-100 arası verir
                    y: p.y * (height / 100)
                })));
                return;
            }

            try {
                const detectedNaturalPoints = detectCard(imgRef.current);

                const scaleX = width / imgRef.current.naturalWidth;
                const scaleY = height / imgRef.current.naturalHeight;

                const displayPoints = detectedNaturalPoints.map(p => ({
                    x: p.x * scaleX,
                    y: p.y * scaleY
                }));

                setPoints(displayPoints);
            } catch (err) {
                // Varsayılan noktalar
                const padding = 50;
                setPoints([
                    { x: padding, y: padding },
                    { x: width - padding, y: padding },
                    { x: width - padding, y: height - padding },
                    { x: padding, y: height - padding }
                ]);
            }
        }, 100);
    }, [initialPoints]);

    useEffect(() => {
        if (imgRef.current && imgRef.current.complete) {
            handleImageLoad();
        }
    }, [src, handleImageLoad]);

    const updateMagnifier = (x, y) => {
        if (!magnifierCanvasRef.current || !imgRef.current) return;
        const ctx = magnifierCanvasRef.current.getContext('2d');
        const zoom = 2;
        const size = 120;

        const scaleX = imgRef.current.naturalWidth / imgSize.width;
        const scaleY = imgRef.current.naturalHeight / imgSize.height;

        const centerX = x * scaleX;
        const centerY = y * scaleY;

        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(
            imgRef.current,
            centerX - (size / (2 * zoom)),
            centerY - (size / (2 * zoom)),
            size / zoom,
            size / zoom,
            0,
            0,
            size,
            size
        );

        // Draw crosshair
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size);
        ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2);
        ctx.stroke();
    };

    const handleMouseDown = (idx) => (e) => {
        if (e.button !== 0) return; // Only left click
        e.preventDefault();
        setDraggingIdx(idx);
        setShowMagnifier(true);
        updateMagnifier(points[idx].x, points[idx].y);
        setMagnifierPos({ x: points[idx].x, y: points[idx].y - 80 });
    };

    const handleContainerMouseDown = (e) => {
        if (points.length !== 4 || draggingIdx !== null) return;
        if (e.button !== 0) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check edges first
        for (let i = 0; i < 4; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % 4];
            if (distToSegment(x, y, p1.x, p1.y, p2.x, p2.y) < 15) {
                setDraggingEdgeIdx(i);
                setDragStartPos({ x, y });
                return;
            }
        }

        if (isPointInPolygon(x, y, points)) {
            setIsDraggingArea(true);
            setDragStartPos({ x, y });
        }
    };

    const handleMouseMove = (e) => {
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, imgSize.width));
        const y = Math.max(0, Math.min(e.clientY - rect.top, imgSize.height));

        // Update hover state for cursor feedback
        if (points.length === 4 && draggingIdx === null && draggingEdgeIdx === null && !isDraggingArea) {
            let newHoverState = 'default';

            // Check if hovering over an edge - increased hit area to 25px
            for (let i = 0; i < 4; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % 4];
                if (distToSegment(x, y, p1.x, p1.y, p2.x, p2.y) < 25) {
                    newHoverState = 'edge';
                    break;
                }
            }

            // Check if hovering over area
            if (newHoverState === 'default' && isPointInPolygon(x, y, points)) {
                newHoverState = 'area';
            }

            setHoverState(newHoverState);
        }

        if (draggingIdx !== null) {
            const newPoints = [...points];
            newPoints[draggingIdx] = { x, y };
            setPoints(newPoints);

            if (showMagnifier) {
                updateMagnifier(x, y);
                setMagnifierPos({ x: x, y: y - 80 });
            }
        } else if (draggingEdgeIdx !== null) {
            const dx = x - dragStartPos.x;
            const dy = y - dragStartPos.y;
            const idx1 = draggingEdgeIdx;
            const idx2 = (draggingEdgeIdx + 1) % 4;

            const newPoints = [...points];
            newPoints[idx1] = {
                x: Math.max(0, Math.min(newPoints[idx1].x + dx, imgSize.width)),
                y: Math.max(0, Math.min(newPoints[idx1].y + dy, imgSize.height))
            };
            newPoints[idx2] = {
                x: Math.max(0, Math.min(newPoints[idx2].x + dx, imgSize.width)),
                y: Math.max(0, Math.min(newPoints[idx2].y + dy, imgSize.height))
            };

            setPoints(newPoints);
            setDragStartPos({ x, y });
        } else if (isDraggingArea) {
            const dx = x - dragStartPos.x;
            const dy = y - dragStartPos.y;

            const newPoints = points.map(p => ({
                x: Math.max(0, Math.min(p.x + dx, imgSize.width)),
                y: Math.max(0, Math.min(p.y + dy, imgSize.height))
            }));

            // Boundary checks for the whole polygon
            const outOfBounds = newPoints.some(p => p.x < 0 || p.x > imgSize.width || p.y < 0 || p.y > imgSize.height);
            if (!outOfBounds) {
                setPoints(newPoints);
                setDragStartPos({ x, y });
            }
        }
    };

    const handleMouseUp = () => {
        setDraggingIdx(null);
        setDraggingEdgeIdx(null);
        setIsDraggingArea(false);
        setShowMagnifier(false);
    };

    const handleConfirm = () => {
        const scaleX = imgRef.current.naturalWidth / imgSize.width;
        const scaleY = imgRef.current.naturalHeight / imgSize.height;

        const naturalPoints = points.map(p => ({
            x: p.x * scaleX,
            y: p.y * scaleY
        }));

        onCropComplete(naturalPoints, imgRef.current);
    };

    const aspect = points.length === 4 ?
        (Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) /
            Math.hypot(points[3].x - points[0].x, points[3].y - points[0].y)).toFixed(2) : 0;

    return (
        <div style={{ position: 'relative', userSelect: 'none', display: 'inline-block' }}>
            <div
                ref={containerRef}
                style={{
                    position: 'relative',
                    display: 'inline-block',
                    overflow: 'visible', // Ensure handles are visible at edges
                    cursor: draggingIdx !== null ? 'grabbing' :
                        (draggingEdgeIdx !== null || isDraggingArea ? 'move' :
                            (hoverState === 'edge' ? 'move' :
                                (hoverState === 'area' ? 'move' : 'default')))
                }}
                onMouseDown={handleContainerMouseDown}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseUp}
                onMouseUp={handleMouseUp}
                onTouchStart={(e) => {
                    if (points.length === 4 && draggingIdx === null) {
                        const touch = e.touches[0];
                        const rect = containerRef.current.getBoundingClientRect();
                        const x = touch.clientX - rect.left;
                        const y = touch.clientY - rect.top;

                        // Check edges
                        for (let i = 0; i < 4; i++) {
                            const p1 = points[i];
                            const p2 = points[(i + 1) % 4];
                            if (distToSegment(x, y, p1.x, p1.y, p2.x, p2.y) < 20) {
                                setDraggingEdgeIdx(i);
                                setDragStartPos({ x, y });
                                return;
                            }
                        }

                        if (isPointInPolygon(x, y, points)) {
                            setIsDraggingArea(true);
                            setDragStartPos({ x, y });
                        }
                    }
                }}
                onTouchMove={(e) => {
                    const touch = e.touches[0];
                    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
                }}
                onTouchEnd={handleMouseUp}
            >
                <img
                    ref={imgRef}
                    src={src}
                    onLoad={handleImageLoad}
                    alt="Perspective Crop"
                    style={{ maxWidth: '100%', display: 'block', pointerEvents: 'none', borderRadius: '8px' }}
                />

                {/* SVG Overlay */}
                {points.length === 4 && (
                    <svg
                        width={imgSize.width}
                        height={imgSize.height}
                        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
                    >
                        <polygon
                            points={points.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="rgba(74, 222, 128, 0.25)"
                            stroke="#4ade80"
                            strokeWidth="3"
                            strokeDasharray="5,5"
                            strokeLinejoin="round"
                            style={{ pointerEvents: 'auto', cursor: 'move' }}
                        />
                    </svg>
                )}

                {/* Magnifier */}
                {showMagnifier && (
                    <div style={{
                        position: 'absolute',
                        left: magnifierPos.x - 60,
                        top: magnifierPos.y - 60,
                        width: 120,
                        height: 120,
                        borderRadius: '60px',
                        border: '3px solid #4ade80',
                        overflow: 'hidden',
                        zIndex: 100,
                        pointerEvents: 'none',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        background: '#1a1a1a'
                    }}>
                        <canvas ref={magnifierCanvasRef} width={120} height={120} />
                    </div>
                )}

                {/* Handles */}
                {points.map((p, idx) => (
                    <div
                        key={idx}
                        onMouseDown={handleMouseDown(idx)}
                        onTouchStart={(e) => {
                            e.preventDefault();
                            handleMouseDown(idx)({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, preventDefault: () => { } });
                        }}
                        style={{
                            position: 'absolute',
                            left: p.x - 12,
                            top: p.y - 12,
                            width: 24,
                            height: 24,
                            background: draggingIdx === idx ? '#4ade80' : 'rgba(255, 255, 255, 0.9)',
                            border: '3px solid #4ade80',
                            borderRadius: '50%',
                            cursor: 'grab',
                            zIndex: 10,
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <div style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%' }} />
                    </div>
                ))}
            </div>

            <div style={{
                marginTop: '15px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.05)',
                padding: '10px 15px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ fontSize: '14px', color: '#aaa' }}>
                    Oran: <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{aspect}</span>
                </div>
                <button
                    type="button"
                    onClick={handleConfirm}
                    style={{
                        padding: '10px 24px',
                        background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)'
                    }}
                >
                    Alan Seçildi
                </button>
            </div>
        </div>
    );
};

export default PerspectiveCropper;

