import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  FaFilePdf, FaPlus, FaSignOutAlt, FaEdit, FaSearch, 
  FaBalanceScale, FaGavel, FaArchive, FaUserTie, FaBars, FaHome 
} from 'react-icons/fa';
import FormularioExpediente from './FormularioExpediente';
import './estilos/Dashboard.css'; 

function Dashboard({ usuario, onLogout, opcionInicial, onVolverMenu }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Inicializamos el menú con lo que eligió en la pantalla anterior
  const [opcionMenu, setOpcionMenu] = useState(opcionInicial || "Expediente Administrativo y Notarial");
  
  const [expedientes, setExpedientes] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState("Familia civil"); 
  const [busqueda, setBusqueda] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [expedienteAEditar, setExpedienteAEditar] = useState(null);

  // EFECTO DE INICIALIZACIÓN: Configura el filtro correcto al entrar
  useEffect(() => {
    if (opcionInicial) {
        setOpcionMenu(opcionInicial);
        // Si entra a Administrativo, por defecto ponemos Familia civil.
        // Si entra a Judicial, el filtro es Judicial, etc.
        if (opcionInicial === "Expediente Judicial") setFiltroCategoria("Judicial");
        else if (opcionInicial === "Expediente por encargo") setFiltroCategoria("Por Encargo");
        else if (opcionInicial === "Expedientes archivados") setFiltroCategoria("Archivado");
        else setFiltroCategoria("Familia civil"); // Default para administrativo
    }
  }, [opcionInicial]);

  const cargarExpedientes = async () => {
    try {
      let categoriaParaBuscar = filtroCategoria;
      // Re-confirmación de filtros por seguridad
      if (opcionMenu === "Expediente Judicial") categoriaParaBuscar = "Judicial";
      if (opcionMenu === "Expediente por encargo") categoriaParaBuscar = "Por Encargo";
      if (opcionMenu === "Expedientes archivados") categoriaParaBuscar = "Archivado";

      const res = await axios.get('http://localhost:4000/api/expedientes', {
        params: { busqueda, categoria: categoriaParaBuscar }
      });
      setExpedientes(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarExpedientes();
  }, [filtroCategoria, busqueda, opcionMenu]);

  const handleNuevo = () => { setExpedienteAEditar(null); setMostrarFormulario(true); };
  const handleEditar = (expediente) => { setExpedienteAEditar(expediente); setMostrarFormulario(true); };
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="dashboard-container">
      
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="brand">
          <div className="brand-logo-container">
             <FaGavel style={{ color: '#3699ff', fontSize: '22px' }} />
             <span className="brand-text">DR. HERENCIAS</span>
          </div>
          <button className="btn-toggle-menu" onClick={toggleSidebar}>
            <FaBars />
          </button>
        </div>
        
        <ul className="sidebar-menu">
            <li className={`menu-item ${opcionMenu === "Expediente Administrativo y Notarial" ? 'active' : ''}`} 
                onClick={() => { setOpcionMenu("Expediente Administrativo y Notarial"); setFiltroCategoria("Familia civil"); }}
                title="Administrativo y Notarial"
            >
              <FaBalanceScale className="menu-icon" /> 
              <span className="menu-text">Administrativo y Notarial</span>
            </li>

            <li className={`menu-item ${opcionMenu === "Expediente Judicial" ? 'active' : ''}`} 
                onClick={() => { setOpcionMenu("Expediente Judicial"); setFiltroCategoria("Judicial"); }}
                title="Expediente Judicial"
            >
              <FaGavel className="menu-icon" /> 
              <span className="menu-text">Expediente Judicial</span>
            </li>

            <li className={`menu-item ${opcionMenu === "Expediente por encargo" ? 'active' : ''}`} 
                onClick={() => { setOpcionMenu("Expediente por encargo"); setFiltroCategoria("Por Encargo"); }}
                title="Expediente por encargo"
            >
              <FaUserTie className="menu-icon" /> 
              <span className="menu-text">Expediente por encargo</span>
            </li>

            <li className={`menu-item ${opcionMenu === "Expedientes archivados" ? 'active' : ''}`} 
                onClick={() => { setOpcionMenu("Expedientes archivados"); setFiltroCategoria("Archivado"); }}
                title="Expedientes archivados"
            >
              <FaArchive className="menu-icon" /> 
              <span className="menu-text">Expedientes archivados</span>
            </li>
        </ul>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
             {/* BOTÓN PARA VOLVER AL MENÚ DE TARJETAS */}
             <button onClick={onVolverMenu} style={{background:'none', border:'none', cursor:'pointer', color:'#a2a3b7', fontSize:'18px'}} title="Volver al Menú Principal">
                <FaHome />
             </button>
             <div className="user-info">Bienvenido, <span>{usuario}</span></div>
          </div>
          <button onClick={onLogout} className="btn-logout">Salir <FaSignOutAlt /></button>
        </header>

        <div className="content-area">
          <div className="header-container">
            <div style={{flex: 1}}>
              <h2 className="page-title">{opcionMenu}</h2>
              
              {opcionMenu === "Expediente Administrativo y Notarial" && (
                <div className="tabs-group" style={{flexWrap: 'wrap', marginTop: '10px'}}>
                  <button className={`tab-btn ${filtroCategoria === "Familia civil" ? 'active' : ''}`} onClick={() => setFiltroCategoria("Familia civil")}>1) Familia civil</button>
                  <button className={`tab-btn ${filtroCategoria === "Civil" ? 'active' : ''}`} onClick={() => setFiltroCategoria("Civil")}>2) Civil</button>
                  <button className={`tab-btn ${filtroCategoria === "Contecioso Administrativo" ? 'active' : ''}`} onClick={() => setFiltroCategoria("Contecioso Administrativo")}>3) Contecioso Admin.</button>
                  <button className={`tab-btn ${filtroCategoria === "Penal" ? 'active' : ''}`} onClick={() => setFiltroCategoria("Penal")}>4) Penal</button>
                  <button className={`tab-btn ${filtroCategoria === "Fiscalias de prevencion de delito sjl" ? 'active' : ''}`} onClick={() => setFiltroCategoria("Fiscalias de prevencion de delito sjl")}>5) Fiscalías SJL</button>
                </div>
              )}
            </div>

            <div className="search-container" style={{alignSelf: 'flex-start', marginTop: '10px'}}>
               <div className="search-input-wrapper">
                 <FaSearch className="search-icon-input" />
                 <input type="text" placeholder="Buscar..." className="search-input" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
               </div>
               <button className="btn-nuevo" onClick={handleNuevo}><FaPlus /> Nuevo</button>
            </div>
          </div>

          <div className="table-card">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nro. Exp</th>
                  <th>Demandante (Cliente)</th>
                  <th>DNI</th>
                  <th>Demandado / Caso</th>
                  <th>Juzgado</th>
                  <th style={{textAlign: 'center'}}>Expediente Digital</th>
                  <th style={{textAlign: 'right'}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {expedientes.length === 0 ? (
                  <tr><td colSpan="7" className="no-data">No hay expedientes en: <strong>{filtroCategoria}</strong>.</td></tr>
                ) : (
                  expedientes.map((exp) => (
                    <tr key={exp.nro_expediente}>
                      <td style={{fontWeight: 'bold'}}>{exp.nro_expediente}</td>
                      <td><div style={{fontWeight: 'bold', color: '#181c32'}}>{exp.demandante}</div></td>
                      <td>{exp.dni_demandante}</td>
                      <td>{exp.demandado}</td>
                      <td>{exp.juzgado}</td>
                      <td style={{textAlign: 'center'}}>
                         {exp.archivo_url ? (
                           <a href={`http://localhost:4000${exp.archivo_url}`} target="_blank" rel="noopener noreferrer" style={{display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: '#ffe2e5', color: '#f64e60', padding: '6px 12px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold', fontSize: '12px'}}>
                             <FaFilePdf size={14}/> Ver PDF
                           </a>
                         ) : <span style={{color: '#b5b5c3', fontSize: '12px'}}>Sin adjunto</span>}
                      </td>
                      <td style={{textAlign: 'right'}}>
                        <button onClick={() => handleEditar(exp)} className="action-btn"><FaEdit size={16} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {mostrarFormulario && (
        <FormularioExpediente 
          onClose={() => setMostrarFormulario(false)} 
          onGuardarExitoso={cargarExpedientes}
          expedienteAEditar={expedienteAEditar}
          categoriaPreseleccionada={filtroCategoria} 
        />
      )}
    </div>
  );
}

export default Dashboard;