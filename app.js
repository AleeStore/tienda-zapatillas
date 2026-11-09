const MI_WHATSAPP = "51970311300";
const MONEDA = "S/";
const URL_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTZlB-la3t1Kc1HYZYqqQ7m4f2yxyrcvOhOEBiMoX9I7J6PpwDlneTgIcP9-aHiiOoK6417JE_cweJO/pub?gid=0&single=true&output=csv";

let zapatillas = [];
let listaActual = [];

function parseCSV(texto) {
  const filas = [];
  let fila = [], campo = "", enComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (enComillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') enComillas = false;
      else campo += c;
    } else {
      if (c === '"') enComillas = true;
      else if (c === ',') { fila.push(campo); campo = ""; }
      else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ""; }
      else if (c !== '\r') campo += c;
    }
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  const [cabecera, ...resto] = filas.filter(f => f.some(c => c.trim() !== ""));
  return resto.map(f => {
    const obj = {};
    cabecera.forEach((h, i) => obj[h.trim().toLowerCase()] = (f[i] || "").trim());
    return obj;
  });
}

async function cargarDatos() {
  const cont = document.getElementById("catalogo");
  try {
    const res = await fetch(URL_CSV);
    if (!res.ok) throw new Error("No se pudo descargar el CSV");
    const texto = await res.text();
    zapatillas = parseCSV(texto);
    llenarFiltros();
    render();
  } catch (e) {
    cont.innerHTML = "<p style='padding:20px'>Error al cargar el catálogo.</p>";
    console.error(e);
  }
}

