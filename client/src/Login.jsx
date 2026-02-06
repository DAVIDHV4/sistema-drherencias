import { useState } from 'react';
import axios from 'axios';
import './estilos/Login.css';

function Login({ onLogin }) {
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // CORREGIDO: Ruta relativa (sin localhost)
      const res = await axios.post('/api/login', form);
      if (res.data.usuario) {
        onLogin(res.data.usuario);
      }
    } catch (err) {
      setError('Credenciales incorrectas. Verifique usuario y contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="zoom-login-container">
      <div className="zoom-login-card">
        
        <div className="zoom-header">
          {/* Aquí podrías poner tu logo si tuvieras uno */}
          <h1>Iniciar Sesión</h1>
          <p className="zoom-subtitle">Sistema Legal Corporativo</p>
        </div>

        {error && <div className="zoom-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="zoom-form">
          
          <div className="zoom-input-group">
            <label htmlFor="usuario">Usuario / Correo Electrónico</label>
            <input 
              id="usuario"
              type="text" 
              className="zoom-input"
              placeholder="Ingrese su usuario"
              value={form.usuario}
              onChange={(e) => setForm({...form, usuario: e.target.value})}
              required
            />
          </div>
          
          <div className="zoom-input-group">
            <label htmlFor="password">Contraseña</label>
            <input 
              id="password"
              type="password" 
              className="zoom-input"
              placeholder="Ingrese su contraseña"
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
              required
            />
            <div className="zoom-forgot-link">
              <a href="#">¿Olvidó su contraseña?</a>
            </div>
          </div>

          <button type="submit" className="btn-zoom-signin" disabled={isLoading}>
            {isLoading ? 'Verificando...' : 'Acceder'}
          </button>
        </form>
            
        <div className="zoom-footer">
          <p>¿Necesita ayuda? Contacte al administrador.</p>
        </div>

      </div>
    </div>
  );
}

export default Login;