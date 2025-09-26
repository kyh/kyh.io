export const SELECTIONS = {
  time: "time",
  trendDay: "trendDay",
  trendWeek: "trendWeek",
  trendBiWeek: "trendBiWeek",
  trendMonth: "trendMonth",
};

export const DataFilter = ({ selected, onSelectFilter }) => {
  return (
    <span className="relative z-0 inline-flex rounded-md shadow-sm">
      <button
        type="button"
        className={`whitespace-no-wrap relative inline-flex items-center rounded-l-md border border-gray-400 px-3 py-2 text-xs font-medium transition duration-150 ease-in-out hover:bg-gray-800 focus:outline-none ${
          selected === SELECTIONS.time ? "bg-gray-800" : "bg-gray-900"
        }`}
        onClick={() => onSelectFilter(SELECTIONS.time)}
      >
        Cases over time
      </button>
      <select
        className={`form-select whitespace-no-wrap -ml-px block rounded-l-none rounded-r-md border border-gray-400 px-3 py-2 text-xs font-medium transition duration-150 ease-in-out hover:bg-gray-800 focus:outline-none ${
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
