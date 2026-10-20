import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Caught Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          padding: '24px',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '440px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🍽️</div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>Atmiya Dosa Hub POS</h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
              A temporary display refresh is required. Click below to reload the live POS terminal.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: '#f97316',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Reload Live POS
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
)
