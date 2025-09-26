import { stateAbbrevToFullname } from "utils/map-utils";
import { Progress } from "components/Progress";
import { Loader } from "components/Loader";
import { formatNumber } from "utils/formatter";

export const Sidebar = ({
  states,
  isLoading,
  selectedState,
  onSelectState,
  statesDailyData,
  usDailyData,
}) => {
  const lastUSDay = usDailyData[usDailyData.length - 1];
  return (
    <>
      <section className="sidebar border-gray-700 border rounded-sm w-64 mr-10 hidden sm:block">
        {isLoading ? (
          <Loader width="100%" height="100%">
            <rect x="0" y="0" width="100%" height="70" />
            <rect x="0" y="71" width="100%" height="70" />
            <rect x="0" y="142" width="100%" height="70" />
            <rect x="0" y="213" width="100%" height="70" />
            <rect x="0" y="284" width="100%" height="70" />
            <rect x="0" y="355" width="100%" height="70" />
            <rect x="0" y="426" width="100%" height="70" />
            <rect x="0" y="497" width="100%" height="70" />
          </Loader>
        ) : (
          <ul className="divide-y divide-gray-700 border-b border-gray-700">
            {states.map((state) => {
              const data = statesDailyData[state];
              const lastDay = data[data.length - 1];
              return (
                <li key={state}>
                  <button
                    className={`p-4 w-full text-sm text-left focus:outline-none transition duration-150 ease-in-out ${
                      selectedState === state ? "bg-gray-800" : ""
                    } hover:bg-gray-800`}
                    type="button"
                    key={state}
                    onClick={() => onSelectState(state)}
                  >
                    <div className="flex justify-between mb-2">
                      <span>{stateAbbrevToFullname[state]}</span>
                      <span>{formatNumber(lastDay.positive)}</span>
                    </div>
                    <Progress
                      value={lastDay ? lastDay.positive : 0}
                      total={lastUSDay ? lastUSDay.positive : 0}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="px-4 mb-4 sm:hidden">
        {isLoading ? (
          <Loader width="100%" height="36">
            <rect x="0" y="0" rx="5" ry="5" width="100%" height="100%" />
          </Loader>
        ) : (
          <select
            className="form-select w-full px-4 py-2 rounded-md border border-gray-400 text-xs font-medium focus:outline-none hover:bg-gray-800 transition ease-in-out duration-150 whitespace-no-wrap bg-gray-900"
            value={selectedState}
            onChange={(event) => onSelectState(event.target.value)}
          >
            <option value={undefined}>United States</option>
            <optgroup label="States">
              {states.map((state) => (
                <option value={state} key={state}>
                  {stateAbbrevToFullname[state]}
                </option>
              ))}
            </optgroup>
          </select>
        )}
      </section>
    </>
  );
};
