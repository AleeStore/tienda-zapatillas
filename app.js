const MI_WHATSAPP = "51970311300";
const MONEDA = "S/";
const URL_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTZlB-la3t1Kc1HYZYqqQ7m4f2yxyrcvOhOEBiMoX9I7J6PpwDlneTgIcP9-aHiiOoK6417JE_cweJO/pub?gid=0&single=true&output=csv";

let zapatillas = [];

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

function llenarFiltros() {
  const marcas = [...new Set(zapatillas.map(z => z.marca).filter(Boolean))].sort();
  const tallas = [...new Set(zapatillas.map(z => z.talla).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  const selMarca = document.getElementById("filtroMarca");
  const selTalla = document.getElementById("filtroTalla");
  marcas.forEach(m => selMarca.innerHTML += `<option value="${m}">${m}</option>`);
  tallas.forEach(t => selTalla.innerHTML += `<option value="${t}">Talla ${t}</option>`);
}

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
  cont.innerHTML = lista.map(z => {
    const agotado = (z.disponible || "").toUpperCase() !== "SI";
    const msg = encodeURIComponent(`Hola! Quiero pedir el modelo ${z.modelo} (${z.marca}) en talla ${z.talla}. ¿Está disponible?`);
    const linkWA = `https://wa.me/${MI_WHATSAPP}?text=${msg}`;
    return `
      <article class="card ${agotado ? "agotado" : ""}">
        <img src="${z.foto}" alt="${z.modelo}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x300?text=Sin+foto'" />
        <div class="info">
          <span class="marca">${z.marca}</span>
          <span class="modelo">${z.modelo}</span>
          <span class="talla">Talla ${z.talla}</span>
          ${z.notas ? `<span class="talla">${z.notas}</span>` : ""}
          <span class="precio">${MONEDA} ${z.precio}</span>
          ${agotado ? '<span class="badge">Agotado</span>' : ""}
          <button class="btn-wa" ${agotado ? "disabled" : ""} onclick="window.open('${linkWA}', '_blank')">
            ${agotado ? "Sin stock" : "Pedir por WhatsApp"}
          </button>
        </div>
      </article>
    `;
  }).join("");
}

["filtroMarca", "filtroTalla", "soloDisponibles"].forEach(id => {
  document.getElementById(id).addEventListener("input", render);
});

cargarDatos();