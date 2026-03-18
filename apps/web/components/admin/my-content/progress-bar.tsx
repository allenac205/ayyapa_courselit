interface ProgressBarProps {
    value: number;
    className?: string;
}

export function ProgressBar({ value, className }: ProgressBarProps) {
    return (
        <div
            className={`h-2 w-full rounded-full bg-muted/40 overflow-hidden ${className}`}
        >
            <div
                className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
        </div>
    );
}
