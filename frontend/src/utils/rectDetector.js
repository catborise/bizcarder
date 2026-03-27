/**
 * Business card quadrilateral detector.
 * Version 3.0 — Multi-strategy: binary blob segmentation (primary) +
 *               improved edge-distribution (secondary) + Canny line-scan (tertiary).
 *
 * Strategy 1 (blob): Heavy blur → multi-threshold binarization → flood-fill
 *   from borders to remove background → largest remaining blob → convex hull → quad.
 * Strategy 2 (edge-distribution): Canny → percentile-based bounding → corner refine.
 * Strategy 3 (line-scan): Canny → row/column projection → peak detection → corner refine.
 *
 * All candidates are scored; the best one wins.
 */

export function detectCard(imageElement) {
    const maxDim = 600;
    const natW = imageElement.naturalWidth;
    const natH = imageElement.naturalHeight;
    const scale = Math.min(maxDim / natW, maxDim / natH, 1);
    const w = Math.round(natW * scale);
    const h = Math.round(natH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageElement, 0, 0, w, h);
    const rgba = ctx.getImageData(0, 0, w, h).data;

    // ── Preprocessing ──────────────────────────────────────────────
    const gray = toGrayscale(rgba, w, h);

    // Heavy blur for blob detection (suppress text completely)
    let blobBlur = gray;
    for (let i = 0; i < 5; i++) blobBlur = gaussBlur5(blobBlur, w, h);

    // Lighter blur for edge detection (preserve card boundary)
    let edgeBlur = gray;
    for (let i = 0; i < 2; i++) edgeBlur = gaussBlur5(edgeBlur, w, h);

    // ── Collect candidates from all strategies ─────────────────────
    const candidates = [];

    // Strategy 1: Blob segmentation (most reliable)
    const otsuT = otsuThreshold(blobBlur, w, h);
    const thresholds = [
        otsuT,
        otsuT * 0.6,
        otsuT * 0.8,
        otsuT * 1.2,
        otsuT * 1.4,
        128,
    ];

    for (const t of thresholds) {
        // Try both polarities: card brighter or darker than background
        for (const invert of [false, true]) {
            const quad = blobQuad(blobBlur, w, h, t, invert);
            if (quad) candidates.push(quad);
        }
    }

    // Strategy 2: Edge distribution (improved v1.4)
    const edges = sobelEdges(edgeBlur, w, h);
    const edgeQuad = edgeDistributionQuad(edges, w, h);
    if (edgeQuad) candidates.push(edgeQuad);

    // Strategy 3: Row/column projection from edges
    const projQuad = projectionQuad(edges, w, h);
    if (projQuad) candidates.push(projQuad);

    // ── Score and select best ──────────────────────────────────────
    let best = null;
    let bestScore = -1;

    for (const q of candidates) {
        const s = scoreQuad(q, w, h);
        if (s > bestScore) {
            bestScore = s;
            best = q;
        }
    }

    if (best && bestScore > 0.05) {
        return best.map(p => ({ x: p.x / scale, y: p.y / scale }));
    }

    return fallbackRect(natW, natH);
}

// ═══════════════════════════════════════════════════════════════════
//  STRATEGY 1 — Binary Blob Segmentation
// ═══════════════════════════════════════════════════════════════════