// Solo llenamos Marca y Talla (Género ya está fijo en el HTML)
function llenarFiltros() {
  const marcas = [...new Set(zapatillas.map(z => z.marca).filter(Boolean))].sort();
  const tallas = [...new Set(zapatillas.map(z => z.talla).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  
  const selMarca = document.getElementById("filtroMarca");
  const selTalla = document.getElementById("filtroTalla");
  
  marcas.forEach(m => selMarca.innerHTML += `<option value="${m}">${m}</option>`);
  tallas.forEach(t => selTalla.innerHTML += `<option value="${t}">Talla ${t}</option>`);
}

function obtenerFiltrados() {
  const texto = document.getElementById("buscador").value.toLowerCase();
  const marca = document.getElementById("filtroMarca").value;
  const genero = document.getElementById("filtroGenero").value;
  const talla = document.getElementById("filtroTalla").value;
  const rangoPrecio = document.getElementById("filtroPrecio").value;
  const soloDisp = document.getElementById("soloDisponibles").checked;
  const soloNuevos = document.getElementById("soloNuevos").checked;

  return zapatillas.filter(z => {
    // Buscador
    const coincideTexto = !texto || 
      (z.modelo || "").toLowerCase().includes(texto) || 
      (z.marca || "").toLowerCase().includes(texto);
    
    // Filtros
    const coincideMarca = !marca || z.marca === marca;
    const coincideGenero = !genero || (z.genero || "").toLowerCase() === genero.toLowerCase();
    const coincideTalla = !talla || z.talla === talla;
    
    let coincidePrecio = true;
    if (rangoPrecio) {
      const [min, max] = rangoPrecio.split("-").map(Number);
      const p = Number(z.precio);
      coincidePrecio = p >= min && p <= max;
    }

    const coincideDisp = !soloDisp || (z.disponible || "").toUpperCase() === "SI";
    const coincideNuevo = !soloNuevos || (z.nuevo || "").toUpperCase() === "SI";

    return coincideTexto && coincideMarca && coincideGenero && coincideTalla && coincidePrecio && coincideDisp && coincideNuevo;
  });
}

function render() {
  listaActual = obtenerFiltrados();
  const cont = document.getElementById("catalogo");

  if (!listaActual.length) {
    cont.innerHTML = "<p style='padding:20px'>No hay zapatillas que coincidan con tu búsqueda.</p>";
    return;
  }

  cont.innerHTML = listaActual.map((z, idx) => {
    const agotado = (z.disponible || "").toUpperCase() !== "SI";
    const esNuevo = (z.nuevo || "").toUpperCase() === "SI";
    const fotoPrincipal = z.foto1 || z.foto2 || z.foto3 || "https://via.placeholder.com/300x300?text=Sin+foto";
    
    // Protección por si el modelo está vacío en el Excel
    const nombreModelo = z.modelo ? z.modelo : "Modelo sin nombre"; 
    
    return `
      <article class="card ${agotado ? "agotado" : ""}" onclick="abrirModal(${idx})">
        ${esNuevo ? '<span class="badge-nuevo">✨ Nuevo</span>' : ''}
        <img src="${fotoPrincipal}" alt="${nombreModelo}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x300?text=Sin+foto'" />
        <div class="info">
          <span class="marca">${z.marca || ""}</span>
          <span class="modelo">${nombreModelo}</span>
          <span class="talla">Talla ${z.talla || ""}</span>
          ${z.genero ? `<span class="talla">${z.genero}</span>` : ""}
          ${z.notas ? `<span class="talla">${z.notas}</span>` : ""}
          <span class="precio">${MONEDA} ${z.precio || ""}</span>
          ${agotado ? '<span class="badge-agotado">Agotado</span>' : ""}
        </div>
      </article>
    `;
  }).join("");
}

function abrirModal(idx) {
  const z = listaActual[idx];
  if (!z) return;

  const fotos = [z.foto1, z.foto2, z.foto3].filter(f => f && f.trim() !== "");
  const modal = document.getElementById("modal");
  const grande = document.getElementById("modalFotoGrande");
  const miniaturas = document.getElementById("modalMiniaturas");

  grande.src = fotos[0] || "https://via.placeholder.com/500x500?text=Sin+foto";
  grande.onerror = function() { this.src = "https://via.placeholder.com/500x500?text=Sin+foto"; };

  miniaturas.innerHTML = "";
  if (fotos.length > 1) {
    fotos.forEach((f, i) => {
      const img = document.createElement("img");
      img.src = f;
      img.alt = `Foto ${i + 1}`;
      if (i === 0) img.classList.add("activa");
      img.onclick = () => {
        grande.src = f;
        miniaturas.querySelectorAll("img").forEach(m => m.classList.remove("activa"));
        img.classList.add("activa");
      };
      miniaturas.appendChild(img);
    });
  }

  const nombreModelo = z.modelo ? z.modelo : "Modelo sin nombre";

  document.getElementById("modalModelo").textContent = nombreModelo;
  document.getElementById("modalMarca").textContent = z.marca || "";
  document.getElementById("modalGenero").textContent = z.genero ? "Para: " + z.genero : "";
  document.getElementById("modalTalla").textContent = "Talla " + (z.talla || "");
  document.getElementById("modalPrecio").textContent = MONEDA + " " + (z.precio || "");
  document.getElementById("modalNotas").textContent = z.notas || "";

  const agotado = (z.disponible || "").toUpperCase() !== "SI";
  const btn = document.getElementById("modalBtnWA");
  
  if (agotado) {
    btn.disabled = true;
    btn.textContent = "Sin stock";
  } else {
    btn.disabled = false;
    btn.textContent = "Pedir por WhatsApp";
    const msg = encodeURIComponent(`Hola! Quiero pedir el modelo ${nombreModelo} (${z.marca}) en talla ${z.talla}. ¿Está disponible?`);
    btn.onclick = () => window.open(`https://wa.me/${MI_WHATSAPP}?text=${msg}`, "_blank");
  }

  const btnCompartir = document.getElementById("modalBtnCompartir");
  btnCompartir.onclick = async () => {
    const textoCompartir = `¡Mira estas ${nombreModelo} de ALE STORE! Talla ${z.talla} a solo ${MONEDA} ${z.precio}. Pídelas aquí: `;
    const urlActual = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: nombreModelo, text: textoCompartir, url: urlActual });
      } catch (err) { console.log("Compartir cancelado", err); }
    } else {
      navigator.clipboard.writeText(textoCompartir + urlActual);
      alert("¡Enlace copiado! Pégalo en tus redes sociales.");
    }
  };

  modal.classList.remove("oculto");
}

function cerrarModal() {
  document.getElementById("modal").classList.add("oculto");
}

document.addEventListener("click", (e) => {
  const modal = document.getElementById("modal");
  if (e.target === modal) cerrarModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") cerrarModal();
});

["buscador", "filtroMarca", "filtroGenero", "filtroTalla", "filtroPrecio", "soloDisponibles", "soloNuevos"].forEach(id => {
  document.getElementById(id).addEventListener("input", render);
});

cargarDatos();