const selections = ["time", "trendDay", "trendWeek", "trendBiWeek", "trendMonth"] as const;

export type Selection = (typeof selections)[number];

const selectionSet: ReadonlySet<string> = new Set(selections);

export const isSelection = (value: string): value is Selection => selectionSet.has(value);

interface DataFilterProps {
  selected: Selection;
  onSelectFilter: (selection: Selection) => void;
}

export const DataFilter = ({ selected, onSelectFilter }: DataFilterProps) => (
  <span className="relative z-0 inline-flex rounded-md shadow-sm">
    <button
      type="button"
      className={`whitespace-no-wrap relative inline-flex items-center rounded-l-md border border-gray-400 px-3 py-2 text-xs font-medium transition duration-150 ease-in-out hover:bg-gray-800 focus:outline-none ${
        selected === "time" ? "bg-gray-800" : "bg-gray-900"
      }`}
      onClick={() => {
        onSelectFilter("time");
      }}
    >
      Cases over time
    </button>
    <select
      className={`form-select whitespace-no-wrap -ml-px block rounded-l-none rounded-r-md border border-gray-400 px-3 py-2 text-xs font-medium transition duration-150 ease-in-out hover:bg-gray-800 focus:outline-none ${
        selected === "time" ? "bg-gray-900" : "bg-gray-800"
      }`}
      value={selected}
      onChange={(event) => {
        const { value } = event.target;

        if (isSelection(value)) {
          onSelectFilter(value);
        }
      }}
    >
      <option value="time" disabled>
        Trends
      </option>
      <option value="trendDay">1 Day Trend</option>
      <option value="trendWeek">1 Week Trend</option>
      <option value="trendBiWeek">2 Week Trend</option>
      <option value="trendMonth">1 Month Trend</option>
    </select>
  </span>
);
