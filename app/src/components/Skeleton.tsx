interface SkeletonProps {
	width?: number | string;
	height?: number | string;
	borderRadius?: string;
	style?: React.CSSProperties;
}

export function Skeleton({ width, height, borderRadius = 'var(--r-md)', style }: SkeletonProps) {
	return (
		<div className="skeleton" style={{ width, height, borderRadius, ...style }} />
	);
}
