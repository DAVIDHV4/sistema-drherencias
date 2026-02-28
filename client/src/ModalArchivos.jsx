import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaCloudUploadAlt, FaLock, FaFileAlt, FaCheckCircle, FaTrash } from 'react-icons/fa';
import Swal from 'sweetalert2';
import './estilos/Formulario.css'; 

export default function ModalArchivos({ expediente, onClose, onGuardarExitoso }) {
  const [nuevosEditables, setNuevosEditables] = useState([]);
  const [nuevosFinales, setNuevosFinales] = useState([]);

  const [editables, setEditables] = useState([]);
  const [finales, setFinales] = useState([]);

  const recargarDatos = async () => {
    try {
      const res = await axios.get('/api/expedientes', { params: { busqueda: expediente.nro_expediente } });
      const listaExpedientes = res.data.data || res.data;
      const expActualizado = listaExpedientes.find(e => e.id === expediente.id);
      if (expActualizado) {
        try { setEditables(JSON.parse(expActualizado.archivos_editables) || []); } catch(e){}
        try { setFinales(JSON.parse(expActualizado.archivos_finales) || []); } catch(e){}
      }
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    try { setEditables(JSON.parse(expediente.archivos_editables) || []); } catch(e){}
    try { setFinales(JSON.parse(expediente.archivos_finales) || []); } catch(e){}
    recargarDatos();
  }, [expediente]);

  const handleSubirNuevos = async () => {
    if (nuevosEditables.length === 0 && nuevosFinales.length === 0) return;
    Swal.fire({ title: 'Subiendo archivos...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    const formData = new FormData();
    Array.from(nuevosEditables).forEach(f => formData.append('editables', f));
    Array.from(nuevosFinales).forEach(f => formData.append('finales', f));

    try {
      await axios.post(`/api/expedientes/${expediente.id}/archivos-rapidos`, formData);
      await Swal.fire({ icon: 'success', title: '¡Listo!', text: 'Archivos subidos.', timer: 1500, showConfirmButton: false });
      
      setNuevosEditables([]);
      setNuevosFinales([]);
      document.getElementById('input-editables').value = "";
      document.getElementById('input-finales').value = "";
      
      await recargarDatos();
    } catch (error) {
      Swal.fire('Error', 'No se pudieron subir los archivos.', 'error');
    }
  };

  const handleFinalizar = async (archivo) => {
    Swal.fire({
      title: '¿Marcar como finalizado?',
      text: "El archivo se bloqueará en Google Drive (Solo Lectura) y pasará a la lista de finalizados.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1ce089',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, finalizar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'Bloqueando en Drive...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
          await axios.put(`/api/expedientes/${expediente.id}/marcar-final`, { drive_id: archivo.drive_id, url_drive: archivo.url_drive });
          await Swal.fire({ icon: 'success', title: '¡Finalizado!', text: 'El archivo ha sido bloqueado.', timer: 1500, showConfirmButton: false });
          await recargarDatos();
        } catch (error) {
          Swal.fire('Error', 'Hubo un problema al bloquear el archivo.', 'error');
        }
      }
    });
  };

  const handleEliminar = async (archivo, tipo) => {
    Swal.fire({
      title: '¿Eliminar archivo?',
      text: "Se borrará permanentemente de Drive y del servidor local.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#555',
      confirmButtonText: 'Sí, eliminar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'Eliminando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
          await axios.put(`/api/expedientes/${expediente.id}/eliminar-archivo`, { 
            drive_id: archivo.drive_id, 
            nombre: archivo.nombre, 
            tipo: tipo,
            url_local: archivo.url_local
          });
          await Swal.fire({ icon: 'success', title: '¡Eliminado!', text: 'El archivo ha sido borrado.', timer: 1500, showConfirmButton: false });
          await recargarDatos();
        } catch (error) {
          Swal.fire('Error', 'Hubo un problema al eliminar.', 'error');
        }
      }
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h3>Archivos: Expediente {expediente.nro_expediente}</h3>
          <button className="btn-close-modal" onClick={onGuardarExitoso}><FaTimes /></button>
        </div>
        
        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '20px' }}>
          <div style={{ background: 'rgba(54, 153, 255, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid #3699ff', marginBottom: '20px' }}>
            <h4 style={{ color: '#3699ff', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
              <FaCloudUploadAlt size={20}/> 1. En Trámite
            </h4>
            
            {editables.length > 0 ? editables.map((a, i) => (
              <div key={i} style={{ background: '#2b2b40', padding: '10px', borderRadius: '5px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: '#e0e0e0', display: 'flex', alignItems: 'center', gap: '8px' }}><FaFileAlt color="#3699ff"/> {a.nombre}</span>
                  <div style={{ marginTop: '5px', fontSize: '12px' }}>
                    <a href={a.url_drive} target="_blank" rel="noreferrer" style={{ color: '#3699ff', marginRight: '15px' }}>Ver en Drive</a>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleFinalizar(a)} style={{ background: '#1ce089', color: '#000', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <FaCheckCircle /> Finalizar
                  </button>
                  <button onClick={() => handleEliminar(a, 'editables')} style={{ background: '#d33', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Eliminar">
                    <FaTrash />
                  </button>
                </div>
              </div>
            )) : <p style={{ color: '#888', fontSize: '14px' }}>No hay borradores.</p>}

            <div style={{ marginTop: '15px' }}>
              <label style={{ fontSize: '13px', color: '#ccc' }}>+ Subir nuevo borrador:</label>
              <input id="input-editables" type="file" multiple onChange={(e) => setNuevosEditables(e.target.files)} style={{ width: '100%', padding: '8px', background: '#1b1b29', border: '1px solid #444', color: '#fff' }} />
            </div>
          </div>

          <div style={{ background: 'rgba(28, 224, 137, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid #1ce089' }}>
            <h4 style={{ color: '#1ce089', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
              <FaLock size={18}/> 2. Documentos Finalizados
            </h4>
            
            {finales.length > 0 ? finales.map((a, i) => (
              <div key={i} style={{ background: '#2b2b40', padding: '10px', borderRadius: '5px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: '#e0e0e0', display: 'flex', alignItems: 'center', gap: '8px' }}><FaFileAlt color="#1ce089"/> {a.nombre}</span>
                  <div style={{ marginTop: '5px', fontSize: '12px' }}>
                    <a href={a.url_drive} target="_blank" rel="noreferrer" style={{ color: '#1ce089', marginRight: '15px' }}>Ver en Drive</a>
                    {a.url_local && <a href={`/api/descargar?ruta=${encodeURIComponent(a.url_local)}`} download target="_blank" rel="noreferrer" style={{ color: '#3699ff' }}>Descargar Copia Local</a>}
                  </div>
                </div>
                <button onClick={() => handleEliminar(a, 'finales')} style={{ background: '#d33', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Eliminar">
                  <FaTrash />
                </button>
              </div>
            )) : <p style={{ color: '#888', fontSize: '14px' }}>No hay documentos finales.</p>}

            <div style={{ marginTop: '15px' }}>
              <label style={{ fontSize: '13px', color: '#ccc' }}>+ Subir directo como Finalizado (se bloqueará automáticamente):</label>
              <input id="input-finales" type="file" multiple onChange={(e) => setNuevosFinales(e.target.files)} style={{ width: '100%', padding: '8px', background: '#1b1b29', border: '1px solid #444', color: '#fff' }} />
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onGuardarExitoso} className="btn-cancel">Cerrar</button>
          {(nuevosEditables.length > 0 || nuevosFinales.length > 0) && (
            <button onClick={handleSubirNuevos} className="btn-save">Subir Archivos Nuevos</button>
          )}
        </div>
      </div>
    </div>
  );
}