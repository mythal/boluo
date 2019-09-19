import React from 'react';
import { Link } from 'react-router-dom';

export const NotFound: React.FC = () => {
  return (
    <main>
      <h1>Not Found</h1>
      <p>
        <Link to="/">Back to Home</Link>
      </p>
    </main>
  );
};
