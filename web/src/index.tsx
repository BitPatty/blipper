import ReactDOM from 'react-dom/client';
import HomePage from './pages/HomePage';

import { BrowserRouter, Route, Routes } from 'react-router';

import AuthenticationCallbackPage from './pages/AuthenticationCallbackPage';
import BlipsPage from './pages/BlipsPage';

import './styles/index.css';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

const Main: React.FC = () => {
  return (
    <div>
      <header className="padding-2">
        <h1>Blipper</h1>
      </header>
      <main className="padding-2">
        <BrowserRouter>
          <Routes>
            <Route path="" element={<HomePage />} />
            <Route path="/auth-callback" element={<AuthenticationCallbackPage />} />
            <Route path="/blips" element={<BlipsPage />} />
          </Routes>
        </BrowserRouter>
      </main>
    </div>
  );
};

root.render(<Main />);
