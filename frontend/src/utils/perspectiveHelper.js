/**
 * Perspective warping utility
 * Calculates homography matrix and applies warp to Canvas
 */

// Solves a system of linear equations using Gaussian elimination
function solve(A, b) {
    const n = A.length;
    for (let i = 0; i < n; i++) {
        let max = i;
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(A[j][i]) > Math.abs(A[max][i])) max = j;
        }
        [A[i], A[max]] = [A[max], A[i]];
        [b[i], b[max]] = [b[max], b[i]];

        for (let j = i + 1; j < n; j++) {
            const factor = A[j][i] / A[i][i];
            b[j] -= factor * b[i];
            for (let k = i; k < n; k++) {
                A[j][k] -= factor * A[i][k];
            }
        }
    }

    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) {
            sum += A[i][j] * x[j];
        }
        x[i] = (b[i] - sum) / A[i][i];
    }
    return x;
}

/**
 * Calculates the perspective transform matrix from 4 source points to 4 dest points
 * Points: [{x, y}, ...]
 */
export function getPerspectiveTransform(src, dst) {
    const A = [];
    const b = [];

    for (let i = 0; i < 4; i++) {
        const { x: sx, y: sy } = src[i];
        const { x: dx, y: dy } = dst[i];
        A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
        b.push(dx);
        A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
        b.push(dy);
    }

    const h = solve(A, b);
    return [...h, 1]; // [a, b, c, d, e, f, g, h, 1]
}

/**
 * Applies perspective warp to a canvas
 */
export function warpPerspective(srcImg, srcPoints, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // We calculate inverse transform to pull pixels from source
    const dstPoints = [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height }
    ];

    // To warp correctly, we usually use the inverse mapping (dst -> src)
    // for each pixel in output, find where it comes from in input.
    // However, JS Canvas doesn't have a direct native way to do this pixel by pixel efficiently 
    // without using ImageData or WebGL.

    // Simpler hack for high-level JS: Split into triangles and use clipping/transform.
    // But for a card, we want high quality. Let's use ImageData for a clean warp.

    const h = getPerspectiveTransform(dstPoints, srcPoints); // Inverse: output -> input

    // Create temporary canvas to get source image data
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = srcImg.naturalWidth;
    srcCanvas.height = srcImg.naturalHeight;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(srcImg, 0, 0);
    const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height).data;

    const dstImageData = ctx.createImageData(width, height);
    const dstData = dstImageData.data;

    const [a, b, c, d, e, f, g, l] = h; // l is 'h' in matrix notation, used 'l' to avoid conflict with function arg h

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const denom = g * x + l * y + 1;
            const sx = (a * x + b * y + c) / denom;
            const sy = (d * x + e * y + f) / denom;

            if (sx >= 0 && sx < srcCanvas.width - 1 && sy >= 0 && sy < srcCanvas.height - 1) {
                // Bilinear interpolation (optional, using nearest neighbor for speed/simplicity first)
                const ix = Math.floor(sx);
                const iy = Math.floor(sy);
                const srcIdx = (iy * srcCanvas.width + ix) * 4;
                const dstIdx = (y * width + x) * 4;

                dstData[dstIdx] = srcData[srcIdx];
                dstData[dstIdx + 1] = srcData[srcIdx + 1];
                dstData[dstIdx + 2] = srcData[srcIdx + 2];
                dstData[dstIdx + 3] = srcData[srcIdx + 3];
            }
        }
    }

    ctx.putImageData(dstImageData, 0, 0);
    return canvas;
}