function blobQuad(gray, w, h, threshold, invert) {
    // 1. Binarize (use > to avoid ambiguity at exact threshold value)
    const binary = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
        const isWhite = invert ? gray[i] < threshold : gray[i] > threshold;
        binary[i] = isWhite ? 1 : 0;
    }

    // 2. Flood-fill from all border pixels to remove background
    const visited = new Uint8Array(w * h);
    const stack = [];

    // Add all border pixels that are "white" (background)
    for (let x = 0; x < w; x++) {
        if (binary[x] === 1) stack.push(x);                      // top row
        if (binary[(h - 1) * w + x] === 1) stack.push((h - 1) * w + x); // bottom row
    }
    for (let y = 0; y < h; y++) {
        if (binary[y * w] === 1) stack.push(y * w);              // left col
        if (binary[y * w + (w - 1)] === 1) stack.push(y * w + (w - 1)); // right col
    }

    // Also add border pixels that are "black" - try both to handle cases where
    // background itself touches borders
    // Actually, let's only remove border-connected white regions
    while (stack.length > 0) {
        const idx = stack.pop();
        if (visited[idx]) continue;
        visited[idx] = 1;
        binary[idx] = 0; // clear background

        const x = idx % w;
        const y = (idx - x) / w;

        // 4-connected neighbors (faster, sufficient for flood fill)
        if (x > 0 && binary[idx - 1] === 1 && !visited[idx - 1]) stack.push(idx - 1);
        if (x < w - 1 && binary[idx + 1] === 1 && !visited[idx + 1]) stack.push(idx + 1);
        if (y > 0 && binary[idx - w] === 1 && !visited[idx - w]) stack.push(idx - w);
        if (y < h - 1 && binary[idx + w] === 1 && !visited[idx + w]) stack.push(idx + w);
    }

    // 3. Find largest connected component in remaining white pixels
    const labels = new Int32Array(w * h);
    let maxLabel = 0;
    let maxSize = 0;
    let bestLabel = 0;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (binary[idx] === 0 || labels[idx] !== 0) continue;

            maxLabel++;
            let size = 0;
            const ccStack = [idx];

            while (ccStack.length > 0) {
                const ci = ccStack.pop();
                if (labels[ci] !== 0) continue;
                labels[ci] = maxLabel;
                size++;

                const cx = ci % w;
                const cy = (ci - cx) / w;

                if (cx > 0 && binary[ci - 1] === 1 && labels[ci - 1] === 0) ccStack.push(ci - 1);
                if (cx < w - 1 && binary[ci + 1] === 1 && labels[ci + 1] === 0) ccStack.push(ci + 1);
                if (cy > 0 && binary[ci - w] === 1 && labels[ci - w] === 0) ccStack.push(ci - w);
                if (cy < h - 1 && binary[ci + w] === 1 && labels[ci + w] === 0) ccStack.push(ci + w);
            }

            if (size > maxSize) {
                maxSize = size;
                bestLabel = maxLabel;
            }
        }
    }

    // Too small or too large
    const areaRatio = maxSize / (w * h);
    if (areaRatio < 0.04 || areaRatio > 0.96) return null;

    // 4. Collect boundary pixels of the largest component
    const boundary = [];
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            if (labels[idx] !== bestLabel) continue;

            // Is it a boundary pixel? (has a neighbor that's not in the blob)
            if (labels[idx - 1] !== bestLabel || labels[idx + 1] !== bestLabel ||
                labels[idx - w] !== bestLabel || labels[idx + w] !== bestLabel) {
                boundary.push({ x, y });
            }
        }
    }

    if (boundary.length < 20) return null;

    // 5. Convex hull
    const hull = convexHull(boundary);
    if (hull.length < 4) return null;

    // 6. Reduce hull to 4 corners
    return hullToQuad(hull);
}

// ═══════════════════════════════════════════════════════════════════
//  STRATEGY 2 — Edge Distribution (improved v1.4)
// ═══════════════════════════════════════════════════════════════════

function edgeDistributionQuad(edges, w, h) {
    const margin = Math.floor(Math.min(w, h) * 0.05);
    const ex = [];
    const ey = [];

    for (let y = margin; y < h - margin; y++) {
        for (let x = margin; x < w - margin; x++) {
            if (edges[y * w + x] > 0) {
                ex.push(x);
                ey.push(y);
            }
        }
    }

    if (ex.length < 80) return null;

    ex.sort((a, b) => a - b);
    ey.sort((a, b) => a - b);

    // 5th and 95th percentiles (tighter than v1.4's 10/90)
    const p05 = 0.05, p95 = 0.95;
    const minX = ex[Math.floor(ex.length * p05)];
    const maxX = ex[Math.floor(ex.length * p95)];
    const minY = ey[Math.floor(ey.length * p05)];
    const maxY = ey[Math.floor(ey.length * p95)];

    if (maxX - minX < 20 || maxY - minY < 20) return null;

    // Refine corners by scanning for actual edge pixels
    const tl = refineCorner(edges, w, h, minX, minY, 1, 1);
    const tr = refineCorner(edges, w, h, maxX, minY, -1, 1);
    const br = refineCorner(edges, w, h, maxX, maxY, -1, -1);
    const bl = refineCorner(edges, w, h, minX, maxY, 1, -1);

    return [tl, tr, br, bl];
}

