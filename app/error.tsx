"use client";

import { useEffect } from "react";

type ErrorProps = {
  error: Error;
};

export default function Error({ error }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div>
      <p>Oh no, something went wrong... maybe refresh?</p>
    </div>
  );
}
