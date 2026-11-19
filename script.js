// Personaliza estos datos con tu información real.
const profile = {
  email: "judatar2@gmail.com",
};

// Cada proyecto admite varios repositorios. Usa direcciones HTTPS reales.
const projects = [
  {
    id: "pereira-time-machine",
    name: "Pereira Time Machine",
    demoUrl: "proyectos/pereira-time-machine/index.html",
    description: "Explora el código fuente de Pereira Time Machine en GitHub.",
    technologies: [],
    color: "",
    previewLabel: "pereira-time-machine / código",
    details: "Consulta el repositorio de Pereira Time Machine para conocer su documentación, archivos e historial de cambios.",
    repositories: [{ name: "pereira-time-machine", description: "Ver en GitHub", url: "https://github.com/Juancho2909/pereira-time-machine" }],
  },
  {
    id: "orbita",
    name: "Orbita",
    demoUrl: "proyectos/orbita/index.html",
    description: "Explora el código fuente de Orbita en GitHub.",
    technologies: [],
    color: "indigo",
    previewLabel: "orbita / código",
    details: "Consulta el repositorio de Orbita para conocer su documentación, archivos e historial de cambios.",
    repositories: [{ name: "orbita", description: "Ver en GitHub", url: "https://github.com/Juancho2909/orbita" }],
  },
  {
    id: "rey-barracuda",
    name: "Rey de Barracuda",
    demoUrl: null,
    demoUnavailableReason: "Juego de escritorio en Python y Pygame. La versión web aún no está disponible.",
    description: "Explora el código fuente de Rey de Barracuda en GitHub.",
    technologies: [],
    color: "sand",
    previewLabel: "rey_barracuda / código",
    details: "Consulta el repositorio de Rey de Barracuda para conocer su documentación, archivos e historial de cambios.",
    repositories: [{ name: "rey_barracuda", description: "Ver en GitHub", url: "https://github.com/Juancho2909/rey_barracuda" }],
  },
];

const grid = document.querySelector("#project-grid");
const detail = document.querySelector("#project-detail");
let activeFilter = "Todos";
let selectedId = projects[0].id;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function safeRepositoryUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function renderDetail(project) {
  detail.replaceChildren();
  const description = element("div");
  description.append(element("h3", "", `${project.name} / repositorios`), element("p", "", project.details));
  const repos = element("div", "detail-repos");
  project.repositories.forEach((repo) => {
    const url = safeRepositoryUrl(repo.url);
    const row = element(url ? "a" : "div", "repo-row");
    if (url) {
      row.href = url;
      row.target = "_blank";
      row.rel = "noopener noreferrer";
      row.setAttribute("aria-label", `Abrir repositorio ${repo.name} en una pestaña nueva`);
    }
    row.append(element("strong", "", `⑂ ${repo.name}`), element("span", "", url ? `${repo.description} ↗` : "Enlace por configurar"));
    repos.append(row);
  });
  detail.append(description, repos);
}

function renderProjects() {
  const visible = projects.filter((project) => activeFilter === "Todos" || project.technologies.includes(activeFilter));
  if (!visible.some((project) => project.id === selectedId)) selectedId = visible[0]?.id;
  grid.replaceChildren();
  visible.forEach((project) => {
    const selected = project.id === selectedId;
    const card = element("article", `project-card${selected ? " selected" : ""}`);
    const preview = element("div", `project-preview ${project.color}`);
    preview.setAttribute("aria-hidden", "true");
    const mini = element("div", "mini-app");
    const heading = element("div", "mini-header");
    heading.append(element("span", "", project.previewLabel), element("span", "", "•••"));
    const columns = element("div", "mini-columns");
    for (let index = 0; index < 3; index += 1) {
      const column = element("div");
      column.append(element("div", "mini-line"), element("div", "mini-line"), element("div", "mini-block"), element("div", "mini-block"));
      columns.append(column);
    }
    mini.append(heading, columns);
    preview.append(mini);
    const body = element("div", "project-body");
    const top = element("div", "project-top");
    top.append(element("h3", "", project.name), element("span", "project-number", "↗"));
    const tags = element("div", "tags");
    project.technologies.forEach((technology) => tags.append(element("span", "", technology)));
    const button = element("button", "project-open");
    button.type = "button";
    button.setAttribute("aria-expanded", String(selected));
    button.setAttribute("aria-controls", "project-detail");
    button.setAttribute("aria-label", `Explorar repositorios de ${project.name}`);
    button.append(element("span", "", selected ? "Repositorios seleccionados" : "Explorar repositorios"), element("span", "", selected ? "↓" : "↗"));
    button.addEventListener("click", () => {
      selectedId = project.id;
      renderProjects();
      const selectedButton = grid.querySelector('[aria-expanded="true"]');
      selectedButton?.focus({ preventScroll: true });
      detail.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
    });
    const demo = element(project.demoUrl ? "a" : "button", "button primary project-demo", project.demoUrl ? "Abrir proyecto ↗" : "Demo web no disponible");
    if (project.demoUrl) {
      demo.href = project.demoUrl;
      demo.target = "_blank";
      demo.rel = "noopener noreferrer";
      demo.setAttribute("aria-label", `Abrir ${project.name} en una pestaña nueva`);
    } else {
      demo.type = "button";
      demo.disabled = true;
      demo.setAttribute("aria-describedby", `${project.id}-demo-note`);
    }
    body.append(top, element("p", "", project.description), tags, demo, button);
    if (!project.demoUrl) {
      const note = element("p", "demo-note", project.demoUnavailableReason);
      note.id = `${project.id}-demo-note`;
      body.append(note);
    }
    card.append(preview, body);
    grid.append(card);
  });
  const selected = visible.find((project) => project.id === selectedId);
  detail.hidden = !selected;
  if (selected) renderDetail(selected);
}

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((filter) => {
      const active = filter === button;
      filter.classList.toggle("active", active);
      filter.setAttribute("aria-pressed", String(active));
    });
    renderProjects();
  });
});

const emailLink = document.querySelector("#email-link");
const copyButton = document.querySelector("#copy-email");
if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
  emailLink.href = `mailto:${profile.email}`;
  emailLink.textContent = `${profile.email} ↗`;
  copyButton.disabled = false;
} else {
  emailLink.addEventListener("click", (event) => {
    event.preventDefault();
    document.querySelector("#contact-status").textContent = "Añade tu correo en profile.email dentro de script.js.";
  });
}
copyButton.addEventListener("click", async () => {
  const status = document.querySelector("#contact-status");
  try {
    await navigator.clipboard.writeText(profile.email);
    status.textContent = "Correo copiado.";
  } catch {
    status.textContent = `Puedes copiar el correo manualmente: ${profile.email}`;
  }
});
document.querySelector("#year").textContent = new Date().getFullYear();
renderProjects();