// ═══════════════════════════════════════════════════════════════════
//  STRATEGY 3 — Row/Column Projection
// ═══════════════════════════════════════════════════════════════════

function projectionQuad(edges, w, h) {
    const rowHist = new Float32Array(h);
    const colHist = new Float32Array(w);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (edges[y * w + x] > 0) {
                rowHist[y]++;
                colHist[x]++;
            }
        }
    }

    // Smooth
    const rowSmooth = smooth(rowHist, 7);
    const colSmooth = smooth(colHist, 7);

    const hPeaks = findTwoPeaks(rowSmooth, Math.round(h * 0.15));
    const vPeaks = findTwoPeaks(colSmooth, Math.round(w * 0.15));

    if (!hPeaks || !vPeaks) return null;

    const [top, bottom] = hPeaks[0] < hPeaks[1] ? hPeaks : [hPeaks[1], hPeaks[0]];
    const [left, right] = vPeaks[0] < vPeaks[1] ? vPeaks : [vPeaks[1], vPeaks[0]];

    if (bottom - top < 20 || right - left < 20) return null;

    const tl = refineCorner(edges, w, h, left, top, 1, 1);
    const tr = refineCorner(edges, w, h, right, top, -1, 1);
    const br = refineCorner(edges, w, h, right, bottom, -1, -1);
    const bl = refineCorner(edges, w, h, left, bottom, 1, -1);

    return [tl, tr, br, bl];
}

// ═══════════════════════════════════════════════════════════════════
//  IMAGE PROCESSING PRIMITIVES
// ═══════════════════════════════════════════════════════════════════

function toGrayscale(rgba, w, h) {
    const g = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
        g[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
    }
    return g;
}

function gaussBlur5(src, w, h) {
    const k = [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16];
    const tmp = new Float32Array(w * h);
    const dst = new Float32Array(w * h);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let s = 0;
            for (let i = -2; i <= 2; i++) s += src[y * w + Math.min(Math.max(x + i, 0), w - 1)] * k[i + 2];
            tmp[y * w + x] = s;
        }
    }
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let s = 0;
            for (let i = -2; i <= 2; i++) s += tmp[Math.min(Math.max(y + i, 0), h - 1) * w + x] * k[i + 2];
            dst[y * w + x] = s;
        }
    }
    return dst;
}

function sobelEdges(gray, w, h) {
    // Sobel magnitude with adaptive threshold
    const mag = new Float32Array(w * h);

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const sx =
                -gray[(y - 1) * w + (x - 1)] + gray[(y - 1) * w + (x + 1)]
                - 2 * gray[y * w + (x - 1)] + 2 * gray[y * w + (x + 1)]
                - gray[(y + 1) * w + (x - 1)] + gray[(y + 1) * w + (x + 1)];
            const sy =
                -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)]
                + gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)];
            mag[y * w + x] = Math.sqrt(sx * sx + sy * sy);
        }
    }

    // Adaptive threshold: use Otsu on non-zero magnitudes
    const nonZero = [];
    for (let i = 0; i < w * h; i++) {
        if (mag[i] > 0) nonZero.push(mag[i]);
    }
    nonZero.sort((a, b) => a - b);

    // Use 70th percentile as threshold (keeps strong card boundary edges, removes weak noise)
    const thresh = nonZero.length > 0 ? nonZero[Math.floor(nonZero.length * 0.7)] : 50;

    const edges = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
        edges[i] = mag[i] > thresh ? 255 : 0;
    }
    return edges;
}

