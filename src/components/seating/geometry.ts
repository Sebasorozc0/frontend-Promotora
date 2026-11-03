import type { PoligonoGeo } from '../../types/api';

export const SEAT_MAP_WIDTH = 1000;
export const SEAT_MAP_HEIGHT = 562;

export function pointInPolygon(point: [number, number], polygon?: PoligonoGeo | null): boolean {
  const points = polygon?.points;
  if (!points || points.length < 3) return false;

  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const cross = (x - xi) * (yj - yi) - (y - yi) * (xj - xi);
    const onSegment = Math.abs(cross) < 0.001 && x >= Math.min(xi, xj) - 0.001 && x <= Math.max(xi, xj) + 0.001 &&
      y >= Math.min(yi, yj) - 0.001 && y <= Math.max(yi, yj) + 0.001;
    if (onSegment) return true;

    const intersects = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function svgClientPoint(svg: SVGSVGElement, clientX: number, clientY: number): [number, number] {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const matrix = svg.getScreenCTM();
  if (!matrix) return [0, 0];
  const local = point.matrixTransform(matrix.inverse());
  return [
    Math.max(0, Math.min(SEAT_MAP_WIDTH, local.x)),
    Math.max(0, Math.min(SEAT_MAP_HEIGHT, local.y)),
  ];
}

export function toNormalizedPoint(point: [number, number]): [number, number] {
  return [point[0] / SEAT_MAP_WIDTH, point[1] / SEAT_MAP_HEIGHT];
}

export function fromNormalizedPoint(x: number, y: number): [number, number] {
  return [x * SEAT_MAP_WIDTH, y * SEAT_MAP_HEIGHT];
}
