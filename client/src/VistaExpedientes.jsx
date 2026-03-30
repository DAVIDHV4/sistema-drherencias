import { useEffect, useState } from 'react';
import axios from 'axios';
import { FaPlus, FaEdit, FaSearch, FaCommentAlt, FaPaperclip } from 'react-icons/fa';
import FormularioExpediente from './FormularioExpediente';
import ModalArchivos from './ModalArchivos';
import Swal from 'sweetalert2';
import './estilos/VistaExpedientes.css'; 

function VistaExpedientes({ usuario, categoriaPrincipal, filtroInicial, subCategoriaInicial, onLogout, onVolver }) {
  
  const getCategoriaInicial = (principal) => {
    if (principal === "Expediente Administrativo" || principal === "Expediente Notarial") return "Compraventa";
    if (principal === "Expediente Judicial") return "Judicial";
    if (principal === "Expediente por encargo") return "Por Encargo";
    if (principal === "Expedientes archivados") return "Archivado";
    return "";
  };

  const [expedientes, setExpedientes] = useState([]);
  const [busqueda, setBusqueda] = useState(filtroInicial || "");
  const [subCategoria, setSubCategoria] = useState(subCategoriaInicial || getCategoriaInicial(categoriaPrincipal)); 
  
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [expedienteAEditar, setExpedienteAEditar] = useState(null);
  const [expedienteArchivos, setExpedienteArchivos] = useState(null); 

  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  useEffect(() => {
    setSubCategoria(subCategoriaInicial || getCategoriaInicial(categoriaPrincipal));
    setBusqueda(filtroInicial || "");
  }, [categoriaPrincipal, subCategoriaInicial, filtroInicial]);

  useEffect(() => {
    setPagina(1);
  }, [subCategoria, busqueda, categoriaPrincipal]);

  const cargarExpedientes = async () => {
    try {
      const res = await axios.get('/api/expedientes', { params: { busqueda, categoria: subCategoria, tipo_expediente: categoriaPrincipal, page: pagina } });
      setExpedientes(res.data.data || []);
      setTotalPaginas(res.data.totalPaginas || 1);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarExpedientes();
  }, [subCategoria, busqueda, pagina, categoriaPrincipal]);

  const handleNuevo = () => { setExpedienteAEditar(null); setMostrarFormulario(true); };
  const handleEditar = (expediente) => { setExpedienteAEditar(expediente); setMostrarFormulario(true); };

  const handleObservaciones = async (exp) => {
    const { value: text } = await Swal.fire({
      title: 'Observaciones del Expediente',
      input: 'textarea',
      inputLabel: `Expediente: ${exp.nro_expediente}`,
      inputValue: exp.observaciones || '',
      inputPlaceholder: 'Escriba aquí las observaciones...',
      inputAttributes: { maxlength: 500 },
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#194276'
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

  const handleVerArchivos = (exp) => {
      setExpedienteArchivos(exp);
  };

  return (
    <div className="vista-container vista-container-completa">
      <div className="vista-content">
        <div className="vista-header-row vista-header-row-completa">
          <h2>{categoriaPrincipal}</h2>
          <div className="vista-actions">
            <div className="vista-search">
              <FaSearch className="icon-search"/>
              <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            <button className="vista-btn-nuevo" onClick={handleNuevo}><FaPlus /> Nuevo</button>
          </div>
        </div>

        {(categoriaPrincipal === "Expediente Administrativo" || categoriaPrincipal === "Expediente Notarial") && (
          <div className="vista-tabs vista-tabs-completa">
            <button className={`v-tab ${subCategoria === "Compraventa" ? 'active' : ''}`} onClick={() => setSubCategoria("Compraventa")}>Compraventa</button>
            <button className={`v-tab ${subCategoria === "Sucesión intestada" ? 'active' : ''}`} onClick={() => setSubCategoria("Sucesión intestada")}>Sucesión intestada</button>
            <button className={`v-tab ${subCategoria === "Poderes" ? 'active' : ''}`} onClick={() => setSubCategoria("Poderes")}>Poderes</button>
            <button className={`v-tab ${subCategoria === "Cesión de posesión" ? 'active' : ''}`} onClick={() => setSubCategoria("Cesión de posesión")}>Cesión de posesión</button>
            <button className={`v-tab ${subCategoria === "Prescripción adquisitivo de dominio" ? 'active' : ''}`} onClick={() => setSubCategoria("Prescripción adquisitivo de dominio")}>Prescripción adquisitivo de dominio</button>
            <button className={`v-tab ${subCategoria === "arrendamiento" ? 'active' : ''}`} onClick={() => setSubCategoria("arrendamiento")}>Arrendamiento</button>
            <button className={`v-tab ${subCategoria === "Donaciones" ? 'active' : ''}`} onClick={() => setSubCategoria("Donaciones")}>Donaciones</button>
          </div>
        )}

        <div className="vista-table-card-completa" style={{ overflowX: 'auto', width: '100%' }}>
          <table className="vista-table vista-table-completa">
            <thead>
              <tr>
                <th>ID</th>
                <th>NRO DE EXPEDIENTE</th>
                <th>ESTADO</th>
                <th>{(categoriaPrincipal === "Expediente Administrativo" || categoriaPrincipal === "Expediente Judicial") ? "DEMANDANTE" : "SOLICITANTE"}</th>
                <th>{(categoriaPrincipal === "Expediente Administrativo" || categoriaPrincipal === "Expediente Judicial") ? "DNI DEMANDANTE" : "DNI SOLICITANTE"}</th>
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
                    <td><span className={`badge-estado ${exp.estado?.toLowerCase().replace(/\s+/g, '-')}`}>{exp.estado || 'En Trámite'}</span></td>
                    <td>{exp.solicitante}</td>
                    <td>{exp.dni_solicitante}</td>
                    <td>{exp.abogado_encargado}</td>
                    <td>{exp.juzgado}</td>
                    <td style={{textAlign: 'center'}}>
                      <button onClick={() => handleVerArchivos(exp)} className="btn-ver-pdf" style={{border:'none', cursor:'pointer', background: 'var(--fondo-principal)', color:'var(--color-primario)', padding:'5px 10px', borderRadius:'4px', fontWeight:'bold', display: 'inline-flex', alignItems: 'center', gap: '5px'}}>
                        <FaPaperclip /> Ver
                      </button>
                    </td>
                    <td style={{textAlign: 'center'}}>
                      <button onClick={() => handleObservaciones(exp)} className="v-btn-obs" style={{background: 'none', border: 'none', cursor: 'pointer', color: exp.observaciones ? 'var(--color-primario)' : 'var(--texto-secundario)'}}>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', padding: '0 30px', marginBottom: '30px' }}>
          <button disabled={pagina === 1} onClick={() => setPagina(pagina - 1)} style={{ padding: '8px 15px', borderRadius: '5px', border: 'none', background: pagina === 1 ? 'var(--borde-suave)' : 'var(--color-primario)', color: pagina === 1 ? 'var(--texto-secundario)' : '#fff', cursor: pagina === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>Anterior</button>
          <span style={{ fontWeight: 'bold', color: 'var(--texto-secundario)' }}>Página {pagina} de {totalPaginas}</span>
          <button disabled={pagina === totalPaginas || totalPaginas === 0} onClick={() => setPagina(pagina + 1)} style={{ padding: '8px 15px', borderRadius: '5px', border: 'none', background: pagina === totalPaginas || totalPaginas === 0 ? 'var(--borde-suave)' : 'var(--color-primario)', color: pagina === totalPaginas || totalPaginas === 0 ? 'var(--texto-secundario)' : '#fff', cursor: pagina === totalPaginas || totalPaginas === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>Siguiente</button>
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

      {expedienteArchivos && (
        <ModalArchivos 
          expediente={expedienteArchivos} 
          onClose={() => setExpedienteArchivos(null)} 
          onGuardarExitoso={() => { setExpedienteArchivos(null); cargarExpedientes(); }}
        />
      )}
    </div>
  );
}

export default VistaExpedientes;