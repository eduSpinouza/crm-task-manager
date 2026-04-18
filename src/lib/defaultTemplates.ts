export interface EmailTemplate {
    name: string;
    subject: string;
    body: string;
    isDefault?: boolean;
}

/**
 * Built-in templates shipped with the app.
 * Merged with user-saved templates at load time (defaults first).
 * A user can delete them — the name is stored in localStorage under
 * HIDDEN_DEFAULTS_KEY so they stay hidden on reload.
 * If a user saves a template with the same name, their version wins.
 */
export const DEFAULT_TEMPLATES: EmailTemplate[] = [
    {
        name: 'Recordatorio de pago',
        subject: 'Recordatorio de pago — {{productName}}',
        body: `Hola {{userName}}
Espero que este mensaje le encuentre bien. Le escribimos para recordarle sobre su deuda pendiente con la cuenta {{productName}} en financiera {{appName}} por un monto total de {{totalAmount}} pesos y el monto de la prórroga {{extensionAmount}}.

Apreciamos su compromiso con los acuerdos financieros y comprendemos que pueden surgir circunstancias imprevistas. Sin embargo, la fecha límite ha pasado y la deuda aún no ha sido saldada.

Le instamos a que realice el pago completo en estos momentos o en todo caso una prórroga para evitar posibles inconvenientes. En caso de haber realizado el pago, agradecemos que nos lo comunique y disculpe cualquier malentendido.

Si requiere asistencia adicional o si hay algún problema que debamos abordar, por favor póngase en contacto con nuestro departamento de cobranzas:

{{idNoUrl}}

📱 https://wa.me/+XXXXXXXXXXX

Agradecemos su pronta atención a este asunto y quedamos a la espera de recibir su pago o cualquier comentario que desee compartir.

ATTE
{{appName}}`,
        isDefault: true,
    },
    {
        name: 'Aviso de visita domiciliaria',
        subject: '🚨 AVISO DE VISITA DOMICILIARIA: Proceso de Cobro Activado',
        body: `🚨 AVISO DE VISITA DOMICILIARIA: Proceso de Cobro Activado ATENCIÓN URGENTE: {{userName}}

Hemos agotado todas las instancias amigables. Su negativa de pago sobre el préstamo {{productName}} (Saldo: \${{totalAmount}} | Prorroga: {{extensionAmount}}) ha activado la fase de RECUPERACIÓN EN SITIO.

ESTATUS ACTUAL DE SU CUENTA:

Gestión Digital: CERRADA ❌

Gestión Presencial: ACTIVA ✅

¿Qué significa esto?
En este momento, su expediente está siendo asignado a un gestor de zona. El protocolo incluye visitas de verificación y cobro tanto en su domicilio registrado como en su lugar de trabajo. De no encontrarlo, se procederá a contactar a todas las referencias personales y laborales vinculadas a su contrato para ubicarlo.

Evítese la vergüenza y el escrutinio público de una cobranza presencial.

TIENE 15 MINUTOS PARA DETENER LA SALIDA DEL GESTOR.

Detenga la orden de visita realizando su pago total AHORA MISMO en:
👉 {{appName}}

Si no recibimos la confirmación en los próximos minutos, el proceso de visita será irreversible.

{{idNoUrl}}

UNIDAD DE RECUPERACIÓN DE CAMPO`,
        isDefault: true,
    },
    {
        name: 'Aviso a familiares',
        subject: 'Deuda pendiente — {{userName}}',
        body: `LE COBRAREMOS A SUS FAMILIARES Y AMIGOS TU FAMILIAR {{userName}} TIENE UNA DEUDA PENDIENTE CON NOSOTROS,
(Saldo: \${{totalAmount}} | Prorroga: {{extensionAmount}})
REALICE EL PAGO A LA BREVEDAD O PUBLICAREMOS SU BURÓ DE CREDITO
EN REDES SOCIALES Y LA LISTA DE CONTACTOS DEL DISPOSITIVO

ATTE 👉 {{appName}}`,
        isDefault: true,
    },
];

export const HIDDEN_DEFAULTS_KEY = 'hidden_default_templates';

export function getHiddenDefaults(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(HIDDEN_DEFAULTS_KEY) || '[]');
    } catch {
        return [];
    }
}

export function hideDefault(name: string): void {
    const hidden = getHiddenDefaults();
    if (!hidden.includes(name)) {
        localStorage.setItem(HIDDEN_DEFAULTS_KEY, JSON.stringify([...hidden, name]));
    }
}

/**
 * Merge default templates with user-saved templates.
 * - Hidden defaults are excluded.
 * - If a user template shares a name with a default, the user version wins (default not shown).
 * - Defaults appear first, user templates after.
 */
export function mergeTemplates(userTemplates: EmailTemplate[]): EmailTemplate[] {
    const hidden = getHiddenDefaults();
    const userNames = new Set(userTemplates.map(t => t.name));
    const visibleDefaults = DEFAULT_TEMPLATES.filter(
        d => !hidden.includes(d.name) && !userNames.has(d.name)
    );
    return [...visibleDefaults, ...userTemplates];
}
