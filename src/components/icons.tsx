/** The editor's icons: one 20px grid, 1.75 stroke, round joins. */

type IconProps = { className?: string };

function Icon({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 4.2v11.6a.6.6 0 0 0 .9.5l9.1-5.8a.6.6 0 0 0 0-1L7.4 3.7a.6.6 0 0 0-.9.5Z" fill="currentColor" />
    </Icon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="4" width="3.2" height="12" rx=".8" fill="currentColor" stroke="none" />
      <rect x="11.8" y="4" width="3.2" height="12" rx=".8" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function LoopIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 9V8a3 3 0 0 1 3-3h8.5" />
      <path d="m13 2.5 2.5 2.5L13 7.5" />
      <path d="M16 11v1a3 3 0 0 1-3 3H4.5" />
      <path d="m7 17.5-2.5-2.5L7 12.5" />
    </Icon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 3v9.5" />
      <path d="m6 8.8 4 4 4-4" />
      <path d="M4 15.5v.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-.5" />
    </Icon>
  );
}

export function ZoomInIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8.5" cy="8.5" r="5" />
      <path d="m12.3 12.3 4.2 4.2M8.5 6.5v4M6.5 8.5h4" />
    </Icon>
  );
}

export function ZoomOutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8.5" cy="8.5" r="5" />
      <path d="m12.3 12.3 4.2 4.2M6.5 8.5h4" />
    </Icon>
  );
}

export function FitRegionIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 4v12M17 4v12" />
      <path d="M6 10h8M8.5 7.5 6 10l2.5 2.5M11.5 7.5 14 10l-2.5 2.5" />
    </Icon>
  );
}

export function KeyboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="5" width="15" height="10" rx="1.5" />
      <path d="M5.5 8h1M9.5 8h1M13.5 8h1M5.5 11h1M7.5 12.2h5M13.5 11h1" />
    </Icon>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m12.5 4.5 3 3L8 15l-3.8.8L5 12l7.5-7.5Z" />
    </Icon>
  );
}

/** The Sample Shift mark: twelve points on a ring, one of them lit. */
export function WheelMark({ className }: IconProps) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      {[...Array(12).keys()].map((i) => {
        const a = ((i * 30 - 90) * Math.PI) / 180;
        return (
          <circle
            key={i}
            cx={Math.round((14 + 10.5 * Math.cos(a)) * 1000) / 1000}
            cy={Math.round((14 + 10.5 * Math.sin(a)) * 1000) / 1000}
            r={i === 5 ? 3 : 1.9}
            fill={`oklch(0.7 0.15 ${20 + i * 30})`}
          />
        );
      })}
      <circle cx="14" cy="14" r="3.2" fill="currentColor" />
    </svg>
  );
}
