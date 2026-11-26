import { PageContainer } from "components/page-container";
import { Link } from "react-router-dom";

export const NotFoundPage = () => (
  <PageContainer>
    <div className="px-4 py-16 sm:px-0">
      <p className="text-sm font-medium text-gray-400">404</p>
      <h1 className="mt-2 text-3xl leading-tight font-bold text-white">Page not found</h1>
      <p className="mt-4 text-gray-400">There is nothing at this address.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-md bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white focus:text-white focus:outline-none"
      >
        Back to the dashboard
      </Link>
    </div>
  </PageContainer>
);
