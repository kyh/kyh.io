export const Input = ({ label, ...rest }) => {
  return (
    <div>
      <label htmlFor={label} className="sr-only">
        {label}
      </label>
      <div className="relative rounded-md shadow-sm">
        <input
          id={label}
          className="appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline block w-full sm:text-sm sm:leading-5"
          {...rest}
        />
      </div>
    </div>
  );
};
