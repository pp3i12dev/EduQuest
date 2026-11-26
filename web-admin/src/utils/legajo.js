// Los identificadores técnicos no se muestran como legajos institucionales oficiales.
const AUTO_GENERATED_LEGAJO = /^(?:(?:ALU|DOC|PRE)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|(?:DOC|PRE)-AUTO-\d+)$/i;
export const displayLegajo = value => {
    const legajo = String(value ?? '').trim();
    return AUTO_GENERATED_LEGAJO.test(legajo) ? '' : legajo;
};