function otsuThreshold(gray, w, h) {
    // Build histogram
    const hist = new Int32Array(256);
    for (let i = 0; i < w * h; i++) {
        hist[Math.min(255, Math.max(0, Math.round(gray[i])))]++;
    }

    const total = w * h;
    let sumAll = 0;
    for (let i = 0; i < 256; i++) sumAll += i * hist[i];

    let sumBg = 0, wBg = 0, maxVar = 0, bestT = 128;

    for (let t = 0; t < 256; t++) {
        wBg += hist[t];
        if (wBg === 0) continue;
        const wFg = total - wBg;
        if (wFg === 0) break;

        sumBg += t * hist[t];
        const meanBg = sumBg / wBg;
        const meanFg = (sumAll - sumBg) / wFg;
        const betweenVar = wBg * wFg * (meanBg - meanFg) * (meanBg - meanFg);

        if (betweenVar > maxVar) {
            maxVar = betweenVar;
            bestT = t;
        }
    }
    return bestT;
}

// ═══════════════════════════════════════════════════════════════════
//  CONVEX HULL (Graham Scan)
// ═══════════════════════════════════════════════════════════════════

function convexHull(points) {
    if (points.length < 3) return points.slice();

    // Find bottom-most point (then left-most)
    let pivot = 0;
    for (let i = 1; i < points.length; i++) {
        if (points[i].y > points[pivot].y ||
            (points[i].y === points[pivot].y && points[i].x < points[pivot].x)) {
            pivot = i;
        }
    }

    const p0 = points[pivot];

    // Sort by polar angle relative to pivot
    const sorted = points.slice();
    sorted.splice(pivot, 1);
    sorted.sort((a, b) => {
        const angleA = Math.atan2(a.y - p0.y, a.x - p0.x);
        const angleB = Math.atan2(b.y - p0.y, b.x - p0.x);
        if (Math.abs(angleA - angleB) < 1e-10) {
            return dist(p0, a) - dist(p0, b);
        }
        return angleA - angleB;
    });

    const hull = [p0];

    for (const p of sorted) {
        while (hull.length >= 2) {
            const a = hull[hull.length - 2];
            const b = hull[hull.length - 1];
            const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
            if (cross <= 0) hull.pop();
            else break;
        }
        hull.push(p);
    }

    return hull;
}

// ═══════════════════════════════════════════════════════════════════
//  HULL → QUADRILATERAL
// ═══════════════════════════════════════════════════════════════════

function hullToQuad(hull) {
    if (hull.length === 4) return orderPoints(hull);
    if (hull.length < 4) return null;

    // Strategy: iteratively remove the vertex that causes the least area loss
    // until exactly 4 remain.
    let pts = hull.map(p => ({ x: p.x, y: p.y }));

    while (pts.length > 4) {
        let minLoss = Infinity;
        let removeIdx = 0;

        for (let i = 0; i < pts.length; i++) {
            const prev = pts[(i - 1 + pts.length) % pts.length];
            const curr = pts[i];
            const next = pts[(i + 1) % pts.length];

            // Area of triangle formed by removing this vertex
            const triArea = Math.abs(
                (prev.x * (curr.y - next.y) + curr.x * (next.y - prev.y) + next.x * (prev.y - curr.y)) / 2
            );

            if (triArea < minLoss) {
                minLoss = triArea;
                removeIdx = i;
            }
        }

        pts.splice(removeIdx, 1);
    }

    return orderPoints(pts);
}

// ═══════════════════════════════════════════════════════════════════
//  GEOMETRY & SCORING UTILITIES
// ═══════════════════════════════════════════════════════════════════

function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function polygonArea(pts) {
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    return Math.abs(area) / 2;
}

function orderPoints(pts) {
    // Sort by x+y sum → TL has the smallest, BR has the largest
    // Sort by x-y diff → TR has the largest, BL has the smallest
    const sorted = pts.slice();
    const sums = sorted.map(p => p.x + p.y);
    const diffs = sorted.map(p => p.x - p.y);

    let tlIdx = 0, brIdx = 0, trIdx = 0, blIdx = 0;
    for (let i = 1; i < sorted.length; i++) {
        if (sums[i] < sums[tlIdx]) tlIdx = i;
        if (sums[i] > sums[brIdx]) brIdx = i;
        if (diffs[i] > diffs[trIdx]) trIdx = i;
        if (diffs[i] < diffs[blIdx]) blIdx = i;
    }

    return [
        { x: sorted[tlIdx].x, y: sorted[tlIdx].y },
        { x: sorted[trIdx].x, y: sorted[trIdx].y },
        { x: sorted[brIdx].x, y: sorted[brIdx].y },
        { x: sorted[blIdx].x, y: sorted[blIdx].y },
    ];
}

