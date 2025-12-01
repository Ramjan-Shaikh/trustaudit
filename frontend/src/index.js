import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from "./App.jsx";
import reportWebVitals from './reportWebVitals';

// Suppress ResizeObserver errors (common with React Flow and harmless)
const originalError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('ResizeObserver loop completed with undelivered notifications')
  ) {
    return;
  }
  originalError.call(console, ...args);
};

// Also handle unhandled promise rejections for ResizeObserver
window.addEventListener('error', (e) => {
  if (
    e.message &&
    e.message.includes('ResizeObserver loop completed with undelivered notifications')
  ) {
    e.stopImmediatePropagation();
  }
});

// Handle unhandled promise rejections (ResizeObserver can also throw these)
window.addEventListener('unhandledrejection', (e) => {
  if (
    e.reason &&
    typeof e.reason === 'string' &&
    e.reason.includes('ResizeObserver loop completed with undelivered notifications')
  ) {
    e.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
