export const SELECTIONS = {
  time: "time",
  trendDay: "trendDay",
  trendWeek: "trendWeek",
  trendBiWeek: "trendBiWeek",
  trendMonth: "trendMonth",
};

export const DataFilter = ({ selected, onSelectFilter }) => {
  return (
    <span className="relative z-0 inline-flex shadow-sm rounded-md">
      <button
        type="button"
        className={`relative inline-flex items-center px-3 py-1 rounded-l-md border border-gray-400 text-xs font-medium focus:outline-none hover:bg-gray-800 transition ease-in-out duration-150 whitespace-no-wrap ${
          selected === SELECTIONS.time ? "bg-gray-800" : "bg-gray-900"
        }`}
        onClick={() => onSelectFilter(SELECTIONS.time)}
      >
        Cases over time
      </button>
      <select
        className={`-ml-px block form-select px-3 py-1 rounded-l-none rounded-r-md border border-gray-400 text-xs font-medium focus:outline-none hover:bg-gray-800 transition ease-in-out duration-150 whitespace-no-wrap ${
          selected !== SELECTIONS.time ? "bg-gray-800" : "bg-gray-900"
        }`}
        value={selected}
        onChange={(event) => onSelectFilter(event.target.value)}
      >
        <option value={SELECTIONS.time} disabled>
          Trends
        </option>
        <option value={SELECTIONS.trendDay}>1 Day Trend</option>
        <option value={SELECTIONS.trendWeek}>1 Week Trend</option>
        <option value={SELECTIONS.trendBiWeek}>2 Week Trend</option>
        <option value={SELECTIONS.trendMonth}>1 Month Trend</option>
      </select>
    </span>
  );
};
