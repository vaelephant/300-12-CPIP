export function BrandMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 4v5.2M12 9.2 6.4 12.9v4.3M12 9.2l5.6 3.7v4.3"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <circle cx="12" cy="3.4" r="1.9" fill="currentColor" />
      <circle cx="12" cy="9.4" r="1.35" fill="currentColor" opacity="0.85" />
      <circle cx="6.4" cy="18.4" r="1.8" fill="currentColor" opacity="0.7" />
      <circle cx="17.6" cy="18.4" r="1.8" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
