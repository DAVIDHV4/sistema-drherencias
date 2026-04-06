import { useState } from 'react';
import { FaCalendarAlt, FaCalendarDay, FaFileDownload } from 'react-icons/fa';
import Swal from 'sweetalert2';
import axios from 'axios';

function VistaReportes() {
  const [tipoFiltro, setTipoFiltro] = useState('mes'); 
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const handleGenerarReporte = async () => {
    let urlInicio = fechaInicio;
    let urlFin = fechaFin;

    if (tipoFiltro === 'mes') {
      const hoy = new Date();
      const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      
      urlInicio = primerDia.toLocaleDateString('en-CA'); 
      urlFin = ultimoDia.toLocaleDateString('en-CA');
    } else {
      if (!fechaInicio || !fechaFin) {
        Swal.fire({
          icon: 'warning',
          title: 'Faltan fechas',
          text: 'Por favor, selecciona la fecha de inicio y la fecha de fin.',
          confirmButtonColor: 'var(--color-alerta)'
        });
        return;
      }
    }

    Swal.fire({ title: 'Generando Reporte...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const res = await axios.get('/api/reportes/asistencias', {
        params: { fechaInicio: urlInicio, fechaFin: urlFin },
        responseType: 'blob' 
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Reporte_Asistencias_${urlInicio}_al_${urlFin}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      Swal.close();
    } catch (error) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Error del servidor', 
        text: 'No se pudo generar el reporte. Verifica que tu backend esté encendido.',
        confirmButtonColor: 'var(--color-peligro)'
      });
    }
  };

  return (
    <div className="vista-container vista-container-completa">
      <div className="vista-content">
        <div className="vista-header-row vista-header-row-completa">
          <h2>Reporte de Horarios y Asistencias</h2>
        </div>

        <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ color: 'var(--texto-secundario)', marginBottom: '30px', fontSize: '15px' }}>
            Selecciona el periodo del cual deseas extraer el reporte de asistencias registradas mediante código QR.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div 
              onClick={() => setTipoFiltro('mes')}
              style={{ 
                border: `2px solid ${tipoFiltro === 'mes' ? 'var(--color-primario)' : 'var(--borde-suave)'}`,
                borderRadius: '12px', padding: '25px', cursor: 'pointer',
                backgroundColor: tipoFiltro === 'mes' ? 'rgba(25, 66, 118, 0.05)' : 'var(--fondo-tarjetas)',
                transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
              }}
            >
              <FaCalendarAlt size={40} color={tipoFiltro === 'mes' ? 'var(--color-primario)' : 'var(--texto-secundario)'} style={{ marginBottom: '15px' }} />
              <h3 style={{ margin: '0 0 10px 0', color: tipoFiltro === 'mes' ? 'var(--color-primario)' : 'var(--texto-principal)' }}>Mes Actual</h3>
              <p style={{ margin: 0, color: 'var(--texto-secundario)', fontSize: '13px' }}>Genera un reporte rápido de todo el mes en curso.</p>
            </div>

            <div 
              onClick={() => setTipoFiltro('rango')}
              style={{ 
                border: `2px solid ${tipoFiltro === 'rango' ? 'var(--color-primario)' : 'var(--borde-suave)'}`,
                borderRadius: '12px', padding: '25px', cursor: 'pointer',
                backgroundColor: tipoFiltro === 'rango' ? 'rgba(25, 66, 118, 0.05)' : 'var(--fondo-tarjetas)',
                transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
              }}
            >
              <FaCalendarDay size={40} color={tipoFiltro === 'rango' ? 'var(--color-primario)' : 'var(--texto-secundario)'} style={{ marginBottom: '15px' }} />
              <h3 style={{ margin: '0 0 10px 0', color: tipoFiltro === 'rango' ? 'var(--color-primario)' : 'var(--texto-principal)' }}>Rango Personalizado</h3>
              <p style={{ margin: 0, color: 'var(--texto-secundario)', fontSize: '13px' }}>Elige una fecha de inicio y una fecha de fin específica.</p>
            </div>
          </div>

          {tipoFiltro === 'rango' && (
            <div style={{ background: 'var(--fondo-principal)', padding: '20px', borderRadius: '12px', marginBottom: '30px', border: '1px solid var(--borde-suave)', display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--texto-secundario)' }}>Fecha de Inicio</label>
                <input 
                  type="date" 
                  value={fechaInicio} 
                  onChange={(e) => setFechaInicio(e.target.value)}
                  style={{ padding: '12px', border: '1px solid var(--borde-suave)', borderRadius: '8px', fontFamily: 'inherit', color: 'var(--texto-principal)', outline: 'none' }}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--texto-secundario)' }}>Fecha de Fin</label>
                <input 
                  type="date" 
                  value={fechaFin} 
                  onChange={(e) => setFechaFin(e.target.value)}
                  style={{ padding: '12px', border: '1px solid var(--borde-suave)', borderRadius: '8px', fontFamily: 'inherit', color: 'var(--texto-principal)', outline: 'none' }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--borde-suave)', paddingTop: '20px' }}>
            <button 
              onClick={handleGenerarReporte}
              style={{ 
                backgroundColor: 'var(--color-exito)', color: 'white', border: 'none', padding: '12px 25px', 
                borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' 
              }}
            >
              <FaFileDownload size={18} /> Generar Reporte Excel
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default VistaReportes;