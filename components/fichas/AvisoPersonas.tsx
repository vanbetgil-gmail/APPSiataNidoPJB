import { Aviso } from '@/components/ui/Aviso'

/**
 * Advertencia sobre personas identificables (T105) — FR-052.
 *
 * Aparece junto a la carga de foto, no al publicar: para entonces la foto ya
 * está tomada y decidida. El momento útil de avisar es antes.
 *
 * El texto no es genérico a propósito. La auditoría legal del material de
 * dron confirmó que el Art. 7 de la Ley 1581 de 2012 prohíbe tratar datos de
 * menores salvo los de naturaleza pública, y que un rostro es dato sensible.
 */
export function AvisoPersonas() {
  return (
    <Aviso tono="precaucion">
      <strong>Que no salgan personas en la foto.</strong> El mapa lo ve cualquiera en internet, y
      publicar el rostro de un compañero menor de edad sin autorización de su acudiente no está
      permitido. Si alguien aparece de fondo, vuelva a tomar la fotografía.
    </Aviso>
  )
}
