import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { FaTrash, FaFilePdf } from 'react-icons/fa';
import Swal from 'sweetalert2'; 
import './estilos/Formulario.css'; 

function FormularioExpediente({ onClose, onGuardarExitoso, expedienteAEditar, categoriaPreseleccionada }) {
  const { register, handleSubmit, reset, setValue } = useForm();
  
  const [archivoExistente, setArchivoExistente] = useState(null);
  const [eliminarArchivo, setEliminarArchivo] = useState(false);

  useEffect(() => {
    if (expedienteAEditar) {
      reset({
        nro_expediente: expedienteAEditar.nro_expediente,
        demandante: expedienteAEditar.demandante,
        dni_demandante: expedienteAEditar.dni_demandante,
        demandado: expedienteAEditar.demandado,
        dni_demandado: expedienteAEditar.dni_demandado,
        juzgado: expedienteAEditar.juzgado,
        abogado_encargado: expedienteAEditar.abogado_encargado,
        detalle: expedienteAEditar.detalle,
        categoria: expedienteAEditar.categoria
      });

      if (expedienteAEditar.archivo_url) {
        setArchivoExistente(expedienteAEditar.archivo_url);
        setEliminarArchivo(false);
      }
    } else {
      if (categoriaPreseleccionada) {
        setValue('categoria', categoriaPreseleccionada);
      }
    }
  }, [expedienteAEditar, reset, categoriaPreseleccionada, setValue]);

  const handleBorrarArchivo = () => {
    setEliminarArchivo(true);
    setArchivoExistente(null);
    setValue('archivo', null);
  };

  const onSubmit = async (data) => {
    Swal.fire({
      title: 'Guardando...',
      text: 'Validando datos...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const formData = new FormData();
    formData.append('nro_expediente', data.nro_expediente || '');
    formData.append('cliente', data.demandante || '');
    formData.append('dni_cliente', data.dni_demandante || '');
    formData.append('caso', data.demandado || '');
    formData.append('dni_procurador', data.dni_demandado || '');
    formData.append('proceso_administrativo', data.juzgado || '');
    formData.append('procurador', data.abogado_encargado || '');
    formData.append('categoria', data.categoria || '');
    formData.append('observaciones', data.detalle || '');
    formData.append('eliminar_archivo', eliminarArchivo ? 'true' : 'false');

    if (data.archivo && data.archivo.length > 0) {
      formData.append('archivo', data.archivo[0]);
    }

    try {
      if (expedienteAEditar) {
        const id = expedienteAEditar.nro_expediente; 
        await axios.put(`/api/expedientes/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await axios.post('/api/expedientes', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      
      await Swal.fire({ icon: 'success', title: '¡Guardado!', text: 'El expediente se registró correctamente.', confirmButtonColor: '#004e8e' });
      onGuardarExitoso();
      onClose();

    } catch (error) {
      console.error("Error al guardar:", error);

      let mensajeError = 'Hubo un problema al conectar con el servidor.';
      let tituloError = 'Error';
      
      if (error.response) {
         // Si es error 500 y estamos creando, asumimos duplicado (Postgres lanza error de llave primaria)
         if (error.response.status === 500 && !expedienteAEditar) {
            tituloError = '¡Duplicado!';
            mensajeError = `El Nro. de Expediente "${data.nro_expediente}" YA EXISTE en el sistema.`;
         }
      }

      Swal.fire({ 
        icon: 'warning',
        title: tituloError, 
        text: mensajeError, 
        confirmButtonColor: '#ffa800' 
      });
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        
        <div className="modal-header">
          <h3>{expedienteAEditar ? `Editar: ${expedienteAEditar.nro_expediente}` : `Nuevo: ${categoriaPreseleccionada}`}</h3>
          <button className="btn-close-modal" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="modal-body">
          
          <div className="form-section">
            <h4 className="section-title">1. Información Principal</h4>
            <div className="row-2">
              <div className="form-control">
                <label>Nro. Expediente <span className="req">*</span></label>
                <input {...register("nro_expediente", { required: true })} placeholder="Ej: 123-2024-JLA" disabled={!!expedienteAEditar} />
              </div>
              
              <div className="form-control">
                <label>Categoría (Automática)</label>
                <input type="text" {...register("categoria")} readOnly style={{backgroundColor: '#e9ecef', color: '#555', cursor: 'not-allowed', fontWeight: 'bold'}} />
              </div>
            </div>

            <div className="row-2">
               <div className="form-control">
                <label>Juzgado / Fiscalía</label>
                <input {...register("juzgado")} />
              </div>
               <div className="form-control">
                <label>Abogado Encargado</label>
                <input {...register("abogado_encargado")} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4 className="section-title">2. Partes Procesales</h4>
            <div className="row-2">
              <div className="form-control">
                <label>Demandante (Cliente) <span className="req">*</span></label>
                <input {...register("demandante", { required: true })} />
              </div>
              <div className="form-control">
                <label>DNI Demandante</label>
                <input {...register("dni_demandante")} />
              </div>
            </div>
            <div className="row-2">
               <div className="form-control">
                <label>Demandado / Caso <span className="req">*</span></label>
                <input {...register("demandado", { required: true })} />
              </div>
               <div className="form-control">
                <label>DNI Demandado</label>
                <input {...register("dni_demandado")} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4 className="section-title">3. Archivos y Detalles</h4>
            <div className="form-control">
              <label>Detalle</label>
              <textarea className="form-textarea" rows="2" {...register("detalle")}></textarea>
            </div>
            
            <div className="form-control" style={{background: '#f8f9fa', padding: '10px', borderRadius: '5px'}}>
              <label>Expediente Digital</label>
              {archivoExistente ? (
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                   <a href={archivoExistente} target="_blank" rel="noopener noreferrer" style={{color: '#004e8e', fontWeight: 'bold'}}>Ver Archivo Actual</a>
                   <button type="button" onClick={handleBorrarArchivo} style={{color: 'red', border: 'none', background: 'none', cursor: 'pointer'}}> <FaTrash/> Borrar</button>
                </div>
              ) : (
                <input type="file" accept="application/pdf" {...register("archivo")} />
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