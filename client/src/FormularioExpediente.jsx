import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { FaTrash, FaFilePdf } from 'react-icons/fa';
import Swal from 'sweetalert2'; 
import './estilos/Formulario.css'; 

function FormularioExpediente({ onClose, onGuardarExitoso, expedienteAEditar, categoriaPreseleccionada, categoriaPrincipalMenu }) {
  const { register, handleSubmit, reset, setValue } = useForm();
  const [archivoExistente, setArchivoExistente] = useState(null);
  const [eliminarArchivo, setEliminarArchivo] = useState(false);

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
        categoria: expedienteAEditar.categoria
      });
      if (expedienteAEditar.archivo_url) {
        setArchivoExistente(expedienteAEditar.archivo_url);
        setEliminarArchivo(false);
      }
    } else {
      if (categoriaPreseleccionada) setValue('categoria', categoriaPreseleccionada);
      if (categoriaPrincipalMenu) setValue('tipo_expediente', categoriaPrincipalMenu);
    }
  }, [expedienteAEditar, reset, categoriaPreseleccionada, categoriaPrincipalMenu, setValue]);

  const handleBorrarArchivo = () => {
    setEliminarArchivo(true);
    setArchivoExistente(null);
    setValue('archivo', null);
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
    formData.append('eliminar_archivo', eliminarArchivo ? 'true' : 'false');

    if (data.archivo && data.archivo.length > 0) formData.append('archivo', data.archivo[0]);

    try {
      if (expedienteAEditar) {
        await axios.put(`/api/expedientes/${expedienteAEditar.id}`, formData);
      } else {
        await axios.post('/api/expedientes', formData);
      }
      await Swal.fire({ icon: 'success', title: '¡Listo!', text: 'Los datos se guardaron correctamente.', confirmButtonColor: '#004e8e' });
      onGuardarExitoso();
      onClose();
    } catch (error) {
      const mensajeError = error.response?.data?.error || 'Hubo un problema en el servidor.';
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
              <div className="form-control">
                <label>Tipo de Expediente</label>
                <input {...register("tipo_expediente")} readOnly style={{backgroundColor: '#f8f9fa'}} />
              </div>
              <div className="form-control">
                <label>Nro. Expediente *</label>
                <input {...register("nro_expediente", { required: true })} placeholder="Ej: 123-2024" />
              </div>
            </div>
            <div className="row-2">
              <div className="form-control"><label>Categoría</label><input {...register("categoria")} readOnly style={{backgroundColor: '#f8f9fa'}} /></div>
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
            <div className="form-control"><label>Materia</label><textarea rows="2" {...register("materia")}></textarea></div>
            <div className="form-control" style={{background: '#f8f9fa', padding: '10px', borderRadius: '5px'}}>
              <label>Expediente Digital</label>
              {archivoExistente ? (
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                   <a href={`${window.location.origin}${archivoExistente}`} target="_blank" rel="noopener noreferrer">Ver Archivo</a>
                   <button type="button" onClick={handleBorrarArchivo} style={{color: 'red', border: 'none', background: 'none', cursor: 'pointer'}}><FaTrash/> Quitar</button>
                </div>
              ) : (
                <input type="file" accept="application/pdf, .doc, .docx, .xls, .xlsx, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                 {...register("archivo")} />
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