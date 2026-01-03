import React from 'react';
import { createRoot } from 'react-dom/client';
import AppRoot from './App';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>
);
