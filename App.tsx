import React, { useState, useEffect } from 'react';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('dashboard');

  // Временно используем моковые данные
  const dashboardData = [
    {
      id: 1,
      name: 'Dashboard',
      description: 'Dashboard view',
    },
  ];

  return (
    <div style={{ 
      padding: '40px', 
      backgroundColor: '#1a2a6c',
      color: 'white',
      minHeight: '100vh',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '2.5em', marginBottom: '20px' }}>
        ✅ React работает на GitHub Pages!
      </h1>
      <p style={{ fontSize: '1.2em' }}>
        Базовая настройка React успешно завершена
      </p>
      
      <div style={{
        marginTop: '40px',
        padding: '20px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '10px'
      }}>
        <h2>Текущий вид: {view}</h2>
        <p>Данные: {JSON.stringify(dashboardData)}</p>
        
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={() => setView('dashboard')}
            style={{ 
              margin: '10px', 
              padding: '10px 20px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px'
            }}
          >
            Дашборд
          </button>
          <button 
            onClick={() => setView('history')}
            style={{ 
              margin: '10px', 
              padding: '10px 20px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '5px'
            }}
          >
            История
          </button>
        </div>
      </div>
      
      <div style={{ marginTop: '40px' }}>
        <p>Следующий шаг: добавление компонентов</p>
      </div>
    </div>
  );
}

export default App;
