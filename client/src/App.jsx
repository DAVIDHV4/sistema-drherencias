import { useState, useEffect } from 'react';
import axios from 'axios';
import VistaExpedientes from './VistaExpedientes'; 
import VistaCitas from './VistaCitas';
import VistaReportes from './VistaReportes';
import VistaUsuarios from './VistaUsuarios';
import { FaFolderOpen, FaCalendarAlt, FaSignOutAlt, FaSearch, FaUserCircle, FaChevronDown, FaChevronRight, FaLink, FaBars, FaFileExcel, FaUsers } from 'react-icons/fa';
import './App.css'; 
import './estilos/Layout.css'; 

function App() {
  const [usuario, setUsuario] = useState(null);
  const [rolUsuario, setRolUsuario] = useState(null);
  const [vistaActual, setVistaActual] = useState('tabla'); 
  const [opcionSeleccionada, setOpcionSeleccionada] = useState("Búsqueda General");
  const [filtroBuscador, setFiltroBuscador] = useState("");
  const [subCategoriaSeleccionada, setSubCategoriaSeleccionada] = useState("");
  const [menuExpedientesAbierto, setMenuExpedientesAbierto] = useState(true);
  const [mostrarEnlaces, setMostrarEnlaces] = useState(false);
  const [sidebarAbierto, setSidebarAbierto] = useState(window.innerWidth > 900);
  
  const [busquedaGlobal, setBusquedaGlobal] = useState("");
  const [resultadosGlobales, setResultadosGlobales] = useState([]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('usuario_sistema');
    const rolGuardado = localStorage.getItem('rol_sistema');
    
    if (usuarioGuardado) {
      setUsuario(usuarioGuardado);
      setRolUsuario(rolGuardado || 'TRABAJADOR');
    }
    
    const handleResize = () => {
      if (window.innerWidth > 900) {
        setSidebarAbierto(true);
      } else {
        setSidebarAbierto(false);
      }
    };
    window.addEventListener('resize', handleResize);

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const vistaUrl = params.get('vista') || 'tabla';
      const opcionUrl = params.get('opcion') || 'Búsqueda General';
      setVistaActual(vistaUrl);
      setOpcionSeleccionada(opcionUrl);
    };

    window.addEventListener('popstate', handlePopState);

    const params = new URLSearchParams(window.location.search);
    if (params.has('vista')) {
      handlePopState();
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const cambiarVista = (nuevaVista, nuevaOpcion = "") => {
    setVistaActual(nuevaVista);
    setOpcionSeleccionada(nuevaOpcion);
    
    const params = new URLSearchParams();
    params.set('vista', nuevaVista);
    if (nuevaOpcion) params.set('opcion', nuevaOpcion);
    
    window.history.pushState({}, '', `?${params.toString()}`);
    if (window.innerWidth <= 900) setSidebarAbierto(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/login', { usuario: username.toUpperCase(), password });
      if (res.data.usuario) {
        const rolAsignado = res.data.rol ? res.data.rol.toUpperCase() : 'TRABAJADOR';
        
        setUsuario(res.data.usuario);
        setRolUsuario(rolAsignado);
        
        localStorage.setItem('usuario_sistema', res.data.usuario);
        localStorage.setItem('rol_sistema', rolAsignado);
        
        cambiarVista('tabla', 'Búsqueda General');
        setError("");
      }
    } catch (err) {
      setError("Credenciales incorrectas");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('usuario_sistema');
    localStorage.removeItem('rol_sistema');
    setUsuario(null);
    setRolUsuario(null);
    setFiltroBuscador("");
    setSubCategoriaSeleccionada("");
    setUsername("");
    setPassword("");
    setBusquedaGlobal("");
    setResultadosGlobales([]);
    window.history.replaceState({}, '', '/');
  };

  const handleBuscarGlobal = async (e) => {
    e.preventDefault();
    if (!busquedaGlobal.trim()) {
      setResultadosGlobales([]);
      return;
    }
    try {
      const res = await axios.get(`/api/expedientes/buscar-global?query=${busquedaGlobal}`);
      const dataArray = res.data.data ? res.data.data : res.data;
      setResultadosGlobales(Array.isArray(dataArray) ? dataArray : []);
    } catch (error) {
      setResultadosGlobales([]);
    }
  };

  const irAExpediente = (tipo, categoria, nro_expediente) => {
    setSubCategoriaSeleccionada(categoria);
    setFiltroBuscador(nro_expediente);
    cambiarVista('tabla', tipo);
    setBusquedaGlobal("");
    setResultadosGlobales([]);
  };

  const handleOpcionMenu = (opcion) => {
    setFiltroBuscador("");
    setSubCategoriaSeleccionada("");
    cambiarVista('tabla', opcion);
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

  return (
    <div className="app-layout">
      
      <div className={`sidebar-overlay ${sidebarAbierto ? 'abierto' : ''}`} onClick={() => setSidebarAbierto(false)}></div>

      <aside className={`sidebar ${sidebarAbierto ? '' : 'cerrado'}`}>
        <div className="sidebar-logo">Dr. Herencias</div>
        <nav className="sidebar-nav">
          
          <button 
            className={`menu-parent ${vistaActual === 'tabla' ? 'active-parent' : ''}`}
            onClick={() => setMenuExpedientesAbierto(!menuExpedientesAbierto)}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
              <FaFolderOpen size={20} /> Expedientes
            </div>
            {menuExpedientesAbierto ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
          </button>

          {menuExpedientesAbierto && (
            <div className="sub-menu">
              <button 
                className={vistaActual === 'tabla' && opcionSeleccionada === "Búsqueda General" ? 'active' : ''} 
                onClick={() => handleOpcionMenu("Búsqueda General")}
              >
                Búsqueda General
              </button>
              <button 
                className={vistaActual === 'tabla' && opcionSeleccionada === "Expediente Administrativo" ? 'active' : ''} 
                onClick={() => handleOpcionMenu("Expediente Administrativo")}
              >
                Administrativos
              </button>
              <button 
                className={vistaActual === 'tabla' && opcionSeleccionada === "Expediente Notarial" ? 'active' : ''} 
                onClick={() => handleOpcionMenu("Expediente Notarial")}
              >
                Notariales
              </button>
              <button 
                className={vistaActual === 'tabla' && opcionSeleccionada === "Expediente Judicial" ? 'active' : ''} 
                onClick={() => handleOpcionMenu("Expediente Judicial")}
              >
                Judiciales
              </button>
              <button 
                className={vistaActual === 'tabla' && opcionSeleccionada === "Expediente por encargo" ? 'active' : ''} 
                onClick={() => handleOpcionMenu("Expediente por encargo")}
              >
                Por Encargo
              </button>
              <button 
                className={vistaActual === 'tabla' && opcionSeleccionada === "Expedientes archivados" ? 'active' : ''} 
                onClick={() => handleOpcionMenu("Expedientes archivados")}
              >
                Archivados
              </button>
            </div>
          )}
          
          <button 
            className={vistaActual === 'citas' ? 'active' : ''} 
            onClick={() => cambiarVista('citas')}
          >
            <FaCalendarAlt size={20} /> Calendario de Citas
          </button>
          
          {rolUsuario === 'ADMINISTRADOR' && (
            <>
              <button 
                className={vistaActual === 'reportes' ? 'active' : ''} 
                onClick={() => cambiarVista('reportes')}
              >
                <FaFileExcel size={20} /> Reporte Horarios
              </button>

              <button 
                className={vistaActual === 'usuarios' ? 'active' : ''} 
                onClick={() => cambiarVista('usuarios')}
              >
                <FaUsers size={20} /> Personal y Usuarios
              </button>
            </>
          )}

        </nav>
      </aside>

      <main className={`main-content ${sidebarAbierto && window.innerWidth <= 900 ? 'content-blurred' : ''}`}>
        
        <header className="topbar">
          <div className="topbar-left">
            <button 
              className="hamburger-btn"
              onClick={() => setSidebarAbierto(!sidebarAbierto)}
            >
              <FaBars size={22} />
            </button>

            <div className="tools-container">
              <button 
                onClick={() => setMostrarEnlaces(!mostrarEnlaces)}
                className="btn-herramientas"
              >
                <FaLink color="#3699ff" /> Herramientas <FaChevronDown size={12} />
              </button>
              
              {mostrarEnlaces && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '15px', background: 'white', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', padding: '5px 0', minWidth: '220px', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
                  <a href="https://sigueloplus.sunarp.gob.pe/siguelo/" target="_blank" rel="noopener noreferrer" style={{ padding: '12px 20px', color: '#333', textDecoration: 'none', fontSize: '14px', borderBottom: '1px solid #f5f5f5', fontWeight: '500' }}>Síguélo Pluss</a>
                  <a href="https://cej.pj.gob.pe/cej/forms/busquedaform.html" target="_blank" rel="noopener noreferrer" style={{ padding: '12px 20px', color: '#333', textDecoration: 'none', fontSize: '14px', borderBottom: '1px solid #f5f5f5', fontWeight: '500' }}>Búsqueda de Expediente</a>
                  <a href="https://im01-autorizacion-sprl-production.apps.paas.sunarp.gob.pe/v1/sunarp-services/im/autorizacion/login" target="_blank" rel="noopener noreferrer" style={{ padding: '12px 20px', color: '#333', textDecoration: 'none', fontSize: '14px', borderBottom: '1px solid #f5f5f5', fontWeight: '500' }}>Sunarp</a>
                  <a href="https://casillas.pj.gob.pe/sinoe/login.xhtml" target="_blank" rel="noopener noreferrer" style={{ padding: '12px 20px', color: '#333', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>SINOE</a>
                </div>
              )}
            </div>
          </div>

          <div className="topbar-user">
            <div className="topbar-user-info">
              <FaUserCircle size={24} color="#3699ff" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 'bold' }}>{usuario}</span>
                <span style={{ fontSize: '11px', color: '#888' }}>{rolUsuario}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-logout">
              <FaSignOutAlt/> Salir
            </button>
          </div>
        </header>

        <section className="view-area">
          
          {vistaActual === 'tabla' && opcionSeleccionada === "Búsqueda General" && (
            <div className="vista-container vista-container-completa">
              <div className="vista-content">
                <div className="vista-header-row vista-header-row-completa">
                  <h2>Búsqueda Global</h2>
                  <div className="vista-actions">
                    <form className="vista-search" onSubmit={handleBuscarGlobal}>
                      <FaSearch className="icon-search"/>
                      <input 
                        type="text" 
                        placeholder="DNI o Expediente..." 
                        value={busquedaGlobal}
                        onChange={(e) => setBusquedaGlobal(e.target.value)}
                      />
                      <button type="submit" style={{ display: 'none' }}></button>
                    </form>
                  </div>
                </div>

                <div style={{ padding: '30px' }}>
                  {resultadosGlobales.length === 0 ? (
                    <div style={{ background: '#fdfdfd', padding: '60px 20px', borderRadius: '12px', textAlign: 'center', color: '#888', border: '1px dashed #e1e5eb' }}>
                      <FaSearch size={40} color="#ddd" style={{ marginBottom: '15px' }} />
                      <p style={{ fontSize: '16px', margin: 0 }}>Escriba un DNI, Número de Expediente o Nombre en la barra superior y presione Enter.</p>
                    </div>
                  ) : (
                    <div className="vista-table-card-completa" style={{ overflowX: 'auto', width: '100%', border: '1px solid #eee', borderRadius: '8px' }}>
                      <table className="vista-table vista-table-completa">
                        <thead>
                          <tr>
                            <th>NRO. EXPEDIENTE</th>
                            <th>SOLICITANTE / DEMANDANTE</th>
                            <th>TIPO</th>
                            <th style={{ textAlign: 'center' }}>ACCIÓN</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultadosGlobales.map(exp => (
                            <tr key={exp.id}>
                              <td data-label="NRO. EXPEDIENTE" style={{ fontWeight: 'bold', color: '#333' }}>{exp.nro_expediente}</td>
                              <td data-label="SOLICITANTE">{exp.solicitante} <br/><small style={{color: '#999'}}>DNI: {exp.dni_solicitante}</small></td>
                              <td data-label="TIPO">{exp.tipo_expediente} <br/><small style={{color: '#3699ff', fontWeight: 'bold'}}>{exp.categoria}</small></td>
                              <td data-label="ACCIÓN" style={{ textAlign: 'center' }}>
                                <button 
                                  onClick={() => irAExpediente(exp.tipo_expediente, exp.categoria, exp.nro_expediente)}
                                  style={{ padding: '8px 15px', backgroundColor: '#3699ff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                                >
                                  Ir al Expediente
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {vistaActual === 'tabla' && opcionSeleccionada !== "Búsqueda General" && (
            <VistaExpedientes 
              usuario={usuario} 
              categoriaPrincipal={opcionSeleccionada} 
              filtroInicial={filtroBuscador}
              subCategoriaInicial={subCategoriaSeleccionada}
              onLogout={handleLogout} 
              onVolver={() => cambiarVista('tabla', 'Búsqueda General')}
            />
          )}

          {vistaActual === 'citas' && (
            <VistaCitas 
              usuario={usuario} 
              onLogout={handleLogout} 
              onVolver={() => cambiarVista('tabla', 'Búsqueda General')} 
            />
          )}

          {rolUsuario === 'ADMINISTRADOR' && vistaActual === 'reportes' && (
            <VistaReportes />
          )}

          {rolUsuario === 'ADMINISTRADOR' && vistaActual === 'usuarios' && (
            <VistaUsuarios />
          )}

        </section>
      </main>

    </div>
  );
}

export default App;