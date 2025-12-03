import React from 'react';
import ReactDOM from 'react-dom/client';
import SomeTest from './SomeTest';
// import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <SomeTest />
  </React.StrictMode>,
);
