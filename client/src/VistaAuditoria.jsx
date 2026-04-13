import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaSearch, FaHistory, FaCalendarAlt } from 'react-icons/fa';

function VistaAuditoria({ irAExpediente }) {
  const fechaActual = new Date();
  const mesAnioActual = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;

  const [historial, setHistorial] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mesFiltro, setMesFiltro] = useState(mesAnioActual);

  useEffect(() => {
    cargarAuditoria();
  }, [mesFiltro]);

  const cargarAuditoria = async () => {
    try {
      const [anio, mes] = mesFiltro.split('-');
      const res = await axios.get(`/api/auditoria?mes=${mes}&anio=${anio}`);
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

  const formatearMesTexto = (mesAnio) => {
    if (!mesAnio) return '';
    const [anio, mes] = mesAnio.split('-');
    const date = new Date(anio, parseInt(mes) - 1, 1);
    return date.toLocaleString('es-PE', { month: 'long', year: 'numeric' }).toUpperCase();
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
            <div>
              <h2 style={{ margin: 0 }}> {formatearMesTexto(mesFiltro)}</h2>
              <span style={{ fontSize: '13px', color: '#888' }}>Expedientes del mes</span>
            </div>
          </div>
          <div className="vista-actions" style={{ display: 'flex', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '0 10px' }}>
              <FaCalendarAlt color="#888" style={{ marginRight: '8px' }} />
              <input 
                type="month" 
                value={mesFiltro}
                onChange={(e) => setMesFiltro(e.target.value)}
                style={{ border: 'none', outline: 'none', padding: '8px 0', color: '#333', fontWeight: 'bold', cursor: 'pointer' }}
              />
            </div>
            <div className="vista-search">
              <FaSearch className="icon-search" />
              <input 
                type="text" 
                placeholder="Buscar Nro Expediente o Usuario..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ width: '250px' }}
              />
            </div>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          <div className="vista-table-card-completa" style={{ overflowX: 'auto', border: '1px solid var(--borde-suave)', borderRadius: '8px' }}>
            <table className="vista-table vista-table-completa">
              <thead>
                <tr>
                  <th>ÚLTIMA INTERACCIÓN</th>
                  <th>USUARIO</th>
                  <th>NRO. EXPEDIENTE</th>
                  <th>DETALLE DEL CAMBIO</th>
                  <th>IP / DISPOSITIVO</th>
                </tr>
              </thead>
              <tbody>
                {historialFiltrado.map(h => (
                  <tr 
                    key={h.id} 
                    onClick={() => handleFilaClick(h.registro_afectado)}
                    style={{ cursor: 'pointer' }}
                    title="Haz clic para ir a este expediente"
                  >
                    <td style={{ fontSize: '13px', color: '#555', whiteSpace: 'nowrap', fontWeight: 'bold' }}>{formatearFecha(h.fecha_hora)}</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--color-primario)' }}>{h.usuario_login}</td>
                    <td style={{ fontWeight: 'bold', color: '#333' }}>{h.registro_afectado}</td>
                    <td style={{ fontSize: '13px', color: '#444' }}>{h.detalle}</td>
                    <td style={{ fontSize: '11px', color: '#999', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h.dispositivo}>
                      <strong>IP:</strong> {h.ip_cliente}<br/>
                      {h.dispositivo?.split(' ')[0]}
                    </td>
                  </tr>
                ))}
                {historialFiltrado.length === 0 && (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>No hubo interacciones con expedientes en este mes.</td></tr>
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