import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { FaTrash, FaCloudUploadAlt, FaFileAlt } from 'react-icons/fa';
import Swal from 'sweetalert2'; 
import './estilos/Formulario.css'; 

function FormularioExpediente({ onClose, onGuardarExitoso, expedienteAEditar, categoriaPreseleccionada, categoriaPrincipalMenu }) {
  const { register, handleSubmit, reset, setValue } = useForm();
  const [archivosExistentes, setArchivosExistentes] = useState([]);

  useEffect(() => {
    if (expedienteAEditar) {
      reset({
        tipo_expediente: expedienteAEditar.tipo_expediente,
        nro_expediente: expedienteAEditar.nro_expediente,
        solicitante: expedienteAEditar.solicitante,
        dni_solicitante: expedienteAEditar.dni_solicitante,
        juzgado: expedienteAEditar.juzgado,
        abogado_encargado: expedienteAEditar.abogado_encargado,
        materia: expedienteAEditar.materia,
        categoria: expedienteAEditar.categoria,
        estado: expedienteAEditar.estado,
        observaciones: expedienteAEditar.observaciones
      });

      if (expedienteAEditar.archivo_url) {
        try {
            const parsed = JSON.parse(expedienteAEditar.archivo_url);
            if (Array.isArray(parsed)) {
                setArchivosExistentes(parsed);
            } else {
                setArchivosExistentes([{ nombre: 'Archivo Original', url: expedienteAEditar.archivo_url }]);
            }
        } catch (e) {
            setArchivosExistentes([{ nombre: 'Archivo Adjunto', url: expedienteAEditar.archivo_url }]);
        }
      } else {
        setArchivosExistentes([]);
      }

    } else {
      if (categoriaPreseleccionada) setValue('categoria', categoriaPreseleccionada);
      if (categoriaPrincipalMenu) setValue('tipo_expediente', categoriaPrincipalMenu);
      setValue('estado', 'Inscrito');
      setArchivosExistentes([]);
    }
  }, [expedienteAEditar, reset, categoriaPreseleccionada, categoriaPrincipalMenu, setValue]);

  const borrarArchivoExistente = (index) => {
      const nuevos = [...archivosExistentes];
      nuevos.splice(index, 1);
      setArchivosExistentes(nuevos);
  };

  const onSubmit = async (data) => {
    Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    
    const formData = new FormData();
    formData.append('tipo_expediente', data.tipo_expediente || '');
    formData.append('nro_expediente', data.nro_expediente || '');
    formData.append('solicitante', data.solicitante || '');
    formData.append('dni_solicitante', data.dni_solicitante || '');
    formData.append('juzgado', data.juzgado || '');
    formData.append('abogado_encargado', data.abogado_encargado || '');
    formData.append('materia', data.materia || '');
    formData.append('categoria', data.categoria || '');
    formData.append('estado', data.estado || 'Inscrito');
    formData.append('observaciones', data.observaciones || '');

    formData.append('archivos_previos', JSON.stringify(archivosExistentes));

    if (data.archivos && data.archivos.length > 0) {
        for (let i = 0; i < data.archivos.length; i++) {
            formData.append('archivos', data.archivos[i]);
        }
    }

    try {
      if (expedienteAEditar) {
        await axios.put(`/api/expedientes/${expedienteAEditar.id}`, formData);
      } else {
        await axios.post('/api/expedientes', formData);
      }
      await Swal.fire({ icon: 'success', title: '¡Listo!', confirmButtonColor: '#004e8e' });
      onGuardarExitoso();
      onClose();
    } catch (error) {
      const mensajeError = error.response?.data?.error || 'Error en el servidor';
      Swal.fire({ icon: 'warning', title: 'Atención', text: mensajeError, confirmButtonColor: '#ffa800' });
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{expedienteAEditar ? `Editar ID: ${expedienteAEditar.id}` : `Nuevo: ${categoriaPreseleccionada}`}</h3>
          <button className="btn-close-modal" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="modal-body">
          <div className="form-section">
            <h4 className="section-title">1. Información Principal</h4>
            <div className="row-2">
              <div className="form-control"><label>Nro. Expediente *</label><input {...register("nro_expediente", { required: true })} /></div>
              <div className="form-control">
                <label>Estado</label>
                <select {...register("estado")} className="form-select">
                  <option value="Inscrito">Inscrito</option>
                  <option value="Calificacion">Calificacion</option>
                  <option value="Inscripcion">Inscripcion</option>
                </select>
              </div>
            </div>
            <div className="row-2">
              <div className="form-control"><label>Categoría</label><input {...register("categoria")} readOnly style={{backgroundColor: '#2b2b40', color: '#fff', border: '1px solid #444'}} /></div>
              <div className="form-control"><label>Juzgado / Fiscalía</label><input {...register("juzgado")} /></div>
            </div>
          </div>
          <div className="form-section">
            <h4 className="section-title">2. Datos del Solicitante</h4>
            <div className="row-2">
              <div className="form-control"><label>Solicitante *</label><input {...register("solicitante", { required: true })} /></div>
              <div className="form-control"><label>DNI Solicitante</label><input {...register("dni_solicitante")} /></div>
            </div>
          </div>
          <div className="form-section">
            <h4 className="section-title">3. Otros Detalles</h4>
            <div className="form-control"><label>Abogado Encargado</label><input {...register("abogado_encargado")} /></div>
            
            {/* CORRECCIÓN DE ESTILO PARA EL TEXTAREA DE MATERIA */}
            <div className="form-control">
              <label>Materia</label>
              <textarea 
                rows="2" 
                {...register("materia")}
                style={{
                  backgroundColor: '#1b1b29', 
                  border: '1px solid #444', 
                  color: '#fff', 
                  borderRadius: '4px',
                  padding: '8px',
                  width: '100%',
                  resize: 'vertical'
                }}
              ></textarea>
            </div>
            
            <div className="form-control" style={{
                background: 'rgba(255, 255, 255, 0.05)', 
                padding: '15px', 
                borderRadius: '8px', 
                border: '1px dashed #555',
                marginTop: '10px'
            }}>
              <label style={{fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#e0e0e0'}}>
                <FaCloudUploadAlt size={18}/> Archivos Adjuntos
              </label>
              
              <input 
                type="file" 
                multiple 
                {...register("archivos")} 
                style={{
                    width: '100%', 
                    padding: '8px', 
                    background: '#1b1b29', 
                    border: '1px solid #444', 
                    borderRadius: '4px', 
                    color: '#fff', 
                    marginBottom: '8px'
                }}
              />
              <small style={{color: '#888', display: 'block', marginBottom: '12px'}}>
                Formatos: Todos permitidos (Ctrl + Click para seleccionar varios)
              </small>

              {archivosExistentes.length > 0 && (
                <div style={{
                    marginTop: '10px', 
                    maxHeight: '120px', 
                    overflowY: 'auto', 
                    borderTop: '1px solid #444', 
                    paddingTop: '10px'
                }}>
                    <p style={{fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#bbb'}}>Archivos cargados:</p>
                    {archivosExistentes.map((archivo, index) => (
                        <div key={index} style={{
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            background: '#2b2b40', 
                            padding: '8px', 
                            marginBottom: '5px', 
                            borderRadius: '4px', 
                            border: '1px solid #3f4254'
                        }}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden'}}>
                                <FaFileAlt color="#3699ff"/>
                                <a href={`${window.location.origin}${archivo.url}`} target="_blank" rel="noopener noreferrer" style={{fontSize: '13px', color: '#e0e0e0', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                    {archivo.nombre || 'Archivo Adjunto'}
                                </a>
                            </div>
                            <button type="button" onClick={() => borrarArchivoExistente(index)} style={{color: '#ff5b5b', border: 'none', background: 'none', cursor: 'pointer', padding: '4px'}}>
                                <FaTrash title="Eliminar"/>
                            </button>
                        </div>
                    ))}
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-cancel">Cancelar</button>
            <button type="submit" className="btn-save">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FormularioExpediente;