import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaSearch, FaHistory } from 'react-icons/fa';

function VistaAuditoria({ irAExpediente }) {
  const [historial, setHistorial] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarAuditoria();
  }, []);

  const cargarAuditoria = async () => {
    try {
      const res = await axios.get('/api/auditoria');
      setHistorial(res.data);
    } catch (error) {
      Swal.fire('Error', 'No se pudo cargar el control de expedientes', 'error');
    }
  };

  const handleFilaClick = async (nro_expediente) => {
    if (!nro_expediente) return;
    try {
      Swal.fire({ title: 'Cargando expediente...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const res = await axios.get(`/api/expedientes/buscar-numero/${nro_expediente}`);
      Swal.close();
      const { tipo_expediente, categoria } = res.data;
      irAExpediente(tipo_expediente, categoria, nro_expediente);
    } catch (error) {
      Swal.fire('Atención', 'Este expediente ya no existe o fue eliminado permanentemente.', 'warning');
    }
  };

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return '';
    const date = new Date(fechaISO);
    return date.toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const getColorAccion = (accion) => {
    const colores = {
      'CREAR': 'var(--color-exito)',
      'EDITAR': '#f57c00',
      'ELIMINAR': 'var(--color-peligro)',
      'VER': '#3699ff'
    };
    return colores[accion?.toUpperCase()] || '#555';
  };

  const historialFiltrado = historial.filter(item => {
    const termino = busqueda.toLowerCase();
    return (
      (item.usuario_login && item.usuario_login.toLowerCase().includes(termino)) ||
      (item.registro_afectado && item.registro_afectado.toLowerCase().includes(termino)) ||
      (item.detalle && item.detalle.toLowerCase().includes(termino))
    );
  });

  return (
    <div className="vista-container vista-container-completa">
      <div className="vista-content">
        <div className="vista-header-row vista-header-row-completa">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaHistory size={24} color="#555" />
            <h2>Control de Expedientes</h2>
          </div>
          <div className="vista-actions">
            <div className="vista-search">
              <FaSearch className="icon-search" />
              <input 
                type="text" 
                placeholder="Buscar Nro Expediente o Usuario..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ width: '300px' }}
              />
            </div>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          <div className="vista-table-card-completa" style={{ overflowX: 'auto', border: '1px solid var(--borde-suave)', borderRadius: '8px' }}>
            <table className="vista-table vista-table-completa">
              <thead>
                <tr>
                  <th>FECHA Y HORA</th>
                  <th>USUARIO</th>
                  <th>ACCIÓN</th>
                  <th>NRO. EXPEDIENTE</th>
                  <th>DETALLE</th>
                  <th>IP / DISPOSITIVO</th>
                </tr>
              </thead>
              <tbody>
                {historialFiltrado.map(h => (
                  <tr 
                    key={h.id} 
                    onClick={() => handleFilaClick(h.registro_afectado)}
                    style={{ cursor: 'pointer' }}
                    title="Haz clic para ver este expediente"
                  >
                    <td style={{ fontSize: '13px', color: '#555', whiteSpace: 'nowrap' }}>{formatearFecha(h.fecha_hora)}</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--color-primario)' }}>{h.usuario_login}</td>
                    <td style={{ fontWeight: 'bold', fontSize: '12px', color: getColorAccion(h.accion) }}>{h.accion}</td>
                    <td style={{ fontWeight: 'bold', color: '#333' }}>{h.registro_afectado}</td>
                    <td style={{ fontSize: '13px', color: '#444' }}>{h.detalle}</td>
                    <td style={{ fontSize: '11px', color: '#999', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h.dispositivo}>
                      <strong>IP:</strong> {h.ip_cliente}<br/>
                      {h.dispositivo?.split(' ')[0]}
                    </td>
                  </tr>
                ))}
                {historialFiltrado.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>No hay registros de expedientes que coincidan con tu búsqueda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VistaAuditoria;