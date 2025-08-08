interface HeaderProps {
  title?: string;
  description?: string;
}

export function Header({
  title = "SOAP Note Generator",
  description = "Voice-to-SOAP medical documentation assistant",
}: HeaderProps) {
  return (
    <div className="text-center py-8 px-4">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
