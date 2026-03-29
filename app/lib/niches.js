// ─────────────────────────────────────────────────────────────
//  Kaan — Definición de nichos e industrias
//  Usado en: Settings, Onboarding, API de IA (generate-post, trends)
// ─────────────────────────────────────────────────────────────

export const NICHES = [
  { id: 'real_estate',   label: 'Inmobiliario',           emoji: '🏠', desc: 'Agencias, desarrolladores, agentes'      },
  { id: 'restaurant',    label: 'Restaurantes & F&B',     emoji: '🍽️', desc: 'Restaurantes, bares, cafeterías'         },
  { id: 'tourism',       label: 'Turismo & Hospitalidad', emoji: '🏨', desc: 'Hoteles, tours, experiencias'            },
  { id: 'wellness',      label: 'Wellness & Belleza',     emoji: '💆', desc: 'Spas, salones, yoga, meditación'         },
  { id: 'fitness',       label: 'Fitness',                emoji: '🏋️', desc: 'Gyms, entrenadores, crossfit'           },
  { id: 'health',        label: 'Salud & Clínicas',       emoji: '🏥', desc: 'Médicos, dentistas, estéticas'          },
  { id: 'retail',        label: 'Retail & E-commerce',    emoji: '🛍️', desc: 'Tiendas, boutiques, marcas'            },
  { id: 'education',     label: 'Educación & Coaching',   emoji: '🎓', desc: 'Cursos, coaches, academias'             },
  { id: 'services',      label: 'Servicios Profesionales',emoji: '⚖️', desc: 'Despachos, contadores, consultores'     },
  { id: 'construction',  label: 'Construcción & Arq.',    emoji: '🏗️', desc: 'Constructoras, arquitectos, diseño'    },
]

export const DEFAULT_NICHE = 'real_estate'

