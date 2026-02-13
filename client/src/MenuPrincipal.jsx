import React from 'react';
import { FaFileContract, FaBalanceScale, FaUserTie, FaArchive } from 'react-icons/fa';
import './estilos/MenuPrincipal.css'; // Asegúrate de tener el CSS que te pasé antes

function MenuPrincipal({ onSeleccionar, onLogout, usuario }) {
  return (
    <div className="menu-container">
      <div className="menu-header">
        <h2>Bienvenido, <span>{usuario}</span></h2>
        <button onClick={onLogout} className="btn-logout-menu">Cerrar Sesión</button>
      </div>

      <div className="menu-content">
        <h1 className="menu-title">Seleccione el Tipo de Expediente</h1>
        
        <div className="cards-grid">
          <div className="card-menu" onClick={() => onSeleccionar("Expediente Administrativo y Notarial")}>
            <div className="icon-circle"><FaFileContract /></div>
            <h3>Expediente Administrativo y Notarial</h3>
            <p>Gestión de trámites administrativos y procesos notariales.</p>
          </div>

          <div className="card-menu" onClick={() => onSeleccionar("Expediente Judicial")}>
            <div className="icon-circle"><FaBalanceScale /></div>
            <h3>Expediente Judicial</h3>
            <p>Procesos judiciales en trámite ante órganos jurisdiccionales.</p>
          </div>

          <div className="card-menu" onClick={() => onSeleccionar("Expediente por encargo")}>
            <div className="icon-circle"><FaUserTie /></div>
            <h3>Expediente por Encargo</h3>
            <p>Casos asumidos por representación o encargo específico.</p>
          </div>

          <div className="card-menu" onClick={() => onSeleccionar("Expedientes archivados")}>
            <div className="icon-circle"><FaArchive /></div>
            <h3>Expediente Archivado</h3>
            <p>Expedientes concluidos y almacenados en archivo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MenuPrincipal;