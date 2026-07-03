export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      {/* Yo'l chizig'i */}
      <path d="M9 22L16 9L23 22" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 22L16 16L19 22" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
      <circle cx="16" cy="9" r="1.6" fill="var(--sidebar-accent)" />
    </svg>
  );
}
