import { useEffect, useState } from 'react';
import axios from 'axios';
import { FaFilePdf, FaPlus, FaSignOutAlt, FaEdit, FaSearch, FaHome } from 'react-icons/fa';
import FormularioExpediente from './FormularioExpediente';
import './estilos/VistaExpedientes.css'; 

function VistaExpedientes({ usuario, categoriaPrincipal, onLogout, onVolver }) {
  
  const [expedientes, setExpedientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [subCategoria, setSubCategoria] = useState(""); 
  
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [expedienteAEditar, setExpedienteAEditar] = useState(null);

  useEffect(() => {
    if (categoriaPrincipal === "Expediente Administrativo y Notarial") {
        setSubCategoria("Familia civil");
    } else if (categoriaPrincipal === "Expediente Judicial") {
        setSubCategoria("Judicial");
    } else if (categoriaPrincipal === "Expediente por encargo") {
        setSubCategoria("Por Encargo");
    } else if (categoriaPrincipal === "Expedientes archivados") {
        setSubCategoria("Archivado");
    }
  }, [categoriaPrincipal]);

  const cargarExpedientes = async () => {
    try {
      if (!subCategoria) return;

      const res = await axios.get('http://localhost:4000/api/expedientes', {
        params: { busqueda, categoria: subCategoria }
      });
      setExpedientes(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarExpedientes();
  }, [subCategoria, busqueda]);

  const handleNuevo = () => { setExpedienteAEditar(null); setMostrarFormulario(true); };
  const handleEditar = (expediente) => { setExpedienteAEditar(expediente); setMostrarFormulario(true); };

  return (
    <div className="vista-container">
      
      <header className="vista-topbar">
        <div className="topbar-left">
            <button onClick={onVolver} className="btn-home" style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', border: 'none', background: 'transparent', fontSize: '16px', color: '#555', fontWeight: 'bold'}}>
                <FaHome size={20} color="#3699ff"/> Menú Principal
            </button>
        </div>
        
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
            <div className="vista-user">Bienvenido, <span>{usuario}</span></div>
            <button onClick={onLogout} className="vista-logout">Salir <FaSignOutAlt /></button>
        </div>
      </header>

      <div className="vista-content">
        
        <div className="vista-header-row">
            <h2>{categoriaPrincipal}</h2>
            
            <div className="vista-actions">
                <div className="vista-search">
                    <FaSearch className="icon-search"/>
                    <input 
                        type="text" 
                        placeholder="Buscar..." 
                        value={busqueda} 
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <button className="vista-btn-nuevo" onClick={handleNuevo}>
                    <FaPlus /> Nuevo
                </button>
            </div>
        </div>

        {categoriaPrincipal === "Expediente Administrativo y Notarial" && (
            <div className="vista-tabs">
                <button className={`v-tab ${subCategoria === "Familia civil" ? 'active' : ''}`} onClick={() => setSubCategoria("Familia civil")}>Familia civil</button>
                <button className={`v-tab ${subCategoria === "Civil" ? 'active' : ''}`} onClick={() => setSubCategoria("Civil")}>Civil</button>
                <button className={`v-tab ${subCategoria === "Contecioso Administrativo" ? 'active' : ''}`} onClick={() => setSubCategoria("Contecioso Administrativo")}>Contecioso Admin.</button>
                <button className={`v-tab ${subCategoria === "Penal" ? 'active' : ''}`} onClick={() => setSubCategoria("Penal")}>Penal</button>
                <button className={`v-tab ${subCategoria === "Fiscalias de prevencion de delito sjl" ? 'active' : ''}`} onClick={() => setSubCategoria("Fiscalias de prevencion de delito sjl")}>Fiscalías SJL</button>
            </div>
        )}

        <div className="vista-table-card">
            <table className="vista-table">
                <thead>
                    <tr>
                        <th>NRO. EXP</th>
                        <th>DEMANDANTE (CLIENTE)</th>
                        <th>DNI</th>
                        <th>DEMANDADO / CASO</th>
                        <th>JUZGADO</th>
                        <th style={{textAlign: 'center'}}>EXPEDIENTE DIGITAL</th>
                        <th style={{textAlign: 'right'}}>ACCIONES</th>
                    </tr>
                </thead>
                <tbody>
                    {expedientes.length === 0 ? (
                        <tr><td colSpan="7" className="v-no-data">No hay expedientes en: <strong>{subCategoria}</strong>.</td></tr>
                    ) : (
                        expedientes.map((exp) => (
                            <tr key={exp.nro_expediente}>
                                <td style={{fontWeight: 'bold'}}>{exp.nro_expediente}</td>
                                <td style={{fontWeight: 'bold', color: '#1e1e2d'}}>{exp.demandante}</td>
                                <td>{exp.dni_demandante}</td>
                                <td>{exp.demandado}</td>
                                <td>{exp.juzgado}</td>
                                <td style={{textAlign: 'center'}}>
                                    {exp.archivo_url ? (
                                        <a href={`http://localhost:4000${exp.archivo_url}`} target="_blank" rel="noopener noreferrer" className="btn-ver-pdf">
                                            <FaFilePdf /> Ver PDF
                                        </a>
                                    ) : <span className="no-pdf">Sin archivo</span>}
                                </td>
                                <td style={{textAlign: 'right'}}>
                                    <button onClick={() => handleEditar(exp)} className="v-btn-edit"><FaEdit /></button>
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
          categoriaPreseleccionada={subCategoria}
        />
      )}
    </div>
  );
}

export default VistaExpedientes;