import { useState, useEffect } from 'react';

export const translations = {
  es: {
    dashboard: "Dashboard",
    scanner: "Escáner PCB",
    history: "Bitácora",
    chat: "Asistente IA",
    users: "Usuarios",
    settings: "Catálogos",
    panel_inspector: "Panel de Inspector",
    logout: "Cerrar Sesión",
    notifications: "Notificaciones",
    no_notifications: "No tienes notificaciones.",
    theme_dark: "Modo Oscuro",
    theme_light: "Modo Claro",
    lang_en: "English",
    lang_es: "Español",
    // StatsView
    stats_title: "Dashboard Analítico Modular",
    customize_view: "Personalizar Vista",
    summary_cards: "Tarjetas Resumen",
    no_defects_yet: "No hay defectos registrados aún.",
    total_scans: "Total Escaneos",
    defective: "Placas Defectuosas",
    ok: "Placas Aprobadas",
    general_proportion: "Proporción General",
    defects_by_type: "Defectos por Tipo",
    recent_scans: "Últimos 5 Escaneos",
    line_performance: "Desempeño por Línea",
    // History
    // History
    history_title: "Bitácora de Inspecciones",
    search_placeholder: "Buscar por archivo o ID...",
    all: "Todos",
    defective: "Defectuoso",
    ok: "OK",
    per_page: "por página",
    file: "Archivo",
    status: "Estado",
    defects: "Defectos",
    date: "Fecha",
    previous: "Anterior",
    next: "Siguiente",
    no_logs: "No hay escaneos registrados aún.",
    // General Actions
    edit: "Modificar",
    delete: "Eliminar",
    save: "Guardar Cambios",
    cancel: "Cancelar",
    new_user: "Nuevo Usuario",
    username: "Usuario",
    email: "Correo Electrónico",
    password: "Contraseña",
    role: "Rol",
    create_account: "Crear Cuenta",
    active: "Activo",
    inactive: "Inactivo",
    // Chat
    new_chat: "Nuevo Chat",
    secret_chat: "Chat Secreto",
    history_tab: "Historial",
    no_chats: "No hay chats recientes",
    type_message: "Escribe tu pregunta...",
    secret_message: "Mensaje autodestruible...",
    prompts: "Prompts Sugeridos",
    // Settings
    settings_title: "Configuraciones del Sistema",
    pcb_models: "Modelos PCB",
    lines: "Líneas",
    defect_dict: "Defectos",
    add_record: "Añadir Registro",
    name: "Nombre",
    desc: "Descripción",
    location: "Ubicación",
    severity: "Severidad",
    details: "Detalles",
    action: "Acción",
    no_records: "No hay registros.",
    // Scanner
    scanner_title: "Análisis de Placas (PCBs)",
    select_line: "-- Seleccionar Línea --",
    select_model: "-- Seleccionar Modelo --",
    upload_img: "Subir Imagen",
    use_camera: "Usar Cámara",
    capture: "Capturar",
    analyze_btn: "Ejecutar Análisis de Calidad",
    analyzing: "Analizando con IA...",
    results_title: "Resultados de Inspección",
    waiting_img: "Esperando imagen...",
    defective_part: "Pieza Defectuosa",
    defects_found: "defectos encontrados",
    defect_details: "Detalle de Defectos:",
    confidence: "de confianza",
    ask_vision: "Consultar a V1si0n sobre esto",
    ok_part: "Pieza OK",
    no_defects: "Sin defectos"
  },
  en: {
    dashboard: "Dashboard",
    scanner: "PCB Scanner",
    history: "Log History",
    chat: "AI Assistant",
    users: "Users",
    settings: "Settings",
    panel_inspector: "Inspector Panel",
    logout: "Logout",
    notifications: "Notifications",
    no_notifications: "You have no notifications.",
    theme_dark: "Dark Mode",
    theme_light: "Light Mode",
    lang_en: "English",
    lang_es: "Español",
    // StatsView
    stats_title: "Modular Analytics Dashboard",
    customize_view: "Customize View",
    summary_cards: "Summary Cards",
    no_defects_yet: "No defects registered yet.",
    total_scans: "Total Scans",
    defective: "Defective Boards",
    ok: "Approved Boards",
    general_proportion: "General Proportion",
    defects_by_type: "Defects by Type",
    recent_scans: "Last 5 Scans",
    line_performance: "Line Performance",
    // History
    history_title: "Inspection Log",
    search_placeholder: "Search by file or ID...",
    all: "All",
    defective: "Defective",
    ok: "OK",
    per_page: "per page",
    file: "File",
    status: "Status",
    defects: "Defects",
    date: "Date",
    previous: "Previous",
    next: "Next",
    no_logs: "No scans logged yet.",
    // General Actions
    edit: "Edit",
    delete: "Delete",
    save: "Save Changes",
    cancel: "Cancel",
    new_user: "New User",
    username: "Username",
    email: "Email",
    password: "Password",
    role: "Role",
    create_account: "Create Account",
    active: "Active",
    inactive: "Inactive",
    // Chat
    new_chat: "New Chat",
    secret_chat: "Secret Chat",
    history_tab: "History",
    no_chats: "No recent chats",
    type_message: "Type your question...",
    secret_message: "Self-destructing message...",
    prompts: "Suggested Prompts",
    // Settings
    settings_title: "System Settings",
    pcb_models: "PCB Models",
    lines: "Lines",
    defect_dict: "Defects",
    add_record: "Add Record",
    name: "Name",
    desc: "Description",
    location: "Location",
    severity: "Severity",
    details: "Details",
    action: "Action",
    no_records: "No records found.",
    // Scanner
    scanner_title: "PCB Analysis",
    select_line: "-- Select Line --",
    select_model: "-- Select Model --",
    upload_img: "Upload Image",
    use_camera: "Use Camera",
    capture: "Capture",
    analyze_btn: "Run Quality Analysis",
    analyzing: "Analyzing with AI...",
    results_title: "Inspection Results",
    waiting_img: "Waiting for image...",
    defective_part: "Defective Part",
    defects_found: "defects found",
    defect_details: "Defect Details:",
    confidence: "confidence",
    ask_vision: "Ask V1si0n about this",
    ok_part: "OK Part",
    no_defects: "No defects"
  }
};

export function t(lang, key) {
  if (!translations[lang]) return key;
  return translations[lang][key] || key;
}

export function useLang() {
  const [lang, setLang] = useState(localStorage.getItem('v1si0n_lang') || 'es');
  
  useEffect(() => {
    const handleLangChange = (e) => setLang(e.detail);
    window.addEventListener('languageChange', handleLangChange);
    return () => window.removeEventListener('languageChange', handleLangChange);
  }, []);
  
  return lang;
}

export function changeLanguage(newLang) {
  localStorage.setItem('v1si0n_lang', newLang);
  window.dispatchEvent(new CustomEvent('languageChange', { detail: newLang }));
}
