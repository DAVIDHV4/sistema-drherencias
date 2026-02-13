import { useState } from 'react';
import axios from 'axios';
import MenuPrincipal from './MenuPrincipal';
import VistaExpedientes from './VistaExpedientes'; 
import './App.css'; 

function App() {
  const [usuario, setUsuario] = useState(null);
  const [vistaActual, setVistaActual] = useState('menu'); 
  const [opcionSeleccionada, setOpcionSeleccionada] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/login', { usuario: username, password });
      setUsuario(res.data.usuario);
      setVistaActual('menu'); 
      setError("");
    } catch (err) {
      setError("Credenciales incorrectas");
    }
  };

  const handleLogout = () => {
    setUsuario(null);
    setVistaActual('menu');
    setOpcionSeleccionada("");
    setUsername("");
    setPassword("");
  };

  const irATabla = (opcion) => {
    setOpcionSeleccionada(opcion);
    setVistaActual('tabla');
  };

  const volverAlMenu = () => {
    setVistaActual('menu');
    setOpcionSeleccionada("");
  };

  if (!usuario) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h2>Iniciar Sesión</h2>
          {error && <p className="error-msg">{error}</p>}
          <form onSubmit={handleLogin}>
            <input type="text" placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit">Ingresar</button>
          </form>
        </div>
      </div>
    );
  }

  if (vistaActual === 'menu') {
    return <MenuPrincipal usuario={usuario} onLogout={handleLogout} onSeleccionar={irATabla} />;
  }

  if (vistaActual === 'tabla') {
    return (
      <VistaExpedientes 
        usuario={usuario} 
        categoriaPrincipal={opcionSeleccionada} 
        onLogout={handleLogout} 
        onVolver={volverAlMenu}
      />
    );
  }
}

export default App;