function scoreQuad(quad, imgW, imgH) {
    const area = polygonArea(quad);
    const imgArea = imgW * imgH;
    const areaRatio = area / imgArea;

    // Reject too small or too large
    if (areaRatio < 0.04 || areaRatio > 0.97) return 0;

    // Aspect ratio (standard card ≈ 1.586)
    const topW = dist(quad[0], quad[1]);
    const botW = dist(quad[3], quad[2]);
    const leftH = dist(quad[0], quad[3]);
    const rightH = dist(quad[1], quad[2]);
    const avgW = (topW + botW) / 2;
    const avgH = (leftH + rightH) / 2;
    const aspect = avgW > avgH ? avgW / avgH : avgH / avgW;

    // Aspect score: best at 1.586, acceptable from 1.0 to 2.2
    const aspectScore = Math.max(0, 1 - Math.abs(aspect - 1.586) / 1.2);

    // Rectangularity: quad area vs bounding box area (1.0 = perfect rectangle)
    const xs = quad.map(p => p.x);
    const ys = quad.map(p => p.y);
    const bboxArea = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    const rectScore = bboxArea > 0 ? area / bboxArea : 0;

    // Edge parallelism: opposite sides should be similar length
    const widthRatio = Math.min(topW, botW) / (Math.max(topW, botW) || 1);
    const heightRatio = Math.min(leftH, rightH) / (Math.max(leftH, rightH) || 1);
    const parallelScore = (widthRatio + heightRatio) / 2;

    // Combined score
    return (
        areaRatio * 0.35 +
        aspectScore * 0.20 +
        rectScore * 0.25 +
        parallelScore * 0.20
    );
}

function refineCorner(edges, w, h, estX, estY, dirX, dirY) {
    // Search outward from estimated position for actual edge pixels.
    // Prefers pixels that lie in the expected corner direction.
    const searchR = 40;
    let bestScore = Infinity;
    let best = { x: estX, y: estY };

    for (let dy = -searchR; dy <= searchR; dy++) {
        for (let dx = -searchR; dx <= searchR; dx++) {
            const nx = estX + dx;
            const ny = estY + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            if (edges[ny * w + nx] === 0) continue;

            // Distance penalty + directional bias (prefer looking outward from card center)
            const d = Math.sqrt(dx * dx + dy * dy);
            const bias = (dx * dirX + dy * dirY) * 0.5;
            const score = d - bias;

            if (score < bestScore) {
                bestScore = score;
                best = { x: nx, y: ny };
            }
        }
    }
    return best;
}

// ═══════════════════════════════════════════════════════════════════
//  SMALL HELPERS
// ═══════════════════════════════════════════════════════════════════

function smooth(arr, radius) {
    const out = new Float32Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
        let sum = 0, count = 0;
        for (let j = -radius; j <= radius; j++) {
            const idx = i + j;
            if (idx >= 0 && idx < arr.length) { sum += arr[idx]; count++; }
        }
        out[i] = sum / count;
    }
    return out;
}

function findTwoPeaks(arr, minDist) {
    let max1 = 0;
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] > arr[max1]) max1 = i;
    }
    if (arr[max1] === 0) return null;

    let max2 = -1;
    for (let i = 0; i < arr.length; i++) {
        if (Math.abs(i - max1) < minDist) continue;
        if (max2 === -1 || arr[i] > arr[max2]) max2 = i;
    }

    if (max2 === -1 || arr[max2] < arr[max1] * 0.12) return null;

    return [max1, max2];
}

function fallbackRect(natW, natH) {
    return [
        { x: natW * 0.12, y: natH * 0.15 },
        { x: natW * 0.88, y: natH * 0.15 },
        { x: natW * 0.88, y: natH * 0.85 },
        { x: natW * 0.12, y: natH * 0.85 },
    ];
}
