import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaCloudUploadAlt, FaLock, FaFileAlt, FaCheckCircle, FaTrash, FaUnlock } from 'react-icons/fa';
import Swal from 'sweetalert2';
import './estilos/Formulario.css'; 
import './estilos/ModalArchivos.css'; 

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
    Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    const formData = new FormData();
    Array.from(nuevosEditables).forEach(f => formData.append('editables', f));
    Array.from(nuevosFinales).forEach(f => formData.append('finales', f));

    try {
      const res = await axios.post(`/api/expedientes/${expediente.id}/archivos-rapidos`, formData);
      const mensajeExito = res.data.message || 'Subiendo';
      
      await Swal.fire({ icon: 'success', title: '¡Listo!', text: mensajeExito, confirmButtonColor: '#004e8e' });
      
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

  const handleDesmarcarFinal = async (archivo) => {
    Swal.fire({
      title: '¿Revertir a Borrador?',
      text: "El archivo se desbloqueará en Google Drive y pasará a En Trámite. La copia de seguridad en el servidor se eliminará.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f6c23e',
      cancelButtonColor: '#555',
      confirmButtonText: 'Sí, desbloquear'
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'Desbloqueando en Drive...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
          await axios.put(`/api/expedientes/${expediente.id}/desmarcar-final`, { drive_id: archivo.drive_id, url_drive: archivo.url_drive });
          await Swal.fire({ icon: 'success', title: '¡Desbloqueado!', text: 'El archivo vuelve a estar En Trámite.', timer: 1500, showConfirmButton: false });
          await recargarDatos();
        } catch (error) {
          Swal.fire('Error', 'Hubo un problema al desbloquear el archivo.', 'error');
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
      <div className="modal-card">
        <div className="modal-header">
          <h3>Archivos: Expediente {expediente.nro_expediente}</h3>
          <button className="btn-close-modal" onClick={onGuardarExitoso}><FaTimes /></button>
        </div>
        
        <div className="modal-body">
          
          <div className="file-section tramite">
            <h4 className="file-section-title title-tramite">
              <FaCloudUploadAlt size={22}/> 1. En Trámite
            </h4>
            
            {editables.length > 0 ? editables.map((a, i) => (
              <div key={i} className="file-card">
                <div className="file-info">
                  <span className="file-name"><FaFileAlt color="#3699ff"/> {a.nombre}</span>
                  <div className="file-links">
                    <a href={a.url_drive} target="_blank" rel="noreferrer" className="link-drive">Ver en Drive</a>
                  </div>
                </div>
                <div className="file-actions">
                  <button onClick={() => handleFinalizar(a)} className="btn-action btn-finalizar">
                    <FaCheckCircle /> Finalizar
                  </button>
                  <button onClick={() => handleEliminar(a, 'editables')} className="btn-action btn-eliminar" title="Eliminar">
                    <FaTrash />
                  </button>
                </div>
              </div>
            )) : <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 15px 0' }}>No hay borradores en este momento.</p>}

            <div className="upload-area">
              <label>+ Subir nuevo borrador:</label>
              <input id="input-editables" type="file" multiple onChange={(e) => setNuevosEditables(e.target.files)} className="file-input" />
            </div>
          </div>

          <div className="file-section finalizado">
            <h4 className="file-section-title title-finalizado">
              <FaLock size={20}/> 2. Documentos Finalizados
            </h4>
            
            {finales.length > 0 ? finales.map((a, i) => (
              <div key={i} className="file-card">
                <div className="file-info">
                  <span className="file-name"><FaFileAlt color="#1ce089"/> {a.nombre}</span>
                  <div className="file-links">
                    <a href={a.url_drive} target="_blank" rel="noreferrer" className="link-drive-final">Ver en Drive</a>
                    {a.url_local && <a href={`/api/descargar?ruta=${encodeURIComponent(a.url_local)}`} download target="_blank" rel="noreferrer" className="link-local">Descargar Copia Local</a>}
                  </div>
                </div>
                <div className="file-actions">
                  <button onClick={() => handleDesmarcarFinal(a)} className="btn-action btn-desbloquear" title="Revertir a Borrador">
                    <FaUnlock /> Desbloquear
                  </button>
                  <button onClick={() => handleEliminar(a, 'finales')} className="btn-action btn-eliminar" title="Eliminar">
                    <FaTrash />
                  </button>
                </div>
              </div>
            )) : <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 15px 0' }}>No hay documentos bloqueados.</p>}

            <div className="upload-area">
              <label>+ Subir directo como Finalizado (se bloqueará automáticamente):</label>
              <input id="input-finales" type="file" multiple onChange={(e) => setNuevosFinales(e.target.files)} className="file-input" />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onGuardarExitoso} className="btn-cancel">Cerrar</button>
          {(nuevosEditables.length > 0 || nuevosFinales.length > 0) && (
            <button onClick={handleSubirNuevos} className="btn-save">Subir Archivos Nuevos</button>
          )}
        </div>
      </div>
    </div>
  );
}