interface Props {
  status: string;
}

export default function StatusBadge({ status }: Props) {

  const getColor = () => {
    switch (status) {
      case "PENDING_CONFIRMATION":
        return "bg-yellow-200 text-yellow-800";
      case "CONFIRMED":
        return "bg-blue-200 text-blue-800";
      case "READY_FOR_PICKUP":
        return "bg-indigo-200 text-indigo-800";
      case "DISPATCHED":
        return "bg-purple-200 text-purple-800";
      case "OUT_FOR_DELIVERY":
        return "bg-orange-200 text-orange-800";
      case "COMPLETED":
        return "bg-green-200 text-green-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getColor()}`}>
      {status}
    </span>
  );
}