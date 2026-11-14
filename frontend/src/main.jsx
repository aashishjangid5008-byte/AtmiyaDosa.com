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
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
              A temporary display refresh is required. Click below to reload the live POS terminal.
            </p>
            {this.state.error && (
              <div style={{
                textAlign: 'left',
                backgroundColor: '#0f172a',
                border: '1px solid #dc2626',
                color: '#fca5a5',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'monospace',
                marginBottom: '16px',
                maxHeight: '120px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {this.state.error.toString()}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#f97316',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Reload Live POS
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('atmiya_orders');
                    localStorage.removeItem('restaurant_orders');
                    localStorage.removeItem('seen_order_ids');
                    localStorage.removeItem('kds_cleared_order_ids');
                    localStorage.removeItem('preferred_language');
                  } catch (e) {}
                  window.location.reload();
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#334155',
                  color: '#cbd5e1',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Reset State
              </button>
            </div>
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
