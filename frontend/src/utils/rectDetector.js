/**
 * Advanced rectangle/quadrilateral detector for business cards.
 * Version 1.4 - Contrast enhancement, stronger blur, and multi-pass edge refinement.
 */

export function detectCard(imageElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const maxDim = 600;
    const scale = Math.min(maxDim / imageElement.naturalWidth, maxDim / imageElement.naturalHeight);
    canvas.width = imageElement.naturalWidth * scale;
    canvas.height = imageElement.naturalHeight * scale;

    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const w = canvas.width;
    const h = canvas.height;

    // 1. Contrast Enhancement & Grayscale
    // We want the card to stand out more from the background
    const gray = new Uint8Array(w * h);
    let min = 255, max = 0;

    for (let i = 0; i < w * h; i++) {
        const val = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
        gray[i] = val;
        if (val < min) min = val;
        if (val > max) max = val;
    }

    // Stretch contrast
    if (max > min) {
        for (let i = 0; i < w * h; i++) {
            gray[i] = ((gray[i] - min) / (max - min)) * 255;
        }
    }

    // 2. Stronger Blur (Double Pass) to kill text/noise and keep only big edges
    const blurred1 = gaussianBlur(gray, w, h);
    const blurred2 = gaussianBlur(blurred1, w, h);

    // 3. Sobel edge detection
    const edges = sobelEdgeDetection(blurred2, w, h);

    // 4. Find the actual card
    const quad = findLargestQuadrilateral(edges, w, h);

    if (quad) {
        return quad.map(p => ({
            x: p.x / scale,
            y: p.y / scale
        }));
    }

    return fallbackDetection(imageElement, data, w, h, scale);
}

function gaussianBlur(gray, w, h) {
    const kernel = [2, 4, 2, 4, 8, 4, 2, 4, 2]; // Slightly heavier kernel
    const kernelSum = 32;
    const blurred = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            let sum = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    sum += gray[(y + ky) * w + (x + kx)] * kernel[(ky + 1) * 3 + (kx + 1)];
                }
            }
            blurred[y * w + x] = Math.round(sum / kernelSum);
        }
    }
    return blurred;
}

function sobelEdgeDetection(gray, w, h) {
    const edges = new Uint8Array(w * h);
    const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            let sumX = 0, sumY = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const val = gray[(y + ky) * w + (x + kx)];
                    sumX += val * gx[(ky + 1) * 3 + (kx + 1)];
                    sumY += val * gy[(ky + 1) * 3 + (kx + 1)];
                }
            }
            const magnitude = Math.sqrt(sumX * sumX + sumY * sumY);
            // Higher threshold to focus on main boundaries
            edges[y * w + x] = magnitude > 60 ? 255 : 0;
        }
    }
    return edges;
}

function findLargestQuadrilateral(edges, w, h) {
    const margin = Math.floor(Math.min(w, h) * 0.08); // 8% margin
    const edgeX = [];
    const edgeY = [];

    for (let y = margin; y < h - margin; y++) {
        for (let x = margin; x < w - margin; x++) {
            if (edges[y * w + x] > 0) {
                edgeX.push(x);
                edgeY.push(y);
            }
        }
    }

    if (edgeX.length < 100) return null;

    const sortedX = [...edgeX].sort((a, b) => a - b);
    const sortedY = [...edgeY].sort((a, b) => a - b);

    // Even tighter percentiles (10% to 90%)
    const minX = sortedX[Math.floor(sortedX.length * 0.1)];
    const maxX = sortedX[Math.floor(sortedX.length * 0.9)];
    const minY = sortedY[Math.floor(sortedY.length * 0.1)];
    const maxY = sortedY[Math.floor(sortedY.length * 0.9)];

    const width = maxX - minX;
    const height = maxY - minY;

    if (width <= 10 || height <= 10) return null;

    const tl = scanCorner(edges, w, h, minX, minY, 1, 1);
    const tr = scanCorner(edges, w, h, maxX, minY, -1, 1);
    const br = scanCorner(edges, w, h, maxX, maxY, -1, -1);
    const bl = scanCorner(edges, w, h, minX, maxY, 1, -1);

    return [tl, tr, br, bl];
}

function scanCorner(edges, w, h, targetX, targetY, dx, dy) {
    const searchArea = 60; // Larger search area
    let bestX = targetX;
    let bestY = targetY;
    let found = false;

    for (let r = 0; r < searchArea; r++) {
        for (let i = 0; i <= r; i++) {
            const sx = targetX - (r - i) * dx; // Look slightly OUTSIDE first
            const sy = targetY - i * dy;
            if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
                if (edges[sy * w + sx] > 0) {
                    bestX = sx;
                    bestY = sy;
                    found = true;
                    break;
                }
            }
        }
        if (found) break;
    }
    return { x: bestX, y: bestY };
}

function fallbackDetection(imageElement, data, w, h, scale) {
    return [
        { x: imageElement.naturalWidth * 0.12, y: imageElement.naturalHeight * 0.15 },
        { x: imageElement.naturalWidth * 0.88, y: imageElement.naturalHeight * 0.15 },
        { x: imageElement.naturalWidth * 0.88, y: imageElement.naturalHeight * 0.85 },
        { x: imageElement.naturalWidth * 0.12, y: imageElement.naturalHeight * 0.85 },
    ];
}
