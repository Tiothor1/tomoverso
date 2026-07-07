import type { NestedDict } from "../types";

const it: NestedDict = {
  locale: {
    pt_BR: "Português",
    en: "English",
    es: "Español",
    fr: "Français",
    de: "Deutsch",
    it: "Italiano",
    ja: "日本語",
    ko: "한국어",
    zh: "中文",
  },
  language: {
    select: "Idioma",
    switch_to: "Cambiar a {language}",
    translating: "Traduciendo...",
    translation_unavailable: "Traducción automática no disponible: configure TRANSLATION_API_KEY.",
    source_ptbr: "Texto original en portugués",
  },
  common: {
    app_name: "Tomo Verso Editora",
    loading: "Cargando...",
    error: "Error",
    save: "Guardar",
    cancel: "Cancelar",
    search: "Buscar",
    close: "Cerrar",
    submit: "Enviar",
  },
};

export default it;
