const MI_WHATSAPP = "51970311300";
const MONEDA = "S/";
const URL_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTZlB-la3t1Kc1HYZYqqQ7m4f2yxyrcvOhOEBiMoX9I7J6PpwDlneTgIcP9-aHiiOoK6417JE_cweJO/pub?gid=0&single=true&output=csv";

let zapatillas = [];

// --- Parsear CSV ---
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

// --- Cargar datos ---
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

// --- Llenar selects de filtros ---
function llenarFiltros() {
  const marcas = [...new Set(zapatillas.map(z => z.marca).filter(Boolean))].sort();
  const tallas = [...new Set(zapatillas.map(z => z.talla).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  const selMarca = document.getElementById("filtroMarca");
  const selTalla = document.getElementById("filtroTalla");
  marcas.forEach(m => selMarca.innerHTML += `<option value="${m}">${m}</option>`);
  tallas.forEach(t => selTalla.innerHTML += `<option value="${t}">Talla ${t}</option>`);
}

// --- Renderizar tarjetas ---
function render() {
  const marca = document.getElementById("filtroMarca").value;
  const talla = document.getElementById("filtroTalla").value;
  const soloDisp = document.getElementById("soloDisponibles").checked;

  const lista = zapatillas.filter(z =>
    (!marca || z.marca === marca) &&
    (!talla || z.talla === talla) &&
    (!soloDisp || (z.disponible || "").toUpperCase() === "SI")
  );

  const cont = document.getElementById("catalogo");

  if (!lista.length) {
    cont.innerHTML = "<p style='padding:20px'>No hay zapatillas con esos filtros.</p>";
    return;
  }

  cont.innerHTML = lista.map((z, idx) => {
    const agotado = (z.disponible || "").toUpperCase() !== "SI";
    const fotoPrincipal = z.foto1 || z.foto2 || z.foto3 || "https://via.placeholder.com/300x300?text=Sin+foto";
    const notas = z.notas || "";

    return `
      <article class="card ${agotado ? "agotado" : ""}" onclick="abrirModal(${idx})">
        <img src="${fotoPrincipal}" alt="${z.modelo}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x300?text=Sin+foto'" />
        <div class="info">
          <span class="marca">${z.marca || ""}</span>
          <span class="modelo">${z.modelo || ""}</span>
          <span class="talla">Talla ${z.talla || ""}</span>
          ${notas ? `<span class="talla">${notas}</span>` : ""}
          <span class="precio">${MONEDA} ${z.precio || ""}</span>
          ${agotado ? '<span class="badge">Agotado</span>' : ""}
        </div>
      </article>
    `;
  }).join("");
}

// --- Abrir modal con fotos grandes ---
function abrirModal(idx) {
  const z = zapatillasFiltradas()[idx];
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
        grande.onerror = function() { this.src = "https://via.placeholder.com/500x500?text=Sin+foto"; };
        miniaturas.querySelectorAll("img").forEach(m => m.classList.remove("activa"));
        img.classList.add("activa");
      };
      miniaturas.appendChild(img);
    });
  }

  document.getElementById("modalModelo").textContent = z.modelo || "";
  document.getElementById("modalMarca").textContent = z.marca || "";
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
    const msg = encodeURIComponent(`Hola! Quiero pedir el modelo ${z.modelo} (${z.marca}) en talla ${z.talla}. ¿Está disponible?`);
    btn.onclick = () => window.open(`https://wa.me/${MI_WHATSAPP}?text=${msg}`, "_blank");
  }

  modal.classList.remove("oculto");
}

// --- Cerrar modal ---
function cerrarModal() {
  document.getElementById("modal").classList.add("oculto");
}

// Cerrar al hacer clic fuera del contenido
document.addEventListener("click", (e) => {
  const modal = document.getElementById("modal");
  if (e.target === modal) cerrarModal();
});

// Cerrar con tecla Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") cerrarModal();
});

// --- Lista filtrada actual (para que el modal sepa qué mostrar) ---
function zapatillasFiltradas() {
  const marca = document.getElementById("filtroMarca").value;
  const talla = document.getElementById("filtroTalla").value;
  const soloDisp = document.getElementById("soloDisponibles").checked;
  return zapatillas.filter(z =>
    (!marca || z.marca === marca) &&
    (!talla || z.talla === talla) &&
    (!soloDisp || (z.disponible || "").toUpperCase() === "SI")
  );
}

// --- Eventos ---
["filtroMarca", "filtroTalla", "soloDisponibles"].forEach(id => {
  document.getElementById(id).addEventListener("input", render);
});

cargarDatos();