import { useNavigate } from 'react-router';
import AuthenticationCallbackForm from '../forms/AuthenticationCallbackForm';

const AuthenticationCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div>
      <div>
        <AuthenticationCallbackForm
          onCallbackCompleted={d => navigate(`/blips?user=${d.user.login}&repository=${d.selectedRepository.name}`)}
        />
      </div>
    </div>
  );
};

export default AuthenticationCallbackPage;
