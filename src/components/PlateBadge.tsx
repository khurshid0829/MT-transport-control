export default function PlateBadge({ value }: { value: string }) {
  return (
    <span className="plate-badge">
      <span className="plate-flag">
        <span style={{ flex: 1, background: '#0099B5' }} />
        <span style={{ flex: 0.3, background: '#CE1126' }} />
        <span style={{ flex: 1, background: '#1EB53A' }} />
      </span>
      {value}
    </span>
  );
}
