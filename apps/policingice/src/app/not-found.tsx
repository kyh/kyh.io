import Link from "next/link";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-white px-4 py-8 sm:px-6">
      <div className="max-w-xl">
        <p className="text-sm text-neutral-500">
          Not found.{" "}
          <Link
            href="/"
            className="underline underline-offset-2 hover:text-neutral-900"
          >
            Back
          </Link>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
