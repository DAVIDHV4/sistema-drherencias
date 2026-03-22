import { useEffect, useState } from 'react';
import axios from 'axios';
import { FaPlus, FaSignOutAlt, FaHome, FaVideo, FaBell, FaChevronLeft, FaChevronRight, FaTimes, FaEdit, FaTrash } from 'react-icons/fa';
import Swal from 'sweetalert2';
import './estilos/VistaExpedientes.css'; 

function VistaCitas({ usuario, onLogout, onVolver }) {
  const [citas, setCitas] = useState([]);
  const [mesActual, setMesActual] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [mostrarModalDia, setMostrarModalDia] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [citaEditandoId, setCitaEditandoId] = useState(null);
  const [form, setForm] = useState({ fecha: '', hora: '', solicitante: '', motivo: '', generarMeet: false });

  const cargarCitas = async () => {
    try {
      const res = await axios.get('/api/citas');
      setCitas(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarCitas();
  }, []);

  const cambiarMes = (offset) => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + offset, 1));
  };

  const abrirDia = (fechaStr) => {
    setDiaSeleccionado(fechaStr);
    setMostrarModalDia(true);
  };

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return '';
    return fechaISO.split('T')[0];
  };

  const abrirNuevoFormulario = () => {
    setForm({ fecha: diaSeleccionado, hora: '', solicitante: '', motivo: '', generarMeet: false });
    setCitaEditandoId(null);
    setMostrarModalDia(false);
    setMostrarFormulario(true);
  };

  const handleEditarCita = (cita) => {
    setForm({ fecha: formatearFecha(cita.fecha), hora: cita.hora, solicitante: cita.solicitante, motivo: cita.motivo, generarMeet: !!cita.enlace_meet });
    setCitaEditandoId(cita.id);
    setMostrarModalDia(false);
    setMostrarFormulario(true);
  };

  const handleEliminarCita = async (id) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar cita?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      try {
        await axios.delete(`/api/citas/${id}`);
        Swal.fire('Eliminada', 'La cita ha sido borrada.', 'success');
        cargarCitas();
      } catch (error) {
        Swal.fire('Error', 'No se pudo eliminar la cita.', 'error');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      
      if (citaEditandoId) {
        await axios.put(`/api/citas/${citaEditandoId}`, form);
        Swal.fire('¡Éxito!', 'Cita actualizada correctamente.', 'success');
      } else {
        await axios.post('/api/citas', form);
        Swal.fire('¡Éxito!', form.generarMeet ? 'Cita agendada y sala de Meet creada' : 'Recordatorio agendado', 'success');
      }

      setMostrarFormulario(false);
      setCitaEditandoId(null);
      cargarCitas();
      setMostrarModalDia(true); 
    } catch (error) {
      Swal.fire('Error', 'No se pudo guardar la cita.', 'error');
    }
  };

  const renderizarCalendario = () => {
    const year = mesActual.getFullYear();
    const month = mesActual.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dias = [];

    for (let i = 0; i < firstDayIndex; i++) {
      dias.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      dias.push(i);
    }

    const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    return (
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={() => cambiarMes(-1)} style={{ padding: '10px', border: 'none', background: '#f0f0f0', borderRadius: '8px', cursor: 'pointer' }}><FaChevronLeft /></button>
          <h2 style={{ margin: 0, color: '#333' }}>{mesesNombres[month]} {year}</h2>
          <button onClick={() => cambiarMes(1)} style={{ padding: '10px', border: 'none', background: '#f0f0f0', borderRadius: '8px', cursor: 'pointer' }}><FaChevronRight /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', textAlign: 'center' }}>
          {diasSemana.map(d => <div key={d} style={{ fontWeight: 'bold', color: '#666', paddingBottom: '10px' }}>{d}</div>)}
          
          {dias.map((dia, index) => {
            if (!dia) return <div key={`empty-${index}`} style={{ minHeight: '100px', background: '#f9f9f9', borderRadius: '8px' }}></div>;
            
            const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const citasDelDia = citas.filter(c => c.fecha && c.fecha.startsWith(fechaStr));

            return (
              <div 
                key={dia} 
                onClick={() => abrirDia(fechaStr)}
                style={{ minHeight: '100px', border: '1px solid #eee', borderRadius: '8px', padding: '10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', background: 'white', transition: '0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3699ff'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#eee'}
              >
                <span style={{ fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>{dia}</span>
                {citasDelDia.length > 0 && (
                  <span style={{ background: '#3699ff', color: 'white', fontSize: '12px', padding: '2px 6px', borderRadius: '4px', width: '100%', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {citasDelDia.length} cita(s)
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const citasSeleccionadas = citas.filter(c => c.fecha && c.fecha.startsWith(diaSeleccionado));

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

      <div className="vista-content" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="vista-header-row">
          <h2>Calendario de Citas y Reuniones</h2>
        </div>
        
        {renderizarCalendario()}
      </div>

      {mostrarModalDia && (
        <div className="modal-overlay" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
          <div className="modal-content" style={{backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2 style={{margin: 0, color: '#333'}}>Citas del {diaSeleccionado}</h2>
              <button onClick={() => setMostrarModalDia(false)} style={{background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999'}}><FaTimes /></button>
            </div>

            {citasSeleccionadas.length === 0 ? (
              <p style={{color: '#666', textAlign: 'center', padding: '20px 0'}}>No hay nada agendado para este día.</p>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px'}}>
                {citasSeleccionadas.map(cita => (
                  <div key={cita.id} style={{padding: '15px', border: '1px solid #eee', borderRadius: '8px', background: '#fcfcfc', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{flex: 1}}>
                      <div style={{fontWeight: 'bold', color: '#333', fontSize: '16px'}}>{cita.hora} - {cita.solicitante}</div>
                      <div style={{color: '#666', fontSize: '14px', marginTop: '4px', marginBottom: '10px'}}>{cita.motivo}</div>
                      <div style={{display: 'flex', gap: '8px'}}>
                        <button onClick={() => handleEditarCita(cita)} style={{padding: '6px 10px', background: '#f0ad4e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px'}}><FaEdit /> Editar</button>
                        <button onClick={() => handleEliminarCita(cita.id)} style={{padding: '6px 10px', background: '#d9534f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px'}}><FaTrash /> Borrar</button>
                      </div>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px'}}>
                      {cita.enlace_meet ? (
                        <a href={cita.enlace_meet} target="_blank" rel="noopener noreferrer" style={{display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', backgroundColor: '#00796b', color: 'white', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px'}}>
                          <FaVideo /> Unirse
                        </a>
                      ) : (
                        <span style={{display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', backgroundColor: '#f0ad4e', color: 'white', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px'}}>
                          <FaBell /> Recordatorio
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={abrirNuevoFormulario} style={{width: '100%', padding: '12px', border: 'none', background: '#3699ff', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'}}>
              <FaPlus /> Agendar Nueva Cita
            </button>
          </div>
        </div>
      )}

      {mostrarFormulario && (
        <div className="modal-overlay" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100}}>
          <div className="modal-content" style={{backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '500px'}}>
            <h2 style={{marginTop: 0, marginBottom: '20px', color: '#333'}}>
              {citaEditandoId ? 'Editar Cita' : 'Nueva Cita'}
            </h2>
            <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555'}}>Fecha</label>
                <input type="date" required value={form.fecha} disabled style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'inherit', backgroundColor: '#e9ecef', color: '#666', cursor: 'not-allowed'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555'}}>Hora</label>
                <input type="time" required value={form.hora} onChange={e => setForm({...form, hora: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'inherit'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555'}}>Solicitante / Cliente</label>
                <input type="text" required placeholder="Nombre de la persona" value={form.solicitante} onChange={e => setForm({...form, solicitante: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'inherit'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555'}}>Motivo</label>
                <textarea required placeholder="Detalles o tema a tratar..." value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical'}}></textarea>
              </div>
              
              {!citaEditandoId && (
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #ddd'}}>
                  <input type="checkbox" id="generarMeet" checked={form.generarMeet} onChange={e => setForm({...form, generarMeet: e.target.checked})} style={{width: '20px', height: '20px', cursor: 'pointer'}} />
                  <label htmlFor="generarMeet" style={{fontWeight: 'bold', color: '#333', cursor: 'pointer', margin: 0}}>Generar enlace de videollamada (Meet)</label>
                </div>
              )}

              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px'}}>
                <button type="button" onClick={() => { setMostrarFormulario(false); setMostrarModalDia(true); }} style={{padding: '10px 20px', border: 'none', background: '#e0e0e0', color: '#333', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'}}>Cancelar</button>
                <button type="submit" style={{padding: '10px 20px', border: 'none', background: '#3699ff', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'}}>
                  {citaEditandoId ? 'Actualizar Cita' : (form.generarMeet ? 'Generar Meet' : 'Guardar Cita')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default VistaCitas;