import { useEffect, useState } from 'react';
import axios from 'axios';
import { FaPlus, FaSignOutAlt, FaEdit, FaSearch, FaHome, FaCommentAlt, FaPaperclip } from 'react-icons/fa';
import FormularioExpediente from './FormularioExpediente';
import Swal from 'sweetalert2';
import './estilos/VistaExpedientes.css'; 

function VistaExpedientes({ usuario, categoriaPrincipal, filtroInicial, onLogout, onVolver }) {
  
  const [expedientes, setExpedientes] = useState([]);
  const [busqueda, setBusqueda] = useState(filtroInicial || "");
  const [subCategoria, setSubCategoria] = useState(""); 
  
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [expedienteAEditar, setExpedienteAEditar] = useState(null);

  useEffect(() => {
    if (categoriaPrincipal === "Expediente Administrativo" || categoriaPrincipal === "Expediente Notarial") {
        setSubCategoria("Compraventa");
    } else if (categoriaPrincipal === "Expediente Judicial") {
        setSubCategoria("Judicial");
    } else if (categoriaPrincipal === "Expediente por encargo") {
        setSubCategoria("Por Encargo");
    } else if (categoriaPrincipal === "Expedientes archivados") {
        setSubCategoria("Archivado");
    }
  }, [categoriaPrincipal]);

  const cargarExpedientes = async () => {
    try {
      const res = await axios.get('/api/expedientes', {
        params: { 
          busqueda, 
          categoria: subCategoria,
          tipo_expediente: categoriaPrincipal 
        }
      });
      setExpedientes(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarExpedientes();
  }, [subCategoria, busqueda]);

  const handleNuevo = () => { setExpedienteAEditar(null); setMostrarFormulario(true); };
  const handleEditar = (expediente) => { setExpedienteAEditar(expediente); setMostrarFormulario(true); };

  const handleObservaciones = async (exp) => {
    const { value: text } = await Swal.fire({
      title: 'Observaciones del Expediente',
      input: 'textarea',
      inputLabel: `Expediente: ${exp.nro_expediente}`,
      inputValue: exp.observaciones || '',
      inputPlaceholder: 'Escriba aquí las observaciones...',
      inputAttributes: {
        'maxlength': 500
      },
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3699ff'
    });

    if (text !== undefined) {
      try {
        await axios.put(`/api/expedientes/${exp.id}`, { ...exp, observaciones: text });
        Swal.fire('¡Guardado!', 'La observación ha sido actualizada.', 'success');
        cargarExpedientes();
      } catch (error) {
        Swal.fire('Error', 'No se pudo actualizar la observación.', 'error');
      }
    }
  };

  const subirArchivoRapido = async (file, exp) => {
      if (!file) return;
      
      const formData = new FormData();
      formData.append('tipo_expediente', exp.tipo_expediente || '');
      formData.append('nro_expediente', exp.nro_expediente || '');
      formData.append('solicitante', exp.solicitante || '');
      formData.append('dni_solicitante', exp.dni_solicitante || '');
      formData.append('juzgado', exp.juzgado || '');
      formData.append('abogado_encargado', exp.abogado_encargado || '');
      formData.append('materia', exp.materia || '');
      formData.append('categoria', exp.categoria || '');
      formData.append('estado', exp.estado || 'Inscrito');
      formData.append('observaciones', exp.observaciones || '');
      
      formData.append('archivos_previos', exp.archivo_url || '[]');
      formData.append('archivos', file);

      try {
          Swal.fire({ title: 'Subiendo...', didOpen: () => Swal.showLoading() });
          const res = await axios.put(`/api/expedientes/${exp.id}`, formData);
          await cargarExpedientes(); 
          Swal.close();
          const expedienteActualizado = { ...exp, archivo_url: res.data.archivo_url };
          handleVerArchivos(expedienteActualizado);
      } catch (error) {
          Swal.fire('Error', 'No se pudo subir el archivo', 'error');
      }
  };

  const handleVerArchivos = (exp) => {
      let archivos = [];
      try {
          let parsed = JSON.parse(exp.archivo_url);
          if (!Array.isArray(parsed)) throw new Error();
          archivos = parsed.map(a => {
              if (a.nombre && (a.nombre.includes('Archivo ') || a.nombre.includes('Adjunto'))) {
                  a.nombre = a.url.split('/').pop();
              }
              return a;
          });
      } catch (e) {
          if (exp.archivo_url) {
              const nombreExtraido = exp.archivo_url.split('/').pop();
              archivos = [{nombre: nombreExtraido, url: exp.archivo_url}];
          }
      }

      const listaHtml = archivos.length > 0 
        ? archivos.map(a => 
            `<div style="margin-bottom: 10px; text-align: left; padding: 8px; border: 1px solid #eee; border-radius: 6px; display: flex; align-items: center; background-color: #f9f9f9;">
                <span style="font-size: 20px; margin-right: 10px;">📄</span>
                <a href="${window.location.origin}${encodeURI(a.url)}" target="_blank" style="color: #004e8e; text-decoration: none; font-weight: bold; flex-grow: 1; word-break: break-all;">
                   ${a.nombre}
                </a>
             </div>`
          ).join('')
        : '<p style="color:#888;">No hay archivos adjuntos.</p>';

      Swal.fire({
          title: 'Documentos del Expediente',
          html: `
            <div style="max-height: 300px; overflow-y: auto; text-align: left; margin-bottom: 15px;">${listaHtml}</div>
            <hr style="border-top: 1px solid #eee; margin: 10px 0;">
            <button id="btn-add-file-swal" style="background-color: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; width: 100%;">
                <span style="margin-right: 8px;">+</span> Agregar otro archivo
            </button>
          `,
          showConfirmButton: true,
          confirmButtonText: 'Cerrar',
          confirmButtonColor: '#555',
          didOpen: () => {
              const btn = Swal.getPopup().querySelector('#btn-add-file-swal');
              btn.addEventListener('click', () => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.onchange = (e) => {
                      if (e.target.files && e.target.files[0]) {
                          subirArchivoRapido(e.target.files[0], exp);
                      }
                  };
                  input.click();
              });
          }
      });
  };

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

      <div className="vista-content">
        <div className="vista-header-row">
            <h2>{categoriaPrincipal}</h2>
            <div className="vista-actions">
                <div className="vista-search">
                    <FaSearch className="icon-search"/>
                    <input 
                        type="text" 
                        placeholder="Buscar..." 
                        value={busqueda} 
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <button className="vista-btn-nuevo" onClick={handleNuevo}>
                    <FaPlus /> Nuevo
                </button>
            </div>
        </div>

        {(categoriaPrincipal === "Expediente Administrativo" || categoriaPrincipal === "Expediente Notarial") && (
            <div className="vista-tabs">
                <button className={`v-tab ${subCategoria === "Compraventa" ? 'active' : ''}`} onClick={() => setSubCategoria("Compraventa")}>Compraventa</button>
                <button className={`v-tab ${subCategoria === "Sucesión intestada" ? 'active' : ''}`} onClick={() => setSubCategoria("Sucesión intestada")}>Sucesión intestada</button>
                <button className={`v-tab ${subCategoria === "Poderes" ? 'active' : ''}`} onClick={() => setSubCategoria("Poderes")}>Poderes</button>
                <button className={`v-tab ${subCategoria === "Cesión de posesión" ? 'active' : ''}`} onClick={() => setSubCategoria("Cesión de posesión")}>Cesión de posesión</button>
                <button className={`v-tab ${subCategoria === "Prescripción adquisitivo de dominio" ? 'active' : ''}`} onClick={() => setSubCategoria("Prescripción adquisitivo de dominio")}>Prescripción adquisitivo de dominio</button>
                <button className={`v-tab ${subCategoria === "arrendamiento" ? 'active' : ''}`} onClick={() => setSubCategoria("arrendamiento")}>Arrendamiento</button>
            </div>
        )}

        <div className="vista-table-card">
            <table className="vista-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>NRO DE EXPEDIENTE</th>
                        <th>ESTADO</th>
                        <th>
                            {(categoriaPrincipal === "Expediente Administrativo" || categoriaPrincipal === "Expediente Judicial") 
                                ? "DEMANDANTE" 
                                : "SOLICITANTE"}
                        </th>
                        <th>
                            {(categoriaPrincipal === "Expediente Administrativo" || categoriaPrincipal === "Expediente Judicial") 
                                ? "DNI DEMANDANTE" 
                                : "DNI SOLICITANTE"}
                        </th>
                        <th>ABOGADO_ENCARGADO</th>
                        <th>JUZGADO</th>
                        <th style={{textAlign: 'center'}}>ARCHIVOS</th>
                        <th style={{textAlign: 'center'}}>OBS.</th>
                        <th style={{textAlign: 'right'}}>ACCIONES</th>
                    </tr>
                </thead>
                <tbody>
                    {expedientes.length === 0 ? (
                        <tr><td colSpan="10" className="v-no-data">No hay expedientes registrados.</td></tr>
                    ) : (
                        expedientes.map((exp) => (
                            <tr key={exp.id}>
                                <td>{exp.id}</td>
                                <td style={{fontWeight: 'bold'}}>{exp.nro_expediente}</td>
                                <td>
                                    <span className={`badge-estado ${exp.estado?.toLowerCase().replace(/\s+/g, '-')}`}>
                                        {exp.estado || 'En Trámite'}
                                    </span>
                                </td>
                                <td>{exp.solicitante}</td>
                                <td>{exp.dni_solicitante}</td>
                                <td>{exp.abogado_encargado}</td>
                                <td>{exp.juzgado}</td>
                                <td style={{textAlign: 'center'}}>
                                    {exp.archivo_url ? (
                                        <button onClick={() => handleVerArchivos(exp)} className="btn-ver-pdf" style={{border:'none', cursor:'pointer', background: '#e9ecef', color:'#333', padding:'5px 10px', borderRadius:'4px', fontWeight:'bold', display: 'flex', alignItems: 'center', gap: '5px'}}>
                                            <FaPaperclip /> Ver
                                        </button>
                                    ) : <span className="no-pdf">-</span>}
                                </td>
                                <td style={{textAlign: 'center'}}>
                                    <button onClick={() => handleObservaciones(exp)} className="v-btn-obs" style={{background: 'none', border: 'none', cursor: 'pointer', color: exp.observaciones ? '#3699ff' : '#ccc'}}>
                                        <FaCommentAlt />
                                    </button>
                                </td>
                                <td style={{textAlign: 'right'}}>
                                    <button onClick={() => handleEditar(exp)} className="v-btn-edit"><FaEdit /></button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {mostrarFormulario && (
        <FormularioExpediente 
          onClose={() => setMostrarFormulario(false)} 
          onGuardarExitoso={cargarExpedientes}
          expedienteAEditar={expedienteAEditar}
          categoriaPreseleccionada={subCategoria}
          categoriaPrincipalMenu={categoriaPrincipal}
        />
      )}
    </div>
  );
}

export default VistaExpedientes;