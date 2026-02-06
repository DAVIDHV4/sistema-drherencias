import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { FaTrash, FaFilePdf } from 'react-icons/fa';
import Swal from 'sweetalert2'; 
import './estilos/Formulario.css'; 

function FormularioExpediente({ onClose, onGuardarExitoso, expedienteAEditar }) {
  const { register, handleSubmit, reset, setValue } = useForm();
  
  const [archivoExistente, setArchivoExistente] = useState(null);
  const [eliminarArchivo, setEliminarArchivo] = useState(false);

  useEffect(() => {
    if (expedienteAEditar) {
      const formatearFecha = (fecha) => fecha ? new Date(fecha).toISOString().split('T')[0] : '';
      
      reset({
        ...expedienteAEditar,
        fecha_inicio: formatearFecha(expedienteAEditar.fecha_inicio),
        fecha_finalizacion: formatearFecha(expedienteAEditar.fecha_finalizacion),
      });

      if (expedienteAEditar.archivos) {
        setArchivoExistente(expedienteAEditar.archivos);
        setEliminarArchivo(false);
      }
    }
  }, [expedienteAEditar, reset]);

  const handleBorrarArchivo = () => {
    setEliminarArchivo(true);
    setArchivoExistente(null);
    setValue('archivo', null);
  };

  const onSubmit = async (data) => {
    Swal.fire({
      title: 'Guardando...',
      text: 'Por favor espere mientras procesamos los datos.',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key !== 'archivo' && key !== 'id' && key !== 'creado_en' && key !== 'archivos') {
        formData.append(key, data[key] || '');
      }
    });

    if (data.archivo && data.archivo.length > 0) {
      formData.append('archivo', data.archivo[0]);
      formData.append('eliminar_archivo', 'false'); 
    } else if (eliminarArchivo) {
      formData.append('eliminar_archivo', 'true');
    } else {
      formData.append('eliminar_archivo', 'false');
    }

    try {
      if (expedienteAEditar) {
        // CORREGIDO: Ruta relativa
        await axios.put(`/api/expedientes/${expedienteAEditar.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        await Swal.fire({
          icon: 'success',
          title: '¡Actualizado!',
          text: 'El expediente se ha modificado correctamente.',
          confirmButtonColor: '#004e8e',
          confirmButtonText: 'Aceptar'
        });

      } else {
        // CORREGIDO: Ruta relativa
        await axios.post('/api/expedientes', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        await Swal.fire({
          icon: 'success',
          title: '¡Registrado!',
          text: 'El nuevo expediente se ha creado con éxito.',
          confirmButtonColor: '#28a745',
          confirmButtonText: 'Genial'
        });
      }
      
      onGuardarExitoso();
      onClose();

    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un problema al guardar los datos.',
        confirmButtonColor: '#d93025'
      });
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        
        <div className="modal-header">
          <h3>{expedienteAEditar ? `Editar Expediente N° ${expedienteAEditar.id}` : 'Nuevo Expediente / Caso'}</h3>
          <button className="btn-close-modal" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="modal-body">
          
          {/* SECCIÓN 1: CLIENTE */}
          <div className="form-section">
            <h4 className="section-title">1. Datos del Cliente</h4>
            <div className="row-2">
              <div className="form-control">
                <label>Nombre del Cliente <span className="req">*</span></label>
                <input {...register("cliente", { required: true })} placeholder="Nombre Completo" />
              </div>
              <div className="form-control">
                <label>DNI / RUC Cliente</label>
                <input {...register("dni_cliente")} placeholder="Documento" />
              </div>
            </div>
            <div className="form-control">
              <label>Dirección del Cliente</label>
              <input {...register("direccion_cliente")} />
            </div>
          </div>

          {/* SECCIÓN 2: CASO */}
          <div className="form-section">
            <h4 className="section-title">2. Información del Caso</h4>
            <div className="row-2">
              <div className="form-control">
                <label>Nombre del Caso <span className="req">*</span></label>
                <input {...register("caso", { required: true })} />
              </div>
              <div className="form-control">
                <label>Número de Expediente</label>
                <input {...register("numero_expediente")} />
              </div>
            </div>
            <div className="row-2">
              <div className="form-control">
                <label>Categoría</label>
                <select {...register("categoria")}>
                  <option value="">Seleccione...</option>
                  <option value="Civil">Civil</option>
                  <option value="Penal">Penal</option>
                  <option value="Laboral">Laboral</option>
                  <option value="Administrativo">Administrativo</option>
                  <option value="Familiar">Familiar</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div className="form-control">
                <label>Periodo</label>
                <input {...register("periodo")} />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: ESTADO */}
          <div className="form-section">
            <h4 className="section-title">3. Estado y Seguimiento</h4>
            <div className="row-3">
              <div className="form-control">
                <label>Estado Actual</label>
                <select {...register("estado")}>
                  <option value="Activo">Activo</option>
                  <option value="En Pausa">En Pausa</option>
                  <option value="Cerrado">Cerrado</option>
                  <option value="Archivado">Archivado</option>
                </select>
              </div>
              <div className="form-control">
                <label>Fecha Inicio</label>
                <input type="date" {...register("fecha_inicio")} />
              </div>
              <div className="form-control">
                <label>Fecha Finalización</label>
                <input type="date" {...register("fecha_finalizacion")} />
              </div>
            </div>
            <div className="form-control">
              <label>Etapa del Proceso</label>
              <input {...register("etapa_proceso")} />
            </div>
          </div>

          {/* SECCIÓN 4: PROCESOS */}
          <div className="form-section">
            <h4 className="section-title">4. Detalles Procesales</h4>
            <div className="row-2">
              <div className="form-control">
                <label>Proceso Notarial</label>
                <textarea className="form-textarea" {...register("proceso_notarial")}></textarea>
              </div>
              <div className="form-control">
                <label>Proceso Administrativo</label>
                <textarea className="form-textarea" {...register("proceso_administrativo")}></textarea>
              </div>
            </div>
          </div>

          {/* SECCIÓN 5: PROCURADOR */}
          <div className="form-section">
            <h4 className="section-title">5. Datos del Procurador</h4>
            <div className="row-2">
              <div className="form-control">
                <label>Nombre Procurador</label>
                <input {...register("procurador")} />
              </div>
              <div className="form-control">
                <label>DNI Procurador</label>
                <input {...register("dni_procurador")} />
              </div>
            </div>
            <div className="form-control">
              <label>Dirección Procurador</label>
              <input {...register("direccion_procurador")} />
            </div>
          </div>

          {/* SECCIÓN 6: ARCHIVOS */}
          <div className="form-section">
            <h4 className="section-title">6. Archivos y Observaciones</h4>
            <div className="form-control">
              <label>Observaciones Adicionales</label>
              <textarea className="form-textarea" rows="3" {...register("observaciones")}></textarea>
            </div>
            
            <div className="form-control" style={{background: '#f8f9fa', padding: '15px', borderRadius: '5px', border: '1px solid #eee'}}>
              <label>Expediente Digital</label>

              {archivoExistente ? (
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '10px', border: '1px solid #ddd', borderRadius: '4px'}}>
                   <div style={{display: 'flex', alignItems: 'center', gap: '10px', color: '#004e8e'}}>
                      <FaFilePdf size={24} color="#d93025"/>
                      <span style={{fontWeight: '600'}}>Archivo Actual Cargado</span>
                      {/* CORREGIDO: Enlace relativo */}
                      <a href={archivoExistente} target="_blank" rel="noopener noreferrer" style={{fontSize: '12px', color: '#666'}}>(Ver)</a>
                   </div>
                   <button 
                      type="button" 
                      onClick={handleBorrarArchivo}
                      style={{background: '#ffebee', color: '#d93025', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold'}}
                   >
                      <FaTrash /> Eliminar
                   </button>
                </div>
              ) : (
                <div>
                   <input type="file" accept="application/pdf" {...register("archivo")} className="input-file"/>
                   {eliminarArchivo && <small style={{color: '#d93025', display: 'block', marginTop: '5px'}}>* El archivo anterior será eliminado al guardar.</small>}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-cancel">Cancelar</button>
            <button type="submit" className="btn-save">
                {expedienteAEditar ? 'Actualizar Expediente' : 'Guardar Expediente'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default FormularioExpediente;