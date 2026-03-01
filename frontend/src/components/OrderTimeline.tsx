type Props = {
  status: string;
};

const steps = [
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "READY_FOR_PICKUP",
  "DISPATCHED",
  "OUT_FOR_DELIVERY",
  "COMPLETED"
];

export default function OrderTimeline({ status }: Props) {
  const currentIndex = steps.indexOf(status);

  return (
    <div style={{ marginTop: 15 }}>
      {steps.map((step, index) => {
        const isActive = index <= currentIndex;

        return (
          <div
            key={step}
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 8
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: isActive ? "green" : "#ccc",
                marginRight: 10
              }}
            />

            <span
              style={{
                color: isActive ? "green" : "#999",
                fontWeight: isActive ? "bold" : "normal"
              }}
            >
              {step.replaceAll("_", " ")}
            </span>
          </div>
        );
      })}
    </div>
  );
}