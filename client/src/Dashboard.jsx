import { useEffect, useState } from 'react';
import axios from 'axios';
import { FaFilePdf, FaPlus, FaUserCircle, FaSignOutAlt, FaEdit, FaSearch } from 'react-icons/fa';
import FormularioExpediente from './FormularioExpediente';
import './estilos/Dashboard.css';

function Dashboard({ usuario, onLogout }) {
  const [expedientes, setExpedientes] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [expedienteAEditar, setExpedienteAEditar] = useState(null);
  
  // NUEVO: Estado para el texto de búsqueda
  const [busqueda, setBusqueda] = useState("");

  const cargarExpedientes = async () => {
    try {
      const res = await axios.get('/api/expedientes');
      setExpedientes(res.data);
    } catch (error) {
      console.error("Error cargando datos", error);
    }
  };

  useEffect(() => {
    cargarExpedientes();
  }, []);

  const handleNuevo = () => {
      setExpedienteAEditar(null);
      setMostrarFormulario(true);
  };

  const handleEditar = (expediente) => {
      setExpedienteAEditar(expediente);
      setMostrarFormulario(true);
  };

  // LÓGICA DE FILTRADO
  // Filtramos la lista original 'expedientes' basándonos en lo que escriba el usuario
  const expedientesFiltrados = expedientes.filter((exp) => {
    const texto = busqueda.toLowerCase();
    
    // Verificamos si coincide con alguno de los 3 criterios
    const coincideID = exp.id.toString().includes(texto);
    const coincideCliente = exp.cliente && exp.cliente.toLowerCase().includes(texto);
    const coincideExpediente = exp.numero_expediente && exp.numero_expediente.toLowerCase().includes(texto);

    return coincideID || coincideCliente || coincideExpediente;
  });

  return (
    <div className="dashboard-layout">
      
      {/* 1. TOP BAR */}
      <nav className="top-navbar">
        <div className="brand-area">
          <h1>SISTEMA LEGAL</h1>
        </div>
        <div className="user-area">
          <span>{usuario}</span>
          <FaUserCircle size={20} />
          <button onClick={onLogout} className="btn-logout" title="Salir">
            <FaSignOutAlt />
          </button>
        </div>
      </nav>

      {/* 2. TOOLBAR (CON BÚSQUEDA) */}
      <div className="toolbar-container">
        <div className="toolbar-content">
          <h2 className="page-title">Expedientes</h2>
          
          <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
            
            {/* BARRA DE BÚSQUEDA NUEVA */}
            <div className="search-box">
              <FaSearch className="search-icon"/>
              <input 
                type="text" 
                placeholder="Buscar por Cliente, ID o Expediente..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <button 
              className="btn-nuevo" 
              onClick={handleNuevo}
            >
              <FaPlus /> Nuevo
            </button>
          </div>

        </div>
      </div>

      {/* 3. CONTENIDO PRINCIPAL */}
      <div className="main-content">
        
        <div className="card-table">
          <table className="pro-table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Cliente</th>
                <th>DNI/RUC</th>
                <th>Caso</th>
                <th>Estado</th>
                <th>Expediente</th>
                <th style={{textAlign: 'center'}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {expedientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{padding: '30px', textAlign: 'center', color: '#999'}}>
                    {busqueda ? 'No se encontraron resultados para tu búsqueda.' : 'No hay registros. Crea el primero con el botón "Nuevo".'}
                  </td>
                </tr>
              ) : (
                expedientesFiltrados.map((exp) => (
                  <tr key={exp.id}>
                    <td style={{fontWeight: 'bold'}}>{exp.id}</td>
                    <td>
                      <div className="client-name">{exp.cliente}</div>
                      <small className="client-sub">{exp.direccion_cliente}</small>
                    </td>
                    <td>{exp.dni_cliente}</td>
                    <td>
                      <span className="badge-category">{exp.categoria}</span>
                      <div className="case-name">{exp.caso}</div>
                    </td>
                    <td>
                      <span className={`status-pill status-${exp.estado ? exp.estado.toLowerCase().replace(' ', '') : ''}`}>
                        {exp.estado}
                      </span>
                    </td>
                    <td style={{fontFamily: 'monospace'}}>{exp.numero_expediente}</td>
                    
                    <td style={{textAlign: 'center'}}>
                      <div style={{display: 'flex', justifyContent: 'center', gap: '15px'}}>
                        
                        <button 
                            onClick={() => handleEditar(exp)}
                            style={{background: 'none', border: 'none', cursor: 'pointer', color: '#004e8e'}}
                            title="Editar Expediente"
                        >
                            <FaEdit size={18} />
                        </button>

                        {exp.archivos ? (
                          <a 
                            href={exp.archivos} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn-icon-pdf"
                            title="Ver PDF"
                          >
                            <FaFilePdf />
                          </a>
                        ) : (
                            <span style={{color: '#ccc', fontSize: '18px'}} title="Sin archivo">
                                <FaFilePdf />
                            </span>
                        )}

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mostrarFormulario && (
        <FormularioExpediente 
          onClose={() => setMostrarFormulario(false)} 
          onGuardarExitoso={cargarExpedientes}
          expedienteAEditar={expedienteAEditar} 
        />
      )}
    </div>
  );
}

export default Dashboard;