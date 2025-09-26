import { NavLink } from "react-router-dom";

const Link = ({ to, children }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 focus:outline-none focus:text-white focus:bg-gray-800 ${
          isActive ? "bg-gray-800 hover:bg-gray-800 focus:bg-gray-800" : ""
        }`
      }
    >
      {children}
    </NavLink>
  );
};

export const Navigation = () => {
  return (
    <nav className="mb-4 sm:mb-8">
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div className="border-b border-gray-700">
          <div className="flex items-center justify-between h-16 px-4 sm:px-0">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img
                  className="h-8 w-8"
                  src="/logo.svg"
                  alt="Covid-19 Dashboard"
                />
              </div>
              <div className="ml-10 flex items-baseline space-x-4">
                <Link to="/">Trend</Link>
                <Link to="/distribution">Distribution</Link>
              </div>
            </div>
            <div className="ml-6 flex items-center text-xs text-gray-400">
              <div className="ml-3 relative">7th March, 2021</div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
