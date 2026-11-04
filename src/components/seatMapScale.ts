interface Position { x: number; y: number }

export function mapPoint(position: Position) {
  return { x: position.x * 1000, y: position.y * 562 };
}

export function markerRadius(positions: Position[], maximum: number) {
  const points = positions.map(mapPoint);
  let minimum = maximum * 3;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const distance = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      if (distance > 0) minimum = Math.min(minimum, distance);
    }
  }
  return Math.min(maximum, minimum / 3);
}

export function detailViewBox(positions: Position[], padding: number) {
  const points = positions.map(mapPoint);
  const x = Math.min(...points.map(p => p.x)) - padding;
  const y = Math.min(...points.map(p => p.y)) - padding;
  const width = Math.max(...points.map(p => p.x)) - x + padding;
  const height = Math.max(...points.map(p => p.y)) - y + padding;
  return `${x} ${y} ${width} ${height}`;
}
