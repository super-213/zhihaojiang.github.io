export default function initEssays() {
  const dateElements = document.querySelectorAll(".essay-date");

  if (!dateElements.length) {
    return;
  }

  const locale = config.language || "en";
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit", minute: "2-digit",
  });
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const relativeFormatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  dateElements.forEach((element) => {
    const rawDate = element.getAttribute("data-date");
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return;
    const midnight = new Date(date);
    midnight.setHours(0, 0, 0, 0);
    const days = Math.round((midnight - today) / 86400000);
    element.textContent = Math.abs(days) <= 1
      ? `${relativeFormatter.format(days, "day")} ${timeFormatter.format(date)}`
      : dateFormatter.format(date);
  });
}
