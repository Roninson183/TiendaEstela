// === CONFIGURACIÓN DE GOOGLE SHEETS ===
const HOJA_ID = "1900CoR4ch-HYawG6rXzGb7nNtLfXufkyAf1dTIOSzPw";
const URL_SHEETS = `https://opensheet.elk.sh/${HOJA_ID}/1`;

// Número por defecto por si falla la lectura de Sheets
let numeroTienda = "51999888777"; 

// Función auxiliar para quitar tildes, mayúsculas y espacios extra
function normalizarTexto(texto) {
    return (texto || '')
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

// Busca dinámicamente cualquier clave dentro del objeto que contenga la palabra clave
function obtenerValorCampo(prod, palabraClave) {
    if (!prod) return '';
    const claveEncontrada = Object.keys(prod).find(k => normalizarTexto(k).includes(normalizarTexto(palabraClave)));
    return claveEncontrada ? prod[claveEncontrada] : '';
}

// 1. CARGAR PRODUCTOS Y TELÉFONO DESDE GOOGLE SHEETS Y ANIMACIÓN
window.addEventListener('load', () => {
    cargarProductosDesdeSheets();

    // Animación Splash Screen
    setTimeout(() => {
        const splashScreen = document.getElementById('splash-screen');
        const contenido = document.getElementById('contenido-principal');
        const navegacion = document.getElementById('navegacion');
        
        if (splashScreen) splashScreen.style.opacity = '0';
        
        setTimeout(() => {
            if (splashScreen) splashScreen.classList.add('oculto');
            if (contenido) contenido.classList.remove('oculto');
            if (navegacion) navegacion.classList.remove('oculto');
        }, 500);
    }, 1500); 
});

async function cargarProductosDesdeSheets() {
    const contenedorGrid = document.querySelector('.catalogo-grid');
    if (!contenedorGrid) return;

    try {
        const respuesta = await fetch(URL_SHEETS);
        const productos = await respuesta.json();

        // Extraer número de teléfono si existe en la hoja de Sheets
        if (productos.length > 0) {
            const telRaw = obtenerValorCampo(productos[0], 'telef') || 
                           obtenerValorCampo(productos[0], 'celular') || 
                           obtenerValorCampo(productos[0], 'num') || 
                           obtenerValorCampo(productos[0], 'whatsapp');
            
            if (telRaw) {
                const telLimpio = telRaw.toString().replace(/\D/g, ''); // Deja solo los dígitos
                if (telLimpio.length >= 8) {
                    numeroTienda = telLimpio;
                }
            }
        }

        contenedorGrid.innerHTML = ''; // Limpiar catálogo

        productos.forEach((prod) => {
            const nombre = obtenerValorCampo(prod, 'nombre') || 'Producto ESTELA';
            const categoriaRaw = obtenerValorCampo(prod, 'categor') || '';
            const estadoRaw = normalizarTexto(obtenerValorCampo(prod, 'estado'));
            const precioRaw = parseFloat(obtenerValorCampo(prod, 'precio')) || 0;
            const ofertaRaw = parseFloat(obtenerValorCampo(prod, 'oferta')) || 0;
            const imagenUrl = obtenerValorCampo(prod, 'imagen') || obtenerValorCampo(prod, 'url') || 'https://via.placeholder.com/300x400?text=ESTELA';
            const tallas = obtenerValorCampo(prod, 'talla') || 'Única';

            if (estadoRaw === 'oculto') return;

            const esAgotado = estadoRaw === 'agotado';
            const tieneOferta = ofertaRaw > 0;
            const precioFinal = tieneOferta ? ofertaRaw : precioRaw;

            const etiquetaHTML = esAgotado 
                ? '<span class="etiqueta agotado">Agotado</span>' 
                : (tieneOferta ? '<span class="etiqueta descuento">OFERTA</span>' : '');

            const preciosHTML = tieneOferta 
                ? `<div class="precios">
                    <span class="precio-tachado">S/ ${precioRaw.toFixed(2)}</span>
                    <span class="precio-actual">S/ ${precioFinal.toFixed(2)}</span>
                   </div>`
                : `<p class="precio-actual">S/ ${precioFinal.toFixed(2)}</p>`;

            const botonHTML = esAgotado 
                ? '<button class="btn-accion" disabled>No disponible</button>' 
                : `<button class="btn-accion" onclick="agregarAlCarrito('${nombre}', ${precioFinal})">Añadir al Carrito</button>`;

            const tarjeta = `
                <div class="tarjeta-producto ${esAgotado ? 'producto-agotado' : ''}" data-categoria="${categoriaRaw}">
                    ${etiquetaHTML}
                    <img src="${imagenUrl}" alt="${nombre}" class="foto-producto" onerror="this.src='https://via.placeholder.com/300x400?text=ESTELA'">
                    <h3>${nombre}</h3>
                    <p class="tallas">Tallas: ${tallas}</p>
                    ${preciosHTML}
                    ${botonHTML}
                </div>
            `;
            
            contenedorGrid.innerHTML += tarjeta;
        });

    } catch (error) {
        console.error("Error cargando Google Sheets:", error);
        contenedorGrid.innerHTML = '<p style="text-align:center; color:red;">No se pudo cargar el catálogo. Revisa los permisos de tu Google Sheets.</p>';
    }
}

// 2. FILTROS POR CATEGORÍA
function filtrarProductos(categoria, e) {
    const evento = e || window.event;
    const botones = document.querySelectorAll('.btn-filtro, .nav-item');
    
    botones.forEach(btn => btn.classList.remove('activo'));
    if (evento && evento.target) {
        const btnClickeado = evento.target.closest('button');
        if (btnClickeado) btnClickeado.classList.add('activo');
    }

    const catBuscada = normalizarTexto(categoria);
    const tarjetas = document.querySelectorAll('.tarjeta-producto');

    tarjetas.forEach(tarjeta => {
        const catTarjeta = normalizarTexto(tarjeta.getAttribute('data-categoria'));
        
        if (catBuscada === 'todos' || catTarjeta.includes(catBuscada)) {
            tarjeta.style.display = 'flex';
        } else {
            tarjeta.style.display = 'none';
        }
    });
}

// 3. WHATSAPP FLOTANTE
const botonWA = document.getElementById('boton-whatsapp');
const menuWA = document.getElementById('menu-whatsapp');

if (botonWA) {
    botonWA.addEventListener('click', () => {
        if (menuWA) menuWA.classList.toggle('oculto');
    });
}

function enviarWhatsApp(tipo) {
    let mensaje = "";

    if (tipo === 'comprar') {
        mensaje = "¡Hola ESTELA! Vengo de la página web y quiero realizar una compra. 🛍";
    } else if (tipo === 'consultar') {
        mensaje = "¡Hola ESTELA! Tengo una consulta sobre un producto de su catálogo. ❓";
    }

    const url = `https://api.whatsapp.com/send?phone=${numeroTienda}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
    if (menuWA) menuWA.classList.add('oculto');
}

// 4. CARRITO DE COMPRAS
let carrito = [];
let total = 0;

function agregarAlCarrito(nombreProducto, precio) {
    carrito.push({ nombre: nombreProducto, precio: precio });
    total += precio;
    actualizarCarritoUI();
}

function eliminarDelCarrito(index) {
    total -= carrito[index].precio;
    carrito.splice(index, 1);
    actualizarCarritoUI();
}

function actualizarCarritoUI() {
    const lista = document.getElementById('lista-carrito');
    const totalPrecio = document.getElementById('total-precio');
    const contadores = document.querySelectorAll('#contador-carrito');
    
    contadores.forEach(c => c.innerText = carrito.length);
    if (!lista || !totalPrecio) return;

    if (carrito.length === 0) {
        lista.innerHTML = '<p style="color:#777; text-align:center;">Tu carrito está vacío.</p>';
    } else {
        lista.innerHTML = '';
        carrito.forEach((item, index) => {
            lista.innerHTML += `
                <div class="item-carrito">
                    <div class="info-item">
                        <span>✔️ ${item.nombre}</span>
                        <strong>S/ ${item.precio.toFixed(2)}</strong>
                    </div>
                    <button class="btn-eliminar" onclick="eliminarDelCarrito(${index})" title="Eliminar producto">🗑</button>
                </div>
            `;
        });
    }
    
    if (total < 0) total = 0;
    totalPrecio.innerText = `S/ ${total.toFixed(2)}`;
}

function abrirCarrito(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('modal-carrito');
    if (modal) {
        modal.classList.remove('oculto');
        actualizarCarritoUI();
    }
}

function cerrarCarrito() {
    const modal = document.getElementById('modal-carrito');
    if (modal) modal.classList.add('oculto');
}

function procesarCompra() {
    if (carrito.length === 0) {
        alert("Primero debes añadir productos a tu carrito.");
        return;
    }

    const nombre = document.getElementById('cliente-nombre').value.trim();
    const apellido = document.getElementById('cliente-apellido').value.trim();
    const celular = document.getElementById('cliente-celular').value.trim();

    if (!nombre || !apellido || !celular) {
        alert("Por favor, completa tu Nombre, Apellido y Celular.");
        return;
    }

    let textoMensaje = `¡Hola ESTELA! Soy ${nombre} ${apellido} (Cel: ${celular}).\nQuiero concretar la compra de mi carrito:\n\n`;
    
    carrito.forEach(item => {
        textoMensaje += `👗 ${item.nombre}: S/ ${item.precio.toFixed(2)}\n`;
    });
    
    textoMensaje += `\n💰 *Total a pagar: S/ ${total.toFixed(2)}*\n\n¿A qué cuenta realizo el depósito?`;

    const url = `https://api.whatsapp.com/send?phone=${numeroTienda}&text=${encodeURIComponent(textoMensaje)}`;
    
    window.open(url, '_blank');
    cerrarCarrito();
}

// 5. PERFIL Y REDES SOCIALES
function abrirPerfil(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('modal-perfil');
    if (modal) modal.classList.remove('oculto');
}

function cerrarPerfil() {
    const modal = document.getElementById('modal-perfil');
    if (modal) modal.classList.add('oculto');
}

// 6. PANEL ADMINISTRATIVO
const CLAVE_CORRECTA = "Estela2026";

function abrirAdmin(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('modal-login-admin');
    if (modal) modal.classList.remove('oculto');
}

function cerrarAdmin() {
    const modal = document.getElementById('modal-login-admin');
    if (modal) modal.classList.remove('oculto');
}

function validarAccesoAdmin() {
    const claveIngresada = document.getElementById('clave-admin').value;
    if (claveIngresada === CLAVE_CORRECTA) {
        alert("¡Acceso concedido al Panel Administrativo!");
        cerrarAdmin();
        const panel = document.getElementById('panel-admin');
        if (panel) {
            panel.classList.remove('oculto');
            panel.scrollIntoView({ behavior: 'smooth' });
        }
    } else {
        alert("Contraseña incorrecta. Acceso denegado.");
    }
}

let totalVentasFisicas = 0;
function registrarVentaFisica() {
    const monto = prompt("Ingresa el monto cobrado en la tienda física (S/):");
    if (monto && !isNaN(monto)) {
        totalVentasFisicas += parseFloat(monto);
        const historial = document.getElementById('historial-ventas-fisicas');
        const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (historial) {
            historial.innerHTML += `<div>💵 Venta S/ ${parseFloat(monto).toFixed(2)} - ${hora}</div>`;
        }
        alert(`Venta registrada. Total acumulado en caja física: S/ ${totalVentasFisicas.toFixed(2)}`);
    }
}
