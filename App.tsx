import React from 'react';

function App() {
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
        <p>Следующий шаг: добавление компонентов</p>
      </div>
    </div>
  );
}

export default App;
