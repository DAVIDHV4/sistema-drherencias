import React, { useState } from 'react';
import { FaFileContract, FaBalanceScale, FaUserTie, FaArchive, FaSearch } from 'react-icons/fa';
import axios from 'axios';
import './estilos/MenuPrincipal.css';

function MenuPrincipal({ onSeleccionar, onLogout, usuario }) {
  const [busquedaGlobal, setBusquedaGlobal] = useState("");
  const [resultados, setResultados] = useState([]);

  const handleBuscar = async (e) => {
    e.preventDefault();
    if (!busquedaGlobal.trim()) return setResultados([]);
    try {
      const res = await axios.get(`/api/expedientes/buscar-global?query=${busquedaGlobal}`);
      setResultados(res.data);
    } catch (error) {
      console.error("Error buscando:", error);
    }
  };

  return (
    <div className="menu-container">
      <div className="menu-header">
        <h2>Bienvenido, <span>{usuario}</span></h2>
        <button onClick={onLogout} className="btn-logout-menu">Cerrar Sesión</button>
      </div>

      <div className="menu-content">
        <h1 className="menu-title">Buscador General de Expedientes</h1>
        
        <form onSubmit={handleBuscar} className="global-search-container" style={{maxWidth: '600px', margin: '0 auto 40px', display: 'flex', gap: '10px'}}>
          <input 
            type="text" 
            placeholder="DNI, Nro de Expediente o Nombre..." 
            value={busquedaGlobal}
            onChange={(e) => setBusquedaGlobal(e.target.value)}
            style={{flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', color: '#000'}} 
          />
          <button type="submit" style={{padding: '12px 20px', borderRadius: '8px', backgroundColor: '#3699ff', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <FaSearch /> Buscar
          </button>
        </form>

        {resultados.length > 0 && (
          <div className="quick-results" style={{backgroundColor: 'white', padding: '20px', borderRadius: '12px', marginBottom: '40px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', color: '#000'}}>
            <h3 style={{color: '#000', marginBottom: '15px'}}>Resultados Encontrados:</h3>
            <table className="vista-table" style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{backgroundColor: '#f8f9fa'}}>
                  <th style={{padding: '12px', color: '#000', borderBottom: '2px solid #eee'}}>NRO. EXP</th>
                  {/* CORRECCIÓN DE ENCABEZADO */}
                  <th style={{padding: '12px', color: '#000', borderBottom: '2px solid #eee'}}>DEMANDANTE / SOLICITANTE</th>
                  <th style={{padding: '12px', color: '#000', borderBottom: '2px solid #eee'}}>TIPO</th>
                  <th style={{padding: '12px', color: '#000', borderBottom: '2px solid #eee'}}>ACCION</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map(exp => (
                  <tr key={exp.id} style={{borderBottom: '1px solid #eee'}}>
                    <td style={{padding: '12px', color: '#000', fontWeight: 'bold'}}>{exp.nro_expediente}</td>
                    {/* CORRECCIÓN: Ahora lee 'solicitante' en lugar de 'demandante' */}
                    <td style={{padding: '12px', color: '#000'}}>{exp.solicitante}</td>
                    <td style={{padding: '12px', color: '#333', fontSize: '13px'}}>{exp.tipo_expediente}</td>
                    <td style={{padding: '12px', textAlign: 'center'}}>
                      <button 
                        onClick={() => onSeleccionar(exp.tipo_expediente, busquedaGlobal)} 
                        style={{padding: '6px 12px', backgroundColor: '#3699ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}
                      >
                        Ir a la Tabla
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button 
              onClick={() => setResultados([])} 
              style={{marginTop: '20px', background: 'none', border: 'none', color: '#d9534f', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline'}}
            >
              Limpiar resultados
            </button>
          </div>
        )}

        <h1 className="menu-title">Seleccione el Tipo de Expediente</h1>
        <div className="cards-grid">
          <div className="card-menu" onClick={() => onSeleccionar("Expediente Administrativo")}>
            <div className="icon-circle"><FaFileContract /></div>
            <h3>Expediente Administrativo</h3>
            <p>Gestión de trámites administrativos.</p>
          </div>
          <div className="card-menu" onClick={() => onSeleccionar("Expediente Notarial")}>
            <div className="icon-circle"><FaFileContract /></div>
            <h3>Expediente Notarial</h3>
            <p>Gestión de procesos notariales.</p>
          </div>
          <div className="card-menu" onClick={() => onSeleccionar("Expediente Judicial")}>
            <div className="icon-circle"><FaBalanceScale /></div>
            <h3>Expediente Judicial</h3>
            <p>Procesos judiciales en trámite.</p>
          </div>
          <div className="card-menu" onClick={() => onSeleccionar("Expediente por encargo")}>
            <div className="icon-circle"><FaUserTie /></div>
            <h3>Expediente por Encargo</h3>
            <p>Casos asumidos por representación.</p>
          </div>
          <div className="card-menu" onClick={() => onSeleccionar("Expedientes archivados")}>
            <div className="icon-circle"><FaArchive /></div>
            <h3>Expediente Archivado</h3>
            <p>Expedientes concluidos y almacenados.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MenuPrincipal;