// ─────────────────────────────────────────────────────────────
//  Contextos de IA por nicho
//  expertiseDesc → quién es el copywriter
//  expertise     → en qué es experto
//  audience      → a quién le habla
//  trendsContext → contexto para generar tendencias
//  trendTopics   → temas relevantes del nicho
//  fallbackTrends→ tendencias de respaldo si la API falla
// ─────────────────────────────────────────────────────────────
export const NICHE_AI_CONTEXT = {

  real_estate: {
    expertiseDesc: 'marketing inmobiliario en México',
    expertise:     'hooks que detienen el scroll, storytelling inmobiliario, llamadas a la acción que generan leads, plusvalía y tendencias del mercado',
    audience:      'compradores, inversionistas y personas buscando rentar o comprar propiedad',
    trendsContext: 'mercado inmobiliario en México (Riviera Maya, CDMX, Monterrey)',
    trendTopics:   'plusvalía, crédito hipotecario, zonas de crecimiento, inversión en preventa, lifestyle de playa, proceso de compra',
    fallbackTrends: [
      { id:1, emoji:'🏡', titulo:'Consejos para comprar tu primera propiedad',  descripcion:'Lo que nadie te dice antes de firmar.',             tipo:'educativo' },
      { id:2, emoji:'📈', titulo:'Plusvalía en la Riviera Maya',                descripcion:'Las zonas con mayor crecimiento inmobiliario.',      tipo:'inversion' },
      { id:3, emoji:'🌊', titulo:'Vivir cerca del mar — el lifestyle real',     descripcion:'Cómo es el día a día en zona costera.',              tipo:'lifestyle' },
      { id:4, emoji:'💰', titulo:'Crédito hipotecario en 2025',                 descripcion:'Cómo acceder y qué opciones existen.',               tipo:'proceso'   },
      { id:5, emoji:'🏢', titulo:'Invertir en departamentos en preventa',       descripcion:'Por qué la preventa sigue siendo una apuesta ganadora.', tipo:'inversion' },
      { id:6, emoji:'🔑', titulo:'Proceso de compra paso a paso',               descripcion:'Guía completa para comprar en México.',              tipo:'proceso'   },
      { id:7, emoji:'🏖️', titulo:'Propiedades vacacionales rentables',         descripcion:'Genera ingresos con una propiedad en zona turística.',tipo:'mercado'   },
      { id:8, emoji:'🌳', titulo:'Amenidades más valoradas en 2025',            descripcion:'Qué buscan hoy los compradores modernos.',           tipo:'mercado'   },
    ],
  },

  restaurant: {
    expertiseDesc: 'marketing para restaurantes y F&B en México',
    expertise:     'contenido que genera reservaciones y visitas, fotografía de alimentos, promociones, experiencias gastronómicas, storytelling de cocina',
    audience:      'comensales locales y turistas que buscan experiencias gastronómicas únicas',
    trendsContext: 'industria restaurantera y F&B en México',
    trendTopics:   'menús de temporada, experiencias temáticas, happy hours, brunch, eventos especiales, chef specials, delivery, reseñas',
    fallbackTrends: [
      { id:1, emoji:'🍳', titulo:'El plato estrella de la temporada',           descripcion:'Cómo presentar tu menú de temporada.',              tipo:'mercado'   },
      { id:2, emoji:'🥂', titulo:'Experiencias más allá de la comida',          descripcion:'Eventos, maridajes y noches temáticas.',             tipo:'lifestyle' },
      { id:3, emoji:'📸', titulo:'Fotografía que vende antes del primer bocado',descripcion:'Tips visuales para que tu comida irresistible.',      tipo:'educativo' },
      { id:4, emoji:'⭐', titulo:'Reseñas: tu mejor estrategia de marketing',   descripcion:'Cómo convertir clientes en embajadores.',            tipo:'proceso'   },
      { id:5, emoji:'🚀', titulo:'Delivery: más que una opción, un canal',      descripcion:'Cómo maximizar tus pedidos en línea.',               tipo:'mercado'   },
      { id:6, emoji:'🍹', titulo:'Happy hour que llena mesas',                  descripcion:'Diseña una promo irresistible para entre semana.',   tipo:'inversion' },
      { id:7, emoji:'👨‍🍳', titulo:'El chef tiene la palabra',                 descripcion:'Humaniza tu marca con historias del equipo.',         tipo:'lifestyle' },
      { id:8, emoji:'🌮', titulo:'Ingrediente local: diferenciador real',       descripcion:'El origen de tus productos como historia de marca.',  tipo:'educativo' },
    ],
  },

  tourism: {
    expertiseDesc: 'marketing de turismo y hospitalidad en México',
    expertise:     'contenido de viajes y experiencias, storytelling de destinos, actividades, y contenido que genera reservaciones',
    audience:      'viajeros nacionales e internacionales que buscan experiencias en México',
    trendsContext: 'turismo y hospitalidad en México (Riviera Maya, CDMX, Oaxaca, etc.)',
    trendTopics:   'temporadas turísticas, experiencias únicas, turismo de aventura, lujo accesible, turismo sustentable, off-the-beaten-path',
    fallbackTrends: [
      { id:1, emoji:'🤿', titulo:'Experiencias que no encuentras en TripAdvisor',descripcion:'Activa tu diferenciador con tours exclusivos.',        tipo:'lifestyle' },
      { id:2, emoji:'🌅', titulo:'Temporada alta: cómo preparar tu oferta',     descripcion:'Estrategia de contenido para llenar tu agenda.',     tipo:'mercado'   },
      { id:3, emoji:'♻️', titulo:'Turismo responsable como ventaja competitiva',descripcion:'El viajero moderno valora la sostenibilidad.',        tipo:'educativo' },
      { id:4, emoji:'📱', titulo:'UGC: que tus huéspedes sean tu marketing',    descripcion:'Cómo motivar reseñas y contenido generado por usuarios.', tipo:'proceso' },
      { id:5, emoji:'🏊', titulo:'Amenidades que enamoran en fotos',            descripcion:'Las instalaciones más compartidas en Instagram.',     tipo:'lifestyle' },
      { id:6, emoji:'🌮', titulo:'Gastronomía local como atractivo',            descripcion:'La comida como parte de la experiencia.',             tipo:'mercado'   },
      { id:7, emoji:'💑', titulo:'Turismo de bodas y lunas de miel',            descripcion:'Un mercado con alto ticket y fidelidad.',             tipo:'inversion' },
      { id:8, emoji:'🗺️', titulo:'Guía de la zona: sé el experto local',       descripcion:'Contenido de valor que posiciona tu marca.',          tipo:'educativo' },
    ],
  },

  wellness: {
    expertiseDesc: 'marketing para wellness, spas y belleza en México',
    expertise:     'contenido de bienestar y transformación, before/after, rituales, y contenido que genera reservaciones y citas',
    audience:      'personas que buscan bienestar, relajación, belleza y autocuidado',
    trendsContext: 'industria wellness y belleza en México',
    trendTopics:   'rituales de temporada, autocuidado, transformaciones, Día de la Madre, preparación para eventos, bienestar mental, tendencias de tratamientos',
    fallbackTrends: [
      { id:1, emoji:'🧖', titulo:'Ritual del mes: el tratamiento estrella',      descripcion:'Presenta tu servicio más popular con contexto.',     tipo:'mercado'   },
      { id:2, emoji:'✨', titulo:'Before & after que inspiran',                  descripcion:'Cómo mostrar resultados respetando la privacidad.',   tipo:'proceso'   },
      { id:3, emoji:'💆', titulo:'Autocuidado como inversión, no como lujo',     descripcion:'Cambia la percepción de precio con valor.',           tipo:'educativo' },
      { id:4, emoji:'🌸', titulo:'Temporada de bodas: el momento de los spas',  descripcion:'Cómo posicionarte para novias y festejadas.',        tipo:'inversion' },
      { id:5, emoji:'🧘', titulo:'Bienestar mental + físico: la tendencia 2025',descripcion:'Integra el componente emocional en tus servicios.',   tipo:'lifestyle' },
      { id:6, emoji:'🎁', titulo:'Regalos de experiencia vs. regalos materiales',descripcion:'Posiciona tus gift cards para fechas especiales.',    tipo:'mercado'   },
      { id:7, emoji:'👩‍💼', titulo:'La terapeuta que hay detrás del servicio',  descripcion:'Humaniza tu marca con historias del equipo.',         tipo:'lifestyle' },
      { id:8, emoji:'🌿', titulo:'Ingredientes naturales como diferenciador',    descripcion:'El origen de tus productos como propuesta de valor.', tipo:'educativo' },
    ],
  },

  fitness: {
    expertiseDesc: 'marketing para fitness y deporte en México',
    expertise:     'contenido motivacional, transformaciones, rutinas, retos, y contenido que genera membresías y asistencia a clases',
    audience:      'personas activas o que quieren comenzar a ejercitarse y mejorar su condición física',
    trendsContext: 'industria fitness en México',
    trendTopics:   'reto mensual, temporada de verano, regreso a clases, año nuevo, transformaciones, CrossFit, funcional, suplementación',
    fallbackTrends: [
      { id:1, emoji:'💪', titulo:'Reto del mes: el contenido que más convierte',  descripcion:'Cómo lanzar un reto que genere inscripciones.',      tipo:'proceso'   },
      { id:2, emoji:'🏆', titulo:'Transformaciones reales de tus miembros',       descripcion:'El contenido más poderoso para el sector fitness.',  tipo:'mercado'   },
      { id:3, emoji:'☀️', titulo:'Operación verano: estrategia de contenido',    descripcion:'Cómo capitalizar la temporada más activa del año.',   tipo:'inversion' },
      { id:4, emoji:'🥗', titulo:'Nutrición como parte del servicio',             descripcion:'Amplía tu valor con contenido de alimentación.',      tipo:'educativo' },
      { id:5, emoji:'🧠', titulo:'Fitness mental: mindset de entrenamiento',      descripcion:'La tendencia que conecta ejercicio con bienestar.',   tipo:'lifestyle' },
      { id:6, emoji:'📊', titulo:'Resultados con datos: el gym que mide',         descripcion:'Cómo mostrar progreso con métricas reales.',          tipo:'educativo' },
      { id:7, emoji:'👥', titulo:'Comunidad: tu mayor ventaja competitiva',       descripcion:'Por qué la gente se queda por las personas.',         tipo:'lifestyle' },
      { id:8, emoji:'🆕', titulo:'Nuevas clases y tendencias en entrenamiento',   descripcion:'Mantente relevante mostrando innovación.',            tipo:'mercado'   },
    ],
  },

  health: {
    expertiseDesc: 'marketing para salud y clínicas en México',
    expertise:     'contenido educativo de salud, prevención, testimoniales, y contenido que genera consultas y citas',
    audience:      'pacientes y personas preocupadas por su salud y bienestar',
    trendsContext: 'salud y bienestar médico en México',
    trendTopics:   'prevención estacional, meses de concientización, salud dental, estética, checkups, tratamientos modernos, bienestar preventivo',
    fallbackTrends: [
      { id:1, emoji:'🦷', titulo:'Salud dental: el servicio más postergado',     descripcion:'Cómo generar urgencia en tus pacientes potenciales.', tipo:'mercado'   },
      { id:2, emoji:'🩺', titulo:'Checkup preventivo: el mejor seguro de vida',  descripcion:'Contenido educativo que posiciona la prevención.',    tipo:'educativo' },
      { id:3, emoji:'💉', titulo:'Vacunación de temporada: actúa con anticipación',descripcion:'Comunica el calendario de vacunas oportunamente.',  tipo:'proceso'   },
      { id:4, emoji:'😊', titulo:'Testimonial de paciente: el contenido más confiable',descripcion:'Cómo pedir y presentar casos de éxito.',        tipo:'proceso'   },
      { id:5, emoji:'🌡️', titulo:'Temporada de gripes y alergias: sé el recurso',descripcion:'Contenido de valor en el momento oportuno.',         tipo:'mercado'   },
      { id:6, emoji:'🧬', titulo:'Medicina estética: tendencias 2025',           descripcion:'Los tratamientos más solicitados y cómo comunicarlos.',tipo:'inversion' },
      { id:7, emoji:'👨‍⚕️', titulo:'Humaniza a tu médico o especialista',        descripcion:'La confianza se construye con el lado humano.',       tipo:'lifestyle' },
      { id:8, emoji:'📋', titulo:'Derechos del paciente: contenido que conecta', descripcion:'Educa y diferénciate con transparencia.',             tipo:'educativo' },
    ],
  },

  retail: {
    expertiseDesc: 'marketing para retail y e-commerce en México',
    expertise:     'lanzamiento de productos, ventas, descuentos, unboxing, tendencias, y contenido que genera ventas directas',
    audience:      'compradores en línea y en tienda que buscan productos y tendencias',
    trendsContext: 'retail y e-commerce en México',
    trendTopics:   'temporadas de venta (Buen Fin, Hot Sale, Navidad), nuevas colecciones, drops, tendencias de moda, UGC, reseñas de producto',
    fallbackTrends: [
      { id:1, emoji:'🛍️', titulo:'Lanzamiento de colección: el evento del mes',  descripcion:'Genera expectativa antes del drop.',                  tipo:'mercado'   },
      { id:2, emoji:'📦', titulo:'Unboxing: el contenido que vende sin vender',   descripcion:'Cómo el packaging cuenta la historia de tu marca.',   tipo:'lifestyle' },
      { id:3, emoji:'⭐', titulo:'Reseña de cliente real: prueba social',         descripcion:'UGC como motor de conversión.',                       tipo:'proceso'   },
      { id:4, emoji:'🔖', titulo:'Promo flash: urgencia que convierte',           descripcion:'Diseña ofertas de tiempo limitado efectivas.',         tipo:'inversion' },
      { id:5, emoji:'🎨', titulo:'Storytelling de producto: más que un artículo', descripcion:'La historia detrás de lo que vendes.',                tipo:'educativo' },
      { id:6, emoji:'🤳', titulo:'Try-on y comparativas de producto',             descripcion:'Contenido que elimina la fricción de comprar en línea.',tipo:'proceso'  },
      { id:7, emoji:'🌱', titulo:'Marca sustentable: diferenciador actual',       descripcion:'Comunica tu impacto y conecta con el consumidor consciente.', tipo:'educativo' },
      { id:8, emoji:'🎁', titulo:'Guías de regalo por temporada',                 descripcion:'Facilita la decisión de compra en fechas clave.',      tipo:'mercado'   },
    ],
  },

  education: {
    expertiseDesc: 'marketing para educación y coaching en México',
    expertise:     'contenido educativo de valor, testimoniales, resultados de alumnos, y contenido que genera inscripciones y consultas',
    audience:      'personas que quieren aprender, crecer profesionalmente o emprender',
    trendsContext: 'educación online y presencial, y coaching en México',
    trendTopics:   'inicio de cursos, certificaciones, resultados de alumnos, emprendimiento, tendencias del mercado laboral, habilidades del futuro',
    fallbackTrends: [
      { id:1, emoji:'🎓', titulo:'Historia de transformación de un alumno',      descripcion:'El testimonio más poderoso que puedes publicar.',     tipo:'proceso'   },
      { id:2, emoji:'📊', titulo:'Habilidades más demandadas en 2025',           descripcion:'Posiciona tu oferta con contexto del mercado laboral.',tipo:'mercado'   },
      { id:3, emoji:'🚀', titulo:'De cero a emprender: el proceso real',         descripcion:'Contenido honesto que conecta con tu audiencia.',     tipo:'lifestyle' },
      { id:4, emoji:'💡', titulo:'Contenido gratuito de valor como anzuelo',     descripcion:'Cómo dar para recibir: lead magnets que convierten.', tipo:'inversion' },
      { id:5, emoji:'🤝', titulo:'Comunidad de alumnos como diferenciador',      descripcion:'El networking vale tanto como el conocimiento.',      tipo:'educativo' },
      { id:6, emoji:'📅', titulo:'Apertura de nueva cohorte: genera urgencia',   descripcion:'Estrategia de lanzamiento de programa.',              tipo:'mercado'   },
      { id:7, emoji:'🧠', titulo:'El coach detrás del método: credibilidad',     descripcion:'Tu historia y experiencia como propuesta de valor.',  tipo:'lifestyle' },
      { id:8, emoji:'📱', titulo:'Micro-aprendizaje en redes: tendencia 2025',   descripcion:'Cómo educar en 60 segundos y ganar autoridad.',       tipo:'educativo' },
    ],
  },

  services: {
    expertiseDesc: 'marketing para servicios profesionales en México',
    expertise:     'contenido educativo, casos de éxito, credibilidad, y contenido que genera consultas y clientes',
    audience:      'empresas y personas que necesitan servicios legales, contables o de consultoría especializada',
    trendsContext: 'servicios profesionales, legal, contable y consultoría en México',
    trendTopics:   'cambios fiscales, declaraciones anuales, reformas legales, emprendimiento, protección patrimonial, facturación electrónica',
    fallbackTrends: [
      { id:1, emoji:'📋', titulo:'Cambios fiscales que afectan a tu empresa',    descripcion:'Posiciona tu expertise con contenido de actualidad.',  tipo:'educativo' },
      { id:2, emoji:'⚖️', titulo:'Error común que le cuesta caro a los negocios',descripcion:'El contenido de "qué evitar" genera alta retención.',  tipo:'proceso'   },
      { id:3, emoji:'🏢', titulo:'Protección patrimonial: no es solo para ricos',descripcion:'Democratiza el acceso al conocimiento financiero-legal.',tipo:'educativo' },
      { id:4, emoji:'💡', titulo:'Caso de éxito: cómo resolvimos el problema X', descripcion:'Sin revelar datos, muestra tu proceso y resultado.',   tipo:'proceso'   },
      { id:5, emoji:'📅', titulo:'Calendario fiscal: las fechas que no puedes perder',descripcion:'Contenido de utilidad recurrente para tu audiencia.',tipo:'mercado' },
      { id:6, emoji:'🤝', titulo:'Por qué contratar un profesional vs. hacerlo solo',descripcion:'Educa sobre el costo real de no asesorarse.',       tipo:'inversion' },
      { id:7, emoji:'🌐', titulo:'Tu despacho en LinkedIn vs. Instagram',        descripcion:'Cómo adaptar tu mensaje a cada plataforma.',           tipo:'proceso'   },
      { id:8, emoji:'👥', titulo:'Testimonial de cliente: el activo más valioso',descripcion:'Cómo pedir y presentar referencias profesionales.',   tipo:'lifestyle' },
    ],
  },

  construction: {
    expertiseDesc: 'marketing para construcción y arquitectura en México',
    expertise:     'portfolio de proyectos, procesos constructivos, diseño, materiales, y contenido que genera leads de clientes',
    audience:      'personas y empresas que buscan construir, remodelar o diseñar espacios',
    trendsContext: 'construcción, arquitectura y diseño de interiores en México',
    trendTopics:   'tendencias de diseño, materiales sustentables, home renovation, espacios pequeños, arquitectura bioclimática, proceso de construcción',
    fallbackTrends: [
      { id:1, emoji:'🏗️', titulo:'El proceso de una obra en 8 etapas',           descripcion:'Educa y genera confianza mostrando tu metodología.',   tipo:'proceso'   },
      { id:2, emoji:'✨', titulo:'Antes y después: la transformación visual',     descripcion:'El contenido más efectivo del sector construcción.',   tipo:'mercado'   },
      { id:3, emoji:'🌿', titulo:'Construcción sustentable: el futuro es hoy',   descripcion:'Materiales y técnicas eco-friendly como diferenciador.',tipo:'educativo' },
      { id:4, emoji:'📐', titulo:'Tendencias de diseño de interiores 2025',      descripcion:'Qué buscan hoy los clientes en sus espacios.',         tipo:'mercado'   },
      { id:5, emoji:'💡', titulo:'El error más caro al remodelar',               descripcion:'Contenido preventivo que posiciona tu expertise.',     tipo:'educativo' },
      { id:6, emoji:'🏠', titulo:'Cuánto cuesta construir en m² hoy en México',  descripcion:'Transparencia de precios como estrategia de confianza.',tipo:'inversion' },
      { id:7, emoji:'👷', titulo:'El equipo detrás de cada obra',                descripcion:'Humaniza tu marca con el talento que hay detrás.',     tipo:'lifestyle' },
      { id:8, emoji:'🛋️', titulo:'Diseño de espacios pequeños: mucho con poco', descripcion:'Alta demanda y búsquedas en auge en México.',          tipo:'proceso'   },
    ],
  },
}
