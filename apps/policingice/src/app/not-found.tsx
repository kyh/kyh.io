import Link from "next/link";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="max-w-xl">
        <p className="text-sm text-muted-foreground">
          Not found.{" "}
          <Link
            href="/"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Back
          </Link>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
