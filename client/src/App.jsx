import { useState, useEffect } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';

function App() {
  // Estado para guardar el usuario actual
  const [usuario, setUsuario] = useState(null);

  // EFECTO: Al cargar la página, revisamos si existe una sesión guardada
  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('usuario_legal');
    if (usuarioGuardado) {
      setUsuario(usuarioGuardado);
    }
  }, []);

  // Función para iniciar sesión
  const handleLogin = (nombreUsuario) => {
    localStorage.setItem('usuario_legal', nombreUsuario); // Guardar en el navegador
    setUsuario(nombreUsuario);
  };

  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('usuario_legal'); // Borrar del navegador
    setUsuario(null);
  };

  return (
    <div>
      {/* LÓGICA PRINCIPAL:
          Si 'usuario' tiene datos, mostramos el Dashboard.
          Si es null, mostramos el Login.
      */}
      {usuario ? (
        <Dashboard usuario={usuario} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;