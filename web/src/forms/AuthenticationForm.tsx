import React, { useEffect } from 'react';
import LoadingState from '../components/LoadingState';

const AuthenticationForm: React.FC = () => {
  useEffect(() => {
    window.location.href = process.env.REACT_APP_OAUTH_URL!;
  }, []);

  return (
    <div>
      <LoadingState text="Authentication, please wait..." />
    </div>
  );
};

export default AuthenticationForm;
