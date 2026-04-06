import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaUserPlus, FaTrash, FaSave, FaTimes, FaEdit } from 'react-icons/fa';

function VistaUsuarios() {
  // Cambiamos el valor por defecto de 'Clinica' a 'TRABAJADOR'
  const estadoInicial = {
    id: null,
    usuario: '',
    password: '',
    nombre: 'TRABAJADOR', 
    dni: '',
    nombres: '',
    apellido_paterno: '',
    apellido_materno: ''
  };

  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [esEdicion, setEsEdicion] = useState(false);
  const [formulario, setFormulario] = useState(estadoInicial);

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      const res = await axios.get('/api/usuarios');
      setListaUsuarios(res.data);
    } catch (error) {
      Swal.fire('Error', 'No se pudieron cargar los usuarios', 'error');
    }
  };

  const handleChange = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const abrirModalNuevo = () => {
    setEsEdicion(false);
    setFormulario(estadoInicial);
    setModalAbierto(true);
  };

  const abrirModalEditar = (user) => {
    setEsEdicion(true);
    // Asegurarnos de que el rol coincida con las opciones (o default a trabajador)
    let rolActual = user.nombre ? user.nombre.toUpperCase() : 'TRABAJADOR';
    if (rolActual !== 'ADMINISTRADOR' && rolActual !== 'TRABAJADOR') {
        rolActual = 'TRABAJADOR'; // Fallback por si hay datos antiguos raros
    }

    setFormulario({ ...user, nombre: rolActual, password: '' });
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setFormulario(estadoInicial);
  };

  const guardarUsuario = async (e) => {
    e.preventDefault();
    if (!formulario.usuario || !formulario.dni || !formulario.nombres || !formulario.apellido_paterno) {
      return Swal.fire('Atención', 'Por favor completa los campos obligatorios', 'warning');
    }
    if (!esEdicion && !formulario.password) {
      return Swal.fire('Atención', 'La contraseña es obligatoria para usuarios nuevos', 'warning');
    }

    Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      if (esEdicion) {
        await axios.put(`/api/usuarios/${formulario.id}`, formulario);
        Swal.fire('¡Actualizado!', 'El usuario se actualizó correctamente.', 'success');
      } else {
        await axios.post('/api/usuarios', formulario);
        Swal.fire('¡Creado!', 'El usuario se registró correctamente.', 'success');
      }
      cerrarModal();
      cargarUsuarios();
    } catch (error) {
      const mensaje = error.response?.data?.error || 'Hubo un error al guardar';
      Swal.fire('Error', mensaje, 'error');
    }
  };

  const eliminarUsuario = (id, nombreUsuario) => {
    if (String(id) === '1') {
      return Swal.fire('Acción denegada', 'No puedes eliminar al administrador principal del sistema.', 'error');
    }

    Swal.fire({
      title: '¿Estás seguro?',
      text: `Vas a eliminar permanentemente al usuario: ${nombreUsuario}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--color-peligro)',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`/api/usuarios/${id}`);
          Swal.fire('¡Eliminado!', 'El usuario ha sido borrado.', 'success');
          cargarUsuarios();
        } catch (error) {
          Swal.fire('Error', 'No se pudo eliminar el usuario', 'error');
        }
      }
    });
  };

  return (
    <div className="vista-container vista-container-completa">
      <div className="vista-content">
        <div className="vista-header-row vista-header-row-completa">
          <h2>Gestión de Personal y Usuarios</h2>
          <button onClick={abrirModalNuevo} style={{ backgroundColor: 'var(--color-primario)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaUserPlus size={16} /> Nuevo Usuario
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          <div className="vista-table-card-completa" style={{ overflowX: 'auto', border: '1px solid var(--borde-suave)', borderRadius: '8px' }}>
            <table className="vista-table vista-table-completa">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>USUARIO (LOGIN)</th>
                  <th>NOMBRES Y APELLIDOS</th>
                  <th>DNI</th>
                  <th>ROL</th>
                  <th style={{ textAlign: 'center' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {listaUsuarios.map(u => (
                  <tr 
                    key={u.id} 
                    onClick={() => abrirModalEditar(u)} 
                    style={{ cursor: 'pointer' }}
                    title="Haz clic en la fila para editar este usuario"
                  >
                    <td style={{ fontWeight: 'bold', color: '#555' }}>{u.id}</td>
                    <td style={{ color: 'var(--color-primario)', fontWeight: 'bold' }}>{u.usuario}</td>
                    <td>{u.nombres} {u.apellido_paterno} {u.apellido_materno}</td>
                    <td>{u.dni}</td>
                    <td>
                      <span style={{ 
                        background: u.nombre?.toUpperCase() === 'ADMINISTRADOR' ? '#ffebee' : '#eaf4ff', 
                        color: u.nombre?.toUpperCase() === 'ADMINISTRADOR' ? '#d32f2f' : 'var(--color-primario)', 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' 
                      }}>
                        {u.nombre ? u.nombre.toUpperCase() : 'TRABAJADOR'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarUsuario(u.id, u.usuario);
                        }} 
                        style={{ background: '#fff0f0', border: '1px solid #ffcdd2', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-peligro)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
                      >
                        <FaTrash /> Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '600px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>{esEdicion ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}</h3>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '18px' }}><FaTimes /></button>
            </div>
            <form onSubmit={guardarUsuario}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Usuario (Login) *</label>
                  <input type="text" name="usuario" value={formulario.usuario} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', textTransform: 'uppercase' }} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Contraseña {esEdicion && <span style={{ color: '#999', fontSize: '11px' }}>(Opcional)</span>}</label>
                  <input type="password" name="password" value={formulario.password} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} required={!esEdicion} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Nombres *</label>
                  <input type="text" name="nombres" value={formulario.nombres} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', textTransform: 'uppercase' }} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Apellido Paterno *</label>
                  <input type="text" name="apellido_paterno" value={formulario.apellido_paterno} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', textTransform: 'uppercase' }} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Apellido Materno</label>
                  <input type="text" name="apellido_materno" value={formulario.apellido_materno} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', textTransform: 'uppercase' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>DNI *</label>
                  <input type="text" name="dni" value={formulario.dni || ''} onChange={handleChange} maxLength="8" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} required />
                </div>
                
                {/* CAMBIO AQUÍ: Lista desplegable para el Rol */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Rol *</label>
                  <select 
                    name="nombre" 
                    value={formulario.nombre} 
                    onChange={handleChange} 
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer' }}
                    required
                  >
                    <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                    <option value="TRABAJADOR">TRABAJADOR</option>
                  </select>
                </div>

              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={cerrarModal} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: 'var(--color-exito)', color: 'white', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}><FaSave /> Guardar Usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default VistaUsuarios;