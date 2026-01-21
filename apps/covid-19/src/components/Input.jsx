export const Input = ({ label, ...rest }) => {
  return (
    <div>
      <label htmlFor={label} className="sr-only">
        {label}
      </label>
      <div className="relative rounded-md shadow-sm">
        <input
          id={label}
          className="focus:shadow-outline block w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 focus:outline-none sm:text-sm sm:leading-5"
          {...rest}
        />
      </div>
    </div>
  );
};
