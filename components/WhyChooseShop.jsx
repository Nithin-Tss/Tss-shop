const features = [
  {
    title: "AI Assistant",
    description: "Get smart recommendations and save time.",
    icon: "🤖",
    iconBackground: "bg-purple-100",
  },
  {
    title: "Automation",
    description: "Automate repetitive tasks and focus on growth.",
    icon: "⚡",
    iconBackground: "bg-yellow-100",
  },
  {
    title: "Analytics",
    description: "Make data-driven decisions with powerful insights.",
    icon: "▥",
    iconBackground: "bg-blue-100",
  },
  {
    title: "Smart Inventory",
    description: "Track stock, get alerts, and never run out.",
    icon: "◇",
    iconBackground: "bg-green-100",
  },
  {
    title: "Customer Insights",
    description: "Understand your customers and boost sales.",
    icon: "◎",
    iconBackground: "bg-pink-100",
  },
  {
    title: "Security",
    description: "Your business and customer data are always protected.",
    icon: "✓",
    iconBackground: "bg-purple-100",
  },
];

export default function WhyChooseVendra() {
  return (
    <section className="w-full bg-white px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Heading */}
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Why choose Store?
        </h2>

        {/* Features */}
        <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex items-start gap-5"
            >
              {/* Icon */}
              <div
                className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full ${feature.iconBackground}`}
              >
                <span
                  className="text-3xl font-bold text-blue-600"
                  aria-hidden="true"
                >
                  {feature.icon}
                </span>
              </div>

              {/* Content */}
              <div className="pt-1">
                <h3 className="text-lg font-bold text-slate-900">
                  {feature.title}
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500 sm:text-base">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}