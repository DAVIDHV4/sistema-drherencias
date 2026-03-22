import { useState, useEffect } from 'react';
import axios from 'axios';
import MenuPrincipal from './MenuPrincipal';
import VistaExpedientes from './VistaExpedientes'; 
import VistaCitas from './VistaCitas';
import './App.css'; 

function App() {
  const [usuario, setUsuario] = useState(null);
  const [vistaActual, setVistaActual] = useState('menu'); 
  const [opcionSeleccionada, setOpcionSeleccionada] = useState("");
  const [filtroBuscador, setFiltroBuscador] = useState("");
  const [subCategoriaSeleccionada, setSubCategoriaSeleccionada] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('usuario_sistema');
    if (usuarioGuardado) {
      setUsuario(usuarioGuardado);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/login', { usuario: username.toUpperCase(), password });
      if (res.data.usuario) {
        setUsuario(res.data.usuario);
        localStorage.setItem('usuario_sistema', res.data.usuario);
        setVistaActual('menu'); 
        setError("");
      }
    } catch (err) {
      setError("Credenciales incorrectas");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('usuario_sistema');
    setUsuario(null);
    setVistaActual('menu');
    setOpcionSeleccionada("");
    setFiltroBuscador("");
    setSubCategoriaSeleccionada("");
    setUsername("");
    setPassword("");
  };

  const irATabla = (opcion, busqueda = "", subCategoria = "") => {
    setOpcionSeleccionada(opcion);
    setFiltroBuscador(busqueda);
    setSubCategoriaSeleccionada(subCategoria);
    if (opcion === "Gestión de Citas") {
      setVistaActual('citas');
    } else {
      setVistaActual('tabla');
    }
  };

  const volverAlMenu = () => {
    setVistaActual('menu');
    setOpcionSeleccionada("");
    setFiltroBuscador("");
    setSubCategoriaSeleccionada("");
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

  if (vistaActual === 'citas') {
    return <VistaCitas usuario={usuario} onLogout={handleLogout} onVolver={volverAlMenu} />;
  }

  if (vistaActual === 'tabla') {
    return (
      <VistaExpedientes 
        usuario={usuario} 
        categoriaPrincipal={opcionSeleccionada} 
        filtroInicial={filtroBuscador}
        subCategoriaInicial={subCategoriaSeleccionada}
        onLogout={handleLogout} 
        onVolver={volverAlMenu}
      />
    );
  }
}

export default App;