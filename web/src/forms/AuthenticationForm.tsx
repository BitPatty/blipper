import React, { useState } from 'react';
import LoadingState from '../components/LoadingState';

const AuthenticationForm: React.FC = () => {
  const [isAuthenticating, setIsAuthentication] = useState<boolean>(false);

  if (isAuthenticating)
    return (
      <div>
        <LoadingState text="Authenticating, please wait..." />
      </div>
    );

  return (
    <div>
      <button
        onClick={() => {
          setIsAuthentication(true);
          window.location.href = process.env.REACT_APP_OAUTH_URL!;
        }}
      >
        Authenticate using GitHub
      </button>
    </div>
  );
};

export default AuthenticationForm;
